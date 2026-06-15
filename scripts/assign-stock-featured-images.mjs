import { mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { wpFetchAll } from './lib/wp-client.mjs';
import { getAuthHeader } from './lib/env.mjs';
import {
  getStockImageEnv,
  validateStockImageEnv,
  resolvePrimaryCategory,
  getCategoryPriorityWeight,
  buildSearchQuery,
  buildSeoFilename,
  buildAltText,
} from './lib/stock-image-config.mjs';
import { findStockImage, downloadImage } from './lib/stock-image-apis.mjs';
import { optimizeImageBuffer } from './lib/image-optimize.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const REPORT_PATH = resolve(rootDir, 'reports/featured-image-assignment-report.json');

function stripHtml(value = '') {
  return decodeHtmlEntities(String(value).replace(/<[^>]+>/g, '').trim());
}

function decodeHtmlEntities(value = '') {
  return String(value)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(Number(num)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function sleep(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

async function uploadMediaToWordPress({ baseUrl, username, appPassword, buffer, filename, altText, title }) {
  const formData = new FormData();
  const blob = new Blob([buffer], { type: 'image/webp' });
  formData.append('file', blob, filename);
  formData.append('alt_text', altText);
  formData.append('title', title);

  const res = await fetch(`${baseUrl}/wp-json/wp/v2/media`, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(username, appPassword),
      Accept: 'application/json',
    },
    body: formData,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Medya yükleme hatası ${res.status}: ${text.slice(0, 300)}`);
  }

  const media = JSON.parse(text);

  if (altText && media.id) {
    await fetch(`${baseUrl}/wp-json/wp/v2/media/${media.id}`, {
      method: 'POST',
      headers: {
        Authorization: getAuthHeader(username, appPassword),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ alt_text: altText, title }),
    });
  }

  return media;
}

async function assignFeaturedMedia({ baseUrl, username, appPassword, postId, mediaId }) {
  const res = await fetch(`${baseUrl}/wp-json/wp/v2/posts/${postId}`, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(username, appPassword),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ featured_media: mediaId }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Featured image atama hatası ${res.status}: ${text.slice(0, 300)}`);
  }

  return JSON.parse(text);
}

async function loadPosts(categoryMap) {
  const posts = await wpFetchAll('/wp-json/wp/v2/posts', { status: 'publish' });

  return posts
    .map((post) => {
      const categories = (post.categories || [])
        .map((id) => categoryMap.get(id))
        .filter(Boolean);
      const categoryNames = categories.map((c) => c.name);
      const primaryCategory = resolvePrimaryCategory(categoryNames);

      return {
        id: post.id,
        title: stripHtml(post.title?.rendered || ''),
        slug: post.slug,
        link: post.link,
        featuredMedia: post.featured_media || 0,
        categories: categoryNames,
        primaryCategory,
        priority: getCategoryPriorityWeight(primaryCategory),
        searchQuery: buildSearchQuery(stripHtml(post.title?.rendered || ''), primaryCategory),
      };
    })
    .sort((a, b) => a.priority - b.priority || a.title.localeCompare(b.title, 'tr'));
}

async function processPost(post, { env, usedKeys, apply }) {
  const entry = {
    postId: post.id,
    title: post.title,
    slug: post.slug,
    category: post.primaryCategory,
    searchQuery: post.searchQuery,
    service: null,
    sourceImageUrl: null,
    mediaId: null,
    filename: null,
    altText: buildAltText(post.title, post.primaryCategory),
    result: 'skipped',
    errorReason: null,
    optimized: null,
  };

  if (post.featuredMedia) {
    entry.result = 'skipped';
    entry.errorReason = 'Zaten öne çıkan görsel mevcut';
    return entry;
  }

  let photoResult;
  try {
    photoResult = await findStockImage({
      query: post.searchQuery,
      env,
      usedKeys,
    });
  } catch (error) {
    entry.result = 'failed';
    entry.errorReason = error.message;
    return entry;
  }

  const { photo, errors } = photoResult;
  if (!photo) {
    entry.result = 'skipped';
    entry.errorReason = errors.length
      ? `Uygun görsel bulunamadı (${errors.map((e) => `${e.service}: ${e.message}`).join('; ')})`
      : 'Uygun görsel bulunamadı';
    return entry;
  }

  entry.service = photo.service;
  entry.sourceImageUrl = photo.sourceUrl;

  if (!apply) {
    entry.result = 'dry-run-assigned';
    entry.errorReason = null;
    return entry;
  }

  try {
    const { buffer } = await downloadImage(photo.downloadUrl);
    const optimized = await optimizeImageBuffer(buffer);
    const filename = buildSeoFilename(post.slug, post.primaryCategory);

    entry.filename = filename;
    entry.optimized = {
      format: optimized.format,
      width: optimized.width,
      height: optimized.height,
      optimized: optimized.optimized,
    };

    const media = await uploadMediaToWordPress({
      baseUrl: env.baseUrl,
      username: env.username,
      appPassword: env.appPassword,
      buffer: optimized.buffer,
      filename,
      altText: entry.altText,
      title: post.title,
    });

    entry.mediaId = media.id;
    await assignFeaturedMedia({
      baseUrl: env.baseUrl,
      username: env.username,
      appPassword: env.appPassword,
      postId: post.id,
      mediaId: media.id,
    });

    entry.result = 'assigned';
    return entry;
  } catch (error) {
    entry.result = 'failed';
    entry.errorReason = error.message;
    return entry;
  }
}

function summarizeReport(mode, posts, entries) {
  const missingFeatured = posts.filter((p) => !p.featuredMedia);
  const assigned = entries.filter((e) => e.result === 'assigned' || e.result === 'dry-run-assigned');
  const skipped = entries.filter((e) => e.result === 'skipped');
  const failed = entries.filter((e) => e.result === 'failed');

  return {
    generatedAt: new Date().toISOString(),
    mode,
    totals: {
      scannedPosts: posts.length,
      missingFeaturedPosts: missingFeatured.length,
      assignedPosts: assigned.length,
      skippedPosts: skipped.length,
      failedPosts: failed.length,
    },
    entries,
  };
}

async function main() {
  const apply = process.argv.includes('--apply');
  const dryRun = process.argv.includes('--dry-run') || !apply;

  if (!dryRun && !apply) {
    console.error('Kullanım: node scripts/assign-stock-featured-images.mjs --dry-run | --apply');
    process.exit(1);
  }

  const mode = apply ? 'apply' : 'dry-run';
  const env = getStockImageEnv();
  const missing = validateStockImageEnv(env);

  if (missing.length) {
    console.error('Eksik ortam değişkenleri:');
    for (const key of [...new Set(missing)]) {
      console.error(`- ${key}`);
    }
    process.exit(1);
  }

  console.log(`\nPlan (${mode}):`);
  console.log('1. Yayınlanmış yazıları tara');
  console.log('2. Öne çıkan görseli olmayanları öncelikli kategorilere göre sırala');
  console.log('3. Başlık + kategori ile arama sorgusu üret');
  console.log('4. Pexels → Pixabay → Unsplash sırasıyla görsel ara');
  console.log('5. Uygun görseli indir, WebP optimize et (max 1200px)');
  console.log('6. WordPress medyaya yükle ve featured_media ata');
  console.log('7. JSON raporu oluştur\n');

  const categories = await wpFetchAll('/wp-json/wp/v2/categories');
  const categoryMap = new Map(
    categories.map((c) => [c.id, { id: c.id, name: stripHtml(c.name), slug: c.slug }])
  );

  const posts = await loadPosts(categoryMap);
  const targets = posts.filter((p) => !p.featuredMedia);
  const usedKeys = new Set();
  const entries = [];

  console.log(`Toplam yazı: ${posts.length}`);
  console.log(`Featured image eksik: ${targets.length}`);
  console.log(`Mod: ${mode}\n`);

  for (const [index, post] of targets.entries()) {
    console.log(`[${index + 1}/${targets.length}] ${post.title}`);
    const entry = await processPost(post, { env, usedKeys, apply });
    entries.push(entry);

    const status =
      entry.result === 'assigned'
        ? `✅ atandı (${entry.service}, media #${entry.mediaId})`
        : entry.result === 'dry-run-assigned'
          ? `🔎 dry-run (${entry.service})`
          : entry.result === 'skipped'
            ? `⏭️ atlandı (${entry.errorReason})`
            : `❌ hata (${entry.errorReason})`;
    console.log(`   ${status}`);

    if (apply && entry.result === 'assigned') {
      await sleep(1200);
    } else {
      await sleep(400);
    }
  }

  const report = summarizeReport(mode, posts, entries);
  mkdirSync(resolve(rootDir, 'reports'), { recursive: true });
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');

  console.log('\n--- Özet ---');
  console.log(`Taranan yazı: ${report.totals.scannedPosts}`);
  console.log(`Featured eksik: ${report.totals.missingFeaturedPosts}`);
  console.log(`Atanan / dry-run: ${report.totals.assignedPosts}`);
  console.log(`Atlanan: ${report.totals.skippedPosts}`);
  console.log(`Hatalı: ${report.totals.failedPosts}`);
  console.log(`Rapor: ${REPORT_PATH}`);

  if (report.totals.assignedPosts > 0) {
    console.log('\nAtanan yazılar:');
    for (const entry of entries.filter((e) => e.result === 'assigned' || e.result === 'dry-run-assigned')) {
      console.log(`- [${entry.postId}] ${entry.title}`);
      console.log(`  Kategori: ${entry.category} | Servis: ${entry.service}`);
      console.log(`  Sorgu: ${entry.searchQuery}`);
      console.log(`  Kaynak: ${entry.sourceImageUrl}`);
      if (entry.mediaId) console.log(`  Media ID: ${entry.mediaId}`);
    }
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
