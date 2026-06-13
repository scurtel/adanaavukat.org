/**
 * WordPress'e draft gönderme scripti.
 * Kullanım: node scripts/create-wp-drafts.mjs [--dry-run] [--file=slug.md]
 */
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname, join, basename } from 'path';
import { fileURLToPath } from 'url';
import { wpFetch, wpFetchAll } from './lib/wp-client.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const articlesDir = resolve(__dirname, '../generated/adanaavukat-authority-articles');
const reportPath = resolve(__dirname, '../reports/wp-draft-upload-report.md');

const args = process.argv.slice(2);
const dryRun = !args.includes('--dry-run=false');
const fileArg = args.find((a) => a.startsWith('--file='));
const singleFile = fileArg ? fileArg.split('=')[1] : null;

const CATEGORY_ALIASES = {
  'Boşanma Hukuku': 'Boşanma Davaları',
  'Hukuki Danışmanlık': 'Aile Hukuku',
  'Adana Avukat': 'Aile Hukuku',
};

function normalizeContent(raw) {
  let content = raw.trim();
  if (content.startsWith('```')) {
    content = content.replace(/^```(?:markdown)?\n?/, '').replace(/\n?```\s*$/, '');
  }
  return content;
}

function parseFrontmatter(content) {
  const normalized = normalizeContent(content);
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { meta: {}, body: normalized };
  }

  const meta = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    meta[key] = value;
  }

  return { meta, body: match[2].trim() };
}

function markdownToHtml(md) {
  let html = md;
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html
    .split('\n\n')
    .map((block) => {
      if (block.startsWith('<h') || block.startsWith('<ul') || block.startsWith('<ol')) return block;
      if (block.match(/^(\d+\.\s+|-\s+)/m)) {
        const lines = block.split('\n');
        const isOrdered = /^\d+\.\s+/.test(lines[0]);
        const items = lines.map((l) => {
          const text = l.replace(/^(\d+\.\s+|-\s+)/, '').trim();
          return `<li>${text}</li>`;
        });
        return isOrdered ? `<ol>${items.join('')}</ol>` : `<ul>${items.join('')}</ul>`;
      }
      if (block.startsWith('- ')) {
        const items = block.split('\n').map((l) => `<li>${l.replace(/^- /, '')}</li>`);
        return `<ul>${items.join('')}</ul>`;
      }
      return `<p>${block.replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n');
  return html;
}

async function findCategoryByName(name) {
  const resolved = CATEGORY_ALIASES[name] || name;
  const categories = await wpFetchAll('/wp-json/wp/v2/categories', { search: resolved });
  const exact = categories.find((c) => c.name.toLowerCase() === resolved.toLowerCase());
  return exact || null;
}

async function createCategory(name) {
  const slug = name
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const result = await wpFetch('/wp-json/wp/v2/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, slug }),
  });
  return result;
}

async function resolveCategory(name) {
  let cat = await findCategoryByName(name);
  if (cat) return { id: cat.id, name: cat.name, created: false };

  const resolvedName = CATEGORY_ALIASES[name] || name;
  cat = await findCategoryByName(resolvedName);
  if (cat) return { id: cat.id, name: cat.name, created: false, mappedFrom: name };

  try {
    const created = await createCategory(resolvedName);
    return { id: created.id, name: created.name, created: true };
  } catch {
    const fallback = await findCategoryByName('Uncategorized');
    if (fallback) {
      return { id: fallback.id, name: fallback.name, created: false, fallback: true };
    }
    return null;
  }
}

async function findOrCreateTag(name) {
  const trimmed = name.trim();
  const tags = await wpFetchAll('/wp-json/wp/v2/tags', { search: trimmed });
  const exact = tags.find((t) => t.name.toLowerCase() === trimmed.toLowerCase());
  if (exact) return { id: exact.id, name: exact.name, created: false };

  const slug = trimmed
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  try {
    const created = await wpFetch('/wp-json/wp/v2/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed, slug }),
    });
    return { id: created.id, name: created.name, created: true };
  } catch {
    return { name: trimmed, error: 'oluşturulamadı' };
  }
}

async function resolveTags(tagNames) {
  const resolved = [];
  for (const name of tagNames) {
    resolved.push(await findOrCreateTag(name));
  }
  return resolved;
}

async function createDraft(articlePath) {
  const content = readFileSync(articlePath, 'utf8');
  const { meta, body } = parseFrontmatter(content);
  const slug = meta.slug || basename(articlePath, '.md');
  const title = meta.seo_title || body.match(/^# (.+)/m)?.[1] || slug;
  const htmlContent = markdownToHtml(body);

  const tagNames = (meta.tags || '').split(',').map((t) => t.trim()).filter(Boolean);
  const categoryName = meta.category || 'Genel';

  const report = {
    file: basename(articlePath),
    slug,
    title,
    status: 'draft',
    dryRun,
    category: categoryName,
    tags: tagNames,
  };

  if (dryRun) {
    report.message = "DRY-RUN: WordPress'e gönderilmedi";
    return report;
  }

  const category = await resolveCategory(categoryName);
  const tagResults = await resolveTags(tagNames);
  const tagIds = tagResults.filter((t) => t.id).map((t) => t.id);

  report.categoryUsed = category;
  report.tagsUsed = tagResults;

  const payload = {
    title,
    content: htmlContent,
    slug,
    status: 'draft',
    excerpt: meta.meta_description || '',
  };

  if (category?.id) payload.categories = [category.id];
  if (tagIds.length > 0) payload.tags = tagIds;

  const result = await wpFetch('/wp-json/wp/v2/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (result.status !== 'draft') {
    throw new Error(`Beklenmeyen durum: ${result.status} — publish yapılmamalı`);
  }

  report.wpId = result.id;
  report.status = result.status;
  report.link = result.link;
  report.previewLink = `${result.link}?preview=true`;
  return report;
}

function buildMarkdownReport(results, dryRun) {
  let md = `# WordPress Draft Gönderim Raporu

> Tarih: ${new Date().toISOString()}
> Mod: ${dryRun ? 'DRY-RUN' : 'CANLI DRAFT'}
> Publish yapıldı mı: **HAYIR**
> Mevcut canlı içerik güncellendi mi: **HAYIR**

---

`;

  for (const r of results) {
    if (r.error) {
      md += `## ✗ ${r.file}\n- Hata: ${r.error}\n\n`;
      continue;
    }
    md += `## ${r.title}\n`;
    md += `- Dosya: \`${r.file}\`\n`;
    md += `- Slug: \`${r.slug}\`\n`;
    md += `- WordPress ID: **${r.wpId ?? '—'}**\n`;
    md += `- Durum: **${r.status}**\n`;
    md += `- Draft link: ${r.link ?? '—'}\n`;
    if (r.previewLink) md += `- Önizleme: ${r.previewLink}\n`;
    if (r.categoryUsed) {
      md += `- Kategori: ${r.categoryUsed.name}${r.categoryUsed.created ? ' (yeni oluşturuldu)' : ''}${r.categoryUsed.mappedFrom ? ` (eşleme: ${r.categoryUsed.mappedFrom})` : ''}\n`;
    }
    if (r.tagsUsed?.length) {
      md += `- Etiketler: ${r.tagsUsed.map((t) => `${t.name}${t.created ? '*' : ''}`).join(', ')}\n`;
    }
    md += '\n';
  }

  return md;
}

async function main() {
  if (!existsSync(articlesDir)) {
    console.error('Üretilmiş makale klasörü bulunamadı.');
    process.exit(1);
  }

  const files = singleFile
    ? [singleFile.endsWith('.md') ? singleFile : `${singleFile}.md`]
    : readdirSync(articlesDir).filter((f) => f.endsWith('.md'));

  if (files.length === 0) {
    console.error('Gönderilecek .md dosyası bulunamadı.');
    process.exit(1);
  }

  console.log(`Mod: ${dryRun ? 'DRY-RUN' : 'CANLI DRAFT GÖNDERİM'}`);
  console.log(`${files.length} dosya işlenecek\n`);

  const results = [];
  for (const file of files) {
    const path = join(articlesDir, file);
    if (!existsSync(path)) {
      console.log(`Atlandı: ${file}`);
      continue;
    }
    try {
      const report = await createDraft(path);
      results.push(report);
      console.log(`✓ ${file}: ${report.message || `Draft ID ${report.wpId} (${report.status})`}`);
    } catch (err) {
      console.error(`✗ ${file}: ${err.message}`);
      results.push({ file, error: err.message });
    }
  }

  if (!dryRun) {
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, buildMarkdownReport(results, dryRun), 'utf8');
    console.log(`\nRapor: ${reportPath}`);
  }

  const failed = results.filter((r) => r.error);
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
