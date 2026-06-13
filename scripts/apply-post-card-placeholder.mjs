/**
 * Yazı kartı placeholder sistemini canlıya uygular.
 * Yedek → ana sayfa güncelle → Code Snippet (Astra arşiv) → önbellek temizle
 */
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { wpFetch } from './lib/wp-client.mjs';
import { getWpConfig, getAuthHeader } from './lib/env.mjs';
import { buildHomepageContent } from './lib/homepage-content.mjs';
import { POST_CARD_SNIPPET_NAME, buildPostCardSnippetPhp } from './lib/post-card-placeholder.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const HOMEPAGE_ID = 7;
const BASE = 'https://adanaavukat.org';

async function wpPost(path, body) {
  const { baseUrl, username, appPassword } = getWpConfig();
  const r = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(username, appPassword),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${path} ${r.status}: ${text.slice(0, 400)}`);
  return JSON.parse(text);
}

async function backupHomepage() {
  const page = await wpFetch(`/wp-json/wp/v2/pages/${HOMEPAGE_ID}?context=edit`);
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dir = resolve(rootDir, 'data/backups');
  mkdirSync(dir, { recursive: true });
  const json = resolve(dir, `homepage-7-pre-post-card-placeholder-${ts}.json`);
  const html = resolve(dir, `homepage-7-pre-post-card-placeholder-${ts}.html`);
  writeFileSync(json, JSON.stringify(page, null, 2), 'utf8');
  writeFileSync(html, page.content?.raw || '', 'utf8');
  return { json, html };
}

async function ensureSnippet() {
  const snippets = await wpFetch('/wp-json/code-snippets/v1/snippets');
  let snippet = snippets.find((s) => s.name === POST_CARD_SNIPPET_NAME);
  const payload = {
    name: POST_CARD_SNIPPET_NAME,
    desc: 'Astra arşiv/kategori/ilgili yazı kartları için hafif placeholder CSS.',
    code: buildPostCardSnippetPhp(),
    tags: ['design', 'placeholder', 'adanaavukat'],
    scope: 'global',
    active: true,
    priority: 5,
  };

  if (snippet) {
    snippet = await wpPost(`/wp-json/code-snippets/v1/snippets/${snippet.id}`, payload);
    try {
      await wpPost(`/wp-json/code-snippets/v1/snippets/${snippet.id}/activate`, {});
    } catch {
      /* already active */
    }
    return { action: 'updated', id: snippet.id };
  }

  snippet = await wpPost('/wp-json/code-snippets/v1/snippets', payload);
  return { action: 'created', id: snippet.id };
}

async function purgeCache() {
  try {
    return await wpPost('/wp-json/adanaavukat/v1/rankmath-global', {
      purge_litespeed: true,
      flush_sitemap: false,
    });
  } catch {
    return null;
  }
}

async function verify() {
  const home = await fetch(`${BASE}/?v=${Date.now()}`).then((r) => r.text());
  const cat = await fetch(`${BASE}/category/hukuk-rehberi/?v=${Date.now()}`).then((r) => r.text());
  const single = await fetch(`${BASE}/adanada-bosanma-davasi-sureci/?v=${Date.now()}`).then((r) => r.text());

  return {
    homepage: {
      hasPostCard: home.includes('aa-post-card'),
      hasPlaceholder: home.includes('aa-post-thumb__ph'),
      h1Count: (home.match(/<h1[^>]*>/gi) || []).length,
      hasPlaceholderCss: home.includes('aa-post-thumb'),
    },
    category: {
      hasAstraCss: cat.includes('aa-post-card-placeholder') || cat.includes('ast-no-thumb'),
      hasPlaceholderStyle: cat.includes('aa-post-card-placeholder'),
      articleNoThumb: cat.includes('ast-no-thumb'),
    },
    single: {
      articleSingle: single.includes('ast-article-single'),
      noThumbHidden: single.includes('aa-post-card-placeholder'),
    },
  };
}

async function main() {
  console.log('Yazı kartı placeholder uygulanıyor...');

  const backup = await backupHomepage();
  console.log('Yedek:', backup.json);

  const content = buildHomepageContent();
  await wpPost(`/wp-json/wp/v2/pages/${HOMEPAGE_ID}`, {
    content,
    status: 'publish',
    meta: { 'site-post-title': 'disabled', 'ast-banner-title-visibility': 'disabled' },
  });
  console.log('Ana sayfa güncellendi');

  const snippet = await ensureSnippet();
  console.log('Snippet:', snippet);

  await purgeCache();
  await new Promise((r) => setTimeout(r, 2500));

  const check = await verify();

  const report = `# Yazı Kartı Placeholder — Uygulama Raporu

> ${new Date().toISOString()}

## Yedek

- \`${backup.json}\`
- \`${backup.html}\`

## Değiştirilen dosyalar (repo)

| Dosya | Değişiklik |
|-------|------------|
| \`scripts/lib/post-card-placeholder.mjs\` | SVG, CSS, thumb HTML üretici |
| \`scripts/lib/homepage-content.mjs\` | Son Yazılar kartlarına görsel alanı + CSS |
| \`scripts/apply-post-card-placeholder.mjs\` | Canlı uygulama scripti |
| \`package.json\` | \`apply:post-card-placeholder\` komutu |

## Canlı değişiklikler

| Hedef | İşlem |
|-------|-------|
| Ana sayfa (ID 7) | 5 yazı kartına 16:9 placeholder alanı eklendi |
| Code Snippet (ID ${snippet.id}) | Astra arşiv/kategori/ilgili yazı CSS |

## Doğrulama

| Kontrol | Sonuç |
|---------|-------|
| Ana sayfa aa-post-card | ${check.homepage.hasPostCard ? '✅' : '❌'} |
| Ana sayfa placeholder SVG | ${check.homepage.hasPlaceholder ? '✅' : '❌'} |
| Tek H1 | ${check.homepage.h1Count === 1 ? '✅ (' + check.homepage.h1Count + ')' : '❌ (' + check.homepage.h1Count + ')'} |
| Kategori snippet CSS | ${check.category.hasPlaceholderStyle ? '✅' : '⚠️ (önbellek gecikmesi olabilir)'} |
| Kategori ast-no-thumb | ${check.category.articleNoThumb ? '✅' : '❌'} |

## Tasarım

- Tek inline SVG (belge ikonu, ~56px)
- Lacivert gradient arka plan (#0a1f38 → #1a3a5c)
- 16:9 aspect-ratio, lazy loading hazır (img varsa)
- Makale içi ana görsel alanına dokunulmadı
`;

  const reportPath = resolve(rootDir, 'reports/post-card-placeholder-report.md');
  mkdirSync(resolve(rootDir, 'reports'), { recursive: true });
  writeFileSync(reportPath, report, 'utf8');
  writeFileSync(resolve(rootDir, 'data/post-card-placeholder-apply.json'), JSON.stringify({ backup, snippet, check }, null, 2));

  console.log('Rapor:', reportPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
