# Ana Sayfa Yeniden Tasarım — Uygulama Raporu

> Tarih: 2026-06-13T21:12:39.610Z
> Durum: **CANLI UYGULANDI**

## Özet

| Öğe | Değer |
|-----|-------|
| Ana sayfa ID | 7 |
| Slug | adana-avukat |
| Önceki modified | 2026-06-13T21:06:50 |
| Yeni modified | 2026-06-13T21:12:38 |
| Site tagline | Site tagline güncellendi. |

## Yedekler

- `C:\Users\scurt\Desktop\Cursor Dosyalar\adanaavukat.org\data\backups\homepage-7-pre-polish-2026-06-13T21-12-38.json`
- `C:\Users\scurt\Desktop\Cursor Dosyalar\adanaavukat.org\data\backups\homepage-7-pre-polish-2026-06-13T21-12-38.html`

## Oluşturulan local dosyalar

- `generated/homepage-gutenberg-content.html`
- `generated/homepage-schema-live.json`

## Uygulanan bölümler

1. Hero (H1, CTA, güven cümlesi)
2. Hizmet kartları (9 alan)
3. Av. Ceren Sümer Cilli entity bölümü
4. Neden hukuki destek önemli
5. Son 5 hukuk rehberi yazısı
6. FAQ (6 soru, reklam yasağına uygun)
7. İletişim CTA
8. Schema JSON-LD (adanaavukat.org domain)

## Geri alma

Önceki içeriği geri yüklemek için yedek dosyasındaki `content.raw` alanını kullanın:

```bash
node scripts/apply-homepage-redesign.mjs --restore=C:\Users\scurt\Desktop\Cursor Dosyalar\adanaavukat.org\data\backups\homepage-7-pre-polish-2026-06-13T21-12-38.json
```

_(Restore flag henüz ayrı script olarak eklenebilir; yedek JSON'dan manuel REST PUT da yapılabilir.)_
