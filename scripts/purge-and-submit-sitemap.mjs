/**
 * LiteSpeed önbellek temizliği, sitemap yenileme ve IndexNow gönderimi.
 */
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getWpConfig, getAuthHeader } from './lib/env.mjs';
import { RANKMATH_REST_SNIPPET_NAME, RANKMATH_REST_SNIPPET_CODE } from './lib/rankmath-rest-snippet.mjs';
import { wpFetch } from './lib/wp-client.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const BASE = 'https://adanaavukat.org';
const SITEMAP_URL = `${BASE}/sitemap_index.xml`;

const INDEX_URLS = [
  `${BASE}/`,
  `${BASE}/adana-miras-hukuku/`,
  `${BASE}/adana-kira-hukuku/`,
  `${BASE}/adana-is-hukuku/`,
  SITEMAP_URL,
];

async function wpPost(path, body) {
  const { baseUrl, username, appPassword } = getWpConfig();
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(username, appPassword),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  return { ok: response.ok, status: response.status, text, data: text ? JSON.parse(text) : null };
}

async function syncSnippet() {
  const snippets = await wpFetch('/wp-json/code-snippets/v1/snippets');
  const snippet = snippets.find((s) => s.name === RANKMATH_REST_SNIPPET_NAME);
  if (!snippet) return { ok: false, reason: 'snippet not found' };

  const res = await wpPost(`/wp-json/code-snippets/v1/snippets/${snippet.id}`, {
    name: RANKMATH_REST_SNIPPET_NAME,
    code: RANKMATH_REST_SNIPPET_CODE,
    scope: 'global',
    active: true,
  });
  return { ok: res.ok, id: snippet.id };
}

async function purgeAndFlush() {
  return wpPost('/wp-json/adanaavukat/v1/rankmath-global', {
    flush_sitemap: true,
    purge_litespeed: true,
  });
}

async function submitIndexNow() {
  return wpPost('/wp-json/rankmath/v1/in/submitUrls', {
    urls: INDEX_URLS.join('\n'),
  });
}

async function pingBingSitemap() {
  const pingUrl = `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`;
  const r = await fetch(pingUrl);
  return { ok: r.ok, status: r.status, url: pingUrl };
}

async function verifySitemap() {
  const indexRes = await fetch(SITEMAP_URL, { headers: { 'Cache-Control': 'no-cache' } });
  const indexXml = await indexRes.text();
  const childSitemaps = [...indexXml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) => m[1]);
  const urls = new Set();

  for (const sm of childSitemaps) {
    const r = await fetch(`${sm}?t=${Date.now()}`);
    const xml = await r.text();
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/gi)) {
      urls.add(m[1].replace(/\/$/, ''));
    }
  }

  const required = [
    BASE,
    `${BASE}/adana-miras-hukuku`,
    `${BASE}/adana-kira-hukuku`,
    `${BASE}/adana-is-hukuku`,
  ].map((u) => u.replace(/\/$/, ''));

  return {
    indexStatus: indexRes.status,
    totalUrls: urls.size,
    checks: required.map((url) => ({ url, ok: urls.has(url) })),
    allOk: required.every((url) => urls.has(url)),
  };
}

async function verifyHomeSeo() {
  const r = await fetch(`${BASE}/?purge=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } });
  const html = await r.text();
  return {
    title: html.match(/<title[^>]*>([^<]+)/i)?.[1]?.trim(),
    description: html.match(/name="description"[^>]+content="([^"]+)"/i)?.[1],
    ogTitle: html.match(/property="og:title"[^>]+content="([^"]+)"/i)?.[1],
    h1Count: (html.match(/<h1[^>]*>/gi) || []).length,
  };
}

async function main() {
  console.log('Önbellek temizliği ve sitemap gönderimi başlıyor...');
  const report = { at: new Date().toISOString(), steps: {} };

  report.steps.snippet = await syncSnippet();
  console.log('Snippet sync:', report.steps.snippet.ok ? 'OK' : report.steps.snippet);

  await new Promise((r) => setTimeout(r, 1500));

  report.steps.purge = await purgeAndFlush();
  console.log('Purge+flush:', report.steps.purge.status, report.steps.purge.text?.slice(0, 120));

  report.steps.indexNow = await submitIndexNow();
  console.log('IndexNow:', report.steps.indexNow.status, report.steps.indexNow.text?.slice(0, 120));

  report.steps.bingPing = await pingBingSitemap();
  console.log('Bing ping:', report.steps.bingPing.status);

  await new Promise((r) => setTimeout(r, 3000));

  report.sitemap = await verifySitemap();
  report.seo = await verifyHomeSeo();

  const md = `# Önbellek Temizliği ve Sitemap Gönderimi

> ${report.at}

## Yapılanlar

| Adım | Sonuç |
|------|-------|
| Code Snippet güncelleme | ${report.steps.snippet.ok ? '✅' : '❌'} |
| LiteSpeed Purge All | ${report.steps.purge.data?.changed?.purge_litespeed ? '✅' : '⚠️'} |
| Rank Math sitemap flush | ${report.steps.purge.data?.changed?.flush_sitemap ? '✅' : '⚠️'} |
| Rank Math IndexNow (5 URL) | ${report.steps.indexNow.data?.success ? '✅ ' + report.steps.indexNow.data.message : '❌'} |
| Bing sitemap ping | HTTP ${report.steps.bingPing.status} ${report.steps.bingPing.ok ? '✅' : '⚠️'} |

## Sitemap doğrulama

- Index HTTP: ${report.sitemap.indexStatus}
- Toplam URL: ${report.sitemap.totalUrls}
${report.sitemap.checks.map((c) => `- ${c.url}: ${c.ok ? '✅' : '❌'}`).join('\n')}

## Ana sayfa SEO (önbellek sonrası)

- Title: ${report.seo.title}
- Description: ${report.seo.description}
- OG title: ${report.seo.ogTitle}
- H1 sayısı: ${report.seo.h1Count}

## Google Search Console

Rank Math IndexNow ile ana sayfa, 3 hizmet sayfası ve sitemap URL'si arama motorlarına bildirildi. GSC panelinde **Sitemaps** bölümünde \`${SITEMAP_URL}\` zaten kayıtlıysa Google birkaç gün içinde otomatik tarar; değilse panelden manuel ekleyebilirsiniz.
`;

  mkdirSync(resolve(rootDir, 'reports'), { recursive: true });
  const reportPath = resolve(rootDir, 'reports/purge-sitemap-submit-report.md');
  writeFileSync(reportPath, md, 'utf8');
  writeFileSync(resolve(rootDir, 'data/purge-sitemap-submit.json'), JSON.stringify(report, null, 2), 'utf8');

  console.log('Rapor:', reportPath);
  console.log(report.sitemap.allOk ? 'Sitemap: TAMAM' : 'Sitemap: EKSİK URL VAR');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
