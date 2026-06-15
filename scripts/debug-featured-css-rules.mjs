const url = 'https://adanaavukat.org/aile-hukuku-rehberi/?nocache=' + Date.now();
const html = await fetch(url).then((r) => r.text());
const re = /[^{}]{0,80}ast-blog-featured-section[^{}]{0,200}/gi;
let m; let n=0;
while ((m = re.exec(html)) && n < 20) { console.log(m[0].replace(/\s+/g,' ').slice(0,200)); n++; }
