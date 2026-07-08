/**
 * Otomatik makale konu havuzu — adanaavukat.org
 * matchPatterns: mevcut yazı slug/başlığında eşleşirse konu atlanır.
 */

export const CATEGORY_ALIASES = {
  'Boşanma Hukuku': 'Boşanma Davaları',
  'Hukuki Danışmanlık': 'Aile Hukuku',
  'Adana Avukat': 'Aile Hukuku',
  Velayet: 'Aile Hukuku',
  Nafaka: 'Aile Hukuku',
  'Mal Paylaşımı': 'Aile Hukuku',
  'Miras Hukuku': 'Miras Hukuku',
  'Kira Hukuku': 'Kira Hukuku',
  'İş Hukuku': 'İş Hukuku',
  'Gayrimenkul Hukuku': 'Aile Hukuku',
  'Genel Hukuk': 'Aile Hukuku',
};

export const TOPIC_POOL = [
  {
    topic: "Adana'da anlaşmalı boşanma protokolünde nelere dikkat edilir?",
    category: 'Boşanma Hukuku',
    type: 'rehber',
    matchPatterns: [/anlasmali-bosanma-protokol/i, /protokolunde nelere/i],
  },
  {
    topic: "Adana'da çekişmeli boşanmada delil stratejisi nasıl kurulur?",
    category: 'Boşanma Hukuku',
    type: 'analiz',
    matchPatterns: [/cekismeli.*delil strateji/i, /bosanmada-delil-strateji/i],
  },
  {
    topic: "Adana'da velayet değişikliği davası ne zaman açılır?",
    category: 'Velayet',
    type: 'rehber',
    matchPatterns: [/velayet-degisikligi/i, /velayet değişikli/i],
  },
  {
    topic: "Adana'da kişisel ilişki düzenlemesi nasıl işler?",
    category: 'Velayet',
    type: 'rehber',
    matchPatterns: [/kisisel-iliski-duzenleme/i, /kişisel ilişki düzenleme/i],
  },
  {
    topic: "Adana'da iştirak nafakası nasıl belirlenir?",
    category: 'Nafaka',
    type: 'rehber',
    matchPatterns: [/istirak-nafaka.*belirlen/i, /iştirak nafakası nasıl/i],
  },
  {
    topic: "Adana'da yoksulluk nafakası şartları nelerdir?",
    category: 'Nafaka',
    type: 'rehber',
    matchPatterns: [/yoksulluk-nafaka.*sart/i, /yoksulluk nafakası şart/i],
  },
  {
    topic: "Adana'da nafaka artırım ve azaltım davası",
    category: 'Nafaka',
    type: 'rehber',
    matchPatterns: [/nafaka-artirim/i, /nafaka artırım/i],
  },
  {
    topic: "Adana'da boşanmada ziynet eşyası alacağı",
    category: 'Boşanma Hukuku',
    type: 'analiz',
    matchPatterns: [/ziynet/i],
  },
  {
    topic: "Adana'da boşanmada maddi ve manevi tazminat",
    category: 'Boşanma Hukuku',
    type: 'analiz',
    matchPatterns: [/maddi.*manevi tazminat/i, /bosanmada-tazminat/i],
  },
  {
    topic: "Adana'da mal rejimi tasfiyesi nasıl yapılır?",
    category: 'Mal Paylaşımı',
    type: 'rehber',
    matchPatterns: [/mal-rejimi-tasfiye/i, /mal rejimi tasfiye/i],
  },
  {
    topic: "Adana'da ortaklığın giderilmesi (izale-i şuyu) süreci",
    category: 'Gayrimenkul Hukuku',
    type: 'rehber',
    matchPatterns: [/izale|ortakligin-giderilmesi-sureci/i],
  },
  {
    topic: "Adana'da veraset ilamı nasıl alınır?",
    category: 'Miras Hukuku',
    type: 'rehber',
    matchPatterns: [/veraset-ilami/i, /veraset ilamı/i],
  },
  {
    topic: "Adana'da saklı pay ve tenkis davası",
    category: 'Miras Hukuku',
    type: 'analiz',
    matchPatterns: [/sakli-pay|tenkis/i],
  },
  {
    topic: "Adana'da kira tahliye davası nasıl ilerler?",
    category: 'Kira Hukuku',
    type: 'rehber',
    matchPatterns: [/kira-tahliye|tahliye davası nasıl/i],
  },
  {
    topic: "Adana'da kira bedeli uyarlaması ne demektir?",
    category: 'Kira Hukuku',
    type: 'rehber',
    matchPatterns: [/kira-bedeli-uyarlama|kira bedeli uyarlama/i],
  },
  {
    topic: "Adana'da işe iade davası süreci",
    category: 'İş Hukuku',
    type: 'rehber',
    matchPatterns: [/ise-iade|işe iade davası/i],
  },
  {
    topic: "Adana'da kıdem ve ihbar tazminatı hesaplama çerçevesi",
    category: 'İş Hukuku',
    type: 'rehber',
    matchPatterns: [/kidem.*ihbar|kıdem.*ihbar/i],
  },
  {
    topic: "Adana Aile Mahkemelerinde dava süreci nasıl işler?",
    category: 'Aile Hukuku',
    type: 'rehber',
    matchPatterns: [/aile-mahkemelerinde-dava|aile mahkemelerinde dava süreci/i],
  },
  {
    topic: "Adana'da uzaklaştırma kararı ve koruma tedbirleri",
    category: 'Aile Hukuku',
    type: 'rehber',
    matchPatterns: [/uzaklastirma|koruma tedbir/i],
  },
  {
    topic: "Adana'da boşanma davasında tanık beyanının etkisi",
    category: 'Boşanma Hukuku',
    type: 'analiz',
    matchPatterns: [/tanik-beyan|tanık beyan/i],
  },
  {
    topic: "Adana'da boşanma davasında dijital deliller (mesaj, e-posta)",
    category: 'Boşanma Hukuku',
    type: 'analiz',
    matchPatterns: [/dijital-delil|whatsapp|mesaj.*delil/i],
  },
  {
    topic: "Adana'da çocuğu göstermeme halinde hukuki yollar",
    category: 'Velayet',
    type: 'rehber',
    matchPatterns: [/cocugu-gostermeme|çocuğu gösterme/i],
  },
  {
    topic: "Adana'da evlilik birliğinin temelinden sarsılması ne anlama gelir?",
    category: 'Boşanma Hukuku',
    type: 'rehber',
    matchPatterns: [/temelinden-sarsilma|temelinden sarsıl/i],
  },
  {
    topic: "Adana'da arabuluculuk aile uyuşmazlıklarında ne zaman gündeme gelir?",
    category: 'Aile Hukuku',
    type: 'rehber',
    matchPatterns: [/aile.*arabuluculuk|arabuluculuk.*aile/i],
  },
];

export const HUB_LINKS = [
  { title: 'Ana Sayfa', url: 'https://adanaavukat.org/' },
  { title: 'Hizmetlerimiz', url: 'https://adanaavukat.org/hizmetlerimiz/' },
  {
    title: 'Av. Ceren Sümer Cilli Kimdir?',
    url: 'https://adanaavukat.org/avukat-ceren-sumer-cilli-kimdir-adana-bosanma-ve-aile-hukuku/',
  },
  { title: 'İletişim', url: 'https://adanaavukat.org/iletisim/' },
  { title: 'Adana Boşanma Avukatı', url: 'https://adanaavukat.org/adana-bosanma-avukati/' },
  { title: 'Nafaka Davası', url: 'https://adanaavukat.org/nafaka-davasi/' },
  { title: 'Çekişmeli Boşanma', url: 'https://adanaavukat.org/cekismeli-bosanma-davasi/' },
  { title: 'Adana Miras Hukuku', url: 'https://adanaavukat.org/adana-miras-hukuku/' },
  { title: 'Adana Kira Hukuku', url: 'https://adanaavukat.org/adana-kira-hukuku/' },
  { title: 'Adana İş Hukuku', url: 'https://adanaavukat.org/adana-is-hukuku/' },
  { title: 'Aile Hukuku Rehberi', url: 'https://adanaavukat.org/aile-hukuku-rehberi/' },
];
