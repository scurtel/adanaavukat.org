const url = 'https://adanaavukat.org/aile-hukuku-rehberi/?nocache=' + Date.now();
const html = await fetch(url).then((r) => r.text());
const idx = html.indexOf('ast-blog-featured-section');
if (idx > -1) {
  console.log(html.slice(Math.max(0, idx - 200), idx + 600));
}
const article = html.match(/<article[^>]*id="post-\d+"[\s\S]{0,2500}/);
if (article) console.log('\n--- first article excerpt ---\n', article[0].slice(0, 2000));
