/**
 * P1 SEO düzeltmeleri:
 * 1. Yeni 4 hizmet sayfasını ana menüye ekle
 * 2. Aile Hukuku Rehberi (blog hub) title/meta/H1
 * 3. Çift H1: içerikteki h1 → h2 (tema başlığı tek H1 kalsın)
 */
import { mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { wpFetch, wpFetchAll } from './lib/wp-client.mjs';
import { getWpConfig, getAuthHeader } from './lib/env.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const REPORT_PATH = resolve(rootDir, 'reports/p1-seo-fixes-report.json');
const MENU_ID = 11;
const BLOG_HUB_PAGE_ID = 105;

const BLOG_HUB_SEO = {
  title: 'Adana Aile Hukuku Rehberi | Boşanma, Nafaka ve Velayet',
  wpTitle: 'Adana Aile Hukuku Rehberi',
  description:
    'Adana aile hukuku rehberi: boşanma, nafaka, velayet, miras ve iş hukuku yazıları. Av. Ceren Sümer Cilli ile güncel hukuki bilgilendirme.',
  focusKeyword: 'Adana Aile Hukuku Rehberi',
  ogTitle: 'Adana Aile Hukuku Rehberi | Av. Ceren Sümer Cilli',
  ogDescription:
    'Boşanma, nafaka ve velayet başta olmak üzere Adana aile hukuku konularında güncel rehber yazıları.',
};

const MENU_PAGES = [
  { id: 305, slug: 'adana-aile-hukuku-avukati', menuTitle: 'Aile Hukuku Avukatı' },
  { id: 307, slug: 'adana-anlasmali-bosanma-avukati', menuTitle: 'Anlaşmalı Boşanma' },
  { id: 311, slug: 'velayet-davasi-avukati-adana', menuTitle: 'Velayet Davası' },
  { id: 313, slug: 'gayrimenkul-avukati-adana', menuTitle: 'Gayrimenkul Hukuku' },
];

const H1_FIX_PAGE_IDS = [237, 216, 223, 287, 288, 289];

const BLOG_HUB_SNIPPET_NAME = 'Adana Avukat Blog Hub Header';

const BLOG_HUB_SNIPPET_PHP = `/**
 * Blog yazılar sayfası (/aile-hukuku-rehberi/) — H1 ve kısa giriş
 */
function aa_blog_hub_should_show() {
    return is_home() && !is_front_page();
}

function aa_blog_hub_intro_markup() {
    static $done = false;
    if ($done || !aa_blog_hub_should_show()) {
        return;
    }
    $done = true;
    echo '<div class="aa-blog-hub-intro ast-container">';
    echo '<header class="aa-blog-hub-intro__header">';
    echo '<h1 class="aa-blog-hub-intro__title entry-title">Adana Aile Hukuku Rehberi</h1>';
    echo '<p class="aa-blog-hub-intro__lead">Boşanma, nafaka, velayet ve aile hukuku konularında Adana\\'ya özel güncel rehber yazıları.</p>';
    echo '</header></div>';
}

add_action('astra_primary_content_top', 'aa_blog_hub_intro_markup', 5);
add_action('loop_start', function ($query) {
    if (!$query->is_main_query() || !aa_blog_hub_should_show()) {
        return;
    }
    aa_blog_hub_intro_markup();
}, 5);

add_action('wp_head', function () {
    if (!aa_blog_hub_should_show()) {
        return;
    }
    echo '<style id="aa-blog-hub-intro-css">'
        . '.aa-blog-hub-intro{padding:1.5rem 0 .5rem;margin-bottom:.5rem}'
        . '.aa-blog-hub-intro__title{font-size:clamp(1.6rem,3vw,2.1rem);margin:0 0 .65rem;line-height:1.25}'
        . '.aa-blog-hub-intro__lead{margin:0;color:#4b5563;max-width:62ch;font-size:1.05rem;line-height:1.6}'
        . '</style>';
}, 20);`;

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
  const results = [];
  try {
    await wpPost(`/wp-json/adanaavukat/v1/rankmath-meta/${pageId}`, meta);
    results.push({ method: 'adanaavukat/v1', ok: true });
  } catch (e) {
    results.push({ method: 'adanaavukat/v1', ok: false, error: e.message });
  }
  try {
    await wpPost(`/wp-json/wp/v2/pages/${pageId}`, { meta });
    results.push({ method: 'wp/v2/pages meta', ok: true });
  } catch (e) {
    results.push({ method: 'wp/v2/pages meta', ok: false, error: e.message });
  }
  return results;
}

async function addMenuItem(pageId, title) {
  const items = await wpFetchAll('/wp-json/wp/v2/menu-items', { menus: String(MENU_ID), per_page: '100' });
  const exists = items.find((i) => i.object_id === pageId);
  if (exists) return { action: 'exists', id: exists.id, menuOrder: exists.menu_order };

  const maxOrder = items.reduce((m, i) => Math.max(m, i.menu_order || 0), 0);
  const created = await wpPost('/wp-json/wp/v2/menu-items', {
    title,
    status: 'publish',
    menus: MENU_ID,
    menu_order: maxOrder + 1,
    object_id: pageId,
    object: 'page',
    type: 'post_type',
    url: '',
  });
  return { action: 'created', id: created.id, menuOrder: created.menu_order };
}

function demoteContentH1ToH2(html) {
  if (!html) return { html: '', changed: false };
  const next = html.replace(/<h1(\s[^>]*)?>/gi, '<h2$1>').replace(/<\/h1>/gi, '</h2>');
  return { html: next, changed: next !== html };
}

async function fixDuplicateH1Pages() {
  const results = [];
  for (const id of H1_FIX_PAGE_IDS) {
    const page = await wpFetch(`/wp-json/wp/v2/pages/${id}?context=edit`);
    const before = page.content?.raw || '';
    const { html, changed } = demoteContentH1ToH2(before);
    const entry = { id, slug: page.slug, changed, h1Before: (before.match(/<h1/gi) || []).length };

    if (changed) {
      await wpPost(`/wp-json/wp/v2/pages/${id}`, { content: html });
      entry.h1After = 0;
      entry.action = 'content-h1-to-h2';
    } else {
      entry.action = 'no-change';
    }
    results.push(entry);
  }
  return results;
}

async function updateBlogHubPage() {
  const excerpt =
    'Adana aile hukuku, boşanma, nafaka ve velayet konularında güncel rehber yazıları. Av. Ceren Sümer Cilli hukuk bürosu bilgilendirme içerikleri.';

  const page = await wpPost(`/wp-json/wp/v2/pages/${BLOG_HUB_PAGE_ID}`, {
    title: BLOG_HUB_SEO.wpTitle,
    excerpt,
    status: 'publish',
  });

  const rankMath = await updateRankMathMeta(BLOG_HUB_PAGE_ID, {
    rank_math_title: BLOG_HUB_SEO.title,
    rank_math_description: BLOG_HUB_SEO.description,
    rank_math_focus_keyword: BLOG_HUB_SEO.focusKeyword,
    rank_math_facebook_title: BLOG_HUB_SEO.ogTitle,
    rank_math_facebook_description: BLOG_HUB_SEO.ogDescription,
    rank_math_twitter_title: BLOG_HUB_SEO.ogTitle,
    rank_math_twitter_description: BLOG_HUB_SEO.ogDescription,
    rank_math_robots: ['index', 'follow'],
  });

  return { page: { id: page.id, title: page.title?.rendered, link: page.link }, rankMath };
}

async function ensureBlogHubSnippet() {
  const snippets = await wpFetch('/wp-json/code-snippets/v1/snippets');
  let snippet = snippets.find((s) => s.name === BLOG_HUB_SNIPPET_NAME);

  const payload = {
    name: BLOG_HUB_SNIPPET_NAME,
    desc: 'Blog yazılar sayfasına H1 ve kısa giriş metni ekler.',
    code: BLOG_HUB_SNIPPET_PHP,
    tags: ['seo', 'blog', 'adanaavukat'],
    scope: 'global',
    active: true,
    priority: 6,
  };

  if (snippet) {
    snippet = await wpPost(`/wp-json/code-snippets/v1/snippets/${snippet.id}`, payload);
    try {
      await wpPost(`/wp-json/code-snippets/v1/snippets/${snippet.id}/activate`, {});
    } catch {
      // ignore
    }
    return { action: 'updated', id: snippet.id, active: snippet.active };
  }

  snippet = await wpPost('/wp-json/code-snippets/v1/snippets', payload);
  try {
    await wpPost(`/wp-json/code-snippets/v1/snippets/${snippet.id}/activate`, {});
  } catch {
    // ignore
  }
  return { action: 'created', id: snippet.id, active: snippet.active };
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

  const blogHtml = await fetch(`https://adanaavukat.org/aile-hukuku-rehberi/?qc=${Date.now()}`).then((r) => r.text());
  checks.push({
    url: '/aile-hukuku-rehberi/',
    title: blogHtml.match(/<title>([^<]+)/)?.[1] || '',
    description: blogHtml.match(/name="description"[^>]+content="([^"]+)"/i)?.[1] || '',
    h1s: [...blogHtml.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => m[1].replace(/<[^>]+>/g, '').trim()),
    hasBlogIntro: blogHtml.includes('aa-blog-hub-intro'),
  });

  for (const slug of ['hizmetlerimiz', 'cekismeli-bosanma-davasi', 'nafaka-davasi', 'adana-miras-hukuku']) {
    const html = await fetch(`https://adanaavukat.org/${slug}/?qc=${Date.now()}`).then((r) => r.text());
    checks.push({
      url: `/${slug}/`,
      h1Count: (html.match(/<h1/gi) || []).length,
      h1s: [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => m[1].replace(/<[^>]+>/g, '').trim()).slice(0, 3),
    });
  }

  return checks;
}

async function main() {
  console.log('P1 SEO düzeltmeleri uygulanıyor...\n');

  const menu = [];
  for (const item of MENU_PAGES) {
    const result = await addMenuItem(item.id, item.menuTitle);
    menu.push({ ...item, ...result });
    console.log(`Menü: ${item.menuTitle} → ${result.action}`);
  }

  const blogHub = await updateBlogHubPage();
  console.log('\nBlog hub SEO güncellendi:', blogHub.page.title);

  const snippet = await ensureBlogHubSnippet();
  console.log('Blog hub snippet:', snippet.action, `(ID ${snippet.id})`);

  const h1Fixes = await fixDuplicateH1Pages();
  console.log('\nH1 düzeltmeleri:');
  for (const f of h1Fixes) {
    console.log(`  [${f.id}] ${f.slug} → ${f.action}`);
  }

  const cachePurged = await purgeCache();
  await new Promise((r) => setTimeout(r, 2500));
  const verification = await verifyLive();

  const report = {
    generatedAt: new Date().toISOString(),
    menu,
    blogHub,
    snippet,
    h1Fixes,
    cachePurged,
    verification,
  };

  mkdirSync(resolve(rootDir, 'reports'), { recursive: true });
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');

  console.log(`\nÖnbellek: ${cachePurged ? 'temizlendi' : 'atlandı'}`);
  console.log(`Rapor: ${REPORT_PATH}`);
  console.log('\nCanlı doğrulama:');
  for (const v of verification) {
    if (v.h1s) {
      console.log(`  ${v.url} — H1: ${v.h1Count ?? v.h1s.length} | ${v.h1s.join(' / ') || '(yok)'}`);
    } else {
      console.log(`  ${v.url} — title: ${v.title}`);
      console.log(`    desc: ${v.description ? '✓' : '✗ boş'} | intro: ${v.hasBlogIntro ? '✓' : '✗'}`);
    }
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
