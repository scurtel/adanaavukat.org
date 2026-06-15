# Yazı Kartı Placeholder — Uygulama Raporu

> 2026-06-13T22:14:06.900Z
> Mod: snippet-only

## Yedek

- Snippet-only modu — ana sayfa yedeklenmedi

## Değiştirilen dosyalar (repo)

| Dosya | Değişiklik |
|-------|------------|
| `scripts/lib/post-card-placeholder.mjs` | SVG, CSS, thumb HTML üretici |
| `scripts/lib/homepage-content.mjs` | Son Yazılar kartlarına görsel alanı + CSS |
| `scripts/apply-post-card-placeholder.mjs` | Canlı uygulama scripti |
| `package.json` | `apply:post-card-placeholder` komutu |

## Canlı değişiklikler

| Hedef | İşlem |
|-------|-------|
| Ana sayfa (ID 7) | 5 yazı kartına 16:9 placeholder alanı eklendi |
| Code Snippet (ID 7) | Astra arşiv/kategori/ilgili yazı CSS |

## Doğrulama

| Kontrol | Sonuç |
|---------|-------|
| Ana sayfa aa-post-card | ✅ |
| Ana sayfa placeholder SVG | ✅ |
| Tek H1 | ✅ (1) |
| Aile Hukuku Rehberi CSS | ❌ |
| post-card-placeholder sınıfı | ❌ |
| Etiket stili (#f5d77a) | ❌ |
| Placeholder JS (Astra boş thumb) | ❌ |

## Tasarım

- Kategoriye göre etiket (Aile Hukuku, Boşanma Hukuku, Miras Hukuku, vb.)
- 16:9 aspect-ratio, lacivert gradient + altın etiket
- Öne çıkan görseli olan yazılarda normal thumbnail
- Ek görsel dosyası yok — yalnızca CSS + hafif inline JS
