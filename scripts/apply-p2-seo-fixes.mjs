/**
 * P2 SEO düzeltmeleri:
 * 1. /about-us/ ve /contact/ → noindex + 301 yönlendirme
 * 2. 3 eski featured image alt text
 * 3. Schema / iç link: cerensumer.av.tr birincil URL → adanaavukat.org
 */
import { mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { wpFetch } from './lib/wp-client.mjs';
import { getWpConfig, getAuthHeader } from './lib/env.mjs';
import { ENTITY, BASE_URL } from './lib/service-pages-config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const REPORT_PATH = resolve(rootDir, 'reports/p2-seo-fixes-report.json');

const DUPLICATE_PAGES = [
  { id: 25, slug: 'about-us', redirectTo: '/hakkimizda/' },
  { id: 29, slug: 'contact', redirectTo: '/iletisim/' },
];

const MEDIA_ALT_UPDATES = [
  {
    mediaId: 100,
    postId: 98,
    altText: 'Anlaşmalı Boşanma Davası konusu: Şartları, Süreci ve Güncel Uygulamalar — Adana Avukat',
  },
  {
    mediaId: 123,
    postId: 122,
    altText: 'Boşanma Davası konusu: Hakimin Takdir Yetkisi Nedir? — Adana Avukat',
  },
  {
    mediaId: 151,
    postId: 131,
    altText: 'Nafaka Hukuku konusu: Nafaka Türleri — Tedbir, İştirak ve Yoksulluk Nafakası — Adana Avukat',
  },
];

const CONTENT_ALIGN_TARGETS = [
  { type: 'pages', id: 41, slug: 'hakkimizda' },
  { type: 'pages', id: 268, slug: 'avukat-ceren-sumer-cilli-kimdir-adana-bosanma-ve-aile-hukuku' },
  { type: 'pages', id: 7, slug: 'adana-avukat' },
];

const REDIRECT_SNIPPET_NAME = 'Adana Avukat EN Duplicate Redirects';

const REDIRECT_SNIPPET_PHP = `/**
 * İngilizce kopya sayfaları Türkçe kanonik URL'lere yönlendir
 */
add_action('template_redirect', function () {
    if (is_page('about-us')) {
        wp_safe_redirect(home_url('/hakkimizda/'), 301);
        exit;
    }
    if (is_page('contact')) {
        wp_safe_redirect(home_url('/iletisim/'), 301);
        exit;
    }
}, 1);`;

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

async function updateRankMathMeta(pageId, meta) {
  try {
    await wpPost(`/wp-json/adanaavukat/v1/rankmath-meta/${pageId}`, meta);
    return { ok: true };
  } catch (e) {
    try {
      await wpPost(`/wp-json/wp/v2/pages/${pageId}`, { meta });
      return { ok: true, fallback: true };
    } catch (e2) {
      return { ok: false, error: e2.message };
    }
  }
}

export function alignEntityUrlsInContent(content) {
  if (!content || !content.includes('cerensumer.av.tr')) {
    return { content, changed: false, notes: [] };
  }

  const notes = [];
  let next = content;
  const profileUrl = ENTITY.profileUrl;
  const oldBase = 'https://www.cerensumer.av.tr';

  next = next.replace(/https:\/\/www\.cerensumer\.av\.tr\/(?!wp-content\/)[^"'<\s]*/g, (match) => {
    notes.push(`${match} → ${profileUrl}`);
    return profileUrl;
  });

  const replacements = [
    [`${oldBase}/#person`, `${BASE_URL}/#person`],
    [`${oldBase}/#legalservice`, `${BASE_URL}/#legalservice`],
    [`"${oldBase}/"`, `"${BASE_URL}/"`],
    [`'${oldBase}/'`, `'${BASE_URL}/'`],
    [`href="${oldBase}/"`, `href="${profileUrl}"`],
    [`href='${oldBase}/'`, `href='${profileUrl}'`],
    [`href="${oldBase}"`, `href="${profileUrl}"`],
  ];

  for (const [from, to] of replacements) {
    if (next.includes(from)) {
      next = next.split(from).join(to);
      notes.push(`${from} → ${to}`);
    }
  }

  if (next.includes('"url": "https://www.cerensumer.av.tr"')) {
    next = next.replace(/"url":\s*"https:\/\/www\.cerensumer\.av\.tr\/?"/g, `"url": "${profileUrl}"`);
    notes.push('schema Person url → profile');
  }

  const sameAsNeedle = 'https://www.cerensumer.av.tr/';
  if (next.includes('sameAs') && !next.includes(sameAsNeedle)) {
    next = next.replace(
      /"sameAs":\s*\[/,
      `"sameAs": [\n        "${sameAsNeedle}",`
    );
    notes.push('added cerensumer.av.tr to sameAs');
  }

  return { content: next, changed: next !== content, notes };
}

async function fixDuplicatePages() {
  const results = [];

  for (const page of DUPLICATE_PAGES) {
    const rankMath = await updateRankMathMeta(page.id, {
      rank_math_robots: ['noindex', 'nofollow'],
      rank_math_canonical_url: `${BASE_URL}${page.redirectTo}`,
    });

    results.push({
      ...page,
      rankMath,
      action: 'noindex+canonical',
    });
  }

  return results;
}

async function ensureRedirectSnippet() {
  const snippets = await wpFetch('/wp-json/code-snippets/v1/snippets');
  let snippet = snippets.find((s) => s.name === REDIRECT_SNIPPET_NAME);

  const payload = {
    name: REDIRECT_SNIPPET_NAME,
    desc: 'about-us ve contact sayfalarını kanonik TR URL’lere 301 yönlendirir.',
    code: REDIRECT_SNIPPET_PHP,
    tags: ['seo', 'redirect', 'adanaavukat'],
    scope: 'global',
    active: true,
    priority: 4,
  };

  if (snippet) {
    snippet = await wpPost(`/wp-json/code-snippets/v1/snippets/${snippet.id}`, payload);
    try {
      await wpPost(`/wp-json/code-snippets/v1/snippets/${snippet.id}/activate`, {});
    } catch {
      // ignore
    }
    return { action: 'updated', id: snippet.id };
  }

  snippet = await wpPost('/wp-json/code-snippets/v1/snippets', payload);
  try {
    await wpPost(`/wp-json/code-snippets/v1/snippets/${snippet.id}/activate`, {});
  } catch {
    // ignore
  }
  return { action: 'created', id: snippet.id };
}

async function updateMediaAltText() {
  const results = [];

  for (const item of MEDIA_ALT_UPDATES) {
    const before = await wpFetch(`/wp-json/wp/v2/media/${item.mediaId}`);
    const updated = await wpPost(`/wp-json/wp/v2/media/${item.mediaId}`, {
      alt_text: item.altText,
      title: item.altText.slice(0, 80),
    });
    results.push({
      ...item,
      beforeAlt: before.alt_text || '',
      afterAlt: updated.alt_text || item.altText,
      action: 'updated',
    });
  }

  return results;
}

async function alignContentUrls() {
  const results = [];

  for (const target of CONTENT_ALIGN_TARGETS) {
    const item = await wpFetch(`/wp-json/wp/v2/${target.type}/${target.id}?context=edit`);
    const raw = item.content?.raw || '';
    const { content, changed, notes } = alignEntityUrlsInContent(raw);

    const entry = { ...target, changed, notes, action: 'no-change' };
    if (changed) {
      await wpPost(`/wp-json/wp/v2/${target.type}/${target.id}`, { content });
      entry.action = 'content-updated';
    }
    results.push(entry);
  }

  return results;
}

async function purgeCache() {
  try {
    await wpPost('/wp-json/adanaavukat/v1/rankmath-global', { purge_litespeed: true });
    return true;
  } catch {
    return false;
  }
}

async function verifyLive() {
  const checks = [];

  for (const page of DUPLICATE_PAGES) {
    const res = await fetch(`${BASE_URL}/${page.slug}/`, { redirect: 'manual' });
    checks.push({
      slug: page.slug,
      status: res.status,
      location: res.headers.get('location') || '',
    });
  }

  for (const item of MEDIA_ALT_UPDATES) {
    const media = await wpFetch(`/wp-json/wp/v2/media/${item.mediaId}`);
    checks.push({
      mediaId: item.mediaId,
      altText: media.alt_text || '',
      altOk: Boolean(media.alt_text?.trim()),
    });
  }

  for (const target of CONTENT_ALIGN_TARGETS) {
    const html = await fetch(`${BASE_URL}/${target.slug}/?v=${Date.now()}`).then((r) => r.text());
    checks.push({
      slug: target.slug,
      hasCerensumerHref: /href="https:\/\/www\.cerensumer\.av\.tr/.test(html),
      hasCerensumerPrimaryId: /"@id":\s*"https:\/\/www\.cerensumer\.av\.tr/.test(html),
    });
  }

  return checks;
}

async function main() {
  console.log('P2 SEO düzeltmeleri uygulanıyor...\n');

  const duplicatePages = await fixDuplicatePages();
  console.log('Kopya sayfalar:');
  for (const p of duplicatePages) {
    console.log(`  /${p.slug}/ → noindex (${p.rankMath.ok ? 'ok' : 'hata'})`);
  }

  const redirectSnippet = await ensureRedirectSnippet();
  console.log(`\n301 snippet: ${redirectSnippet.action} (ID ${redirectSnippet.id})`);

  const media = await updateMediaAltText();
  console.log('\nMedya alt text:');
  for (const m of media) {
    console.log(`  #${m.mediaId} → ${m.afterAlt ? '✓' : '✗'}`);
  }

  const content = await alignContentUrls();
  console.log('\nSchema / iç link hizalama:');
  for (const c of content) {
    console.log(`  ${c.slug} → ${c.action}${c.notes?.length ? ` (${c.notes.join('; ')})` : ''}`);
  }

  const cachePurged = await purgeCache();
  await new Promise((r) => setTimeout(r, 2000));
  const verification = await verifyLive();

  const report = {
    generatedAt: new Date().toISOString(),
    duplicatePages,
    redirectSnippet,
    media,
    content,
    cachePurged,
    verification,
  };

  mkdirSync(resolve(rootDir, 'reports'), { recursive: true });
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');

  console.log(`\nÖnbellek: ${cachePurged ? 'temizlendi' : 'atlandı'}`);
  console.log(`Rapor: ${REPORT_PATH}`);
  console.log('\nDoğrulama:');
  for (const v of verification) {
    console.log(' ', JSON.stringify(v));
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}
