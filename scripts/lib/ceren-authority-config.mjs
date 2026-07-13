/** Ceren Sümer Cilli otorite / E-E-A-T sabitleri */
export const BASE_URL = 'https://adanaavukat.org';

export const AUTHOR_USER_ID = 1;
export const AUTHOR_DISPLAY_NAME = 'Avukat Ceren Sümer Cilli';
export const AUTHOR_SLUG_NEW = 'avukat-ceren-sumer-cilli';
export const AUTHOR_SLUG_OLD = 'yigit-cilligmail-com';
export const AUTHOR_URL_NEW = `${BASE_URL}/author/${AUTHOR_SLUG_NEW}/`;
export const AUTHOR_URL_OLD = `${BASE_URL}/author/${AUTHOR_SLUG_OLD}/`;

export const PROFILE_PAGE_ID = 268;
export const PROFILE_SLUG_NEW = 'avukat-ceren-sumer-cilli';
export const PROFILE_SLUG_OLD =
  'avukat-ceren-sumer-cilli-kimdir-adana-bosanma-ve-aile-hukuku';
export const PROFILE_URL_NEW = `${BASE_URL}/${PROFILE_SLUG_NEW}/`;
export const PROFILE_URL_OLD = `${BASE_URL}/${PROFILE_SLUG_OLD}/`;

export const PROFILE_IMAGE =
  'https://adanaavukat.org/wp-content/uploads/2026/05/Avukat-Ceren-Sumer-Cilli.jpg';

export const BLOG_HUB_PAGE_ID = 105;
export const BLOG_HUB_SLUG = 'aile-hukuku-rehberi';

/** Aile hukuku kategorileri — uzman kutusu / ilgili yazılar */
export const FAMILY_LAW_CATEGORY_SLUGS = [
  'aile-hukuku',
  'bosanma-davalari',
  'nafaka',
  'velayet',
  'mal-paylasimi',
];

export const KNOWS_ABOUT = [
  'Aile Hukuku',
  'Boşanma Hukuku',
  'Velayet',
  'Nafaka',
  'Mal Rejiminin Tasfiyesi',
  'Ziynet Alacağı',
  'Aile Konutu',
  '6284 Sayılı Kanun',
];

/** Doğrulanmış sameAs (proje ENTITY + mevcut içerik) */
export const SAME_AS = [
  'https://www.cerensumer.av.tr/',
  'https://www.linkedin.com/in/avukat-ceren-s%C3%BCmer-cilli-375873b0/',
  'https://www.instagram.com/av.cerensumercilli/',
  'https://www.facebook.com/cerensumercilli/',
];

export const CLUSTER_HUBS = [
  {
    id: 'bosanma',
    title: 'Boşanma davaları ve deliller',
    primaryService: '/adana-bosanma-avukati/',
    guideAnchors: ['Anlaşmalı boşanma', 'Çekişmeli boşanma', 'Delil stratejisi'],
  },
  {
    id: 'velayet',
    title: 'Velayet ve çocukla kişisel ilişki',
    primaryService: '/velayet-davasi-avukati-adana/',
    guideAnchors: ['Velayet kriterleri', 'Kişisel ilişki', 'Sosyal inceleme'],
  },
  {
    id: 'nafaka',
    title: 'Nafaka uyuşmazlıkları',
    primaryService: '/nafaka-davasi/',
    guideAnchors: ['Tedbir nafakası', 'İştirak nafakası', 'Yoksulluk nafakası'],
  },
  {
    id: 'mal',
    title: 'Mal rejimi ve ekonomik uyuşmazlıklar',
    primaryService: '/adana-ortakligin-giderilmesi-davasi-avukat/',
    guideAnchors: ['Mal rejimi tasfiyesi', 'Ziynet alacağı', 'Aile konutu'],
  },
  {
    id: '6284',
    title: 'Koruma tedbirleri ve 6284 sayılı Kanun',
    primaryService: '/adana-aile-hukuku-avukati/',
    guideAnchors: ['Uzaklaştırma kararı', 'Koruma kararı', 'Tedbir ihlali'],
    note: 'Ayrı hub sayfası oluşturulmadı; içerik boşluğu var — manuel hukuk içeriği gerekir.',
  },
];

export const EEAT_PAGES = [
  {
    slug: 'editoryal-politika',
    title: 'Editoryal Politika',
    type: 'editorial',
  },
  {
    slug: 'icerik-guncelleme-politikasi',
    title: 'İçerik Güncelleme Politikası',
    type: 'update-policy',
  },
  {
    slug: 'hukuki-bilgilendirme',
    title: 'Hukuki Bilgilendirme ve Sorumluluk Reddi',
    type: 'disclaimer',
  },
  {
    slug: 'gizlilik-politikasi',
    title: 'Gizlilik Politikası',
    type: 'privacy',
  },
  {
    slug: 'cerez-politikasi',
    title: 'Çerez Politikası',
    type: 'cookies',
  },
];

export const SNIPPET_NAMES = {
  redirects: 'Adana Avukat Authority Redirects',
  articleAuthority: 'Adana Avukat Article Authority Footer',
  profileShortcodes: 'Adana Avukat Profile Shortcodes',
  blogHub: 'Adana Avukat Blog Hub Header',
};
