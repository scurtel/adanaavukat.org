# Header Layout Fixes

> 2026-07-22

## Root causes
1. **İletişim CTA:** Astra `.menu-link { height:100%; line-height:~83px }` + button padding → ~87×101 px visible box.
2. **Profil çift H1:** Astra `entry-title` + content `<h1 itemprop="name">` (page-id-268).
3. **Site title:** `body.wp-custom-logo` varken `.ast-site-title-wrap` görünür kaldı.

## Live changes
| Hedef | Yöntem |
|---|---|
| Site geneli CSS + profil H1 | Code Snippet **#16** `Adana Avukat Header Layout Fixes` (aktif); #15 pasif |
| Ana sayfa inline CSS sync | WP page **#7** header CTA / site-title kuralları |

## Repo files
- `scripts/lib/header-layout-fixes.mjs` — CSS + snippet PHP
- `scripts/apply-header-layout-fixes.mjs` — uygula / yedek / verify
- `scripts/apply-header-polish.mjs` — snippet apply’e delege
- `scripts/lib/homepage-content.mjs` — homepage CSS kaynağı güncellendi
- `package.json` — `apply:header-layout` eklendi

## Backups
- `data/backups/homepage-7-before-header-layout-*.html`

## Verification
| URL | HTTP | Not |
|---|---|---|
| `/` | 200 | CTA ~84×32; site-title sr-only |
| `/avukat-ceren-sumer-cilli/` | 200 | tek H1 `itemprop="name"` |
| `/iletisim/` | 200 | entry-title korundu |
| `/aile-hukuku-rehberi/` | 200 | entry-title korundu |

Mobil: hamburger menü açılıyor; logo boyutu bozulmadı; site-title görsel olarak gizli.
