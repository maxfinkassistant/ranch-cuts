/* A national map in the same Albers USA projection as the pre-built
   state outlines (us-atlas, scale 1300, translate [487.5, 305]). It
   zooms by animating the SVG viewBox to fit whatever points it is
   told to focus on, and keeps markers the same size on screen. */

import { useEffect, useMemo, useRef, useState } from "react";
import { geoAlbersUsa } from "d3-geo";
import { US_STATES, US_BORDERS, US_NATION } from "../data/usStates";

const projection = geoAlbersUsa().scale(1300).translate([487.5, 305]);
export const project = (lat: number, lon: number): [number, number] | null => projection([lon, lat]) as [number, number] | null;

const FULL: Box = [0, 0, 975, 610];
type Box = [number, number, number, number];

const FIPS: Record<string, string> = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO", "09": "CT", "10": "DE", "11": "DC", "12": "FL",
  "13": "GA", "15": "HI", "16": "ID", "17": "IL", "18": "IN", "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME",
  "24": "MD", "25": "MA", "26": "MI", "27": "MN", "28": "MS", "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH",
  "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND", "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI",
  "45": "SC", "46": "SD", "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA", "54": "WV", "55": "WI", "56": "WY",
};

export type MarkerKind = "live" | "planned" | "you" | "butcher" | "ranch";

export interface MapMarker {
  id: string;
  lat: number;
  lon: number;
  kind: MarkerKind;
  label?: string;
  sub?: string;
  selected?: boolean;
  labelPos?: "right" | "left" | "above" | "below";
  onClick?: () => void;
}

const LABEL_AT = {
  right: { x: 14, y: 4, anchor: "start" },
  left: { x: -14, y: 4, anchor: "end" },
  above: { x: 0, y: -20, anchor: "middle" },
  below: { x: 0, y: 26, anchor: "middle" },
} as const;

export interface MapLine { from: { lat: number; lon: number }; to: { lat: number; lon: number }; kind?: "route" | "drive" }

function fit(points: [number, number][], minSpan: number, aspect: number): Box {
  if (!points.length) return FULL;
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  let [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const padX = Math.max((x1 - x0) * 0.35, minSpan / 2);
  const padY = Math.max((y1 - y0) * 0.35, minSpan / 2 / aspect);
  x0 -= padX; x1 += padX; y0 -= padY; y1 += padY;
  let w = x1 - x0;
  let h = y1 - y0;
  if (w / h > aspect) { const nh = w / aspect; y0 -= (nh - h) / 2; h = nh; } else { const nw = h * aspect; x0 -= (nw - w) / 2; w = nw; }
  return [x0, y0, w, h];
}

export default function UsMap({
  markers = [],
  lines = [],
  focus,
  minSpan = 160,
  aspect = 975 / 610,
  highlight = [],
  dimOthers = false,
  label = "Map of the United States",
  className = "",
}: {
  markers?: MapMarker[];
  lines?: MapLine[];
  focus?: { lat: number; lon: number }[];
  minSpan?: number;
  aspect?: number;
  highlight?: string[];       // state abbreviations to tint
  dimOthers?: boolean;
  label?: string;
  className?: string;
}) {
  const target = useMemo<Box>(() => {
    if (!focus || !focus.length) {
      /* the whole country, letterboxed to the requested shape */
      const [w, h] = 975 / 610 > aspect ? [975, 975 / aspect] : [610 * aspect, 610];
      return [(975 - w) / 2, (610 - h) / 2, w, h] as Box;
    }
    const pts = focus.map((p) => project(p.lat, p.lon)).filter(Boolean) as [number, number][];
    return fit(pts, minSpan, aspect);
  }, [JSON.stringify(focus), minSpan, aspect]);

  const [box, setBox] = useState<Box>(target);
  const from = useRef<Box>(target);
  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { setBox(target); from.current = target; return; }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / 700);
      const e = 1 - Math.pow(1 - k, 3);
      const b = a.map((v, i) => v + (target[i] - v) * e) as Box;
      setBox(b);
      from.current = b;
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  /* screen-constant sizing: one marker unit = one CSS pixel, whatever the zoom and the rendered width */
  const svgRef = useRef<SVGSVGElement>(null);
  const [px, setPx] = useState(975);
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setPx(Math.max(200, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const u = (box[2] / px) * (px < 520 ? 0.72 : 1);
  const hl = new Set(highlight);

  return (
    <svg ref={svgRef} className={"us-map " + className} viewBox={box.join(" ")} role="img" aria-label={label} preserveAspectRatio="xMidYMid meet">
      <path className="us-nation" d={US_NATION} />
      <g className="us-states">
        {US_STATES.map((s) => {
          const abbr = FIPS[s.id] ?? "";
          const on = hl.has(abbr);
          return <path key={s.id} d={s.d} className={on ? "on" : dimOthers && highlight.length ? "dim" : ""}><title>{s.name}</title></path>;
        })}
      </g>
      <path className="us-borders" d={US_BORDERS} />

      {lines.map((l, i) => {
        const a = project(l.from.lat, l.from.lon);
        const b = project(l.to.lat, l.to.lon);
        if (!a || !b) return null;
        const mx = (a[0] + b[0]) / 2;
        const my = (a[1] + b[1]) / 2 - Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.18;
        return <path key={i} className={"us-line " + (l.kind ?? "route")} d={`M${a[0]} ${a[1]} Q${mx} ${my} ${b[0]} ${b[1]}`} style={{ strokeWidth: 2.2 * u, strokeDasharray: `${6 * u} ${5 * u}` }} />;
      })}

      {[...markers].sort((a, b) => Number(!!a.selected) - Number(!!b.selected)).map((m) => {
        const p = project(m.lat, m.lon);
        if (!p) return null;
        const interactive = !!m.onClick;
        return (
          <g key={m.id} className={`us-marker ${m.kind}${m.selected ? " sel" : ""}${interactive ? " click" : ""}`}
            transform={`translate(${p[0]} ${p[1]}) scale(${u})`}
            onClick={m.onClick}
            onKeyDown={interactive ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); m.onClick!(); } } : undefined}
            tabIndex={interactive ? 0 : undefined}
            role={interactive ? "button" : undefined}
            aria-label={m.label ? `${m.label}${m.sub ? ", " + m.sub : ""}` : undefined}>
            <Glyph kind={m.kind} />
            {m.label && (() => {
              const at = LABEL_AT[m.labelPos ?? (m.kind === "you" ? "above" : "right")];
              return <text className="us-label" x={at.x} y={at.y} textAnchor={at.anchor}>{m.label}</text>;
            })()}
          </g>
        );
      })}
    </svg>
  );
}

function Glyph({ kind }: { kind: MarkerKind }) {
  switch (kind) {
    case "live":
      /* an ear tag: the brand's mark for a live share */
      return (
        <g>
          <circle r="16" className="halo" />
          <path d="M-7 -11 h14 a3 3 0 0 1 3 3 v12 l-10 9 l-10 -9 v-12 a3 3 0 0 1 3 -3z" className="tag-shape" />
          <circle cx="0" cy="-5" r="2.2" className="tag-hole" />
        </g>
      );
    case "planned":
      return <g><circle r="7" className="ring" /><circle r="2.2" className="dot" /></g>;
    case "you":
      return <g><circle r="9" className="you-halo" /><circle r="5" className="you-dot" /></g>;
    case "butcher":
      return (
        <g className="shop">
          <path d="M-10 0 v-8 l10 -8 l10 8 v8 z" />
          <rect x="-10" y="0" width="20" height="11" />
          <rect className="door" x="-3" y="4" width="6" height="7" />
        </g>
      );
    case "ranch":
      return <g><circle r="22" className="ranch-area" /><path d="M-8 4 l8 -10 l8 10 z M-5 4 v6 h10 v-6" className="ranch-barn" /></g>;
  }
}
