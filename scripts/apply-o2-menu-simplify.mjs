/**
 * O2 — Ana menüyü sadeleştirir: tüm hizmet sayfaları Hizmetlerimiz altında;
 * Hakkımızda / profil İletişim altından çıkarılır.
 */
import { mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { wpFetch, wpFetchAll } from './lib/wp-client.mjs';
import { getWpConfig, getAuthHeader } from './lib/env.mjs';
import {
  MAIN_MENU_ID,
  TOP_LEVEL_MENU_ORDER,
  SERVICE_MENU_SLUGS,
  SERVICE_MENU_TITLES,
  HIZMETLERIMIZ_PAGE_ID,
} from './lib/menu-structure.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const REPORT_PATH = resolve(rootDir, `reports/o2-menu-simplify-report-${ts}.json`);
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

function backupMenu(items) {
  const dir = resolve(rootDir, 'reports/backups');
  mkdirSync(dir, { recursive: true });
  const path = resolve(dir, `menu-${MAIN_MENU_ID}-pre-o2-${ts}.json`);
  writeFileSync(path, JSON.stringify(items, null, 2), 'utf8');
  return path;
}

function indexMenuItems(items) {
  const byObjectId = new Map();
  const byMenuItemId = new Map();
  for (const item of items) {
    byMenuItemId.set(item.id, item);
    if (item.object_id) byObjectId.set(item.object_id, item);
  }
  return { byObjectId, byMenuItemId };
}

async function resolvePageSlugMap() {
  const pages = await wpFetchAll('/wp-json/wp/v2/pages', { per_page: '100', status: 'publish,draft' });
  const map = new Map();
  for (const page of pages) {
    map.set(page.id, page.slug);
  }
  // Blog yazılar sayfası (show_on_front posts page)
  const settings = await wpFetch('/wp-json/wp/v2/settings');
  if (settings.page_for_posts) {
    const postsPage = pages.find((p) => p.id === settings.page_for_posts);
    if (postsPage) {
      map.set(postsPage.id, 'aile-hukuku-rehberi');
    }
  }
  return map;
}

function findMenuItemForSlug(slug, items, pageIdBySlug) {
  const pageId = [...pageIdBySlug.entries()].find(([, s]) => s === slug)?.[0];
  if (pageId) {
    const match = items.find((i) => i.object_id === pageId && i.type === 'post_type');
    if (match) return match;
  }
  return items.find((i) => i.url?.includes(`/${slug}/`));
}

async function ensureServiceMenuItem(slug, parentMenuItemId, menuOrder, items) {
  const pages = await wpFetch(`/wp-json/wp/v2/pages?slug=${encodeURIComponent(slug)}`);
  const page = pages[0];
  if (!page) {
    return { slug, action: 'missing-page' };
  }

  const existing = items.find((i) => i.object_id === page.id);
  const title = SERVICE_MENU_TITLES[slug] || page.title?.rendered || slug;

  if (existing) {
    const updated = await wpPost(`/wp-json/wp/v2/menu-items/${existing.id}`, {
      parent: parentMenuItemId,
      menu_order: menuOrder,
      title,
      menus: MAIN_MENU_ID,
      status: 'publish',
    });
    return {
      slug,
      action: 'updated',
      menuItemId: updated.id,
      parent: parentMenuItemId,
      menuOrder,
      title,
    };
  }

  const created = await wpPost('/wp-json/wp/v2/menu-items', {
    title,
    status: 'publish',
    menus: MAIN_MENU_ID,
    menu_order: menuOrder,
    parent: parentMenuItemId,
    object_id: page.id,
    object: 'page',
    type: 'post_type',
    url: '',
  });
  return {
    slug,
    action: 'created',
    menuItemId: created.id,
    parent: parentMenuItemId,
    menuOrder,
    title,
  };
}

async function applyMenuStructure() {
  const beforeItems = await wpFetchAll('/wp-json/wp/v2/menu-items', {
    menus: String(MAIN_MENU_ID),
    per_page: '100',
    context: 'edit',
  });
  const backupPath = backupMenu(beforeItems);
  console.log(`Yedek: ${backupPath}`);
  console.log(`Mevcut öğe: ${beforeItems.length}\n`);

  const pageSlugById = await resolvePageSlugMap();
  const pageIdBySlug = new Map([...pageSlugById.entries()].map(([id, slug]) => [slug, id]));

  const hubItem =
    beforeItems.find((i) => i.object_id === HIZMETLERIMIZ_PAGE_ID) ||
    findMenuItemForSlug('hizmetlerimiz', beforeItems, pageIdBySlug);

  if (!hubItem) {
    throw new Error('Hizmetlerimiz menü öğesi bulunamadı');
  }

  const actions = [];
  let order = 1;

  for (const slug of TOP_LEVEL_MENU_ORDER) {
    if (slug === 'hizmetlerimiz') {
      await wpPost(`/wp-json/wp/v2/menu-items/${hubItem.id}`, {
        parent: 0,
        menu_order: order,
        menus: MAIN_MENU_ID,
        status: 'publish',
        title: 'Hizmetlerimiz',
      });
      actions.push({
        slug,
        menuItemId: hubItem.id,
        action: 'hub-top-level',
        menuOrder: order,
        parent: 0,
      });
      order += 1;

      let childOrder = 1;
      for (const serviceSlug of SERVICE_MENU_SLUGS) {
        const result = await ensureServiceMenuItem(
          serviceSlug,
          hubItem.id,
          order,
          beforeItems
        );
        actions.push({ ...result, childOrder });
        order += 1;
        childOrder += 1;
      }
      continue;
    }

    const item = findMenuItemForSlug(slug, beforeItems, pageIdBySlug);
    if (!item) {
      actions.push({ slug, action: 'missing-menu-item' });
      order += 1;
      continue;
    }

    await wpPost(`/wp-json/wp/v2/menu-items/${item.id}`, {
      parent: 0,
      menu_order: order,
      menus: MAIN_MENU_ID,
      status: 'publish',
    });
    actions.push({
      slug,
      menuItemId: item.id,
      action: 'top-level',
      menuOrder: order,
      parent: 0,
      previousParent: item.parent,
    });
    order += 1;
  }

  // Eski üst seviye hizmet öğelerini kaldır (hub altına taşındıktan sonra duplicate kalmasın)
  const afterItems = await wpFetchAll('/wp-json/wp/v2/menu-items', {
    menus: String(MAIN_MENU_ID),
    per_page: '100',
    context: 'edit',
  });

  const servicePageIds = new Set(
    (
      await Promise.all(
        SERVICE_MENU_SLUGS.map((slug) =>
          wpFetch(`/wp-json/wp/v2/pages?slug=${encodeURIComponent(slug)}`).then((p) => p[0]?.id)
        )
      )
    ).filter(Boolean)
  );

  const removals = [];
  const seenServicePages = new Set();

  for (const item of afterItems) {
    if (!servicePageIds.has(item.object_id)) continue;
    if (item.parent === hubItem.id) {
      if (seenServicePages.has(item.object_id)) {
        await wpPost(`/wp-json/wp/v2/menu-items/${item.id}`, { status: 'draft' });
        removals.push({ menuItemId: item.id, object_id: item.object_id, action: 'duplicate-removed' });
      } else {
        seenServicePages.add(item.object_id);
      }
      continue;
    }
    if (item.parent === 0) {
      await wpPost(`/wp-json/wp/v2/menu-items/${item.id}`, {
        parent: hubItem.id,
        menus: MAIN_MENU_ID,
      });
      removals.push({ menuItemId: item.id, object_id: item.object_id, action: 'reparented-straggler' });
    }
  }

  return { backupPath, actions, removals };
}

async function verifyMenu() {
  const items = await wpFetchAll('/wp-json/wp/v2/menu-items', {
    menus: String(MAIN_MENU_ID),
    per_page: '100',
    context: 'view',
  });
  items.sort((a, b) => (a.menu_order || 0) - (b.menu_order || 0));

  const topLevel = items.filter((i) => !i.parent);
  const hub = items.find((i) => i.object_id === HIZMETLERIMIZ_PAGE_ID);
  const hubChildren = hub ? items.filter((i) => i.parent === hub.id) : [];

  return {
    total: items.length,
    topLevelCount: topLevel.length,
    topLevel: topLevel.map((i) => ({
      id: i.id,
      order: i.menu_order,
      title: i.title?.rendered,
    })),
    hubChildCount: hubChildren.length,
    hubChildren: hubChildren.map((i) => ({
      id: i.id,
      order: i.menu_order,
      title: i.title?.rendered,
    })),
    iletisimChildren: items
      .filter((i) => topLevel.find((t) => t.title?.rendered === 'İletişim' && t.id === i.parent))
      .map((i) => i.title?.rendered),
  };
}

async function verifyLiveNav() {
  const html = await fetch(`${BASE}/?v=${Date.now()}`).then((r) => r.text());
  const nav = html.match(/<nav[^>]*class="[^"]*main-navigation[^"]*"[\s\S]*?<\/nav>/i)?.[0] || html;
  const topLinks = [...nav.matchAll(/<li[^>]*class="[^"]*menu-item[^"]*"[^>]*>[\s\S]*?<\/li>/gi)]
    .filter((m) => !/menu-item-has-children/.test(m[0]) || /class="menu-item[^"]*menu-item-type-post_type/.test(m[0]))
    .length;
  return {
    hasSubMenu: nav.includes('sub-menu') || nav.includes('children'),
    menuItemCount: (nav.match(/menu-item-type-post_type/gi) || []).length,
  };
}

async function main() {
  console.log('O2: Menü sadeleştirme uygulanıyor...\n');

  const { backupPath, actions, removals } = await applyMenuStructure();

  try {
    await wpPost('/wp-json/adanaavukat/v1/rankmath-global', { purge_litespeed: true });
  } catch {
    // ignore
  }

  await new Promise((r) => setTimeout(r, 2000));

  const verification = await verifyMenu();
  const live = await verifyLiveNav();

  const report = {
    generatedAt: new Date().toISOString(),
    backupPath,
    actions,
    removals,
    verification,
    live,
  };

  mkdirSync(resolve(rootDir, 'reports'), { recursive: true });
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');

  console.log(`Üst seviye: ${verification.topLevelCount} (hedef: 6)`);
  console.log(`Hizmetlerimiz alt öğe: ${verification.hubChildCount} (hedef: ${SERVICE_MENU_SLUGS.length})`);
  console.log(`İletişim altındaki yanlış öğe: ${verification.iletisimChildren.length}`);
  if (verification.iletisimChildren.length) {
    console.log('  ', verification.iletisimChildren.join(', '));
  }
  console.log(`\nRapor: ${REPORT_PATH}`);
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}
