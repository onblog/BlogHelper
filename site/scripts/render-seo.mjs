#!/usr/bin/env node
/**
 * Render the SEO files for a static site: /sitemap.xml, /robots.txt, and any
 * `__SITE_URL__` placeholder inside the listed HTML files.
 *
 * The production domain is NEVER stored in this repository. It comes from the
 * `SITE_URL` environment variable, which is set by the build environment
 * (Cloudflare Workers Builds) or by a local, git-ignored `.env` file. That keeps
 * the repo usable by anyone who forks it: point SITE_URL at their own domain and
 * everything (canonical links, Open Graph URLs, the sitemap, robots.txt) follows.
 *
 * Usage: SITE_URL=https://example.com node scripts/render-seo.mjs
 * Config: seo.config.json (relative to the repo root)
 *   {
 *     "outDir": "public",              // where sitemap.xml and robots.txt go
 *     "html": ["public/index.html"],   // files whose __SITE_URL__ is replaced
 *     "pages": ["/", "/about.html"]    // paths listed in the sitemap
 *   }
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const CONFIG_PATH = join(ROOT, 'seo.config.json');

const siteUrl = (process.env.SITE_URL ?? '').trim().replace(/\/+$/, '');
if (!siteUrl) {
  console.error(
    'render-seo: SITE_URL is required.\n' +
      '  Set it in the build environment (Cloudflare Workers Builds) or in a local .env file.\n' +
      '  Example: SITE_URL=https://example.com node scripts/render-seo.mjs',
  );
  process.exit(1);
}

if (!/^https?:\/\//.test(siteUrl)) {
  console.error(`render-seo: SITE_URL must start with http:// or https:// (got "${siteUrl}")`);
  process.exit(1);
}

if (!existsSync(CONFIG_PATH)) {
  console.error('render-seo: seo.config.json not found');
  process.exit(1);
}

const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
const outDir = join(ROOT, config.outDir ?? 'public');
const pages = Array.isArray(config.pages) && config.pages.length ? config.pages : ['/'];
const htmlFiles = Array.isArray(config.html) ? config.html : [];

const PLACEHOLDER = '__SITE_URL__';

// --- sitemap.xml -----------------------------------------------------------
// Framework builds (Astro, VitePress) can emit their own sitemap; set
// "sitemap": false in seo.config.json to leave that to the framework.
if (config.sitemap !== false) {
  const urls = pages
    .map((path) => `  <url>\n    <loc>${siteUrl}${path}</loc>\n  </url>`)
    .join('\n');
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
  writeFileSync(join(outDir, 'sitemap.xml'), sitemap);
}

// --- robots.txt ------------------------------------------------------------
writeFileSync(
  join(outDir, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`,
);

// --- __SITE_URL__ placeholders in HTML -------------------------------------
let replaced = 0;
for (const file of htmlFiles) {
  const path = join(ROOT, file);
  if (!existsSync(path)) {
    console.warn(`render-seo: html file not found, skipped: ${file}`);
    continue;
  }
  const before = readFileSync(path, 'utf8');
  if (!before.includes(PLACEHOLDER)) continue;
  writeFileSync(path, before.split(PLACEHOLDER).join(siteUrl));
  replaced += 1;
}

console.log(
  `render-seo: ${siteUrl} -> sitemap.xml (${pages.length} urls), robots.txt, ${replaced} html file(s)`,
);
