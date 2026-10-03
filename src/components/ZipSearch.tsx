import { useState } from "react";
import { useNavigate } from "react-router-dom";

/* The front door of the whole site: a zip code. By default it routes to
   /find/:zip; pass onZip to handle it in place (the map page does). */
export default function ZipSearch({
  initial = "",
  onZip,
  size = "big",
  dark = false,
  cta = "Find my ranch",
  id = "zip",
}: {
  initial?: string;
  onZip?: (zip: string) => void;
  size?: "big" | "small";
  dark?: boolean;
  cta?: string;
  id?: string;
}) {
  const [zip, setZip] = useState(initial);
  const [err, setErr] = useState("");
  const nav = useNavigate();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const z = zip.trim();
    if (!/^\d{5}$/.test(z)) { setErr("Enter a 5-digit zip code."); return; }
    setErr("");
    if (onZip) onZip(z); else nav(`/find/${z}`);
  };
  return (
    <form className={`zip-search ${size}${dark ? " dark" : ""}`} onSubmit={submit} role="search" aria-label="Find your local ranch by zip code">
      <label htmlFor={id} className="sr-only">Your zip code</label>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="postal-code"
        pattern="[0-9]*"
        maxLength={5}
        placeholder="Your zip code"
        value={zip}
        onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
        aria-invalid={!!err}
        aria-describedby={err ? `${id}-err` : undefined}
      />
      <button type="submit" className={dark ? "btn btn-on-dark" : "btn btn-solid"}>{cta}</button>
      {err && <p id={`${id}-err`} className="zip-err" role="alert">{err}</p>}
    </form>
  );
}
