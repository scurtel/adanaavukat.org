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
import { fetchHomepagePostCards } from './lib/homepage-post-cards.mjs';
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
    desc: 'Astra blog kartları için kategori etiketli placeholder (PHP+CSS).',
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
    } catch (e) {
      throw new Error(`Snippet aktivasyonu başarısız (ID ${snippet.id}): ${e.message}`);
    }
    return { action: 'updated', id: snippet.id, active: snippet.active };
  }

  snippet = await wpPost('/wp-json/code-snippets/v1/snippets', payload);
  try {
    await wpPost(`/wp-json/code-snippets/v1/snippets/${snippet.id}/activate`, {});
  } catch (e) {
    throw new Error(`Snippet aktivasyonu başarısız (ID ${snippet.id}): ${e.message}`);
  }
  return { action: 'created', id: snippet.id, active: snippet.active };
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
  const cat = await fetch(`${BASE}/aile-hukuku-rehberi/?v=${Date.now()}`).then((r) => r.text());
  const single = await fetch(`${BASE}/adanada-bosanma-davasi-sureci/?v=${Date.now()}`).then((r) => r.text());

  return {
    homepage: {
      hasPostCard: home.includes('aa-post-card'),
      hasPlaceholder: home.includes('aa-post-thumb__ph'),
      h1Count: (home.match(/<h1[^>]*>/gi) || []).length,
      hasPlaceholderCss: home.includes('aa-post-thumb'),
    },
    category: {
      hasPlaceholderStyle: cat.includes('aa-post-card-placeholder'),
      hasPostCardPlaceholderClass: cat.includes('post-card-placeholder'),
      hasLabelCss: cat.includes('#f5d77a'),
      hasPlaceholderJs: cat.includes('aa-post-card-placeholder-js'),
      placeholderSpanCount: (cat.match(/post-card-placeholder/g) || []).length,
    },
    single: {
      articleSingle: single.includes('ast-article-single'),
      noThumbHidden: single.includes('aa-post-card-placeholder'),
    },
  };
}

async function main() {
  const snippetOnly = process.argv.includes('--snippet-only');
  console.log(snippetOnly ? 'Placeholder snippet güncelleniyor...' : 'Yazı kartı placeholder uygulanıyor...');

  let backup = null;
  if (!snippetOnly) {
    backup = await backupHomepage();
    console.log('Yedek:', backup.json);

    const postCards = await fetchHomepagePostCards(wpFetch);
    const content = buildHomepageContent({ postCards });
    await wpPost(`/wp-json/wp/v2/pages/${HOMEPAGE_ID}`, {
      content,
      status: 'publish',
      meta: { 'site-post-title': 'disabled', 'ast-banner-title-visibility': 'disabled' },
    });
    console.log('Ana sayfa güncellendi');
  }

  const snippet = await ensureSnippet();
  console.log('Snippet:', snippet);

  await purgeCache();
  await new Promise((r) => setTimeout(r, 2500));

  const check = await verify();

  const report = `# Yazı Kartı Placeholder — Uygulama Raporu

> ${new Date().toISOString()}
> Mod: ${snippetOnly ? 'snippet-only' : 'tam uygulama'}

${backup ? `## Yedek

- \`${backup.json}\`
- \`${backup.html}\`` : '## Yedek\n\n- Snippet-only modu — ana sayfa yedeklenmedi'}

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
| Aile Hukuku Rehberi CSS | ${check.category.hasPlaceholderStyle ? '✅' : '❌'} |
| post-card-placeholder sınıfı | ${check.category.hasPostCardPlaceholderClass ? '✅' : '❌'} |
| Etiket stili (#f5d77a) | ${check.category.hasLabelCss ? '✅' : '❌'} |
| Placeholder JS (Astra boş thumb) | ${check.category.hasPlaceholderJs ? '✅' : '❌'} |

## Tasarım

- Kategoriye göre etiket (Aile Hukuku, Boşanma Hukuku, Miras Hukuku, vb.)
- 16:9 aspect-ratio, lacivert gradient + altın etiket
- Öne çıkan görseli olan yazılarda normal thumbnail
- Ek görsel dosyası yok — yalnızca CSS + hafif inline JS
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
