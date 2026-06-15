import { wpFetch } from './lib/wp-client.mjs';

const snippets = await wpFetch('/wp-json/code-snippets/v1/snippets');
for (const s of snippets) {
  if (s.name.toLowerCase().includes('post') || s.name.toLowerCase().includes('placeholder') || s.name.toLowerCase().includes('card')) {
    console.log(s.id, s.active, s.scope, s.name);
  }
}
console.log('total snippets', snippets.length);
