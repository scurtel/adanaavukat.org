/**
 * Aile hukuku içerik envanteri (salt okunur) — otorite çalışması öncesi.
 */
import { mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { wpFetch, wpFetchAll } from './lib/wp-client.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

function strip(html = '') {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function countInternalLinks(html = '') {
  const matches = html.match(/href=["']https?:\/\/adanaavukat\.org[^"']*["']/gi) || [];
  return matches.length;
}

async function main() {
  const users = await wpFetchAll('/wp-json/wp/v2/users', {
    per_page: '100',
    context: 'edit',
  });
  const posts = await wpFetchAll('/wp-json/wp/v2/posts', {
    per_page: '100',
    status: 'publish',
    _embed: '1',
  });
  const pages = await wpFetchAll('/wp-json/wp/v2/pages', {
    per_page: '100',
    status: 'publish',
  });

  const inventory = {
    generatedAt: new Date().toISOString(),
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      slug: u.slug,
      link: u.link,
      roles: u.roles,
    })),
    posts: posts.map((p) => {
      const html = p.content?.rendered || '';
      const text = strip(html);
      return {
        id: p.id,
        slug: p.slug,
        title: strip(p.title?.rendered || ''),
        link: p.link,
        date: p.date,
        modified: p.modified,
        author: p.author,
        categories: (p._embedded?.['wp:term']?.[0] || []).map((c) => ({
          id: c.id,
          slug: c.slug,
          name: c.name,
        })),
        wordCount: text.split(/\s+/).filter(Boolean).length,
        internalLinkCount: countInternalLinks(html),
        hasAuthorBox: /author-box|uzman-kutu|hukuki açıdan kontrol/i.test(html),
        authorArchiveLinks: [...(html.match(/\/author\/[a-z0-9-]+\//gi) || [])],
        profileSlugHits: [
          ...(html.match(/avukat-ceren-sumer-cilli[^"'\\\s]*/gi) || []),
        ],
        flags: {
          yargiPaketi: /yarg[ıi]\s*paketi|12\.\s*yarg[ıi]/i.test(html),
          aileArabuluculukZorunlu:
            /aile\s*arabuluculu[gğ]u[\s\S]{0,40}zorunlu|zorunlu[\s\S]{0,40}aile\s*arabuluculu/i.test(
              html
            ),
          cerenummer: /cerenummer\.com/i.test(html),
          cerensumerAv: /cerensumer\.av\.tr/i.test(html),
          garantili: /garantili sonuç|en iyi avukat|davayı kesin/i.test(html),
        },
      };
    }),
    pages: pages.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: strip(p.title?.rendered || ''),
      link: p.link,
      modified: p.modified,
      wordCount: strip(p.content?.rendered || '')
        .split(/\s+/)
        .filter(Boolean).length,
    })),
  };

  const outDir = resolve(rootDir, 'reports/backups');
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, 'family-law-inventory-pre-authority.json');
  writeFileSync(outPath, JSON.stringify(inventory, null, 2), 'utf8');
  console.log(`Posts: ${inventory.posts.length}`);
  console.log(`Users: ${JSON.stringify(inventory.users)}`);
  console.log(`Suspicious posts:`);
  for (const p of inventory.posts) {
    const active = Object.entries(p.flags).filter(([, v]) => v);
    if (active.length) console.log(` - ${p.slug}: ${active.map(([k]) => k).join(', ')}`);
  }
  console.log(`Wrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
