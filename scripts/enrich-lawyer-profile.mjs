/**
 * Avukat Ceren Sümer Cilli profil sayfasını Gemini ile zenginleştirir ve WP'ye uygular.
 *
 * Kullanım:
 *   node scripts/enrich-lawyer-profile.mjs              # generate (yoksa) + apply
 *   node scripts/enrich-lawyer-profile.mjs --force      # yeniden üret + apply
 *   node scripts/enrich-lawyer-profile.mjs --generate-only
 *   node scripts/enrich-lawyer-profile.mjs --apply-only
 */
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { callGemini } from './lib/gemini.mjs';
import { getGeminiConfig, getWpConfig, getAuthHeader, rootDir } from './lib/env.mjs';
import { wpFetch } from './lib/wp-client.mjs';
import {
  PROFILE_PAGE_ID,
  PROFILE_URL,
  LINKS,
  SEO,
  DISCLAIMER,
  PRESERVE_MARKERS,
  buildProfilePageHtml,
  extractMainContentWordCount,
  findBannedHits,
  countWords,
} from './lib/profile-content.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_JSON = resolve(rootDir, 'generated/lawyer-profile-content.json');
const OUT_MD = resolve(rootDir, 'generated/lawyer-profile-content.md');
const REPORT = resolve(rootDir, 'reports/lawyer-profile-enrich-report.md');
const BACKUP_DIR = resolve(rootDir, 'data/backups');

const args = new Set(process.argv.slice(2));
const force = args.has('--force');
const generateOnly = args.has('--generate-only');
const applyOnly = args.has('--apply-only');

async function wpPost(path, body) {
  const { baseUrl, username, appPassword } = getWpConfig();
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(username, appPassword),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${path} ${response.status}: ${text.slice(0, 400)}`);
  }
  return text ? JSON.parse(text) : {};
}

function buildPrompt(currentExcerpt) {
  const linkHints = Object.entries(LINKS)
    .map(([k, v]) => `- ${k}: ${v.href} (anchor örneği: "[[${k}|${v.label}]]")`)
    .join('\n');

  return `Sen Türkçe yazan bir hukuk editörüsün. Avukat Ceren Sümer Cilli için Adana odaklı bir profil sayfası içeriği üreteceksin.

GÖREV: Aile hukuku çalışma alanlarını kapsamlı, bilgilendirici ve ölçülü biçimde anlat. Toplam ana metin (FAQ dahil, otomatik makale listesi hariç) yaklaşık 1500-2000 kelime olsun. Tekrar etme.

KESİNLİKLE YAPMA:
- Üniversite, mezuniyet yılı, baro sicil no, deneyim yılı, sertifika, ödül, dava/müvekkil sayısı, başarı oranı uydurma
- "en iyi", "uzman avukat", "kesin sonuç", "garanti", "mutlaka kazanır", "yüzde yüz" gibi reklam dili
- Rakip karşılaştırması, başarı hikâyesi, kullanıcı yorumu uydurma
- Zamanaşımı için bağlamdan kopuk kesin süre vermek
- "Anneye/babaya kesin velayet verilir" gibi genellemeler
- Her paragrafa link koymak; aynı URL'ye art arda tekrar link vermek

İÇ BAĞLANTI: Gerekli yerlerde yalnızca şu işaretlemeyi kullan: [[key|görünen metin]]
Anahtarlar ve URL'ler:
${linkHints}

Google Search varsa hukuki kavramları Mevzuat Bilgi Sistemi / TMK / 6284 çerçevesinde doğrula; kişisel biyografi arama.

Mevcut kısa sayfa özeti (bağlam):
"""
${currentExcerpt.slice(0, 2500)}
"""

YALNIZCA geçerli JSON döndür (markdown çitsiz). Şema:
{
  "lead": "string (1-2 cümle)",
  "approach": ["p1","p2","p3"],
  "disclaimer": "string",
  "practiceAreas": ["Aile Hukuku", "..."],
  "divorce": {
    "intro": ["..."],
    "consensual": ["protokol, velayet, nafaka, tazminat, mal paylaşımı farkı — 2-3 paragraf"],
    "contested": ["dilekçe, deliller, hukuka uygunluk, tedbirler — 2-3 paragraf"]
  },
  "custody": ["3-4 paragraf"],
  "alimony": ["tedbir/iştirak/yoksulluk + artırım/azaltım/kaldırma — 3-4 paragraf"],
  "propertyRegime": ["edinilmiş mallar, katılma, değer artış, kişisel mal, mal kaçırma iddiası — 4-5 paragraf; güçlü bölüm"],
  "jewelry": ["2-3 paragraf"],
  "familyHome": ["2-3 paragraf"],
  "law6284": ["2-3 paragraf; hassas dil"],
  "evaluationIntro": ["1 kısa paragraf"],
  "evaluationProcess": ["6 adım, kısa cümleler"],
  "faq": [
    {"question":"...","answer":"50-100 kelime"}
  ]
}

FAQ 8-9 soru olsun (anlaşmalı uzlaşı konuları, çekişmeli deliller, velayet ölçütleri, nafaka artırım/azaltım, mal paylaşımının boşanmayla ilişkisi, evlilik öncesi mallar, ziynet ispatı, aile konutu şerhi, 6284 tedbirleri).
disclaimer alanı doğrulanmamış biyografi uyarısını korusun.
JSON dışında hiçbir şey yazma.`;
}

function extractJson(text) {
  const trimmed = String(text).trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1].trim() : trimmed;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('JSON bulunamadı');
  return JSON.parse(candidate.slice(start, end + 1));
}

function validateContent(content) {
  const required = [
    'lead',
    'approach',
    'divorce',
    'custody',
    'alimony',
    'propertyRegime',
    'jewelry',
    'familyHome',
    'law6284',
    'evaluationProcess',
    'faq',
  ];
  for (const key of required) {
    if (content[key] == null) throw new Error(`Eksik alan: ${key}`);
  }
  if (!Array.isArray(content.faq) || content.faq.length < 7) {
    throw new Error('FAQ en az 7 soru olmalı');
  }
  if (!Array.isArray(content.evaluationProcess) || content.evaluationProcess.length < 5) {
    throw new Error('evaluationProcess en az 5 adım olmalı');
  }
  content.disclaimer = content.disclaimer || DISCLAIMER;
  content.practiceAreas = content.practiceAreas?.length
    ? content.practiceAreas
    : [
        'Aile Hukuku',
        'Boşanma Hukuku',
        'Velayet',
        'Nafaka',
        'Mal Rejiminin Tasfiyesi',
        'Ziynet Alacağı',
        'Aile Konutu',
        '6284 Sayılı Kanun',
      ];
  return content;
}

function toMarkdown(content) {
  const lines = [
    `# Avukat Ceren Sümer Cilli — Profil içeriği`,
    '',
    `> Üretim: ${new Date().toISOString()}`,
    '',
    `## Lead`,
    content.lead,
    '',
    `## Mesleki yaklaşım`,
    ...(content.approach || []).map((p) => `- ${p}`),
    '',
    `## FAQ (${content.faq?.length || 0})`,
    ...(content.faq || []).map((f) => `### ${f.question}\n${f.answer}\n`),
  ];
  return lines.join('\n');
}

async function generateContent(currentRaw) {
  const gemini = getGeminiConfig();
  if (!gemini.apiKey) throw new Error('GEMINI_API_KEY yok');

  const excerpt = currentRaw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const prompt = buildPrompt(excerpt);

  console.log(
    `Gemini çağrısı… model=${gemini.model} grounding=${gemini.searchGrounding ? 'on' : 'off'}`
  );

  const result = await callGemini(prompt, {
    temperature: 0.35,
    maxOutputTokens: 8192,
    grounding: true,
    includeGrounding: true,
  });

  const text = typeof result === 'string' ? result : result.text;
  const grounding = typeof result === 'string' ? null : result.grounding;
  const parsed = validateContent(extractJson(text));

  const banned = findBannedHits(JSON.stringify(parsed));
  if (banned.length) {
    console.warn('Uyarı — yasaklı ifade bulundu, sanitizer HTML aşamasında temizleyecek:', banned);
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    model: gemini.model,
    groundingEnabled: Boolean(gemini.searchGrounding),
    groundingSources: (grounding?.sources || []).slice(0, 12),
    content: parsed,
  };

  mkdirSync(resolve(rootDir, 'generated'), { recursive: true });
  writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2), 'utf8');
  writeFileSync(OUT_MD, toMarkdown(parsed), 'utf8');
  console.log('Kaydedildi:', OUT_JSON);

  return payload;
}

async function applyContent(payload) {
  mkdirSync(BACKUP_DIR, { recursive: true });
  const before = await wpFetch(`/wp-json/wp/v2/pages/${PROFILE_PAGE_ID}?context=edit`);
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupPath = resolve(BACKUP_DIR, `profile-${PROFILE_PAGE_ID}-before-enrich-${ts}.json`);
  writeFileSync(
    backupPath,
    JSON.stringify(
      {
        id: before.id,
        slug: before.slug,
        title: before.title?.raw,
        content: before.content?.raw,
        meta: {
          rank_math_title: before.meta?.rank_math_title,
          rank_math_description: before.meta?.rank_math_description,
        },
      },
      null,
      2
    ),
    'utf8'
  );

  const oldWords = extractMainContentWordCount(before.content?.raw || '');
  const html = buildProfilePageHtml(payload.content);

  if (!html.includes(PRESERVE_MARKERS.articlesShortcode) || !html.includes(PRESERVE_MARKERS.recentShortcode)) {
    throw new Error('Shortcode korunamadı — uygulama iptal');
  }
  if (!html.includes('aa-official-profiles')) {
    throw new Error('Platform linkleri korunamadı — uygulama iptal');
  }

  const banned = findBannedHits(html);
  if (banned.length) {
    throw new Error(`Yasaklı ifade kaldı: ${banned.join(', ')}`);
  }

  await wpPost(`/wp-json/wp/v2/pages/${PROFILE_PAGE_ID}`, { content: html });

  // Rank Math SEO
  const seoMeta = {
    rank_math_title: SEO.title,
    rank_math_description: SEO.description,
    rank_math_focus_keyword: SEO.focusKeyword,
    rank_math_facebook_title: SEO.title,
    rank_math_facebook_description: SEO.description,
    rank_math_twitter_title: SEO.title,
    rank_math_twitter_description: SEO.description,
    rank_math_additional_keywords: SEO.additionalKeywords,
  };
  let seoOk = false;
  try {
    await wpPost(`/wp-json/adanaavukat/v1/rankmath-meta/${PROFILE_PAGE_ID}`, seoMeta);
    seoOk = true;
  } catch (e) {
    try {
      await wpPost(`/wp-json/wp/v2/pages/${PROFILE_PAGE_ID}`, { meta: seoMeta });
      seoOk = true;
    } catch (e2) {
      console.warn('Rank Math güncellenemedi:', String(e2.message || e2).slice(0, 160));
    }
  }

  return {
    backupPath,
    oldWords,
    newWords: extractMainContentWordCount(html),
    seoOk,
    htmlLen: html.length,
  };
}

async function verifyLive() {
  const bust = Date.now();
  const res = await fetch(`${PROFILE_URL}?v=${bust}`);
  const html = await res.text();
  const h1 = [...html.matchAll(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi)];
  const links = [
    LINKS.aileHukuku.href,
    LINKS.bosanma.href,
    LINKS.anlasmali.href,
    LINKS.cekismeli.href,
    LINKS.velayet.href,
    LINKS.nafaka.href,
    LINKS.malPaylasimi.href,
    LINKS.gayrimenkul.href,
    LINKS.rehber.href,
    LINKS.iletisim.href,
    LINKS.resmiSite.href,
  ];
  const missingLinks = [];
  for (const href of links) {
    if (!html.includes(href)) missingLinks.push(href);
  }

  // schema parse
  let schemaOk = false;
  let faqSchema = false;
  const m = html.match(/<script[^>]*id="aa-profile-jsonld"[^>]*>([\s\S]*?)<\/script>/i);
  if (m) {
    try {
      const json = JSON.parse(m[1]);
      schemaOk = Boolean(json?.['@graph']);
      faqSchema = JSON.stringify(json).includes('FAQPage');
    } catch {
      schemaOk = false;
    }
  }

  // key leak check in page HTML
  const keyLeak = /AIza[0-9A-Za-z_-]{20,}/.test(html) || /GEMINI_API_KEY/i.test(html);

  // shortcodes rendered or present
  const hasArticles =
    html.includes('ceren_aile_makaleleri') ||
    /Yayınlanan aile hukuku makaleleri[\s\S]{0,800}<li/i.test(html);
  const hasRecent =
    html.includes('ceren_son_guncellenen') ||
    /Son güncellenen içerikler[\s\S]{0,800}<li/i.test(html);
  const hasPlatforms = html.includes('aa-official-profiles');

  const banned = findBannedHits(html);

  // check internal links HTTP
  const linkStatuses = {};
  for (const href of links) {
    try {
      const r = await fetch(href, { method: 'HEAD', redirect: 'follow' });
      linkStatuses[href.replace('https://adanaavukat.org', '')] = r.status;
    } catch (e) {
      linkStatuses[href] = e.message.slice(0, 80);
    }
  }

  return {
    status: res.status,
    h1Count: h1.length,
    h1Text: h1.map((x) => x[0].replace(/<[^>]+>/g, '').trim()),
    schemaOk,
    faqSchema,
    keyLeak,
    hasArticles,
    hasRecent,
    hasPlatforms,
    missingLinks,
    banned,
    linkStatuses,
    hasToc: html.includes('aa-profile__toc'),
    hasFaq: html.includes('aa-profile__faq'),
    hasProcess: html.includes('aa-profile__process'),
  };
}

async function main() {
  mkdirSync(resolve(rootDir, 'reports'), { recursive: true });
  mkdirSync(resolve(rootDir, 'generated'), { recursive: true });

  const page = await wpFetch(`/wp-json/wp/v2/pages/${PROFILE_PAGE_ID}?context=edit`);
  const currentRaw = page.content?.raw || '';

  let payload;
  if (applyOnly) {
    if (!existsSync(OUT_JSON)) throw new Error('generated/lawyer-profile-content.json yok');
    payload = JSON.parse(readFileSync(OUT_JSON, 'utf8'));
  } else if (!force && existsSync(OUT_JSON) && !generateOnly) {
    console.log('Mevcut generated içerik kullanılacak (yeniden üretim için --force).');
    payload = JSON.parse(readFileSync(OUT_JSON, 'utf8'));
  } else {
    payload = await generateContent(currentRaw);
  }

  if (generateOnly) {
    console.log('generate-only tamam');
    return;
  }

  const applyResult = await applyContent(payload);
  console.log('WP uygulandı:', applyResult);

  // wait for cache
  await new Promise((r) => setTimeout(r, 2000));
  const live = await verifyLive();
  console.log('Live verify:', JSON.stringify(live, null, 2));

  const { execSync } = await import('node:child_process');
  let envTracked = false;
  try {
    execSync('git ls-files --error-unmatch .env', { cwd: rootDir, stdio: 'ignore' });
    envTracked = true;
  } catch {
    envTracked = false;
  }

  const artifactText = [
    existsSync(OUT_JSON) ? readFileSync(OUT_JSON, 'utf8') : '',
    existsSync(OUT_MD) ? readFileSync(OUT_MD, 'utf8') : '',
  ].join('\n');
  const artifactKeyLeak = /AIza[0-9A-Za-z_-]{20,}/.test(artifactText);

  const report = `# Lawyer Profile Enrichment Report

> ${new Date().toISOString()}

## 1. Changed files
- \`scripts/lib/profile-content.mjs\`
- \`scripts/enrich-lawyer-profile.mjs\`
- \`generated/lawyer-profile-content.json\`
- \`generated/lawyer-profile-content.md\`
- WP page #${PROFILE_PAGE_ID} content + Rank Math meta
- Backup: \`${applyResult.backupPath}\`

## 2. New sections
- İçindekiler
- Mesleki yaklaşım (genişletilmiş)
- Boşanma: anlaşmalı / çekişmeli alt başlıklar
- Velayet, nafaka, mal rejimi, ziynet, aile konutu, 6284 (genişletilmiş)
- Değerlendirme süreci
- Sık sorulan sorular (FAQ + FAQPage schema)
- Korunan: makale shortcode’ları, platform linkleri

## 3. Word count
- Eski (ana içerik ~): ${applyResult.oldWords}
- Yeni (ana içerik ~): ${applyResult.newWords}

## 4. Internal links
- aile hukuku, rehber, boşanma, anlaşmalı, çekişmeli, velayet, nafaka, mal paylaşımı, gayrimenkul, iletişim, resmî site
- Live missing: ${live.missingLinks.length ? live.missingLinks.join(', ') : 'yok'}
- Link statuses: ${JSON.stringify(live.linkStatuses)}

## 5. Meta / schema
- Rank Math apply: ${applyResult.seoOk}
- Title: ${SEO.title}
- Description: ${SEO.description}
- Schema parse OK: ${live.schemaOk}
- FAQPage schema: ${live.faqSchema}

## 6. Gemini
- Model: ${payload.model}
- Stage: one-shot content generation → persistent JSON → WP apply
- Grounding enabled: ${payload.groundingEnabled}
- Grounding sources (sample): ${(payload.groundingSources || []).slice(0, 5).map((s) => s.url || s.title).join(' | ') || 'n/a'}

## 7. Verification
- HTTP: ${live.status}
- H1 count: ${live.h1Count} (${live.h1Text.join(' | ')})
- Articles section: ${live.hasArticles}
- Recent section: ${live.hasRecent}
- Platforms: ${live.hasPlatforms}
- TOC/FAQ/Process: ${live.hasToc}/${live.hasFaq}/${live.hasProcess}
- Banned phrases: ${live.banned.length ? live.banned.join(', ') : 'yok'}
- API key in page HTML: ${live.keyLeak ? 'LEAK' : 'yok'}
- API key in generated artifacts: ${artifactKeyLeak ? 'LEAK' : 'yok'}
- .env tracked in git: ${envTracked ? 'EVET (sorun)' : 'hayır'}

## 8. Fabricated bio check
- Script prompt forbids bio invention; disclaimer preserved; banned-pattern scan on live HTML: ${live.banned.length === 0 ? 'PASS' : 'FAIL'}
`;

  writeFileSync(REPORT, report, 'utf8');
  console.log('Rapor:', REPORT);

  if (live.status !== 200 || live.h1Count !== 1 || live.keyLeak || live.banned.length) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
