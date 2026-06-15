const BASE = 'https://adanaavukat.org';
const urls = [
  '/',
  '/aile-hukuku-rehberi/',
  '/hizmetlerimiz/',
  '/hakkimizda/',
  '/about-us/',
  '/iletisim/',
  '/contact/',
  '/adana-bosanma-avukati/',
  '/cekismeli-bosanma-davasi/',
  '/nafaka-davasi/',
  '/adana-miras-hukuku/',
  '/adana-kira-hukuku/',
  '/adana-is-hukuku/',
  '/faq/',
  '/sitemap_index.xml',
  '/wp-sitemap.xml',
];

function parseMeta(html) {
  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || '';
  const desc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1]
    || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)?.[1]
    || '';
  const robots = html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["']/i)?.[1] || '';
  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i)?.[1] || '';
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => m[1].replace(/<[^>]+>/g, '').trim());
  const jsonLd = (html.match(/application\/ld\+json/gi) || []).length;
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i)?.[1] || '';
  return { title, desc: desc.slice(0, 160), robots, canonical, h1Count: h1s.length, h1s: h1s.slice(0, 3), jsonLd, ogTitle };
}

const results = [];
for (const path of urls) {
  try {
    const res = await fetch(BASE + path, { redirect: 'follow', headers: { 'User-Agent': 'adanaavukat-seo-audit/1.0' } });
    const html = await res.text();
    results.push({ path, status: res.status, ok: res.ok, ...parseMeta(html) });
  } catch (e) {
    results.push({ path, error: e.message });
  }
}
console.log(JSON.stringify(results, null, 2));
