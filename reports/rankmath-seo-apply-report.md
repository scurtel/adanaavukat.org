# Rank Math SEO — Uygulama ve Kontrol Raporu

> 2026-06-13T21:25:54.386Z

## Hedef değerler

| Alan | Değer |
|------|-------|
| Title | Adana Avukat | Ceren Sümer Cilli Hukuk ve Danışmanlık (53 karakter) |
| Description | Adana’da aile hukuku, boşanma, nafaka, velayet, miras ve iş hukuku alanlarında hukuki destek. Av. Ceren Sümer Cilli ile iletişime geçin. (136 karakter) |
| Focus keyword | Adana Avukat |
| OG title | Adana Avukat | Av. Ceren Sümer Cilli |
| OG description | Adana’da boşanma, nafaka, velayet, miras ve iş hukuku süreçlerinde hukuki destek alın. |

## Uygulama durumu

| Yöntem | Sonuç |
|--------|-------|
| adanaavukat/v1 | ✅ |
| wp/v2/pages meta | ✅ |
| rankmath/v1/updateMeta | ❌ 403 |

**Code Snippet:** Aktif (ID 6, created)

**Yedek:** `C:\Users\scurt\Desktop\Cursor Dosyalar\adanaavukat.org\data\backups\homepage-7-pre-rankmath-seo-2026-06-13T21-25-41.json`

## Canlı doğrulama (ana sayfa)

| Kontrol | Hedef | Canlı | Durum |
|---------|-------|-------|-------|
| Title | Adana Avukat | Ceren Sümer Cilli Hukuk ve Danışmanlık | Adana Avukat | Ceren Sümer Cilli Hukuk ve Danışmanlık | ✅ |
| Description | (hedef metin) | Adana’da aile hukuku, boşanma, nafaka, velayet, miras ve iş hukuku alanlarında hukuki destek. Av. Ceren Sümer Cilli ile iletişime geçin. | ✅ |
| OG title | Adana Avukat | Av. Ceren Sümer Cilli | Adana Avukat | Av. Ceren Sümer Cilli | ✅ |
| OG description | (hedef metin) | Adana’da boşanma, nafaka, velayet, miras ve iş hukuku süreçlerinde hukuki destek alın. | ✅ |
| Robots | index, follow | index, follow, max-snippet:-1, max-video-preview:-1, max-image-preview:large | ✅ |
| H1 sayısı | 1 | 1 (Adana Avukat) | ✅ |
| Title uzunluğu | ≤60 | 53 | ✅ |
| Description uzunluğu | 140–165 | 136 | ⚠️ |

## Sitemap

- Index erişimi: ✅
- Toplam URL: 32
- https://adanaavukat.org: ✅ sitemap içinde
- https://adanaavukat.org/adana-miras-hukuku: ❌ eksik
- https://adanaavukat.org/adana-kira-hukuku: ❌ eksik
- https://adanaavukat.org/adana-is-hukuku: ❌ eksik

## Robots / arşiv sayfaları

- `/` → robots: index, follow, max-snippet:-1, max-video-preview:-1, max-image-preview:large (HTTP 200)
- `/adana-miras-hukuku/` → robots: follow, index, max-snippet:-1, max-video-preview:-1, max-image-preview:large (HTTP 200)
- `/adana-kira-hukuku/` → robots: follow, index, max-snippet:-1, max-video-preview:-1, max-image-preview:large (HTTP 200)
- `/adana-is-hukuku/` → robots: follow, index, max-snippet:-1, max-video-preview:-1, max-image-preview:large (HTTP 200)
- `/category/` → robots: follow, noindex (HTTP 404)
- `/tag/` → robots: follow, noindex (HTTP 404)
- `/author/` → robots: follow, noindex (HTTP 404)

**Arşiv noindex (Rank Math updateSettings):** API çağrısı başarılı

## Kırık linkler

Kırık link tespit edilmedi.

## Manuel adımlar (gerekirse)

1. `wordpress-plugins/adanaavukat-rankmath-rest.zip` dosyasını WP → Eklentiler → Yeni Ekle → Yükle ile kurun ve etkinleştirin
2. Rank Math → Genel Ayarlar → Webmaster: sitemap yenile
3. Rank Math → Başlıklar ve Meta → Arşivler: Kategori, Etiket, Yazar → Noindex
4. LiteSpeed Cache → Purge All
5. Ana sayfa → Rank Math panel: focus keyword + yardımcı kelimeler doğrula
