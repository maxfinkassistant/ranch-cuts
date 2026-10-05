import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";

/* Two builds:
   - default: the real site, served from the domain root (ranchcuts.com).
     Set VITE_BASE for a project path, e.g. VITE_BASE=/ranch-cuts/ on GitHub Pages.
   - `--mode demo` (bun run demo): ONE self-contained HTML file that opens by
     double-click. JS, CSS, images, logos, the cut-sheet PDF and every zip code
     are inlined; only Google Fonts and the Unsplash cut photos load from the web. */

const MIME: Record<string, string> = {
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".pdf": "application/pdf",
};

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/** public/ files (not the zip tables) as data URIs, keyed by their public path. Outside the
    demo build the two virtual modules resolve to empty values, so imports never break. */
function demoAssets(demo: boolean): Plugin {
  const pub = new URL("./public", import.meta.url).pathname;
  const assets: Record<string, string> = {};
  for (const f of demo ? walk(pub) : []) {
    const rel = relative(pub, f);
    const mime = MIME[extname(f).toLowerCase()];
    if (!mime || rel.startsWith("zip/")) continue;
    assets[rel] = `data:${mime};base64,${readFileSync(f).toString("base64")}`;
  }
  /* every zip centroid, packed as "zip,lat,lon,place,state" lines grouped by state */
  const zips: string[] = [];
  for (const f of demo ? readdirSync(join(pub, "zip")) : []) {
    const table = JSON.parse(readFileSync(join(pub, "zip", f), "utf8")) as Record<string, [number, number, string, string]>;
    for (const [z, [lat, lon, place, st]] of Object.entries(table)) zips.push(`${z},${lat},${lon},${place.replace(/,/g, " ")},${st}`);
  }
  return {
    name: "ranch-cuts-demo-assets",
    resolveId: (id) => (id === "virtual:demo-assets" || id === "virtual:demo-zips" ? "\0" + id : null),
    load(id) {
      if (id === "\0virtual:demo-assets") return `export default ${JSON.stringify(assets)};`;
      if (id === "\0virtual:demo-zips") return `export default ${JSON.stringify(zips.join("\n"))};`;
      return null;
    },
    transformIndexHtml: (html) =>
      !demo ? html : html
        .replace('href="/favicon.svg"', `href="${assets["favicon.svg"]}"`)
        .replace('href="/apple-touch-icon.png"', `href="${assets["apple-touch-icon.png"]}"`),
  };
}

export default defineConfig(({ command, mode }) => {
  const demo = mode === "demo";
  return {
    base: demo ? "./" : command === "build" ? (process.env.VITE_BASE ?? "/") : "/",
    plugins: demo ? [react(), demoAssets(true), viteSingleFile()] : [react(), demoAssets(false)],
    define: { "import.meta.env.VITE_DEMO": JSON.stringify(demo ? "1" : "") },
    build: demo ? { outDir: "demo-build", emptyOutDir: true, copyPublicDir: false, chunkSizeWarningLimit: 6000 } : undefined,
    server: { port: 5177 },
  };
});
