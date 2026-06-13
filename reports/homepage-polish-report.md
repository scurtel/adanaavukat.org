# Ana Sayfa İnce Ayar (v2) — Uygulama Raporu

> Tarih: 2026-06-13T21:12–21:15 UTC

## Yapılanlar

### 1. Ana sayfa tasarım v2 (canlı — Sayfa ID 7)

- **Hero:** Daha derin lacivert gradient, altın vurgu çizgisi, büyük butonlar (`1rem 2rem`), güven cümlesi üst border ile ayrıldı
- **Kartlar:** `gap: 1.5rem`, hover’da üst accent bar, yumuşak gölge geçişleri
- **Entity bölümü:** Arka plan kutusu ve border ile vurgulandı
- **FAQ / CTA:** Kart gölgeleri ve gradient CTA bandı iyileştirildi
- **Mobil:** Butonlar tam genişlik, padding ve grid tek sütuna düşüyor
- **Tek H1:** Astra sayfa başlığı gizli — yalnızca hero’da `Adana Avukat`

### 2. Site geneli header (Additional CSS — ID 277)

- Menü 1120px hizalı, ince alt border ve gölge
- Menü linkleri hover arka planı
- Site başlığı lacivert, kalın tipografi
- **İletişim** butonu: lacivert, gölge, hover’da hafif yükselme

### Yedek

- `data/backups/homepage-7-pre-polish-2026-06-13T21-12-38.json`

## Kalite kontrol

| Kontrol | Sonuç |
|---------|-------|
| Kritik sorun | Yok |
| Kırık link | 0 |
| Çift H1 | Yok (doğrulandı) |
| Reklam yasağı ihlali (gövde) | Yok |

## Henüz manuel gereken

1. **Rank Math** title/description — panelden güncelle + önbellek temizle
2. **Sitemap** — Rank Math’ta yeniden oluştur (8 yeni URL eksik)
3. **Schema domain** — Rank Math global ayarlarda `cerensumer.av.tr` → `adanaavukat.org` birleştirme

## Komutlar

```bash
npm run apply:homepage      # Ana sayfa içerik + CSS
npm run apply:header-polish # Site geneli header CSS
npm run qc:post-redesign    # Kalite kontrolü
```

## Canlı URL

https://adanaavukat.org/
