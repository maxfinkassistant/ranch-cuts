/* The Ranch Cuts mark: a steer in profile with butcher-chart cut lines
   and the rib filled in ear-tag yellow (logo round 1, concept 07).
   Geometry from brand/logo-r1/project/RcSteer.dc.html (angus, solid,
   simple cuts, rib fill). */

const BODY =
  "M30 30C34 28 38 28 42 30C52 30 60 31 70 31C100 29 140 29 176 31C182 31 186 36 186 44C186 60 184 74 178 86L176 100L174 114L162 114L160 100C158 94 154 90 148 90C128 94 98 95 78 92L70 96L68 114L56 114L56 98C54 92 50 88 46 84C40 78 34 72 28 68L20 66C14 66 10 62 10 58C10 52 14 46 18 40C20 34 24 30 30 30Z";
const EAR = "M36 32L50 24L46 34Z";
const TAIL = "M185 40C190 52 191 72 189 90";
const CUTS = "M74 0V120M104 0V120M150 0V120M50 70H150";

let uid = 0;

export default function RcMark({
  width = 56,
  body = "var(--pasture)",
  accent = "var(--tag)",
  cuts = "var(--paper)",
  fill = "rib",
  title,
}: {
  width?: number;
  body?: string;
  accent?: string;
  cuts?: string;
  fill?: "rib" | "none";
  title?: string;
}) {
  const id = `rc-clip-${++uid}`;
  return (
    <svg width={width} height={Math.round(width * 0.6)} viewBox="0 0 200 120" role={title ? "img" : undefined}
      aria-label={title} aria-hidden={title ? undefined : true} style={{ display: "block", overflow: "visible" }}>
      <defs><clipPath id={id}><path d={BODY} /></clipPath></defs>
      <path d={TAIL} fill="none" stroke={body} strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="189" cy="94" rx="3.5" ry="6" fill={body} />
      <path d={BODY} fill={body} />
      <g clipPath={`url(#${id})`}>
        {fill === "rib" && <path d="M74 0h30v70h-30Z" fill={accent} />}
        <path d={CUTS} fill="none" stroke={cuts} strokeWidth="1.6" strokeDasharray="3 3" strokeLinejoin="round" />
      </g>
      <path d={EAR} fill={body} />
    </svg>
  );
}
