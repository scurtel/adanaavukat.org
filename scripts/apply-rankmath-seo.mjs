/**
 * Rank Math SEO ayarları — ana sayfa + sitemap/robots kontrolü.
 */
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { wpFetch } from './lib/wp-client.mjs';
import { getWpConfig, getAuthHeader } from './lib/env.mjs';
import { HOMEPAGE_SEO, HOMEPAGE_ID } from './lib/rankmath-seo.mjs';
import { RANKMATH_REST_SNIPPET_NAME, RANKMATH_REST_SNIPPET_CODE } from './lib/rankmath-rest-snippet.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const BASE = 'https://adanaavukat.org';

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
  if (!response.ok) {
    throw new Error(`${path} ${response.status}: ${text.slice(0, 400)}`);
  }
  return text ? JSON.parse(text) : {};
}

async function ensureCodeSnippetsPlugin() {
  const plugins = await wpFetch('/wp-json/wp/v2/plugins');
  const cs = plugins.find((p) => p.plugin === 'code-snippets/code-snippets');
  if (cs?.status === 'active') return { ok: true, action: 'already_active' };

  return wpPost('/wp-json/wp/v2/plugins', { slug: 'code-snippets', status: 'active' })
    .then((data) => ({ ok: true, action: 'installed', plugin: data.plugin }))
    .catch((e) => ({ ok: false, error: e.message }));
}

async function installRankMathRestSnippet() {
  await ensureCodeSnippetsPlugin();

  const snippets = await wpFetch('/wp-json/code-snippets/v1/snippets');
  let snippet = snippets.find((s) => s.name === RANKMATH_REST_SNIPPET_NAME);

  const payload = {
    name: RANKMATH_REST_SNIPPET_NAME,
    desc: 'Registers Rank Math meta for REST API and adanaavukat/v1 endpoints.',
    code: RANKMATH_REST_SNIPPET_CODE,
    tags: ['seo', 'rank-math', 'adanaavukat'],
    scope: 'global',
    active: true,
    priority: 1,
  };

  if (snippet) {
    snippet = await wpPost(`/wp-json/code-snippets/v1/snippets/${snippet.id}`, payload);
    try {
      await wpPost(`/wp-json/code-snippets/v1/snippets/${snippet.id}/activate`, {});
    } catch {
      // active:true in payload may already activate
    }
    return { installed: true, action: 'updated', id: snippet.id };
  }

  snippet = await wpPost('/wp-json/code-snippets/v1/snippets', payload);
  try {
    await wpPost(`/wp-json/code-snippets/v1/snippets/${snippet.id}/activate`, {});
  } catch {
    // ignore if already active
  }
  return { installed: true, action: 'created', id: snippet.id };
}

async function updateHomepageRankMathMeta() {
  const additional = HOMEPAGE_SEO.additionalKeywords.join(', ');
  const meta = {
    rank_math_title: HOMEPAGE_SEO.title,
    rank_math_description: HOMEPAGE_SEO.description,
    rank_math_focus_keyword: HOMEPAGE_SEO.focusKeyword,
    rank_math_additional_keywords: additional,
    rank_math_facebook_title: HOMEPAGE_SEO.ogTitle,
    rank_math_facebook_description: HOMEPAGE_SEO.ogDescription,
    rank_math_twitter_title: HOMEPAGE_SEO.ogTitle,
    rank_math_twitter_description: HOMEPAGE_SEO.ogDescription,
    rank_math_robots: ['index', 'follow'],
  };

  const methods = [];

  // Method 1: custom endpoint
  try {
    const custom = await wpPost(`/wp-json/adanaavukat/v1/rankmath-meta/${HOMEPAGE_ID}`, meta);
    methods.push({ method: 'adanaavukat/v1', ok: true, custom });
  } catch (e) {
    methods.push({ method: 'adanaavukat/v1', ok: false, error: e.message });
  }

  // Method 2: standard pages meta (after plugin registers fields)
  try {
    const page = await wpPost(`/wp-json/wp/v2/pages/${HOMEPAGE_ID}`, { meta });
    methods.push({
      method: 'wp/v2/pages meta',
      ok: true,
      metaKeys: Object.keys(page.meta || {}).filter((k) => k.startsWith('rank_math')),
    });
  } catch (e) {
    methods.push({ method: 'wp/v2/pages meta', ok: false, error: e.message });
  }

  // Method 3: rankmath updateMeta (often blocked)
  try {
    const { baseUrl, username, appPassword } = getWpConfig();
    const r = await fetch(`${baseUrl}/wp-json/rankmath/v1/updateMeta`, {
      method: 'POST',
      headers: {
        Authorization: getAuthHeader(username, appPassword),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ objectID: HOMEPAGE_ID, objectType: 'post', meta }),
    });
    methods.push({ method: 'rankmath/v1/updateMeta', ok: r.ok, status: r.status });
  } catch (e) {
    methods.push({ method: 'rankmath/v1/updateMeta', ok: false, error: e.message });
  }

  // WP page title + excerpt fallback
  await wpPost(`/wp-json/wp/v2/pages/${HOMEPAGE_ID}`, {
    title: HOMEPAGE_SEO.title,
    excerpt: HOMEPAGE_SEO.description,
  });

  return methods;
}

async function tryArchiveNoindex() {
  try {
    return await wpPost('/wp-json/adanaavukat/v1/rankmath-global', {
      noindex_archive: 'on',
      noindex_category: 'on',
      noindex_tag: 'on',
      noindex_author: 'on',
      noindex_date: 'on',
      noindex_search: 'on',
      sitemap_on: true,
      flush_sitemap: true,
    }).then((data) => ({ ok: true, data }));
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function flushCaches() {
  const { baseUrl, username, appPassword } = getWpConfig();
  const auth = getAuthHeader(username, appPassword);
  const results = [];

  for (const [name, path, body] of [
    ['litespeed purge all', '/wp-json/litespeed/v1/purge_all', {}],
    ['rankmath tools flush_sitemap', '/wp-json/rankmath/v1/toolsAction', { action: 'flush_sitemap' }],
  ]) {
    try {
      const r = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
      });
      results.push({ name, status: r.status, body: (await r.text()).slice(0, 120) });
    } catch (e) {
      results.push({ name, error: e.message });
    }
  }
  return results;
}

function extractFromHtml(html) {
  const getMeta = (name) => {
    const m =
      html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)`, 'i')) ||
      html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, 'i'));
    return m?.[1] || null;
  };
  const getOg = (prop) => {
    const m =
      html.match(new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)`, 'i')) ||
      html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`, 'i'));
    return m?.[1] || null;
  };

  const h1 = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) =>
    m[1].replace(/<[^>]+>/g, '').trim()
  );

  return {
    title: html.match(/<title[^>]*>([^<]+)/i)?.[1]?.trim() || null,
    description: getMeta('description'),
    robots: getMeta('robots'),
    ogTitle: getOg('og:title'),
    ogDescription: getOg('og:description'),
    h1,
    h1Count: h1.length,
  };
}

async function fetchSitemapUrls() {
  const urls = new Set();
  const indexRes = await fetch(`${BASE}/sitemap_index.xml`);
  if (!indexRes.ok) return { ok: false, status: indexRes.status, urls: [] };

  const indexXml = await indexRes.text();
  const childSitemaps = [...indexXml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) => m[1]);

  for (const sm of childSitemaps) {
    const r = await fetch(sm);
    if (!r.ok) continue;
    const xml = await r.text();
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/gi)) {
      urls.add(m[1].replace(/\/$/, ''));
    }
  }

  return { ok: true, childSitemaps, urls: [...urls] };
}

async function checkPages() {
  const checks = [];
  const paths = [
    '/',
    '/adana-miras-hukuku/',
    '/adana-kira-hukuku/',
    '/adana-is-hukuku/',
    '/category/',
    '/tag/',
    '/author/',
  ];

  for (const path of paths) {
    try {
      const r = await fetch(`${BASE}${path}`, { redirect: 'follow' });
      const html = await r.text();
      const seo = extractFromHtml(html);
      checks.push({ path, status: r.status, ...seo });
    } catch (e) {
      checks.push({ path, error: e.message });
    }
  }
  return checks;
}

function charCount(s) {
  return s ? [...s].length : 0;
}

async function backupHomepage() {
  const page = await wpFetch(`/wp-json/wp/v2/pages/${HOMEPAGE_ID}?context=edit`);
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dir = resolve(rootDir, 'data/backups');
  mkdirSync(dir, { recursive: true });
  const file = resolve(dir, `homepage-7-pre-rankmath-seo-${ts}.json`);
  writeFileSync(file, JSON.stringify(page, null, 2), 'utf8');
  return file;
}

async function main() {
  console.log('Rank Math SEO ayarları uygulanıyor...');

  const backupFile = await backupHomepage();
  console.log('Yedek:', backupFile);

  const snippet = await installRankMathRestSnippet();
  console.log('Snippet:', snippet);

  // Brief pause for snippet activation
  await new Promise((r) => setTimeout(r, 2000));

  const updateMethods = await updateHomepageRankMathMeta();
  console.log('Güncelleme yöntemleri:', JSON.stringify(updateMethods, null, 2));

  const archiveNoindex = await tryArchiveNoindex();
  const cacheFlush = await flushCaches();

  // Wait for cache
  await new Promise((r) => setTimeout(r, 3000));

  const homeRes = await fetch(`${BASE}/?nocache=${Date.now()}`);
  const homeHtml = await homeRes.text();
  const liveSeo = extractFromHtml(homeHtml);

  const sitemap = await fetchSitemapUrls();
  const mustBeInSitemap = [
    `${BASE}`,
    `${BASE}/adana-miras-hukuku`,
    `${BASE}/adana-kira-hukuku`,
    `${BASE}/adana-is-hukuku`,
  ].map((u) => u.replace(/\/$/, ''));

  const sitemapCheck = mustBeInSitemap.map((url) => ({
    url,
    inSitemap: sitemap.urls?.some((s) => s.replace(/\/$/, '') === url) ?? false,
  }));

  const pageChecks = await checkPages();

  const brokenLinks = [];
  const internalPaths = [
    '/iletisim/',
    '/adana-miras-hukuku/',
    '/adana-kira-hukuku/',
    '/adana-is-hukuku/',
    '/avukat-ceren-sumer-cilli-kimdir-adana-bosanma-ve-aile-hukuku/',
  ];
  for (const p of internalPaths) {
    const r = await fetch(`${BASE}${p}`, { method: 'HEAD', redirect: 'follow' });
    if (!r.ok) brokenLinks.push({ path: p, status: r.status });
  }

  const titleLen = charCount(liveSeo.title);
  const descLen = charCount(liveSeo.description);

  const report = {
    appliedAt: new Date().toISOString(),
    backupFile,
    snippet,
    updateMethods,
    archiveNoindex,
    cacheFlush,
    target: HOMEPAGE_SEO,
    live: liveSeo,
    validation: {
      titleMatch: liveSeo.title === HOMEPAGE_SEO.title,
      descMatch: liveSeo.description === HOMEPAGE_SEO.description,
      ogTitleMatch: liveSeo.ogTitle === HOMEPAGE_SEO.ogTitle,
      ogDescMatch: liveSeo.ogDescription === HOMEPAGE_SEO.ogDescription,
      singleH1: liveSeo.h1Count === 1,
      titleLength: titleLen,
      titleLengthOk: titleLen <= 60,
      descLength: descLen,
      descLengthOk: descLen >= 140 && descLen <= 165,
      robotsIndexFollow: /index/i.test(liveSeo.robots || '') && /follow/i.test(liveSeo.robots || ''),
    },
    sitemap: { ...sitemap, checked: sitemapCheck, missing: sitemapCheck.filter((c) => !c.inSitemap) },
    pageChecks,
    brokenLinks,
  };

  const reportPath = resolve(rootDir, 'reports/rankmath-seo-apply-report.md');
  const jsonPath = resolve(rootDir, 'data/rankmath-seo-apply.json');
  mkdirSync(resolve(rootDir, 'reports'), { recursive: true });
  writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');

  const md = `# Rank Math SEO — Uygulama ve Kontrol Raporu

> ${report.appliedAt}

## Hedef değerler

| Alan | Değer |
|------|-------|
| Title | ${HOMEPAGE_SEO.title} (${charCount(HOMEPAGE_SEO.title)} karakter) |
| Description | ${HOMEPAGE_SEO.description} (${charCount(HOMEPAGE_SEO.description)} karakter) |
| Focus keyword | ${HOMEPAGE_SEO.focusKeyword} |
| OG title | ${HOMEPAGE_SEO.ogTitle} |
| OG description | ${HOMEPAGE_SEO.ogDescription} |

## Uygulama durumu

| Yöntem | Sonuç |
|--------|-------|
${updateMethods.map((m) => `| ${m.method} | ${m.ok ? '✅' : '❌ ' + (m.error || m.status || '')} |`).join('\n')}

**Code Snippet:** ${snippet.installed ? `Aktif (ID ${snippet.id}, ${snippet.action})` : 'Yüklenemedi'}

**Yedek:** \`${backupFile}\`

## Canlı doğrulama (ana sayfa)

| Kontrol | Hedef | Canlı | Durum |
|---------|-------|-------|-------|
| Title | ${HOMEPAGE_SEO.title} | ${liveSeo.title || '—'} | ${report.validation.titleMatch ? '✅' : '⚠️'} |
| Description | (hedef metin) | ${liveSeo.description || '—'} | ${report.validation.descMatch ? '✅' : '⚠️'} |
| OG title | ${HOMEPAGE_SEO.ogTitle} | ${liveSeo.ogTitle || '—'} | ${report.validation.ogTitleMatch ? '✅' : '⚠️'} |
| OG description | (hedef metin) | ${liveSeo.ogDescription || '—'} | ${report.validation.ogDescMatch ? '✅' : '⚠️'} |
| Robots | index, follow | ${liveSeo.robots || '—'} | ${report.validation.robotsIndexFollow ? '✅' : '⚠️'} |
| H1 sayısı | 1 | ${liveSeo.h1Count} (${liveSeo.h1?.join(' / ') || ''}) | ${report.validation.singleH1 ? '✅' : '❌'} |
| Title uzunluğu | ≤60 | ${titleLen} | ${report.validation.titleLengthOk ? '✅' : '⚠️'} |
| Description uzunluğu | 140–165 | ${descLen} | ${report.validation.descLengthOk ? '✅' : '⚠️'} |

## Sitemap

- Index erişimi: ${sitemap.ok ? '✅' : '❌ HTTP ' + sitemap.status}
- Toplam URL: ${sitemap.urls?.length ?? 0}
${sitemapCheck.map((c) => `- ${c.url}: ${c.inSitemap ? '✅ sitemap içinde' : '❌ eksik'}`).join('\n')}

## Robots / arşiv sayfaları

${pageChecks
  .map((p) => `- \`${p.path}\` → robots: ${p.robots || '—'} (HTTP ${p.status || '?'})`)
  .join('\n')}

**Arşiv noindex (Rank Math updateSettings):** ${archiveNoindex.ok ? 'API çağrısı başarılı' : 'API engellendi veya başarısız (' + (archiveNoindex.status || archiveNoindex.error) + ')'}

## Kırık linkler

${brokenLinks.length ? brokenLinks.map((b) => `- ❌ ${b.path} (HTTP ${b.status})`).join('\n') : 'Kırık link tespit edilmedi.'}

## Manuel adımlar (gerekirse)

1. Rank Math panelinde ana sayfa SEO skorunu doğrula (focus keyword + yardımcı kelimeler)
2. LiteSpeed Cache → Purge All (sitemap XML önbelleği için)
3. Google Search Console'da sitemap yeniden gönder: https://adanaavukat.org/sitemap_index.xml
`;

  writeFileSync(reportPath, md, 'utf8');
  console.log('Rapor:', reportPath);
  console.log('JSON:', jsonPath);

  if (!report.validation.titleMatch) {
    console.log('\n⚠️  Rank Math meta canlıda henüz güncellenmemiş olabilir. Raporu kontrol edin.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
