import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import UsMap, { type MapMarker } from "../components/UsMap";
import ZipSearch from "../components/ZipSearch";
import WaitlistForm from "../components/WaitlistForm";
import { PARTNERSHIPS, PLANNED, lookupZip, coverageFor, type ZipPlace, type Coverage } from "../data/partnerships";
import { SHARES, SEASONS, CURRENT_SEASON, money } from "../data/config";

type Sel = { kind: "live"; slug: string } | { kind: "planned"; slug: string } | null;

const STATE_NAMES: Record<string, string> = {
  CO: "Colorado", NE: "Nebraska", IA: "Iowa", KS: "Kansas", MO: "Missouri", IL: "Illinois", OK: "Oklahoma",
  TX: "Texas", MN: "Minnesota", WI: "Wisconsin",
};

export default function MapPage() {
  const [sel, setSel] = useState<Sel>({ kind: "live", slug: PARTNERSHIPS[0].slug });
  const [you, setYou] = useState<{ place: ZipPlace; cov: Coverage } | null>(null);
  const [zipErr, setZipErr] = useState("");
  const [zoomed, setZoomed] = useState(false);

  const live = sel?.kind === "live" ? PARTNERSHIPS.find((p) => p.slug === sel.slug) ?? null : null;
  const planned = sel?.kind === "planned" ? PLANNED.find((m) => m.slug === sel.slug) ?? null : null;

  const onZip = async (zip: string) => {
    setZipErr("");
    const place = await lookupZip(zip);
    if (!place) { setZipErr(`We couldn't find ${zip}.`); return; }
    const cov = coverageFor(place);
    setYou({ place, cov });
    setZoomed(true);
    if (cov.kind === "covered" || cov.kind === "reachable") setSel({ kind: "live", slug: cov.partnership.slug });
    else if (cov.kind === "planned") setSel({ kind: "planned", slug: cov.metro.slug });
    else setSel(null);
  };

  const markers: MapMarker[] = [
    ...PLANNED.map((m) => ({
      id: m.slug, kind: "planned" as const, lat: m.lat, lon: m.lon,
      label: zoomed || planned?.slug === m.slug ? m.city : undefined, sub: "planned",
      selected: planned?.slug === m.slug,
      onClick: () => { setSel({ kind: "planned", slug: m.slug }); setZoomed(true); },
    })),
    ...PARTNERSHIPS.flatMap((p) => {
      const inner: MapMarker[] = zoomed && live?.slug === p.slug
        ? [
            { id: `${p.slug}-ranch`, kind: "ranch", lat: p.ranch.lat, lon: p.ranch.lon, label: p.ranch.name, labelPos: "above" },
            { id: `${p.slug}-butcher`, kind: "butcher", lat: p.butcher.lat, lon: p.butcher.lon, label: `${p.butcher.short}, ${p.butcher.city}`, labelPos: "below" },
          ]
        : [];
      return [
        ...inner,
        {
          id: p.slug, kind: "live" as const, lat: p.center.lat, lon: p.center.lon,
          label: `Ranch Cuts ${p.city}`, selected: live?.slug === p.slug, labelPos: zoomed ? "left" as const : "right" as const,
          onClick: () => { setSel({ kind: "live", slug: p.slug }); setZoomed(true); },
        },
      ];
    }),
    ...(you ? [{ id: "you", kind: "you" as const, lat: you.place.lat, lon: you.place.lon, label: you.place.place, labelPos: "left" as const }] : []),
  ];

  const focus = useMemo(() => {
    if (!zoomed) return undefined;
    const pts: { lat: number; lon: number }[] = [];
    if (live) pts.push(live.center, live.butcher, { lat: live.ranch.lat, lon: live.ranch.lon });
    if (planned) pts.push(planned);
    if (you) pts.push(you.place);
    return pts.length ? pts : undefined;
  }, [zoomed, live, planned, you]);

  const highlight = live ? [live.state] : planned ? planned.states : you ? [you.place.state] : [];
  const byState = useMemo(() => {
    const g: Record<string, typeof PLANNED> = {};
    for (const m of PLANNED) (g[m.states[0]] ??= []).push(m);
    return Object.entries(g).sort((a, b) => (STATE_NAMES[a[0]] ?? a[0]).localeCompare(STATE_NAMES[b[0]] ?? b[0]));
  }, []);

  return (
    <main>
      <section className="page section map-top">
        <div className="wide map-head">
          <div>
            <span className="tag eyebrow">The map</span>
            <h1 className="d">Ranches and butchers, one partnership at a time.</h1>
            <p className="lede">
              {PARTNERSHIPS.length === 1 ? "One partnership is open" : `${PARTNERSHIPS.length} partnerships are open`}, and{" "}
              {PLANNED.length} metros are planned next. Tap a pin to meet the people behind it, or enter your zip code.
            </p>
          </div>
          <div>
            <ZipSearch onZip={onZip} cta="Show me" size="small" id="map-zip" />
            {zipErr && <p className="zip-err" role="alert">{zipErr}</p>}
          </div>
        </div>
      </section>

      <section className="page">
        <div className="wide map-layout">
          <div className="map-stage">
            <UsMap markers={markers} focus={focus} highlight={highlight} minSpan={you || live ? 75 : 150}
              lines={zoomed && live ? [{ from: { lat: live.ranch.lat, lon: live.ranch.lon }, to: live.butcher }, ...(you && (you.cov.kind === "covered" || you.cov.kind === "reachable") ? [{ from: you.place, to: live.butcher, kind: "drive" as const }] : [])] : []}
              label="Map of Ranch Cuts partnerships: open now and planned" />
            <div className="map-key" aria-hidden="true">
              <span><i className="k-live" /> Open now</span>
              <span><i className="k-planned" /> Planned</span>
              {zoomed && <button className="chip" onClick={() => { setZoomed(false); setYou(null); }}>Show the whole country</button>}
            </div>
          </div>

          <aside className="map-panel" aria-live="polite">
            {you && <YouNote place={you.place} cov={you.cov} />}

            {live && (
              <div className="panel-card live">
                <span className="tag">Open now</span>
                <h2 className="d">Ranch Cuts {live.city}</h2>
                <p className="panel-lockup">Beef from {live.ranch.name}, cut at {live.butcher.name}.</p>
                <div className="panel-pair">
                  <div>
                    <span className="tag">The ranch</span>
                    <b>{live.ranch.name}</b>
                    <p className="small">{live.ranch.region}. {live.ranch.summary}.</p>
                  </div>
                  <div>
                    <span className="tag">The butcher</span>
                    <b>{live.butcher.name}</b>
                    <p className="small">{live.butcher.address}. {live.butcher.hang}, cut to your sheet.</p>
                  </div>
                </div>
                <p className="small mute">Serves {live.serves.join(", ")}. {SEASONS[CURRENT_SEASON].label} harvest. Shares from {money(SHARES.quarter.total)}.</p>
                <div className="hero-actions" style={{ marginTop: "var(--space-md)" }}>
                  <Link to={`/local/${live.slug}`} className="btn btn-solid">Meet them</Link>
                  <Link to="/order" className="btn btn-ghost">Reserve a share</Link>
                </div>
              </div>
            )}

            {planned && (
              <div className="panel-card">
                <span className="tag">Planned, not open yet</span>
                <h2 className="d">Ranch Cuts {planned.city}</h2>
                <p className="small">
                  {planned.butchersNearby} butchers that process beef are within about an hour of {planned.city}. No
                  ranch or butcher is signed yet. {planned.states.length > 1 ? `Because the metro crosses a state line, it will get a ranch and butcher on each side (${planned.states.join(" and ")}).` : ""}
                </p>
                <WaitlistForm zip={you?.place.zip ?? ""} place={you?.place.place} state={you?.place.state ?? planned.states[0]} nearest={planned.slug}
                  cta={`Bring it to ${planned.city}`} />
              </div>
            )}

            <div className="panel-list">
              <span className="tag">All planned metros</span>
              {byState.map(([st, ms]) => (
                <div key={st} className="panel-state">
                  <b>{STATE_NAMES[st] ?? st}</b>
                  <div>
                    {ms.map((m) => (
                      <button key={m.slug} className={"chip" + (planned?.slug === m.slug ? " on" : "")}
                        onClick={() => { setSel({ kind: "planned", slug: m.slug }); setZoomed(true); }}>{m.city}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function YouNote({ place, cov }: { place: ZipPlace; cov: Coverage }) {
  const where = `${place.place}, ${place.state}`;
  if (cov.kind === "covered" || cov.kind === "reachable")
    return <p className="you-note"><b>{where}</b> is served by Ranch Cuts {cov.partnership.city}. Pickup is about {cov.drive} miles away.</p>;
  if (cov.kind === "planned")
    return <p className="you-note"><b>{where}</b> is about {Math.round(cov.miles)} miles from planned Ranch Cuts {cov.metro.city}.</p>;
  return (
    <div className="you-note">
      <p><b>{where}</b> doesn't have a partnership yet. Join the list and your zip code counts toward opening one.</p>
      <WaitlistForm zip={place.zip} place={place.place} state={place.state} nearest={cov.nearestPlanned?.metro.slug} />
    </div>
  );
}
