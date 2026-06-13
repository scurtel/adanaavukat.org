import { getWpConfig, getAuthHeader } from './lib/env.mjs';

const BASE = 'https://adanaavukat.org';

async function fetchSitemapUrls() {
  const urls = new Set();
  const indexRes = await fetch(`${BASE}/sitemap_index.xml`);
  console.log('index', indexRes.status);
  const indexXml = await indexRes.text();
  const childSitemaps = [...indexXml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) => m[1]);
  console.log('child sitemaps:', childSitemaps);

  for (const sm of childSitemaps) {
    const r = await fetch(sm);
    const xml = await r.text();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) => m[1]);
    console.log(sm.split('/').pop(), 'urls:', locs.length);
    for (const u of locs) urls.add(u.replace(/\/$/, ''));
  }

  const check = [
    `${BASE}`,
    `${BASE}/adana-miras-hukuku`,
    `${BASE}/adana-kira-hukuku`,
    `${BASE}/adana-is-hukuku`,
  ].map((u) => u.replace(/\/$/, ''));

  for (const u of check) {
    console.log(u, urls.has(u) ? 'OK' : 'MISSING');
  }
}

await fetchSitemapUrls();

// trigger flush again
const { baseUrl, username, appPassword } = getWpConfig();
const auth = getAuthHeader(username, appPassword);
const g = await fetch(`${baseUrl}/wp-json/adanaavukat/v1/rankmath-global`, {
  method: 'POST',
  headers: { Authorization: auth, 'Content-Type': 'application/json' },
  body: JSON.stringify({ flush_sitemap: true }),
});
console.log('flush', g.status, await g.text());

await new Promise((r) => setTimeout(r, 5000));
console.log('\nAfter flush:');
await fetchSitemapUrls();
