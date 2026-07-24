export const MAIN_MENU_ID = 11;
export const HIZMETLERIMIZ_PAGE_ID = 237;

/** Astra tema menü konumları — primary + mobile aynı Ana Menü'yü kullanır */
export const MENU_LOCATIONS = ['primary', 'mobile_menu'];

/** Üst seviye menü sırası (page slug) */
export const TOP_LEVEL_MENU_ORDER = [
  'aile-hukuku-rehberi',
  'hizmetlerimiz',
  'hakkimizda',
  'avukat-ceren-sumer-cilli',
  'faq',
  'iletisim',
];

export const TOP_LEVEL_TITLES = {
  'aile-hukuku-rehberi': 'Aile Hukuku Rehberi',
  hizmetlerimiz: 'Hizmetlerimiz',
  hakkimizda: 'Hakkımızda',
  'avukat-ceren-sumer-cilli': 'Avukat Ceren Sümer Cilli',
  faq: 'Sıkça Sorulan Sorular',
  iletisim: 'İletişim',
};

/** Hizmetlerimiz alt menüsü */
export const SERVICE_MENU_SLUGS = [
  'adana-aile-hukuku-avukati',
  'adana-bosanma-avukati',
  'adana-anlasmali-bosanma-avukati',
  'cekismeli-bosanma-davasi',
  'velayet-davasi-avukati-adana',
  'nafaka-davasi',
  'adana-ortakligin-giderilmesi-davasi-avukat',
  'adana-miras-hukuku',
  'gayrimenkul-avukati-adana',
  'adana-kira-hukuku',
  'adana-is-hukuku',
];

export const SERVICE_MENU_TITLES = {
  'adana-aile-hukuku-avukati': 'Aile Hukuku',
  'adana-bosanma-avukati': 'Boşanma Davaları',
  'adana-anlasmali-bosanma-avukati': 'Anlaşmalı Boşanma',
  'cekismeli-bosanma-davasi': 'Çekişmeli Boşanma',
  'velayet-davasi-avukati-adana': 'Velayet Davası',
  'nafaka-davasi': 'Nafaka Davası',
  'adana-ortakligin-giderilmesi-davasi-avukat': 'Mal Paylaşımı',
  'adana-miras-hukuku': 'Miras Hukuku',
  'gayrimenkul-avukati-adana': 'Gayrimenkul Hukuku',
  'adana-kira-hukuku': 'Kira Hukuku',
  'adana-is-hukuku': 'İş Hukuku',
};

/** Ana menüden çıkarılacak İngilizce/kopya sayfa slugları (sayfa silinmez) */
export const EXCLUDED_MENU_SLUGS = ['about-us', 'contact'];

export const EXCLUDED_TITLE_PATTERNS = [/^about us$/i, /^contact$/i, /^about$/i];
