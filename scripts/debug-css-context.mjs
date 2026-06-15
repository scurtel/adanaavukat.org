const url = 'https://adanaavukat.org/aile-hukuku-rehberi/?nocache=' + Date.now();
const html = await fetch(url).then((r) => r.text());
console.log(html.slice(16000, 16500));
console.log('\n---\n');
console.log(html.slice(30400, 31200));
