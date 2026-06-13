import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { wpFetchAll } from './lib/wp-client.mjs';
import { getWpConfig } from './lib/env.mjs';
import {
  stripHtml,
  extractLinks,
  countWords,
  findEntityMentions,
  findTopicMentions,
  detectAuthorBoxSignals,
} from './lib/content-utils.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(__dirname, '../data/adanaavukat-content.json');

function getSiteHost(baseUrl) {
  try {
    return new URL(baseUrl).hostname.replace(/^www\./, '');
  } catch {
    return 'adanaavukat.org';
  }
}

function mapContentItem(item, type, categoryMap, tagMap, siteHost) {
  const contentHtml = item.content?.rendered || '';
  const excerptHtml = item.excerpt?.rendered || '';
  const plainContent = stripHtml(contentHtml);
  const links = extractLinks(contentHtml, siteHost);

  const categoryIds = item.categories || [];
  const tagIds = item.tags || [];

  return {
    id: item.id,
    title: stripHtml(item.title?.rendered || ''),
    slug: item.slug,
    link: item.link,
    type,
    status: item.status,
    date: item.date,
    modified: item.modified,
    excerpt: stripHtml(excerptHtml),
    contentLength: plainContent.length,
    wordCount: countWords(plainContent),
    categories: categoryIds.map((id) => categoryMap.get(id) || { id, name: null, slug: null }),
    tags: tagIds.map((id) => tagMap.get(id) || { id, name: null, slug: null }),
    internalLinks: links.internal,
    externalLinks: links.external,
    authorId: item.author,
    entityMentions: findEntityMentions(plainContent + ' ' + stripHtml(excerptHtml)),
    topicMentions: findTopicMentions(plainContent + ' ' + stripHtml(excerptHtml)),
    authorBoxSignals: detectAuthorBoxSignals(contentHtml),
  };
}

async function fetchContent() {
  const { baseUrl } = getWpConfig();
  const siteHost = getSiteHost(baseUrl);

  console.log('WordPress içerikleri çekiliyor...');

  const [posts, pages, categories, tags] = await Promise.all([
    wpFetchAll('/wp-json/wp/v2/posts', { status: 'publish,draft,pending,private' }),
    wpFetchAll('/wp-json/wp/v2/pages', { status: 'publish,draft,pending,private' }),
    wpFetchAll('/wp-json/wp/v2/categories'),
    wpFetchAll('/wp-json/wp/v2/tags'),
  ]);

  const categoryMap = new Map(
    categories.map((c) => [c.id, { id: c.id, name: stripHtml(c.name), slug: c.slug }])
  );
  const tagMap = new Map(tags.map((t) => [t.id, { id: t.id, name: stripHtml(t.name), slug: t.slug }]));

  const mappedPosts = posts.map((p) => mapContentItem(p, 'post', categoryMap, tagMap, siteHost));
  const mappedPages = pages.map((p) => mapContentItem(p, 'page', categoryMap, tagMap, siteHost));

  const output = {
    fetchedAt: new Date().toISOString(),
    baseUrl,
    summary: {
      posts: mappedPosts.length,
      pages: mappedPages.length,
      categories: categories.length,
      tags: tags.length,
    },
    categories: categories.map((c) => ({
      id: c.id,
      name: stripHtml(c.name),
      slug: c.slug,
      count: c.count,
      link: c.link,
    })),
    tags: tags.map((t) => ({
      id: t.id,
      name: stripHtml(t.name),
      slug: t.slug,
      count: t.count,
      link: t.link,
    })),
    posts: mappedPosts,
    pages: mappedPages,
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');

  console.log(`Kaydedildi: ${outputPath}`);
  console.log(`Yazı: ${mappedPosts.length}, Sayfa: ${mappedPages.length}`);
  console.log(`Kategori: ${categories.length}, Etiket: ${tags.length}`);
}

fetchContent().catch((err) => {
  console.error('İçerik çekme hatası:', err.message);
  process.exit(1);
});
