/**
 * Görsel lazy-load / logo / profil düzeltmelerini canlıya uygular.
 *
 * - site_logo (custom logo) bağlar
 * - LiteSpeed skip-lazy snippet oluşturur/günceller
 * - Post card snippet (ilk 3 eager) günceller
 * - Ana sayfa kart HTML günceller
 * - Profil sayfası img HTML günceller
 * - Logo alt text + header CSS
 * - LiteSpeed purge
 */
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { wpFetch } from './lib/wp-client.mjs';
import { getWpConfig, getAuthHeader } from './lib/env.mjs';
import { buildHomepageContent } from './lib/homepage-content.mjs';
import { fetchHomepagePostCards } from './lib/homepage-post-cards.mjs';
import {
  POST_CARD_SNIPPET_NAME,
  buildPostCardSnippetPhp,
} from './lib/post-card-placeholder.mjs';
import {
  IMAGE_LAZYLOAD_SNIPPET_NAME,
  buildImageLazyloadSnippetPhp,
  PROFILE_PHOTO_MEDIA_ID,
  SITE_LOGO_MEDIA_ID,
} from './lib/image-lazyload-fixes.mjs';

// Image fixes live inside post-card snippet (separate snippet activation was unreliable on host).
const COMBINED_SNIPPET_NAME = POST_CARD_SNIPPET_NAME;

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const HOMEPAGE_ID = 7;
const PROFILE_PAGE_ID = 268;
const BASE = 'https://adanaavukat.org';
const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

const HEADER_START = '/* adanaavukat.org — header polish start */';
const HEADER_END = '/* adanaavukat.org — header polish end */';
const LOGO_CSS_START = '/* adanaavukat.org — logo size start */';
const LOGO_CSS_END = '/* adanaavukat.org — logo size end */';

const LOGO_CSS = `${LOGO_CSS_START}
.site-header .custom-logo-link{display:inline-flex;align-items:center;line-height:0}
.site-header .custom-logo-link img.custom-logo,
.site-header .site-logo-img img.custom-logo{
  display:block;width:auto;height:40px;max-height:44px;max-width:min(180px,55vw);
  object-fit:contain
}
@media(max-width:921px){
  .site-header .custom-logo-link img.custom-logo,
  .site-header .site-logo-img img.custom-logo{height:34px;max-height:36px;max-width:min(150px,60vw)}
}
${LOGO_CSS_END}`;

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
    throw new Error(`${path} ${response.status}: ${text.slice(0, 500)}`);
  }
  return text ? JSON.parse(text) : {};
}

async function ensureSnippet(name, desc, code, priority = 8) {
  const snippets = await wpFetch('/wp-json/code-snippets/v1/snippets?per_page=100');
  let snippet = snippets.find((s) => s.name === name);
  const payload = {
    name,
    desc,
    code,
    tags: ['images', 'litespeed', 'adanaavukat'],
    scope: 'global',
    active: true,
    priority,
  };

  if (snippet) {
    snippet = await wpPost(`/wp-json/code-snippets/v1/snippets/${snippet.id}`, payload);
    try {
      await wpPost(`/wp-json/code-snippets/v1/snippets/${snippet.id}/activate`, {});
    } catch {
      // already active
    }
    return { action: 'updated', id: snippet.id, active: true };
  }

  snippet = await wpPost('/wp-json/code-snippets/v1/snippets', payload);
  try {
    await wpPost(`/wp-json/code-snippets/v1/snippets/${snippet.id}/activate`, {});
  } catch {
    // ignore
  }
  return { action: 'created', id: snippet.id, active: true };
}

function patchProfileContent(raw) {
  const oldImg =
    /<img[^>]*Avukat-Ceren-Sumer-Cilli\.jpg[^>]*>/i;
  const nextImg =
    `<img decoding="async" loading="eager" fetchpriority="high" data-no-lazy="1" width="225" height="225" src="https://adanaavukat.org/wp-content/uploads/2026/05/Avukat-Ceren-Sumer-Cilli.jpg" srcset="https://adanaavukat.org/wp-content/uploads/2026/05/Avukat-Ceren-Sumer-Cilli.jpg 225w" sizes="(max-width: 280px) 100vw, 225px" alt="Avukat Ceren Sümer Cilli" class="aa-profile-photo skip-lazy aa-skip-lazy wp-image-${PROFILE_PHOTO_MEDIA_ID}" itemprop="image" />`;

  if (!oldImg.test(raw)) {
    return { content: raw, changed: false };
  }
  return { content: raw.replace(oldImg, nextImg), changed: true };
}

function upsertLogoCss(css) {
  let out = css || '';
  if (out.includes(LOGO_CSS_START) && out.includes(LOGO_CSS_END)) {
    const s = out.indexOf(LOGO_CSS_START);
    const e = out.indexOf(LOGO_CSS_END) + LOGO_CSS_END.length;
    out = `${out.slice(0, s)}${LOGO_CSS}${out.slice(e)}`;
  } else if (out.includes(HEADER_END)) {
    out = out.replace(HEADER_END, `${HEADER_END}\n\n${LOGO_CSS}`);
  } else {
    out = `${out.trim()}\n\n${LOGO_CSS}`.trim();
  }
  return out;
}

async function updateAdditionalCss() {
  const items = await wpFetch('/wp-json/wp/v2/posts?type=custom_css&per_page=1&context=edit');
  if (!items.length) return { skipped: true, reason: 'custom_css yok' };
  const post = items[0];
  const next = upsertLogoCss(post.content?.raw || '');
  await wpPost(`/wp-json/wp/v2/posts/${post.id}`, { content: next });
  return { id: post.id, updated: true };
}

async function verify() {
  const bust = Date.now();
  const [home, blog, profile] = await Promise.all([
    fetch(`${BASE}/?v=${bust}`).then((r) => r.text()),
    fetch(`${BASE}/aile-hukuku-rehberi/?v=${bust}`).then((r) => r.text()),
    fetch(`${BASE}/avukat-ceren-sumer-cilli/?v=${bust}`).then((r) => r.text()),
  ]);

  const pickImgs = (html, re) =>
    [...html.matchAll(re)].map((m) => m[0]).slice(0, 8);

  const logoTags = pickImgs(home, /<img[^>]*class="[^"]*custom-logo[^"]*"[^>]*>/gi);
  const homeCards = pickImgs(home, /<img[^>]*aa-post-thumb__img[^>]*>/gi);
  const blogThumbs = pickImgs(blog, /<img[^>]*wp-post-image[^>]*>/gi);
  const profileImgs = pickImgs(profile, /<img[^>]*(?:aa-profile-photo|Avukat-Ceren-Sumer-Cilli)[^>]*>/gi);

  const summarize = (tag) => ({
    srcIsData: /src="data:image/i.test(tag),
    hasDataSrc: /data-src=/i.test(tag),
    hasSkipLazy: /skip-lazy|aa-skip-lazy|data-no-lazy="1"/i.test(tag),
    loading: tag.match(/loading="([^"]*)"/i)?.[1] || null,
    fetchpriority: tag.match(/fetchpriority="([^"]*)"/i)?.[1] || null,
    src: (tag.match(/src="([^"]*)"/i)?.[1] || '').slice(0, 100),
  });

  return {
    home: {
      hasCustomLogo: /custom-logo-link/i.test(home),
      logo: logoTags.map(summarize),
      cards: homeCards.map(summarize),
      criticalCardCount: homeCards.filter((t) => /aa-critical-img|skip-lazy/i.test(t)).length,
    },
    blog: {
      thumbs: blogThumbs.map(summarize),
      skipLazyCount: blogThumbs.filter((t) => /skip-lazy|aa-skip-lazy|data-no-lazy/i.test(t)).length,
    },
    profile: {
      images: profileImgs.map(summarize),
    },
  };
}

async function main() {
  console.log('Görsel / logo / lazy-load düzeltmeleri uygulanıyor...\n');
  mkdirSync(resolve(rootDir, 'data/backups'), { recursive: true });
  mkdirSync(resolve(rootDir, 'reports'), { recursive: true });

  // 1) Custom logo
  const settings = await wpPost('/wp-json/wp/v2/settings', { site_logo: SITE_LOGO_MEDIA_ID });
  console.log(`site_logo → ${settings.site_logo}`);

  // 2) Logo alt text
  try {
    await wpPost(`/wp-json/wp/v2/media/${SITE_LOGO_MEDIA_ID}`, {
      alt_text: 'adanaavukat.org',
      title: 'adanaavukat.org logo',
    });
    console.log('Logo alt text güncellendi');
  } catch (e) {
    console.log('Logo alt uyarı:', e.message);
  }

  // 3) Combined snippet: post-card placeholder + LiteSpeed image fixes
  const combinedCode = `${buildPostCardSnippetPhp()}\n\n${buildImageLazyloadSnippetPhp()}`;
  const imageSnippet = await ensureSnippet(
    COMBINED_SNIPPET_NAME,
    'Astra blog kartları placeholder + LiteSpeed lazy-load excludes (logo/profil/kritik görseller).',
    combinedCode,
    5
  );
  console.log(`Snippet ${COMBINED_SNIPPET_NAME}:`, imageSnippet);

  // Remove legacy standalone image-fixes snippet if present
  try {
    const snippets = await wpFetch('/wp-json/code-snippets/v1/snippets?per_page=100');
    for (const s of snippets) {
      if (s.name === IMAGE_LAZYLOAD_SNIPPET_NAME || s.name === 'AA Image Fixes Probe') {
        try {
          await wpPost(`/wp-json/code-snippets/v1/snippets/${s.id}/deactivate`, {});
        } catch {
          // ignore
        }
        const { baseUrl, username, appPassword } = getWpConfig();
        await fetch(`${baseUrl}/wp-json/code-snippets/v1/snippets/${s.id}`, {
          method: 'DELETE',
          headers: { Authorization: getAuthHeader(username, appPassword) },
        });
        console.log(`Removed legacy snippet ${s.id} (${s.name})`);
      }
    }
  } catch (e) {
    console.log('Legacy snippet cleanup:', e.message);
  }

  // (post-card snippet already updated above as combined)

  // 5) Homepage content
  const homepage = await wpFetch(`/wp-json/wp/v2/pages/${HOMEPAGE_ID}?context=edit`);
  writeFileSync(
    resolve(rootDir, `data/backups/homepage-7-pre-image-fixes-${ts}.json`),
    JSON.stringify(homepage, null, 2),
    'utf8'
  );
  const postCards = await fetchHomepagePostCards(wpFetch);
  const homeContent = buildHomepageContent({ postCards });
  const homeUpdated = await wpPost(`/wp-json/wp/v2/pages/${HOMEPAGE_ID}`, {
    content: homeContent,
    status: 'publish',
  });
  console.log(`Ana sayfa güncellendi: ${homeUpdated.modified}`);

  // 6) Profile page content
  const profile = await wpFetch(`/wp-json/wp/v2/pages/${PROFILE_PAGE_ID}?context=edit`);
  writeFileSync(
    resolve(rootDir, `data/backups/profile-268-pre-image-fixes-${ts}.json`),
    JSON.stringify(profile, null, 2),
    'utf8'
  );
  const patched = patchProfileContent(profile.content?.raw || '');
  let profileModified = null;
  if (patched.changed) {
    const profileUpdated = await wpPost(`/wp-json/wp/v2/pages/${PROFILE_PAGE_ID}`, {
      content: patched.content,
      status: 'publish',
    });
    profileModified = profileUpdated.modified;
    console.log(`Profil sayfası güncellendi: ${profileModified}`);
  } else {
    console.log('Profil img etiketi bulunamadı / zaten güncel');
  }

  // 7) Additional CSS logo sizing
  const cssResult = await updateAdditionalCss();
  console.log('Additional CSS:', cssResult);

  // 8) Purge
  let purge = null;
  try {
    purge = await wpPost('/wp-json/adanaavukat/v1/rankmath-global', { purge_litespeed: true });
    console.log('LiteSpeed purge:', purge);
  } catch (e) {
    console.log('Purge uyarısı:', e.message);
  }

  await new Promise((r) => setTimeout(r, 3500));
  const verification = await verify();

  const report = {
    generatedAt: new Date().toISOString(),
    siteLogoMediaId: SITE_LOGO_MEDIA_ID,
    profilePhotoMediaId: PROFILE_PHOTO_MEDIA_ID,
    profilePhotoNativeSize: '225x225 (kaynak dosya; büyütülmedi)',
    snippets: { combinedSnippet: imageSnippet },
    homepageModified: homeUpdated.modified,
    profileModified,
    cssResult,
    purge,
    verification,
    manualNextSteps: [
      'LiteSpeed Cache → Toolbox → Purge All (gerekirse tekrar)',
      'QUIC.cloud / CDN varsa cache temizle',
      'Profil için WordPress Medya’da en az 800×800 px yeni foto yükle ve sayfadaki görseli değiştir (mevcut #269 yalnızca 225×225)',
      'Retina logo için ~480×144 (veya 2x) webp yükleyip Görünüm → Özelleştir → Logo olarak ata',
      'Gizli sekmede masaüstü + mobil: ana sayfa, blog listesi, profil',
    ],
  };

  const reportPath = resolve(rootDir, `reports/image-lazyload-fixes-${ts}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log('\nDoğrulama:', JSON.stringify(verification, null, 2));
  console.log(`Rapor: ${reportPath}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
