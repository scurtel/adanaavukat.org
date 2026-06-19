/**
 * K1 — Avukatlık reklam yasağı riskli ifadeleri hizmet sayfalarından temizler.
 */
import { mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { wpFetch, wpFetchAll } from './lib/wp-client.mjs';
import { getWpConfig, getAuthHeader } from './lib/env.mjs';
import {
  AUDIT_SLUGS,
  SLUG_ALIASES,
  BASE_URL,
} from './lib/service-pages-config.mjs';
import {
  findRiskyPhrases,
  sanitizeAdvertisingText,
} from './lib/advertising-sanitize.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const REPORT_PATH = resolve(rootDir, `reports/k1-advertising-fixes-report-${ts}.json`);

const TARGET_SLUGS = [
  ...new Set([
    'hizmetlerimiz',
    'adana-bosanma-avukati',
    'cekismeli-bosanma-davasi',
    'nafaka-davasi',
    'adana-ortakligin-giderilmesi-davasi-avukat',
    ...AUDIT_SLUGS.map((slug) => SLUG_ALIASES[slug] || slug),
  ]),
];

const META_OVERRIDES = {
  'adana-bosanma-avukati': {
    title: 'Adana Boşanma Avukatı',
    rank_math_title: 'Adana Boşanma Avukatı | Anlaşmalı ve Çekişmeli Davalar',
    rank_math_description:
      'Adana boşanma davalarında anlaşmalı ve çekişmeli süreç, velayet, nafaka ve mal paylaşımı hakkında bilgilendirici hukuki rehber.',
  },
};

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
  if (!response.ok) {
    throw new Error(`${path} ${response.status}: ${text.slice(0, 400)}`);
  }
  return text ? JSON.parse(text) : {};
}

async function updateRankMath(pageId, meta) {
  const methods = [];
  try {
    await wpPost(`/wp-json/adanaavukat/v1/rankmath-meta/${pageId}`, meta);
    methods.push('adanaavukat/v1');
  } catch (e) {
    methods.push(`adanaavukat/v1 failed: ${e.message}`);
  }
  try {
    await wpPost(`/wp-json/wp/v2/pages/${pageId}`, { meta });
    methods.push('wp/v2/pages meta');
  } catch (e) {
    methods.push(`wp meta failed: ${e.message}`);
  }
  return methods;
}

function buildBackup(pages) {
  const backupPath = resolve(rootDir, `reports/backups/k1-advertising-before-${ts}.json`);
  mkdirSync(resolve(rootDir, 'reports/backups'), { recursive: true });
  writeFileSync(
    backupPath,
    JSON.stringify(
      pages.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title?.raw || '',
        content: p.content?.raw || '',
        meta: {
          rank_math_title: p.meta?.rank_math_title || '',
          rank_math_description: p.meta?.rank_math_description || '',
        },
      })),
      null,
      2
    ),
    'utf8'
  );
  return backupPath;
}

async function verifyLive(slugs) {
  const checks = [];
  for (const slug of slugs) {
    const html = await fetch(`${BASE_URL}/${slug}/?v=${Date.now()}`).then((r) => r.text());
    const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || '';
    const desc =
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1] ||
      html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)?.[1] ||
      '';
    checks.push({
      slug,
      riskyInHtml: findRiskyPhrases(html),
      title: title.slice(0, 120),
      description: desc.slice(0, 160),
    });
  }
  return checks;
}

async function main() {
  console.log('K1 reklam dili düzeltmeleri uygulanıyor...\n');

  const allPages = await wpFetchAll('/wp-json/wp/v2/pages', {
    status: 'publish,draft',
    context: 'edit',
  });

  const targets = allPages.filter((p) => TARGET_SLUGS.includes(p.slug));
  console.log(`Hedef sayfa: ${targets.length}`);

  const backupPath = buildBackup(targets);
  console.log(`Yedek: ${backupPath}\n`);

  const results = [];

  for (const page of targets) {
    const entry = {
      id: page.id,
      slug: page.slug,
      actions: [],
      beforeRisks: [],
      afterRisks: [],
    };

    const beforeCombined = [
      page.title?.raw || '',
      page.content?.raw || '',
      page.meta?.rank_math_title || '',
      page.meta?.rank_math_description || '',
    ].join('\n');
    entry.beforeRisks = findRiskyPhrases(beforeCombined);

    const contentResult = sanitizeAdvertisingText(page.content?.raw || '');
    const titleResult = sanitizeAdvertisingText(page.title?.raw || '');
    const metaTitleResult = sanitizeAdvertisingText(page.meta?.rank_math_title || '');
    const metaDescResult = sanitizeAdvertisingText(page.meta?.rank_math_description || '');

    const override = META_OVERRIDES[page.slug];
    const nextTitle = override?.title || titleResult.text;
    const nextContent = contentResult.text;
    const nextMeta = {
      rank_math_title: override?.rank_math_title || metaTitleResult.text,
      rank_math_description: override?.rank_math_description || metaDescResult.text,
    };

    const pageChanged =
      nextContent !== (page.content?.raw || '') || nextTitle !== (page.title?.raw || '');
    const metaChanged =
      nextMeta.rank_math_title !== (page.meta?.rank_math_title || '') ||
      nextMeta.rank_math_description !== (page.meta?.rank_math_description || '');

    if (pageChanged) {
      await wpPost(`/wp-json/wp/v2/pages/${page.id}`, {
        content: nextContent,
        title: nextTitle,
      });
      entry.actions.push('content/title updated');
      for (const note of [...contentResult.notes, ...titleResult.notes]) {
        entry.actions.push(note);
      }
    }

    if (metaChanged) {
      const methods = await updateRankMath(page.id, nextMeta);
      entry.actions.push(`rank math (${methods.join(', ')})`);
      for (const note of [...metaTitleResult.notes, ...metaDescResult.notes]) {
        entry.actions.push(note);
      }
      if (override) entry.actions.push('meta override uygulandı');
    }

    if (entry.actions.length === 0) {
      entry.actions.push('değişiklik yok');
    }

    const afterPage = await wpFetch(`/wp-json/wp/v2/pages/${page.id}?context=edit`);
    entry.afterRisks = findRiskyPhrases(
      [
        afterPage.title?.raw || '',
        afterPage.content?.raw || '',
        afterPage.meta?.rank_math_title || '',
        afterPage.meta?.rank_math_description || '',
      ].join('\n')
    );

    results.push(entry);
    console.log(
      `  ${page.slug}: ${entry.actions[0] === 'değişiklik yok' ? '—' : '✓'} (${entry.beforeRisks.length} → ${entry.afterRisks.length} risk)`
    );
  }

  try {
    await wpPost('/wp-json/adanaavukat/v1/rankmath-global', { purge_litespeed: true });
  } catch {
    // ignore
  }

  await new Promise((r) => setTimeout(r, 2500));

  const verification = await verifyLive(
    results.filter((r) => r.beforeRisks.length > 0 || META_OVERRIDES[r.slug]).map((r) => r.slug)
  );

  const report = {
    generatedAt: new Date().toISOString(),
    backupPath,
    targetSlugs: TARGET_SLUGS,
    results,
    verification,
  };

  mkdirSync(resolve(rootDir, 'reports'), { recursive: true });
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');

  console.log(`\nRapor: ${REPORT_PATH}`);
  console.log('\nCanlı doğrulama:');
  for (const v of verification) {
    console.log(`  /${v.slug}/ risk=${v.riskyInHtml.length} title="${v.title}"`);
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}
