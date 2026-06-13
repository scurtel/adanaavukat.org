/**
 * Site yapısı ve ana sayfa teknik analizi (salt okunur)
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { wpFetch, wpFetchAll } from './lib/wp-client.mjs';
import { getWpConfig } from './lib/env.mjs';
import { stripHtml, extractLinks, detectAuthorBoxSignals } from './lib/content-utils.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const backupDir = resolve(rootDir, 'data/backups');

function mapItem(item, type) {
  const contentHtml = item.content?.rendered || '';
  const plain = stripHtml(contentHtml);
  const links = extractLinks(contentHtml);
  return {
    id: item.id,
    title: stripHtml(item.title?.rendered || ''),
    slug: item.slug,
    link: item.link,
    type,
    status: item.status,
    date: item.date,
    modified: item.modified,
    excerpt: stripHtml(item.excerpt?.rendered || ''),
    contentLength: plain.length,
    wordCount: plain.split(/\s+/).filter(Boolean).length,
    categories: item.categories || [],
    tags: item.tags || [],
    parent: item.parent || 0,
    menuOrder: item.menu_order || 0,
    internalLinkCount: links.internal.length,
    externalLinkCount: links.external.length,
    hasJsonLd: /<script[^>]+type=["']application\/ld\+json["']/i.test(contentHtml),
    entityMentions: plain.toLowerCase().includes('ceren') && plain.toLowerCase().includes('cilli'),
    authorBoxSignals: detectAuthorBoxSignals(contentHtml),
  };
}

async function fetchMenus() {
  try {
    const locations = await wpFetch('/wp-json/wp-api-menus/v2/menu-locations');
    return { locations, available: true };
  } catch {
    // Try alternative menu endpoint
    try {
      const menus = await wpFetch('/wp-json/wp/v2/menu-items?per_page=100');
      return { items: menus, available: 'menu-items' };
    } catch {
      return { available: false };
    }
  }
}

async function analyzeHomepageMeta(pageId) {
  const meta = {};
  try {
    const full = await wpFetch(`/wp-json/wp/v2/pages/${pageId}?context=edit`);
    meta.id = full.id;
    meta.slug = full.slug;
    meta.title = stripHtml(full.title?.rendered || '');
    meta.status = full.status;
    meta.link = full.link;
    meta.contentRawLength = (full.content?.raw || full.content?.rendered || '').length;
    meta.contentRendered = full.content?.rendered || '';

    // Check for Elementor
    meta.hasElementorClass = /elementor/i.test(meta.contentRendered);
    meta.hasElementorData = false;
    meta.hasGutenbergBlocks = /wp-block-|<!-- wp:/i.test(full.content?.raw || meta.contentRendered);
    meta.hasClassicShortcodes = /\[[\w-]+/i.test(full.content?.raw || '');

    // Fetch meta fields if available via REST
    try {
      const withMeta = await wpFetch(`/wp-json/wp/v2/pages/${pageId}?context=edit&_fields=id,meta,content,title,slug,link,status`);
      if (withMeta.meta) {
        meta.restMeta = Object.keys(withMeta.meta);
        meta.hasElementorData = !!withMeta.meta._elementor_data || !!withMeta.meta?.elementor_data;
      }
    } catch {
      /* meta may not be exposed */
    }
  } catch (e) {
    meta.error = e.message;
  }
  return meta;
}

async function getSiteSettings() {
  const settings = {};
  try {
    // WordPress settings endpoint (may need auth)
    const s = await wpFetch('/wp-json/wp/v2/settings');
    settings.pageOnFront = s.page_on_front;
    settings.showOnFront = s.show_on_front;
    settings.title = s.title;
    settings.description = s.description;
  } catch (e) {
    settings.error = e.message;
  }
  return settings;
}

async function detectTheme() {
  try {
    const theme = await wpFetch('/wp-json/wp/v2/themes');
    const active = Array.isArray(theme)
      ? theme.find((t) => t.status === 'active') || theme[0]
      : theme;
    return active;
  } catch {
    try {
      return await wpFetch('/wp-json/wp-theme/v1/themes');
    } catch {
      return null;
    }
  }
}

async function main() {
  const { baseUrl } = getWpConfig();
  mkdirSync(backupDir, { recursive: true });

  const [posts, pages, categories, tags, settings, theme] = await Promise.all([
    wpFetchAll('/wp-json/wp/v2/posts', { status: 'publish,draft' }),
    wpFetchAll('/wp-json/wp/v2/pages', { status: 'publish,draft' }),
    wpFetchAll('/wp-json/wp/v2/categories'),
    wpFetchAll('/wp-json/wp/v2/tags'),
    getSiteSettings(),
    detectTheme(),
  ]);

  const menus = await fetchMenus();

  const mappedPosts = posts.map((p) => mapItem(p, 'post'));
  const mappedPages = pages.map((p) => mapItem(p, 'page'));

  // Find homepage candidates
  const homepageCandidates = mappedPages.filter(
    (p) =>
      p.slug === 'adana-avukat' ||
      p.slug === 'ana-sayfa' ||
      p.slug === 'home' ||
      p.slug === 'front-page' ||
      /ana sayfa|homepage/i.test(p.title)
  );

  let homepageId = settings.pageOnFront || null;
  if (!homepageId && homepageCandidates.length) {
    homepageId = homepageCandidates.find((p) => p.slug === 'adana-avukat')?.id || homepageCandidates[0].id;
  }

  let homepageMeta = null;
  let homepageBackup = null;
  if (homepageId) {
    homepageMeta = await analyzeHomepageMeta(homepageId);
    const fullPage = await wpFetch(`/wp-json/wp/v2/pages/${homepageId}?context=edit`);
    homepageBackup = {
      backedUpAt: new Date().toISOString(),
      id: fullPage.id,
      title: fullPage.title,
      slug: fullPage.slug,
      status: fullPage.status,
      content: fullPage.content,
      excerpt: fullPage.excerpt,
      meta: fullPage.meta || null,
    };
    writeFileSync(
      resolve(backupDir, `homepage-${homepageId}-backup.json`),
      JSON.stringify(homepageBackup, null, 2),
      'utf8'
    );
    if (fullPage.content?.raw || fullPage.content?.rendered) {
      writeFileSync(
        resolve(backupDir, `homepage-${homepageId}-content.html`),
        fullPage.content.raw || fullPage.content.rendered,
        'utf8'
      );
    }
  }

  // Service pages map
  const servicePatterns = {
    bosanma: [/bosanma/, /boşanma/],
    anlasmali_bosanma: [/anlasmali-bosanma/, /anlaşmalı/],
    cekismeli_bosanma: [/cekismeli-bosanma/, /çekişmeli/],
    nafaka: [/nafaka/],
    velayet: [/velayet/],
    mal_paylasimi: [/mal-paylasim/, /ortakligin-giderilmesi/],
    miras: [/miras/, /veraset/],
    kira: [/kira/],
    is_hukuku: [/is-hukuku/, /iş-hukuku/],
    profil: [/ceren.*cilli/, /kimdir/],
    hakkimizda: [/hakkimizda/, /about/],
    iletisim: [/iletisim/, /contact/],
    hizmetler: [/hizmetlerimiz/],
    aile_hukuku: [/aile-hukuku/],
  };

  const serviceMap = {};
  for (const [key, patterns] of Object.entries(servicePatterns)) {
    serviceMap[key] = mappedPages.filter((p) =>
      patterns.some((pat) => pat.test(p.slug) || pat.test(p.title))
    );
  }

  const newArticles = mappedPosts.filter((p) =>
    [
      'adanada-aile-hukuku-davalarinda-avukat-destegi',
      'adanada-avukat-secerken-nelere-dikkat-edilmeli',
      'adanada-bosanma-davasi-sureci',
      'adanada-miras-kira-is-hukuku-avukat-destegi',
      'adanada-nafaka-ve-velayet-uyusmazliklari',
    ].includes(p.slug)
  );

  const output = {
    fetchedAt: new Date().toISOString(),
    baseUrl,
    settings,
    theme: theme
      ? {
          name: theme.name || theme.stylesheet,
          version: theme.version,
          author: theme.author,
          template: theme.template,
        }
      : null,
    homepage: {
      id: homepageId,
      candidates: homepageCandidates,
      meta: homepageMeta,
      backupPath: homepageId ? `data/backups/homepage-${homepageId}-backup.json` : null,
    },
    menus,
    summary: {
      posts: mappedPosts.length,
      pages: mappedPages.length,
      categories: categories.length,
      tags: tags.length,
      publishedPosts: mappedPosts.filter((p) => p.status === 'publish').length,
      publishedPages: mappedPages.filter((p) => p.status === 'publish').length,
    },
    categories: categories.map((c) => ({
      id: c.id,
      name: stripHtml(c.name),
      slug: c.slug,
      count: c.count,
    })),
    tags: tags.map((t) => ({
      id: t.id,
      name: stripHtml(t.name),
      slug: t.slug,
      count: t.count,
    })),
    posts: mappedPosts,
    pages: mappedPages,
    serviceMap,
    newArticles,
  };

  writeFileSync(resolve(rootDir, 'data/site-structure-audit.json'), JSON.stringify(output, null, 2), 'utf8');

  console.log('Site yapısı kaydedildi: data/site-structure-audit.json');
  console.log(`Ana sayfa ID: ${homepageId ?? 'tespit edilemedi'}`);
  console.log(`Tema: ${output.theme?.name ?? 'bilinmiyor'}`);
  console.log(`Sayfa: ${mappedPages.length}, Yazı: ${mappedPosts.length}`);
  if (homepageMeta) {
    console.log(`Elementor sınıfı: ${homepageMeta.hasElementorClass}`);
    console.log(`Gutenberg blokları: ${homepageMeta.hasGutenbergBlocks}`);
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
