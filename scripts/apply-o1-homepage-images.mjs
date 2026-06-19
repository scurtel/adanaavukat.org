/**
 * O1 — Ana sayfa yazı kartlarına featured image URL'lerini bağlar.
 */
import { mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { wpFetch } from './lib/wp-client.mjs';
import { getWpConfig, getAuthHeader } from './lib/env.mjs';
import { buildHomepageContent } from './lib/homepage-content.mjs';
import { fetchHomepagePostCards } from './lib/homepage-post-cards.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const HOMEPAGE_ID = 7;
const BASE = 'https://adanaavukat.org';
const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const REPORT_PATH = resolve(rootDir, `reports/o1-homepage-images-report-${ts}.json`);

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

function backupHomepage(page) {
  const dir = resolve(rootDir, 'data/backups');
  mkdirSync(dir, { recursive: true });
  const path = resolve(dir, `homepage-7-pre-o1-images-${ts}.json`);
  writeFileSync(path, JSON.stringify(page, null, 2), 'utf8');
  return path;
}

async function verifyLive() {
  const html = await fetch(`${BASE}/?v=${Date.now()}`).then((r) => r.text());
  const section = html.match(/Hukuk Rehberi — Son Yazılar[\s\S]*?<\/section>/i)?.[0] || html;
  const imgs = [...section.matchAll(/<img[^>]+class="[^"]*aa-post-thumb__img[^"]*"[^>]*>/gi)].map((m) => m[0]);
  const placeholders = (section.match(/post-card-placeholder/gi) || []).length;
  return {
    imageCount: imgs.length,
    placeholderCount: placeholders,
    images: imgs.map((tag) => ({
      src: tag.match(/src="([^"]+)"/i)?.[1] || '',
      alt: tag.match(/alt="([^"]*)"/i)?.[1] || '',
      lazy: /loading="lazy"/i.test(tag),
    })),
  };
}

async function main() {
  console.log('O1: Ana sayfa yazı kartı görselleri uygulanıyor...\n');

  const page = await wpFetch(`/wp-json/wp/v2/pages/${HOMEPAGE_ID}?context=edit`);
  const backupPath = backupHomepage(page);
  console.log(`Yedek: ${backupPath}`);

  const postCards = await fetchHomepagePostCards(wpFetch);
  const withImages = postCards.filter((c) => c.imageUrl);
  const withoutImages = postCards.filter((c) => !c.imageUrl);

  console.log(`Kart: ${postCards.length}, görseli olan: ${withImages.length}, eksik: ${withoutImages.length}`);
  for (const card of postCards) {
    console.log(
      `  ${card.slug}: ${card.imageUrl ? '✓' : '✗'}${card.mediaId ? ` (media #${card.mediaId})` : ''}`
    );
  }

  const content = buildHomepageContent({ postCards });
  const updated = await wpPost(`/wp-json/wp/v2/pages/${HOMEPAGE_ID}`, {
    content,
    status: 'publish',
  });

  try {
    await wpPost('/wp-json/adanaavukat/v1/rankmath-global', { purge_litespeed: true });
  } catch {
    // ignore
  }

  await new Promise((r) => setTimeout(r, 2500));
  const verification = await verifyLive();

  const report = {
    generatedAt: new Date().toISOString(),
    backupPath,
    homepageId: HOMEPAGE_ID,
    modified: updated.modified,
    postCards,
    verification,
  };

  mkdirSync(resolve(rootDir, 'reports'), { recursive: true });
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');

  console.log(`\nAna sayfa güncellendi: ${updated.modified}`);
  console.log(`Canlı kart görseli: ${verification.imageCount}, placeholder: ${verification.placeholderCount}`);
  console.log(`Rapor: ${REPORT_PATH}`);
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}

export { fetchHomepagePostCards };
