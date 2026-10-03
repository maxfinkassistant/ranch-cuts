import { useEffect, useState } from "react";
import { NavLink, Link, Outlet, useLocation } from "react-router-dom";
import { SEASONS, CURRENT_SEASON, NEXT_SEASON, SUPPORT } from "../data/config";
import { LIVE, PLANNED } from "../data/partnerships";
import { useAvailability, seasonFull } from "../lib/availability";
import RcMark from "./RcMark";

export default function Layout() {
  const a = useAvailability();
  const season = SEASONS[CURRENT_SEASON];
  const next = SEASONS[NEXT_SEASON];
  const [menu, setMenu] = useState(false);
  const loc = useLocation();
  useEffect(() => setMenu(false), [loc.pathname]);

  return (
    <>
      <div className="site-banner">
        <Link to={`/local/${LIVE.slug}`}>
          <b>NOW OPEN: RANCH CUTS {LIVE.city.toUpperCase()}</b>
          {seasonFull(a)
            ? <> {season.label.toUpperCase()} IS FULL, BOOKING {next.label.toUpperCase()}</>
            : <> {season.label.toUpperCase()} HARVEST, {a.known && a.reserved > 0 ? `${a.reserved} OF ${a.capacity}` : a.capacity} STEERS{a.known && a.reserved > 0 ? " RESERVED" : ""}</>}
        </Link>
        <span className="banner-sep" aria-hidden="true" />
        <Link to="/map">{PLANNED.length} MORE METROS PLANNED</Link>
      </div>
      <header className="site-header">
        <Link to="/" className="brand" aria-label="Ranch Cuts home">
          <RcMark width={54} />
          <span className="brand-name">Ranch Cuts</span>
        </Link>
        <button className="nav-toggle" aria-expanded={menu} aria-controls="site-nav" onClick={() => setMenu((m) => !m)}>
          <span className="sr-only">Menu</span>
          <span className="nav-toggle-bars" aria-hidden="true" />
        </button>
        <nav id="site-nav" className={"site-nav" + (menu ? " open" : "")}>
          <NavLink to="/how-it-works">How it works</NavLink>
          <NavLink to="/map">Map</NavLink>
          <NavLink to="/about">About us</NavLink>
          <NavLink to="/track">Track an order</NavLink>
          <Link to="/find" className="btn btn-solid nav-cta">Find your ranch</Link>
        </nav>
      </header>

      <Outlet />

      <footer className="site-footer">
        <div className="footer-brand">
          <RcMark width={64} body="var(--on-dark)" cuts="var(--pasture)" />
          <div>
            <div className="footer-word">Ranch Cuts</div>
            <p>Your local ranch. Your local butcher. Your cuts.</p>
          </div>
        </div>
        <div className="footer-cols">
          <div>
            <span className="tag">Families</span>
            <Link to="/find">Find your ranch</Link>
            <Link to="/map">Map of partnerships</Link>
            <Link to="/how-it-works">How it works</Link>
            <Link to="/track">Track an order</Link>
          </div>
          <div>
            <span className="tag">Ranch Cuts</span>
            <Link to="/about">About us</Link>
            <Link to="/about#partner">Ranchers and butchers</Link>
            <a href={`mailto:${SUPPORT.email}`}>{SUPPORT.email}</a>
          </div>
          <div>
            <span className="tag">Open now</span>
            <Link to={`/local/${LIVE.slug}`}>Ranch Cuts {LIVE.city}</Link>
            <span className="dim">Beef from {LIVE.ranch.name}, cut at {LIVE.butcher.name}</span>
          </div>
        </div>
        <div className="footer-fine">
          <p>
            Ranch Cuts is a marketplace. Each share is a share of one live, ear-tagged steer, sold by the partner ranch,
            which is the seller of record. The partner butcher bills its processing to each owner. Ranch Cuts never owns the cattle
            or the beef. Beef processed for owners is labeled Not For Sale.
          </p>
          <p>Zip code data: GeoNames (CC BY 4.0). State outlines: U.S. Census Bureau. <Link to="/customers">Ranch office</Link></p>
        </div>
      </footer>
    </>
  );
}
