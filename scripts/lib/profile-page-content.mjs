import {
  BASE_URL,
  PROFILE_URL_NEW,
  PROFILE_IMAGE,
  AUTHOR_DISPLAY_NAME,
  KNOWS_ABOUT,
  SAME_AS,
  CLUSTER_HUBS,
  PERSON_ID,
  LEGAL_SERVICE_ID,
  OFFICIAL_BIO_URL,
  HAS_MAP_URL,
  OFFICIAL_PROFILE_LINKS,
} from './ceren-authority-config.mjs';

function buildOfficialProfilesHtml() {
  const items = OFFICIAL_PROFILE_LINKS.map(
    (link) =>
      `    <li><a href="${link.href}" target="_blank" rel="noopener noreferrer" aria-label="${link.ariaLabel}">${link.label}</a></li>`
  ).join('\n');
  return `  <h2>Avukat Ceren Sümer Cilli’yi Diğer Platformlarda Görüntüleyin</h2>
  <ul class="aa-official-profiles">
${items}
  </ul>`;
}

export function buildProfilePageHtml() {
  const knowsList = KNOWS_ABOUT.map((k) => `<li>${k}</li>`).join('\n');
  const clusters = CLUSTER_HUBS.map(
    (c) =>
      `<li><strong>${c.title}</strong> — <a href="${BASE_URL}${c.primaryService}">ilgili hizmet sayfası</a></li>`
  ).join('\n');

  return `<!-- wp:html -->
<article class="aa-profile" itemscope itemtype="https://schema.org/Person">
  <h1 itemprop="name">Avukat Ceren Sümer Cilli</h1>
  <p class="aa-profile__lead" itemprop="description">Avukat Ceren Sümer Cilli, Adana’da aile hukuku ve özel hukuk uyuşmazlıkları alanında çalışan bir avukattır. Çalışma alanlarında özellikle boşanma, velayet, nafaka, mal rejiminin tasfiyesi, ziynet alacağı, aile konutu ve 6284 sayılı Kanun kapsamındaki tedbirler yer alır.</p>

  <figure class="wp-block-image size-full">
    <img decoding="async" width="225" height="225" src="${PROFILE_IMAGE}" alt="Avukat Ceren Sümer Cilli" itemprop="image" />
    <figcaption>Avukat Ceren Sümer Cilli</figcaption>
  </figure>

  <h2>Kısa mesleki tanıtım</h2>
  <p>Boşanma, mal paylaşımı ve taşınmaz kaynaklı uyuşmazlıklar çoğu zaman birbirini etkileyen süreçlerdir. Evlilik birliği içinde edinilen mallar, aile konutu, hisseli taşınmazlar ve ortak mülkiyet ilişkileri; boşanma sonrasında farklı dava türlerini gündeme getirebilir. Bu nedenle hukuki değerlendirme, yalnızca dava açmakla sınırlı tutulmaz; boşanmanın mali sonuçları ve çocuklara ilişkin düzenlemeler birlikte ele alınır.</p>
  <p><em>Not:</em> Üniversite, baro sicil numarası, sertifika veya mesleki deneyim yılı gibi alanlar bu sayfada uydurulmamıştır. Doğrulanabilir resmi bilgiler manuel olarak eklenebilir.</p>

  <h2>Aile hukuku çalışma alanları</h2>
  <ul>
${knowsList}
  </ul>
  <ul>
${clusters}
  </ul>

  <h2>Boşanma davaları</h2>
  <p>Anlaşmalı ve çekişmeli boşanma süreçlerinde protokol hazırlığı, delillerin değerlendirilmesi, tazminat ve nafaka talepleri dosyanın koşullarına göre incelenir. Ayrıntılar için <a href="${BASE_URL}/adana-bosanma-avukati/">Adana boşanma avukatı</a> ve <a href="${BASE_URL}/aile-hukuku-rehberi/">Aile Hukuku Rehberi</a> sayfalarına bakabilirsiniz.</p>

  <h2>Velayet ve çocukla kişisel ilişki</h2>
  <p>Velayet düzenlemelerinde çocuğun üstün yararı esas alınır. Sosyal inceleme, pedagog değerlendirmesi ve çocukla kişisel ilişki konularında bilgilendirici içerikler <a href="${BASE_URL}/velayet-davasi-avukati-adana/">velayet davası</a> sayfasında ve rehber yazılarında yer alır.</p>

  <h2>Nafaka uyuşmazlıkları</h2>
  <p>Tedbir, iştirak ve yoksulluk nafakası; artırım, azaltım ve kaldırma talepleri somut olayın koşullarına göre değerlendirilir. Bkz. <a href="${BASE_URL}/nafaka-davasi/">nafaka davası</a>.</p>

  <h2>Mal rejiminin tasfiyesi</h2>
  <p>Katılma alacağı, değer artış payı ve evlilik birliği içinde edinilen malların tasfiyesi; boşanma ile birlikte veya sonrasında gündeme gelebilir. İlgili bilgilendirme: <a href="${BASE_URL}/adana-ortakligin-giderilmesi-davasi-avukat/">mal paylaşımı / ortaklığın giderilmesi</a>.</p>

  <h2>Ziynet alacağı</h2>
  <p>Ziynet eşyalarına ilişkin talepler, ispat ve iade uyuşmazlıkları aile hukuku uygulamasında sık görülen konular arasındadır. Güncel rehber yazıları Aile Hukuku Rehberi altında yayımlanır.</p>

  <h2>Aile konutu uyuşmazlıkları</h2>
  <p>Aile konutunun şerhi, tahsis ve taşınmazın el değiştirmesine ilişkin uyuşmazlıklar; boşanma ve mal rejimi süreçleriyle birlikte değerlendirilir.</p>

  <h2>6284 sayılı Kanun kapsamındaki tedbirler</h2>
  <p>6284 sayılı Kanun kapsamında koruma ve uzaklaştırma tedbirleri, şiddet mağdurunun hakları ve tedbir ihlali konularında genel bilgilendirme sunulur. Kesin sonuç veya dava sonucu iddiası içermez; somut olay için bireysel hukuki değerlendirme gerekir.</p>

  <h2>Yayınlanan aile hukuku makaleleri</h2>
  <p>Aşağıdaki liste, sitede yayımlanan aile hukuku yazılarından otomatik olarak üretilir.</p>
  [ceren_aile_makaleleri]

  <h2>Son güncellenen içerikler</h2>
  [ceren_son_guncellenen]

${buildOfficialProfilesHtml()}

  <h2>İletişim</h2>
  <p>Hukuki süreçlerinize ilişkin bilgi almak için <a href="${BASE_URL}/iletisim/">iletişim</a> sayfasını kullanabilirsiniz. Bu sayfa genel bilgilendirme amaçlıdır; her dosya kendi koşulları içinde değerlendirilir.</p>

  <p class="aa-profile__meta">Profil sayfası: <a itemprop="url" href="${PROFILE_URL_NEW}">${PROFILE_URL_NEW}</a></p>
</article>
<style>
.aa-official-profiles{list-style:disc;padding-left:1.25rem;margin:0 0 1.5rem;max-width:40rem}
.aa-official-profiles li{margin:.45rem 0;line-height:1.5}
.aa-official-profiles a{word-break:break-word}
@media (max-width:640px){
  .aa-official-profiles{padding-left:1rem}
}
</style>
<!-- /wp:html -->`;
}

export function buildProfileJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ProfilePage',
        '@id': `${PROFILE_URL_NEW}#profilepage`,
        url: PROFILE_URL_NEW,
        name: AUTHOR_DISPLAY_NAME,
        isPartOf: { '@id': `${BASE_URL}/#website` },
        mainEntity: { '@id': PERSON_ID },
        about: { '@id': PERSON_ID },
      },
      {
        '@type': 'Person',
        '@id': PERSON_ID,
        name: AUTHOR_DISPLAY_NAME,
        honorificPrefix: 'Av.',
        jobTitle: 'Avukat',
        description:
          'Adana’da aile hukuku alanında çalışan avukat. Boşanma, velayet, nafaka, mal rejimi, ziynet alacağı, aile konutu ve 6284 sayılı Kanun konularında bilgilendirici içerikler yayımlar.',
        url: PROFILE_URL_NEW,
        mainEntityOfPage: PROFILE_URL_NEW,
        image: PROFILE_IMAGE,
        subjectOf: {
          '@type': 'WebPage',
          name: 'Avukat Ceren Sümer Cilli Kimdir?',
          url: OFFICIAL_BIO_URL,
        },
        worksFor: { '@id': LEGAL_SERVICE_ID },
        knowsAbout: KNOWS_ABOUT,
        sameAs: SAME_AS,
      },
      {
        '@type': 'LegalService',
        '@id': LEGAL_SERVICE_ID,
        name: 'Ceren Sümer Cilli Hukuk ve Danışmanlık',
        url: BASE_URL,
        provider: { '@id': PERSON_ID },
        hasMap: HAS_MAP_URL,
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${PROFILE_URL_NEW}#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Ana Sayfa',
            item: `${BASE_URL}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: AUTHOR_DISPLAY_NAME,
            item: PROFILE_URL_NEW,
          },
        ],
      },
    ],
  };
}

export function injectProfileSchema(html, jsonLd) {
  const json = JSON.stringify(jsonLd, null, 2);
  const block = `\n<script type="application/ld+json" id="aa-profile-jsonld">\n${json}\n</script>\n`;
  if (html.includes('id="aa-profile-jsonld"')) {
    return html.replace(
      /<script type="application\/ld\+json" id="aa-profile-jsonld">[\s\S]*?<\/script>/,
      block.trim()
    );
  }
  return `${html}\n${block}`;
}
