/**
 * P0 SEO düzeltmeleri:
 * 1. Konu dışı 3 yazıyı taslağa al + Aile Hukuku kategorisinden çıkar
 * 2. Hazır 4 hizmet sayfasını yayınla
 */
import { mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { wpFetch } from './lib/wp-client.mjs';
import { getWpConfig, getAuthHeader } from './lib/env.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const REPORT_PATH = resolve(rootDir, 'reports/p0-seo-fixes-report.json');

const OFF_TOPIC_POSTS = [
  { id: 263, slug: 'eksi-sozluk-ve-uludag-sozluk-turkiyenin-en-degerli-web-siteleri', label: 'Ekşi / Uludağ Sözlük' },
  { id: 257, slug: 'trumptan-kritik-talimat-gizli-projelerde-gorevli-11-bilim-insani-dosyasi-mercek-altinda', label: 'Trump / bilim insanı' },
  { id: 252, slug: 'yapay-zeka-yuzunden-120-bin-tl-ceza-odedi', label: 'Yapay zeka ceza' },
];

const DRAFT_SERVICE_PAGES = [
  { id: 305, slug: 'adana-aile-hukuku-avukati', label: 'Adana Aile Hukuku Avukatı' },
  { id: 307, slug: 'adana-anlasmali-bosanma-avukati', label: 'Adana Anlaşmalı Boşanma Avukatı' },
  { id: 311, slug: 'velayet-davasi-avukati-adana', label: 'Velayet Davası Avukatı Adana' },
  { id: 313, slug: 'gayrimenkul-avukati-adana', label: 'Gayrimenkul Avukatı Adana' },
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
  if (!response.ok) {
    throw new Error(`${path} ${response.status}: ${text.slice(0, 400)}`);
  }
  return text ? JSON.parse(text) : {};
}

async function updateRankMathRobots(postId, robots, type = 'posts') {
  const meta = { rank_math_robots: robots };
  try {
    await wpPost(`/wp-json/adanaavukat/v1/rankmath-meta/${postId}`, meta);
    return { method: 'adanaavukat/v1', ok: true };
  } catch (e) {
    try {
      await wpPost(`/wp-json/wp/v2/${type}/${postId}`, { meta });
      return { method: 'wp/v2/meta', ok: true };
    } catch (e2) {
      return { method: 'failed', ok: false, error: e2.message };
    }
  }
}

async function findUncategorizedCategoryId() {
  const categories = await wpFetch('/wp-json/wp/v2/categories?per_page=100');
  const uncategorized = categories.find((c) => c.slug === 'uncategorized' || c.name === 'Genel');
  return uncategorized?.id || 1;
}

async function demoteOffTopicPosts(uncategorizedId) {
  const results = [];

  for (const item of OFF_TOPIC_POSTS) {
    const before = await wpFetch(`/wp-json/wp/v2/posts/${item.id}?context=edit`);
    const entry = {
      id: item.id,
      slug: item.slug,
      label: item.label,
      before: { status: before.status, categories: before.categories },
      actions: [],
    };

    const updated = await wpPost(`/wp-json/wp/v2/posts/${item.id}`, {
      status: 'draft',
      categories: [uncategorizedId],
    });
    entry.actions.push('status→draft', `categories→[${uncategorizedId}]`);
    entry.after = { status: updated.status, categories: updated.categories };

    const robots = await updateRankMathRobots(item.id, ['noindex', 'nofollow']);
    entry.rankMath = robots;
    if (robots.ok) entry.actions.push('rank_math_robots→noindex,nofollow');

    results.push(entry);
  }

  return results;
}

async function publishServicePages() {
  const results = [];

  for (const page of DRAFT_SERVICE_PAGES) {
    const before = await wpFetch(`/wp-json/wp/v2/pages/${page.id}?context=edit`);
    const entry = {
      id: page.id,
      slug: page.slug,
      label: page.label,
      before: { status: before.status, link: before.link },
      actions: [],
    };

    const updated = await wpPost(`/wp-json/wp/v2/pages/${page.id}`, {
      status: 'publish',
    });
    entry.after = { status: updated.status, link: updated.link };
    entry.actions.push('status→publish');

    const robots = await updateRankMathRobots(page.id, ['index', 'follow'], 'pages');
    entry.rankMath = robots;
    if (robots.ok) entry.actions.push('rank_math_robots→index,follow');

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

async function verify() {
  const checks = [];

  for (const item of OFF_TOPIC_POSTS) {
    try {
      const res = await fetch(`https://adanaavukat.org/${item.slug}/`, { redirect: 'manual' });
      checks.push({ slug: item.slug, http: res.status, public: res.status === 200 });
    } catch (e) {
      checks.push({ slug: item.slug, error: e.message });
    }
  }

  for (const page of DRAFT_SERVICE_PAGES) {
    try {
      const res = await fetch(`https://adanaavukat.org/${page.slug}/`);
      const html = await res.text();
      checks.push({
        slug: page.slug,
        http: res.status,
        public: res.status === 200,
        robots: html.match(/name=["']robots["'][^>]+content=["']([^"']+)["']/i)?.[1] || '',
      });
    } catch (e) {
      checks.push({ slug: page.slug, error: e.message });
    }
  }

  return checks;
}

async function main() {
  console.log('P0 SEO düzeltmeleri uygulanıyor...\n');

  const uncategorizedId = await findUncategorizedCategoryId();
  console.log(`Varsayılan kategori ID: ${uncategorizedId}\n`);

  const offTopic = await demoteOffTopicPosts(uncategorizedId);
  console.log('Konu dışı yazılar:');
  for (const r of offTopic) {
    console.log(`  [${r.id}] ${r.label} → ${r.after.status}, kategori ${r.after.categories}`);
  }

  const published = await publishServicePages();
  console.log('\nHizmet sayfaları:');
  for (const r of published) {
    console.log(`  [${r.id}] ${r.label} → ${r.after.status} (${r.after.link})`);
  }

  const cachePurged = await purgeCache();
  console.log(`\nÖnbellek temizlendi: ${cachePurged ? 'evet' : 'hayır'}`);

  await new Promise((r) => setTimeout(r, 2000));
  const verification = await verify();

  const report = {
    generatedAt: new Date().toISOString(),
    uncategorizedCategoryId: uncategorizedId,
    offTopicPosts: offTopic,
    publishedPages: published,
    cachePurged,
    verification,
  };

  mkdirSync(resolve(rootDir, 'reports'), { recursive: true });
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');

  console.log(`\nRapor: ${REPORT_PATH}`);
  console.log('\nDoğrulama:');
  for (const c of verification) {
    console.log(`  /${c.slug}/ → HTTP ${c.http}${c.public === false ? ' (artık public değil ✓)' : c.public ? ' (yayında ✓)' : ''}`);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
