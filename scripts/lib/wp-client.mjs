import { getWpConfig, getAuthHeader } from './env.mjs';

export async function wpFetch(path, options = {}) {
  const { baseUrl, username, appPassword } = getWpConfig();

  if (!username || !appPassword) {
    throw new Error(
      'WordPress credentials missing. Set ADANAAVUKAT_WP_USERNAME and ADANAAVUKAT_WP_APP_PASSWORD in .env'
    );
  }

  const url = path.startsWith('http') ? path : `${baseUrl}${path}`;
  const headers = {
    Accept: 'application/json',
    Authorization: getAuthHeader(username, appPassword),
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const body = await response.text();
    const err = new Error(`WordPress API error: ${response.status} ${response.statusText}`);
    err.status = response.status;
    err.body = body.slice(0, 500);
    throw err;
  }

  return response.json();
}

export async function wpFetchAll(endpoint, params = {}) {
  const { baseUrl } = getWpConfig();
  const perPage = 100;
  let page = 1;
  const all = [];

  while (true) {
    const searchParams = new URLSearchParams({
      per_page: String(perPage),
      page: String(page),
      ...params,
    });
    const url = `${baseUrl}${endpoint}?${searchParams}`;
    const items = await wpFetch(url);

    if (!Array.isArray(items) || items.length === 0) break;
    all.push(...items);
    if (items.length < perPage) break;
    page += 1;
  }

  return all;
}
