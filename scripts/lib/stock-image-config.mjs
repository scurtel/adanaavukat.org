import { getWpConfig } from './env.mjs';

const CATEGORY_PRIORITY = [
  { match: ['boşanma', 'bosanma'], label: 'Boşanma Davaları', weight: 0 },
  { match: ['aile hukuku'], label: 'Aile Hukuku', weight: 1 },
  { match: ['nafaka'], label: 'Nafaka', weight: 1 },
  { match: ['miras'], label: 'Miras Hukuku', weight: 2 },
  { match: ['kira'], label: 'Kira Hukuku', weight: 3 },
  { match: ['iş hukuku', 'is hukuku'], label: 'İş Hukuku', weight: 4 },
  { match: ['genel', 'hukuk rehberi', 'rehber'], label: 'Genel Hukuk Rehberi', weight: 5 },
];

const CATEGORY_SEARCH_TERMS = {
  'Boşanma Davaları': 'divorce family mediation professional office',
  'Aile Hukuku': 'family law consultation professional office',
  'Nafaka': 'family support alimony consultation professional',
  'Miras Hukuku': 'estate planning documents professional desk',
  'Kira Hukuku': 'apartment rental keys contract professional',
  'İş Hukuku': 'employment law workplace professional office',
  'Genel Hukuk Rehberi': 'law books justice scales professional office',
};

const TITLE_STOP_WORDS = new Set([
  'adana',
  'avukat',
  'avukati',
  'hukuku',
  'hukuk',
  'davasi',
  'davası',
  'davalar',
  'davaları',
  'sureci',
  'süreci',
  'rehberi',
  'rehber',
  'nelere',
  'dikkat',
  'edilmeli',
  'haklariniz',
  'haklarınız',
  'genel',
  'bilgi',
  'destegi',
  'desteği',
  've',
  'ile',
  'icin',
  'için',
  'bir',
  'the',
  'and',
]);

export function getStockImageEnv() {
  const wp = getWpConfig();
  const pexelsApiKey = process.env.PEXELS_API_KEY || '';
  const pixabayApiKey = process.env.PIXABAY_API_KEY || '';
  const unsplashAccessKey = process.env.UNSPLASH_ACCESS_KEY || '';

  return {
    ...wp,
    pexelsApiKey,
    pixabayApiKey,
    unsplashAccessKey,
  };
}

export function validateStockImageEnv(env) {
  const missing = [];

  if (!env.username || !env.appPassword) {
    missing.push('WP_USERNAME / ADANAAVUKAT_WP_USERNAME');
    missing.push('WP_APP_PASSWORD / ADANAAVUKAT_WP_APP_PASSWORD');
  }

  if (!env.pexelsApiKey && !env.pixabayApiKey && !env.unsplashAccessKey) {
    missing.push('PEXELS_API_KEY');
    missing.push('PIXABAY_API_KEY');
    missing.push('UNSPLASH_ACCESS_KEY');
  }

  return missing;
}

export function resolvePrimaryCategory(categoryNames = []) {
  const normalized = categoryNames.map((n) => String(n || '').toLowerCase());

  for (const entry of CATEGORY_PRIORITY) {
    if (normalized.some((name) => entry.match.some((m) => name.includes(m)))) {
      return entry.label;
    }
  }

  return categoryNames[0] || 'Genel Hukuk Rehberi';
}

export function getCategoryPriorityWeight(categoryLabel) {
  const entry = CATEGORY_PRIORITY.find((c) => c.label === categoryLabel);
  return entry ? entry.weight : 99;
}

export function buildSearchQuery(title, categoryLabel) {
  const base = CATEGORY_SEARCH_TERMS[categoryLabel] || CATEGORY_SEARCH_TERMS['Genel Hukuk Rehberi'];
  const titleTokens = String(title || '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .split(/[^a-z0-9çğıöşü]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length > 3 && !TITLE_STOP_WORDS.has(t))
    .slice(0, 3);

  const titleHint = titleTokens
    .map((token) => {
      if (token.includes('bosanma') || token.includes('boşanma')) return 'divorce';
      if (token.includes('nafaka')) return 'alimony family';
      if (token.includes('velayet')) return 'child custody family';
      if (token.includes('miras')) return 'inheritance estate';
      if (token.includes('kira')) return 'rental apartment';
      if (token.includes('is') || token.includes('iş')) return 'employment workplace';
      if (token.includes('aile')) return 'family';
      return '';
    })
    .filter(Boolean)
    .join(' ');

  return [base, titleHint].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

export function buildSeoFilename(slug, categoryLabel) {
  const categorySlug = String(categoryLabel || 'hukuk')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const postSlug = String(slug || 'yazi')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  return `adana-${categorySlug}-${postSlug}.webp`;
}

export function buildAltText(title, categoryLabel) {
  const cleanTitle = String(title || '').replace(/\s+/g, ' ').trim();
  return `${categoryLabel} konusu: ${cleanTitle} — Adana Avukat`;
}

export function isLikelyCluttered(photo) {
  const text = `${photo.alt || ''} ${photo.tags || ''}`.toLowerCase();
  const badSignals = [
    'watermark',
    'logo',
    'advertisement',
    'banner',
    'poster',
    'flyer',
    'billboard',
    'screenshot',
    'meme',
    'text overlay',
    'infographic',
  ];
  return badSignals.some((signal) => text.includes(signal));
}
