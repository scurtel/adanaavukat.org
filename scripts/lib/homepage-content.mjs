/**
 * Yeni ana sayfa Gutenberg içeriği ve schema üretici.
 * Reklam yasağına uygun metinler.
 */

import { buildPostCardThumb, POST_CARD_PLACEHOLDER_CSS } from './post-card-placeholder.mjs';
import { getDefaultHomepagePostCards } from './homepage-post-cards.mjs';

const BASE = 'https://adanaavukat.org';

export function buildSchemaJson() {
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${BASE}/#website`,
        url: `${BASE}/`,
        name: 'Adana Avukat',
        description:
          "Adana'da aile hukuku, boşanma, nafaka, velayet ve özel hukuk uyuşmazlıklarında hukuki destek ve genel bilgilendirme.",
        publisher: { '@id': `${BASE}/avukat-ceren-sumer-cilli/#person` },
        inLanguage: 'tr-TR',
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${BASE}/?s={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Person',
        '@id': `${BASE}/avukat-ceren-sumer-cilli/#person`,
        name: 'Avukat Ceren Sümer Cilli',
        honorificPrefix: 'Av.',
        url: `${BASE}/avukat-ceren-sumer-cilli/`,
        mainEntityOfPage: `${BASE}/avukat-ceren-sumer-cilli/`,
        jobTitle: 'Avukat',
        image: 'https://adanaavukat.org/wp-content/uploads/2026/05/Avukat-Ceren-Sumer-Cilli.jpg',
        email: 'av.cerensumer@gmail.com',
        telephone: '+90 533 634 24 25',
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'Gazipaşa Mh, Ordu Cd. Dinçkan Apt No:7 A Blok Daire:3',
          addressLocality: 'Seyhan',
          addressRegion: 'Adana',
          postalCode: '01010',
          addressCountry: 'TR',
        },
        sameAs: [
          'https://www.cerensumer.av.tr/adana-bosanma-avukati-ceren-sumer-cilli-kimdir/',
          'https://www.linkedin.com/in/avukat-ceren-s%C3%BCmer-cilli-375873b0/',
          'https://www.instagram.com/av.cerensumercilli/',
          'https://www.facebook.com/cerensumercilli/',
        ],
        subjectOf: {
          '@type': 'WebPage',
          name: 'Avukat Ceren Sümer Cilli Kimdir?',
          url: 'https://www.cerensumer.av.tr/adana-bosanma-avukati-ceren-sumer-cilli-kimdir/',
        },
        worksFor: { '@id': `${BASE}/#legalservice` },
        knowsAbout: [
          'Aile Hukuku',
          'Boşanma Hukuku',
          'Nafaka',
          'Velayet',
          'Mal Rejiminin Tasfiyesi',
          'Ziynet Alacağı',
          'Aile Konutu',
          '6284 Sayılı Kanun',
          'Mal Paylaşımı',
          'Miras Hukuku',
          'Kira Hukuku',
          'İş Hukuku',
        ],
        areaServed: {
          '@type': 'City',
          name: 'Adana',
          containedInPlace: { '@type': 'Country', name: 'Türkiye' },
        },
      },
      {
        '@type': 'LegalService',
        '@id': `${BASE}/#legalservice`,
        name: 'Adana Avukat — Av. Ceren Sümer Cilli',
        url: `${BASE}/`,
        description:
          "Adana'da aile hukuku, boşanma, nafaka, velayet ve özel hukuk uyuşmazlıklarında hukuki destek ve genel bilgilendirme.",
        telephone: '+90 533 634 24 25',
        email: 'av.cerensumer@gmail.com',
        provider: { '@id': `${BASE}/avukat-ceren-sumer-cilli/#person` },
        hasMap:
          'https://www.google.com/maps/search/?api=1&query=Avukat+Ceren+S%C3%BCmer+Cilli+Adana',
        areaServed: { '@type': 'City', name: 'Adana' },
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'Gazipaşa Mh, Ordu Cd. Dinçkan Apt No:7 A Blok Daire:3',
          addressLocality: 'Seyhan',
          addressRegion: 'Adana',
          postalCode: '01010',
          addressCountry: 'TR',
        },
        serviceType: [
          'Aile Hukuku Danışmanlığı',
          'Boşanma Davası',
          'Nafaka Davası',
          'Velayet Davası',
          'Mal Paylaşımı',
          'Miras Hukuku',
          'Kira Hukuku',
          'İş Hukuku',
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': `${BASE}/#faq`,
        mainEntity: [
          {
            '@type': 'Question',
            name: "Adana'da avukat desteği hangi durumlarda alınmalıdır?",
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Boşanma, nafaka, velayet, mal paylaşımı, miras, kira veya iş hukuku gibi uyuşmazlıklarda dilekçe hazırlığı, süre takibi veya delil düzenlemesi gerektiğinde hukuki destek alınması değerlendirilebilir. Somut olayın koşullarına göre ihtiyaç farklılık gösterebilir.',
            },
          },
          {
            '@type': 'Question',
            name: 'Boşanma davası açmadan önce nelere dikkat edilmelidir?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Evlilik birliğinin durumu, çocukların varlığı, mal rejimi ve taraflar arasındaki uzlaşma düzeyi değerlendirilmelidir. Anlaşmalı veya çekişmeli boşanma yolu, somut olaya göre belirlenir. Süre ve usul kurallarına dikkat edilmesi önemlidir.',
            },
          },
          {
            '@type': 'Question',
            name: 'Nafaka ve velayet talepleri ne zaman ileri sürülür?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Nafaka talepleri boşanma davası ile birlikte veya sonrasında, velayet talepleri ise çocuğun üstün yararı ilkesi çerçevesinde dava sürecinde ileri sürülebilir. Talep zamanlaması ve içeriği somut dosyaya göre değişir.',
            },
          },
          {
            '@type': 'Question',
            name: 'Avukatla görüşmeye giderken hangi belgeler hazırlanmalıdır?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Kimlik belgesi, evlilik cüzdanı, nüfus kayıt örneği, varsa önceki dava evrakları, gelir belgeleri ve uyuşmazlıkla ilgili yazışmalar görüşme öncesinde hazırlanabilir.',
            },
          },
          {
            '@type': 'Question',
            name: 'Hukuki süreç ne kadar sürer?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Süre, dava türüne, mahkemenin iş yüküne ve tarafların uzlaşma düzeyine göre değişir. Anlaşmalı boşanma genellikle daha kısa sürede sonuçlanabilir; çekişmeli davalarda süre uzayabilir.',
            },
          },
          {
            '@type': 'Question',
            name: 'İlk görüşmede neler değerlendirilir?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Uyuşmazlığın konusu, mevcut belgeler, süre durumu, talep edilebilecek haklar ve izlenebilecek hukuki yollar genel hatlarıyla değerlendirilir. İlk görüşme bilgilendirme amaçlıdır.',
            },
          },
        ],
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${BASE}/#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Ana Sayfa',
            item: `${BASE}/`,
          },
        ],
      },
    ],
  };
  return JSON.stringify(graph, null, 2);
}

function escapeHtml(text = '') {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildPostCardHtml(card, index = 0) {
  const thumb = buildPostCardThumb(card.link, card.imageUrl, card.label, card.altText, {
    critical: index < 3,
  });
  return `<div class="aa-card aa-post-card">${thumb}<div class="aa-post-body"><div class="aa-date">${escapeHtml(card.date)}</div><h3>${escapeHtml(card.title)}</h3><p>${escapeHtml(card.excerpt)}</p><a class="aa-card-link" href="${card.link}">Yazıyı Oku</a></div></div>`;
}

function buildPostCardsSection(postCards) {
  return postCards.map((card, index) => buildPostCardHtml(card, index)).join('\n');
}

export function buildHomepageContent({ postCards } = {}) {
  const cards = postCards?.length ? postCards : getDefaultHomepagePostCards();
  const schema = buildSchemaJson();

  return `<!-- wp:html -->
<style>
/* ── Ana sayfa global (Astra uyumu) ── */
body.home .entry-header,
body.home .entry-header .entry-title,
body.page-id-7 .entry-header,
body.page-id-7 .entry-header .entry-title,
.ast-single-entry-header.entry-header{display:none!important;height:0;overflow:hidden;margin:0;padding:0}
body.home .site-content>.ast-container,
body.page-id-7 .site-content>.ast-container{max-width:100%;padding-left:0;padding-right:0}
body.home .entry-content,
body.page-id-7 .entry-content{margin-top:0}
/* ── Header ince ayar ── */
.site-header{border-bottom:1px solid rgba(15,39,71,.07);background:#fff;box-shadow:0 1px 0 rgba(15,39,71,.04)}
.site-header .main-header-bar{
  max-width:1120px;margin:0 auto;padding:.75rem 1.25rem!important
}
.site-header .main-header-menu .menu-item>a{
  padding:.5rem .75rem;font-size:.875rem;font-weight:500;color:#3d4f63;
  border-radius:6px;transition:color .15s,background .15s
}
.site-header .main-header-menu .menu-item>a:hover{color:#0f2747;background:rgba(15,39,71,.04)}
.site-header .ast-site-identity{padding:0}
/* İletişim CTA: Astra height/line-height çakışmasını kır; kompakt hiza */
.main-header-menu .menu-item a[href*="/iletisim/"]{
  height:auto!important;min-height:0!important;line-height:1.25!important;
  display:inline-flex!important;align-items:center!important;align-self:center!important;
  background:#0f2747!important;color:#fff!important;border-radius:8px!important;
  padding:.45rem 1.1rem!important;margin-left:.4rem;font-weight:600!important;
  box-shadow:0 2px 10px rgba(15,39,71,.18);transition:background .2s,transform .2s,box-shadow .2s!important;
  box-sizing:border-box!important
}
.main-header-menu .menu-item a[href*="/iletisim/"]:hover{
  background:#1a3a5c!important;color:#fff!important;transform:translateY(-1px);
  box-shadow:0 4px 14px rgba(15,39,71,.22)
}
/* Logo varken site-title sr-only (semantik korunur) */
body.wp-custom-logo .site-header .ast-site-title-wrap{
  position:absolute!important;width:1px!important;height:1px!important;padding:0!important;
  margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;
  white-space:nowrap!important;border:0!important
}
@media(max-width:921px){
  .site-header .main-header-bar{padding:.65rem 1rem!important}
  .main-header-menu .menu-item a[href*="/iletisim/"]{
    margin-left:0;margin-top:.5rem;display:inline-flex!important;
    height:auto!important;line-height:1.25!important;align-self:flex-start!important
  }
}

/* ── Ana sayfa tasarım sistemi v2 ── */
.aa-home{
  --navy:#0f2747;--navy-mid:#1a3a5c;--navy-light:#2a4d73;
  --white:#fff;--bg:#f5f7fa;--bg-card:#fff;
  --text:#2c3340;--text-muted:#4b5563;--text-light:#6b7280;
  --accent:#c4a962;--accent-soft:rgba(196,169,98,.15);
  --radius:14px;--radius-sm:10px;
  --shadow:0 1px 3px rgba(15,39,71,.05),0 4px 16px rgba(15,39,71,.04);
  --shadow-md:0 4px 20px rgba(15,39,71,.09),0 8px 32px rgba(15,39,71,.06);
  --shadow-lg:0 12px 40px rgba(15,39,71,.12);
  --max:1120px;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
  color:var(--text);line-height:1.7;-webkit-font-smoothing:antialiased
}
.aa-home *{box-sizing:border-box}
.aa-home .aa-container{max-width:var(--max);margin:0 auto;padding:0 1.5rem}
.aa-home section{padding:4.25rem 0}
.aa-home .aa-section-alt{background:var(--bg)}
.aa-home h2{
  font-size:clamp(1.45rem,2.8vw,1.9rem);font-weight:700;color:var(--navy);
  margin:0 0 .65rem;text-align:center;letter-spacing:-.025em;line-height:1.25
}
.aa-home .aa-section-lead{
  text-align:center;color:var(--text-muted);max-width:540px;margin:0 auto 2.75rem;
  font-size:1.0125rem;line-height:1.7
}
.aa-home h3{font-size:1.0625rem;font-weight:700;color:var(--navy);margin:0 0 .65rem;line-height:1.35}
.aa-home p{margin:0 0 1rem;color:var(--text-muted);font-size:.9875rem;line-height:1.72}

/* Hero */
.aa-home .aa-hero{
  background:linear-gradient(152deg,#0a1f38 0%,var(--navy) 35%,var(--navy-mid) 70%,#1e4468 100%);
  color:var(--white);padding:3.75rem 0 3.5rem;position:relative;overflow:hidden
}
.aa-home .aa-hero::before{
  content:"";position:absolute;top:-50%;right:-10%;width:50%;height:160%;
  background:radial-gradient(ellipse,rgba(255,255,255,.07) 0%,transparent 65%);pointer-events:none
}
.aa-home .aa-hero::after{
  content:"";position:absolute;bottom:0;left:0;right:0;height:1px;
  background:linear-gradient(90deg,transparent,rgba(196,169,98,.35),transparent)
}
.aa-home .aa-hero-inner{position:relative;max-width:620px}
.aa-home .aa-hero-label{
  display:inline-block;font-size:.75rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;
  color:rgba(255,255,255,.82);margin-bottom:1.15rem;padding-bottom:.55rem;
  border-bottom:2px solid var(--accent)
}
.aa-home .aa-hero h1{
  font-size:clamp(2.15rem,4.8vw,2.9rem);font-weight:800;line-height:1.12;margin:0 0 1.15rem;
  color:var(--white);letter-spacing:-.035em
}
.aa-home .aa-hero .aa-subtitle{
  font-size:clamp(1.0625rem,2.1vw,1.1875rem);color:rgba(255,255,255,.96);
  max-width:560px;margin-bottom:1.15rem;line-height:1.68;font-weight:400
}
.aa-home .aa-hero-areas{
  font-size:.9rem;color:rgba(255,255,255,.92);margin-bottom:1.85rem;
  padding:.85rem 1.1rem;background:rgba(255,255,255,.07);border-radius:var(--radius-sm);
  border-left:3px solid var(--accent);line-height:1.65;backdrop-filter:blur(2px)
}
.aa-home .aa-btns{display:flex;flex-wrap:wrap;gap:1rem;margin-bottom:1.65rem}
.aa-home .aa-btn{
  display:inline-flex;align-items:center;justify-content:center;
  padding:1rem 2rem;border-radius:var(--radius-sm);font-weight:600;font-size:.9375rem;
  text-decoration:none!important;cursor:pointer;transition:all .22s ease;
  border:2px solid transparent;min-width:200px;letter-spacing:.015em;line-height:1.2
}
.aa-home .aa-btn-primary{
  background:var(--white);color:var(--navy)!important;
  box-shadow:0 4px 16px rgba(0,0,0,.2),0 1px 3px rgba(0,0,0,.08)
}
.aa-home .aa-btn-primary:hover{
  background:#f8fafc;transform:translateY(-2px);
  box-shadow:0 8px 24px rgba(0,0,0,.22),0 2px 6px rgba(0,0,0,.1)
}
.aa-home .aa-btn-outline{
  background:rgba(255,255,255,.08);color:var(--white)!important;
  border-color:rgba(255,255,255,.6);backdrop-filter:blur(6px)
}
.aa-home .aa-btn-outline:hover{
  background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.9);
  transform:translateY(-2px);box-shadow:0 4px 16px rgba(0,0,0,.12)
}
.aa-home .aa-btn-navy{
  background:var(--navy);color:var(--white)!important;
  box-shadow:0 3px 12px rgba(15,39,71,.2);min-width:160px
}
.aa-home .aa-btn-navy:hover{background:var(--navy-mid);transform:translateY(-2px);box-shadow:var(--shadow-md)}
.aa-home .aa-trust{
  font-size:.8125rem;color:rgba(255,255,255,.78);max-width:560px;margin:0;
  line-height:1.65;padding-top:1.25rem;border-top:1px solid rgba(255,255,255,.12)
}

/* Hizmet kartları */
.aa-home .aa-grid-services{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem}
.aa-home .aa-card{
  background:var(--bg-card);border-radius:var(--radius);padding:1.75rem 1.6rem 1.6rem;
  box-shadow:var(--shadow);border:1px solid rgba(15,39,71,.055);
  transition:transform .22s ease,box-shadow .22s ease,border-color .22s ease;
  display:flex;flex-direction:column;height:100%;position:relative;overflow:hidden
}
.aa-home .aa-card::before{
  content:"";position:absolute;top:0;left:0;right:0;height:3px;
  background:linear-gradient(90deg,var(--navy),var(--accent));
  opacity:0;transition:opacity .22s ease
}
.aa-home .aa-card:hover{
  transform:translateY(-5px);box-shadow:var(--shadow-md);
  border-color:rgba(15,39,71,.09)
}
.aa-home .aa-card:hover::before{opacity:1}
.aa-home .aa-card p{flex:1;margin-bottom:1.25rem;font-size:.9375rem;color:var(--text-muted);line-height:1.68}
.aa-home .aa-card-link{
  display:inline-flex;align-items:center;gap:.4rem;color:var(--navy-light)!important;
  text-decoration:none!important;font-weight:600;font-size:.875rem;margin-top:auto;
  padding-top:.5rem;transition:gap .18s ease,color .18s ease
}
.aa-home .aa-card-link:hover{gap:.65rem;color:var(--navy)!important}
.aa-home .aa-card-link::after{content:"→";font-size:1.05rem;line-height:1}

/* Entity */
.aa-home .aa-grid-2{display:grid;grid-template-columns:1fr;gap:2rem;align-items:center}
.aa-home .aa-grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem}
.aa-home .aa-entity{
  text-align:left;background:var(--bg);border-radius:var(--radius);
  padding:2.25rem 2rem;border:1px solid rgba(15,39,71,.06)
}
.aa-home .aa-entity h2{text-align:left;margin-bottom:1rem}
.aa-home .aa-entity p{margin-bottom:1.5rem}

/* Neden listesi */
.aa-home .aa-why{list-style:none;max-width:620px;margin:0 auto;padding:0}
.aa-home .aa-why li{
  padding:1.05rem 0 1.05rem 2.5rem;position:relative;
  border-bottom:1px solid rgba(15,39,71,.06);color:var(--text-muted);font-size:.9875rem
}
.aa-home .aa-why li:last-child{border-bottom:none}
.aa-home .aa-why li::before{
  content:"";position:absolute;left:0;top:1.1rem;width:20px;height:20px;
  background:var(--accent-soft);border-radius:50%
}
.aa-home .aa-why li::after{
  content:"✓";position:absolute;left:5px;top:1.05rem;color:var(--navy);font-weight:700;font-size:.7rem
}

/* FAQ */
.aa-home .aa-faq{max-width:720px;margin:0 auto}
.aa-home .aa-faq-item{
  background:var(--bg-card);border-radius:var(--radius-sm);padding:1.5rem 1.6rem;
  margin-bottom:.75rem;border:1px solid rgba(15,39,71,.05);box-shadow:var(--shadow);
  transition:box-shadow .2s ease
}
.aa-home .aa-faq-item:hover{box-shadow:var(--shadow-md)}
.aa-home .aa-faq-item h3{font-size:1.0125rem;margin-bottom:.55rem;color:var(--navy)}
.aa-home .aa-faq-item p{margin:0;font-size:.9375rem;color:var(--text-muted);line-height:1.68}

/* CTA */
.aa-home .aa-cta{
  background:linear-gradient(152deg,#0a1f38 0%,var(--navy) 50%,var(--navy-mid) 100%);
  color:var(--white);text-align:center;padding:4rem 0
}
.aa-home .aa-cta h2{color:var(--white);margin-bottom:.75rem}
.aa-home .aa-cta p{color:rgba(255,255,255,.9);max-width:500px;margin:0 auto 2rem;font-size:1.0125rem;line-height:1.7}
.aa-home .aa-cta .aa-btn-primary{margin:0 auto}
.aa-home .aa-date{
  font-size:.75rem;color:var(--text-light);margin-bottom:.5rem;
  text-transform:uppercase;letter-spacing:.06em;font-weight:600
}

/* Responsive */
@media(max-width:991px){
  .aa-home .aa-grid-services,.aa-home .aa-grid-3{grid-template-columns:repeat(2,1fr);gap:1.25rem}
  .aa-home section{padding:3.5rem 0}
  .aa-home .aa-entity{padding:1.75rem 1.5rem}
}
@media(max-width:600px){
  .aa-home .aa-container{padding:0 1.15rem}
  .aa-home .aa-grid-services,.aa-home .aa-grid-3{grid-template-columns:1fr;gap:1rem}
  .aa-home .aa-btns{flex-direction:column;gap:.75rem}
  .aa-home .aa-btn{width:100%;min-width:unset;padding:.95rem 1.5rem}
  .aa-home .aa-hero{padding:2.75rem 0 2.5rem}
  .aa-home section{padding:3rem 0}
  .aa-home .aa-card{padding:1.5rem 1.35rem 1.35rem}
  .aa-home .aa-section-lead{margin-bottom:2rem;font-size:.975rem}
}
${POST_CARD_PLACEHOLDER_CSS}
</style>
<div class="aa-home">

<section class="aa-hero" id="hero">
<div class="aa-container">
<div class="aa-hero-inner">
<p class="aa-hero-label">Adana · Aile ve Özel Hukuk</p>
<h1>Adana Avukat</h1>
<p class="aa-subtitle">Adana'da aile hukuku, boşanma, nafaka, velayet ve özel hukuk uyuşmazlıklarında hukuki destek.</p>
<p class="aa-hero-areas">Aile hukuku, boşanma, nafaka, velayet, miras ve kira hukuku alanlarında hukuki destek.</p>
<div class="aa-btns">
<a href="${BASE}/iletisim/" class="aa-btn aa-btn-primary">Hukuki Destek Al</a>
<a href="#hizmet-alanlari" class="aa-btn aa-btn-outline">Hizmet Alanlarını İncele</a>
</div>
<p class="aa-trust">Her dosya kendi koşulları içinde değerlendirilir; süreç, hak kaybı yaşanmaması için dikkatle ele alınmalıdır.</p>
</div>
</div>
</section>

<section id="hizmet-alanlari" class="aa-section-alt">
<div class="aa-container">
<h2>Hizmet Alanları</h2>
<p class="aa-section-lead">Aile ve özel hukuk alanlarında somut olaya göre genel bilgilendirme ve süreç desteği.</p>
<div class="aa-grid-services">
<div class="aa-card"><h3>Boşanma Davaları</h3><p>Boşanma sürecinin planlanması, dilekçe hazırlığı ve delillerin usule uygun sunulması.</p><a class="aa-card-link" href="${BASE}/adana-bosanma-avukati/">Detaylı Bilgi</a></div>
<div class="aa-card"><h3>Anlaşmalı Boşanma</h3><p>Tarafların uzlaştığı boşanma türünde protokol hazırlığı ve süreç bilgilendirmesi.</p><a class="aa-card-link" href="${BASE}/anlasmali-bosanma-davasi-nedir/">Detaylı Bilgi</a></div>
<div class="aa-card"><h3>Çekişmeli Boşanma</h3><p>Uyuşmazlık halinde delil toplama, süre takibi ve usul adımlarının değerlendirilmesi.</p><a class="aa-card-link" href="${BASE}/cekismeli-bosanma-davasi/">Detaylı Bilgi</a></div>
<div class="aa-card"><h3>Nafaka</h3><p>Tedbir, iştirak ve yoksulluk nafakası taleplerinin hukuki çerçevesi.</p><a class="aa-card-link" href="${BASE}/nafaka-davasi/">Detaylı Bilgi</a></div>
<div class="aa-card"><h3>Velayet</h3><p>Çocuğun üstün yararı ilkesi çerçevesinde velayet talepleri ve süreç adımları.</p><a class="aa-card-link" href="${BASE}/velayet-davasinda-hakim-nelere-dikkat-eder/">Detaylı Bilgi</a></div>
<div class="aa-card"><h3>Mal Paylaşımı</h3><p>Edinilmiş mallara katılma rejimi ve ortaklığın giderilmesi uyuşmazlıkları.</p><a class="aa-card-link" href="${BASE}/adana-ortakligin-giderilmesi-davasi-avukat/">Detaylı Bilgi</a></div>
<div class="aa-card"><h3>Miras Hukuku</h3><p>Veraset ilamı, miras paylaşımı ve tenkis süreçlerine ilişkin genel bilgilendirme.</p><a class="aa-card-link" href="${BASE}/adana-miras-hukuku/">Detaylı Bilgi</a></div>
<div class="aa-card"><h3>Kira Hukuku</h3><p>Kira uyuşmazlıkları, tahliye süreçleri ve kira bedeli uyarlaması konuları.</p><a class="aa-card-link" href="${BASE}/adana-kira-hukuku/">Detaylı Bilgi</a></div>
<div class="aa-card"><h3>İş Hukuku</h3><p>İşçi-işveren uyuşmazlıkları, işe iade ve arabuluculuk süreçleri.</p><a class="aa-card-link" href="${BASE}/adana-is-hukuku/">Detaylı Bilgi</a></div>
</div>
</div>
</section>

<section>
<div class="aa-container">
<div class="aa-grid-2">
<div class="aa-entity">
<h2>Av. Ceren Sümer Cilli</h2>
<p>Adana'da aile hukuku, boşanma, nafaka, velayet ve özel hukuk uyuşmazlıkları hakkında genel bilgilendirme ve hukuki süreç yönetimi sunulmaktadır. Her dosya kendi koşulları içinde değerlendirilir; süreç adımları somut olaya göre planlanır.</p>
<a href="${BASE}/avukat-ceren-sumer-cilli/" class="aa-btn aa-btn-navy">Profili İncele</a>
</div>
</div>
</div>
</section>

<section class="aa-section-alt">
<div class="aa-container">
<h2>Neden Hukuki Destek Önemli?</h2>
<p class="aa-section-lead">Hukuki süreçlerde usul kurallarına uyum, hak kayıplarının önlenmesi açısından önem taşır.</p>
<ul class="aa-why">
<li>Dilekçe ve delillerin usule uygun hazırlanması</li>
<li>Sürelerin kaçırılmaması</li>
<li>Nafaka, velayet ve mal paylaşımı taleplerinin doğru kurulması</li>
<li>Hak kayıplarının önlenmesi</li>
<li>Somut olaya göre strateji belirlenmesi</li>
</ul>
</div>
</section>

<section>
<div class="aa-container">
<h2>Hukuk Rehberi — Son Yazılar</h2>
<p class="aa-section-lead">Aile ve özel hukuk alanlarında güncel bilgilendirme yazıları.</p>
<div class="aa-grid-3">
${buildPostCardsSection(cards)}
</div>
</div>
</section>

<section class="aa-section-alt">
<div class="aa-container aa-faq">
<h2>Sık Sorulan Sorular</h2>
<p class="aa-section-lead">Sık sorulan konulara ilişkin genel bilgilendirme.</p>
<div class="aa-faq-item"><h3>Adana'da avukat desteği hangi durumlarda alınmalıdır?</h3><p>Boşanma, nafaka, velayet, mal paylaşımı, miras, kira veya iş hukuku gibi uyuşmazlıklarda dilekçe hazırlığı, süre takibi veya delil düzenlemesi gerektiğinde hukuki destek alınması değerlendirilebilir. Somut olayın koşullarına göre ihtiyaç farklılık gösterebilir.</p></div>
<div class="aa-faq-item"><h3>Boşanma davası açmadan önce nelere dikkat edilmelidir?</h3><p>Evlilik birliğinin durumu, çocukların varlığı, mal rejimi ve taraflar arasındaki uzlaşma düzeyi değerlendirilmelidir. Anlaşmalı veya çekişmeli boşanma yolu, somut olaya göre belirlenir.</p></div>
<div class="aa-faq-item"><h3>Nafaka ve velayet talepleri ne zaman ileri sürülür?</h3><p>Nafaka talepleri boşanma davası ile birlikte veya sonrasında, velayet talepleri ise çocuğun üstün yararı ilkesi çerçevesinde dava sürecinde ileri sürülebilir.</p></div>
<div class="aa-faq-item"><h3>Avukatla görüşmeye giderken hangi belgeler hazırlanmalıdır?</h3><p>Kimlik belgesi, evlilik cüzdanı, nüfus kayıt örneği, varsa önceki dava evrakları, gelir belgeleri ve uyuşmazlıkla ilgili yazışmalar görüşme öncesinde hazırlanabilir.</p></div>
<div class="aa-faq-item"><h3>Hukuki süreç ne kadar sürer?</h3><p>Süre, dava türüne, mahkemenin iş yüküne ve tarafların uzlaşma düzeyine göre değişir. Kesin süre verilemez.</p></div>
<div class="aa-faq-item"><h3>İlk görüşmede neler değerlendirilir?</h3><p>Uyuşmazlığın konusu, mevcut belgeler, süre durumu, talep edilebilecek haklar ve izlenebilecek hukuki yollar genel hatlarıyla değerlendirilir.</p></div>
</div>
</section>

<section class="aa-cta">
<div class="aa-container">
<h2>Hukuki Sürecinizi Değerlendirmek İçin İletişime Geçin</h2>
<p>Somut olayınızın koşullarına göre genel bilgilendirme almak için iletişim sayfasından randevu talep edebilirsiniz.</p>
<a href="${BASE}/iletisim/" class="aa-btn aa-btn-primary">İletişim Sayfasına Git</a>
</div>
</section>

</div>
<!-- /wp:html -->

<!-- wp:html -->
<script type="application/ld+json">
${schema}
</script>
<!-- /wp:html -->`;
}

export const HOMEPAGE_META = {
  title: 'Adana Avukat | Ceren Sümer Cilli Hukuk ve Danışmanlık',
  excerpt:
    'Adana’da aile hukuku, boşanma, nafaka, velayet, miras ve iş hukuku alanlarında hukuki destek. Av. Ceren Sümer Cilli ile iletişime geçin.',
};
