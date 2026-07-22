/**
 * Site sağlık düzeltmeleri:
 * 1) 4 hizmet sayfasında çift H1 (Astra title kapat — profil pattern)
 * 2) /sikca-sorulan-sorular/ → /faq/ 301
 * 3) Güvenli HTTP security headers (CSP hariç — mevcut upgrade-insecure-requests korunur)
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { wpFetch } from './lib/wp-client.mjs';
import { getWpConfig, getAuthHeader, rootDir } from './lib/env.mjs';
import {
  HEADER_LAYOUT_SNIPPET_NAME,
  SINGLE_H1_PAGE_IDS,
  buildHeaderLayoutSnippetPhp,
} from './lib/header-layout-fixes.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = 'https://adanaavukat.org';
const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

const AUTHORITY_REDIRECT_NAME = 'Adana Avukat Authority Redirects';
const SECURITY_HEADERS_NAME = 'Adana Avukat Security Headers';

const SERVICE_PAGES = [
  { id: 307, path: '/adana-anlasmali-bosanma-avukati/', label: 'Anlaşmalı Boşanma' },
  { id: 305, path: '/adana-aile-hukuku-avukati/', label: 'Aile Hukuku' },
  { id: 311, path: '/velayet-davasi-avukati-adana/', label: 'Velayet' },
  { id: 313, path: '/gayrimenkul-avukati-adana/', label: 'Gayrimenkul' },
];

const AUTHORITY_REDIRECT_PHP = `/**
 * Otorite URL yönlendirmeleri:
 * - Eski yazar arşivi → yeni yazar arşivi
 * - Eski profil slug → kısa profil URL
 * - EN kopya sayfalar
 * - Eski SSS slug → /faq/
 */
add_action('template_redirect', function () {
    $request_uri = isset($_SERVER['REQUEST_URI']) ? wp_unslash($_SERVER['REQUEST_URI']) : '';
    $path = wp_parse_url($request_uri, PHP_URL_PATH);
    $path = is_string($path) ? untrailingslashit($path) : '';

    $map = array(
        '/author/yigit-cilligmail-com' => home_url('/author/avukat-ceren-sumer-cilli/'),
        '/avukat-ceren-sumer-cilli-kimdir-adana-bosanma-ve-aile-hukuku' => home_url('/avukat-ceren-sumer-cilli/'),
        '/about-us' => home_url('/hakkimizda/'),
        '/contact' => home_url('/iletisim/'),
        '/sikca-sorulan-sorular' => home_url('/faq/'),
    );

    if (isset($map[$path])) {
        $target = $map[$path];
        if (!empty($_GET) && is_array($_GET)) {
            $target = add_query_arg(wp_unslash($_GET), $target);
        }
        nocache_headers();
        wp_safe_redirect($target, 301);
        exit;
    }

    if (is_page('about-us')) {
        wp_safe_redirect(home_url('/hakkimizda/'), 301);
        exit;
    }
    if (is_page('contact')) {
        wp_safe_redirect(home_url('/iletisim/'), 301);
        exit;
    }
}, 1);
`;

const SECURITY_HEADERS_PHP = `/**
 * Güvenli HTTP security headers.
 * Mevcut host CSP (upgrade-insecure-requests) üzerine yazılmaz.
 * Katı Content-Security-Policy eklenmez (Google / üçüncü taraf riski).
 */
if (!defined('ABSPATH')) {
    exit;
}

add_filter('wp_headers', function ($headers) {
    if (!is_array($headers)) {
        $headers = array();
    }
    $headers['X-Content-Type-Options'] = 'nosniff';
    $headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
    $headers['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()';
    $headers['X-Frame-Options'] = 'SAMEORIGIN';
    return $headers;
}, 20);

add_action('send_headers', function () {
    $https = is_ssl()
        || (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (isset($_SERVER['SERVER_PORT']) && (int) $_SERVER['SERVER_PORT'] === 443)
        || (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');

    if ($https) {
        header('Strict-Transport-Security: max-age=31536000; includeSubDomains', false);
    }
}, 20);
`;

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

async function ensureSnippet(name, desc, code, tags, priority = 10) {
  const snippets = await wpFetch('/wp-json/code-snippets/v1/snippets?per_page=100');
  const matches = snippets.filter((s) => String(s.name || '').trim() === name);
  let snippet = matches.sort((a, b) => b.id - a.id)[0];
  const payload = {
    name,
    desc,
    code,
    tags,
    scope: 'global',
    active: true,
    priority,
  };

  for (const dup of matches.sort((a, b) => b.id - a.id).slice(1)) {
    if (dup.active) {
      try {
        await wpPost(`/wp-json/code-snippets/v1/snippets/${dup.id}/deactivate`, {});
      } catch {
        // ignore
      }
    }
  }

  mkdirSync(resolve(rootDir, 'data/backups'), { recursive: true });
  if (snippet) {
    writeFileSync(
      resolve(rootDir, `data/backups/snippet-${snippet.id}-${name.replace(/\s+/g, '-').toLowerCase()}-${ts}.php`),
      snippet.code || '',
      'utf8'
    );
    snippet = await wpPost(`/wp-json/code-snippets/v1/snippets/${snippet.id}`, payload);
    try {
      await wpPost(`/wp-json/code-snippets/v1/snippets/${snippet.id}/activate`, {});
    } catch {
      // already
    }
    return { action: 'updated', id: snippet.id };
  }

  snippet = await wpPost('/wp-json/code-snippets/v1/snippets', payload);
  try {
    await wpPost(`/wp-json/code-snippets/v1/snippets/${snippet.id}/activate`, {});
  } catch {
    // ignore
  }
  return { action: 'created', id: snippet.id };
}

async function countH1(path) {
  const res = await fetch(`${BASE}${path}?v=${Date.now()}`, { redirect: 'follow' });
  const html = await res.text();
  const h1s = [...html.matchAll(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi)].map((m) =>
    m[0].replace(/\s+/g, ' ').replace(/<[^>]+>/g, ' ').trim().slice(0, 100)
  );
  return {
    path,
    status: res.status,
    h1Count: h1s.length,
    h1s,
    hasEntryTitle: /<h1[^>]*entry-title/.test(html),
    schemaOk: (() => {
      try {
        for (const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
          JSON.parse(m[1]);
        }
        return true;
      } catch {
        return false;
      }
    })(),
  };
}

async function checkRedirect(fromPath, expectToIncludes) {
  const res = await fetch(`${BASE}${fromPath}`, { redirect: 'manual' });
  const loc = res.headers.get('location') || '';
  const withQuery = await fetch(`${BASE}${fromPath}?utm=test`, { redirect: 'manual' });
  return {
    from: fromPath,
    status: res.status,
    location: loc,
    ok: res.status === 301 && loc.includes(expectToIncludes),
    queryStatus: withQuery.status,
    queryLocation: withQuery.headers.get('location') || '',
    queryPreserved: (withQuery.headers.get('location') || '').includes('utm=test'),
  };
}

async function checkFaqOk() {
  const res = await fetch(`${BASE}/faq/?v=${Date.now()}`);
  return { status: res.status, ok: res.status === 200 };
}

async function checkSecurityHeaders() {
  const res = await fetch(`${BASE}/?v=${Date.now()}`, { method: 'GET' });
  const keys = [
    'strict-transport-security',
    'x-content-type-options',
    'referrer-policy',
    'permissions-policy',
    'x-frame-options',
    'content-security-policy',
  ];
  const headers = {};
  for (const k of keys) headers[k] = res.headers.get(k);
  return headers;
}

async function tryPurge() {
  try {
    await wpPost('/wp-json/adanaavukat/v1/rankmath-global', { purge_litespeed: true });
    return { ok: true, via: 'rankmath-global' };
  } catch {
    try {
      await fetch(`${BASE}/?LSCWP_CTRL=purge`);
      return { ok: true, via: 'hint' };
    } catch {
      return { ok: false };
    }
  }
}

async function main() {
  mkdirSync(resolve(rootDir, 'reports'), { recursive: true });
  mkdirSync(resolve(rootDir, 'data/backups'), { recursive: true });

  console.log('Before H1…');
  const before = {};
  for (const p of SERVICE_PAGES) {
    before[p.path] = await countH1(p.path);
    console.log(p.path, before[p.path].h1Count, before[p.path].h1s);
  }

  const header = await ensureSnippet(
    HEADER_LAYOUT_SNIPPET_NAME,
    'CTA + site-title + Astra title off for profile/service single-H1 pages',
    buildHeaderLayoutSnippetPhp(),
    ['header', 'layout', 'h1', 'adanaavukat'],
    9
  );
  console.log('Header snippet', header, 'pageIds', SINGLE_H1_PAGE_IDS);

  const redirects = await ensureSnippet(
    AUTHORITY_REDIRECT_NAME,
    'Authority/legacy 301 redirects including /sikca-sorulan-sorular/ → /faq/',
    AUTHORITY_REDIRECT_PHP,
    ['seo', 'redirect', 'adanaavukat'],
    1
  );
  console.log('Redirect snippet', redirects);

  const security = await ensureSnippet(
    SECURITY_HEADERS_NAME,
    'HSTS, nosniff, Referrer-Policy, Permissions-Policy, X-Frame-Options (no strict CSP)',
    SECURITY_HEADERS_PHP,
    ['security', 'headers', 'adanaavukat'],
    5
  );
  console.log('Security snippet', security);

  const purge = await tryPurge();
  console.log('Purge', purge);
  await new Promise((r) => setTimeout(r, 2500));

  console.log('After H1…');
  const after = {};
  for (const p of SERVICE_PAGES) {
    after[p.path] = await countH1(p.path);
    console.log(p.path, after[p.path].h1Count, after[p.path].h1s);
  }

  const redirectTest = await checkRedirect('/sikca-sorulan-sorular/', '/faq/');
  const faq = await checkFaqOk();
  const headers = await checkSecurityHeaders();

  // menu /faq still 200
  const menuFaq = await fetch(`${BASE}/faq/`).then((r) => r.status);

  // profile still single H1
  const profile = await countH1('/avukat-ceren-sumer-cilli/');

  const report = `# Site Health Fixes Report

> ${new Date().toISOString()}

## Changed WordPress settings (Code Snippets)
- \`${HEADER_LAYOUT_SNIPPET_NAME}\`: ${header.action} (ID ${header.id}) — \`astra_the_title_enabled\` false for pages ${SINGLE_H1_PAGE_IDS.join(', ')}
- \`${AUTHORITY_REDIRECT_NAME}\`: ${redirects.action} (ID ${redirects.id}) — added \`/sikca-sorulan-sorular\` → \`/faq/\`
- \`${SECURITY_HEADERS_NAME}\`: ${security.action} (ID ${security.id})

## Repo files
- \`scripts/lib/header-layout-fixes.mjs\`
- \`scripts/apply-site-health-fixes.mjs\`

## H1 before → after
${SERVICE_PAGES.map((p) => `- ${p.path}: **${before[p.path].h1Count}** → **${after[p.path].h1Count}** (entry-title present after: ${after[p.path].hasEntryTitle}; H1: ${after[p.path].h1s.join(' | ')})`).join('\n')}
- Profil \`/avukat-ceren-sumer-cilli/\`: ${profile.h1Count} H1 (korundu)

## 301 redirect test
\`\`\`json
${JSON.stringify(redirectTest, null, 2)}
\`\`\`
- \`/faq/\`: ${faq.status}

## Security headers (observed)
\`\`\`json
${JSON.stringify(headers, null, 2)}
\`\`\`

### CSP note
- Host already sends \`Content-Security-Policy: upgrade-insecure-requests\`.
- Strict CSP **not** applied (Google / social / third-party risk). Reason reported as requested.

## Cache
- Purge attempt: ${JSON.stringify(purge)}

## Not applied (manual / optional)
- Profile photo still 225×225 — upload ≥800×800 in WP Media
- Contact form — product decision
- Below-fold LiteSpeed placeholders — intentional lazy-load

## Final checks
- Service pages HTTP: ${SERVICE_PAGES.map((p) => `${p.path}=${after[p.path].status}`).join(', ')}
- Schema OK flags: ${SERVICE_PAGES.map((p) => `${after[p.path].schemaOk}`).join(', ')}
- Menu /faq/: ${menuFaq}
`;

  const reportPath = resolve(rootDir, 'reports/site-health-fixes-report.md');
  writeFileSync(reportPath, report, 'utf8');
  console.log('Report', reportPath);

  const h1Fail = SERVICE_PAGES.some((p) => after[p.path].h1Count !== 1 || after[p.path].hasEntryTitle);
  const redirectFail = !redirectTest.ok;
  if (h1Fail || redirectFail || faq.status !== 200) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
