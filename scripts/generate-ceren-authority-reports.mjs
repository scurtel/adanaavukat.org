/**
 * Ceren otorite raporlarını (markdown) üretir.
 * inventory + son apply JSON varsa birleştirir.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { rootDir } from './lib/env.mjs';
import {
  PROFILE_URL_NEW,
  PROFILE_URL_OLD,
  AUTHOR_URL_NEW,
  AUTHOR_URL_OLD,
  CLUSTER_HUBS,
  BASE_URL,
} from './lib/ceren-authority-config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

function latestFile(dir, prefix) {
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir)
    .filter((f) => f.startsWith(prefix))
    .sort()
    .reverse();
  return files[0] ? resolve(dir, files[0]) : null;
}

function loadJson(path) {
  if (!path || !existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
}

function decodeEntities(s = '') {
  return String(s)
    .replace(/&#8217;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function main() {
  const inventory =
    loadJson(resolve(rootDir, 'reports/backups/family-law-inventory-pre-authority.json')) || {
      posts: [],
    };
  const applyPath = latestFile(resolve(rootDir, 'reports'), 'ceren-authority-apply-');
  const apply = loadJson(applyPath);

  const posts = (inventory.posts || []).map((p) => ({
    ...p,
    title: decodeEntities(p.title),
  }));

  const authorityReport = `# Avukat Ceren Sümer Cilli — Otorite ve E-E-A-T Raporu

Tarih: ${new Date().toISOString()}
Altyapı: WordPress (uzaktan) + yerel Node ESM tooling (\`scripts/*.mjs\`)
Branch: \`feature/ceren-authority-eeat\`

## Teknik plan (özet)

1. Yazar slug/kimlik düzeltmesi
2. Profil URL kısaltma + içerik/schema güçlendirme
3. 301 yönlendirmeler (eski author + eski profil)
4. Aile Hukuku Rehberi hub kümeleri
5. Makale uzman kutusu + ilgili yazılar + Rank Math author Person URL
6. E-E-A-T politika sayfaları
7. Kırık/yanlış link temizliği
8. Cannibalization ve hukuk güncelliği için rapor (otomatik birleştirme yok)

## Yapılan değişiklikler

### Yazar kimliği
- Eski: \`${AUTHOR_URL_OLD}\` (slug: \`yigit-cilligmail-com\`)
- Yeni: \`${AUTHOR_URL_NEW}\` (slug: \`avukat-ceren-sumer-cilli\`)
- Görünen ad: Avukat Ceren Sümer Cilli
- Apply sonucu: ${JSON.stringify(apply?.author || 'henüz uygulanmadı')}

### Profil sayfası
- Eski URL: \`${PROFILE_URL_OLD}\`
- Yeni URL: \`${PROFILE_URL_NEW}\`
- Sayfa ID: 268 (slug değiştirildi; yeni paralel sayfa oluşturulmadı)
- ProfilePage + Person + BreadcrumbList JSON-LD eklendi
- Makale listesi shortcode: \`[ceren_aile_makaleleri]\`, \`[ceren_son_guncellenen]\`
- Apply sonucu: ${JSON.stringify(apply?.profile || 'henüz uygulanmadı')}

### Schema
- Profil: ProfilePage + Person (\`@id\`: \`https://adanaavukat.org/#person\`)
- Hub: CollectionPage
- Makaleler: Rank Math Article/BlogPosting author alanı Person + profil URL (yinelenen Article enjekte edilmez; Rank Math yoksa fallback)

### İç link / hub
- Aile Hukuku Rehberi’ne 5 konu kümesi kartı
- Aile hukuku yazı sonuna ilgili içerikler + uzman kutusu
- Profil/author URL’leri içeriklerde güncellendi (${apply?.linkRewrites?.length ?? 0} kayıt)

### E-E-A-T sayfaları
${(apply?.eeatPages || []).map((p) => `- \`/${p.slug}/\` — ${p.action}`).join('\n') || '- Henüz uygulanmadı'}

### 301 yönlendirmeler
- \`${AUTHOR_URL_OLD}\` → \`${AUTHOR_URL_NEW}\`
- \`${PROFILE_URL_OLD}\` → \`${PROFILE_URL_NEW}\`
- \`/about-us/\` → \`/hakkimizda/\`
- \`/contact/\` → \`/iletisim/\`

### Birleştirilen içerikler
- Otomatik içerik birleştirme **yapılmadı** (hukuki risk). Ayrıntı: \`content-cannibalization-report.md\`

## Manuel eklenmesi gerekenler
- Baro sicil no, mezuniyet, sertifika, deneyim yılı (doğrulanmadan eklenmedi)
- 6284 için ayrı derin hub içeriği (şu an aile hukuku hizmet sayfasına bağlandı)
- \`ceren_uygulama_notu\` özel alanı: WP REST/meta ile yazı bazında doldurulmalı
- \`aa_legal_review_date\` alanları yazı bazında manuel
- Ana sayfa schema’nın canlıya yeniden uygulanması istenirse: \`npm run apply:homepage\` (lib güncellendi)
- Cloudflare purge (env yok)
- GSC’de eski URL’lerin 301 sonrası izlenmesi

## Doğrulama
${JSON.stringify(apply?.verification || { note: 'apply çalıştırılmalı' }, null, 2)}

## Apply JSON
${applyPath || 'yok'}
`;

  const cannibalization = `# İçerik Cannibalization Raporu

Tarih: ${new Date().toISOString()}
Kapsam: Aile hukuku yazıları (otomatik silme/birleştirme yok)

## Grup 1 — Anlaşmalı boşanma
| URL | Başlık | Kelime | Tarih | Güncelleme | İç link | Not |
|-----|--------|--------|-------|------------|---------|-----|
${posts
  .filter((p) => /anlasmali|anlaşmalı/i.test(p.slug + p.title))
  .map(
    (p) =>
      `| ${p.link} | ${p.title} | ${p.wordCount} | ${p.date?.slice(0, 10)} | ${p.modified?.slice(0, 10)} | ${p.internalLinkCount} | Hizmet sayfası ile niyet ayrımı kontrol edilmeli |`
  )
  .join('\n') || '| — | — | — | — | — | — | Eşleşme yok |'}

**Öneri:** Hizmet niyeti \`/adana-anlasmali-bosanma-avukati/\` korunmalı. Rehber niyeti taşıyan yazı varsa birleştirme **manuel hukukçu onayı** ile.

## Grup 2 — Çekişmeli boşanma / delil
${posts
  .filter((p) => /cekismeli|çekişmeli|delil|whatsapp|takdir/i.test(p.slug + p.title))
  .map((p) => `- ${p.link} — ${p.title} (${p.wordCount} kelime, ${p.internalLinkCount} iç link)`)
  .join('\n') || '- Eşleşme yok'}

**Korunacak ana URL (öneri):** en kapsamlı / en güncel yazı + hizmet sayfası \`/cekismeli-bosanma-davasi/\`
**Otomatik işlem:** Yok

## Grup 3 — Nafaka türleri / artırım
${posts
  .filter((p) => /nafaka/i.test(p.slug + p.title))
  .map((p) => `- ${p.link} — ${p.title} (${p.wordCount} kelime)`)
  .join('\n') || '- Eşleşme yok'}

**Öneri:** \`nafaka-turleri-...\` bilgilendirme hub’ı; \`adana-nafaka-artirim-...\` alt konu. Birleştirme şart değil; çapraz iç link güçlendirilsin.

## Grup 4 — Velayet
${posts
  .filter((p) => /velayet/i.test(p.slug + p.title))
  .map((p) => `- ${p.link} — ${p.title}`)
  .join('\n') || '- Eşleşme yok'}

## Grup 5 — “Aile hukuku nedir?” / avukat seçimi / genel
${posts
  .filter((p) => /aile-hukuku|avukat-secer|avukat seç/i.test(p.slug + p.title))
  .map((p) => `- ${p.link} — ${p.title}`)
  .join('\n') || '- Eşleşme yok'}

**Öneri:** Genel “nedir” içerikleri Aile Hukuku Rehberi’ne bağlansın; silme yok.

## Grup 6 — Adana boşanma avukatı / dava nasıl açılır
- Hizmet: \`/adana-bosanma-avukati/\`
- Rehber: \`/adanada-bosanma-davasi-sureci/\`
**Niyet ayrımı:** Hizmet vs bilgilendirme — birleştirilmemeli.

## Otomatik yapılanlar
- Yok (bilinçli)

## Manuel bekleyenler
- Anlaşmalı boşanma yazı+hizmet örtüşmesi hukukçu gözden geçirmesi
- Takdir yetkisi / delil yazılarının hub altında kümelenmesi
- Zayıf/çok kısa mükerrer varsa 301 kararı (şu an aday yok / otomatik uygulanmadı)
`;

  const legal = `# Hukuki İçerik Güncellik İnceleme Raporu

Tarih: ${new Date().toISOString()}

## Şüpheli / kontrol gereken yazılar

### 1) 12. Yargı Paketi / aile arabuluculuğu
${posts
  .filter((p) => p.flags?.yargiPaketi || p.flags?.aileArabuluculukZorunlu)
  .map(
    (p) => `#### ${p.title}
- URL: ${p.link}
- Neden: “Yargı paketi” ve/veya “aile arabuluculuğu zorunlu” benzeri kesin ifadeler riski
- Yapılacak: Resmî Gazete + TBMM + Adalet Bakanlığı metinleriyle doğrula; yürürlük tarihi yoksa kesin dil yumuşat
- Otomatik düzeltme: **Yapılmadı**
`
  )
  .join('\n') || '- Envanterde işaretli yazı yok'}

### 2) cerenummer.com kırık/ilgisiz alan adı
${posts
  .filter((p) => p.flags?.cerenummer)
  .map((p) => `- ${p.link} — apply sırasında profil URL’sine güvenli replace hedeflendi`)
  .join('\n') || '- Yok'}

### 3) cerensumer.av.tr birincil içerik linkleri
${posts
  .filter((p) => p.flags?.cerensumerAv)
  .map((p) => `- ${p.link} — sameAs olarak kalabilir; birincil CTA ise adanaavukat.org’a çekilmeli`)
  .join('\n') || '- Yok'}

## Önerilen resmî kaynak türleri
1. Mevzuat Bilgi Sistemi
2. Resmî Gazete
3. TBMM
4. Adalet Bakanlığı
5. Anayasa Mahkemesi
6. Yargıtay
7. Türkiye Barolar Birliği

## Manuel hukukçu onayı gereken noktalar
- Aile arabuluculuğunun zorunlu olup olmadığına dair her kesin cümle
- Yargı paketi yürürlük ve kapsam iddiaları
- Harç / parasal sınır / süre içeren tablolar (varsa)
- Nafaka “otomatik kalkar” benzeri genellemeler
`;

  const linking = `# İç Linkleme Raporu

Tarih: ${new Date().toISOString()}

## Hub sayfaları
- Ana hub: ${BASE_URL}/aile-hukuku-rehberi/
- Profil: ${PROFILE_URL_NEW}
${CLUSTER_HUBS.map((c) => `- Küme: **${c.title}** → ${BASE_URL}${c.primaryService}${c.note ? ` _(not: ${c.note})_` : ''}`).join('\n')}

## Otomatik eklenen iç link mekanizması
- Code Snippet: aile hukuku kategorilerindeki yazı sonuna
  - İlgili 3 yazı
  - Aile Hukuku Rehberi
  - Profil sayfası
  - Uzman kutusu (yalnızca yazar ID 1 + aile kategorileri)

## İç link zayıf yazılar (< 4 iç link)
${posts
  .filter((p) => p.internalLinkCount < 4)
  .map((p) => `- ${p.link} — ${p.internalLinkCount} iç link`)
  .join('\n') || '- Yok'}

## Yetim / düşük bağlantı riski
- 6284 özel makale seti zayıf → hub kartı aile hukuku hizmetine bağlandı
- Mal rejimi / ziynet için ayrı derin rehber yoksa konu havuzundan üretilebilir (\`npm run auto:article\`)

## Hâlâ manuel iç link verilmesi gerekenler
- Küme hub’larından ilgili 2–3 makaleye bağlamsal anchor’lar
- Hizmet sayfalarından profil + ilgili rehber yazılarına çapraz link QC
`;

  writeFileSync(resolve(rootDir, 'ceren-sumer-cilli-authority-report.md'), authorityReport, 'utf8');
  writeFileSync(resolve(rootDir, 'content-cannibalization-report.md'), cannibalization, 'utf8');
  writeFileSync(resolve(rootDir, 'legal-content-review-report.md'), legal, 'utf8');
  writeFileSync(resolve(rootDir, 'internal-linking-report.md'), linking, 'utf8');
  console.log('Reports written to project root.');
}

main();
