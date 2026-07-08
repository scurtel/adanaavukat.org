# Menu Post-Push Verification

Date: 2026-07-08
Repo: `adanaavukat.org`
Branch: `master`
Commit pushed: `3e2b87d`
Remote: `origin https://github.com/scurtel/adanaavukat.org.git`

## 1) Push durumu

- `git push origin master` başarılı.
- Çıktı: `2f3508a..3e2b87d  master -> master`

## 2) Mobil user-agent ile ana sayfa kontrolü

Mobil UA ile (`iPhone Safari`) canlı HTML çekildi ve mobil menü bloğu (`ast-hf-mobile-menu`) doğrulandı.

Beklenen ana menü URL öğeleri mobil menüde mevcut:

- `/aile-hukuku-rehberi/`
- `/hizmetlerimiz/`
- `/hakkimizda/`
- `/avukat-ceren-sumer-cilli-kimdir-adana-bosanma-ve-aile-hukuku/`
- `/faq/`
- `/iletisim/`

## 3) Yasaklı ifadeler kontrolü (canlı mobil HTML)

Mobil menü HTML segmentinde aşağıdaki kontrollerin tamamı geçti:

- `About Us` -> bulunmadı
- `Contact` -> bulunmadı
- `page-item-25` -> bulunmadı
- `page-item-29` -> bulunmadı

## 4) Cache temizliği

### LiteSpeed purge all

- Endpoint: `POST /wp-json/adanaavukat/v1/rankmath-global`
- Payload: `{ "purge_litespeed": true }`
- Sonuç: `200 {"changed":{"purge_litespeed":true}}`

### Cloudflare purge

- Proje ortamında Cloudflare purge için gerekli env anahtarları bulunamadı:
  - `CLOUDFLARE_API_TOKEN`
  - `CF_API_TOKEN`
  - `CLOUDFLARE_ZONE_ID`
  - `CF_ZONE_ID`
- Bu nedenle otomatik Cloudflare purge uygulanamadı.

### Gizli sekme kontrolü

- Tam browser tabanlı gerçek "gizli sekme" testi bu oturumda otomatik çalıştırılmadı.
- Eşdeğer olarak cache-bypass istekleri (`nocache` query + `Cache-Control: no-cache`) ile canlı HTML yeniden doğrulandı.
- Manuel ek doğrulama önerisi: telefonda veya desktop private window ile `https://adanaavukat.org/` açıp mobil menüyü görsel olarak kontrol edin.

## 5) About Us / Contact kullanım dışı akış değerlendirmesi (otomatik uygulama YAPILMADI)

Önce URL kontrolleri yapıldı:

- `https://adanaavukat.org/about-us/` -> `301` -> `https://adanaavukat.org/hakkimizda/`
- `https://adanaavukat.org/contact/` -> `301` -> `https://adanaavukat.org/iletisim/`
- `https://adanaavukat.org/hakkimizda/` -> `200`
- `https://adanaavukat.org/iletisim/` -> `200`

Değerlendirme:

- EN URL'ler zaten TR karşılıklarına 301 yönleniyor, bu SEO açısından doğru.
- Sayfaları silmeye gerek yok (istenenle uyumlu).
- Trafik almama kararı için analytics/log verisi gerekir; bu oturumda GA/GSC/Cloudflare analytics erişimi olmadığı için "trafik almıyor" kesin kararı verilemedi.

Öneri (otomatik uygulama yapılmadı):

1. Son 90 gün trafik verisi (GA4 + GSC + server logs) kontrol edilsin.
2. Trafik yoksa `about-us` ve `contact` içerikleri:
   - ya `draft` yapılabilir,
   - ya da yayında kalıp `noindex` olarak tutulabilir.
3. Her iki durumda da mevcut 301 yönlendirmeler (`/hakkimizda/`, `/iletisim/`) korunmalı.

## 6) Çalıştırılan başlıca komutlar

- `git push origin master`
- Mobil canlı kontrol (Node fetch + mobile UA + menu segment parsing)
- `POST /wp-json/adanaavukat/v1/rankmath-global` with `purge_litespeed=true`
- URL durum kontrolleri (`about-us/contact` 301 doğrulaması)
