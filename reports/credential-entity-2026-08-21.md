# Credential / entity güncellemesi — yerel taslak

Tarih: 2026-08-21  
Mod: **yalnızca local preview** — canlı WordPress yok.

## Profil URL (mevcut, yeni sayfa yok)
https://adanaavukat.org/avukat-ceren-sumer-cilli/

## Değişiklik özeti
- Placeholder “uydurulmamıştır” notu kaldırıldı
- Kısa eğitim / arabuluculuk / Milliyet / Onur Listesi metni eklendi
- Kanonik kişi linki: https://www.cerensumer.av.tr/av-ceren-sumer-cilli/
- sameAs eski kimdir URL’si → kanonik profil
- alumniOf eklendi
- Makale author Person sameAs kanonik URL (snippet kaynağı)

## Canlı uygulama
`node scripts/apply-official-profiles.mjs` — onay olmadan çalıştırılmadı.
`npm run preview:credentials` yerel HTML/JSON üretir.
