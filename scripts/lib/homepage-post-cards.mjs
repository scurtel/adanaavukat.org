import { stripHtml } from './content-utils.mjs';
import { POST_CARD_LABELS } from './post-card-placeholder.mjs';

const BASE = 'https://adanaavukat.org';

export const HOMEPAGE_POST_CARD_DEFS = [
  {
    slug: 'adanada-aile-hukuku-davalarinda-avukat-destegi',
    labelKey: 'aile',
    date: 'Haziran 2026',
    title: 'Adana Aile Hukuku Davalarında Avukat Desteği',
    excerpt:
      'Aile mahkemelerinde görülen davalarda süreç, delil ve hukuki destek konularına genel bakış.',
  },
  {
    slug: 'adanada-avukat-secerken-nelere-dikkat-edilmeli',
    labelKey: 'default',
    date: 'Haziran 2026',
    title: "Adana'da Avukat Seçimi Rehberi",
    excerpt: 'Hukuki süreç öncesinde dikkat edilmesi gereken genel kriterler ve bilgilendirme.',
  },
  {
    slug: 'adanada-bosanma-davasi-sureci',
    labelKey: 'bosanma',
    date: 'Haziran 2026',
    title: "Adana'da Boşanma Davası Süreci",
    excerpt:
      'Anlaşmalı ve çekişmeli boşanma türleri, nafaka, velayet ve mal paylaşımı adımları.',
  },
  {
    slug: 'adanada-miras-kira-is-hukuku-avukat-destegi',
    labelKey: 'miras',
    date: 'Haziran 2026',
    title: 'Adana Miras, Kira, İş Hukuku',
    excerpt: 'Miras, kira ve iş hukuku alanlarındaki uyuşmazlıklara ilişkin genel rehber.',
  },
  {
    slug: 'adanada-nafaka-ve-velayet-uyusmazliklari',
    labelKey: 'aile',
    date: 'Haziran 2026',
    title: 'Adana Nafaka ve Velayet Davaları',
    excerpt: 'Nafaka türleri, velayet ilkesi ve süreç adımlarına dair bilgilendirme.',
  },
];

function formatPostDate(isoDate) {
  if (!isoDate) return 'Haziran 2026';
  try {
    return new Date(isoDate).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
  } catch {
    return 'Haziran 2026';
  }
}

function pickImageUrl(media) {
  if (!media) return null;
  const sizes = media.media_details?.sizes || {};
  return (
    sizes.medium_large?.source_url ||
    sizes.large?.source_url ||
    sizes.medium?.source_url ||
    media.source_url ||
    null
  );
}

function defToCard(def) {
  const label = POST_CARD_LABELS[def.labelKey] || POST_CARD_LABELS.default;
  return {
    slug: def.slug,
    link: `${BASE}/${def.slug}/`,
    imageUrl: null,
    label,
    altText: def.title,
    date: def.date,
    title: def.title,
    excerpt: def.excerpt,
  };
}

export function getDefaultHomepagePostCards() {
  return HOMEPAGE_POST_CARD_DEFS.map(defToCard);
}

export async function fetchHomepagePostCards(wpFetch) {
  const cards = [];

  for (const def of HOMEPAGE_POST_CARD_DEFS) {
    const fallback = defToCard(def);
    const posts = await wpFetch(`/wp-json/wp/v2/posts?slug=${encodeURIComponent(def.slug)}&status=publish`);
    const post = Array.isArray(posts) ? posts[0] : null;

    if (!post) {
      cards.push({ ...fallback, missing: true });
      continue;
    }

    let imageUrl = null;
    let altText = stripHtml(post.title?.rendered || def.title);

    if (post.featured_media) {
      try {
        const media = await wpFetch(`/wp-json/wp/v2/media/${post.featured_media}`);
        imageUrl = pickImageUrl(media);
        if (media.alt_text?.trim()) {
          altText = stripHtml(media.alt_text);
        }
      } catch {
        // keep fallback without image
      }
    }

    const excerptRaw = stripHtml(post.excerpt?.rendered || '');
    cards.push({
      slug: def.slug,
      link: post.link || fallback.link,
      imageUrl,
      label: fallback.label,
      altText,
      date: formatPostDate(post.date),
      title: stripHtml(post.title?.rendered || def.title),
      excerpt: excerptRaw.length > 20 ? excerptRaw.slice(0, 180) : def.excerpt,
      postId: post.id,
      mediaId: post.featured_media || null,
      missing: false,
    });
  }

  return cards;
}
