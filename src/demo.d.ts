/* virtual modules that exist only in the single-file demo build (vite.config.ts) */
declare module "virtual:demo-assets" { const assets: Record<string, string>; export default assets; }
declare module "virtual:demo-zips" { const zips: string; export default zips; }
interface ImportMetaEnv { readonly VITE_DEMO?: string }
