/**
 * Resmî profil bağlantıları + Person sameAs / LegalService.hasMap güncellemesi.
 *
 *   node scripts/apply-official-profiles.mjs
 *   node scripts/apply-official-profiles.mjs --dry-run
 */
import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { wpFetch } from './lib/wp-client.mjs';
import { getWpConfig, getAuthHeader, rootDir } from './lib/env.mjs';
import {
  PROFILE_PAGE_ID,
  PROFILE_SLUG_NEW,
  PROFILE_URL_NEW,
  PERSON_ID,
  SAME_AS,
  HAS_MAP_URL,
  OFFICIAL_BIO_URL,
  SNIPPET_NAMES,
  AUTHOR_DISPLAY_NAME,
} from './lib/ceren-authority-config.mjs';
import {
  buildProfilePageHtml,
  buildProfileJsonLd,
  injectProfileSchema,
} from './lib/profile-page-content.mjs';
import { buildArticleAuthoritySnippetPhp } from './lib/authority-snippets.mjs';
import { buildSchemaJson } from './lib/homepage-content.mjs';

const dryRun = process.argv.includes('--dry-run');
const HOMEPAGE_ID = 7;

async function wpPost(path, body) {
  const { baseUrl, username, appPassword } = getWpConfig();
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(username, appPassword),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${path} ${response.status}: ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : {};
}

async function upsertSnippet(name, code, desc) {
  const snippets = await wpFetch('/wp-json/code-snippets/v1/snippets');
  let snippet = snippets.find((s) => s.name === name);
  const payload = { name, code, desc, scope: 'global', active: true };
  if (dryRun) return { action: snippet ? 'would-update' : 'would-create', id: snippet?.id || null };
  if (snippet) {
    snippet = await wpPost(`/wp-json/code-snippets/v1/snippets/${snippet.id}`, payload);
    try {
      await wpPost(`/wp-json/code-snippets/v1/snippets/${snippet.id}/activate`, {});
    } catch {
      /* already active */
    }
    return { action: 'updated', id: snippet.id };
  }
  snippet = await wpPost('/wp-json/code-snippets/v1/snippets', payload);
  try {
    await wpPost(`/wp-json/code-snippets/v1/snippets/${snippet.id}/activate`, {});
  } catch {
    /* ignore */
  }
  return { action: 'created', id: snippet.id };
}

function patchHomepageSchema(rawHtml) {
  if (!rawHtml) return { html: rawHtml, changed: false };
  const schema = buildSchemaJson();
  const json = JSON.stringify(schema, null, 2);
  const block = `<script type="application/ld+json">\n${json}\n</script>`;
  if (/id="aa-home-jsonld"|application\/ld\+json/i.test(rawHtml)) {
    const next = rawHtml.replace(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/i,
      block
    );
    return { html: next, changed: next !== rawHtml };
  }
  return { html: `${rawHtml}\n${block}`, changed: true };
}

async function scanNameVariants() {
  const patterns = [
    { key: 'Ceren Sümer (soyadsız)', re: /Ceren Sümer(?!\s+Cilli)/g },
    { key: 'Ceren Sümer Cilli (Avukat/Av. öneksiz)', re: /(?<!Avukat\s)(?<!Av\.\s)Ceren Sümer Cilli/g },
    { key: 'Av. Ceren Sümer Cilli', re: /Av\.\s*Ceren Sümer Cilli/g },
    { key: 'Avukat Ceren Sumer Cilli (ASCII u)', re: /Avukat Ceren Sumer Cilli/g },
    { key: 'Ceren Sumer Cilli', re: /Ceren Sumer Cilli/g },
    { key: 'Cümer yazım hatası', re: /C[uü]mer/gi },
    { key: 'eski author slug', re: /yigit-cilligmail-com/g },
    { key: 'Maps Cümer typo query', re: /C%C3%BCmer|Cümer\+Cilli/gi },
  ];

  const targets = [];
  const pages = await wpFetch('/wp-json/wp/v2/pages?per_page=100&status=publish&context=edit');
  const posts = await wpFetch('/wp-json/wp/v2/posts?per_page=100&status=publish&context=edit');
  for (const p of [...pages, ...posts]) {
    const text = `${p.title?.raw || ''}\n${p.content?.raw || ''}`;
    const hits = [];
    for (const { key, re } of patterns) {
      const m = text.match(re);
      if (m?.length) hits.push({ key, count: m.length });
    }
    if (hits.length) {
      targets.push({
        id: p.id,
        type: p.type,
        slug: p.slug,
        hits,
      });
    }
  }
  return targets;
}

async function main() {
  console.log(`Resmî profil güncellemesi (${dryRun ? 'DRY-RUN' : 'CANLI'})...\n`);
  const report = {
    generatedAt: new Date().toISOString(),
    dryRun,
    personId: PERSON_ID,
    sameAs: SAME_AS,
    hasMap: HAS_MAP_URL,
    officialBio: OFFICIAL_BIO_URL,
  };

  const profile = await wpFetch(`/wp-json/wp/v2/pages/${PROFILE_PAGE_ID}?context=edit`);
  const html = injectProfileSchema(buildProfilePageHtml(), buildProfileJsonLd());
  if (!dryRun) {
    const updated = await wpPost(`/wp-json/wp/v2/pages/${PROFILE_PAGE_ID}`, {
      title: AUTHOR_DISPLAY_NAME,
      slug: PROFILE_SLUG_NEW,
      content: html,
      status: 'publish',
    });
    report.profile = { action: 'updated', id: updated.id, link: updated.link };
  } else {
    report.profile = { action: 'would-update', id: PROFILE_PAGE_ID };
  }

  report.articleSnippet = await upsertSnippet(
    SNIPPET_NAMES.articleAuthority,
    buildArticleAuthoritySnippetPhp(),
    'Family-law author box + Person @id on Article author'
  );

  const home = await wpFetch(`/wp-json/wp/v2/pages/${HOMEPAGE_ID}?context=edit`);
  const patched = patchHomepageSchema(home.content?.raw || '');
  if (patched.changed) {
    if (!dryRun) {
      await wpPost(`/wp-json/wp/v2/pages/${HOMEPAGE_ID}`, { content: patched.html });
      report.homepageSchema = { action: 'updated', id: HOMEPAGE_ID };
    } else {
      report.homepageSchema = { action: 'would-update', id: HOMEPAGE_ID };
    }
  } else {
    report.homepageSchema = { action: 'unchanged', id: HOMEPAGE_ID };
  }

  report.nameVariantScan = await scanNameVariants();

  if (!dryRun) {
    try {
      await wpPost('/wp-json/adanaavukat/v1/rankmath-global', { purge_litespeed: true });
      report.purge = { ok: true };
    } catch (e) {
      report.purge = { ok: false, error: e.message };
    }
    await new Promise((r) => setTimeout(r, 2500));
  }

  const live = await fetch(`${PROFILE_URL_NEW}?nocache=${Date.now()}`).then((r) => r.text());
  report.verification = {
    profile200: live.includes('Avukat Ceren Sümer Cilli'),
    officialSection: live.includes('Diğer Platformlarda Görüntüleyin'),
    hasOfficialBio: live.includes(OFFICIAL_BIO_URL),
    hasMapsCorrect: live.includes('S%C3%BCmer') && !/C%C3%BCmer/.test(live),
    hasLinkedIn: live.includes('linkedin.com/in/avukat-ceren'),
    sameAsInJsonLd: SAME_AS.every((u) => live.includes(u)),
    mapsNotInPersonSameAsBlock: (() => {
      const m = live.match(/id="aa-profile-jsonld">([\s\S]*?)<\/script>/);
      if (!m) return false;
      try {
        const data = JSON.parse(m[1]);
        const person = (data['@graph'] || []).find((n) => n['@type'] === 'Person');
        const legal = (data['@graph'] || []).find((n) => n['@type'] === 'LegalService');
        return (
          person &&
          Array.isArray(person.sameAs) &&
          !person.sameAs.some((x) => String(x).includes('google.com/maps')) &&
          legal?.hasMap === HAS_MAP_URL &&
          person['@id'] === PERSON_ID
        );
      } catch {
        return false;
      }
    })(),
    nofollowNotForced: !/rel="[^"]*nofollow[^"]*"[^>]*cerensumer\.av\.tr/i.test(live),
    noopenerPresent: /rel="noopener noreferrer"/.test(live),
  };

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const out = resolve(rootDir, `reports/official-profiles-apply-${ts}.json`);
  mkdirSync(resolve(rootDir, 'reports'), { recursive: true });
  writeFileSync(out, JSON.stringify(report, null, 2), 'utf8');

  const md = `# Resmî Profil Bağlantıları Güncellemesi

Tarih: ${report.generatedAt}

## sameAs (Person)
${SAME_AS.map((u) => `- ${u}`).join('\n')}

## hasMap (LegalService)
- ${HAS_MAP_URL}

## Person @id
- ${PERSON_ID}

## Doğrulama
${Object.entries(report.verification)
  .map(([k, v]) => `- ${k}: ${v ? 'OK' : 'FAIL'}`)
  .join('\n')}

## Ad yazımı taraması (rapor; otomatik toplu rename yok)
${
  report.nameVariantScan.length
    ? report.nameVariantScan
        .map(
          (t) =>
            `- ${t.type} \`/${t.slug}/\` (#${t.id}): ${t.hits.map((h) => `${h.key}×${h.count}`).join(', ')}`
        )
        .join('\n')
    : '- Belirgin varyant bulunamadı'
}

Not: Görünür metinde “Av. Ceren Sümer Cilli” kabul edilebilir. Schema \`name\` alanı standart: **Avukat Ceren Sümer Cilli**.
`;
  writeFileSync(resolve(rootDir, 'official-profiles-update-report.md'), md, 'utf8');

  console.log('Doğrulama:', report.verification);
  console.log('Ad varyantı kayıt sayısı:', report.nameVariantScan.length);
  console.log('JSON:', out);
  console.log('MD: official-profiles-update-report.md');

  if (Object.values(report.verification).some((v) => !v)) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
