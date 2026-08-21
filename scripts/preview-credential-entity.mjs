/**
 * Avukat Ceren Sümer Cilli credential/entity güncellemesinin yerel önizlemesi.
 * Canlı WordPress'e yazmaz.
 *
 *   node scripts/preview-credential-entity.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SAME_AS,
  MILLIYET_BLOG_URL,
  CANONICAL_PERSON_URL,
  PERSON_ID,
  PROFILE_URL_NEW,
  ALUMNI_OF,
} from './lib/ceren-authority-config.mjs';
import {
  buildProfilePageHtml,
  buildProfileJsonLd,
  injectProfileSchema,
} from './lib/profile-page-content.mjs';
import { buildSchemaJson } from './lib/homepage-content.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'reports', 'credential-entity-2026-08-21');

const html = injectProfileSchema(buildProfilePageHtml(), buildProfileJsonLd());
const homeSchema = buildSchemaJson();
const profileLd = buildProfileJsonLd();

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'profile.html'), html, 'utf8');
writeFileSync(join(OUT, 'person-schema.json'), JSON.stringify(profileLd, null, 2), 'utf8');
writeFileSync(join(OUT, 'homepage-schema.json'), JSON.stringify(homeSchema, null, 2), 'utf8');

const blob = `${html}\n${JSON.stringify(profileLd)}\n${JSON.stringify(homeSchema)}`;
const privacyHits = [];
if (/baro sicil/i.test(blob)) privacyHits.push('baro-sicil');
if (/T\.C\.\s*kimlik/i.test(blob)) privacyHits.push('tc-kimlik');
if (/arabuluculuk sicil\s*no/i.test(blob)) privacyHits.push('arabuluculuk-sicil-no');

writeFileSync(
  join(OUT, 'preview-meta.json'),
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      live_wp_write: false,
      profile_url: PROFILE_URL_NEW,
      person_id: PERSON_ID,
      canonical_person_url: CANONICAL_PERSON_URL,
      milliyet: MILLIYET_BLOG_URL,
      alumniOf: ALUMNI_OF,
      sameAs: SAME_AS,
      privacy_hits: privacyHits,
    },
    null,
    2
  ),
  'utf8'
);

if (privacyHits.length) {
  console.error('Gizlilik taraması eşleşmesi:', privacyHits);
  process.exit(1);
}

console.log('Önizleme yazıldı (canlı WordPress’e yazılmadı):');
console.log(`  ${OUT}`);
