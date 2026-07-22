/**
 * Avukat profil sayfası (#268) içerik sabitleri, sanitizer ve HTML derleyici.
 */

export const PROFILE_PAGE_ID = 268;
export const PROFILE_SLUG = 'avukat-ceren-sumer-cilli';
export const PROFILE_URL = `https://adanaavukat.org/${PROFILE_SLUG}/`;
export const PROFILE_PHOTO =
  'https://adanaavukat.org/wp-content/uploads/2026/05/Avukat-Ceren-Sumer-Cilli.jpg';
export const PROFILE_PHOTO_ID = 269;

export const LINKS = {
  aileHukuku: {
    href: 'https://adanaavukat.org/adana-aile-hukuku-avukati/',
    label: 'aile hukuku',
  },
  rehber: {
    href: 'https://adanaavukat.org/aile-hukuku-rehberi/',
    label: 'Aile Hukuku Rehberi',
  },
  bosanma: {
    href: 'https://adanaavukat.org/adana-bosanma-avukati/',
    label: 'boşanma davaları',
  },
  anlasmali: {
    href: 'https://adanaavukat.org/adana-anlasmali-bosanma-avukati/',
    label: 'anlaşmalı boşanma',
  },
  cekismeli: {
    href: 'https://adanaavukat.org/cekismeli-bosanma-davasi/',
    label: 'çekişmeli boşanma',
  },
  velayet: {
    href: 'https://adanaavukat.org/velayet-davasi-avukati-adana/',
    label: 'velayet davası',
  },
  nafaka: {
    href: 'https://adanaavukat.org/nafaka-davasi/',
    label: 'nafaka davası',
  },
  malPaylasimi: {
    href: 'https://adanaavukat.org/adana-ortakligin-giderilmesi-davasi-avukat/',
    label: 'mal paylaşımı',
  },
  gayrimenkul: {
    href: 'https://adanaavukat.org/gayrimenkul-avukati-adana/',
    label: 'gayrimenkul hukuku',
  },
  iletisim: {
    href: 'https://adanaavukat.org/iletisim/',
    label: 'iletişim',
  },
  resmiSite: {
    href: 'https://www.cerensumer.av.tr/adana-bosanma-avukati-ceren-sumer-cilli-kimdir/',
    label: 'resmî web sitesi',
  },
};

export const PRESERVE_MARKERS = {
  articlesShortcode: '[ceren_aile_makaleleri]',
  recentShortcode: '[ceren_son_guncellenen]',
};

export const BANNED_BIO_PATTERNS = [
  /baro\s*sicil/i,
  /mezuniyet\s*yıl/i,
  /\d{4}\s*yılında\s*mezun/i,
  /mesleğe\s*başlama/i,
  /\d+\s*yıllık\s*deneyim/i,
  /sertifika/i,
  /ödül/i,
  /\d+\s*başarılı\s*dava/i,
  /müvekkil\s*sayısı/i,
  /başarı\s*oranı/i,
  /%?\s*yüzde\s*yüz/i,
  /en\s*iyi\s*avukat/i,
  /uzman\s*avukat/i,
  /lider\s*avukat/i,
  /kesin\s*sonuç/i,
  /garanti(li)?\s*(başarı|sonuç)/i,
  /mutlaka\s*kazan/i,
  /rakipsiz/i,
  /binlerce\s*başarılı/i,
];

export const BANNED_PHRASE_CHECKS = [
  'en iyi avukat',
  'bir numaralı',
  'uzman boşanma',
  'uzman avukat',
  'kesin sonuç',
  'garantili başarı',
  'garantili',
  'mutlaka kazan',
  'rakipsiz',
  'yüzde yüz',
  'en hızlı boşanma',
  'müvekkillerimizin tamamı',
  'binlerce başarılı',
  'başarı oranı',
];

export const SEO = {
  title: 'Avukat Ceren Sümer Cilli | Adana Aile Hukuku',
  description:
    'Avukat Ceren Sümer Cilli profili: Adana’da aile hukuku, boşanma, velayet, nafaka, mal rejimi, ziynet ve aile konutu konularında genel bilgilendirme.',
  focusKeyword: 'Avukat Ceren Sümer Cilli',
  additionalKeywords:
    'Adana aile hukuku, boşanma davaları, velayet, nafaka, mal rejiminin tasfiyesi, ziynet alacağı, aile konutu, 6284 sayılı Kanun',
};

export const DISCLAIMER =
  'Üniversite, baro sicil numarası, sertifika veya mesleki deneyim yılı gibi alanlar bu sayfada uydurulmamıştır. Doğrulanabilir resmî bilgiler yalnızca kaynak gösterilerek eklenebilir.';

export function countWords(text = '') {
  return String(text)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean).length;
}

export function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function linkifyKnownUrls(html, links = LINKS) {
  const slots = [];
  const tokenized = String(html).replace(/\[\[([a-zA-Z]+)\|([^\]]+)\]\]/g, (_, key, anchor) => {
    const item = links[key];
    const idx = slots.length;
    slots.push(item ? `<a href="${item.href}">${escapeHtml(anchor)}</a>` : escapeHtml(anchor));
    return `%%LINK${idx}%%`;
  });
  return escapeHtml(tokenized).replace(/%%LINK(\d+)%%/g, (_, n) => slots[Number(n)]);
}

export function paragraphsToHtml(paragraphs = [], links = LINKS) {
  return paragraphs
    .filter((p) => p && String(p).trim())
    .map((p) => `<p>${linkifyKnownUrls(String(p).trim(), links)}</p>`)
    .join('\n');
}

export function findBannedHits(text = '', { ignoreDisclaimer = true } = {}) {
  let check = String(text);
  if (ignoreDisclaimer) {
    check = check
      .replace(DISCLAIMER, ' ')
      .replace(
        /Üniversite,\s*baro\s*sicil\s*numarası[\s\S]{0,180}?eklenebilir\./gi,
        ' '
      )
      .replace(/doğrulanabilir\s+resm[iî]\s+bilgiler[\s\S]{0,120}?eklenebilir\./gi, ' ');
  }
  const hits = new Set();
  const lower = check.toLowerCase();
  for (const phrase of BANNED_PHRASE_CHECKS) {
    if (lower.includes(phrase)) hits.add(phrase);
  }
  for (const re of BANNED_BIO_PATTERNS) {
    if (re.test(check)) hits.add(re.source);
  }
  return [...hits];
}

export function sanitizeProfileText(text = '') {
  let out = String(text);
  const notes = [];
  const replacements = [
    [/uzman avukat/gi, 'avukat'],
    [/uzman boşanma avukatı/gi, 'boşanma süreçleri'],
    [/en iyi avukat/gi, 'avukat'],
    [/kesin sonuç/gi, 'somut olayın koşullarına göre değerlendirme'],
    [/garantili başarı/gi, 'ölçülü hukuki değerlendirme'],
    [/garantili/gi, ''],
    [/mutlaka kazanırız?/gi, 'süreci usule uygun yürütmek gerekir'],
    [/yüzde yüz başarı/gi, ''],
    [/başarı oranı/gi, ''],
    [/hemen ara[!.]?/gi, ''],
    [/fırsatı kaçırma/gi, ''],
  ];
  for (const [re, to] of replacements) {
    if (re.test(out)) {
      out = out.replace(re, to);
      notes.push(re.source);
    }
  }
  out = out.replace(/\s{2,}/g, ' ').trim();
  return { text: out, notes };
}

export function sanitizeContentObject(content) {
  const clone = structuredClone(content);
  const walk = (node) => {
    if (typeof node === 'string') {
      return sanitizeProfileText(node).text;
    }
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === 'object') {
      for (const key of Object.keys(node)) node[key] = walk(node[key]);
    }
    return node;
  };
  return walk(clone);
}

function tocHtml(items) {
  const lis = items
    .map((it) => `<li><a href="#${it.id}">${escapeHtml(it.label)}</a></li>`)
    .join('');
  return `<nav class="aa-profile__toc" aria-label="İçindekiler">
  <h2>İçindekiler</h2>
  <ol>${lis}</ol>
</nav>`;
}

function faqHtml(faqs = []) {
  if (!faqs.length) return '';
  const items = faqs
    .map((f, i) => {
      const linked = linkifyKnownUrls(String(f.answer).trim());
      return `<div class="aa-profile__faq-item" id="faq-${i + 1}">
  <h3>${escapeHtml(f.question)}</h3>
  <p>${linked}</p>
</div>`;
    })
    .join('\n');
  return `<section class="aa-profile__faq" id="sik-sorulan-sorular">
  <h2>Sık sorulan sorular</h2>
  ${items}
</section>`;
}

export function buildProfileJsonLd(content) {
  const faqs = content.faq || [];
  const graph = [
    {
      '@type': 'ProfilePage',
      '@id': `${PROFILE_URL}#profilepage`,
      url: PROFILE_URL,
      name: 'Avukat Ceren Sümer Cilli',
      isPartOf: { '@id': 'https://adanaavukat.org/#website' },
      mainEntity: { '@id': `${PROFILE_URL}#person` },
      about: { '@id': `${PROFILE_URL}#person` },
    },
    {
      '@type': 'Person',
      '@id': `${PROFILE_URL}#person`,
      name: 'Avukat Ceren Sümer Cilli',
      honorificPrefix: 'Av.',
      jobTitle: 'Avukat',
      description:
        content.lead ||
        'Adana’da aile hukuku alanında çalışan avukat. Boşanma, velayet, nafaka, mal rejimi, ziynet alacağı, aile konutu ve 6284 sayılı Kanun konularında bilgilendirici içerikler yayımlar.',
      url: PROFILE_URL,
      mainEntityOfPage: PROFILE_URL,
      image: PROFILE_PHOTO,
      subjectOf: {
        '@type': 'WebPage',
        name: 'Avukat Ceren Sümer Cilli Kimdir?',
        url: LINKS.resmiSite.href,
      },
      worksFor: { '@id': 'https://adanaavukat.org/#legalservice' },
      knowsAbout: [
        'Aile Hukuku',
        'Boşanma Hukuku',
        'Velayet',
        'Nafaka',
        'Mal Rejiminin Tasfiyesi',
        'Ziynet Alacağı',
        'Aile Konutu',
        '6284 Sayılı Kanun',
      ],
      sameAs: [
        LINKS.resmiSite.href,
        'https://www.linkedin.com/in/avukat-ceren-s%C3%BCmer-cilli-375873b0/',
        'https://www.instagram.com/av.cerensumercilli/',
        'https://www.facebook.com/cerensumercilli/',
      ],
    },
    {
      '@type': 'LegalService',
      '@id': 'https://adanaavukat.org/#legalservice',
      name: 'Ceren Sümer Cilli Hukuk ve Danışmanlık',
      url: 'https://adanaavukat.org',
      provider: { '@id': `${PROFILE_URL}#person` },
      hasMap:
        'https://www.google.com/maps/search/?api=1&query=Avukat+Ceren+S%C3%BCmer+Cilli+Adana',
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${PROFILE_URL}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Ana Sayfa', item: 'https://adanaavukat.org/' },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Avukat Ceren Sümer Cilli',
          item: PROFILE_URL,
        },
      ],
    },
  ];

  if (faqs.length) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${PROFILE_URL}#faq`,
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: String(f.answer).replace(/\[\[([a-zA-Z]+)\|([^\]]+)\]\]/g, '$2'),
        },
      })),
    });
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}

export function buildProfilePageHtml(content) {
  const c = sanitizeContentObject(content);
  const toc = [
    { id: 'mesleki-yaklasim', label: 'Mesleki yaklaşım' },
    { id: 'calisma-alanlari', label: 'Çalışma alanları' },
    { id: 'bosanma-davalari', label: 'Boşanma davaları' },
    { id: 'velayet', label: 'Velayet ve kişisel ilişki' },
    { id: 'nafaka', label: 'Nafaka uyuşmazlıkları' },
    { id: 'mal-rejimi', label: 'Mal rejiminin tasfiyesi' },
    { id: 'ziynet', label: 'Ziynet ve eşya alacakları' },
    { id: 'aile-konutu', label: 'Aile konutu' },
    { id: 'kanun-6284', label: '6284 sayılı Kanun' },
    { id: 'degerlendirme-sureci', label: 'Değerlendirme süreci' },
    { id: 'sik-sorulan-sorular', label: 'Sık sorulan sorular' },
    { id: 'makaleler', label: 'Yayınlanan makaleler' },
  ];

  const practiceList = (c.practiceAreas || [])
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join('\n');

  const practiceLinks = (c.practiceLinks || [
    { label: 'Boşanma davaları ve deliller', key: 'bosanma' },
    { label: 'Anlaşmalı boşanma', key: 'anlasmali' },
    { label: 'Çekişmeli boşanma', key: 'cekismeli' },
    { label: 'Velayet ve çocukla kişisel ilişki', key: 'velayet' },
    { label: 'Nafaka uyuşmazlıkları', key: 'nafaka' },
    { label: 'Mal rejimi ve ekonomik uyuşmazlıklar', key: 'malPaylasimi' },
    { label: 'Gayrimenkul hukuku', key: 'gayrimenkul' },
    { label: 'Aile hukuku genel bilgilendirme', key: 'aileHukuku' },
  ])
    .map((item) => {
      const link = LINKS[item.key];
      if (!link) return '';
      return `<li><strong>${escapeHtml(item.label)}</strong> — <a href="${link.href}">${escapeHtml(link.label)}</a></li>`;
    })
    .filter(Boolean)
    .join('\n');

  const processSteps = (c.evaluationProcess || [])
    .map((step, i) => `<li><strong>${i + 1}.</strong> ${escapeHtml(step)}</li>`)
    .join('\n');

  const html = `<!-- wp:html -->
<article class="aa-profile" itemscope itemtype="https://schema.org/Person">
  <h1 itemprop="name">Avukat Ceren Sümer Cilli</h1>
  <p class="aa-profile__lead" itemprop="description">${linkifyKnownUrls(c.lead)}</p>

  <figure class="wp-block-image size-full">
    <img decoding="async" loading="eager" fetchpriority="high" data-no-lazy="1" width="225" height="225" src="${PROFILE_PHOTO}" srcset="${PROFILE_PHOTO} 225w" sizes="(max-width: 280px) 100vw, 225px" alt="Avukat Ceren Sümer Cilli" class="aa-profile-photo skip-lazy aa-skip-lazy wp-image-${PROFILE_PHOTO_ID}" itemprop="image" />
    <figcaption>Avukat Ceren Sümer Cilli</figcaption>
  </figure>

  ${tocHtml(toc)}

  <section id="mesleki-yaklasim">
  <h2>Mesleki yaklaşım</h2>
  ${paragraphsToHtml(c.approach)}
  <p><em>Not:</em> ${escapeHtml(c.disclaimer || DISCLAIMER)}</p>
  </section>

  <section id="calisma-alanlari">
  <h2>Aile hukuku çalışma alanları</h2>
  <ul>
${practiceList}
  </ul>
  <ul>
${practiceLinks}
  </ul>
  </section>

  <section id="bosanma-davalari">
  <h2>Boşanma davaları</h2>
  ${paragraphsToHtml(c.divorce?.intro || [])}
  <h3>Anlaşmalı boşanma</h3>
  ${paragraphsToHtml(c.divorce?.consensual || [])}
  <h3>Çekişmeli boşanma</h3>
  ${paragraphsToHtml(c.divorce?.contested || [])}
  </section>

  <section id="velayet">
  <h2>Velayet ve çocukla kişisel ilişki</h2>
  ${paragraphsToHtml(c.custody)}
  </section>

  <section id="nafaka">
  <h2>Nafaka uyuşmazlıkları</h2>
  ${paragraphsToHtml(c.alimony)}
  </section>

  <section id="mal-rejimi">
  <h2>Mal rejiminin tasfiyesi</h2>
  ${paragraphsToHtml(c.propertyRegime)}
  </section>

  <section id="ziynet">
  <h2>Ziynet ve eşya alacakları</h2>
  ${paragraphsToHtml(c.jewelry)}
  </section>

  <section id="aile-konutu">
  <h2>Aile konutu uyuşmazlıkları</h2>
  ${paragraphsToHtml(c.familyHome)}
  </section>

  <section id="kanun-6284">
  <h2>6284 sayılı Kanun kapsamındaki tedbirler</h2>
  ${paragraphsToHtml(c.law6284)}
  </section>

  <section id="degerlendirme-sureci">
  <h2>Aile hukuku dosyasında değerlendirme süreci</h2>
  ${paragraphsToHtml(c.evaluationIntro || [])}
  <ol class="aa-profile__process">
${processSteps}
  </ol>
  </section>

  ${faqHtml(c.faq)}

  <section id="makaleler">
  <h2>Yayınlanan aile hukuku makaleleri</h2>
  <p>Aşağıdaki liste, sitede yayımlanan aile hukuku yazılarından otomatik olarak üretilir.</p>
  ${PRESERVE_MARKERS.articlesShortcode}
  </section>

  <h2>Son güncellenen içerikler</h2>
  ${PRESERVE_MARKERS.recentShortcode}

  <h2>Avukat Ceren Sümer Cilli’yi Diğer Platformlarda Görüntüleyin</h2>
  <ul class="aa-official-profiles">
    <li><a href="${LINKS.resmiSite.href}" target="_blank" rel="noopener noreferrer" aria-label="Avukat Ceren Sümer Cilli resmî web sitesi (yeni sekmede açılır)">Avukat Ceren Sümer Cilli resmî web sitesi</a></li>
    <li><a href="https://www.google.com/maps/search/?api=1&query=Avukat+Ceren+S%C3%BCmer+Cilli+Adana" target="_blank" rel="noopener noreferrer" aria-label="Avukat Ceren Sümer Cilli Google Haritalar profili (yeni sekmede açılır)">Avukat Ceren Sümer Cilli Google Haritalar profili</a></li>
    <li><a href="https://www.linkedin.com/in/avukat-ceren-s%C3%BCmer-cilli-375873b0/" target="_blank" rel="noopener noreferrer" aria-label="Avukat Ceren Sümer Cilli LinkedIn profili (yeni sekmede açılır)">Avukat Ceren Sümer Cilli LinkedIn profili</a></li>
    <li><a href="https://www.instagram.com/av.cerensumercilli/" target="_blank" rel="noopener noreferrer" aria-label="Avukat Ceren Sümer Cilli Instagram profili (yeni sekmede açılır)">Avukat Ceren Sümer Cilli Instagram profili</a></li>
    <li><a href="https://www.facebook.com/cerensumercilli/" target="_blank" rel="noopener noreferrer" aria-label="Avukat Ceren Sümer Cilli Facebook sayfası (yeni sekmede açılır)">Avukat Ceren Sümer Cilli Facebook sayfası</a></li>
  </ul>

  <h2>İletişim</h2>
  <p>Hukuki süreçlerinize ilişkin genel bilgilendirme almak için <a href="${LINKS.iletisim.href}">${LINKS.iletisim.label}</a> sayfasını kullanabilirsiniz. Bu sayfa genel bilgilendirme amaçlıdır; her dosya kendi koşulları içinde değerlendirilir.</p>

  <p class="aa-profile__meta">Profil sayfası: <a itemprop="url" href="${PROFILE_URL}">${PROFILE_URL}</a></p>
</article>
<style>
.aa-profile__toc{margin:1.25rem 0 1.75rem;padding:1rem 1.15rem;background:#f5f7fa;border:1px solid rgba(15,39,71,.08);border-radius:10px;max-width:40rem}
.aa-profile__toc h2{font-size:1.05rem;margin:0 0 .65rem}
.aa-profile__toc ol{margin:0;padding-left:1.2rem}
.aa-profile__toc li{margin:.28rem 0;line-height:1.45}
.aa-profile__process{max-width:42rem;padding-left:1.25rem;margin:0 0 1.5rem}
.aa-profile__process li{margin:.55rem 0;line-height:1.6}
.aa-profile__faq{margin:1.5rem 0 2rem}
.aa-profile__faq-item{margin:0 0 .9rem;padding:1rem 1.1rem;background:#fff;border:1px solid rgba(15,39,71,.07);border-radius:10px;max-width:44rem}
.aa-profile__faq-item h3{font-size:1.02rem;margin:0 0 .45rem}
.aa-profile__faq-item p{margin:0;line-height:1.65}
.aa-official-profiles{list-style:disc;padding-left:1.25rem;margin:0 0 1.5rem;max-width:40rem}
.aa-official-profiles li{margin:.45rem 0;line-height:1.5}
.aa-official-profiles a{word-break:break-word}
@media (max-width:640px){
  .aa-profile__toc,.aa-profile__faq-item{padding:.85rem .9rem}
  .aa-official-profiles{padding-left:1rem}
}
</style>
<!-- /wp:html -->

<script type="application/ld+json" id="aa-profile-jsonld">
${JSON.stringify(buildProfileJsonLd(c), null, 2)}
</script>
`;

  return html;
}

export function extractMainContentWordCount(html) {
  // Exclude shortcode sections / platform list for "main profile" word count
  const cut = html.split('Yayınlanan aile hukuku makaleleri')[0] || html;
  return countWords(cut);
}
