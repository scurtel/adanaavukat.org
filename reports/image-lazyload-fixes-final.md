# Görsel / Logo / Lazy-load Düzeltme Raporu

**Tarih:** 2026-07-22  
**Site:** https://adanaavukat.org  
**Tema:** Astra 4.12.6 (Header Builder)

## Sorunun kesin nedeni

LiteSpeed Cache Image Lazy Load, kritik görsellerin `src` değerini gri SVG/GIF placeholder’a çevirip gerçek URL’yi `data-src` içine taşıyordu. Lazy-load JS gecikince veya tetiklenmeyince görseller boş/gri kalıyordu.

Bu bir 404 / eksik dosya sorunu değildi; upload URL’leri `200 OK` dönüyordu.

Ek bulgular:
- `site_logo` / custom logo tanımlı değildi → header yalnızca metin gösteriyordu.
- Profil fotoğrafı kaynağı yalnızca **225×225 px** (media #269).
- Ana sayfa hero’da görsel yok (tasarım tercihi; değiştirilmedi).

## Yapılan değişiklikler

### WordPress (canlı)

| Değişiklik | Detay |
|---|---|
| Custom logo | `site_logo` → media **#18** (`adana-avukat-ceren-sumer-logo.webp`, 240×72) |
| Logo alt | `adanaavukat.org` |
| Code Snippet #7 | Post card placeholder + LiteSpeed lazy-load excludes birleştirildi |
| Ana sayfa (#7) | İlk 3 yazı kartı: `skip-lazy aa-skip-lazy aa-critical-img` + `loading="eager"` |
| Profil sayfası (#268) | Profil img: `aa-profile-photo skip-lazy`, `loading="eager"`, `fetchpriority="high"`, width/height |
| Additional CSS | Logo max-height ~40px (mobil ~34px), oran korunur |

### LiteSpeed exclude değerleri (snippet filtresi)

`litespeed_media_lazy_img_excludes`:
- `custom-logo`
- `skip-lazy`
- `aa-skip-lazy`
- `aa-profile-photo`
- `aa-critical-img`
- `adana-avukat-ceren-sumer-logo`
- `Avukat-Ceren-Sumer-Cilli`

Kritik görsellere eklenen class’lar: `skip-lazy`, `aa-skip-lazy`, (`aa-critical-img` / `aa-profile-photo`)

### Repo dosyaları

- `scripts/lib/image-lazyload-fixes.mjs` — snippet PHP kaynağı
- `scripts/lib/post-card-placeholder.mjs` — ilk 3 kart eager + PHP escape düzeltmesi
- `scripts/lib/homepage-content.mjs` — ilk 3 ana sayfa kartı critical
- `scripts/apply-image-lazyload-fixes.mjs` — uygulama scripti
- `package.json` — `npm run apply:image-fixes`
- `wordpress-plugins/adanaavukat-image-fixes/` — mirror notu

## Profil fotoğrafı image size

- Attachment ID: **269**
- Kaynak boyut: **225×225** (full = thumbnail üst sınır)
- Sayfada: full URL + `srcset` (yalnızca 225w mevcut)
- Kod hazır: daha büyük dosya yüklenince `width`/`height`/`srcset` attachment meta’sından güncellenebilir
- **Yapay büyütme yapılmadı**

## Header logo nasıl bağlandı

1. WP REST `POST /wp/v2/settings` → `site_logo: 18`
2. Astra `custom-logo` / `the_custom_logo()` çıktısı
3. Snippet `get_custom_logo` + `wp_get_attachment_image_attributes` ile `skip-lazy` / `eager` / `fetchpriority="high"`
4. Additional CSS ile header yüksekliğini şişirmeden boyut sınırlama

Logo yoksa Astra site başlığı metnine düşer (fallback korunur).

## Doğrulama (canlı HTML)

| Kontrol | Sonuç |
|---|---|
| Header logo gerçek `src` | ✅ placeholder yok |
| Logo `skip-lazy` | ✅ |
| Ana sayfa ilk 3 kart eager | ✅ |
| Ana sayfa 4–5. kart lazy | ✅ (kasıtlı) |
| Blog ilk 3 thumb skip-lazy | ✅ |
| Blog 4+ lazy | ✅ |
| Profil foto gerçek `src` + eager | ✅ |
| Hero’ya görsel eklenmedi | ✅ |

## Senin yapman gerekenler (manuel)

1. **LiteSpeed Cache → Toolbox → Purge All** (bir kez daha)
2. Varsa **QUIC.cloud / CDN** cache temizliği
3. Tarayıcıda gizli sekme: ana sayfa, `/aile-hukuku-rehberi/`, `/avukat-ceren-sumer-cilli/` (masaüstü + mobil)
4. **Profil fotoğrafı:** Medya’ya en az **800×800 px** yeni foto yükle; profil sayfasındaki görseli bu yeni dosyayla değiştir (mevcut #269 225px — Retina’da net olamaz)
5. **Retina logo (opsiyonel):** ~480×144 (veya 2×) webp yükleyip Görünüm → Özelleştir → Logo olarak ata

## Cache / test adımları

1. LiteSpeed Purge All  
2. CDN purge (varsa)  
3. Hard refresh / gizli sekme  
4. Logo ilk boyamada görünmeli (gri kutu olmamalı)  
5. Blog listesinde üst kart görselleri dolu; alt kartlar lazy ile gelebilir  
6. Konsolda yeni JS hatası olmamalı  

## Tekrar uygulama

```bash
npm run apply:image-fixes
```
