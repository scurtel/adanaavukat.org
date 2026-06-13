/**
 * Ana sayfa yeniden tasarımını canlı WordPress'e uygular.
 * Kullanım: node scripts/apply-homepage-redesign.mjs [--dry-run]
 */
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { wpFetch } from './lib/wp-client.mjs';
import { getWpConfig, getAuthHeader } from './lib/env.mjs';
import { buildHomepageContent, buildSchemaJson, HOMEPAGE_META } from './lib/homepage-content.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const HOMEPAGE_ID = 7;
const dryRun = process.argv.includes('--dry-run');

const backupDir = resolve(rootDir, 'data/backups');
const reportPath = resolve(rootDir, 'reports/homepage-redesign-apply-report.md');

async function backupHomepage() {
  const page = await wpFetch(`/wp-json/wp/v2/pages/${HOMEPAGE_ID}?context=edit`);
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  mkdirSync(backupDir, { recursive: true });

  const backupFile = resolve(backupDir, `homepage-7-pre-polish-${ts}.json`);
  writeFileSync(backupFile, JSON.stringify(page, null, 2), 'utf8');

  const contentFile = resolve(backupDir, `homepage-7-pre-polish-${ts}.html`);
  writeFileSync(contentFile, page.content?.raw || page.content?.rendered || '', 'utf8');

  return { backupFile, contentFile, page };
}

async function updateHomepage(content) {
  const { baseUrl, username, appPassword } = getWpConfig();
  const url = `${baseUrl}/wp-json/wp/v2/pages/${HOMEPAGE_ID}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(username, appPassword),
    },
    body: JSON.stringify({
      content,
      status: 'publish',
      excerpt: HOMEPAGE_META.excerpt,
      meta: {
        'site-post-title': 'disabled',
        'ast-banner-title-visibility': 'disabled',
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Page update failed: ${response.status} — ${body.slice(0, 500)}`);
  }

  return response.json();
}

async function updateSiteDescription() {
  const { baseUrl, username, appPassword } = getWpConfig();
  const url = `${baseUrl}/wp-json/wp/v2/settings`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(username, appPassword),
    },
    body: JSON.stringify({
      description: HOMEPAGE_META.excerpt,
    }),
  });

  if (!response.ok) {
    return { ok: false, status: response.status };
  }

  return { ok: true, data: await response.json() };
}

async function main() {
  console.log('Ana sayfa yeniden tasarım uygulaması başlıyor...');
  console.log(`Mod: ${dryRun ? 'DRY-RUN (canlıya yazılmayacak)' : 'CANLI UYGULAMA'}`);

  const { backupFile, contentFile, page } = await backupHomepage();
  console.log(`Yedek alındı: ${backupFile}`);

  const newContent = buildHomepageContent();
  const localContentPath = resolve(rootDir, 'generated/homepage-gutenberg-content.html');
  writeFileSync(localContentPath, newContent, 'utf8');

  const localSchemaPath = resolve(rootDir, 'generated/homepage-schema-live.json');
  writeFileSync(localSchemaPath, buildSchemaJson(), 'utf8');

  if (dryRun) {
    console.log('DRY-RUN tamamlandı. Canlıya yazılmadı.');
    return;
  }

  const updated = await updateHomepage(newContent);
  console.log(`Ana sayfa güncellendi — ID: ${updated.id}, modified: ${updated.modified}`);

  const settingsResult = await updateSiteDescription();
  const settingsNote = settingsResult.ok
    ? 'Site tagline güncellendi.'
    : `Site tagline güncellenemedi (HTTP ${settingsResult.status}). Manuel güncelleme gerekebilir.`;

  const report = `# Ana Sayfa Yeniden Tasarım — Uygulama Raporu

> Tarih: ${new Date().toISOString()}
> Durum: **CANLI UYGULANDI**

## Özet

| Öğe | Değer |
|-----|-------|
| Ana sayfa ID | ${HOMEPAGE_ID} |
| Slug | ${page.slug} |
| Önceki modified | ${page.modified} |
| Yeni modified | ${updated.modified} |
| Site tagline | ${settingsNote} |

## Yedekler

- \`${backupFile}\`
- \`${contentFile}\`

## Oluşturulan local dosyalar

- \`generated/homepage-gutenberg-content.html\`
- \`generated/homepage-schema-live.json\`

## Uygulanan bölümler

1. Hero (H1, CTA, güven cümlesi)
2. Hizmet kartları (9 alan)
3. Av. Ceren Sümer Cilli entity bölümü
4. Neden hukuki destek önemli
5. Son 5 hukuk rehberi yazısı
6. FAQ (6 soru, reklam yasağına uygun)
7. İletişim CTA
8. Schema JSON-LD (adanaavukat.org domain)

## Geri alma

Önceki içeriği geri yüklemek için yedek dosyasındaki \`content.raw\` alanını kullanın:

\`\`\`bash
node scripts/apply-homepage-redesign.mjs --restore=${backupFile}
\`\`\`

_(Restore flag henüz ayrı script olarak eklenebilir; yedek JSON'dan manuel REST PUT da yapılabilir.)_
`;

  writeFileSync(reportPath, report, 'utf8');
  console.log(`Rapor: ${reportPath}`);
  console.log('TAMAMLANDI.');
}

main().catch((err) => {
  console.error('HATA:', err.message);
  process.exit(1);
});
