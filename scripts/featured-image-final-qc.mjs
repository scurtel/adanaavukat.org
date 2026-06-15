import { mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { wpFetch, wpFetchAll } from './lib/wp-client.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const REPORT_PATH = resolve(rootDir, 'reports/featured-image-final-qc.md');
const BLOG_PAGE_URL = 'https://adanaavukat.org/aile-hukuku-rehberi/';

const OFF_TOPIC_PATTERNS = [
  {
    id: 'eksi-uludag',
    label: 'Ekşi / Uludağ Sözlük',
    test: (post) =>
      /ekşi|eksi|uludağ|uludag/i.test(post.title) ||
      /eksi-sozluk|uludag-sozluk/i.test(post.slug),
  },
  {
    id: 'trump-science',
    label: 'Trump / bilim insanı',
    test: (post) =>
      /trump/i.test(post.title) ||
      /bilim\s*insan/i.test(post.title) ||
      /trumptan-kritik/i.test(post.slug),
  },
  {
    id: 'ai-penalty',
    label: 'Yapay zeka ceza',
    test: (post) =>
      /yapay\s*zeka/i.test(post.title) ||
      /yapay-zeka/i.test(post.slug),
  },
];

function stripHtml(value = '') {
  return String(value)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(Number(num)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<[^>]+>/g, '')
    .trim();
}

function unique(values) {
  return [...new Set(values)];
}

async function fetchMediaMap(mediaIds) {
  const map = new Map();
  const ids = unique(mediaIds.filter(Boolean));

  for (const id of ids) {
    try {
      const media = await wpFetch(`/wp-json/wp/v2/media/${id}`);
      map.set(id, {
        id: media.id,
        sourceUrl: media.source_url,
        altText: stripHtml(media.alt_text || ''),
        title: stripHtml(media.title?.rendered || ''),
        mimeType: media.mime_type || '',
        status: media.status || '',
        link: media.link || '',
        valid: true,
      });
    } catch (error) {
      map.set(id, {
        id,
        valid: false,
        error: error.status === 404 ? 'Medya kaydı bulunamadı (404)' : error.message,
      });
    }
  }

  return map;
}

function analyzeDuplicateMedia(posts) {
  const byMedia = new Map();

  for (const post of posts) {
    if (!post.featuredMedia) continue;
    if (!byMedia.has(post.featuredMedia)) byMedia.set(post.featuredMedia, []);
    byMedia.get(post.featuredMedia).push(post);
  }

  return [...byMedia.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([mediaId, list]) => ({
      mediaId,
      count: list.length,
      posts: list.map((p) => ({ id: p.id, title: p.title, slug: p.slug })),
    }));
}

function findOffTopicInAileHukuku(posts) {
  return posts
    .filter((post) => post.categorySlugs.includes('aile-hukuku') || post.categoryNames.includes('Aile Hukuku'))
    .flatMap((post) => {
      const matches = OFF_TOPIC_PATTERNS.filter((pattern) => pattern.test(post));
      if (!matches.length) return [];
      return matches.map((pattern) => ({
        postId: post.id,
        title: post.title,
        slug: post.slug,
        link: post.link,
        issue: pattern.label,
        categories: post.categoryNames,
      }));
    });
}

async function analyzeLiveBlogCards(posts) {
  const url = `${BLOG_PAGE_URL}?qc=${Date.now()}`;
  const html = await fetch(url, {
    headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
  }).then((r) => r.text());

  const placeholderSignals = {
    hasPostCardPlaceholderClass: /post-card-placeholder/i.test(html),
    hasPlaceholderStyleId: /aa-post-card-placeholder/i.test(html),
    hasPlaceholderGradient: /#071b35/i.test(html),
    hasEmptyThumbOnly: false,
    placeholderImageUrls: [],
    featuredImageUrls: [],
    cardsChecked: 0,
    cardsWithImg: 0,
    cardsWithoutImg: 0,
  };

  const articleBlocks = [...html.matchAll(/<article[^>]*id="post-(\d+)"[\s\S]*?<\/article>/gi)];
  placeholderSignals.cardsChecked = articleBlocks.length;
  placeholderSignals._articlePostIds = articleBlocks.map((b) => Number(b[1]));

  for (const block of articleBlocks) {
    const postId = Number(block[1]);
    const articleHtml = block[0];
    const post = posts.find((p) => p.id === postId);

    const imgMatch = articleHtml.match(/<img[^>]+src="([^"]+)"[^>]*>/i);
    const hasPlaceholderClass = /post-card-placeholder/i.test(articleHtml);
    const thumbEmpty = /<div class="ast-blog-featured-section post-thumb[^"]*">\s*<\/div>/i.test(articleHtml);

    if (imgMatch) {
      placeholderSignals.cardsWithImg += 1;
      placeholderSignals.featuredImageUrls.push({
        postId,
        title: post?.title || null,
        src: imgMatch[1],
      });
    } else {
      placeholderSignals.cardsWithoutImg += 1;
    }

    if (hasPlaceholderClass || (thumbEmpty && !imgMatch)) {
      placeholderSignals.hasEmptyThumbOnly = true;
    }

    if (
      imgMatch &&
      (
        /placeholder/i.test(imgMatch[1]) ||
        /data:image/i.test(imgMatch[1]) ||
        /aa-post-thumb__ph/i.test(articleHtml)
      )
    ) {
      placeholderSignals.placeholderImageUrls.push({
        postId,
        title: post?.title || null,
        src: imgMatch[1],
      });
    }
  }

  return placeholderSignals;
}

function buildMarkdownReport(data) {
  const lines = [];
  lines.push('# Featured Image Final QC Raporu');
  lines.push('');
  lines.push(`**Oluşturulma:** ${data.generatedAt}`);
  lines.push(`**Kaynak:** WordPress REST API + canlı HTML (${BLOG_PAGE_URL})`);
  lines.push('');
  lines.push('## Özet');
  lines.push('');
  lines.push('| Kontrol | Sonuç |');
  lines.push('|---|---|');
  lines.push(`| Toplam publish yazı | ${data.summary.totalPosts} |`);
  lines.push(`| Featured image eksik | ${data.summary.missingFeatured} |`);
  lines.push(`| Geçersiz medya bağlantısı | ${data.summary.invalidMediaLinks} |`);
  lines.push(`| Boş alt text (featured medya) | ${data.summary.emptyAltText} |`);
  lines.push(`| Tekrar kullanılan media ID | ${data.summary.duplicateMediaIds} |`);
  lines.push(`| Canlı sayfada placeholder kart | ${data.summary.livePlaceholderCards ? 'Evet' : 'Hayır'} |`);
  lines.push(`| Kategori uyumsuzluğu (Aile Hukuku) | ${data.summary.offTopicCount} |`);
  lines.push('');

  lines.push('## 1. Featured image eksik yazılar');
  lines.push('');
  if (!data.missingFeaturedPosts.length) {
    lines.push('Eksik featured image yok.');
  } else {
    for (const post of data.missingFeaturedPosts) {
      lines.push(`- [${post.id}] ${post.title} (\`${post.slug}\`)`);
    }
  }
  lines.push('');

  lines.push('## 2. Geçersiz medya bağlantıları');
  lines.push('');
  if (!data.invalidMediaLinks.length) {
    lines.push('Tüm featured_media kayıtları geçerli.');
  } else {
    for (const item of data.invalidMediaLinks) {
      lines.push(`- Post [${item.postId}] ${item.title} → media #${item.mediaId}: ${item.error}`);
    }
  }
  lines.push('');

  lines.push('## 3. Boş alt text');
  lines.push('');
  if (!data.emptyAltText.length) {
    lines.push('Featured medya alt text alanları dolu.');
  } else {
    for (const item of data.emptyAltText) {
      lines.push(`- Media #${item.mediaId} (post [${item.postId}] ${item.title})`);
    }
  }
  lines.push('');

  lines.push('## 4. Tekrar kullanılan media ID');
  lines.push('');
  if (!data.duplicateMedia.length) {
    lines.push('Aynı media ID birden fazla yazıda kullanılmıyor.');
  } else {
    for (const dup of data.duplicateMedia) {
      lines.push(`- Media #${dup.mediaId} → ${dup.count} yazı`);
      for (const post of dup.posts) {
        lines.push(`  - [${post.id}] ${post.title}`);
      }
    }
  }
  lines.push('');

  lines.push('## 5. Aile Hukuku kategorisinde hukuk dışı görünen yazılar');
  lines.push('');
  if (!data.offTopicPosts.length) {
    lines.push('Uyumsuz yazı tespit edilmedi.');
  } else {
    for (const item of data.offTopicPosts) {
      lines.push(`- [${item.postId}] **${item.issue}** — ${item.title}`);
      lines.push(`  - Slug: \`${item.slug}\``);
      lines.push(`  - Kategoriler: ${item.categories.join(', ')}`);
    }
  }
  lines.push('');

  lines.push('## 6. Canlı blog kartı görsel kontrolü');
  lines.push('');
  lines.push(`- Kontrol edilen kart: ${data.live.cardsChecked}`);
  lines.push(`- Görseli olan kart: ${data.live.cardsWithImg}`);
  lines.push(`- Görseli olmayan kart: ${data.live.cardsWithoutImg}`);
  lines.push(`- \`post-card-placeholder\` sınıfı: ${data.live.hasPostCardPlaceholderClass ? 'var' : 'yok'}`);
  lines.push(`- Placeholder gradient/CSS: ${data.live.hasPlaceholderStyleId || data.live.hasPlaceholderGradient ? 'var' : 'yok'}`);
  lines.push(`- Boş thumb alanı: ${data.live.hasEmptyThumbOnly ? 'var' : 'yok'}`);
  lines.push('');

  if (data.live.placeholderImageUrls.length) {
    lines.push('### Placeholder benzeri görsel URL’leri');
    for (const item of data.live.placeholderImageUrls) {
      lines.push(`- [${item.postId}] ${item.title}`);
      lines.push(`  - ${item.src}`);
    }
  } else {
    lines.push('Placeholder URL’si kalan kart tespit edilmedi.');
  }
  lines.push('');

  if (data.live.cardsWithoutImg > 0) {
    lines.push('### Görseli olmayan kartlar (canlı HTML)');
    const withImgIds = new Set(data.live.featuredImageUrls.map((x) => x.postId));
    for (const post of data.posts) {
      if (!withImgIds.has(post.id) && data.live.cardsChecked > 0) {
        // only list posts that are on the fetched page without an image
      }
    }
    const articleIds = [...new Set(data.live.featuredImageUrls.map((x) => x.postId))];
    const noImgOnPage = [];
    const articleBlocks = data.live._articlePostIds || [];
    for (const postId of articleBlocks) {
      if (!withImgIds.has(postId)) {
        const post = data.posts.find((p) => p.id === postId);
        if (post) noImgOnPage.push(post);
      }
    }
    if (noImgOnPage.length) {
      for (const post of noImgOnPage) {
        lines.push(`- [${post.id}] ${post.title}`);
      }
    } else {
      lines.push(`- ${data.live.cardsWithoutImg} kartta <img> etiketi bulunamadı (detay için canlı HTML incelendi).`);
    }
  }

  lines.push('## 7. Featured media envanteri (publish yazılar)');
  lines.push('');
  lines.push('| Post ID | Başlık | Media ID | Alt text | MIME |');
  lines.push('|---:|---|---:|---|---|');
  for (const post of data.postsWithFeatured) {
    const alt = post.mediaAltText ? '✅' : '❌ boş';
    lines.push(`| ${post.id} | ${post.title.replace(/\|/g, '/')} | ${post.featuredMedia} | ${alt} | ${post.mimeType || '-'} |`);
  }
  lines.push('');

  return lines.join('\n');
}

async function main() {
  const categories = await wpFetchAll('/wp-json/wp/v2/categories');
  const categoryMap = new Map(
    categories.map((c) => [c.id, { name: stripHtml(c.name), slug: c.slug }])
  );

  const rawPosts = await wpFetchAll('/wp-json/wp/v2/posts', { status: 'publish' });
  const posts = rawPosts.map((post) => {
    const categoryIds = post.categories || [];
    const categoryNames = categoryIds.map((id) => categoryMap.get(id)?.name).filter(Boolean);
    const categorySlugs = categoryIds.map((id) => categoryMap.get(id)?.slug).filter(Boolean);

    return {
      id: post.id,
      title: stripHtml(post.title?.rendered || ''),
      slug: post.slug,
      link: post.link,
      featuredMedia: post.featured_media || 0,
      categoryNames,
      categorySlugs,
    };
  });

  const missingFeaturedPosts = posts.filter((p) => !p.featuredMedia);
  const featuredMediaIds = posts.map((p) => p.featuredMedia).filter(Boolean);
  const mediaMap = await fetchMediaMap(featuredMediaIds);

  const invalidMediaLinks = posts
    .filter((p) => p.featuredMedia)
    .filter((p) => {
      const media = mediaMap.get(p.featuredMedia);
      return !media || !media.valid;
    })
    .map((p) => ({
      postId: p.id,
      title: p.title,
      mediaId: p.featuredMedia,
      error: mediaMap.get(p.featuredMedia)?.error || 'Geçersiz medya',
    }));

  const emptyAltText = posts
    .filter((p) => p.featuredMedia)
    .filter((p) => {
      const media = mediaMap.get(p.featuredMedia);
      return media?.valid && !media.altText;
    })
    .map((p) => ({
      postId: p.id,
      title: p.title,
      mediaId: p.featuredMedia,
    }));

  const duplicateMedia = analyzeDuplicateMedia(posts);
  const offTopicPosts = findOffTopicInAileHukuku(posts);
  const live = await analyzeLiveBlogCards(posts);

  const postsWithFeatured = posts
    .filter((p) => p.featuredMedia)
    .map((p) => {
      const media = mediaMap.get(p.featuredMedia) || {};
      return {
        ...p,
        mediaAltText: media.altText || '',
        mimeType: media.mimeType || '',
        sourceUrl: media.sourceUrl || '',
      };
    })
    .sort((a, b) => a.id - b.id);

  const summary = {
    totalPosts: posts.length,
    missingFeatured: missingFeaturedPosts.length,
    invalidMediaLinks: invalidMediaLinks.length,
    emptyAltText: emptyAltText.length,
    duplicateMediaIds: duplicateMedia.length,
    livePlaceholderCards:
      live.placeholderImageUrls.length > 0 ||
      live.cardsWithoutImg > 0 ||
      live.hasPostCardPlaceholderClass,
    offTopicCount: unique(offTopicPosts.map((p) => p.postId)).length,
  };

  const reportData = {
    generatedAt: new Date().toISOString(),
    summary,
    posts,
    missingFeaturedPosts,
    invalidMediaLinks,
    emptyAltText,
    duplicateMedia,
    offTopicPosts,
    live,
    postsWithFeatured,
  };

  mkdirSync(resolve(rootDir, 'reports'), { recursive: true });
  writeFileSync(REPORT_PATH, buildMarkdownReport(reportData), 'utf8');

  console.log('\n=== Featured Image Final QC ===');
  console.log(`Toplam yazı: ${summary.totalPosts}`);
  console.log(`Featured image eksik kalan: ${summary.missingFeatured}`);
  console.log(`Geçersiz medya bağlantısı: ${summary.invalidMediaLinks}`);
  console.log(`Boş alt text: ${summary.emptyAltText}`);
  console.log(`Tekrar kullanılan media ID: ${summary.duplicateMediaIds}`);
  console.log(`Placeholder kalan kart var mı: ${summary.livePlaceholderCards ? 'Evet' : 'Hayır'}`);
  console.log(`Kategori uyumsuzluğu olan yazılar: ${summary.offTopicCount}`);
  console.log(`Rapor: ${REPORT_PATH}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
