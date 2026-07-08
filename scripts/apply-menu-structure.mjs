/**
 * Ana menü doğrulama + uygulama.
 *
 * - Tüm hizmet sayfaları yalnızca Hizmetlerimiz altında
 * - Hakkımızda / Profil / FAQ / İletişim üst seviye
 * - About Us / Contact menüden çıkarılır (sayfalar silinmez)
 * - Ana Menü primary + mobile_menu konumlarına atanır
 *
 * Kullanım:
 *   npm run apply:menu              # uygula + doğrula
 *   npm run verify:menu             # yalnızca doğrula
 *   node scripts/apply-menu-structure.mjs --dry-run
 */
import { mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { wpFetch, wpFetchAll } from './lib/wp-client.mjs';
import { getWpConfig, getAuthHeader, rootDir } from './lib/env.mjs';
import {
  MAIN_MENU_ID,
  HIZMETLERIMIZ_PAGE_ID,
  MENU_LOCATIONS,
  TOP_LEVEL_MENU_ORDER,
  TOP_LEVEL_TITLES,
  SERVICE_MENU_SLUGS,
  SERVICE_MENU_TITLES,
  EXCLUDED_MENU_SLUGS,
  EXCLUDED_TITLE_PATTERNS,
} from './lib/menu-structure.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = 'https://adanaavukat.org';
const dryRun = process.argv.includes('--dry-run');
const verifyOnly =
  process.argv.includes('--verify-only') ||
  process.argv[1]?.endsWith('verify-menu-structure.mjs');

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
    throw new Error(`${path} ${response.status}: ${text.slice(0, 400)}`);
  }
  return text ? JSON.parse(text) : {};
}

function stripTags(s = '') {
  return String(s).replace(/<[^>]+>/g, '').trim();
}

function isExcludedItem(item, pageSlugById) {
  const title = stripTags(item.title?.raw || item.title?.rendered || '');
  const slug = pageSlugById.get(item.object_id) || '';
  const url = item.url || '';
  if (EXCLUDED_MENU_SLUGS.includes(slug)) return true;
  if (EXCLUDED_MENU_SLUGS.some((s) => url.includes(`/${s}/`))) return true;
  if (EXCLUDED_TITLE_PATTERNS.some((re) => re.test(title))) return true;
  return false;
}

async function resolvePageMaps() {
  const pages = await wpFetchAll('/wp-json/wp/v2/pages', {
    per_page: '100',
    status: 'publish,draft',
  });
  const pageSlugById = new Map();
  const pageIdBySlug = new Map();
  for (const page of pages) {
    pageSlugById.set(page.id, page.slug);
    pageIdBySlug.set(page.slug, page.id);
  }

  try {
    const settings = await wpFetch('/wp-json/wp/v2/settings');
    if (settings.page_for_posts) {
      const postsPage = pages.find((p) => p.id === settings.page_for_posts);
      if (postsPage) {
        pageSlugById.set(postsPage.id, 'aile-hukuku-rehberi');
        pageIdBySlug.set('aile-hukuku-rehberi', postsPage.id);
      }
    }
  } catch {
    // settings endpoint may be restricted
  }

  return { pages, pageSlugById, pageIdBySlug };
}

function findMenuItemForSlug(slug, items, pageIdBySlug) {
  const pageId = pageIdBySlug.get(slug);
  if (pageId) {
    const match = items.find((i) => i.object_id === pageId && i.type === 'post_type');
    if (match) return match;
  }
  return items.find((i) => (i.url || '').includes(`/${slug}/`));
}

function backupMenu(items, menusMeta, locations) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dir = resolve(rootDir, 'reports/backups');
  mkdirSync(dir, { recursive: true });
  const path = resolve(dir, `menu-${MAIN_MENU_ID}-pre-apply-${ts}.json`);
  writeFileSync(
    path,
    JSON.stringify({ backedUpAt: new Date().toISOString(), menusMeta, locations, items }, null, 2),
    'utf8'
  );
  return path;
}

async function assignMenuLocations() {
  const menu = await wpFetch(`/wp-json/wp/v2/menus/${MAIN_MENU_ID}`);
  const current = Array.isArray(menu.locations) ? menu.locations : [];
  const needed = MENU_LOCATIONS.filter((loc) => !current.includes(loc));
  if (needed.length === 0) {
    return { action: 'unchanged', locations: current };
  }
  if (dryRun) {
    return { action: 'dry-run', locations: [...new Set([...current, ...MENU_LOCATIONS])] };
  }
  const updated = await wpPost(`/wp-json/wp/v2/menus/${MAIN_MENU_ID}`, {
    locations: [...new Set([...current, ...MENU_LOCATIONS])],
  });
  return { action: 'updated', locations: updated.locations || MENU_LOCATIONS };
}

async function ensureServiceMenuItem(slug, parentId, menuOrder, items, pageIdBySlug) {
  const pageId = pageIdBySlug.get(slug);
  if (!pageId) return { slug, action: 'missing-page' };

  const title = SERVICE_MENU_TITLES[slug] || slug;
  const existing = items.find((i) => i.object_id === pageId);

  if (dryRun) {
    return {
      slug,
      action: existing ? 'would-update' : 'would-create',
      menuItemId: existing?.id || null,
      parent: parentId,
      menuOrder,
      title,
    };
  }

  if (existing) {
    const updated = await wpPost(`/wp-json/wp/v2/menu-items/${existing.id}`, {
      parent: parentId,
      menu_order: menuOrder,
      title,
      menus: MAIN_MENU_ID,
      status: 'publish',
    });
    return {
      slug,
      action: 'updated',
      menuItemId: updated.id,
      parent: parentId,
      menuOrder,
      title,
    };
  }

  const created = await wpPost('/wp-json/wp/v2/menu-items', {
    title,
    status: 'publish',
    menus: MAIN_MENU_ID,
    menu_order: menuOrder,
    parent: parentId,
    object_id: pageId,
    object: 'page',
    type: 'post_type',
    url: '',
  });
  return {
    slug,
    action: 'created',
    menuItemId: created.id,
    parent: parentId,
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
  const menusMeta = await wpFetch('/wp-json/wp/v2/menus?per_page=100');
  let locations = {};
  try {
    locations = await wpFetch('/wp-json/wp/v2/menu-locations');
  } catch {
    locations = {};
  }

  const backupPath = backupMenu(beforeItems, menusMeta, locations);
  console.log(`Yedek: ${backupPath}`);
  console.log(`Mevcut öğe: ${beforeItems.length}`);

  const { pageSlugById, pageIdBySlug } = await resolvePageMaps();
  const actions = [];
  const removals = [];

  // 1) İngilizce About Us / Contact menü öğelerini menüden çıkar (draft)
  for (const item of beforeItems) {
    if (!isExcludedItem(item, pageSlugById)) continue;
    if (dryRun) {
      removals.push({
        menuItemId: item.id,
        title: stripTags(item.title?.raw || item.title?.rendered),
        action: 'would-remove-from-menu',
      });
      continue;
    }
    await wpPost(`/wp-json/wp/v2/menu-items/${item.id}`, { status: 'draft' });
    removals.push({
      menuItemId: item.id,
      title: stripTags(item.title?.raw || item.title?.rendered),
      action: 'removed-from-menu',
    });
  }

  const hubItem =
    beforeItems.find((i) => i.object_id === HIZMETLERIMIZ_PAGE_ID) ||
    findMenuItemForSlug('hizmetlerimiz', beforeItems, pageIdBySlug);
  if (!hubItem) throw new Error('Hizmetlerimiz menü öğesi bulunamadı');

  let order = 1;
  for (const slug of TOP_LEVEL_MENU_ORDER) {
    if (slug === 'hizmetlerimiz') {
      if (!dryRun) {
        await wpPost(`/wp-json/wp/v2/menu-items/${hubItem.id}`, {
          parent: 0,
          menu_order: order,
          menus: MAIN_MENU_ID,
          status: 'publish',
          title: TOP_LEVEL_TITLES.hizmetlerimiz,
        });
      }
      actions.push({
        slug,
        menuItemId: hubItem.id,
        action: dryRun ? 'would-hub-top' : 'hub-top-level',
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
          beforeItems,
          pageIdBySlug
        );
        actions.push({ ...result, childOrder });
        order += 1;
        childOrder += 1;
      }
      continue;
    }

    const item = findMenuItemForSlug(slug, beforeItems, pageIdBySlug);
    if (!item) {
      // Eksik üst seviye öğeyi oluştur
      const pageId = pageIdBySlug.get(slug);
      if (!pageId) {
        actions.push({ slug, action: 'missing-page' });
        order += 1;
        continue;
      }
      if (dryRun) {
        actions.push({ slug, action: 'would-create-top', menuOrder: order });
        order += 1;
        continue;
      }
      const created = await wpPost('/wp-json/wp/v2/menu-items', {
        title: TOP_LEVEL_TITLES[slug] || slug,
        status: 'publish',
        menus: MAIN_MENU_ID,
        menu_order: order,
        parent: 0,
        object_id: pageId,
        object: 'page',
        type: 'post_type',
        url: '',
      });
      actions.push({
        slug,
        menuItemId: created.id,
        action: 'created-top',
        menuOrder: order,
        parent: 0,
      });
      order += 1;
      continue;
    }

    if (!dryRun) {
      await wpPost(`/wp-json/wp/v2/menu-items/${item.id}`, {
        parent: 0,
        menu_order: order,
        menus: MAIN_MENU_ID,
        status: 'publish',
        title: TOP_LEVEL_TITLES[slug] || stripTags(item.title?.raw || item.title?.rendered),
      });
    }
    actions.push({
      slug,
      menuItemId: item.id,
      action: dryRun ? 'would-top-level' : 'top-level',
      menuOrder: order,
      parent: 0,
      previousParent: item.parent,
    });
    order += 1;
  }

  // 2) Hizmet sayfalarını hub altına kilitle, duplicate temizle
  const afterItems = dryRun
    ? beforeItems
    : await wpFetchAll('/wp-json/wp/v2/menu-items', {
        menus: String(MAIN_MENU_ID),
        per_page: '100',
        context: 'edit',
      });

  const servicePageIds = new Set(
    SERVICE_MENU_SLUGS.map((s) => pageIdBySlug.get(s)).filter(Boolean)
  );
  const protectedTopIds = new Set(
    TOP_LEVEL_MENU_ORDER.filter((s) => s !== 'hizmetlerimiz')
      .map((s) => pageIdBySlug.get(s))
      .filter(Boolean)
  );
  protectedTopIds.add(HIZMETLERIMIZ_PAGE_ID);

  const seenService = new Set();
  for (const item of afterItems) {
    // Profil / Hakkımızda yanlışlıkla hub veya iletişim altında ise yukarı taşı
    if (protectedTopIds.has(item.object_id) && item.object_id !== HIZMETLERIMIZ_PAGE_ID) {
      if (item.parent !== 0) {
        if (!dryRun) {
          await wpPost(`/wp-json/wp/v2/menu-items/${item.id}`, {
            parent: 0,
            menus: MAIN_MENU_ID,
            status: 'publish',
          });
        }
        removals.push({
          menuItemId: item.id,
          object_id: item.object_id,
          action: dryRun ? 'would-unparent-protected' : 'unparented-protected',
        });
      }
    }

    if (!servicePageIds.has(item.object_id)) continue;

    if (item.parent === hubItem.id) {
      if (seenService.has(item.object_id)) {
        if (!dryRun) {
          await wpPost(`/wp-json/wp/v2/menu-items/${item.id}`, { status: 'draft' });
        }
        removals.push({
          menuItemId: item.id,
          object_id: item.object_id,
          action: dryRun ? 'would-remove-duplicate' : 'duplicate-removed',
        });
      } else {
        seenService.add(item.object_id);
      }
      continue;
    }

    if (!dryRun) {
      await wpPost(`/wp-json/wp/v2/menu-items/${item.id}`, {
        parent: hubItem.id,
        menus: MAIN_MENU_ID,
        status: 'publish',
      });
    }
    removals.push({
      menuItemId: item.id,
      object_id: item.object_id,
      action: dryRun ? 'would-reparent' : 'reparented-to-hub',
    });
  }

  const locationResult = await assignMenuLocations();

  return { backupPath, actions, removals, locationResult };
}

function buildVerification(items, pageSlugById, locations, liveHtml) {
  const published = items.filter((i) => i.status === 'publish' || !i.status);
  published.sort((a, b) => (a.menu_order || 0) - (b.menu_order || 0));

  const hub = published.find((i) => i.object_id === HIZMETLERIMIZ_PAGE_ID);
  const topLevel = published.filter((i) => !i.parent);
  const hubChildren = hub ? published.filter((i) => i.parent === hub.id) : [];
  const iletisim = topLevel.find((i) => pageSlugById.get(i.object_id) === 'iletisim');
  const iletisimChildren = iletisim
    ? published.filter((i) => i.parent === iletisim.id)
    : [];

  const hubChildSlugs = hubChildren.map((i) => pageSlugById.get(i.object_id)).filter(Boolean);
  const expectedServices = [...SERVICE_MENU_SLUGS];
  const missingServices = expectedServices.filter((s) => !hubChildSlugs.includes(s));
  const unexpectedHubChildren = hubChildSlugs.filter((s) => !expectedServices.includes(s));

  const servicePageIds = new Set(
    SERVICE_MENU_SLUGS.map((s) => {
      for (const [id, slug] of pageSlugById.entries()) {
        if (slug === s) return id;
      }
      return null;
    }).filter(Boolean)
  );

  const topLevelServiceDupes = topLevel.filter((i) => servicePageIds.has(i.object_id));

  const hakkimizda = published.find((i) => pageSlugById.get(i.object_id) === 'hakkimizda');
  const profile = published.find(
    (i) =>
      pageSlugById.get(i.object_id) ===
      'avukat-ceren-sumer-cilli-kimdir-adana-bosanma-ve-aile-hukuku'
  );

  const englishLeft = published.filter((i) => {
    const title = stripTags(i.title?.raw || i.title?.rendered || '');
    const slug = pageSlugById.get(i.object_id) || '';
    return (
      EXCLUDED_MENU_SLUGS.includes(slug) ||
      EXCLUDED_TITLE_PATTERNS.some((re) => re.test(title))
    );
  });

  const topOrderSlugs = topLevel.map((i) => pageSlugById.get(i.object_id));
  const orderOk =
    JSON.stringify(topOrderSlugs) === JSON.stringify(TOP_LEVEL_MENU_ORDER);

  const primaryAssigned = locations?.primary?.menu === MAIN_MENU_ID;
  const mobileAssigned = locations?.mobile_menu?.menu === MAIN_MENU_ID;

  const livePrimaryOk = liveHtml
    ? /id="ast-desktop-header"|site-header-focus-item/.test(liveHtml) &&
      liveHtml.includes('Hizmetlerimiz') &&
      !/ast-hf-mobile-menu[\s\S]{0,400}About Us/.test(liveHtml)
    : null;

  const mobileFallbackPages =
    liveHtml?.includes('ast-hf-mobile-menu') &&
    /ast-hf-mobile-menu[\s\S]*page_item page-item-25/.test(liveHtml);

  const checks = {
    allServicesUnderHub:
      missingServices.length === 0 && unexpectedHubChildren.length === 0,
    noTopLevelServiceDupes: topLevelServiceDupes.length === 0,
    hakkimizdaNotUnderIletisim: !hakkimizda || hakkimizda.parent === 0,
    hakkimizdaNotUnderHub: !hakkimizda || hakkimizda.parent !== (hub?.id || -1),
    profileNotUnderHub: !profile || profile.parent !== (hub?.id || -1),
    profileNotUnderIletisim: !profile || profile.parent === 0,
    noEnglishAboutContact: englishLeft.length === 0,
    topLevelOrderMatches: orderOk,
    primaryLocationAssigned: primaryAssigned,
    mobileLocationAssigned: mobileAssigned,
    mobileNotPageFallback: mobileAssigned ? true : !mobileFallbackPages,
  };

  const failed = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([k]) => k);

  return {
    ok: failed.length === 0,
    failed,
    checks,
    topLevel: topLevel.map((i) => ({
      id: i.id,
      order: i.menu_order,
      title: stripTags(i.title?.raw || i.title?.rendered),
      slug: pageSlugById.get(i.object_id),
      parent: i.parent,
    })),
    hubChildren: hubChildren.map((i) => ({
      id: i.id,
      order: i.menu_order,
      title: stripTags(i.title?.raw || i.title?.rendered),
      slug: pageSlugById.get(i.object_id),
    })),
    iletisimChildren: iletisimChildren.map((i) =>
      stripTags(i.title?.raw || i.title?.rendered)
    ),
    missingServices,
    unexpectedHubChildren,
    topLevelServiceDupes: topLevelServiceDupes.map((i) =>
      stripTags(i.title?.raw || i.title?.rendered)
    ),
    englishLeft: englishLeft.map((i) =>
      stripTags(i.title?.raw || i.title?.rendered)
    ),
    locations: {
      primary: locations?.primary?.menu || 0,
      mobile_menu: locations?.mobile_menu?.menu || 0,
      footer_menu: locations?.footer_menu?.menu || 0,
    },
    live: {
      livePrimaryOk,
      mobileFallbackPages,
    },
  };
}

async function verify() {
  const items = await wpFetchAll('/wp-json/wp/v2/menu-items', {
    menus: String(MAIN_MENU_ID),
    per_page: '100',
    context: 'edit',
  });
  const { pageSlugById } = await resolvePageMaps();
  let locations = {};
  try {
    locations = await wpFetch('/wp-json/wp/v2/menu-locations');
  } catch {
    locations = {};
  }
  const liveHtml = await fetch(`${BASE}/?v=${Date.now()}`).then((r) => r.text());
  return buildVerification(items, pageSlugById, locations, liveHtml);
}

async function main() {
  console.log(
    verifyOnly
      ? 'Menü doğrulama (salt okunur)...\n'
      : `Menü uygulaması (${dryRun ? 'DRY-RUN' : 'CANLI'})...\n`
  );

  let applyResult = null;
  if (!verifyOnly) {
    applyResult = await applyMenuStructure();
    try {
      await wpPost('/wp-json/adanaavukat/v1/rankmath-global', { purge_litespeed: true });
    } catch {
      // ignore
    }
    await new Promise((r) => setTimeout(r, 2500));
  }

  const verification = await verify();
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const reportPath = resolve(rootDir, `reports/menu-structure-report-${ts}.json`);
  mkdirSync(resolve(rootDir, 'reports'), { recursive: true });
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        mode: verifyOnly ? 'verify-only' : dryRun ? 'dry-run' : 'apply',
        applyResult,
        verification,
      },
      null,
      2
    ),
    'utf8'
  );

  console.log(`Üst seviye (${verification.topLevel.length}):`);
  for (const t of verification.topLevel) {
    console.log(`  ${t.order}. ${t.title} [${t.slug}]`);
  }
  console.log(`\nHizmetlerimiz alt (${verification.hubChildren.length}):`);
  for (const c of verification.hubChildren) {
    console.log(`  - ${c.title} [${c.slug}]`);
  }
  console.log('\nKontroller:');
  for (const [k, ok] of Object.entries(verification.checks)) {
    console.log(`  ${ok ? '✓' : '✗'} ${k}`);
  }
  console.log(`\nSonuç: ${verification.ok ? 'GEÇTİ' : 'BAŞARISIZ'}`);
  if (applyResult?.backupPath) console.log(`Yedek: ${applyResult.backupPath}`);
  console.log(`Rapor: ${reportPath}`);

  if (!verification.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
