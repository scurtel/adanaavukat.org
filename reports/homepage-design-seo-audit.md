# adanaavukat.org — Ana Sayfa Tasarım, SEO ve Dönüşüm Denetimi

> Tarih: 2026-06-13  
> Mod: Salt okunur analiz — **canlı sitede değişiklik yapılmadı**  
> Ana sayfa yedeği: `data/backups/homepage-7-backup.json`, `data/backups/homepage-7-content.html`

---

## 1. WordPress Bağlantısı

| Test | Sonuç |
|------|-------|
| `/wp-json/wp/v2/users/me` | **BAŞARILI** |

---

## 2. Teknik Site Yapısı

| Öğe | Değer |
|-----|-------|
| Tema | **Astra** 4.12.6 |
| Ana sayfa tipi | WordPress **Page** (`show_on_front: page`) |
| Ana sayfa ID | **7** |
| Ana sayfa slug | `adana-avukat` |
| Canlı URL | https://adanaavukat.org/ |
| İçerik editörü | **Gutenberg blokları** (birincil) |
| Elementor | REST meta'da `_elementor_data` alanı **mevcut**; render edilen HTML Elementor sınıfı içermiyor → muhtemelen legacy/hybrid. **Canlı müdahalede Elementor JSON'a dokunulmamalı.** |
| Site tagline | Boş (`description: ""`) |

### İçerik envanteri

| Tür | Yayında |
|-----|---------|
| Sayfa | 13 |
| Yazı | 20 |
| Kategori | 6 |
| Etiket | 12+ |

### Menüde görünen ana sayfalar (REST menu-items)

1. Aile Hukuku Rehberi → `/aile-hukuku-rehberi/`
2. FAQ → `/faq/`
3. İletişim → `/iletisim/`
4. Hakkımızda → `/hakkimizda/`
5. Avukat Ceren Sümer Cilli Kimdir? → `/avukat-ceren-sumer-cilli-kimdir-.../`
6. Hizmetlerimiz → `/hizmetlerimiz/`
7. Adana Boşanma Avukatı → `/adana-bosanma-avukati/`
8. Çekişmeli Boşanma Davası → `/cekismeli-bosanma-davasi/`
9. Nafaka Davası → `/nafaka-davasi/`
10. Ortaklığın Giderilmesi → `/adana-ortakligin-giderilmesi-davasi-avukat/`

---

## 3. Mevcut Ana Sayfa Analizi (ID: 7)

### 3.1 İlk ekran (Hero) değerlendirmesi

| Kriter | Durum | Not |
|--------|-------|-----|
| Güçlü ilk ekran | **Zayıf** | Hero yok; açılış düz `<p>` paragrafı |
| H1 başlık | **Eksik** | Sayfada H1 yok; ilk metin paragraf |
| Alt değer önerisi | **Belirsiz** | “Hukuki danışmanlık” geçiyor ama hizmet kartları yok |
| CTA butonları | **Yok** | Tıklanabilir buton/CTA bulunmuyor |
| Güven cümlesi | **Yok** | “Somut olaya göre değişir” uyarısı hero'da yok |

**Kullanıcı 5 saniye testi:** Ziyaretçi “kime ait?” sorusuna metin içinde cevap bulabilir; ancak “ne hizmet?” ve “nasıl iletişim?” soruları **hemen** görünür değil — iletişim butonu/linki ilk ekranda yok.

### 3.2 Tasarım ve UX

| Kriter | Durum |
|--------|-------|
| Düz metin görünümü | **Evet** — uzun paragraflar, `<br>` ile bölünmüş bloklar |
| Hizmet kartları | **Yok** |
| Görsel hiyerarşi | **Zayıf** — H2'ler var ama bölüm ayrımı görsel değil |
| Boşluk / nefes alanı | **Yetersiz** |
| Mobil uyum (tahmini) | **Orta** — Astra responsive; ancak metin yoğunluğu mobilde yorucu |
| CTA belirginliği | **Çok zayıf** |

### 3.3 Entity — Av. Ceren Sümer Cilli

| Kriter | Durum |
|--------|-------|
| İsim geçişi | Var (metin içinde) |
| Profil bölümü | Kısa paragraf; ayrı kart/alan yok |
| İç link profil sayfasına | **Yok** — yalnızca harici `cerensumer.av.tr` linki |
| Entity tutarlılığı | **Zayıf** — schema harici domain'e işaret ediyor |

### 3.4 İç linkleme

| Metrik | Değer |
|--------|-------|
| İç link sayısı | **0** |
| Harici link | 1 (`cerensumer.av.tr`) |

Ana sayfa site içi hub görevi görmüyor; yeni yayınlanan 5 otorite yazısına, hizmet sayfalarına veya iletişime link vermiyor.

### 3.5 SEO

| Kriter | Durum |
|--------|-------|
| Sayfa başlığı | “Adana Avukat” — kabul edilebilir |
| Site tagline / meta | **Boş** (WP ayarlarında `description: ""`) |
| H1 | **Eksik** |
| Başlık hiyerarşisi | H2/H3 var; H1 yok |
| Keyword stuffing | Orta düzey tekrar (“Adana avukat”, “boşanma avukatı”) |
| Yeni içeriklerin ana sayfada görünürlüğü | **Yok** |

### 3.6 Schema / JSON-LD

| Schema | Durum |
|--------|-------|
| Person | Var — ancak URL `cerensumer.av.tr` |
| LegalService | Var — harici domain |
| FAQPage | Var — 10 soru |
| WebSite | **Yok** |
| BreadcrumbList | **Yok** |

**Kritik:** Schema entity'si `adanaavukat.org` yerine `cerensumer.av.tr`'ye bağlı → Google/AI için domain bölünmesi riski.

### 3.7 FAQ

- 10 adet FAQ mevcut (iyi miktar)
- Ancak soru başlıklarında **reklam yasağına aykırı** ifadeler var (aşağıda)

### 3.8 Güven unsurları

| Unsur | Durum |
|-------|-------|
| Hukuki uyarı | Kısmen (FAQ cevaplarında dağınık) |
| Profil sayfası linki | Yok (harici site var) |
| İletişim CTA | Yok |
| Baro/şeffaflık metni | Yok |
| Yazar kutusu | Yok |

### 3.9 Avukatlık reklam yasağı uyumu

**İhlal / riskli ifadeler tespit edildi:**

| İfade | Konum |
|-------|-------|
| “en iyi boşanma avukatı nasıl seçilir?” | FAQ H3 + FAQPage schema |
| “sürecin başarısını doğrudan etkiler” | FAQ metni + schema |
| “Çekişmeli boşanma davası nasıl **kazanılır**?” | FAQ H3 + schema |
| “Uzman Hukuki Destek” | Hizmet sayfası başlıkları (menüde) |
| “Güçlü Hukuki Süreç” | Çekişmeli boşanma sayfa başlığı |

**Öneri:** Ana sayfa yeniden yazımında tüm bu ifadeler temizlenmeli.

---

## 4. En Büyük 10 Tasarım / SEO / Dönüşüm Sorunu

1. **Hero ve CTA eksikliği** — ilk ekranda dönüşüm yolu yok
2. **H1 eksikliği** — SEO ve erişilebilirlik zayıf
3. **Sıfır iç link** — hub sayfa işlevi yok
4. **Hizmet kartları yok** — kullanıcı hizmetleri taramıyor, okuyor
5. **Schema harici domain** — entity `adanaavukat.org` ile tutarsız
6. **Reklam yasağı riskli FAQ** — “en iyi”, “kazanılır”, “başarı” ifadeleri
7. **Site tagline/meta boş** — SERP snippet zayıf
8. **Yeni 5 otorite yazısı ana sayfada yok** — içerik yatırımı görünmüyor
9. **Düz metin duvarı** — güven ve profesyonellik algısı düşük
10. **İletişim yolu belirsiz** — buton/CTA yok, harici siteye yönlendirme var

---

## 5. Hizmet Sayfası Haritası (Kart önerisi için)

| Hizmet kartı | Mevcut sayfa | URL |
|--------------|--------------|-----|
| Boşanma Davaları | Var | `/adana-bosanma-avukati/` |
| Anlaşmalı Boşanma | Yazı (sayfa yok) | `/anlasmali-bosanma-davasi-nedir/` |
| Çekişmeli Boşanma | Var | `/cekismeli-bosanma-davasi/` |
| Nafaka | Var | `/nafaka-davasi/` |
| Velayet | Yazı (sayfa yok) | `/velayet-davasinda-hakim-nelere-dikkat-eder/` |
| Mal Paylaşımı | Kısmen | `/adana-ortakligin-giderilmesi-davasi-avukat/` |
| Miras Hukuku | **Yok** | Oluşturulmalı |
| Kira Hukuku | **Yok** | Oluşturulmalı |
| İş Hukuku | **Yok** | Oluşturulmalı |

---

## 6. Yedekleme Durumu

| Dosya | Açıklama |
|-------|----------|
| `data/backups/homepage-7-backup.json` | Tam REST yedek (content raw/rendered) |
| `data/backups/homepage-7-content.html` | Gutenberg ham içerik |
| `data/site-structure-audit.json` | Tüm site yapısı envanteri |

---

## 7. Güvenli Uygulama Önerisi (Onay Sonrası)

1. Ana sayfa ID 7 içeriğini tekrar yedekle
2. Yeni tasarımı **taslak sayfa** (ör. `ana-sayfa-yeni-taslak`) olarak oluştur
3. Gutenberg Custom HTML + Group blokları veya Astra hook ile uygula
4. Elementor `_elementor_data` alanına **dokunma**
5. Önizleme sonrası `page_on_front` ayarını değiştir (yalnızca onay ile)
6. Schema URL'lerini `adanaavukat.org` domain'ine taşı
7. FAQ metinlerini reklam yasağına uygun hale getir
8. Rank Math / Yoast varsa meta description güncelle

---

## 8. Oluşturulan Tasarım Dosyaları

- `generated/homepage-section-plan.md` — bölüm planı
- `generated/homepage-redesign-copy.md` — metinler
- `generated/homepage-redesign-proposal.html` — HTML mockup
- `generated/homepage-schema-proposal.json` — schema önerisi (local)

---

_Canlı WordPress sitesinde değişiklik yapılmamıştır._
