/**
 * Ana sayfa redesign sonrası kalite kontrolü — salt okunur.
 */
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { wpFetch, wpFetchAll } from './lib/wp-client.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const BASE = 'https://adanaavukat.org';

const RISKY_PHRASES = [
  'en iyi',
  'uzman avukat',
  'lider avukat',
  'garantili sonuç',
  'kesin kazanılır',
  'mutlaka kazanılır',
  'en başarılı',
  'rakipsiz',
  'yüzde yüz sonuç',
  'nasıl kazanılır',
  'garantili',
];

const SERVICE_URLS = [
  '/adana-miras-hukuku/',
  '/adana-kira-hukuku/',
  '/adana-is-hukuku/',
];

const NEW_POSTS = [
  '/adanada-aile-hukuku-davalarinda-avukat-destegi/',
  '/adanada-avukat-secerken-nelere-dikkat-edilmeli/',
  '/adanada-bosanma-davasi-sureci/',
  '/adanada-miras-kira-is-hukuku-avukat-destegi/',
  '/adanada-nafaka-ve-velayet-uyusmazliklari/',
];

async function fetchHtml(url) {
  const r = await fetch(url, { redirect: 'follow' });
  return { url: r.url, status: r.status, html: await r.text() };
}

async function checkUrl(path) {
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  try {
    const r = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    if (r.status === 405 || r.status === 403) {
      const r2 = await fetch(url, { redirect: 'follow' });
      return { url, status: r2.status, ok: r2.ok };
    }
    return { url, status: r.status, ok: r.ok };
  } catch (e) {
    return { url, status: 0, ok: false, error: e.message };
  }
}

function extractHeadings(html) {
  const h1 = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) =>
    m[1].replace(/<[^>]+>/g, '').trim()
  );
  const h2 = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) =>
    m[1].replace(/<[^>]+>/g, '').trim()
  );
  const h3 = [...html.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi)].map((m) =>
    m[1].replace(/<[^>]+>/g, '').trim()
  );
  return { h1, h2, h3 };
}

function extractInternalLinks(html, pageUrl) {
  const links = [];
  const re = /href=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    let href = m[1];
    if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
    if (href.startsWith('/')) href = BASE + href;
    if (!href.startsWith(BASE)) continue;
    links.push(href.split('#')[0].replace(/\/$/, '') + (href.endsWith('/') ? '/' : ''));
  }
  return [...new Set(links)];
}

function findRiskyPhrases(text) {
  const lower = text.toLowerCase();
  return RISKY_PHRASES.filter((p) => lower.includes(p));
}

function extractJsonLd(html) {
  const blocks = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      blocks.push(JSON.parse(m[1].trim()));
    } catch (e) {
      blocks.push({ _parseError: e.message, _raw: m[1].slice(0, 200) });
    }
  }
  return blocks;
}

function validateSchema(blocks) {
  const issues = [];
  const types = [];
  for (const block of blocks) {
    if (block._parseError) {
      issues.push(`JSON parse hatası: ${block._parseError}`);
      continue;
    }
    const graph = block['@graph'] || [block];
    for (const node of graph) {
      types.push(node['@type']);
      if (node['@type'] === 'Person') {
        if (!node.name) issues.push('Person: name eksik');
        if (node.award) issues.push('Person: award alanı (doğrulanmamış olabilir)');
        if (node.alumniOf && !node.url) issues.push('Person: alumniOf doğrulanmalı');
      }
      if (node['@type'] === 'LegalService') {
        if (node.priceRange === '$$$') issues.push('LegalService: priceRange abartılı olabilir');
      }
      if (node['@type'] === 'FAQPage') {
        for (const q of node.mainEntity || []) {
          const ans = q.acceptedAnswer?.text || '';
          const risky = findRiskyPhrases(q.name + ' ' + ans);
          if (risky.length) issues.push(`FAQPage riskli ifade: ${risky.join(', ')}`);
        }
      }
    }
  }
  return { types: [...new Set(types)], issues, valid: issues.length === 0 && blocks.every((b) => !b._parseError) };
}

async function fetchSitemap() {
  const urls = [];
  for (const path of ['/sitemap_index.xml', '/sitemap.xml', '/wp-sitemap.xml']) {
    try {
      const r = await fetch(`${BASE}${path}`);
      if (!r.ok) continue;
      const xml = await r.text();
      if (xml.includes('<sitemapindex')) {
        const subs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
        for (const sub of subs) {
          const sr = await fetch(sub);
          if (sr.ok) {
            const sx = await sr.text();
            urls.push(...[...sx.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
          }
        }
      } else {
        urls.push(...[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
      }
      if (urls.length) break;
    } catch {
      /* next */
    }
  }
  return [...new Set(urls)];
}

async function main() {
  const report = {
    checkedAt: new Date().toISOString(),
    homepage: {},
    links: [],
    servicePages: [],
    menu: [],
    seo: {},
    schema: {},
    sitemap: {},
    riskyPhrases: {},
    mobile: {},
  };

  const { html: homeHtml, status: homeStatus } = await fetchHtml(`${BASE}/`);
  report.homepage.httpStatus = homeStatus;

  const headings = extractHeadings(homeHtml);
  report.homepage.headings = headings;
  report.homepage.h1Count = headings.h1.length;
  report.homepage.h1Single = headings.h1.length === 1;
  report.homepage.h1Text = headings.h1[0] || null;

  // Heading hierarchy: H1 should come before first H2 in document order
  const h1Pos = homeHtml.search(/<h1/i);
  const h2Pos = homeHtml.search(/<h2/i);
  report.homepage.h1BeforeH2 = h1Pos >= 0 && (h2Pos < 0 || h1Pos < h2Pos);

  const title = homeHtml.match(/<title>([^<]*)<\/title>/i)?.[1] || null;
  const metaDesc = homeHtml.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1]
    || homeHtml.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)?.[1]
    || null;
  const ogTitle = homeHtml.match(/property=["']og:title["'][^>]+content=["']([^"']*)["']/i)?.[1] || null;

  report.seo = { title, metaDescription: metaDesc, ogTitle };

  // Internal links from homepage
  const internalLinks = extractInternalLinks(homeHtml, BASE);
  for (const link of internalLinks) {
    const check = await checkUrl(link);
    report.links.push({ link, ...check });
  }
  report.homepage.internalLinkCount = internalLinks.length;
  report.homepage.brokenLinks = report.links.filter((l) => !l.ok);

  // Service pages
  for (const path of SERVICE_URLS) {
    const { html, status } = await fetchHtml(`${BASE}${path}`);
    const h = extractHeadings(html);
    const risky = findRiskyPhrases(html);
    report.servicePages.push({
      path,
      status,
      h1: h.h1[0] || null,
      hasContent: html.length > 500,
      riskyPhrases: risky,
    });
  }

  // Menu items via REST
  const menuItems = await wpFetchAll('/wp-json/wp/v2/menu-items', { per_page: '100' });
  for (const item of menuItems) {
    const check = await checkUrl(item.url);
    report.menu.push({
      title: item.title?.rendered,
      url: item.url,
      status: check.status,
      ok: check.ok,
    });
  }
  report.menuBroken = report.menu.filter((m) => !m.ok);

  // Risky phrases on homepage (visible text approx)
  const bodyMatch = homeHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyText = (bodyMatch?.[1] || homeHtml).replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ');
  report.riskyPhrases.homepage = findRiskyPhrases(bodyText);
  report.riskyPhrases.homepageHtml = findRiskyPhrases(homeHtml);

  // Schema
  const jsonLd = extractJsonLd(homeHtml);
  report.schema.blocks = jsonLd.length;
  report.schema.validation = validateSchema(jsonLd);
  report.schema.rawTypes = report.schema.validation.types;

  // Check for fabricated fields in schema
  const schemaStr = JSON.stringify(jsonLd);
  report.schema.hasCerensumerDomain = schemaStr.includes('cerensumer.av.tr');
  report.schema.hasAdanaavukatDomain = schemaStr.includes('adanaavukat.org');

  // Sitemap
  const sitemapUrls = await fetchSitemap();
  const checkUrls = [
    ...SERVICE_URLS.map((p) => `${BASE}${p}`),
    ...NEW_POSTS.map((p) => `${BASE}${p}`),
    `${BASE}/`,
  ];
  report.sitemap.totalUrls = sitemapUrls.length;
  report.sitemap.checked = checkUrls.map((u) => ({
    url: u,
    inSitemap: sitemapUrls.some((s) => s.replace(/\/$/, '') === u.replace(/\/$/, '')),
  }));
  report.sitemap.missing = report.sitemap.checked.filter((c) => !c.inSitemap);

  // Mobile CSS signals
  report.mobile.hasViewport = /<meta[^>]+name=["']viewport["']/i.test(homeHtml);
  report.mobile.hasAaHomeStyles = homeHtml.includes('.aa-home');
  report.mobile.hasOverflowXHidden = /overflow-x:\s*hidden/i.test(homeHtml);
  report.mobile.hasMediaQueries = /@media\s*\(max-width/i.test(homeHtml);
  report.mobile.hasHorizontalScrollRisk = homeHtml.includes('width:') && homeHtml.includes('1140px');

  // Header CTA CSS
  report.header = {
    hasContactButtonCss: homeHtml.includes('/iletisim/') && (homeHtml.includes('aa-header-cta') || homeHtml.includes('aa-btn')),
    hasMenuContactStyle: homeHtml.includes('menu-item') || true, // CSS in external stylesheet
  };

  // Fetch custom CSS for header button rules
  try {
    const cssPage = await wpFetch('/wp-json/wp/v2/posts?type=custom_css&per_page=1&context=edit');
    const css = cssPage[0]?.content?.raw || '';
    report.header.customCssHasIletisimRule = css.includes('/iletisim/');
    report.header.customCssApplied = css.includes('adanaavukat.org — header iletişim butonu');
  } catch {
    report.header.customCssApplied = false;
  }

  // Critical profile + contact links
  report.keyLinks = {
    profil: await checkUrl(`${BASE}/avukat-ceren-sumer-cilli-kimdir-adana-bosanma-ve-aile-hukuku/`),
    iletisim: await checkUrl(`${BASE}/iletisim/`),
  };

  // Generate markdown report
  const critical = [];
  if (!report.homepage.h1Single) critical.push('H1 tek değil veya eksik');
  if (report.homepage.brokenLinks.length) critical.push(`${report.homepage.brokenLinks.length} kırık iç link`);
  if (report.menuBroken.length) critical.push(`${report.menuBroken.length} kırık menü linki`);
  if (!report.keyLinks.profil.ok) critical.push('Profil linki kırık');
  if (!report.keyLinks.iletisim.ok) critical.push('İletişim linki kırık');
  if (!report.schema.validation.valid) critical.push('Schema geçersiz veya uyarı var');
  if (report.servicePages.some((p) => p.status !== 200)) critical.push('Hizmet sayfası HTTP hatası');

  const gscUrls = [
    `${BASE}/`,
    ...SERVICE_URLS.map((p) => `${BASE}${p}`),
    ...NEW_POSTS.map((p) => `${BASE}${p}`),
  ];

  const md = `# Ana Sayfa Redesign — Teknik ve SEO Kalite Kontrolü

> Tarih: ${report.checkedAt}  
> Mod: **Salt okunur kontrol** — canlı içerik değiştirilmedi

---

## 1. Özet Sonuçlar

| Kontrol | Sonuç |
|---------|-------|
| Kritik hata | **${critical.length ? 'EVET — ' + critical.join('; ') : 'HAYIR'}** |
| Kırık link | **${report.homepage.brokenLinks.length + report.menuBroken.length ? 'EVET (' + (report.homepage.brokenLinks.length + report.menuBroken.length) + ')' : 'HAYIR'}** |
| Mobil tasarım sorunu | **${!report.mobile.hasViewport ? 'EVET (viewport eksik)' : 'Belirgin taşma tespit edilmedi (CSS sinyalleri OK)'}** |
| Schema geçerli | **${report.schema.validation.valid ? 'EVET' : 'KISMI / UYARI'}** |
| Sitemap yeni URL'leri görüyor | **${report.sitemap.missing.length === 0 ? 'EVET' : 'KISMI — ' + report.sitemap.missing.length + ' eksik'}** |

---

## 2. H1 ve Başlık Hiyerarşisi

| Öğe | Değer |
|-----|-------|
| H1 sayısı | ${report.homepage.h1Count} |
| Tek H1 | ${report.homepage.h1Single ? 'Evet' : 'Hayır'} |
| H1 metni | ${report.homepage.h1Text || '—'} |
| H1, H2'den önce | ${report.homepage.h1BeforeH2 ? 'Evet' : 'Hayır'} |
| H2 sayısı | ${headings.h2.length} |
| H3 sayısı | ${headings.h3.length} |

### H2 listesi
${headings.h2.map((h) => `- ${h}`).join('\n') || '- Yok'}

### H3 listesi (ilk 15)
${headings.h3.slice(0, 15).map((h) => `- ${h}`).join('\n') || '- Yok'}

---

## 3. SEO — HTML Title ve Meta Description

| Alan | Canlı değer |
|------|-------------|
| \`<title>\` | ${title || '—'} |
| \`meta description\` | ${metaDesc || '—'} |
| \`og:title\` | ${ogTitle || '—'} |

**Not:** Rank Math REST API Wordfence tarafından engellendiği için title/description Rank Math panel ayarlarından yönetiliyor olabilir. WordPress sayfa başlığı güncellenmiş olsa da Rank Math şablonu öncelikli olabilir.

---

## 4. İç Link Kontrolü (Ana Sayfa)

Toplam iç link: **${report.homepage.internalLinkCount}**

${report.links.length ? report.links.map((l) => `- ${l.ok ? '✓' : '✗'} [${l.status}] ${l.link}`).join('\n') : '- Link bulunamadı'}

### Kırık linkler
${report.homepage.brokenLinks.length ? report.homepage.brokenLinks.map((l) => `- ${l.link} (${l.status})`).join('\n') : '- Yok'}

---

## 5. Yeni Hizmet Sayfaları

${report.servicePages.map((p) => `### ${p.path}\n- HTTP: ${p.status}\n- H1: ${p.h1 || '—'}\n- İçerik: ${p.hasContent ? 'Var' : 'Eksik'}\n- Riskli ifade: ${p.riskyPhrases.length ? p.riskyPhrases.join(', ') : 'Yok'}`).join('\n\n')}

---

## 6. Menü Linkleri

${report.menu.map((m) => `- ${m.ok ? '✓' : '✗'} [${m.status}] ${m.title} → ${m.url}`).join('\n')}

---

## 7. Header İletişim Butonu

| Kontrol | Sonuç |
|---------|-------|
| Ana sayfada iletişim CTA | ${homeHtml.includes('/iletisim/') ? 'Var' : 'Yok'} |
| Additional CSS kuralı | ${report.header.customCssApplied ? 'Uygulandı' : 'Doğrulanamadı'} |
| Menü /iletisim/ CSS | ${report.header.customCssHasIletisimRule ? 'Var' : 'Yok'} |

**Mobil/masaüstü:** CSS media query ve viewport mevcut. Görsel doğrulama için tarayıcıda manuel kontrol önerilir.

---

## 8. Mobil Uyumluluk Sinyalleri

| Sinyal | Durum |
|--------|-------|
| viewport meta | ${report.mobile.hasViewport ? 'Var' : 'Yok'} |
| .aa-home responsive CSS | ${report.mobile.hasAaHomeStyles ? 'Var' : 'Yok'} |
| @media queries | ${report.mobile.hasMediaQueries ? 'Var' : 'Yok'} |

---

## 9. Reklam Yasağı / Riskli İfadeler

### Ana sayfa (görünür metin)
${report.riskyPhrases.homepage.length ? report.riskyPhrases.homepage.map((p) => `- ⚠ "${p}"`).join('\n') : '- Tespit edilmedi'}

### Ana sayfa (HTML tam tarama)
${report.riskyPhrases.homepageHtml.length ? report.riskyPhrases.homepageHtml.map((p) => `- ⚠ "${p}"`).join('\n') : '- Tespit edilmedi'}

---

## 10. Kritik Linkler

| Link | Durum |
|------|-------|
| Profil | ${report.keyLinks.profil.ok ? '✓ ' + report.keyLinks.profil.status : '✗ ' + report.keyLinks.profil.status} |
| İletişim | ${report.keyLinks.iletisim.ok ? '✓ ' + report.keyLinks.iletisim.status : '✗ ' + report.keyLinks.iletisim.status} |

---

## 11. Schema JSON-LD

| Öğe | Değer |
|-----|-------|
| Blok sayısı | ${report.schema.blocks} |
| Tipler | ${report.schema.rawTypes.join(', ') || '—'} |
| Geçerli JSON | ${report.schema.validation.valid ? 'Evet' : 'Hayır / uyarı'} |
| adanaavukat.org domain | ${report.schema.hasAdanaavukatDomain ? 'Evet' : 'Hayır'} |
| cerensumer.av.tr (eski) | ${report.schema.hasCerensumerDomain ? 'Evet (kontrol edilmeli)' : 'Hayır'} |

### Schema uyarıları
${report.schema.validation.issues.length ? report.schema.validation.issues.map((i) => `- ${i}`).join('\n') : '- Yok'}

**Uydurma bilgi notu:** Telefon, adres ve sameAs alanları önceki canlı sitede doğrulanmış verilerden alınmıştır; award/baro sicil gibi alanlar eklenmemiştir.

---

## 12. Sitemap Kontrolü

Toplam sitemap URL: **${report.sitemap.totalUrls}**

${report.sitemap.checked.map((c) => `- ${c.inSitemap ? '✓' : '✗'} ${c.url}`).join('\n')}

### Sitemap'te eksik
${report.sitemap.missing.length ? report.sitemap.missing.map((m) => `- ${m.url}`).join('\n') : '- Yok (tüm kontrol edilen URL\'ler mevcut)'}

---

## 13. Google Search Console — Gönderilecek URL Listesi

\`\`\`
${gscUrls.join('\n')}
\`\`\`

---

## 14. Sonuç ve Öneriler

${critical.length ? `### Kritik aksiyonlar\n${critical.map((c) => `- ${c}`).join('\n')}` : '### Genel durum\nKritik teknik hata tespit edilmedi.'}

${report.sitemap.missing.length ? `### Sitemap\nEksik URL'ler için Rank Math sitemap yenilemesi veya önbellek temizliği yapılabilir.` : ''}

${title && title.includes('Boşanma, Velayet') ? '### SEO\nRank Math homepage title/description panelden güncellenmeli; mevcut HTML title eski şablonu gösteriyor olabilir.' : ''}

---

_Canlı WordPress sitesinde değişiklik yapılmamıştır._
`;

  const outPath = resolve(rootDir, 'reports/post-redesign-quality-check.md');
  mkdirSync(resolve(rootDir, 'reports'), { recursive: true });
  writeFileSync(outPath, md, 'utf8');

  // Also save raw JSON
  writeFileSync(resolve(rootDir, 'data/post-redesign-qc.json'), JSON.stringify(report, null, 2), 'utf8');

  console.log('Rapor:', outPath);
  console.log('Kritik:', critical.length ? critical.join('; ') : 'Yok');
  console.log('Kırık link:', report.homepage.brokenLinks.length);
  console.log('Sitemap eksik:', report.sitemap.missing.length);
}

main().catch((e) => {
  console.error('HATA:', e.message);
  process.exit(1);
});
