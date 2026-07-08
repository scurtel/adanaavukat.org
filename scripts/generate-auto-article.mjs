#!/usr/bin/env node
/**
 * Otomatik makale üretimi + WordPress yayınlama (adanaavukat.org).
 * GitHub Actions: .github/workflows/auto-article.yml
 *
 * Akış:
 * 1. WP'den yayınlı yazıları çek → konu seç
 * 2. Gemini ile HTML makale üret
 * 3. Rank Math meta + kategori ile publish et
 * 4. İsteğe bağlı featured image ata
 * 5. Rapor yaz
 */
import { mkdirSync, writeFileSync, appendFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { wpFetch, wpFetchAll } from './lib/wp-client.mjs';
import { getWpConfig, getAuthHeader, getGeminiConfig, rootDir } from './lib/env.mjs';
import { callGemini } from './lib/gemini.mjs';
import { stripHtml } from './lib/content-utils.mjs';
import { FORBIDDEN_PHRASES, DISCLAIMER, ENTITY, BASE_URL } from './lib/service-pages-config.mjs';
import {
  TOPIC_POOL,
  CATEGORY_ALIASES,
  HUB_LINKS,
} from './lib/article-topic-pool.mjs';
import { findStockImage, downloadImage } from './lib/stock-image-apis.mjs';
import { optimizeImageBuffer } from './lib/image-optimize.mjs';
import { getStockImageEnv, validateStockImageEnv } from './lib/stock-image-config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORT_DIR = resolve(rootDir, 'reports');
const GENERATED_DIR = resolve(rootDir, 'generated/auto-articles');
const LAST_RUN = resolve(rootDir, '.auto-article-last-run.json');

const PUBLISH =
  process.env.AUTO_ARTICLE_PUBLISH === 'true' ||
  process.env.AUTO_ARTICLE_PUBLISH === '1' ||
  process.argv.includes('--publish');

const ASSIGN_IMAGE =
  process.env.AUTO_ARTICLE_FEATURED_IMAGE !== 'false' &&
  !process.argv.includes('--no-image');

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function countWords(text) {
  return stripHtml(text)
    .split(/\s+/)
    .filter(Boolean).length;
}

function setGithubOutput(key, value) {
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`, 'utf8');
  }
}

function findRisky(text) {
  const lower = text.toLowerCase();
  return FORBIDDEN_PHRASES.filter((p) => lower.includes(p.toLowerCase()));
}

function sanitizeHtml(html) {
  let out = html;
  for (const phrase of FORBIDDEN_PHRASES) {
    out = out.replace(new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
  }
  return out.replace(/\s{2,}/g, ' ').trim();
}

function parseGeminiJson(raw) {
  let text = raw.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) text = fenced[1].trim();
  const obj = text.match(/\{[\s\S]*\}/);
  return JSON.parse(obj ? obj[0] : text);
}

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

async function updateRankMath(postId, meta) {
  try {
    await wpPost(`/wp-json/adanaavukat/v1/rankmath-meta/${postId}`, meta);
    return { ok: true, method: 'adanaavukat/v1' };
  } catch (e) {
    try {
      await wpPost(`/wp-json/wp/v2/posts/${postId}`, { meta });
      return { ok: true, method: 'wp/v2/meta' };
    } catch (e2) {
      return { ok: false, error: e2.message };
    }
  }
}

async function resolveCategoryId(categoryName) {
  const resolved = CATEGORY_ALIASES[categoryName] || categoryName;
  const categories = await wpFetchAll('/wp-json/wp/v2/categories', { per_page: '100' });
  const exact = categories.find((c) => c.name.toLowerCase() === resolved.toLowerCase());
  if (exact) return exact.id;

  const created = await wpPost('/wp-json/wp/v2/categories', {
    name: resolved,
    slug: slugify(resolved),
  });
  return created.id;
}

function pickTopic(existingPosts) {
  const haystack = existingPosts
    .map((p) => `${p.slug} ${stripHtml(p.title?.rendered || '')}`)
    .join('\n')
    .toLowerCase();

  const available = TOPIC_POOL.filter(
    (t) => !t.matchPatterns.some((re) => re.test(haystack))
  );

  if (available.length === 0) {
    throw new Error('Konu havuzu tükendi — yeni konular eklenmeli');
  }

  // Deterministik: haftanın gününe + mevcut yazı sayısına göre seç
  const idx = (existingPosts.length + new Date().getUTCDate()) % available.length;
  return available[idx];
}

function buildPrompt(topicSpec, relatedLinks) {
  const linkList = relatedLinks
    .map((l) => `- ${l.title}: ${l.url}`)
    .join('\n');

  return `Sen Türkiye'de aile ve özel hukuk içerikleri üreten profesyonel bir editörsün.
adanaavukat.org için SEO odaklı, bilgilendirici bir makale yaz.

KONU: ${topicSpec.topic}
KATEGORİ: ${topicSpec.category}
TÜR: ${topicSpec.type}
ENTITY: ${ENTITY.name} (${ENTITY.shortName})
SİTE: ${BASE_URL}

KURALLAR:
1. Dil: Türkçe. Uzunluk: 1000-1400 kelime.
2. Yasak ifadeler (KESİNLİKLE KULLANMA): ${FORBIDDEN_PHRASES.join(', ')}
3. Uydurma Yargıtay/AYM karar numarası veya kesin sonuç vaadi YOK.
4. ${ENTITY.shortName} ismini doğal ve ölçülü geçir (2-4 kez).
5. Adana yerel bağlamını doğal güçlendir.
6. En az 5 FAQ sorusu ekle.
7. Sonunda şu disclaimer'ı ekle: "${DISCLAIMER}"
8. İç linkler olarak yalnızca şu URL'lerden 3-5 tanesini doğal kullan:
${linkList}
9. HTML üret (Markdown değil). H1 tek olsun. H2/H3 kullan.
10. Reklam dili yok; bilgilendirici ve ölçülü.

ÇIKTI: Sadece geçerli JSON (başka metin yok):
{
  "title": "SEO uyumlu başlık (Adana geçsin)",
  "slug": "kisa-turkce-slug",
  "seo_title": "Rank Math title max 60 karakter",
  "meta_description": "150-160 karakter meta description",
  "focus_keyword": "ana anahtar kelime",
  "excerpt": "2-3 cümle özet",
  "content_html": "<h1>...</h1><p>...</p>..."
}`;
}

async function generateArticle(topicSpec, relatedLinks) {
  const raw = await callGemini(buildPrompt(topicSpec, relatedLinks), {
    json: true,
    temperature: 0.45,
    maxOutputTokens: 16384,
    grounding: false,
  });
  const parsed = parseGeminiJson(raw);

  if (!parsed.title || !parsed.content_html) {
    throw new Error('Gemini çıktısı eksik (title/content_html)');
  }

  const slug = slugify(parsed.slug || parsed.title);
  let html = sanitizeHtml(parsed.content_html);

  // Tek H1 — temada zaten entry-title olur; içerikteki h1 → h2
  html = html.replace(/<h1(\s[^>]*)?>/gi, '<h2$1>').replace(/<\/h1>/gi, '</h2>');

  if (!html.includes(DISCLAIMER.slice(0, 40))) {
    html += `\n<p><em>${DISCLAIMER}</em></p>`;
  }

  const risks = findRisky(`${parsed.title} ${html} ${parsed.meta_description || ''}`);
  if (risks.length) {
    html = sanitizeHtml(html);
  }

  const words = countWords(html);
  if (words < 700) {
    throw new Error(`Makale çok kısa: ${words} kelime`);
  }

  return {
    title: parsed.title.trim(),
    slug,
    seo_title: (parsed.seo_title || parsed.title).trim().slice(0, 65),
    meta_description: (parsed.meta_description || parsed.excerpt || '').trim().slice(0, 160),
    focus_keyword: (parsed.focus_keyword || topicSpec.topic).trim().slice(0, 80),
    excerpt: (parsed.excerpt || '').trim(),
    content_html: html,
    word_count: words,
    category: topicSpec.category,
    topic: topicSpec.topic,
  };
}

async function assignFeaturedImage(postId, title, category) {
  try {
    const env = getStockImageEnv();
    const missing = validateStockImageEnv(env);
    if (missing.length) {
      return { skipped: true, reason: `missing env: ${missing.join(', ')}` };
    }

    const query = `${category} law turkey court documents`;
    const { photo } = await findStockImage({
      query,
      env,
      usedKeys: new Set(),
    });
    if (!photo?.downloadUrl) {
      return { skipped: true, reason: 'stock not found' };
    }

    const downloaded = await downloadImage(photo.downloadUrl);
    const optimized = await optimizeImageBuffer(downloaded.buffer);
    const filename = `${slugify(title).slice(0, 40)}-${Date.now()}.webp`;
    const altText = `${title} — Adana Avukat`;

    const { baseUrl, username, appPassword } = getWpConfig();
    const formData = new FormData();
    formData.append('file', new Blob([optimized.buffer], { type: 'image/webp' }), filename);
    formData.append('alt_text', altText);
    formData.append('title', altText.slice(0, 80));

    const uploadRes = await fetch(`${baseUrl}/wp-json/wp/v2/media`, {
      method: 'POST',
      headers: {
        Authorization: getAuthHeader(username, appPassword),
        Accept: 'application/json',
      },
      body: formData,
    });
    const uploadText = await uploadRes.text();
    if (!uploadRes.ok) {
      return { skipped: true, reason: `upload ${uploadRes.status}` };
    }
    const media = JSON.parse(uploadText);

    await wpPost(`/wp-json/wp/v2/posts/${postId}`, { featured_media: media.id });
    return { ok: true, mediaId: media.id, source: photo.service };
  } catch (e) {
    return { skipped: true, reason: e.message };
  }
}

async function publishArticle(article) {
  const categoryId = await resolveCategoryId(article.category);
  const status = PUBLISH ? 'publish' : 'draft';

  // Slug çakışması kontrolü
  const existing = await wpFetch(
    `/wp-json/wp/v2/posts?slug=${encodeURIComponent(article.slug)}&status=publish,draft,pending`
  );
  if (Array.isArray(existing) && existing.length) {
    article.slug = `${article.slug}-${Date.now().toString().slice(-4)}`;
  }

  const created = await wpPost('/wp-json/wp/v2/posts', {
    title: article.title,
    slug: article.slug,
    content: article.content_html,
    excerpt: article.excerpt || article.meta_description,
    status,
    categories: [categoryId],
  });

  const rankMath = await updateRankMath(created.id, {
    rank_math_title: article.seo_title,
    rank_math_description: article.meta_description,
    rank_math_focus_keyword: article.focus_keyword,
    rank_math_robots: status === 'publish' ? ['index', 'follow'] : ['noindex', 'nofollow'],
  });

  let featured = { skipped: true, reason: 'disabled' };
  if (ASSIGN_IMAGE && status === 'publish') {
    featured = await assignFeaturedImage(created.id, article.title, article.category);
  }

  try {
    await wpPost('/wp-json/adanaavukat/v1/rankmath-global', {
      purge_litespeed: true,
      flush_sitemap: true,
    });
  } catch {
    // ignore
  }

  return { created, rankMath, featured, status };
}

async function main() {
  console.log('=== adanaavukat.org otomatik makale ===');
  console.log(`Publish: ${PUBLISH} | Featured image: ${ASSIGN_IMAGE}`);
  console.log(`Gemini: ${getGeminiConfig().model}`);

  mkdirSync(GENERATED_DIR, { recursive: true });
  mkdirSync(REPORT_DIR, { recursive: true });

  console.log('WordPress yazıları taranıyor...');
  const posts = await wpFetchAll('/wp-json/wp/v2/posts', {
    status: 'publish',
    per_page: '100',
  });
  console.log(`Yayınlı yazı: ${posts.length}`);

  const topicSpec = pickTopic(posts);
  console.log(`Seçilen konu: ${topicSpec.topic}`);

  // İlgili hub linkleri: kategorisine yakın + genel
  const relatedLinks = HUB_LINKS.slice(0, 8);

  console.log('Gemini ile içerik üretiliyor...');
  const article = await generateArticle(topicSpec, relatedLinks);
  console.log(`Üretildi: ${article.title} (${article.word_count} kelime)`);

  const localPath = resolve(GENERATED_DIR, `${article.slug}.json`);
  writeFileSync(localPath, JSON.stringify(article, null, 2), 'utf8');

  console.log('WordPress’e gönderiliyor...');
  const result = await publishArticle(article);

  const report = {
    generatedAt: new Date().toISOString(),
    topic: topicSpec.topic,
    slug: article.slug,
    title: article.title,
    wordCount: article.word_count,
    status: result.status,
    postId: result.created.id,
    link: result.created.link,
    rankMath: result.rankMath,
    featured: result.featured,
    localPath,
  };

  writeFileSync(LAST_RUN, JSON.stringify(report, null, 2), 'utf8');
  const reportPath = resolve(
    REPORT_DIR,
    `auto-article-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`
  );
  writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  setGithubOutput('slug', article.slug);
  setGithubOutput('post_id', String(result.created.id));
  setGithubOutput('status', result.status);
  setGithubOutput('link', result.created.link || '');

  console.log('');
  console.log('=== Tamamlandı ===');
  console.log(`Slug: ${article.slug}`);
  console.log(`ID: ${result.created.id} (${result.status})`);
  console.log(`URL: ${result.created.link}`);
  console.log(`Rapor: ${reportPath}`);
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((err) => {
    console.error('HATA:', err.message || err);
    process.exit(1);
  });
}
