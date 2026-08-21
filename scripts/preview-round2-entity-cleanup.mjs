/**
 * Round 2 local schema checks. Canlı WordPress'e yazmaz.
 *
 *   node scripts/preview-round2-entity-cleanup.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PERSON_SCHEMA_NAME, PERSON_ID } from './lib/ceren-authority-config.mjs';
import { buildProfileJsonLd } from './lib/profile-page-content.mjs';
import { buildSchemaJson } from './lib/homepage-content.mjs';
import { buildArticleAuthoritySnippetPhp } from './lib/authority-snippets.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'reports', 'round2-entity-cleanup-2026-08-21');
mkdirSync(OUT, { recursive: true });

function personsFrom(node, acc = []) {
  if (!node) return acc;
  if (Array.isArray(node)) {
    node.forEach((n) => personsFrom(n, acc));
    return acc;
  }
  if (typeof node === 'object') {
    const t = node['@type'];
    const types = Array.isArray(t) ? t : t ? [t] : [];
    if (types.includes('Person')) acc.push(node);
    Object.values(node).forEach((v) => personsFrom(v, acc));
  }
  return acc;
}

const profile = buildProfileJsonLd();
const home = JSON.parse(buildSchemaJson());
const snippet = buildArticleAuthoritySnippetPhp();

const profilePersons = personsFrom(profile);
const homePersons = personsFrom(home);

const fails = [];
if (profilePersons.length !== 1) fails.push(`profile Person count ${profilePersons.length}`);
if (profilePersons[0]?.name !== 'Ceren Sümer Cilli') fails.push(`profile name ${profilePersons[0]?.name}`);
if (profilePersons[0]?.['@id'] !== PERSON_ID) fails.push('profile @id');
if (homePersons.filter((p) => p['@id'] === PERSON_ID).some((p) => p.name !== PERSON_SCHEMA_NAME)) {
  fails.push('homepage Person.name');
}
if (!snippet.includes("name' => 'Ceren Sümer Cilli'") && !snippet.includes('${PERSON_SCHEMA_NAME}')) {
  fails.push('snippet schema name');
}
if (!snippet.includes('rank_math/json_ld')) fails.push('missing json_ld filter');
if (!snippet.includes('Rank Math global disable = NO')) fails.push('global disable comment missing');
if (!snippet.includes("is_page('avukat-ceren-sumer-cilli')")) fails.push('profile page json_ld not covered');

const report = {
  generated_at: new Date().toISOString(),
  live_wp_write: false,
  PERSON_SCHEMA_NAME,
  PERSON_ID,
  profilePerson: profilePersons.map((p) => ({ id: p['@id'], name: p.name, jobTitle: p.jobTitle })),
  homePersonNames: homePersons.map((p) => ({ id: p['@id'], name: p.name })),
  snippetHasProfilePageFilter: snippet.includes("is_page('avukat-ceren-sumer-cilli')"),
  fails,
};

writeFileSync(join(OUT, 'adanaavukat-local-checks.json'), JSON.stringify(report, null, 2), 'utf8');
writeFileSync(join(OUT, 'person-schema.json'), JSON.stringify(profile, null, 2), 'utf8');

if (fails.length) {
  console.error('FAIL', fails);
  process.exit(1);
}
console.log('adanaavukat Round 2 local checks PASS');
console.log('  Person.name=', profilePersons[0].name);
console.log('  Rank Math profile-page json_ld filter: yes');
