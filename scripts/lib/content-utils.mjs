export function stripHtml(html = '') {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractLinks(html = '', siteHost = 'adanaavukat.org') {
  const internal = [];
  const external = [];
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1].trim();
    const anchor = stripHtml(match[2]).slice(0, 200);
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      continue;
    }

    const entry = { href, anchor: anchor || null };

    try {
      const url = new URL(href, `https://${siteHost}`);
      if (url.hostname.includes(siteHost)) {
        internal.push({ ...entry, path: url.pathname });
      } else if (href.startsWith('http')) {
        external.push(entry);
      } else if (href.startsWith('/')) {
        internal.push({ ...entry, path: href });
      }
    } catch {
      if (href.startsWith('/')) {
        internal.push({ ...entry, path: href });
      }
    }
  }

  return { internal, external };
}

export function countWords(text = '') {
  const cleaned = text.trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).filter(Boolean).length;
}

export const ENTITY_NAME = 'Av. Ceren Sümer Cilli';
export const ENTITY_NAME_VARIANTS = [
  'Av. Ceren Sümer Cilli',
  'Ceren Sümer Cilli',
  'Ceren Sumer Cilli',
  'Avukat Ceren Sümer Cilli',
  'Av. Ceren S. Cilli',
];

export const TOPIC_KEYWORDS = {
  adana: ['adana', 'adana adliyesi', 'adana aile mahkemesi', 'adana aile mahkemeleri'],
  aile_hukuku: ['aile hukuku', 'aile mahkemesi', 'özel hukuk'],
  bosanma: ['boşanma', 'bosanma', 'evlilik birliği', 'anlaşmalı boşanma', 'çekişmeli boşanma'],
  nafaka: ['nafaka', 'iştirak nafakası', 'yoksulluk nafakası', 'tedbir nafakası'],
  velayet: ['velayet', 'kişisel ilişki', 'çocuğun üstün yararı'],
  miras: ['miras', 'veraset', 'tenkis', 'saklı pay'],
  kira: ['kira', 'kira hukuku', 'tahliye', 'kira bedeli'],
  is_hukuku: ['iş hukuku', 'işçi', 'işveren', 'iş mahkemesi', 'kıdem tazminatı'],
  ceza_hukuku: ['ceza hukuku', 'ceza davası', 'savunma'],
  gayrimenkul: ['gayrimenkul', 'tapu', 'kat mülkiyeti'],
};

export function findEntityMentions(text = '') {
  const lower = text.toLowerCase();
  const found = [];
  for (const variant of ENTITY_NAME_VARIANTS) {
    if (lower.includes(variant.toLowerCase())) {
      found.push(variant);
    }
  }
  return [...new Set(found)];
}

export function findTopicMentions(text = '') {
  const lower = text.toLowerCase();
  const results = {};
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    const matched = keywords.filter((kw) => lower.includes(kw.toLowerCase()));
    if (matched.length > 0) {
      results[topic] = matched;
    }
  }
  return results;
}

export function detectAuthorBoxSignals(html = '') {
  const lower = html.toLowerCase();
  const signals = [];
  if (/author-box|yazar\s*kutusu|uzman\s*kutusu|reviewer|yazar:/i.test(html)) {
    signals.push('author_box_markup');
  }
  if (lower.includes('hazırlanmıştır') && (lower.includes('av.') || lower.includes('avukat'))) {
    signals.push('disclaimer_author_text');
  }
  if (lower.includes('ceren') && lower.includes('cilli')) {
    signals.push('entity_name_in_content');
  }
  if (/<script[^>]+type=["']application\/ld\+json["']/i.test(html)) {
    signals.push('json_ld_present');
  }
  return signals;
}
