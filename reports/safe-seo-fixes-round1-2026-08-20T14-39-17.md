# Güvenli SEO Düzeltme Turu 1 — Rapor

Tarih: 2026-08-20T14-39-17
Dry-run: hayır

## Değiştirilen dosya/ayarlar

### .htaccess
- Yedek: `data/htaccess-live-backup.txt`
- Düzeltilmiş: `data/htaccess-fixed-round1.txt`
- Yüklendi: evet

### Code Snippets
- Adana Avukat Authority Redirects: updated (id: 10)
- Adana Avukat Profile Redirect Guard: created (id: 18)
- Adana Avukat WWW Canonical Redirect: created (id: 19)
- Adana Avukat Homepage Paged Noindex: created (id: 20)

### Ana sayfa (ID 7)
- Anlaşmalı Boşanma kartı → hizmet sayfası
- Velayet kartı → hizmet sayfası
- Aile Hukuku hizmet kartı eklendi
- Hizmetlerimiz iç linki eklendi

### Hizmetlerimiz (ID 237)
- Değişiklik yok

### Eski profil URL düzeltmeleri (içerik)
- adana-ise-iade-davasi-sureci (455)
- adana-sakli-pay-tenkis-davasi-miras-hukuku (451)
- adana-kira-tahliye-davasi-rehberi (448)
- adana-cocugu-gostermeme-hukuki-yollar (445)
- adana-bosanmada-ziynet-esyasi-alacagi (442)
- adana-uzaklastirma-karari-koruma-tedbirleri (439)
- adana-bosanmada-maddi-manevi-tazminat (436)
- adana-aile-uyusmazliklarinda-arabuluculuk (433)
- adanada-veraset-ilami-nasil-alinir (430)
- adana-anlasmali-bosanma-protokolu-dikkat-edilecekler (427)
- adana-kidem-ihbar-tazminati-hesaplama (424)
- adana-mal-rejimi-tasfiyesi-rehber (415)
- adana-velayet-degisikligi-davasi-ne-zaman-acilir (412)
- adana-bosanma-davasi-tanik-beyani-etkisi (409)
- adanada-kira-bedeli-uyarlamasi-rehberi (406)
- adana-avukat (7)

## HTTP davranışı

### Önce
```json
{
  "homepage": {
    "label": "homepage",
    "url": "https://adanaavukat.org/",
    "finalUrl": "https://adanaavukat.org/",
    "status": 200,
    "chain": [
      {
        "url": "https://adanaavukat.org/",
        "status": 200
      }
    ]
  },
  "homepage-meta": {
    "url": "https://adanaavukat.org/",
    "status": 200,
    "canonical": "https://adanaavukat.org/",
    "robots": "index, follow, max-snippet:-1, max-video-preview:-1, max-image-preview:large"
  },
  "robots": {
    "label": "robots",
    "url": "https://adanaavukat.org/robots.txt",
    "finalUrl": "https://adanaavukat.org/robots.txt",
    "status": 200,
    "chain": [
      {
        "url": "https://adanaavukat.org/robots.txt",
        "status": 200
      }
    ]
  },
  "sitemap": {
    "label": "sitemap",
    "url": "https://adanaavukat.org/sitemap_index.xml",
    "finalUrl": "https://adanaavukat.org/sitemap_index.xml",
    "status": 200,
    "chain": [
      {
        "url": "https://adanaavukat.org/sitemap_index.xml",
        "status": 200
      }
    ]
  },
  "bosanma": {
    "label": "bosanma",
    "url": "https://adanaavukat.org/adana-bosanma-avukati/",
    "finalUrl": "https://adanaavukat.org/adana-bosanma-avukati/",
    "status": 200,
    "chain": [
      {
        "url": "https://adanaavukat.org/adana-bosanma-avukati/",
        "status": 200
      }
    ]
  },
  "bosanma-meta": {
    "url": "https://adanaavukat.org/adana-bosanma-avukati/",
    "status": 200,
    "canonical": "https://adanaavukat.org/adana-bosanma-avukati/",
    "robots": "follow, index, max-snippet:-1, max-video-preview:-1, max-image-preview:large"
  },
  "aile": {
    "label": "aile",
    "url": "https://adanaavukat.org/adana-aile-hukuku-avukati/",
    "finalUrl": "https://adanaavukat.org/adana-aile-hukuku-avukati/",
    "status": 200,
    "chain": [
      {
        "url": "https://adanaavukat.org/adana-aile-hukuku-avukati/",
        "status": 200
      }
    ]
  },
  "anlasmali": {
    "label": "anlasmali",
    "url": "https://adanaavukat.org/adana-anlasmali-bosanma-avukati/",
    "finalUrl": "https://adanaavukat.org/adana-anlasmali-bosanma-avukati/",
    "status": 200,
    "chain": [
      {
        "url": "https://adanaavukat.org/adana-anlasmali-bosanma-avukati/",
        "status": 200
      }
    ]
  },
  "hizmetler": {
    "label": "hizmetler",
    "url": "https://adanaavukat.org/hizmetlerimiz/",
    "finalUrl": "https://adanaavukat.org/hizmetlerimiz/",
    "status": 200,
    "chain": [
      {
        "url": "https://adanaavukat.org/hizmetlerimiz/",
        "status": 200
      }
    ]
  },
  "profil-yeni": {
    "label": "profil-yeni",
    "url": "https://adanaavukat.org/avukat-ceren-sumer-cilli/",
    "finalUrl": "https://adanaavukat.org/avukat-ceren-sumer-cilli/",
    "status": 200,
    "chain": [
      {
        "url": "https://adanaavukat.org/avukat-ceren-sumer-cilli/",
        "status": 200
      }
    ]
  },
  "profil-yeni-meta": {
    "url": "https://adanaavukat.org/avukat-ceren-sumer-cilli/",
    "status": 200,
    "canonical": "https://adanaavukat.org/avukat-ceren-sumer-cilli/",
    "robots": "index, follow, max-snippet:-1, max-video-preview:-1, max-image-preview:large"
  },
  "page2": {
    "label": "page2",
    "url": "https://adanaavukat.org/page/2/",
    "finalUrl": "https://adanaavukat.org/page/2/",
    "status": 200,
    "chain": [
      {
        "url": "https://adanaavukat.org/page/2/",
        "status": 200
      }
    ]
  },
  "page2-meta": {
    "url": "https://adanaavukat.org/page/2/",
    "status": 200,
    "canonical": "https://adanaavukat.org/",
    "robots": "index, follow, max-snippet:-1, max-video-preview:-1, max-image-preview:large"
  },
  "wp-admin": {
    "label": "wp-admin",
    "url": "https://adanaavukat.org/wp-admin/",
    "finalUrl": "https://adanaavukat.org/wp-login.php?redirect_to=https%3A%2F%2Fadanaavukat.org%2Fwp-admin%2F&reauth=1",
    "status": 200,
    "chain": [
      {
        "url": "https://adanaavukat.org/wp-admin/",
        "status": 200
      }
    ]
  },
  "oldProfileRedirect": {
    "label": "old-profile",
    "url": "https://adanaavukat.org/avukat-ceren-sumer-cilli-kimdir-adana-bosanma-ve-aile-hukuku/",
    "finalUrl": "https://adanaavukat.org/avukat-ceren-sumer-cilli/",
    "status": 200,
    "chain": [
      {
        "url": "https://adanaavukat.org/avukat-ceren-sumer-cilli-kimdir-adana-bosanma-ve-aile-hukuku/",
        "status": 301,
        "location": "https://adanaavukat.org/avukat-ceren-sumer-cilli/"
      },
      {
        "url": "https://adanaavukat.org/avukat-ceren-sumer-cilli/",
        "status": 200,
        "location": null
      }
    ]
  },
  "wwwHttpRedirect": {
    "label": "www-http",
    "url": "http://www.adanaavukat.org/test-path?x=1",
    "finalUrl": "https://adanaavukat.org/test-path?x=1",
    "status": 404,
    "chain": [
      {
        "url": "http://www.adanaavukat.org/test-path?x=1",
        "status": 301,
        "location": "https://www.adanaavukat.org/test-path?x=1"
      },
      {
        "url": "https://www.adanaavukat.org/test-path?x=1",
        "status": 301,
        "location": "https://adanaavukat.org/test-path?x=1"
      },
      {
        "url": "https://adanaavukat.org/test-path?x=1",
        "status": 404,
        "location": null
      }
    ]
  }
}
```

### Sonra
```json
{
  "homepage": {
    "label": "homepage",
    "url": "https://adanaavukat.org/",
    "finalUrl": "https://adanaavukat.org/",
    "status": 200,
    "chain": [
      {
        "url": "https://adanaavukat.org/",
        "status": 200
      }
    ]
  },
  "homepage-meta": {
    "url": "https://adanaavukat.org/",
    "status": 200,
    "canonical": "https://adanaavukat.org/",
    "robots": "index, follow, max-snippet:-1, max-video-preview:-1, max-image-preview:large"
  },
  "robots": {
    "label": "robots",
    "url": "https://adanaavukat.org/robots.txt",
    "finalUrl": "https://adanaavukat.org/robots.txt",
    "status": 200,
    "chain": [
      {
        "url": "https://adanaavukat.org/robots.txt",
        "status": 200
      }
    ]
  },
  "sitemap": {
    "label": "sitemap",
    "url": "https://adanaavukat.org/sitemap_index.xml",
    "finalUrl": "https://adanaavukat.org/sitemap_index.xml",
    "status": 200,
    "chain": [
      {
        "url": "https://adanaavukat.org/sitemap_index.xml",
        "status": 200
      }
    ]
  },
  "bosanma": {
    "label": "bosanma",
    "url": "https://adanaavukat.org/adana-bosanma-avukati/",
    "finalUrl": "https://adanaavukat.org/adana-bosanma-avukati/",
    "status": 200,
    "chain": [
      {
        "url": "https://adanaavukat.org/adana-bosanma-avukati/",
        "status": 200
      }
    ]
  },
  "bosanma-meta": {
    "url": "https://adanaavukat.org/adana-bosanma-avukati/",
    "status": 200,
    "canonical": "https://adanaavukat.org/adana-bosanma-avukati/",
    "robots": "follow, index, max-snippet:-1, max-video-preview:-1, max-image-preview:large"
  },
  "aile": {
    "label": "aile",
    "url": "https://adanaavukat.org/adana-aile-hukuku-avukati/",
    "finalUrl": "https://adanaavukat.org/adana-aile-hukuku-avukati/",
    "status": 200,
    "chain": [
      {
        "url": "https://adanaavukat.org/adana-aile-hukuku-avukati/",
        "status": 200
      }
    ]
  },
  "anlasmali": {
    "label": "anlasmali",
    "url": "https://adanaavukat.org/adana-anlasmali-bosanma-avukati/",
    "finalUrl": "https://adanaavukat.org/adana-anlasmali-bosanma-avukati/",
    "status": 200,
    "chain": [
      {
        "url": "https://adanaavukat.org/adana-anlasmali-bosanma-avukati/",
        "status": 200
      }
    ]
  },
  "hizmetler": {
    "label": "hizmetler",
    "url": "https://adanaavukat.org/hizmetlerimiz/",
    "finalUrl": "https://adanaavukat.org/hizmetlerimiz/",
    "status": 200,
    "chain": [
      {
        "url": "https://adanaavukat.org/hizmetlerimiz/",
        "status": 200
      }
    ]
  },
  "profil-yeni": {
    "label": "profil-yeni",
    "url": "https://adanaavukat.org/avukat-ceren-sumer-cilli/",
    "finalUrl": "https://adanaavukat.org/avukat-ceren-sumer-cilli/",
    "status": 200,
    "chain": [
      {
        "url": "https://adanaavukat.org/avukat-ceren-sumer-cilli/",
        "status": 200
      }
    ]
  },
  "profil-yeni-meta": {
    "url": "https://adanaavukat.org/avukat-ceren-sumer-cilli/",
    "status": 200,
    "canonical": "https://adanaavukat.org/avukat-ceren-sumer-cilli/",
    "robots": "index, follow, max-snippet:-1, max-video-preview:-1, max-image-preview:large"
  },
  "page2": {
    "label": "page2",
    "url": "https://adanaavukat.org/page/2/",
    "finalUrl": "https://adanaavukat.org/page/2/",
    "status": 200,
    "chain": [
      {
        "url": "https://adanaavukat.org/page/2/",
        "status": 200
      }
    ]
  },
  "page2-meta": {
    "url": "https://adanaavukat.org/page/2/",
    "status": 200,
    "canonical": null,
    "robots": "noindex, follow"
  },
  "wp-admin": {
    "label": "wp-admin",
    "url": "https://adanaavukat.org/wp-admin/",
    "finalUrl": "https://adanaavukat.org/wp-login.php?redirect_to=https%3A%2F%2Fadanaavukat.org%2Fwp-admin%2F&reauth=1",
    "status": 200,
    "chain": [
      {
        "url": "https://adanaavukat.org/wp-admin/",
        "status": 200
      }
    ]
  },
  "oldProfileRedirect": {
    "label": "old-profile",
    "url": "https://adanaavukat.org/avukat-ceren-sumer-cilli-kimdir-adana-bosanma-ve-aile-hukuku/",
    "finalUrl": "https://adanaavukat.org/avukat-ceren-sumer-cilli/",
    "status": 200,
    "chain": [
      {
        "url": "https://adanaavukat.org/avukat-ceren-sumer-cilli-kimdir-adana-bosanma-ve-aile-hukuku/",
        "status": 301,
        "location": "https://adanaavukat.org/avukat-ceren-sumer-cilli/"
      },
      {
        "url": "https://adanaavukat.org/avukat-ceren-sumer-cilli/",
        "status": 200,
        "location": null
      }
    ]
  },
  "wwwHttpRedirect": {
    "label": "www-http",
    "url": "http://www.adanaavukat.org/test-path?x=1",
    "finalUrl": "https://adanaavukat.org/test-path?x=1",
    "status": 404,
    "chain": [
      {
        "url": "http://www.adanaavukat.org/test-path?x=1",
        "status": 301,
        "location": "https://www.adanaavukat.org/test-path?x=1"
      },
      {
        "url": "https://www.adanaavukat.org/test-path?x=1",
        "status": 301,
        "location": "https://adanaavukat.org/test-path?x=1"
      },
      {
        "url": "https://adanaavukat.org/test-path?x=1",
        "status": 404,
        "location": null
      }
    ]
  }
}
```

## Eklenen / düzeltilen iç linkler
- Ana sayfa: Anlaşmalı Boşanma kartı → hizmet sayfası
- Ana sayfa: Velayet kartı → hizmet sayfası
- Ana sayfa: Aile Hukuku hizmet kartı eklendi
- Ana sayfa: Hizmetlerimiz iç linki eklendi
- adana-ise-iade-davasi-sureci: eski profil URL → yeni profil
- adana-sakli-pay-tenkis-davasi-miras-hukuku: eski profil URL → yeni profil
- adana-kira-tahliye-davasi-rehberi: eski profil URL → yeni profil
- adana-cocugu-gostermeme-hukuki-yollar: eski profil URL → yeni profil
- adana-bosanmada-ziynet-esyasi-alacagi: eski profil URL → yeni profil
- adana-uzaklastirma-karari-koruma-tedbirleri: eski profil URL → yeni profil
- adana-bosanmada-maddi-manevi-tazminat: eski profil URL → yeni profil
- adana-aile-uyusmazliklarinda-arabuluculuk: eski profil URL → yeni profil
- adanada-veraset-ilami-nasil-alinir: eski profil URL → yeni profil
- adana-anlasmali-bosanma-protokolu-dikkat-edilecekler: eski profil URL → yeni profil
- adana-kidem-ihbar-tazminati-hesaplama: eski profil URL → yeni profil
- adana-mal-rejimi-tasfiyesi-rehber: eski profil URL → yeni profil
- adana-velayet-degisikligi-davasi-ne-zaman-acilir: eski profil URL → yeni profil
- adana-bosanma-davasi-tanik-beyani-etkisi: eski profil URL → yeni profil
- adanada-kira-bedeli-uyarlamasi-rehberi: eski profil URL → yeni profil
- adana-avukat: eski profil URL → yeni profil
- adana-bosanma-avukati: profil + hizmetlerimiz footer linki

## Yakın kopya makale analizi (işlem yapılmadı)
### Anlaşmalı boşanma
- **Önerilen ana içerik:** `/anlasmali-bosanma-davasi-nedir/`
- **Neden:** Daha kısa slug, genel tanım niteliğinde; diğeri süreç/şart odaklı alt konu olarak kalabilir.
- `/anlasmali-bosanma-davasi-nedir/` — Anlaşmalı Boşanma Davası Nedir? Şartları ve Süreci (2026) (715 kelime)
- `/anlasmali-bosanma-davasi-nedir-sartlari-sureci-ve-guncel-uygulamalar/` — Anlaşmalı Boşanma Davası Nedir? Şartları, Süreci ve Güncel Uygulamalar (1038 kelime)

### Çekişmeli boşanma
- **Önerilen ana içerik:** `/adana-cekismeli-bosanma-davasi-nedir/`
- **Neden:** Adana odaklı ana rehber; adim-adim ve yazım varyantı (adanada) destekleyici içerik.
- `/adana-cekismeli-bosanma-davasi-nedir/` — adana-cekismeli-bosanma-davasi-nedir (? kelime)
- `/adanada-cekismeli-bosanma-davasi-nedir/` — Adana’da Çekişmeli Boşanma Davası Nedir? (403 kelime)
- `/adana-cekismeli-bosanma-davasi-adim-adim/` — adana-cekismeli-bosanma-davasi-adim-adim (? kelime)

### Hakimin takdir yetkisi
- **Önerilen ana içerik:** `/bosanma-davasinda-hakimin-takdir-yetkisi-nedir/`
- **Neden:** “Nedir” sorusu arama niyetine daha uygun; kısa slug muhtemelen erken taslak.
- `/bosanma-davasinda-hakimin-takdir-yetkisi/` — Boşanma Davasında Hâkimin Takdir Yetkisi Nedir? (547 kelime)
- `/bosanma-davasinda-hakimin-takdir-yetkisi-nedir/` — Boşanma Davasında Hakimin Takdir Yetkisi Nedir? (1125 kelime)


## Bu turda bilinçli olarak dokunulmayan riskli maddeler
- Kategori noindex ayarı değiştirilmedi
- Category sitemap kapatılmadı
- Trump/off-topic içerikler silinmedi veya noindex yapılmadı
- Hiçbir yazı silinmedi
- Yakın kopya makalelerde 301/canonical değişikliği yapılmadı
- GSC URL indexing request gönderilmedi
