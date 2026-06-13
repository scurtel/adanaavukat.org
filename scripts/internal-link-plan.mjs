import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { ENTITY_NAME } from './lib/content-utils.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const contentPath = resolve(__dirname, '../data/adanaavukat-content.json');
const reportPath = resolve(__dirname, '../reports/internal-link-plan.md');

const HUB_TARGETS = [
  { key: 'home', patterns: [/^\/$/, /ana-sayfa/, /home/], label: 'Ana sayfa', anchorExamples: ['Adana avukat', 'hukuki destek'] },
  { key: 'profile', patterns: [/ceren/, /hakkimizda/, /hakkinda/, /profil/, /avukat.*cilli/], label: 'Av. Ceren Sümer Cilli profil', anchorExamples: ['Av. Ceren Sümer Cilli', 'Adana avukat'] },
  { key: 'adana_avukat', patterns: [/adana-avukat/, /avukat-hizmet/], label: 'Adana avukat hizmet', anchorExamples: ['Adana avukat', 'Adana hukuki destek'] },
  { key: 'aile_hukuku', patterns: [/aile-hukuku/], label: 'Aile hukuku', anchorExamples: ['Adana aile hukuku avukatı', 'aile hukuku davaları'] },
  { key: 'bosanma', patterns: [/bosanma/, /boşanma/], label: 'Boşanma', anchorExamples: ['Adana boşanma avukatı', 'boşanma davası süreci'] },
  { key: 'nafaka', patterns: [/nafaka/], label: 'Nafaka', anchorExamples: ['nafaka davası', 'Adana nafaka avukatı'] },
  { key: 'velayet', patterns: [/velayet/], label: 'Velayet', anchorExamples: ['velayet davası', 'Adana velayet avukatı'] },
  { key: 'iletisim', patterns: [/iletisim/, /contact/], label: 'İletişim', anchorExamples: ['hukuki destek', 'iletişim'] },
];

const ANCHOR_POOL = [
  'Adana avukat',
  'Adana aile hukuku avukatı',
  'Adana boşanma avukatı',
  'Av. Ceren Sümer Cilli',
  'boşanma davası süreci',
  'nafaka davası',
  'velayet davası',
  'hukuki destek',
  'aile hukuku',
  'mal paylaşımı',
  'Adana Adliyesi',
];

function loadContent() {
  if (!existsSync(contentPath)) {
    throw new Error('data/adanaavukat-content.json bulunamadı. Önce npm run fetch:wp çalıştırın.');
  }
  return JSON.parse(readFileSync(contentPath, 'utf8'));
}

function findHubPages(items) {
  const hubs = {};
  for (const target of HUB_TARGETS) {
    hubs[target.key] = items.filter(
      (item) =>
        target.patterns.some((p) => p.test(item.slug) || p.test(item.title)) ||
        (target.key === 'home' && item.slug === 'ana-sayfa')
    );
  }
  return hubs;
}

function getExistingInternalPaths(item) {
  return new Set((item.internalLinks || []).map((l) => l.path || l.href || '').filter(Boolean));
}

function suggestLinksForItem(item, hubs, allItems) {
  const suggestions = [];
  const existing = getExistingInternalPaths(item);
  const topics = Object.keys(item.topicMentions || {});

  const topicToHub = {
    aile_hukuku: ['aile_hukuku', 'adana_avukat', 'profile'],
    bosanma: ['bosanma', 'aile_hukuku', 'profile'],
    nafaka: ['nafaka', 'bosanma', 'aile_hukuku'],
    velayet: ['velayet', 'bosanma', 'aile_hukuku'],
    miras: ['adana_avukat', 'profile'],
    kira: ['adana_avukat'],
    is_hukuku: ['adana_avukat'],
    adana: ['adana_avukat', 'profile', 'iletisim'],
  };

  const targetKeys = new Set(['profile', 'iletisim']);
  for (const topic of topics) {
    for (const hubKey of topicToHub[topic] || []) {
      targetKeys.add(hubKey);
    }
  }

  if (item.type === 'page' && !/iletisim|contact/.test(item.slug)) {
    targetKeys.add('home');
  }

  let anchorIndex = item.id % ANCHOR_POOL.length;

  for (const hubKey of targetKeys) {
    const hubPages = hubs[hubKey] || [];
    for (const hub of hubPages) {
      if (hub.id === item.id) continue;
      const path = new URL(hub.link).pathname;
      if (existing.has(path)) continue;

      const hubDef = HUB_TARGETS.find((h) => h.key === hubKey);
      const anchor =
        hubDef?.anchorExamples[anchorIndex % (hubDef?.anchorExamples.length || 1)] ||
        ANCHOR_POOL[anchorIndex % ANCHOR_POOL.length];

      suggestions.push({
        targetTitle: hub.title,
        targetSlug: hub.slug,
        targetLink: hub.link,
        suggestedAnchor: anchor,
        hubType: hubDef?.label || hubKey,
        placement: 'İçerik ortasında veya ilgili paragrafta doğal bağlamda',
      });

      anchorIndex += 1;
      if (suggestions.length >= 6) break;
    }
    if (suggestions.length >= 6) break;
  }

  return suggestions.slice(0, 6);
}

function buildReport(data) {
  const items = [...(data.posts || []), ...(data.pages || [])].filter((i) => i.status === 'publish');
  const hubs = findHubPages(items);

  let report = `# adanaavukat.org — İç Linkleme Planı

> Oluşturulma: ${new Date().toISOString()}
> Mod: Öneri raporu — canlı değişiklik yapılmadı
> Entity: ${ENTITY_NAME}

---

## 1. Hub Sayfaları (Hedef Noktalar)

`;

  for (const target of HUB_TARGETS) {
    const pages = hubs[target.key] || [];
    report += `### ${target.label}\n`;
    if (pages.length === 0) {
      report += '_Mevcut yayın bulunamadı — yeni sayfa oluşturulması önerilir_\n\n';
    } else {
      for (const p of pages) {
        report += `- [${p.title}](${p.link}) (\`${p.slug}\`)\n`;
      }
      report += '\n';
    }
  }

  report += `---

## 2. Genel İlkeler

- Her yazıda **3-6 doğal iç link** yeterli
- Aynı anchor metnini aşırı tekrar etmeyin
- ${ENTITY_NAME} profil sayfasına konu yazılarından link verin
- Hizmet sayfaları birbirine ve ana sayfaya bağlansın
- İletişim sayfasına CTA bağlamında link ekleyin

---

## 3. İçerik Bazlı Link Önerileri

`;

  const itemsWithSuggestions = items
    .map((item) => ({
      item,
      suggestions: suggestLinksForItem(item, hubs, items),
    }))
    .filter((x) => x.suggestions.length > 0);

  for (const { item, suggestions } of itemsWithSuggestions) {
    report += `### ${item.title}\n`;
    report += `- Tür: ${item.type} | Slug: \`${item.slug}\` | [Mevcut sayfa](${item.link})\n`;
    report += `- Konular: ${Object.keys(item.topicMentions || {}).join(', ') || 'genel'}\n\n`;
    report += '| Önerilen anchor | Hedef sayfa | Hedef URL |\n';
    report += '|-----------------|-------------|----------|\n';
    for (const s of suggestions) {
      report += `| ${s.suggestedAnchor} | ${s.targetTitle} | ${s.targetLink} |\n`;
    }
    report += '\n';
  }

  if (itemsWithSuggestions.length === 0) {
    report += '_Yayınlanmış içerik bulunamadı veya link önerisi üretilemedi._\n\n';
  }

  report += `---

## 4. Yeni İçerikler İçin Önceden Planlanmış Linkler

Aşağıdaki üretilecek makaleler için önerilen iç link hedefleri:

| Makale slug | Önerilen iç linkler |
|-------------|---------------------|
| adanada-avukat-secerken-nelere-dikkat-edilmeli | Ana sayfa, profil, iletişim, aile hukuku |
| adanada-aile-hukuku-davalarinda-avukat-destegi | Boşanma, nafaka, velayet, profil |
| adanada-bosanma-davasi-sureci | Nafaka, velayet, mal paylaşımı, aile hukuku |
| adanada-nafaka-ve-velayet-uyusmazliklari | Boşanma, aile hukuku, profil |
| adanada-miras-kira-is-hukuku-avukat-destegi | Adana avukat, iletişim, profil |

---

## 5. Eksik Hub Sayfaları İçin Öneri

`;

  const missing = HUB_TARGETS.filter((t) => (hubs[t.key] || []).length === 0 && t.key !== 'home');
  if (missing.length === 0) {
    report += 'Tüm temel hub kategorilerinde en az bir sayfa mevcut.\n';
  } else {
    for (const m of missing) {
      report += `- **${m.label}** sayfası oluşturulmalı; anchor örnekleri: ${m.anchorExamples.join(', ')}\n`;
    }
  }

  report += `
---

_Onay verilmeden WordPress içeriklerinde değişiklik yapılmayacaktır._
`;

  return report;
}

function main() {
  const data = loadContent();
  const report = buildReport(data);
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, report, 'utf8');
  console.log(`İç link planı kaydedildi: ${reportPath}`);
}

main();
