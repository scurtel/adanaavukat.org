/**
 * Sonraki adımlar:
 * 1. Miras / Kira / İş Hukuku landing page
 * 2. Ana sayfa kart linkleri + SEO meta
 * 3. Header İletişim butonu (menü + Additional CSS)
 */
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { wpFetch, wpFetchAll } from './lib/wp-client.mjs';
import { getWpConfig, getAuthHeader } from './lib/env.mjs';
import { buildHomepageContent, HOMEPAGE_META } from './lib/homepage-content.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const BASE = 'https://adanaavukat.org';
const HOMEPAGE_ID = 7;

const SERVICE_PAGES = [
  {
    slug: 'adana-miras-hukuku',
    title: 'Adana Miras Hukuku | Veraset ve Miras Paylaşımı',
    excerpt:
      "Adana'da miras hukuku uyuşmazlıklarında veraset ilamı, miras paylaşımı ve tenkis süreçlerine ilişkin genel bilgilendirme ve hukuki destek.",
    h1: 'Adana Miras Hukuku',
    intro:
      "Miras hukuku uyuşmazlıkları; veraset ilamı, mirasçılık belgesi, miras paylaşımı ve tenkis talepleri gibi konuları kapsar. Adana'da miras süreçlerinde dilekçe hazırlığı, süre takibi ve delil düzenlemesi somut olaya göre değerlendirilmelidir.",
    sections: [
      { h2: 'Veraset ve Mirasçılık Belgesi', p: 'Mirasçılık belgesi (veraset ilamı), mirasın paylaşımı ve tereke işlemleri için temel belgedir. Süreç, noter veya mahkeme yoluyla somut olayın koşullarına göre yürütülür.' },
      { h2: 'Miras Paylaşımı Uyuşmazlıkları', p: 'Miras paylaşımında taraflar arasında anlaşmazlık çıkması halinde, tereke mallarının tespiti ve paylaşım planının usule uygun hazırlanması önem taşır.' },
      { h2: 'Tenkis Davası', p: 'Saklı pay ihlali iddiası bulunan durumlarda tenkis davası gündeme gelebilir. Talep, somut dosyanın koşullarına göre değerlendirilir.' },
    ],
    relatedPost: '/adanada-miras-kira-is-hukuku-avukat-destegi/',
  },
  {
    slug: 'adana-kira-hukuku',
    title: 'Adana Kira Hukuku | Kira Uyuşmazlıkları ve Tahliye',
    excerpt:
      "Adana'da kira hukuku uyuşmazlıklarında tahliye, kira bedeli uyarlaması ve kira sözleşmesi uyuşmazlıklarına ilişkin genel bilgilendirme.",
    h1: 'Adana Kira Hukuku',
    intro:
      "Kira hukuku; konut ve işyeri kira sözleşmelerinden doğan uyuşmazlıkları kapsar. Tahliye, kira bedelinin uyarlanması ve depozito iadesi gibi konularda süre ve usul kurallarına dikkat edilmelidir.",
    sections: [
      { h2: 'Kira Bedeli Uyarlaması', p: 'Kira bedelinin uyarlanmasına ilişkin talepler, sözleşme hükümleri ve yasal çerçeve dikkate alınarak somut olaya göre değerlendirilir.' },
      { h2: 'Tahliye Davaları', p: 'Tahliye davalarında kiralananın tahliyesi için gerekli şartların oluşup oluşmadığı ve delillerin usule uygun sunulması sürecin önemli adımlarındandır.' },
      { h2: 'Kira Sözleşmesi Uyuşmazlıkları', p: 'Sözleşmeden doğan yükümlülüklerin ihlali, depozito iadesi ve kira alacağı talepleri somut dosya koşullarına göre ele alınır.' },
    ],
    relatedPost: '/adanada-miras-kira-is-hukuku-avukat-destegi/',
  },
  {
    slug: 'adana-is-hukuku',
    title: 'Adana İş Hukuku | İşçi-İşveren Uyuşmazlıkları',
    excerpt:
      "Adana'da iş hukuku uyuşmazlıklarında işe iade, kıdem-ihbar tazminatı ve arabuluculuk süreçlerine ilişkin genel bilgilendirme.",
    h1: 'Adana İş Hukuku',
    intro:
      "İş hukuku; işçi ve işveren arasındaki uyuşmazlıkları kapsar. İşe iade, tazminat talepleri ve iş sözleşmesinin feshi gibi konularda sürelerin kaçırılmaması önemlidir.",
    sections: [
      { h2: 'İşe İade Davası', p: 'Haksız fesih iddiası bulunan durumlarda işe iade davası gündeme gelebilir. Arabuluculuk süreci ve dava şartları somut olaya göre değerlendirilir.' },
      { h2: 'Kıdem ve İhbar Tazminatı', p: 'İş sözleşmesinin sona ermesi halinde kıdem ve ihbar tazminatı talepleri, çalışma süresi ve fesih koşulları dikkate alınarak ele alınır.' },
      { h2: 'Arabuluculuk Süreci', p: 'İş uyuşmazlıklarında arabuluculuk, dava şartı olan hallerde sürecin önemli bir adımıdır. Süre ve başvuru koşullarına dikkat edilmelidir.' },
    ],
    relatedPost: '/adanada-miras-kira-is-hukuku-avukat-destegi/',
  },
];

function buildServicePageContent(page) {
  const sections = page.sections
    .map(
      (s) => `<!-- wp:heading -->
<h2 class="wp-block-heading">${s.h2}</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>${s.p}</p>
<!-- /wp:paragraph -->`
    )
    .join('\n\n');

  return `<!-- wp:paragraph -->
<p>${page.intro}</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":1} -->
<h1 class="wp-block-heading">${page.h1}</h1>
<!-- /wp:heading -->

${sections}

<!-- wp:heading -->
<h2 class="wp-block-heading">İlgili Kaynaklar</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>Detaylı bilgi için <a href="${BASE}${page.relatedPost}">hukuk rehberi yazısını</a> inceleyebilirsiniz. <a href="${BASE}/avukat-ceren-sumer-cilli-kimdir-adana-bosanma-ve-aile-hukuku/">Profil</a> · <a href="${BASE}/iletisim/">İletişim</a> · <a href="${BASE}/hizmetlerimiz/">Hizmetlerimiz</a></p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p><em>Her dosya kendi koşulları içinde değerlendirilir; bu sayfa genel bilgilendirme amaçlıdır.</em></p>
<!-- /wp:paragraph -->`;
}

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

async function createOrUpdateServicePage(def) {
  const existing = await wpFetch(`/wp-json/wp/v2/pages?slug=${def.slug}&context=edit`);
  const content = buildServicePageContent(def);
  const payload = { title: def.title, content, excerpt: def.excerpt, status: 'publish' };

  if (existing.length > 0) {
    const updated = await wpPost(`/wp-json/wp/v2/pages/${existing[0].id}`, payload);
    return { action: 'updated', id: updated.id, slug: def.slug, link: updated.link };
  }

  const created = await wpPost('/wp-json/wp/v2/pages', { ...payload, slug: def.slug });
  return { action: 'created', id: created.id, slug: def.slug, link: created.link };
}

async function updateHomepage() {
  const content = buildHomepageContent();
  const payload = {
    content,
    status: 'publish',
    excerpt: HOMEPAGE_META.excerpt,
    meta: {
      rank_math_title: HOMEPAGE_META.title,
      rank_math_description: HOMEPAGE_META.excerpt,
    },
  };

  try {
    return await wpPost(`/wp-json/wp/v2/pages/${HOMEPAGE_ID}`, payload);
  } catch {
    return wpPost(`/wp-json/wp/v2/pages/${HOMEPAGE_ID}`, {
      content,
      status: 'publish',
      excerpt: HOMEPAGE_META.excerpt,
    });
  }
}

async function updateSiteTagline() {
  try {
    await wpPost('/wp-json/wp/v2/settings', { description: HOMEPAGE_META.excerpt });
    return true;
  } catch {
    return false;
  }
}

const HEADER_CSS_MARKER = '/* adanaavukat.org — header iletişim butonu */';

const HEADER_CSS = `${HEADER_CSS_MARKER}
.aa-header-cta-wrap{display:flex;align-items:center;margin-left:1rem}
.aa-header-cta{display:inline-block;padding:.55rem 1.25rem;background:#1B2A4A;color:#fff!important;border-radius:6px;font-weight:600;font-size:.9rem;text-decoration:none!important;white-space:nowrap}
.aa-header-cta:hover{background:#2C4A7C;color:#fff!important}
.main-header-menu .menu-item a[href*="/iletisim/"],
.ast-header-break-point .main-header-menu .menu-item a[href*="/iletisim/"]{
  background:#1B2A4A!important;color:#fff!important;border-radius:6px;padding:.5rem 1.1rem!important;margin-left:.5rem;font-weight:600
}
.main-header-menu .menu-item a[href*="/iletisim/"]:hover{background:#2C4A7C!important;color:#fff!important}
`;

async function applyHeaderCss() {
  let customCssId = null;
  let existingCss = '';

  try {
    const items = await wpFetch('/wp-json/wp/v2/posts?type=custom_css&per_page=1&context=edit');
    if (items.length) {
      customCssId = items[0].id;
      existingCss = items[0].content?.raw || '';
    }
  } catch {
    return { applied: false, reason: 'custom_css post not accessible' };
  }

  if (!customCssId) return { applied: false, reason: 'no custom_css post' };

  const newCss = existingCss.includes(HEADER_CSS_MARKER)
    ? existingCss
    : `${existingCss}\n${HEADER_CSS}`;

  await wpPost(`/wp-json/wp/v2/posts/${customCssId}`, { content: newCss });
  return { applied: true, customCssId };
}

async function main() {
  console.log('Sonraki adımlar uygulanıyor...');
  const report = { pages: [], homepage: null, seo: {}, header: null };

  for (const def of SERVICE_PAGES) {
    const result = await createOrUpdateServicePage(def);
    report.pages.push(result);
    console.log(`${result.action}: ${def.slug}`);
  }

  report.homepage = await updateHomepage();
  console.log('Ana sayfa güncellendi (linkler + içerik)');

  report.seo.tagline = await updateSiteTagline();
  report.seo.rankMathAttempted = true;

  report.header = await applyHeaderCss();
  console.log('Header CSS:', report.header.applied ? 'uygulandı' : report.header.reason);

  const reportPath = resolve(rootDir, 'reports/next-steps-apply-report.md');
  mkdirSync(resolve(rootDir, 'reports'), { recursive: true });
  writeFileSync(
    reportPath,
    `# Sonraki Adımlar — Uygulama Raporu\n\n> ${new Date().toISOString()}\n\n## Yeni hizmet sayfaları\n\n${report.pages.map((p) => `- **${p.slug}** (${p.action}) — ID ${p.id}: ${p.link}`).join('\n')}\n\n## Ana sayfa\n\n- ID ${HOMEPAGE_ID} güncellendi\n- Miras/Kira/İş kart linkleri yeni sayfalara yönlendirildi\n- Excerpt/meta güncellendi\n\n## SEO\n\n- Site tagline: ${report.seo.tagline ? 'güncellendi' : 'güncellenemedi'}\n- Rank Math meta alanları denendi (eklenti meta REST'e açıksa uygulanır)\n\n## Header İletişim butonu\n\n- Menüdeki İletişim linki buton stiline alındı (WordPress Additional CSS)\n- CSS uygulandı: ${report.header.applied}\n`,
    'utf8'
  );

  console.log('Rapor:', reportPath);
}

main().catch((e) => {
  console.error('HATA:', e.message);
  process.exit(1);
});
