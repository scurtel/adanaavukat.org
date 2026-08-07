/**
 * Avukat Ceren Sümer Cilli otorite / E-E-A-T uygulaması.
 *
 * Kullanım:
 *   node scripts/apply-ceren-authority.mjs --dry-run
 *   node scripts/apply-ceren-authority.mjs
 *   node scripts/apply-ceren-authority.mjs --verify-only
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { wpFetch, wpFetchAll } from './lib/wp-client.mjs';
import { getWpConfig, getAuthHeader, rootDir } from './lib/env.mjs';
import {
  AUTHOR_USER_ID,
  AUTHOR_DISPLAY_NAME,
  AUTHOR_SLUG_NEW,
  AUTHOR_SLUG_OLD,
  PROFILE_PAGE_ID,
  PROFILE_SLUG_NEW,
  PROFILE_SLUG_OLD,
  PROFILE_URL_NEW,
  BASE_URL,
  EEAT_PAGES,
  SNIPPET_NAMES,
  BLOG_HUB_PAGE_ID,
} from './lib/ceren-authority-config.mjs';
import {
  buildProfilePageHtml,
  buildProfileJsonLd,
  injectProfileSchema,
} from './lib/profile-page-content.mjs';
import {
  buildAuthorityRedirectSnippetPhp,
  buildProfileShortcodesSnippetPhp,
  buildArticleAuthoritySnippetPhp,
  buildEnhancedBlogHubSnippetPhp,
} from './lib/authority-snippets.mjs';
import { buildEeatPageHtml } from './lib/eeat-pages-content.mjs';
import { ENTITY } from './lib/service-pages-config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dryRun = process.argv.includes('--dry-run');
const verifyOnly = process.argv.includes('--verify-only');

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
  const payload = {
    name,
    code,
    desc,
    scope: 'global',
    active: true,
  };
  if (dryRun) {
    return { action: snippet ? 'would-update' : 'would-create', id: snippet?.id || null };
  }
  if (snippet) {
    snippet = await wpPost(`/wp-json/code-snippets/v1/snippets/${snippet.id}`, payload);
    try {
      await wpPost(`/wp-json/code-snippets/v1/snippets/${snippet.id}/activate`, {});
    } catch {
      // already active
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

function replaceProfileUrlsInHtml(html = '') {
  if (!html) return { html, changed: false };
  let next = html;
  const patterns = [
    [
      new RegExp(`${BASE_URL.replace(/\./g, '\\.')}/${PROFILE_SLUG_OLD}/?`, 'gi'),
      PROFILE_URL_NEW,
    ],
    [new RegExp(`/${PROFILE_SLUG_OLD}/?`, 'gi'), `/${PROFILE_SLUG_NEW}/`],
    [
      new RegExp(`/author/${AUTHOR_SLUG_OLD}/?`, 'gi'),
      `/author/${AUTHOR_SLUG_NEW}/`,
    ],
    [/https?:\/\/cerenummer\.com\/?/gi, PROFILE_URL_NEW],
  ];
  let changed = false;
  for (const [re, to] of patterns) {
    const updated = next.replace(re, to);
    if (updated !== next) {
      changed = true;
      next = updated;
    }
  }
  return { html: next, changed };
}

async function backupBeforeApply() {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dir = resolve(rootDir, 'reports/backups');
  mkdirSync(dir, { recursive: true });
  const user = await wpFetch(`/wp-json/wp/v2/users/${AUTHOR_USER_ID}?context=edit`);
  const profile = await wpFetch(`/wp-json/wp/v2/pages/${PROFILE_PAGE_ID}?context=edit`);
  const path = resolve(dir, `ceren-authority-pre-apply-${ts}.json`);
  writeFileSync(
    path,
    JSON.stringify(
      {
        backedUpAt: new Date().toISOString(),
        user: { id: user.id, name: user.name, slug: user.slug, link: user.link },
        profile: {
          id: profile.id,
          slug: profile.slug,
          title: profile.title,
          content: profile.content?.raw || profile.content?.rendered,
        },
      },
      null,
      2
    ),
    'utf8'
  );
  return path;
}

async function fixAuthorIdentity() {
  const user = await wpFetch(`/wp-json/wp/v2/users/${AUTHOR_USER_ID}?context=edit`);
  const payload = {
    name: AUTHOR_DISPLAY_NAME,
    slug: AUTHOR_SLUG_NEW,
  };
  if (dryRun) {
    return {
      action: 'would-update',
      before: { name: user.name, slug: user.slug },
      after: payload,
    };
  }
  const updated = await wpPost(`/wp-json/wp/v2/users/${AUTHOR_USER_ID}`, payload);
  return {
    action: 'updated',
    before: { name: user.name, slug: user.slug },
    after: { name: updated.name, slug: updated.slug, link: updated.link },
  };
}

async function upgradeProfilePage() {
  const html = injectProfileSchema(buildProfilePageHtml(), buildProfileJsonLd());
  const payload = {
    title: AUTHOR_DISPLAY_NAME,
    slug: PROFILE_SLUG_NEW,
    content: html,
    status: 'publish',
  };
  if (dryRun) {
    return { action: 'would-update', id: PROFILE_PAGE_ID, slug: PROFILE_SLUG_NEW };
  }
  const updated = await wpPost(`/wp-json/wp/v2/pages/${PROFILE_PAGE_ID}`, payload);
  try {
    await wpPost(`/wp-json/adanaavukat/v1/rankmath-meta/${PROFILE_PAGE_ID}`, {
      rank_math_title: 'Avukat Ceren Sümer Cilli | Aile Hukuku',
      rank_math_description:
        'Avukat Ceren Sümer Cilli: boşanma, velayet, nafaka, mal rejimi, ziynet ve 6284 sayılı Kanun konularında aile hukuku profili ve makaleleri.',
      rank_math_focus_keyword: 'Avukat Ceren Sümer Cilli',
      rank_math_robots: ['index', 'follow'],
    });
  } catch (e) {
    // non-fatal
  }
  return { action: 'updated', id: updated.id, slug: updated.slug, link: updated.link };
}

async function ensureEeatPages() {
  const pages = await wpFetchAll('/wp-json/wp/v2/pages', {
    per_page: '100',
    status: 'publish,draft',
  });
  const results = [];
  for (const def of EEAT_PAGES) {
    const existing = pages.find((p) => p.slug === def.slug);
    const content = buildEeatPageHtml(def.type);
    if (existing) {
      if (dryRun) {
        results.push({ slug: def.slug, action: 'would-update', id: existing.id });
        continue;
      }
      const updated = await wpPost(`/wp-json/wp/v2/pages/${existing.id}`, {
        title: def.title,
        content,
        status: 'publish',
      });
      results.push({ slug: def.slug, action: 'updated', id: updated.id, link: updated.link });
      continue;
    }
    if (dryRun) {
      results.push({ slug: def.slug, action: 'would-create' });
      continue;
    }
    const created = await wpPost('/wp-json/wp/v2/pages', {
      title: def.title,
      slug: def.slug,
      content,
      status: 'publish',
    });
    results.push({ slug: def.slug, action: 'created', id: created.id, link: created.link });
  }
  return results;
}

async function rewriteContentLinks() {
  const results = [];
  const posts = await wpFetchAll('/wp-json/wp/v2/posts', {
    per_page: '100',
    status: 'publish',
    context: 'edit',
  });
  const pages = await wpFetchAll('/wp-json/wp/v2/pages', {
    per_page: '100',
    status: 'publish',
    context: 'edit',
  });

  for (const item of [...posts.map((p) => ({ ...p, type: 'posts' })), ...pages.map((p) => ({ ...p, type: 'pages' }))]) {
    const raw = item.content?.raw || '';
    const { html, changed } = replaceProfileUrlsInHtml(raw);
    if (!changed) continue;
    if (dryRun) {
      results.push({ type: item.type, id: item.id, slug: item.slug, action: 'would-update-links' });
      continue;
    }
    await wpPost(`/wp-json/wp/v2/${item.type}/${item.id}`, { content: html });
    results.push({ type: item.type, id: item.id, slug: item.slug, action: 'updated-links' });
  }
  return results;
}

async function updateMenuProfileTitle() {
  const items = await wpFetchAll('/wp-json/wp/v2/menu-items', {
    menus: '11',
    per_page: '100',
    context: 'edit',
  });
  const item = items.find((i) => i.object_id === PROFILE_PAGE_ID);
  if (!item) return { action: 'missing-menu-item' };
  if (dryRun) return { action: 'would-update', id: item.id };
  const updated = await wpPost(`/wp-json/wp/v2/menu-items/${item.id}`, {
    title: 'Avukat Ceren Sümer Cilli',
    menus: 11,
    status: 'publish',
  });
  return { action: 'updated', id: updated.id };
}

async function updateBlogHubSeo() {
  if (dryRun) return { action: 'would-update', id: BLOG_HUB_PAGE_ID };
  try {
    await wpPost(`/wp-json/adanaavukat/v1/rankmath-meta/${BLOG_HUB_PAGE_ID}`, {
      rank_math_title: 'Aile Hukuku Rehberi | Av. Ceren Sümer Cilli',
      rank_math_description:
        'Aile hukuku rehberi: boşanma, velayet, nafaka, mal rejimi ve 6284 tedbirleri. Avukat Ceren Sümer Cilli’nin bilgilendirici yazıları.',
      rank_math_focus_keyword: 'Aile Hukuku Rehberi',
    });
    await wpPost(`/wp-json/wp/v2/pages/${BLOG_HUB_PAGE_ID}`, {
      title: 'Aile Hukuku Rehberi',
    });
    return { action: 'updated', id: BLOG_HUB_PAGE_ID };
  } catch (e) {
    return { action: 'error', error: e.message };
  }
}

async function deactivateOldRedirectSnippet() {
  const snippets = await wpFetch('/wp-json/code-snippets/v1/snippets');
  const old = snippets.find((s) => s.name === 'Adana Avukat EN Duplicate Redirects');
  if (!old) return { action: 'not-found' };
  if (dryRun) return { action: 'would-deactivate', id: old.id };
  try {
    await wpPost(`/wp-json/code-snippets/v1/snippets/${old.id}`, {
      active: false,
      name: old.name,
      code: old.code,
    });
    return { action: 'deactivated', id: old.id };
  } catch (e) {
    return { action: 'error', error: e.message, id: old.id };
  }
}

async function verifyLive() {
  const checks = {};
  const user = await wpFetch(`/wp-json/wp/v2/users/${AUTHOR_USER_ID}`);
  checks.authorSlug = user.slug === AUTHOR_SLUG_NEW;
  checks.authorName = user.name === AUTHOR_DISPLAY_NAME;

  const profile = await wpFetch(`/wp-json/wp/v2/pages/${PROFILE_PAGE_ID}`);
  checks.profileSlug = profile.slug === PROFILE_SLUG_NEW;

  const authorOld = await fetch(`${BASE_URL}/author/${AUTHOR_SLUG_OLD}/`, {
    redirect: 'manual',
  });
  checks.authorOldRedirect =
    authorOld.status === 301 &&
    (authorOld.headers.get('location') || '').includes(`/author/${AUTHOR_SLUG_NEW}`);

  const profileOld = await fetch(`${BASE_URL}/${PROFILE_SLUG_OLD}/`, {
    redirect: 'manual',
  });
  checks.profileOldRedirect =
    profileOld.status === 301 &&
    (profileOld.headers.get('location') || '').includes(`/${PROFILE_SLUG_NEW}`);

  const profileLive = await fetch(`${PROFILE_URL_NEW}?nocache=${Date.now()}`);
  const html = await profileLive.text();
  checks.profileLive200 = profileLive.status === 200;
  checks.profileHasJsonLd = html.includes('aa-profile-jsonld') || html.includes('ProfilePage');
  checks.profileHasArticlesShortcodeResolved = html.includes('aa-profile-articles');

  const hub = await fetch(`${BASE_URL}/aile-hukuku-rehberi/?nocache=${Date.now()}`);
  const hubHtml = await hub.text();
  checks.hubHasClusters = hubHtml.includes('aa-cluster-grid') || hubHtml.includes('Boşanma ve deliller');
  checks.hubCollectionSchema = hubHtml.includes('CollectionPage');

  const failed = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([k]) => k);

  return { ok: failed.length === 0, failed, checks };
}

async function main() {
  console.log(
    verifyOnly
      ? 'Ceren otorite doğrulama...\n'
      : `Ceren otorite uygulaması (${dryRun ? 'DRY-RUN' : 'CANLI'})...\n`
  );

  const report = {
    generatedAt: new Date().toISOString(),
    mode: verifyOnly ? 'verify-only' : dryRun ? 'dry-run' : 'apply',
    entityConfigNote: {
      previousProfileSlug: ENTITY.profileSlug,
      nextProfileSlug: PROFILE_SLUG_NEW,
    },
  };

  if (!verifyOnly) {
    report.backupPath = await backupBeforeApply();
    console.log('Yedek:', report.backupPath);

    report.author = await fixAuthorIdentity();
    console.log('Yazar:', report.author);

    report.profile = await upgradeProfilePage();
    console.log('Profil:', report.profile);

    report.eeatPages = await ensureEeatPages();
    console.log('E-E-A-T sayfaları:', report.eeatPages.length);

    report.linkRewrites = await rewriteContentLinks();
    console.log('Link güncelleme:', report.linkRewrites.length);

    report.menu = await updateMenuProfileTitle();
    report.blogHubSeo = await updateBlogHubSeo();

    report.snippets = {
      redirects: await upsertSnippet(
        SNIPPET_NAMES.redirects,
        buildAuthorityRedirectSnippetPhp(),
        'Author/profile/EN 301 redirects'
      ),
      profileShortcodes: await upsertSnippet(
        SNIPPET_NAMES.profileShortcodes,
        buildProfileShortcodesSnippetPhp(),
        'Profile article shortcodes + practice note meta'
      ),
      articleAuthority: await upsertSnippet(
        SNIPPET_NAMES.articleAuthority,
        buildArticleAuthoritySnippetPhp(),
        'Family-law author box, related posts, Article JSON-LD'
      ),
      blogHub: await upsertSnippet(
        SNIPPET_NAMES.blogHub,
        buildEnhancedBlogHubSnippetPhp(),
        'Aile Hukuku Rehberi hub clusters + CollectionPage'
      ),
      oldRedirectDeactivate: await deactivateOldRedirectSnippet(),
    };
    console.log('Snippetler:', report.snippets);

    try {
      await wpPost('/wp-json/adanaavukat/v1/rankmath-global', {
        purge_litespeed: true,
        flush_sitemap: true,
      });
      report.cachePurge = { ok: true };
    } catch (e) {
      report.cachePurge = { ok: false, error: e.message };
    }
    await new Promise((r) => setTimeout(r, 3000));
  }

  report.verification = await verifyLive();
  console.log('Doğrulama:', report.verification.ok ? 'GEÇTİ' : 'EKSİK', report.verification.failed);

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const out = resolve(rootDir, `reports/ceren-authority-apply-${ts}.json`);
  mkdirSync(resolve(rootDir, 'reports'), { recursive: true });
  writeFileSync(out, JSON.stringify(report, null, 2), 'utf8');
  console.log('Rapor JSON:', out);

  if (!report.verification.ok) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
