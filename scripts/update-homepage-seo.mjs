import { wpFetch } from './lib/wp-client.mjs';
import { getWpConfig, getAuthHeader } from './lib/env.mjs';
import { HOMEPAGE_META } from './lib/homepage-content.mjs';

const p = await wpFetch('/wp-json/wp/v2/pages/7?context=edit');
console.log('rank_math_title in meta:', p.meta?.rank_math_title);
console.log('rank_math_description in meta:', p.meta?.rank_math_description);

// Try Rank Math updateSettings
const { baseUrl, username, appPassword } = getWpConfig();
const auth = getAuthHeader(username, appPassword);

const settingsPayload = {
  settings: {
    homepage_title: HOMEPAGE_META.title,
    homepage_description: HOMEPAGE_META.excerpt,
  },
};

const r = await fetch(`${baseUrl}/wp-json/rankmath/v1/updateSettings`, {
  method: 'POST',
  headers: {
    Authorization: auth,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  body: JSON.stringify(settingsPayload),
});
console.log('updateSettings', r.status, (await r.text()).slice(0, 300));

// Menus
const menus = await wpFetch('/wp-json/wp/v2/menus');
console.log('menus', menus);
