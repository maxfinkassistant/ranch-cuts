import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import { readFileSync, readdirSync, statSync, existsSync, mkdirSync, writeFileSync, renameSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { LIVE, PLANNED } from "./src/data/partnerships";

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

/** Dev-only CRM store: GET /__crm returns every saved doc, POST /__crm {op:"put",doc} or
    {op:"del",kind,id} changes one. Data lives in crm/crm.json (git-ignored), written atomically.
    Production uses the Apps Script "CRM" sheet instead (src/lib/crm.ts picks the store). */
function crmFileStore(): Plugin {
  const dir = new URL("./crm", import.meta.url).pathname;
  const file = join(dir, "crm.json");
  type Doc = { kind: string; id: string; data: unknown; updatedAt: string; by?: string };
  const read = (): Doc[] => (existsSync(file) ? JSON.parse(readFileSync(file, "utf8")).docs : []);
  const write = (docs: Doc[]) => {
    mkdirSync(dir, { recursive: true });
    writeFileSync(file + ".tmp", JSON.stringify({ updatedAt: new Date().toISOString(), docs }, null, 1));
    renameSync(file + ".tmp", file);
  };
  return {
    name: "ranch-cuts-crm-file-store",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__crm", (req, res) => {
        const send = (code: number, body: unknown) => {
          res.statusCode = code;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(body));
        };
        if (req.method === "GET") return send(200, { ok: true, docs: read() });
        if (req.method !== "POST") return send(405, { ok: false, error: "GET or POST" });
        let raw = "";
        req.on("data", (c) => (raw += c));
        req.on("end", () => {
          try {
            const body = JSON.parse(raw);
            const docs = read();
            if (body.op === "put" && body.doc?.kind && body.doc?.id) {
              const rest = docs.filter((d) => !(d.kind === body.doc.kind && d.id === body.doc.id));
              write([...rest, body.doc]);
            } else if (body.op === "del" && body.kind && body.id) {
              write(docs.filter((d) => !(d.kind === body.kind && d.id === body.id)));
            } else return send(400, { ok: false, error: "bad request" });
            send(200, { ok: true });
          } catch (e) {
            send(500, { ok: false, error: (e as Error).message });
          }
        });
      });
    },
  };
}

/** Real HTML files for the pages that ads and shared links point at. Without them
    GitHub Pages answers /signup from 404.html with a 404 status: the page still
    renders, but ad reviewers and link-preview crawlers read it as a dead link.
    Each copy carries its own title, description and link-preview tags. */
function staticPages(): Plugin {
  const site = "https://ranchcuts.com";
  let outDir = "dist";
  const offer = "Beef from a ranch near you, cut your way by a butcher near you, for less than the store.";
  const pages = [
    {
      path: "signup",
      title: "Get notified when Ranch Cuts opens near you | Ranch Cuts",
      description: `${offer} We open one city at a time. Leave your zip code and email and we'll tell you the day yours opens.`,
    },
    ...PLANNED.map((m) => ({
      path: `signup/${m.slug}`,
      title: `Bring Ranch Cuts to ${m.city} | Ranch Cuts`,
      description: `${offer} ${m.city} is on our list. Sign-ups decide how soon it opens.`,
    })),
    {
      path: `signup/${LIVE.slug}`,
      title: `Ranch Cuts ${LIVE.city}: reservations open soon | Ranch Cuts`,
      description: `A quarter, half or whole steer from ${LIVE.ranch.name}, cut your way at ${LIVE.butcher.name}. Leave your zip code and email and we'll tell you the day reservations open.`,
    },
    {
      path: "privacy",
      title: "Privacy | Ranch Cuts",
      description: "What Ranch Cuts collects when you sign up, and what we do with it.",
    },
  ];
  return {
    name: "ranch-cuts-static-pages",
    apply: "build",
    configResolved(c) { outDir = c.build.outDir; },
    closeBundle() {
      const index = join(outDir, "index.html");
      if (!existsSync(index)) return;
      const html = readFileSync(index, "utf8");
      for (const p of pages) {
        const page = html
          .replace(/<title>[^<]*<\/title>/, `<title>${p.title}</title>`)
          .replace(/(<meta name="description" content=")[^"]*/, `$1${p.description}`)
          .replace(/(<meta property="og:title" content=")[^"]*/, `$1${p.title}`)
          .replace(/(<meta property="og:description" content=")[^"]*/, `$1${p.description}`)
          .replace(/(<meta property="og:url" content=")[^"]*/, `$1${site}/${p.path}`);
        /* both spellings a static host may look for: /signup and /signup/ */
        mkdirSync(join(outDir, p.path), { recursive: true });
        writeFileSync(join(outDir, `${p.path}.html`), page);
        writeFileSync(join(outDir, p.path, "index.html"), page);
      }
    },
  };
}

export default defineConfig(({ command, mode }) => {
  const demo = mode === "demo";
  return {
    base: demo ? "./" : command === "build" ? (process.env.VITE_BASE ?? "/") : "/",
    plugins: demo ? [react(), demoAssets(true), viteSingleFile()] : [react(), demoAssets(false), crmFileStore(), staticPages()],
    define: { "import.meta.env.VITE_DEMO": JSON.stringify(demo ? "1" : "") },
    build: demo ? { outDir: "demo-build", emptyOutDir: true, copyPublicDir: false, chunkSizeWarningLimit: 6000 } : undefined,
    server: { port: 5177 },
  };
});
