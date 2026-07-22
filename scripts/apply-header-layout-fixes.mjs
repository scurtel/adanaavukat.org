/**
 * Header layout fixes uygula:
 * 1) İletişim CTA kompakt
 * 2) Logo varken site-title sr-only
 * 3) Profil sayfasında tek H1 (Astra title kapat)
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { wpFetch } from './lib/wp-client.mjs';
import { getWpConfig, getAuthHeader } from './lib/env.mjs';
import {
  HEADER_LAYOUT_SNIPPET_NAME,
  PROFILE_PAGE_ID,
  HOMEPAGE_HEADER_CTA_CSS,
  buildHeaderLayoutSnippetPhp,
} from './lib/header-layout-fixes.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const HOMEPAGE_ID = 7;
const BASE = 'https://adanaavukat.org';
const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

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
    throw new Error(`${path} ${response.status}: ${text.slice(0, 500)}`);
  }
  return text ? JSON.parse(text) : {};
}

async function ensureSnippet(name, desc, code, priority = 9) {
  const snippets = await wpFetch('/wp-json/code-snippets/v1/snippets?per_page=100');
  const matches = snippets.filter((s) => String(s.name || '').trim() === name);
  let snippet = matches.sort((a, b) => b.id - a.id)[0];
  const payload = {
    name,
    desc,
    code,
    tags: ['header', 'layout', 'adanaavukat'],
    scope: 'global',
    active: true,
    priority,
  };

  // Deactivate older duplicates
  for (const dup of matches.slice(0).sort((a, b) => b.id - a.id).slice(1)) {
    if (dup.active) {
      try {
        await wpPost(`/wp-json/code-snippets/v1/snippets/${dup.id}/deactivate`, {});
      } catch {
        // ignore
      }
    }
  }

  if (snippet) {
    const beforePath = resolve(rootDir, `data/backups/snippet-${snippet.id}-header-layout-before-${ts}.php`);
    writeFileSync(beforePath, snippet.code || '', 'utf8');
    snippet = await wpPost(`/wp-json/code-snippets/v1/snippets/${snippet.id}`, payload);
    try {
      await wpPost(`/wp-json/code-snippets/v1/snippets/${snippet.id}/activate`, {});
    } catch {
      // already active
    }
    return { action: 'updated', id: snippet.id, backup: beforePath };
  }

  snippet = await wpPost('/wp-json/code-snippets/v1/snippets', payload);
  try {
    await wpPost(`/wp-json/code-snippets/v1/snippets/${snippet.id}/activate`, {});
  } catch {
    // ignore
  }
  return { action: 'created', id: snippet.id };
}

function patchHomepageHeaderCss(raw) {
  const oldBlock =
    /\.site-header \.site-title a,\.site-header \.site-title\{[\s\S]*?@media\(max-width:921px\)\{[\s\S]*?\.main-header-menu \.menu-item a\[href\*="\/iletisim\/"\]\{[^}]+\}[\s\S]*?\n\}/;
  const oldBlock2 =
    /\.main-header-menu \.menu-item a\[href\*="\/iletisim\/"\]\{[\s\S]*?@media\(max-width:921px\)\{[\s\S]*?\.main-header-menu \.menu-item a\[href\*="\/iletisim\/"\]\{[^}]+\}[\s\S]*?\n\}/;

  if (raw.includes('height:auto!important;min-height:0!important;line-height:1.25!important')) {
    return { content: raw, changed: false, reason: 'already patched' };
  }

  if (oldBlock.test(raw)) {
    return {
      content: raw.replace(
        oldBlock,
        `.site-header .ast-site-identity{padding:0}\n${HOMEPAGE_HEADER_CTA_CSS}`
      ),
      changed: true,
      reason: 'replaced title+cta block',
    };
  }
  if (oldBlock2.test(raw)) {
    return {
      content: raw.replace(oldBlock2, HOMEPAGE_HEADER_CTA_CSS),
      changed: true,
      reason: 'replaced cta block',
    };
  }
  return { content: raw, changed: false, reason: 'pattern not found' };
}

async function updateHomepageStyles() {
  const before = await wpFetch(`/wp-json/wp/v2/pages/${HOMEPAGE_ID}?context=edit`);
  const backupDir = resolve(rootDir, 'data/backups');
  mkdirSync(backupDir, { recursive: true });
  const backupPath = resolve(backupDir, `homepage-${HOMEPAGE_ID}-before-header-layout-${ts}.html`);
  const raw = before.content?.raw || '';
  writeFileSync(backupPath, raw, 'utf8');

  const patched = patchHomepageHeaderCss(raw);
  if (patched.changed) {
    await wpPost(`/wp-json/wp/v2/pages/${HOMEPAGE_ID}`, { content: patched.content });
  }
  return { id: HOMEPAGE_ID, backup: backupPath, ...patched };
}

async function verify() {
  const bust = Date.now();
  const urls = {
    home: `${BASE}/?v=${bust}`,
    profile: `${BASE}/avukat-ceren-sumer-cilli/?v=${bust}`,
    contact: `${BASE}/iletisim/?v=${bust}`,
    blog: `${BASE}/aile-hukuku-rehberi/?v=${bust}`,
  };

  const out = {};
  for (const [key, url] of Object.entries(urls)) {
    const res = await fetch(url, { redirect: 'follow' });
    const html = await res.text();
    const h1s = [...html.matchAll(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi)].map((m) =>
      m[0].replace(/\s+/g, ' ').slice(0, 160)
    );
    out[key] = {
      status: res.status,
      hasLayoutCss: html.includes('aa-header-layout-fixes') || html.includes('aa-header-layout'),
      hasWpCustomLogo: /class="[^"]*wp-custom-logo/.test(html),
      siteTitlePresent: /class="[^"]*site-title/.test(html),
      h1Count: h1s.length,
      h1s,
      entryTitleVisibleInHtml: /<h1[^>]*class="[^"]*entry-title/.test(html),
      contentNameH1: /<h1[^>]*itemprop="name"/.test(html),
    };
  }
  return out;
}

async function main() {
  mkdirSync(resolve(rootDir, 'data/backups'), { recursive: true });
  mkdirSync(resolve(rootDir, 'reports'), { recursive: true });

  const code = buildHeaderLayoutSnippetPhp();
  const snippetResult = await ensureSnippet(
    HEADER_LAYOUT_SNIPPET_NAME,
    'Compact İletişim CTA, logo yanında site-title sr-only, profil tek H1',
    code,
    9
  );
  console.log('Snippet:', snippetResult);

  const homeResult = await updateHomepageStyles();
  console.log('Homepage:', homeResult);

  // LiteSpeed soft hint — do not change lazy-load settings
  try {
    await fetch(`${BASE}/?LSCWP_CTRL=purge&_nonce=skip`, { method: 'GET' });
  } catch {
    // ignore
  }

  await new Promise((r) => setTimeout(r, 1500));
  const verification = await verify();
  console.log('Verify:', JSON.stringify(verification, null, 2));

  const report = `# Header Layout Fixes

> ${new Date().toISOString()}

## Changes
- Code Snippet \`${HEADER_LAYOUT_SNIPPET_NAME}\`: ${snippetResult.action} (ID ${snippetResult.id})
- Homepage page #${HOMEPAGE_ID} inline header CSS synced
- Profile page #${PROFILE_PAGE_ID}: \`astra_the_title_enabled\` → false + CSS fallback

## Backups
- Snippet: ${snippetResult.backup || 'n/a (created)'}
- Homepage: ${homeResult.backup}

## Verification
\`\`\`json
${JSON.stringify(verification, null, 2)}
\`\`\`
`;
  const reportPath = resolve(rootDir, 'reports/header-layout-fixes-report.md');
  writeFileSync(reportPath, report, 'utf8');
  console.log('Report:', reportPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
