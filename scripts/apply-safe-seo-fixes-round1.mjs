/**
 * Güvenli SEO düzeltme turu 1 — düşük riskli teknik düzeltmeler.
 * Kullanım: node scripts/apply-safe-seo-fixes-round1.mjs [--dry-run]
 */
import { mkdirSync, writeFileSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { wpFetch, wpFetchAll } from './lib/wp-client.mjs';
import { getWpConfig, getAuthHeader, rootDir } from './lib/env.mjs';
import { buildFixedHtaccess } from './lib/htaccess-safe-fixes.mjs';
import {
  buildWwwRedirectSnippetPhp,
  buildHomepagePagedNoindexSnippetPhp,
  buildProfileRedirectGuardSnippetPhp,
  SNIPPET_NAMES_ROUND1,
} from './lib/safe-seo-snippets.mjs';
import {
  buildAuthorityRedirectSnippetPhp,
} from './lib/authority-snippets.mjs';
import {
  BASE_URL,
  PROFILE_SLUG_OLD,
  PROFILE_SLUG_NEW,
  PROFILE_PAGE_ID,
  SNIPPET_NAMES,
} from './lib/ceren-authority-config.mjs';
import { HIZMETLERIMIZ_PAGE_ID } from './lib/menu-structure.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dryRun = process.argv.includes('--dry-run');
const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const reportDir = resolve(rootDir, 'reports');
const dataDir = resolve(rootDir, 'data');

const TARGET_PAGES = [
  '/adana-bosanma-avukati/',
  '/adana-aile-hukuku-avukati/',
  '/adana-anlasmali-bosanma-avukati/',
  '/hizmetlerimiz/',
  '/avukat-ceren-sumer-cilli/',
];

const HOMEPAGE_ID = 7;
const HOSTINGER_DOMAIN = 'adanaavukat.org';
const HOSTINGER_USERNAME = process.env.HOSTINGER_USERNAME || 'u687566817';

const state = {
  timestamp: ts,
  dryRun,
  htaccess: { before: null, after: null, uploaded: false },
  snippets: [],
  homepage: { changed: false, patches: [] },
  hizmetlerimiz: { changed: false, patches: [] },
  postsProfileUrlFix: [],
  internalLinks: [],
  nearDuplicates: [],
  httpBefore: {},
  httpAfter: {},
  skipped: [],
};

async function wpPost(path, body, method = 'POST') {
  const { baseUrl, username, appPassword } = getWpConfig();
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: getAuthHeader(username, appPassword),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${path} ${response.status}: ${text.slice(0, 500)}`);
  }
  return text ? JSON.parse(text) : {};
}

async function upsertSnippet(name, code, desc) {
  const snippets = await wpFetch('/wp-json/code-snippets/v1/snippets');
  let snippet = snippets.find((s) => s.name === name);
  const payload = { name, code, desc, scope: 'global', active: true };
  if (dryRun) {
    return { action: snippet ? 'would-update' : 'would-create', id: snippet?.id || null, name };
  }
  if (snippet) {
    snippet = await wpPost(`/wp-json/code-snippets/v1/snippets/${snippet.id}`, payload);
    try {
      await wpPost(`/wp-json/code-snippets/v1/snippets/${snippet.id}/activate`, {});
    } catch {
      /* already active */
    }
    return { action: 'updated', id: snippet.id, name };
  }
  snippet = await wpPost('/wp-json/code-snippets/v1/snippets', payload);
  try {
    await wpPost(`/wp-json/code-snippets/v1/snippets/${snippet.id}/activate`, {});
  } catch {
    /* ignore */
  }
  return { action: 'created', id: snippet.id, name };
}

function patchHomepageInternalLinks(html = '') {
  let next = html;
  const patches = [];

  const replacements = [
    [
      `${BASE_URL}/anlasmali-bosanma-davasi-nedir/`,
      `${BASE_URL}/adana-anlasmali-bosanma-avukati/`,
      'Anlaşmalı Boşanma kartı → hizmet sayfası',
    ],
    [
      `${BASE_URL}/velayet-davasinda-hakim-nelere-dikkat-eder/`,
      `${BASE_URL}/velayet-davasi-avukati-adana/`,
      'Velayet kartı → hizmet sayfası',
    ],
  ];

  for (const [from, to, note] of replacements) {
    if (next.includes(from)) {
      next = next.split(from).join(to);
      patches.push({ type: 'replace', from, to, note });
    }
  }

  const aileCard = `<div class="aa-card"><h3>Aile Hukuku</h3><p>Boşanma, nafaka, velayet ve mal rejimi gibi aile hukuku uyuşmazlıklarında genel bilgilendirme.</p><a class="aa-card-link" href="${BASE_URL}/adana-aile-hukuku-avukati/">Detaylı Bilgi</a></div>`;
  if (!next.includes('/adana-aile-hukuku-avukati/')) {
    const marker = `<div class="aa-card"><h3>Boşanma Davaları</h3>`;
    if (next.includes(marker)) {
      next = next.replace(marker, `${aileCard}\n${marker}`);
      patches.push({ type: 'insert', note: 'Aile Hukuku hizmet kartı eklendi' });
    }
  }

  const hizmetLink = `<p class="aa-section-lead" style="margin-top:2rem;margin-bottom:0"><a href="${BASE_URL}/hizmetlerimiz/">Tüm hizmet alanlarını Hizmetlerimiz sayfasında inceleyebilirsiniz.</a></p>`;
  if (!next.includes('/hizmetlerimiz/')) {
    const closeGrid = '</div>\n</div>\n</section>';
    const idx = next.indexOf('aa-grid-services');
    if (idx !== -1) {
      const sectionEnd = next.indexOf(closeGrid, idx);
      if (sectionEnd !== -1 && !next.slice(idx, sectionEnd).includes('/hizmetlerimiz/')) {
        next =
          next.slice(0, sectionEnd) +
          `\n${hizmetLink}\n` +
          next.slice(sectionEnd);
        patches.push({ type: 'insert', note: 'Hizmetlerimiz iç linki eklendi' });
      }
    }
  }

  return { html: next, changed: next !== html, patches };
}

function patchHizmetlerimizLinks(html = '') {
  let next = html;
  const patches = [];
  const additions = [];

  const required = [
    {
      slug: 'adana-bosanma-avukati',
      anchor: 'Adana boşanma avukatı hizmet sayfası',
    },
    {
      slug: 'adana-aile-hukuku-avukati',
      anchor: 'Adana aile hukuku avukatı hizmet sayfası',
    },
    {
      slug: 'adana-anlasmali-bosanma-avukati',
      anchor: 'Adana anlaşmalı boşanma avukatı hizmet sayfası',
    },
    {
      slug: 'avukat-ceren-sumer-cilli',
      anchor: 'Avukat Ceren Sümer Cilli profil sayfası',
    },
  ];

  for (const { slug, anchor } of required) {
    if (!next.includes(`/${slug}/`)) {
      additions.push(
        `<li><a href="${BASE_URL}/${slug}/">${anchor}</a></li>`
      );
      patches.push({ slug, anchor, type: 'missing-link' });
    }
  }

  if (additions.length) {
    const block = `<ul class="aa-internal-links-round1">\n${additions.join('\n')}\n</ul>`;
    if (next.includes('</div><!-- /wp:html -->')) {
      next = next.replace('</div><!-- /wp:html -->', `${block}\n</div><!-- /wp:html -->`);
    } else {
      next = `${next}\n${block}`;
    }
  }

  return { html: next, changed: next !== html, patches };
}

function replaceOldProfileUrls(html = '') {
  const oldUrl = `${BASE_URL}/${PROFILE_SLUG_OLD}/`;
  const newUrl = `${BASE_URL}/${PROFILE_SLUG_NEW}/`;
  if (!html.includes(PROFILE_SLUG_OLD)) {
    return { html, changed: false };
  }
  return {
    html: html.split(oldUrl).join(newUrl),
    changed: true,
  };
}

async function fetchHtaccessViaHostingerApi() {
  // Script runs standalone; read backup if MCP fetch unavailable
  const backupPath = resolve(dataDir, 'htaccess-live-backup.txt');
  try {
    return readFileSync(backupPath, 'utf8');
  } catch {
    throw new Error(
      'Canlı .htaccess yedeği bulunamadı. Önce MCP ile data/htaccess-live-backup.txt oluşturun.'
    );
  }
}

async function uploadHtaccessViaTus(fixedContent, uploadMeta) {
  const { url, auth_key, rest_auth_key } = uploadMeta;
  const filePath = '.htaccess';
  const bytes = Buffer.from(fixedContent, 'utf8');
  const size = bytes.length;
  const target = `${url}/${filePath}?override=true`;

  const createRes = await fetch(target, {
    method: 'POST',
    headers: {
      'X-Auth': auth_key,
      'X-Auth-Rest': rest_auth_key,
      'Tus-Resumable': '1.0.0',
      'Upload-Length': String(size),
      'Upload-Offset': '0',
    },
  });
  if (!createRes.ok && createRes.status !== 201) {
    const body = await createRes.text();
    throw new Error(`TUS create failed ${createRes.status}: ${body.slice(0, 300)}`);
  }

  const patchRes = await fetch(target, {
    method: 'PATCH',
    headers: {
      'X-Auth': auth_key,
      'X-Auth-Rest': rest_auth_key,
      'Tus-Resumable': '1.0.0',
      'Content-Type': 'application/offset+octet-stream',
      'Upload-Offset': '0',
    },
    body: bytes,
  });
  if (!patchRes.ok && patchRes.status !== 204) {
    const body = await patchRes.text();
    throw new Error(`TUS patch failed ${patchRes.status}: ${body.slice(0, 300)}`);
  }
}

async function httpProbe(label, url, { follow = false, maxRedirects = 0 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    let current = url;
    const chain = [];
    for (let i = 0; i <= maxRedirects; i++) {
      const res = await fetch(current, {
        redirect: follow ? 'follow' : 'manual',
        signal: controller.signal,
        headers: { 'User-Agent': 'adanaavukat-seo-audit/1.0' },
      });
      if (follow) {
        return {
          label,
          url,
          finalUrl: res.url,
          status: res.status,
          chain: [{ url: current, status: res.status }],
        };
      }
      chain.push({ url: current, status: res.status, location: res.headers.get('location') });
      if (![301, 302, 303, 307, 308].includes(res.status)) {
        return { label, url, finalUrl: current, status: res.status, chain };
      }
      const loc = res.headers.get('location');
      if (!loc) break;
      current = new URL(loc, current).href;
    }
    return { label, url, finalUrl: current, status: chain.at(-1)?.status, chain };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchHtmlMeta(url) {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: { 'User-Agent': 'adanaavukat-seo-audit/1.0' },
  });
  const html = await res.text();
  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1]
    || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i)?.[1]
    || null;
  const robots = html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i)?.[1]
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']robots["']/i)?.[1]
    || null;
  return { url: res.url, status: res.status, canonical, robots };
}

function buildNearDuplicateReport(posts) {
  const clusters = [
    {
      topic: 'Anlaşmalı boşanma',
      slugs: [
        'anlasmali-bosanma-davasi-nedir',
        'anlasmali-bosanma-davasi-nedir-sartlari-sureci-ve-guncel-uygulamalar',
      ],
      primary: 'anlasmali-bosanma-davasi-nedir',
      reason:
        'Daha kısa slug, genel tanım niteliğinde; diğeri süreç/şart odaklı alt konu olarak kalabilir.',
    },
    {
      topic: 'Çekişmeli boşanma',
      slugs: [
        'adana-cekismeli-bosanma-davasi-nedir',
        'adanada-cekismeli-bosanma-davasi-nedir',
        'adana-cekismeli-bosanma-davasi-adim-adim',
      ],
      primary: 'adana-cekismeli-bosanma-davasi-nedir',
      reason:
        'Adana odaklı ana rehber; adim-adim ve yazım varyantı (adanada) destekleyici içerik.',
    },
    {
      topic: 'Hakimin takdir yetkisi',
      slugs: [
        'bosanma-davasinda-hakimin-takdir-yetkisi',
        'bosanma-davasinda-hakimin-takdir-yetkisi-nedir',
      ],
      primary: 'bosanma-davasinda-hakimin-takdir-yetkisi-nedir',
      reason:
        '“Nedir” sorusu arama niyetine daha uygun; kısa slug muhtemelen erken taslak.',
    },
  ];

  return clusters.map((c) => {
    const items = c.slugs.map((slug) => {
      const post = posts.find((p) => p.slug === slug);
      return {
        slug,
        url: post ? `${BASE_URL}/${slug}/` : `${BASE_URL}/${slug}/`,
        title: post?.title?.rendered || slug,
        status: post?.status || 'unknown',
        wordEstimate: post?.content?.rendered
          ? post.content.rendered.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length
          : null,
      };
    });
    return { ...c, items };
  });
}

async function analyzeInternalLinks(pages, posts) {
  const sources = [
    { type: 'page', id: HOMEPAGE_ID, slug: 'home', title: 'Ana sayfa' },
    { type: 'page', id: HIZMETLERIMIZ_PAGE_ID, slug: 'hizmetlerimiz', title: 'Hizmetlerimiz' },
    ...pages
      .filter((p) =>
        ['adana-bosanma-avukati', 'adana-aile-hukuku-avukati', 'adana-anlasmali-bosanma-avukati'].includes(
          p.slug
        )
      )
      .map((p) => ({ type: 'page', id: p.id, slug: p.slug, title: p.title?.rendered })),
  ];

  const familyPosts = posts
    .filter((p) => p.status === 'publish')
    .slice(0, 40);

  for (const p of familyPosts) {
    sources.push({ type: 'post', id: p.id, slug: p.slug, title: p.title?.rendered });
  }

  const matrix = TARGET_PAGES.map((target) => {
    const path = target.replace(/\/$/, '');
    const linkedFrom = sources.filter((s) => {
      const html = s._html || '';
      return html.includes(path);
    });
    return { target, linkedFromCount: linkedFrom.length, linkedFrom: linkedFrom.map((s) => s.slug) };
  });

  return matrix;
}

async function runHttpTests(phase) {
  const tests = [
    ['homepage', `${BASE_URL}/`],
    ['robots', `${BASE_URL}/robots.txt`],
    ['sitemap', `${BASE_URL}/sitemap_index.xml`],
    ['bosanma', `${BASE_URL}/adana-bosanma-avukati/`],
    ['aile', `${BASE_URL}/adana-aile-hukuku-avukati/`],
    ['anlasmali', `${BASE_URL}/adana-anlasmali-bosanma-avukati/`],
    ['hizmetler', `${BASE_URL}/hizmetlerimiz/`],
    ['profil-yeni', `${BASE_URL}/avukat-ceren-sumer-cilli/`],
    ['page2', `${BASE_URL}/page/2/`],
    ['wp-admin', `${BASE_URL}/wp-admin/`],
  ];

  const results = {};
  for (const [key, url] of tests) {
    const basic = await httpProbe(key, url, { follow: true });
    results[key] = basic;
    if (['homepage', 'profil-yeni', 'page2', 'bosanma'].includes(key)) {
      results[`${key}-meta`] = await fetchHtmlMeta(url);
    }
  }

  results.oldProfileRedirect = await httpProbe(
    'old-profile',
    `${BASE_URL}/${PROFILE_SLUG_OLD}/`,
    { follow: false, maxRedirects: 5 }
  );
  results.wwwHttpRedirect = await httpProbe(
    'www-http',
    `http://www.adanaavukat.org/test-path?x=1`,
    { follow: false, maxRedirects: 5 }
  );

  state[phase] = results;
  return results;
}

function writeReport() {
  mkdirSync(reportDir, { recursive: true });
  const md = `# Güvenli SEO Düzeltme Turu 1 — Rapor

Tarih: ${state.timestamp}
Dry-run: ${state.dryRun ? 'evet' : 'hayır'}

## Değiştirilen dosya/ayarlar

### .htaccess
- Yedek: \`data/htaccess-live-backup.txt\`
- Düzeltilmiş: \`data/htaccess-fixed-round1.txt\`
- Yüklendi: ${state.htaccess.uploaded ? 'evet' : state.dryRun ? 'dry-run' : 'hayır'}

### Code Snippets
${state.snippets.map((s) => `- ${s.name}: ${s.action} (id: ${s.id ?? '—'})`).join('\n') || '- —'}

### Ana sayfa (ID ${HOMEPAGE_ID})
${state.homepage.patches.map((p) => `- ${p.note || JSON.stringify(p)}`).join('\n') || '- Değişiklik yok'}

### Hizmetlerimiz (ID ${HIZMETLERIMIZ_PAGE_ID})
${state.hizmetlerimiz.patches.map((p) => `- ${p.slug || p.note}: ${p.anchor || p.type || ''}`).join('\n') || '- Değişiklik yok'}

### Eski profil URL düzeltmeleri (içerik)
${state.postsProfileUrlFix.map((p) => `- ${p.slug} (${p.id})`).join('\n') || '- —'}

## HTTP davranışı

### Önce
\`\`\`json
${JSON.stringify(state.httpBefore, null, 2)}
\`\`\`

### Sonra
\`\`\`json
${JSON.stringify(state.httpAfter, null, 2)}
\`\`\`

## Eklenen / düzeltilen iç linkler
${state.internalLinks.map((l) => `- ${l}`).join('\n') || '- —'}

## Yakın kopya makale analizi (işlem yapılmadı)
${state.nearDuplicates
  .map(
    (c) => `### ${c.topic}
- **Önerilen ana içerik:** \`/${c.primary}/\`
- **Neden:** ${c.reason}
${c.items.map((i) => `- \`/${i.slug}/\` — ${i.title} (${i.wordEstimate ?? '?'} kelime)`).join('\n')}
`
  )
  .join('\n')}

## Bu turda bilinçli olarak dokunulmayan riskli maddeler
${state.skipped.map((s) => `- ${s}`).join('\n')}
`;

  const path = resolve(reportDir, `safe-seo-fixes-round1-${ts}.md`);
  writeFileSync(path, md, 'utf8');
  writeFileSync(resolve(dataDir, 'safe-seo-fixes-round1-latest.json'), JSON.stringify(state, null, 2), 'utf8');
  return path;
}

async function main() {
  mkdirSync(dataDir, { recursive: true });
  state.skipped = [
    'Kategori noindex ayarı değiştirilmedi',
    'Category sitemap kapatılmadı',
    'Trump/off-topic içerikler silinmedi veya noindex yapılmadı',
    'Hiçbir yazı silinmedi',
    'Yakın kopya makalelerde 301/canonical değişikliği yapılmadı',
    'GSC URL indexing request gönderilmedi',
  ];

  console.log('HTTP testleri (önce)...');
  await runHttpTests('httpBefore');

  // --- .htaccess ---
  let htaccessCurrent;
  try {
    htaccessCurrent = await fetchHtaccessViaHostingerApi();
  } catch (e) {
    console.warn(e.message);
    htaccessCurrent = state.httpBefore ? '' : '';
  }

  if (!htaccessCurrent) {
    // fallback minimal broken sample from audit - user should have backup
    console.warn('.htaccess yedeği yok; snippet katmanına güvenilecek.');
  } else {
    state.htaccess.before = htaccessCurrent.slice(-200);
    const fixed = buildFixedHtaccess(htaccessCurrent);
    state.htaccess.after = fixed.slice(0, 400);
    writeFileSync(resolve(dataDir, 'htaccess-fixed-round1.txt'), fixed, 'utf8');

    if (!dryRun && process.env.HOSTINGER_UPLOAD_URL && process.env.HOSTINGER_AUTH_KEY) {
      await uploadHtaccessViaTus(fixed, {
        url: process.env.HOSTINGER_UPLOAD_URL,
        auth_key: process.env.HOSTINGER_AUTH_KEY,
        rest_auth_key: process.env.HOSTINGER_REST_AUTH_KEY,
      });
      state.htaccess.uploaded = true;
    } else if (!dryRun) {
      console.warn('.htaccess upload atlandı (HOSTINGER_UPLOAD_* env yok). Snippet yedekleri aktif.');
    }
  }

  // --- Snippets ---
  state.snippets.push(
    await upsertSnippet(
      SNIPPET_NAMES.redirects,
      buildAuthorityRedirectSnippetPhp(),
      'Eski profil/yazar URL 301 yönlendirmeleri'
    )
  );
  state.snippets.push(
    await upsertSnippet(
      SNIPPET_NAMES_ROUND1.profileGuard,
      buildProfileRedirectGuardSnippetPhp(),
      'Eski profil slug ek güvenlik 301'
    )
  );
  state.snippets.push(
    await upsertSnippet(
      SNIPPET_NAMES_ROUND1.wwwRedirect,
      buildWwwRedirectSnippetPhp(),
      'www → apex canonical redirect'
    )
  );
  state.snippets.push(
    await upsertSnippet(
      SNIPPET_NAMES_ROUND1.homepagePagedNoindex,
      buildHomepagePagedNoindexSnippetPhp(),
      'Ana sayfa /page/N/ noindex'
    )
  );

  // --- Homepage internal links ---
  const homepage = await wpFetch(`/wp-json/wp/v2/pages/${HOMEPAGE_ID}?context=edit`);
  const homeRaw = homepage.content?.raw || homepage.content?.rendered || '';
  const homePatch = patchHomepageInternalLinks(homeRaw);
  state.homepage.patches = homePatch.patches;
  if (homePatch.changed && !dryRun) {
    await wpPost(`/wp-json/wp/v2/pages/${HOMEPAGE_ID}`, { content: homePatch.html });
    state.homepage.changed = true;
    for (const p of homePatch.patches) {
      state.internalLinks.push(`Ana sayfa: ${p.note || p.to}`);
    }
  }

  // --- Hizmetlerimiz ---
  const hizmet = await wpFetch(`/wp-json/wp/v2/pages/${HIZMETLERIMIZ_PAGE_ID}?context=edit`);
  const hizRaw = hizmet.content?.raw || hizmet.content?.rendered || '';
  const hizPatch = patchHizmetlerimizLinks(hizRaw);
  state.hizmetlerimiz.patches = hizPatch.patches;
  if (hizPatch.changed && !dryRun) {
    await wpPost(`/wp-json/wp/v2/pages/${HIZMETLERIMIZ_PAGE_ID}`, { content: hizPatch.html });
    state.hizmetlerimiz.changed = true;
    for (const p of hizPatch.patches) {
      state.internalLinks.push(`Hizmetlerimiz → /${p.slug}/ (${p.anchor})`);
    }
  }

  // --- Old profile URLs in content ---
  const allPosts = await wpFetchAll('/wp-json/wp/v2/posts', { status: 'publish', per_page: 100 });
  const allPages = await wpFetchAll('/wp-json/wp/v2/pages', { status: 'publish', per_page: 100 });
  for (const item of [...allPosts, ...allPages]) {
    if (item.id === PROFILE_PAGE_ID) continue;
    const raw = item.content?.rendered || '';
    if (!raw.includes(PROFILE_SLUG_OLD)) continue;
    const fixed = replaceOldProfileUrls(raw);
    if (fixed.changed && !dryRun) {
      const endpoint = item.type === 'page' ? 'pages' : 'posts';
      const full = await wpFetch(`/wp-json/wp/v2/${endpoint}/${item.id}?context=edit`);
      const editRaw = full.content?.raw || full.content?.rendered || '';
      const editFixed = replaceOldProfileUrls(editRaw);
      await wpPost(`/wp-json/wp/v2/${endpoint}/${item.id}`, { content: editFixed.html });
      state.postsProfileUrlFix.push({ id: item.id, slug: item.slug, type: item.type });
      state.internalLinks.push(`${item.slug}: eski profil URL → yeni profil`);
    }
  }

  // --- Service pages cross-links (minimal, only if missing profile/hizmetler) ---
  const serviceSlugs = ['adana-bosanma-avukati', 'adana-aile-hukuku-avukati', 'adana-anlasmali-bosanma-avukati'];
  for (const slug of serviceSlugs) {
    const page = allPages.find((p) => p.slug === slug);
    if (!page) continue;
    const full = await wpFetch(`/wp-json/wp/v2/pages/${page.id}?context=edit`);
    let html = full.content?.raw || full.content?.rendered || '';
    let changed = false;
    const footer =
      `<p>İlgili hizmetler: <a href="${BASE_URL}/hizmetlerimiz/">Hizmetlerimiz</a> · <a href="${BASE_URL}/avukat-ceren-sumer-cilli/">Avukat profili</a></p>`;
    if (!html.includes('/avukat-ceren-sumer-cilli/') || !html.includes('/hizmetlerimiz/')) {
      if (!html.includes('/avukat-ceren-sumer-cilli/') && !html.includes('/hizmetlerimiz/')) {
        html = `${html}\n${footer}`;
        changed = true;
        state.internalLinks.push(`${slug}: profil + hizmetlerimiz footer linki`);
      } else if (!html.includes('/avukat-ceren-sumer-cilli/')) {
        html = `${html}\n<p><a href="${BASE_URL}/avukat-ceren-sumer-cilli/">Avukat Ceren Sümer Cilli profil sayfası</a></p>`;
        changed = true;
        state.internalLinks.push(`${slug}: profil footer linki`);
      } else if (!html.includes('/hizmetlerimiz/')) {
        html = `${html}\n<p><a href="${BASE_URL}/hizmetlerimiz/">Tüm hizmet alanları</a></p>`;
        changed = true;
        state.internalLinks.push(`${slug}: hizmetlerimiz footer linki`);
      }
    }
    if (changed && !dryRun) {
      await wpPost(`/wp-json/wp/v2/pages/${page.id}`, { content: html });
    }
  }

  state.nearDuplicates = buildNearDuplicateReport(allPosts);

  // Re-fetch for link matrix after changes
  const freshHome = await wpFetch(`/wp-json/wp/v2/pages/${HOMEPAGE_ID}?context=edit`);
  const freshHiz = await wpFetch(`/wp-json/wp/v2/pages/${HIZMETLERIMIZ_PAGE_ID}?context=edit`);
  const enrichedPages = await wpFetchAll('/wp-json/wp/v2/pages', { status: 'publish', per_page: 100 });
  const enrichedPosts = await wpFetchAll('/wp-json/wp/v2/posts', { status: 'publish', per_page: 100 });
  for (const s of [
    { type: 'page', id: HOMEPAGE_ID, slug: 'home', title: 'Ana sayfa', _html: freshHome.content?.rendered || '' },
    {
      type: 'page',
      id: HIZMETLERIMIZ_PAGE_ID,
      slug: 'hizmetlerimiz',
      title: 'Hizmetlerimiz',
      _html: freshHiz.content?.rendered || '',
    },
  ]) {
    /* pre-seeded */
  }

  console.log('HTTP testleri (sonra)...');
  if (!dryRun) {
    await new Promise((r) => setTimeout(r, 3000));
  }
  await runHttpTests('httpAfter');

  const reportPath = writeReport();
  console.log(`\nRapor: ${reportPath}`);
  console.log(JSON.stringify({ dryRun, htaccessUploaded: state.htaccess.uploaded, snippets: state.snippets.length }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
