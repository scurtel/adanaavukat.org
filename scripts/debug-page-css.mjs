const url = 'https://adanaavukat.org/aile-hukuku-rehberi/?nocache=' + Date.now();
const html = await fetch(url).then((r) => r.text());
const needles = ['#071b35', '#102f55', 'post-thumb', 'ast-no-thumb', 'ast-blog-featured-section', 'placeholder', '071b35', 'lacivert'];
for (const n of needles) {
  const i = html.indexOf(n);
  console.log(n, i > -1 ? `found at ${i}` : 'NOT FOUND');
}
// extract custom css blocks mentioning post-thumb or featured
const styles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)];
for (const [i, m] of styles.entries()) {
  if (/post-thumb|featured-section|071b35|no-thumb/i.test(m[1])) {
    console.log(`\n--- style block ${i} match ---\n`, m[1].slice(0, 800));
  }
}
