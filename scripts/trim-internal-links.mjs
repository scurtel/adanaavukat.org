import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { wpFetch } from './lib/wp-client.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

function countLinks(html) {
  const links = [];
  const re = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    links.push({ href: m[1], anchor: m[2].replace(/<[^>]+>/g, '').trim() });
  }
  return links;
}

const updates = {
  273: readFileSync(resolve(__dirname, '../data/post-273-optimized.html'), 'utf8'),
  274: readFileSync(resolve(__dirname, '../data/post-274-optimized.html'), 'utf8'),
};

const report = { posts: [] };

for (const [id, content] of Object.entries(updates)) {
  const before = readFileSync(resolve(__dirname, `../data/post-${id}-content.html`), 'utf8');
  const beforeLinks = countLinks(before);
  const afterLinks = countLinks(content);

  const updated = await wpFetch(`/wp-json/wp/v2/posts/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, status: 'publish' }),
  });

  if (updated.status !== 'publish') throw new Error(`ID ${id} publish değil: ${updated.status}`);

  report.posts.push({
    id: Number(id),
    status: updated.status,
    link: updated.link,
    beforeCount: beforeLinks.length,
    afterCount: afterLinks.length,
    beforeUrls: [...new Set(beforeLinks.map((l) => l.href))],
    afterUrls: [...new Set(afterLinks.map((l) => l.href))],
    afterLinks,
  });

  console.log(`ID ${id}: ${beforeLinks.length} -> ${afterLinks.length} link | ${updated.status}`);
}

writeFileSync(resolve(__dirname, '../reports/internal-link-trim-report.json'), JSON.stringify(report, null, 2));
console.log('Rapor: reports/internal-link-trim-report.json');
