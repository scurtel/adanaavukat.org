const url = 'https://adanaavukat.org/aile-hukuku-rehberi/?nocache=' + Date.now();
const html = await fetch(url).then((r) => r.text());

const checks = {
  css: html.includes('aa-post-card-placeholder'),
  js: html.includes('aa-post-card-placeholder-js'),
  labelColor: html.includes('#f5d77a'),
  postCardPlaceholder: html.includes('post-card-placeholder'),
  gradient: html.includes('#071b35'),
  mapJson: /aa-post-card-placeholder-js[\s\S]*?\{"/.test(html) || /aa-post-card-placeholder-js[\s\S]*?\{\d/.test(html),
};
console.log(JSON.stringify(checks, null, 2));

const mapMatch = html.match(/aa-post-card-placeholder-js[\s\S]*?\)\((\{[\s\S]*?\})\);/);
if (mapMatch) {
  try {
    const map = JSON.parse(mapMatch[1]);
    console.log('placeholder map entries:', Object.keys(map).length);
    console.log('sample labels:', Object.entries(map).slice(0, 3));
  } catch (e) {
    console.log('map parse error', e.message);
  }
}
