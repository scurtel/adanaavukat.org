export const BASE_URL = 'https://adanaavukat.org';

export const ENTITY = {
  name: 'Avukat Ceren Sümer Cilli',
  shortName: 'Av. Ceren Sümer Cilli',
  profileSlug: 'avukat-ceren-sumer-cilli-kimdir-adana-bosanma-ve-aile-hukuku',
  profileUrl: `${BASE_URL}/avukat-ceren-sumer-cilli-kimdir-adana-bosanma-ve-aile-hukuku/`,
  contactUrl: `${BASE_URL}/iletisim/`,
  sameAs: [
    'https://www.cerensumer.av.tr/',
    'https://www.linkedin.com/in/avukat-ceren-s%C3%BCmer-cilli-375873b0/',
    'https://www.instagram.com/av.cerensumercilli/',
    'https://www.facebook.com/cerensumercilli/',
    'https://www.google.com/maps/search/?api=1&query=Avukat+Ceren+S%C3%BCmer+Cilli+Adana',
  ],
};

export const FORBIDDEN_PHRASES = [
  'en iyi avukat',
  'en iyi boşanma avukatı',
  'uzman avukat',
  'lider avukat',
  'garantili sonuç',
  'kesin kazanılır',
  'kesin kazanırız',
  'mutlaka kazanılır',
  'başarı garantisi',
  'davayı kesin kazanır',
  'en başarılı',
  'rakipsiz',
  'güvence altına alın',
  'güçlü hukuki süreç',
];

export const DISCLAIMER =
  'Bu sayfa genel bilgilendirme amacıyla hazırlanmıştır. Her dosya kendi koşulları içinde değerlendirilir; somut olayınıza ilişkin hukuki destek için bir avukata danışmanız önerilir.';

/** Audit targets from user spec */
export const AUDIT_SLUGS = [
  'hizmetlerimiz',
  'adana-aile-hukuku-avukati',
  'adana-cekismeli-bosanma-avukati',
  'adana-anlasmali-bosanma-avukati',
  'velayet-davasi-avukati-adana',
  'nafaka-hesaplama-ve-davalari',
  'gayrimenkul-avukati-adana',
  'ortakligin-giderilmesi-davasi',
  'adana-kira-hukuku',
  'adana-is-hukuku',
  'adana-miras-avukati',
  'adana-bosanma-avukati',
];

/** Slug → existing equivalent (no duplicate page creation) */
export const SLUG_ALIASES = {
  'adana-cekismeli-bosanma-avukati': 'cekismeli-bosanma-davasi',
  'nafaka-hesaplama-ve-davalari': 'nafaka-davasi',
  'ortakligin-giderilmesi-davasi': 'adana-ortakligin-giderilmesi-davasi-avukat',
  'adana-miras-avukati': 'adana-miras-hukuku',
};

/** Pages to create or expand */
export const SERVICE_DEFINITIONS = [
  {
    slug: 'adana-aile-hukuku-avukati',
    action: 'create',
    h1: 'Adana Aile Hukuku Avukatı',
    serviceArea: 'Aile Hukuku',
    minWords: 900,
    relatedLinks: [
      { slug: 'adana-bosanma-avukati', label: 'Adana Boşanma Avukatı' },
      { slug: 'cekismeli-bosanma-davasi', label: 'Çekişmeli Boşanma Davası' },
      { slug: 'nafaka-davasi', label: 'Nafaka Davası' },
      { slug: 'hizmetlerimiz', label: 'Hizmetlerimiz' },
    ],
    focusKeyword: 'Adana aile hukuku avukatı',
    metaTitle: 'Adana Aile Hukuku Avukatı | Aile Davaları',
    metaDescription:
      'Adana aile hukuku kapsamında boşanma, velayet, nafaka ve mal paylaşımı uyuşmazlıkları hakkında bilgilendirici hukuki rehber.',
  },
  {
    slug: 'adana-anlasmali-bosanma-avukati',
    action: 'create',
    h1: 'Adana Anlaşmalı Boşanma Avukatı',
    serviceArea: 'Anlaşmalı Boşanma',
    minWords: 900,
    relatedLinks: [
      { slug: 'adana-bosanma-avukati', label: 'Adana Boşanma Avukatı' },
      { slug: 'cekismeli-bosanma-davasi', label: 'Çekişmeli Boşanma' },
      { slug: 'nafaka-davasi', label: 'Nafaka Davası' },
    ],
    focusKeyword: 'Adana anlaşmalı boşanma avukatı',
    metaTitle: 'Adana Anlaşmalı Boşanma Avukatı | Protokol',
    metaDescription:
      'Adana anlaşmalı boşanma davası şartları, protokol hazırlığı ve mahkeme süreci hakkında bilgilendirici hukuki rehber.',
  },
  {
    slug: 'velayet-davasi-avukati-adana',
    action: 'create',
    h1: 'Adana Velayet Davası Avukatı',
    serviceArea: 'Velayet Davaları',
    minWords: 900,
    relatedLinks: [
      { slug: 'adana-bosanma-avukati', label: 'Adana Boşanma Avukatı' },
      { slug: 'nafaka-davasi', label: 'Nafaka Davası' },
      { slug: 'adana-aile-hukuku-avukati', label: 'Aile Hukuku' },
    ],
    focusKeyword: 'Adana velayet davası avukatı',
    metaTitle: 'Adana Velayet Davası Avukatı | Velayet Süreci',
    metaDescription:
      'Adana velayet davalarında çocuğun üstün yararı, kişisel ilişki düzenlemesi ve dava süreci hakkında bilgilendirici rehber.',
  },
  {
    slug: 'gayrimenkul-avukati-adana',
    action: 'create',
    h1: 'Adana Gayrimenkul Avukatı',
    serviceArea: 'Gayrimenkul Hukuku',
    minWords: 900,
    relatedLinks: [
      { slug: 'adana-ortakligin-giderilmesi-davasi-avukat', label: 'Ortaklığın Giderilmesi' },
      { slug: 'adana-kira-hukuku', label: 'Kira Hukuku' },
      { slug: 'adana-miras-hukuku', label: 'Miras Hukuku' },
    ],
    focusKeyword: 'Adana gayrimenkul avukatı',
    metaTitle: 'Adana Gayrimenkul Avukatı | Tapu Uyuşmazlıkları',
    metaDescription:
      'Adana gayrimenkul hukuku kapsamında tapu, kat mülkiyeti ve taşınmaz uyuşmazlıkları hakkında bilgilendirici hukuki rehber.',
  },
  {
    slug: 'adana-kira-hukuku',
    action: 'expand',
    existingId: 288,
    h1: 'Adana Kira Hukuku Avukatı',
    serviceArea: 'Kira Hukuku',
    minWords: 900,
    relatedLinks: [
      { slug: 'gayrimenkul-avukati-adana', label: 'Gayrimenkul Hukuku' },
      { slug: 'hizmetlerimiz', label: 'Hizmetlerimiz' },
    ],
    focusKeyword: 'Adana kira hukuku avukatı',
    metaTitle: 'Adana Kira Hukuku Avukatı | Kira Uyuşmazlıkları',
    metaDescription:
      'Adana kira hukuku kapsamında tahliye, kira bedeli uyarlaması, kira alacağı ve depozito uyuşmazlıkları hakkında bilgilendirme.',
  },
  {
    slug: 'adana-is-hukuku',
    action: 'expand',
    existingId: 289,
    h1: 'Adana İş Hukuku Avukatı',
    serviceArea: 'İş Hukuku',
    minWords: 900,
    relatedLinks: [
      { slug: 'hizmetlerimiz', label: 'Hizmetlerimiz' },
      { slug: 'iletisim', label: 'İletişim' },
    ],
    focusKeyword: 'Adana iş hukuku avukatı',
    metaTitle: 'Adana İş Hukuku Avukatı | İşçi-İşveren',
    metaDescription:
      'Adana iş hukuku kapsamında işe iade, kıdem tazminatı, ihbar tazminatı ve arabuluculuk süreçleri hakkında bilgilendirme.',
  },
  {
    slug: 'adana-miras-hukuku',
    action: 'expand',
    existingId: 287,
    h1: 'Adana Miras Hukuku Avukatı',
    serviceArea: 'Miras Hukuku',
    minWords: 900,
    relatedLinks: [
      { slug: 'adana-ortakligin-giderilmesi-davasi-avukat', label: 'Ortaklığın Giderilmesi' },
      { slug: 'gayrimenkul-avukati-adana', label: 'Gayrimenkul Hukuku' },
    ],
    focusKeyword: 'Adana miras avukatı',
    metaTitle: 'Adana Miras Avukatı | Veraset ve Miras',
    metaDescription:
      'Adana miras hukuku kapsamında veraset ilamı, miras paylaşımı, tenkis ve saklı pay uyuşmazlıkları hakkında bilgilendirme.',
  },
  {
    slug: 'cekismeli-bosanma-davasi',
    action: 'fix-h1',
    h1: 'Adana Çekişmeli Boşanma Avukatı',
    serviceArea: 'Çekişmeli Boşanma',
    minWords: 600,
    focusKeyword: 'Adana çekişmeli boşanma avukatı',
    metaTitle: 'Adana Çekişmeli Boşanma Avukatı | Dava Süreci',
    metaDescription:
      'Adana çekişmeli boşanma davası açılışı, kusur tespiti, delil sunumu ve yargılama süreci hakkında bilgilendirici rehber.',
  },
  {
    slug: 'nafaka-davasi',
    action: 'fix-h1',
    h1: 'Adana Nafaka Davası Avukatı',
    serviceArea: 'Nafaka Davaları',
    minWords: 700,
    focusKeyword: 'Adana nafaka avukatı',
    metaTitle: 'Adana Nafaka Avukatı | Nafaka Davaları',
    metaDescription:
      'Adana nafaka davalarında tedbir, iştirak ve yoksulluk nafakası, artırım-azaltım talepleri hakkında bilgilendirici rehber.',
  },
];

export const HIZMETLERIMIZ_ID = 237;

export const HIZMET_CARDS = [
  {
    title: 'Aile Hukuku',
    desc: 'Boşanma, velayet, nafaka ve mal paylaşımı gibi aile hukuku uyuşmazlıklarında bilgilendirici hukuki rehber ve dava takibi desteği.',
    slug: 'adana-aile-hukuku-avukati',
  },
  {
    title: 'Boşanma Davaları',
    desc: 'Anlaşmalı ve çekişmeli boşanma süreçlerinde dilekçe, protokol ve yargılama aşamalarına ilişkin genel bilgilendirme.',
    slug: 'adana-bosanma-avukati',
  },
  {
    title: 'Çekişmeli Boşanma Davaları',
    desc: 'Kusur tespiti, delil sunumu ve uzun süren yargılama süreçlerinde hukuki sürecin nasıl ilerlediğine dair bilgilendirme.',
    slug: 'cekismeli-bosanma-davasi',
  },
  {
    title: 'Anlaşmalı Boşanma Davaları',
    desc: 'Tarafların uzlaşmasıyla sonuçlanan anlaşmalı boşanma protokolü ve mahkeme süreci hakkında genel bilgi.',
    slug: 'adana-anlasmali-bosanma-avukati',
  },
  {
    title: 'Velayet Davaları',
    desc: 'Çocuğun üstün yararı ilkesi çerçevesinde velayet ve kişisel ilişki düzenlemelerine ilişkin bilgilendirme.',
    slug: 'velayet-davasi-avukati-adana',
  },
  {
    title: 'Nafaka Davaları',
    desc: 'Tedbir, iştirak ve yoksulluk nafakası ile artırım, azaltım taleplerine ilişkin genel hukuki bilgilendirme.',
    slug: 'nafaka-davasi',
  },
  {
    title: 'Mal Paylaşımı',
    desc: 'Boşanma ve mal rejimi kapsamında edinilmiş malların paylaşımına ilişkin uyuşmazlıklar hakkında bilgilendirme.',
    slug: 'adana-ortakligin-giderilmesi-davasi-avukat',
  },
  {
    title: 'Miras Hukuku',
    desc: 'Veraset ilamı, miras paylaşımı, tenkis ve saklı pay uyuşmazlıklarına ilişkin genel hukuki rehber.',
    slug: 'adana-miras-hukuku',
  },
  {
    title: 'Ortaklığın Giderilmesi',
    desc: 'Paylı mülkiyette ortaklığın giderilmesi (izale-i şuyu) davalarının açılışı ve yargılama süreci hakkında bilgi.',
    slug: 'adana-ortakligin-giderilmesi-davasi-avukat',
  },
  {
    title: 'Gayrimenkul Hukuku',
    desc: 'Tapu, kat mülkiyeti ve taşınmaz alım-satım uyuşmazlıklarına ilişkin bilgilendirici hukuki içerik.',
    slug: 'gayrimenkul-avukati-adana',
  },
  {
    title: 'Kira Hukuku',
    desc: 'Tahliye, kira bedeli uyarlaması, kira alacağı ve depozito uyuşmazlıkları hakkında genel bilgilendirme.',
    slug: 'adana-kira-hukuku',
  },
  {
    title: 'İş Hukuku',
    desc: 'İşe iade, kıdem ve ihbar tazminatı ile arabuluculuk süreçlerine ilişkin iş hukuku bilgilendirmesi.',
    slug: 'adana-is-hukuku',
  },
];
