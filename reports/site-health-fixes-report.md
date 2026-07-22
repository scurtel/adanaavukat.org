# Site Health Fixes Report

> 2026-07-22 (final)

## Değiştirilen WordPress ayarları (Code Snippets)

| Snippet | ID | Değişiklik |
|---|---|---|
| Adana Avukat Header Layout Fixes | **16** (updated) | `astra_the_title_enabled` → false for pages **268, 305, 307, 311, 313** |
| Adana Avukat Authority Redirects | **10** (updated) | `/sikca-sorulan-sorular` → `/faq/` (301, query korunur) |
| Adana Avukat Security Headers | **17** (created) | HSTS, nosniff, Referrer-Policy, Permissions-Policy, X-Frame-Options |

## Repo dosyaları
- `scripts/lib/header-layout-fixes.mjs` — tek-H1 sayfa ID listesi genişletildi
- `scripts/apply-site-health-fixes.mjs` — uygulama + verify
- `package.json` — `npm run apply:site-health`
- `reports/site-health-fixes-report.md`

## H1 before → after

| Sayfa | Önce | Sonra | entry-title DOM |
|---|---|---|---|
| `/adana-anlasmali-bosanma-avukati/` | **2** | **1** (`<h1>Adana Anlaşmalı Boşanma Avukatı</h1>`) | yok |
| `/adana-aile-hukuku-avukati/` | **2** | **1** (`<h1>Adana Aile Hukuku Avukatı</h1>`) | yok |
| `/velayet-davasi-avukati-adana/` | **2** | **1** (`<h1>Adana Velayet Davası Avukatı</h1>`) | yok |
| `/gayrimenkul-avukati-adana/` | **2** | **1** (`<h1>Adana Gayrimenkul Avukatı</h1>`) | yok |
| `/avukat-ceren-sumer-cilli/` (kontrol) | 1 | **1** | yok |

Yöntem: Profil ile aynı — `astra_the_title_enabled` false (DOM’dan kaldırır). Yalnızca CSS hide değil.

## 301 yönlendirme testi
- `/sikca-sorulan-sorular/` → **301** `https://adanaavukat.org/faq/`
- `/sikca-sorulan-sorular/?utm=test&x=1` → **301** `https://adanaavukat.org/faq/?utm=test&x=1`
- `/faq/` → **200**
- Menü `/faq/` değiştirilmedi

## Security headers (gözlenen)
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (HTTPS doğrulandı; HTTP→HTTPS 301 mevcut)
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=(), camera=()`
- `X-Frame-Options: SAMEORIGIN`
- `Content-Security-Policy: upgrade-insecure-requests` (host’tan mevcut)

### CSP notu
Katı CSP **uygulanmadı**. Google / sosyal bağlantılar / üçüncü taraf riski nedeniyle; mevcut `upgrade-insecure-requests` korundu.

## Cache
LiteSpeed purge denendi (`rankmath-global` / purge hint); doğrulama cache sonrası tekrarlandı.

## Uygulanmayan / manuel
- Profil foto 225×225 — WP’den ≥800×800 yükleme önerisi
- İletişim formu — ürün kararı
- Fold-altı LiteSpeed placeholder — bilinçli lazy-load

## Son sağlık
- 4 hizmet sayfası HTTP **200**, tek H1, schema parse OK
- Header CTA / logo / site-title / profil H1 / menü / lazy-load’a dokunulmadı
