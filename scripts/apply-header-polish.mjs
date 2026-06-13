/**
 * Site geneli header ince ayar — WordPress Additional CSS güncelleme.
 */
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';
import { wpFetch } from './lib/wp-client.mjs';
import { getWpConfig, getAuthHeader } from './lib/env.mjs';

async function wpPost(path, body) {
  const { baseUrl, username, appPassword } = getWpConfig();
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(username, appPassword),
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${path} failed ${response.status}: ${text.slice(0, 400)}`);
  }
  return response.json();
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const reportDir = resolve(__dirname, '../reports');

const OLD_MARKER = '/* adanaavukat.org — header iletişim butonu */';
const START = '/* adanaavukat.org — header polish start */';
const END = '/* adanaavukat.org — header polish end */';

const HEADER_CSS = `${START}
.site-header{border-bottom:1px solid rgba(15,39,71,.07);background:#fff;box-shadow:0 1px 0 rgba(15,39,71,.04)}
.site-header .main-header-bar{max-width:1120px;margin:0 auto;padding:.75rem 1.25rem!important}
.site-header .main-header-menu .menu-item>a{
  padding:.5rem .75rem;font-size:.875rem;font-weight:500;color:#3d4f63;
  border-radius:6px;transition:color .15s,background .15s
}
.site-header .main-header-menu .menu-item>a:hover{color:#0f2747;background:rgba(15,39,71,.04)}
.site-header .site-title a,.site-header .site-title{
  font-weight:700;font-size:1.0625rem;letter-spacing:-.02em;color:#0f2747
}
.site-header .ast-site-identity{padding:0}
.main-header-menu .menu-item a[href*="/iletisim/"],
.ast-header-break-point .main-header-menu .menu-item a[href*="/iletisim/"]{
  background:#0f2747!important;color:#fff!important;border-radius:8px!important;
  padding:.55rem 1.2rem!important;margin-left:.4rem;font-weight:600!important;
  box-shadow:0 2px 10px rgba(15,39,71,.18);transition:background .2s,transform .2s,box-shadow .2s!important
}
.main-header-menu .menu-item a[href*="/iletisim/"]:hover,
.ast-header-break-point .main-header-menu .menu-item a[href*="/iletisim/"]:hover{
  background:#1a3a5c!important;color:#fff!important;transform:translateY(-1px);
  box-shadow:0 4px 14px rgba(15,39,71,.22)
}
@media(max-width:921px){
  .site-header .main-header-bar{padding:.65rem 1rem!important}
  .main-header-menu .menu-item a[href*="/iletisim/"]{margin-left:0;margin-top:.5rem;display:inline-block}
}
${END}`;

function stripOldBlocks(css) {
  let out = css;
  if (out.includes(OLD_MARKER)) {
    const start = out.indexOf(OLD_MARKER);
    const rest = out.slice(start + OLD_MARKER.length);
    const nextBlock = rest.search(/\n\/\* adanaavukat/);
    const cut = nextBlock >= 0 ? start + OLD_MARKER.length + nextBlock : out.length;
    out = out.slice(0, start) + out.slice(cut);
  }
  if (out.includes(START) && out.includes(END)) {
    const s = out.indexOf(START);
    const e = out.indexOf(END) + END.length;
    out = out.slice(0, s) + out.slice(e);
  }
  return out.trim();
}

async function main() {
  const items = await wpFetch('/wp-json/wp/v2/posts?type=custom_css&per_page=1&context=edit');
  if (!items.length) {
    console.log('custom_css bulunamadı');
    process.exit(1);
  }

  const post = items[0];
  const cleaned = stripOldBlocks(post.content?.raw || '');
  const newCss = `${cleaned}\n\n${HEADER_CSS}`.trim();

  await wpPost(`/wp-json/wp/v2/posts/${post.id}`, { content: newCss });

  const report = `# Header Polish — Uygulama Raporu\n\n> ${new Date().toISOString()}\n\n- Additional CSS güncellendi (ID ${post.id})\n- Eski header kuralları kaldırıldı, v2 polish eklendi\n- Site geneli: menü, logo, İletişim butonu\n`;
  const reportPath = resolve(reportDir, 'header-polish-report.md');
  writeFileSync(reportPath, report, 'utf8');

  console.log('Header polish uygulandı — custom_css ID:', post.id);
  console.log('Rapor:', reportPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
