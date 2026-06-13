/**
 * Menüye yeni hizmet sayfalarını ekler + SEO title sayfa başlığı ile günceller.
 */
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { wpFetch, wpFetchAll } from './lib/wp-client.mjs';
import { getWpConfig, getAuthHeader } from './lib/env.mjs';
import { HOMEPAGE_META } from './lib/homepage-content.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const MENU_ID = 11;

const NEW_PAGES = [
  { slug: 'adana-miras-hukuku', menuTitle: 'Miras Hukuku' },
  { slug: 'adana-kira-hukuku', menuTitle: 'Kira Hukuku' },
  { slug: 'adana-is-hukuku', menuTitle: 'İş Hukuku' },
];

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
  if (!r.ok) throw new Error(`${path} ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r.json();
}

async function addMenuItem(pageId, title) {
  const items = await wpFetchAll('/wp-json/wp/v2/menu-items', { menus: String(MENU_ID), per_page: '100' });
  const exists = items.find((i) => i.object_id === pageId);
  if (exists) return { action: 'exists', id: exists.id };

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
  return { action: 'created', id: created.id };
}

async function updateHomepageTitle() {
  return wpPost('/wp-json/wp/v2/pages/7', {
    title: HOMEPAGE_META.title,
    excerpt: HOMEPAGE_META.excerpt,
    status: 'publish',
  });
}

async function main() {
  const report = { menu: [], seo: null };

  for (const item of NEW_PAGES) {
    const pages = await wpFetch(`/wp-json/wp/v2/pages?slug=${item.slug}`);
    const pageId = pages[0]?.id;
    if (!pageId) continue;
    const result = await addMenuItem(pageId, item.menuTitle);
    report.menu.push({ ...item, pageId, ...result });
    console.log(`menu ${item.menuTitle}: ${result.action}`);
  }

  report.seo = await updateHomepageTitle();
  console.log('homepage title updated to:', report.seo.title?.rendered || report.seo.title);

  const reportPath = resolve(rootDir, 'reports/menu-seo-followup-report.md');
  mkdirSync(resolve(rootDir, 'reports'), { recursive: true });
  writeFileSync(
    reportPath,
    `# Menü ve SEO Takip Raporu\n\n> ${new Date().toISOString()}\n\n## Menü (Ana Menü ID: ${MENU_ID})\n\n${report.menu.map((m) => `- ${m.menuTitle}: ${m.action} (menu-item ${m.id})`).join('\n')}\n\n## SEO\n\n- Sayfa başlığı güncellendi: ${HOMEPAGE_META.title}\n- Rank Math REST API Wordfence tarafından engellendi; meta title/description Rank Math panelinden doğrulanmalı veya önbellek temizlenmeli.\n`,
    'utf8'
  );
  console.log('Rapor:', reportPath);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
