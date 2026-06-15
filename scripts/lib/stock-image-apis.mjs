import { isLikelyCluttered } from './stock-image-config.mjs';

const SERVICE_ORDER = ['pexels', 'pixabay', 'unsplash'];

function pickBest(candidates, usedKeys) {
  for (const photo of candidates) {
    const key = `${photo.service}:${photo.id}`;
    if (usedKeys.has(key)) continue;
    if (isLikelyCluttered(photo)) continue;
    if ((photo.width || 0) < 900 || (photo.height || 0) < 500) continue;
    usedKeys.add(key);
    return photo;
  }
  return null;
}

export async function searchPexels(query, apiKey, usedKeys) {
  if (!apiKey) return null;

  const url = `https://api.pexels.com/v1/search?${new URLSearchParams({
    query,
    per_page: '20',
    orientation: 'landscape',
  })}`;

  const res = await fetch(url, { headers: { Authorization: apiKey } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Pexels API ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const candidates = (data.photos || []).map((photo) => ({
    service: 'pexels',
    id: String(photo.id),
    sourceUrl: photo.url,
    downloadUrl: photo.src?.large2x || photo.src?.large || photo.src?.original,
    width: photo.width,
    height: photo.height,
    alt: photo.alt || '',
    tags: '',
    photographer: photo.photographer || '',
  }));

  return pickBest(candidates, usedKeys);
}

export async function searchPixabay(query, apiKey, usedKeys) {
  if (!apiKey) return null;

  const url = `https://pixabay.com/api/?${new URLSearchParams({
    key: apiKey,
    q: query,
    image_type: 'photo',
    orientation: 'horizontal',
    safesearch: 'true',
    per_page: '20',
    min_width: '1200',
  })}`;

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Pixabay API ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const candidates = (data.hits || []).map((hit) => ({
    service: 'pixabay',
    id: String(hit.id),
    sourceUrl: hit.pageURL,
    downloadUrl: hit.largeImageURL || hit.webformatURL,
    width: hit.imageWidth,
    height: hit.imageHeight,
    alt: hit.tags || '',
    tags: hit.tags || '',
    photographer: hit.user || '',
  }));

  return pickBest(candidates, usedKeys);
}

export async function searchUnsplash(query, accessKey, usedKeys) {
  if (!accessKey) return null;

  const url = `https://api.unsplash.com/search/photos?${new URLSearchParams({
    query,
    per_page: '20',
    orientation: 'landscape',
    content_filter: 'high',
  })}`;

  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${accessKey}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Unsplash API ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const candidates = (data.results || []).map((photo) => ({
    service: 'unsplash',
    id: String(photo.id),
    sourceUrl: photo.links?.html || '',
    downloadUrl: `${photo.urls?.raw || photo.urls?.regular}&w=1200&fit=max&q=80`,
    width: photo.width,
    height: photo.height,
    alt: photo.alt_description || photo.description || '',
    tags: '',
    photographer: photo.user?.name || '',
  }));

  return pickBest(candidates, usedKeys);
}

export async function findStockImage({ query, env, usedKeys }) {
  const errors = [];

  for (const service of SERVICE_ORDER) {
    try {
      let photo = null;
      if (service === 'pexels') photo = await searchPexels(query, env.pexelsApiKey, usedKeys);
      if (service === 'pixabay') photo = await searchPixabay(query, env.pixabayApiKey, usedKeys);
      if (service === 'unsplash') photo = await searchUnsplash(query, env.unsplashAccessKey, usedKeys);
      if (photo) return { photo, errors };
    } catch (error) {
      errors.push({ service, message: error.message });
    }
  }

  return { photo: null, errors };
}

export async function downloadImage(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'adanaavukat-featured-image-bot/1.0' },
    redirect: 'follow',
  });
  if (!res.ok) {
    throw new Error(`Görsel indirilemedi (${res.status}): ${url}`);
  }
  const contentType = res.headers.get('content-type') || 'image/jpeg';
  const buffer = Buffer.from(await res.arrayBuffer());
  return { buffer, contentType };
}
