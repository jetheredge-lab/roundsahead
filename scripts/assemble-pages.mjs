// Assembles the Cloudflare Pages output directory from the two frontends:
//   - the static marketing site (landing/)   -> served at /
//   - the built Vite SPA (dist/, base '/app/') -> served at /app
// plus a _redirects rule so SPA paths under /app fall back to its index.html.
//
// Run after `npm run build` (which produces dist/). Wired as `npm run build:pages`.
import { cp, rm, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const OUT = 'pages-dist';

if (!existsSync('dist')) {
  console.error('dist/ not found — run `npm run build` first.');
  process.exit(1);
}

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

// Marketing site at the root (index.html, privacy/, terms/, robots.txt, …).
await cp('landing', OUT, { recursive: true });

// The SPA under /app. Its assets are already built with base '/app/'.
await cp('dist', `${OUT}/app`, { recursive: true });

// Client-side routing fallback for the SPA. /api/* is handled by the Pages
// Function (functions/api/[[path]].ts) and is unaffected by this.
await writeFile(`${OUT}/_redirects`, '/app/* /app/index.html 200\n');

console.log(`Assembled ${OUT}/  (landing at /, SPA at /app)`);
