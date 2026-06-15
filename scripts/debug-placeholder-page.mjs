const url = 'https://adanaavukat.org/aile-hukuku-rehberi/?nocache=' + Date.now();
const html = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } }).then((r) => r.text());

const bodyClass = html.match(/<body[^>]*class="([^"]*)"/)?.[1] ?? '';
console.log('body classes:', bodyClass);

const thumbs = [...html.matchAll(/<div class="ast-blog-featured-section post-thumb[^"]*">([\s\S]*?)<\/div>/g)].slice(0, 5);
console.log('thumb samples:', thumbs.map((m) => ({ len: m[1].trim().length, inner: m[1].trim().slice(0, 120) })));

const styleIds = [...html.matchAll(/<style id="([^"]+)"/g)].map((m) => m[1]);
console.log('style ids:', styleIds.filter((id) => id.includes('aa') || id.includes('post')));

const scripts = [...html.matchAll(/<script id="([^"]+)"/g)].map((m) => m[1]);
console.log('script ids:', scripts.filter((id) => id.includes('aa') || id.includes('post')));

const has071 = html.includes('#071b35');
const hasPlaceholder = html.includes('post-card-placeholder');
const hasData = html.includes('aa-post-card-data');
console.log({ has071, hasPlaceholder, hasData });
