# Yazı Kartı Placeholder — Uygulama Raporu

> 2026-06-13T21:38:34.895Z

## Yedek

- `C:\Users\scurt\Desktop\Cursor Dosyalar\adanaavukat.org\data\backups\homepage-7-pre-post-card-placeholder-2026-06-13T21-38-27.json`
- `C:\Users\scurt\Desktop\Cursor Dosyalar\adanaavukat.org\data\backups\homepage-7-pre-post-card-placeholder-2026-06-13T21-38-27.html`

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
| Kategori snippet CSS | ✅ |
| Kategori ast-no-thumb | ✅ |

## Tasarım

- Tek inline SVG (belge ikonu, ~56px)
- Lacivert gradient arka plan (#0a1f38 → #1a3a5c)
- 16:9 aspect-ratio, lazy loading hazır (img varsa)
- Makale içi ana görsel alanına dokunulmadı
