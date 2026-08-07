# Avukat Ceren Sümer Cilli — Otorite ve E-E-A-T Raporu

Tarih: 2026-07-13T14:43:33.885Z
Altyapı: WordPress (uzaktan) + yerel Node ESM tooling (`scripts/*.mjs`)
Branch: `feature/ceren-authority-eeat`

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
- Eski: `https://adanaavukat.org/author/yigit-cilligmail-com/` (slug: `yigit-cilligmail-com`)
- Yeni: `https://adanaavukat.org/author/avukat-ceren-sumer-cilli/` (slug: `avukat-ceren-sumer-cilli`)
- Görünen ad: Avukat Ceren Sümer Cilli
- Apply sonucu: "henüz uygulanmadı"

### Profil sayfası
- Eski URL: `https://adanaavukat.org/avukat-ceren-sumer-cilli-kimdir-adana-bosanma-ve-aile-hukuku/`
- Yeni URL: `https://adanaavukat.org/avukat-ceren-sumer-cilli/`
- Sayfa ID: 268 (slug değiştirildi; yeni paralel sayfa oluşturulmadı)
- ProfilePage + Person + BreadcrumbList JSON-LD eklendi
- Makale listesi shortcode: `[ceren_aile_makaleleri]`, `[ceren_son_guncellenen]`
- Apply sonucu: "henüz uygulanmadı"

### Schema
- Profil: ProfilePage + Person (`@id`: `https://adanaavukat.org/#person`)
- Hub: CollectionPage
- Makaleler: Rank Math Article/BlogPosting author alanı Person + profil URL (yinelenen Article enjekte edilmez; Rank Math yoksa fallback)

### İç link / hub
- Aile Hukuku Rehberi’ne 5 konu kümesi kartı
- Aile hukuku yazı sonuna ilgili içerikler + uzman kutusu
- Profil/author URL’leri içeriklerde güncellendi (0 kayıt)

### E-E-A-T sayfaları
- Henüz uygulanmadı

### 301 yönlendirmeler
- `https://adanaavukat.org/author/yigit-cilligmail-com/` → `https://adanaavukat.org/author/avukat-ceren-sumer-cilli/`
- `https://adanaavukat.org/avukat-ceren-sumer-cilli-kimdir-adana-bosanma-ve-aile-hukuku/` → `https://adanaavukat.org/avukat-ceren-sumer-cilli/`
- `/about-us/` → `/hakkimizda/`
- `/contact/` → `/iletisim/`

### Birleştirilen içerikler
- Otomatik içerik birleştirme **yapılmadı** (hukuki risk). Ayrıntı: `content-cannibalization-report.md`

## Manuel eklenmesi gerekenler
- Baro sicil no, mezuniyet, sertifika, deneyim yılı (doğrulanmadan eklenmedi)
- 6284 için ayrı derin hub içeriği (şu an aile hukuku hizmet sayfasına bağlandı)
- `ceren_uygulama_notu` özel alanı: WP REST/meta ile yazı bazında doldurulmalı
- `aa_legal_review_date` alanları yazı bazında manuel
- Ana sayfa schema’nın canlıya yeniden uygulanması istenirse: `npm run apply:homepage` (lib güncellendi)
- Cloudflare purge (env yok)
- GSC’de eski URL’lerin 301 sonrası izlenmesi

## Doğrulama
{
  "ok": true,
  "failed": [],
  "checks": {
    "authorSlug": true,
    "authorName": true,
    "profileSlug": true,
    "authorOldRedirect": true,
    "profileOldRedirect": true,
    "profileLive200": true,
    "profileHasJsonLd": true,
    "profileHasArticlesShortcodeResolved": true,
    "hubHasClusters": true,
    "hubCollectionSchema": true
  }
}

## Apply JSON
C:\Users\scurt\Desktop\Cursor Dosyalar\adanaavukat.org\reports\ceren-authority-apply-2026-07-13T14-42-49.json
