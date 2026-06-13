import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  ENTITY_NAME,
  TOPIC_KEYWORDS,
  findEntityMentions,
  findTopicMentions,
} from './lib/content-utils.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const contentPath = resolve(__dirname, '../data/adanaavukat-content.json');
const reportPath = resolve(__dirname, '../reports/adanaavukat-entity-seo-report.md');

const PROFILE_SLUG_PATTERNS = [
  /hakkimizda/i,
  /hakkinda/i,
  /about/i,
  /yazar/i,
  /avukat/i,
  /profil/i,
  /ceren/i,
  /iletisim/i,
  /contact/i,
];

const SERVICE_SLUG_PATTERNS = {
  adana_avukat: [/adana-avukat/i, /avukat/i],
  aile_hukuku: [/aile-hukuku/i, /aile_hukuku/i],
  bosanma: [/bosanma/i, /boşanma/i],
  nafaka: [/nafaka/i],
  velayet: [/velayet/i],
  miras: [/miras/i, /veraset/i],
  kira: [/kira/i],
  is_hukuku: [/is-hukuku/i, /iş-hukuku/i],
  iletisim: [/iletisim/i, /contact/i],
};

function loadContent() {
  if (!existsSync(contentPath)) {
    throw new Error(
      'data/adanaavukat-content.json bulunamadı. Önce npm run fetch:wp çalıştırın.'
    );
  }
  return JSON.parse(readFileSync(contentPath, 'utf8'));
}

function allItems(data) {
  return [...(data.posts || []), ...(data.pages || [])];
}

function findBySlugPattern(items, patterns) {
  return items.filter((item) => patterns.some((p) => p.test(item.slug) || p.test(item.title)));
}

function countTopicCoverage(items) {
  const coverage = {};
  for (const topic of Object.keys(TOPIC_KEYWORDS)) {
    coverage[topic] = { count: 0, items: [] };
  }

  for (const item of items) {
    const topics = item.topicMentions || findTopicMentions(item.title + ' ' + item.excerpt);
    for (const topic of Object.keys(topics)) {
      coverage[topic].count += 1;
      coverage[topic].items.push({ id: item.id, title: item.title, slug: item.slug, type: item.type });
    }
  }
  return coverage;
}

function analyzeInternalLinking(items) {
  const hubScores = new Map();
  const entityLinkCount = { toEntityPages: 0, fromEntityPages: 0, totalInternal: 0 };

  for (const item of items) {
    const internal = item.internalLinks || [];
    entityLinkCount.totalInternal += internal.length;

    for (const link of internal) {
      const path = link.path || link.href || '';
      hubScores.set(path, (hubScores.get(path) || 0) + 1);
      if (/ceren|hakkimizda|avukat|profil/i.test(path)) {
        entityLinkCount.toEntityPages += 1;
      }
    }

    if (item.entityMentions?.length > 0) {
      entityLinkCount.fromEntityPages += internal.length;
    }
  }

  const topHubs = [...hubScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([path, count]) => ({ path, inboundLinks: count }));

  return { entityLinkCount, topHubs };
}

function findEntityPages(items) {
  return items.filter(
    (item) =>
      (item.entityMentions && item.entityMentions.length > 0) ||
      /ceren|cilli/i.test(item.slug) ||
      /ceren|cilli/i.test(item.title)
  );
}

function findAuthorBoxPresence(items) {
  const withBox = [];
  const withoutBox = [];

  for (const item of items) {
    const signals = item.authorBoxSignals || [];
    if (signals.length > 0) {
      withBox.push({ ...item, signals });
    } else {
      withoutBox.push(item);
    }
  }
  return { withBox, withoutBox };
}

function findSchemaCandidates(items) {
  const withJsonLd = items.filter((i) => i.authorBoxSignals?.includes('json_ld_present'));
  const articles = items.filter((i) => i.type === 'post');
  const faqCandidates = items.filter((i) => /sss|faq|soru/i.test(i.title + i.slug));
  return { withJsonLd, articles, faqCandidates };
}

function identifyGaps(topicCoverage, servicePages) {
  const gaps = [];
  const priorityTopics = [
    'adana',
    'aile_hukuku',
    'bosanma',
    'nafaka',
    'velayet',
    'miras',
    'kira',
    'is_hukuku',
    'ceza_hukuku',
    'gayrimenkul',
  ];

  for (const topic of priorityTopics) {
    if ((topicCoverage[topic]?.count || 0) < 2) {
      gaps.push({
        topic,
        severity: topicCoverage[topic]?.count === 0 ? 'kritik' : 'orta',
        recommendation: `${topic} konusunda en az 2-3 derinlemesine içerik ve bir hizmet sayfası önerilir.`,
      });
    }
  }

  for (const [key, patterns] of Object.entries(SERVICE_SLUG_PATTERNS)) {
    if (key === 'iletisim') continue;
    const found = findBySlugPattern(
      [...(servicePages.posts || []), ...(servicePages.pages || [])],
      patterns
    );
    if (found.length === 0) {
      gaps.push({
        topic: key,
        severity: 'kritik',
        recommendation: `${key} için ayrı bir hizmet/otorite sayfası oluşturulmalı.`,
      });
    }
  }

  return gaps;
}

function buildReport(data) {
  const items = allItems(data);
  const published = items.filter((i) => i.status === 'publish');
  const entityPages = findEntityPages(items);
  const profilePages = findBySlugPattern(items, PROFILE_SLUG_PATTERNS);
  const authorBox = findAuthorBoxPresence(published);
  const topicCoverage = countTopicCoverage(published);
  const linking = analyzeInternalLinking(published);
  const schema = findSchemaCandidates(published);
  const gaps = identifyGaps(topicCoverage, data);

  const servicePageMap = {};
  for (const [key, patterns] of Object.entries(SERVICE_SLUG_PATTERNS)) {
    servicePageMap[key] = findBySlugPattern(items, patterns).map((i) => ({
      id: i.id,
      title: i.title,
      slug: i.slug,
      type: i.type,
      link: i.link,
    }));
  }

  const pagesToUpdate = published
    .filter(
      (i) =>
        !i.entityMentions?.length &&
        Object.keys(i.topicMentions || {}).length > 0 &&
        !i.authorBoxSignals?.includes('disclaimer_author_text')
    )
    .slice(0, 20)
    .map((i) => ({
      id: i.id,
      title: i.title,
      slug: i.slug,
      reason: 'Konu otoritesi var ancak entity veya yazar kutusu sinyali zayıf',
    }));

  const newContentSuggestions = [
    {
      title: "Adana'da Avukat Seçerken Nelere Dikkat Edilmeli?",
      slug: 'adanada-avukat-secerken-nelere-dikkat-edilmeli',
      goal: 'Adana avukat ana entity sayfasını desteklemek',
    },
    {
      title: "Adana'da Aile Hukuku Davalarında Avukat Desteği",
      slug: 'adanada-aile-hukuku-davalarinda-avukat-destegi',
      goal: 'Aile hukuku + entity bağlantısı',
    },
    {
      title: "Adana'da Boşanma Davası Süreci ve Dikkat Edilmesi Gerekenler",
      slug: 'adanada-bosanma-davasi-sureci',
      goal: 'Boşanma konu otoritesi',
    },
    {
      title: "Adana'da Nafaka ve Velayet Uyuşmazlıklarında Hukuki Yol Haritası",
      slug: 'adanada-nafaka-ve-velayet-uyusmazliklari',
      goal: 'Nafaka + velayet kümesi',
    },
    {
      title: "Adana'da Miras, Kira ve İş Hukuku Uyuşmazlıklarında Avukat Desteği",
      slug: 'adanada-miras-kira-is-hukuku-avukat-destegi',
      goal: 'Genel Adana avukat otoritesi',
    },
  ];

  const entityClarity =
    entityPages.length >= 3 && profilePages.length >= 1
      ? 'orta-iyi'
      : entityPages.length >= 1
        ? 'zayıf-orta'
        : 'zayıf';

  let report = `# adanaavukat.org — Entity & SEO Otorite Raporu

> Oluşturulma: ${new Date().toISOString()}
> Veri kaynağı: data/adanaavukat-content.json
> Canlı değişiklik yapılmadı — salt okunur analiz

---

## 1. Yönetici Özeti

| Metrik | Değer |
|--------|-------|
| Toplam yazı | ${data.summary.posts} |
| Toplam sayfa | ${data.summary.pages} |
| Yayında içerik | ${published.length} |
| Entity geçen içerik | ${entityPages.length} |
| Yazar/uzman kutusu sinyali olan | ${authorBox.withBox.length} |
| JSON-LD sinyali olan | ${schema.withJsonLd.length} |
| Entity netliği | **${entityClarity}** |

### Temel Soru: Site Google ve AI sistemlerine ${ENTITY_NAME}'yi net bir hukukçu entity'si olarak anlatıyor mu?

**Değerlendirme:** ${
    entityClarity === 'zayıf'
      ? 'Hayır — entity sinyalleri yetersiz. İsim geçişi sınırlı, profil/otorite sayfası belirsiz veya eksik.'
      : entityClarity === 'zayıf-orta'
        ? 'Kısmen — bazı içeriklerde isim geçiyor ancak tutarlı author/reviewer, schema ve iç link ağı henüz güçlü değil.'
        : 'Kısmen-iyi — entity izleri mevcut; schema, yazar kutusu ve konu kümeleri sistematik hale getirilmeli.'
  }

---

## 2. ${ENTITY_NAME} Entity Geçiş Analizi

### İsmin geçtiği içerikler (${entityPages.length} adet)

`;

  if (entityPages.length === 0) {
    report += `_Hiçbir yayınlanmış içerikte ${ENTITY_NAME} açıkça geçmiyor._\n\n`;
  } else {
    for (const p of entityPages) {
      report += `- [${p.title}](${p.link}) (\`${p.slug}\`, ${p.type}) — varyantlar: ${(p.entityMentions || []).join(', ') || 'tespit edilemedi'}\n`;
    }
    report += '\n';
  }

  report += `### Profil / Hakkımızda / Avukat sayfaları (${profilePages.length} adet)

`;

  if (profilePages.length === 0) {
    report += `_Açık profil veya hakkımızda sayfası tespit edilemedi._\n\n`;
  } else {
    for (const p of profilePages) {
      report += `- [${p.title}](${p.link}) (\`${p.slug}\`, ${p.type})\n`;
    }
    report += '\n';
  }

  report += `### Yazar / Reviewer / Uzman Kutusu

| Durum | Adet |
|-------|------|
| Sinyal tespit edilen | ${authorBox.withBox.length} |
| Sinyal tespit edilmeyen | ${authorBox.withoutBox.length} |

`;

  if (authorBox.withBox.length > 0) {
    report += '**Mevcut sinyaller:**\n';
    for (const item of authorBox.withBox.slice(0, 10)) {
      report += `- ${item.title}: ${item.signals.join(', ')}\n`;
    }
    report += '\n';
  }

  report += `---

## 3. Konu Kümeleri ve Yerel Bağlam

`;

  for (const [topic, info] of Object.entries(topicCoverage)) {
    report += `### ${topic}\n- İçerik sayısı: **${info.count}**\n`;
    if (info.items.length > 0) {
      for (const item of info.items.slice(0, 5)) {
        report += `  - ${item.title} (\`${item.slug}\`)\n`;
      }
      if (info.items.length > 5) report += `  - _...ve ${info.items.length - 5} içerik daha_\n`;
    }
    report += '\n';
  }

  report += `---

## 4. Hizmet Sayfaları Haritası

`;

  for (const [key, pages] of Object.entries(servicePageMap)) {
    report += `### ${key}\n`;
    if (pages.length === 0) {
      report += '_Sayfa bulunamadı_\n\n';
    } else {
      for (const p of pages) {
        report += `- [${p.title}](${p.link}) (\`${p.slug}\`)\n`;
      }
      report += '\n';
    }
  }

  report += `---

## 5. İç Linkleme Analizi

- Toplam iç link: **${linking.entityLinkCount.totalInternal}**
- Entity/profil sayfalarına giden link: **${linking.entityLinkCount.toEntityPages}**
- Entity geçen sayfalardan çıkan link: **${linking.entityLinkCount.fromEntityPages}**

### En çok link alan sayfalar (hub)

`;

  for (const hub of linking.topHubs) {
    report += `- \`${hub.path}\` — ${hub.inboundLinks} iç link\n`;
  }

  report += `
**Değerlendirme:** ${
    linking.entityLinkCount.toEntityPages < 5
      ? 'İç link ağı entity merkezli değil; hizmet sayfaları ve profil sayfası yeterince birbirine bağlanmıyor.'
      : 'Bazı iç linkler mevcut; anchor çeşitliliği ve konu kümeleri arası bağlantı artırılmalı.'
  }

---

## 6. Eksik Konu Kümeleri

`;

  for (const gap of gaps) {
    report += `- **[${gap.severity.toUpperCase()}]** \`${gap.topic}\`: ${gap.recommendation}\n`;
  }

  report += `
---

## 7. Güncellenmesi Önerilen Sayfalar

`;

  if (pagesToUpdate.length === 0) {
    report += '_Öncelikli güncelleme adayı tespit edilmedi veya tüm sayfalar yeterli sinyale sahip._\n\n';
  } else {
    for (const p of pagesToUpdate) {
      report += `- **${p.title}** (\`${p.slug}\`) — ${p.reason}\n`;
    }
    report += '\n';
  }

  report += `---

## 8. Oluşturulması Önerilen Yeni İçerikler

`;

  for (const s of newContentSuggestions) {
    report += `- **${s.title}** (\`${s.slug}\`) — ${s.goal}\n`;
  }

  report += `
---

## 9. Author / Reviewer Bilgisi Eklenmesi Gereken Sayfalar

Aşağıdaki yayınlanmış içeriklere konuya özel yazar/uzman kutusu eklenmesi önerilir:

`;

  const authorTargets = authorBox.withoutBox
    .filter((i) => i.type === 'post' || /hukuk|avukat|dava|bosanma|nafaka|velayet|miras|kira/i.test(i.title))
    .slice(0, 15);

  for (const item of authorTargets) {
    report += `- ${item.title} (\`${item.slug}\`)\n`;
  }

  report += `
---

## 10. Schema / JSON-LD Önerileri

### Mevcut durum
- JSON-LD sinyali tespit edilen içerik: **${schema.withJsonLd.length}**
- Yazı (Article adayı): **${schema.articles.length}**
- FAQ adayı: **${schema.faqCandidates.length}**

### Önerilen schema yapıları

| Schema | Hedef | Not |
|--------|-------|-----|
| **Person** | ${ENTITY_NAME} | Sitede doğrulanabilir bilgilerle: name, jobTitle (Avukat), worksFor, url, knowsAbout |
| **LegalService** | Site / büro | areaServed: Adana; provider: Person entity; description bilgilendirici |
| **Attorney** | Uygunsa Person alt tipi | Baro sicil, telefon, adres sitede yoksa EKLENMEMELİ |
| **Article / BlogPosting** | Tüm yazılar | author + reviewedBy: ${ENTITY_NAME}; publisher: site adı |
| **FAQPage** | SSS içeren yazılar | ${schema.faqCandidates.length} aday yazı |
| **BreadcrumbList** | Tüm sayfalar | Tema veya SEO eklentisi üzerinden |

### JSON-LD alan önerileri (doğrulanabilir bilgilerle)

\`\`\`json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Av. Ceren Sümer Cilli",
  "jobTitle": "Avukat",
  "url": "https://adanaavukat.org/[profil-sayfasi-slug]",
  "knowsAbout": [
    "Aile hukuku", "Boşanma hukuku", "Nafaka", "Velayet",
    "Miras hukuku", "Kira hukuku", "İş hukuku", "Adana"
  ],
  "areaServed": { "@type": "City", "name": "Adana" }
}
\`\`\`

> **Uyarı:** Telefon, adres, baro sicil numarası, mezuniyet veya ödül bilgisi sitede doğrulanmadıkça schema'ya eklenmemelidir.

---

## 11. Entity & Otorite Stratejisi

### Ana entity
**${ENTITY_NAME}**

### İlişkili entity alanları
- Adana avukat
- Adana aile hukuku avukatı / boşanma / nafaka / velayet avukatı
- Adana miras, kira, iş hukuku, gayrimenkul avukatı
- Adana Adliyesi / Aile Mahkemeleri
- Türk Medeni Kanunu, hukuki danışmanlık, dava takibi

### Strateji ilkeleri
1. Her konu kümesinde en az 1 **hizmet sayfası** + 2-3 **bilgilendirici yazı**
2. ${ENTITY_NAME} ismi doğal ve ölçülü; keyword stuffing yok
3. Her içerikte hukuki uyarı ve "somut olaya göre değişir" yaklaşımı
4. Reklam yasağına aykırı iddia yok ("en iyi", "garantili sonuç" vb.)
5. Author/reviewer kutusu sayfa konusuna göre varyasyonlu
6. İç linkler: 3-6 doğal link / yazı; anchor çeşitliliği
7. Schema: Person + LegalService site genelinde; Article yazılarda

---

## 12. En Kritik 10 SEO / AI Otorite Eksiği

`;

  const criticalGaps = [
    entityPages.length < 3 && `1. ${ENTITY_NAME} entity geçişi yetersiz (${entityPages.length} içerik)`,
    profilePages.length === 0 && '2. Ayrılmış avukat profili / hakkımızda sayfası eksik veya zayıf',
    authorBox.withBox.length < published.length * 0.3 &&
      `3. Yazar/uzman kutusu çoğu içerikte yok (${authorBox.withBox.length}/${published.length})`,
    schema.withJsonLd.length < 3 && '4. JSON-LD / structured data sinyalleri zayıf',
    (topicCoverage.bosanma?.count || 0) < 2 && '5. Boşanma konu kümesi derinliği yetersiz',
    (topicCoverage.nafaka?.count || 0) < 2 && '6. Nafaka konu kümesi yetersiz',
    (topicCoverage.velayet?.count || 0) < 2 && '7. Velayet konu kümesi yetersiz',
    linking.entityLinkCount.toEntityPages < 5 && '8. Entity/profil sayfalarına iç link az',
    (topicCoverage.miras?.count || 0) < 1 && '9. Miras/kira/iş hukuku otorite içerikleri eksik',
    '10. AI cevap motorları için tutarlı author/reviewer + FAQ + schema üçlüsü henüz sistematik değil',
  ].filter(Boolean);

  for (const gap of criticalGaps.slice(0, 10)) {
    report += `- ${gap}\n`;
  }

  report += `
---

## 13. Yazar Kutusu Önerisi (Varyasyon Mantığı)

Her uygun yazının başına veya sonuna, konuya göre uyarlanmış bilgilendirme kutusu eklenmeli. Örnek şablonlar:

**Boşanma yazısı:**
> Bu içerik, Adana'da boşanma ve aile hukuku uyuşmazlıkları üzerine çalışan ${ENTITY_NAME} tarafından genel bilgilendirme amacıyla hazırlanmıştır. İçerik hukuki tavsiye niteliği taşımaz; her somut olay kendi koşulları içinde değerlendirilmelidir.

**Nafaka/velayet yazısı:**
> Bu rehber, Adana'da nafaka ve velayet davalarıyla ilgili temel bilgileri sunmak üzere ${ENTITY_NAME} tarafından kaleme alınmıştır. Sonuçlar somut olayın özelliklerine göre değişebilir.

**Genel Adana avukat:**
> Adana'da hukuki süreçlere ilişkin bu bilgilendirme metni, ${ENTITY_NAME} tarafından hazırlanmıştır. Kişisel hukuki danışmanlık yerine geçmez.

---

_Rapor salt okunur analiz modunda oluşturulmuştur. Canlı WordPress içeriğinde değişiklik yapılmamıştır._
`;

  return report;
}

function main() {
  const data = loadContent();
  const report = buildReport(data);

  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, report, 'utf8');

  console.log(`Rapor kaydedildi: ${reportPath}`);
}

main();
