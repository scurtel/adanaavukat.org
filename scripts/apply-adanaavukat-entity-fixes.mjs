import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { wpFetch } from './lib/wp-client.mjs';
import { buildSchemaJson } from './lib/homepage-content.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const BACKUP_DIR = resolve(ROOT, 'data/backups');
mkdirSync(BACKUP_DIR, { recursive: true });

async function wpPost(path, body) {
  return wpFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function fixUser1() {
  console.log('--- 1. User 1 author website update ---');
  const user = await wpFetch('/wp-json/wp/v2/users/1?context=edit');
  console.log('User 1 before:', { id: user.id, name: user.name, url: user.url });

  const updated = await wpPost('/wp-json/wp/v2/users/1', {
    url: 'https://www.cerensumer.av.tr/av-ceren-sumer-cilli/',
  });
  console.log('User 1 after:', { id: updated.id, name: updated.name, url: updated.url });
}

async function fixSnippet12() {
  console.log('--- 2. Code Snippet 12 author schema update ---');
  const sn = await wpFetch('/wp-json/code-snippets/v1/snippets/12');
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  writeFileSync(resolve(BACKUP_DIR, `snippet-12-pre-fix-${ts}.php`), sn.code, 'utf8');

  let code = sn.code;
  const targetId = "'@id' => 'https://adanaavukat.org/avukat-ceren-sumer-cilli/#person'";
  const canonicalId = "'@id' => 'https://www.cerensumer.av.tr/#ceren-sumer-cilli'";
  const targetUrl = "'url' => 'https://adanaavukat.org/avukat-ceren-sumer-cilli/'";
  const canonicalUrl = "'url' => 'https://www.cerensumer.av.tr/av-ceren-sumer-cilli/'";

  if (!code.includes(targetId)) {
    console.log('Snippet 12 already updated or target pattern not found.');
  } else {
    code = code.replaceAll(targetId, canonicalId);
    code = code.replaceAll(targetUrl, canonicalUrl);
    const result = await wpPost('/wp-json/code-snippets/v1/snippets/12', { code });
    console.log('Snippet 12 updated successfully. Active:', result.active);
  }
}

async function fixHomepagePage7() {
  console.log('--- 3. Page 7 (homepage) schema update ---');
  const page = await wpFetch('/wp-json/wp/v2/pages/7?context=edit');
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  writeFileSync(resolve(BACKUP_DIR, `homepage-7-pre-entity-fix-${ts}.json`), JSON.stringify(page, null, 2), 'utf8');

  let content = page.content?.raw || '';
  const schemaRegex = /<script\s+type=["']application\/ld\+json["']>[\s\S]*?<\/script>/i;
  const match = content.match(schemaRegex);
  if (!match) {
    throw new Error('Page 7 schema tag not found!');
  }

  const newSchemaJson = buildSchemaJson();
  const newSchemaTag = `<script type="application/ld+json">\n${newSchemaJson}\n</script>`;

  const updatedContent = content.replace(schemaRegex, newSchemaTag);
  const updatedPage = await wpPost('/wp-json/wp/v2/pages/7', { content: updatedContent });
  console.log('Page 7 updated successfully. Content length:', updatedPage.content?.raw?.length);
}

async function main() {
  console.log('=== Applying adanaavukat.org Entity Consistency Fixes ===');
  await fixUser1();
  await fixSnippet12();
  await fixHomepagePage7();
  console.log('=== All adanaavukat.org fixes applied successfully ===');
}

main().catch((err) => {
  console.error('Error applying fixes:', err);
  process.exit(1);
});
