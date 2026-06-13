/**
 * Hizmet sayfaları SEO denetimi, yedekleme ve otorite güncellemesi.
 * Kullanım: node scripts/service-authority-update.mjs [--audit-only] [--apply]
 */
import { mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { wpFetch, wpFetchAll } from './lib/wp-client.mjs';
import { getWpConfig, getAuthHeader, getGeminiConfig } from './lib/env.mjs';
import { callGemini } from './lib/gemini.mjs';
import { stripHtml, extractLinks, countWords } from './lib/content-utils.mjs';
import {
  BASE_URL,
  ENTITY,
  FORBIDDEN_PHRASES,
  DISCLAIMER,
  AUDIT_SLUGS,
  SLUG_ALIASES,
  SERVICE_DEFINITIONS,
  HIZMETLERIMIZ_ID,
  HIZMET_CARDS,
} from './lib/service-pages-config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const WP_STATUS = process.env.WP_STATUS === 'publish' ? 'publish' : 'draft';

const auditOnly = process.argv.includes('--audit-only');
const applyMode = process.argv.includes('--apply') || !auditOnly;

const state = {
  timestamp: ts,
  backupPath: `reports/backups/services-before-authority-update-${ts}.json`,
  auditReportPath: `reports/service-pages-audit-${ts}.md`,
  updatedReportPath: `reports/service-pages-updated-${ts}.md`,
  linksReportPath: `reports/internal-links-report-${ts}.md`,
  schemaReportPath: `reports/schema-report-${ts}.md`,
  pages: [],
  backups: [],
  audit: [],
  actions: { created: [], updated: [], skipped: [], fixed404: [] },
  links: { added: [], broken: [] },
  schemas: [],
  risks: [],
};

function analyzeHeadings(html) {
  const h1 = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => stripHtml(m[1]));
  const h2 = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) => stripHtml(m[1]));
  const h3 = [...html.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi)].map((m) => stripHtml(m[1]));
  return { h1, h2, h3, h1Count: h1.length, h2Count: h2.length, h3Count: h3.length };
}

function findRiskyPhrases(text) {
  const lower = text.toLowerCase();
  return FORBIDDEN_PHRASES.filter((p) => lower.includes(p.toLowerCase()));
}

function parseGeminiJson(raw) {
  let text = raw.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) text = fenced[1].trim();
  const obj = text.match(/\{[\s\S]*\}/);
  return JSON.parse(obj ? obj[0] : text);
}

function sanitizeContent(html) {
  let out = html;
  for (const phrase of FORBIDDEN_PHRASES) {
    out = out.replace(new RegExp(phrase, 'gi'), '');
  }
  out = out.replace(/👉\s*Detaylı bilgi için:?\s*/gi, '');
  out = out.replace(/Detaylı Bilgi/gi, 'Sayfayı inceleyin');
  return out;
}

async function fetchRankMathMeta(pageId) {
  try {
    const page = await wpFetch(`/wp-json/wp/v2/pages/${pageId}?context=edit`);
    const meta = page.meta || {};
    return {
      title: meta.rank_math_title || null,
      description: meta.rank_math_description || null,
      focusKeyword: meta.rank_math_focus_keyword || null,
    };
  } catch {
    return { title: null, description: null, focusKeyword: null };
  }
}

async function checkUrl(path) {
  try {
    const r = await fetch(`${BASE_URL}${path}`, { redirect: 'follow' });
    return { path, status: r.status, ok: r.status === 200 };
  } catch (e) {
    return { path, status: 0, ok: false, error: e.message };
  }
}

async function backupPages(allPages) {
  const backupSlugs = new Set([
    'hizmetlerimiz',
    'adana-kira-hukuku',
    'adana-is-hukuku',
    ...AUDIT_SLUGS,
    ...Object.values(SLUG_ALIASES),
    ...SERVICE_DEFINITIONS.map((s) => s.slug),
    ...HIZMET_CARDS.map((c) => c.slug),
  ]);

  const hizmetPage = allPages.find((p) => p.slug === 'hizmetlerimiz');
  if (hizmetPage) {
    const links = extractLinks(hizmetPage.content?.rendered || '');
    for (const l of links.internal) {
      const slug = l.path.replace(/^\/|\/$/g, '');
      if (slug) backupSlugs.add(slug);
    }
  }

  const backups = [];
  for (const slug of backupSlugs) {
    const page = allPages.find((p) => p.slug === slug);
    if (!page) continue;
    const full = await wpFetch(`/wp-json/wp/v2/pages/${page.id}?context=edit`);
    backups.push({
      backedUpAt: new Date().toISOString(),
      id: full.id,
      slug: full.slug,
      title: full.title,
      status: full.status,
      link: full.link,
      content: full.content,
      excerpt: full.excerpt,
      meta: full.meta || null,
    });
  }

  mkdirSync(resolve(rootDir, 'reports/backups'), { recursive: true });
  writeFileSync(resolve(rootDir, state.backupPath), JSON.stringify(backups, null, 2), 'utf8');
  state.backups = backups;
  return backups;
}

async function runAudit(allPages) {
  const audit = [];

  for (const slug of AUDIT_SLUGS) {
    const alias = SLUG_ALIASES[slug];
    const page = allPages.find((p) => p.slug === slug) || (alias ? allPages.find((p) => p.slug === alias) : null);
    const urlCheck = await checkUrl(`/${slug}/`);
    const aliasCheck = alias ? await checkUrl(`/${alias}/`) : null;

    if (!page) {
      audit.push({
        slug,
        path: `/${slug}/`,
        exists: false,
        published: false,
        aliasSlug: alias || null,
        aliasExists: !!alias && !!allPages.find((p) => p.slug === alias),
        httpStatus: urlCheck.status,
        aliasHttpStatus: aliasCheck?.status,
        issues: ['Sayfa bulunamadı'],
      });
      if (!alias) state.actions.fixed404.push({ from: slug, note: 'Oluşturulacak' });
      continue;
    }

    const html = page.content?.rendered || '';
    const plain = stripHtml(html);
    const headings = analyzeHeadings(html);
    const links = extractLinks(html);
    const risks = findRiskyPhrases(plain);
    const rankMath = await fetchRankMathMeta(page.id);

    audit.push({
      slug,
      actualSlug: page.slug,
      id: page.id,
      path: `/${slug}/`,
      exists: true,
      published: page.status === 'publish',
      title: stripHtml(page.title?.rendered || ''),
      wordCount: countWords(plain),
      headings,
      internalLinkCount: links.internal.length,
      hasJsonLd: /application\/ld\+json/i.test(html),
      rankMath,
      httpStatus: urlCheck.status,
      isEmpty: countWords(plain) < 50,
      isWeak: countWords(plain) < 400,
      issues: [
        ...(headings.h1Count !== 1 ? [`H1 sayısı: ${headings.h1Count} (beklenen: 1)`] : []),
        ...(countWords(plain) < 400 ? [`Düşük kelime sayısı: ${countWords(plain)}`] : []),
        ...(risks.length ? [`Riskli ifade: ${risks.join(', ')}`] : []),
        ...(!rankMath.title ? ['Meta title eksik'] : []),
        ...(!rankMath.description ? ['Meta description eksik'] : []),
        ...(page.slug !== slug ? [`Slug farklı: ${page.slug}`] : []),
      ],
      risks,
      link: page.link,
    });
  }

  state.audit = audit;
  return audit;
}

function buildAuditMarkdown(audit) {
  let md = `# Hizmet Sayfaları Denetim Raporu

> Tarih: ${new Date().toISOString()}  
> Site: ${BASE_URL}  
> Yedek: \`${state.backupPath}\`

## Özet

| Metrik | Değer |
|--------|-------|
| Denetlenen URL | ${AUDIT_SLUGS.length} |
| Mevcut sayfa | ${audit.filter((a) => a.exists).length} |
| Eksik sayfa | ${audit.filter((a) => !a.exists).length} |
| Zayıf içerik (<400 kelime) | ${audit.filter((a) => a.isWeak).length} |
| H1 sorunu | ${audit.filter((a) => a.headings?.h1Count !== 1 && a.exists).length} |
| Riskli ifade | ${audit.filter((a) => a.risks?.length).length} |

## Sayfa Detayları

`;

  for (const a of audit) {
    md += `### /${a.slug}/\n\n`;
    md += `| Alan | Değer |\n|------|-------|\n`;
    md += `| Var mı? | ${a.exists ? 'Evet' : 'Hayır'} |\n`;
    if (a.aliasSlug) md += `| Eşdeğer slug | \`${a.aliasSlug}\` (${a.aliasExists ? 'mevcut' : 'yok'}) |\n`;
    md += `| Yayında mı? | ${a.published ? 'Evet' : a.exists ? 'Hayır (taslak/özel)' : '—'} |\n`;
    md += `| HTTP | ${a.httpStatus || '—'} |\n`;
    if (a.title) md += `| Başlık | ${a.title} |\n`;
    if (a.wordCount != null) md += `| Kelime sayısı | ${a.wordCount} |\n`;
    if (a.headings) {
      md += `| H1 (${a.headings.h1Count}) | ${a.headings.h1.join(' / ') || '—'} |\n`;
      md += `| H2 sayısı | ${a.headings.h2Count} |\n`;
    }
    if (a.internalLinkCount != null) md += `| İç link | ${a.internalLinkCount} |\n`;
    if (a.rankMath) {
      md += `| Meta title | ${a.rankMath.title || '❌ eksik'} |\n`;
      md += `| Meta description | ${a.rankMath.description || '❌ eksik'} |\n`;
    }
    if (a.issues?.length) md += `| Sorunlar | ${a.issues.join('; ')} |\n`;
    md += '\n';
  }

  return md;
}

function buildServicePrompt(def, linkList) {
  const related = (def.relatedLinks || [])
    .map((l) => `- ${l.label}: ${BASE_URL}/${l.slug}/`)
    .join('\n');

  return `Sen adanaavukat.org için Türkçe hukuk içeriği üreten bir editörsün.

GÖREV: "${def.h1}" başlıklı hizmet sayfası için ${def.minWords}-1200 kelimelik bilgilendirici HTML içerik üret.

H1: ${def.h1}

ZORUNLU H2 BAŞLIKLARI (sırayla, her biri tek H2):
1. ${def.serviceArea} Nedir?
2. Bu Alanda Hangi Uyuşmazlıklar Görülür?
3. Dava veya Başvuru Süreci Nasıl İlerler?
4. Adana'da Hukuki Destek Almanın Önemi
5. Sık Sorulan Sorular
6. İlgili Hizmetler

KURALLAR:
- Yalnızca TEK H1 kullan (${def.h1})
- H1 > H2 > H3 hiyerarşisi
- Giriş paragrafı: konuyu sade açıkla, Adana'daki sorunları belirt, Avukat Ceren Sümer Cilli'nin bu alanda danışmanlık ve dava takibi sunduğunu doğal ifade et
- 5 adet FAQ (H2 altında H3 soru + p cevap)
- Sayfa sonunda disclaimer: "${DISCLAIMER}"
- Yasak ifadeler: ${FORBIDDEN_PHRASES.join(', ')}
- Kesin sonuç, garanti, "en iyi" iddiası YOK
- Adana yerel bağlamı
- 4-6 doğal iç link (aşağıdaki URL'lerden):
${related}
- Profil: ${ENTITY.profileUrl}
- İletişim: ${ENTITY.contactUrl}

SİTE LİNKLERİ:
${linkList}

JSON çıktı (content_html içinde çift tırnakları escape et):
{
  "content_html": "...tam HTML...",
  "faq": [{"question":"...","answer":"..."}],
  "meta_title": "${def.metaTitle}",
  "meta_description": "${def.metaDescription}",
  "focus_keyword": "${def.focusKeyword}"
}`;
}

async function generateEnhanced(def, existing, linkList) {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (def.action === 'fix-h1' && existing) {
        const raw = await callGemini(buildFixH1Prompt(existing, def), { json: true, temperature: 0.3 });
        const enhanced = parseGeminiJson(raw);
        enhanced.faq = enhanced.faq || [];
        enhanced.meta_title = def.metaTitle;
        enhanced.meta_description = def.metaDescription;
        enhanced.focus_keyword = def.focusKeyword;
        return enhanced;
      }
      const raw = await callGemini(buildServicePrompt(def, linkList), {
        json: true,
        temperature: 0.4,
        maxOutputTokens: 24576,
      });
      return parseGeminiJson(raw);
    } catch (e) {
      if (attempt === maxAttempts) throw e;
      console.log(`  ⚠ Deneme ${attempt} başarısız, yeniden deneniyor... (${e.message.slice(0, 80)})`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

function buildFixH1Prompt(page, def) {
  const html = page.content?.raw || page.content?.rendered || '';
  return `Sen HTML editörüsün. Aşağıdaki sayfada çoklu H1 sorunu var. Düzelt:

HEDEF: Tek H1 = "${def.h1}"
Diğer eski H1'leri H2 veya H3 yap (mantıklı hiyerarşi)
Riskli ifadeleri kaldır: ${FORBIDDEN_PHRASES.join(', ')}
"👉 Detaylı bilgi" ifadelerini kaldır
İçeriği bozma, sadece başlık hiyerarşisini düzelt

MEVCUT HTML:
${html}

JSON: {"content_html": "...düzeltilmiş HTML..."}`;
}

function buildSchema(pageUrl, def, faq) {
  const faqEntities = (faq || []).map((f) => ({
    '@type': 'Question',
    name: f.question,
    acceptedAnswer: { '@type': 'Answer', text: f.answer },
  }));

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'LegalService',
        '@id': `${pageUrl}#legalservice`,
        name: ENTITY.name,
        url: pageUrl,
        areaServed: { '@type': 'City', name: 'Adana' },
        serviceType: def.serviceArea,
        provider: { '@id': `${BASE_URL}/#person` },
      },
      {
        '@type': 'Person',
        '@id': `${BASE_URL}/#person`,
        name: ENTITY.name,
        jobTitle: 'Avukat',
        url: ENTITY.profileUrl,
        worksFor: {
          '@type': 'LegalService',
          name: ENTITY.name,
          url: BASE_URL,
        },
        knowsAbout: [def.serviceArea, 'Adana', 'Hukuk'],
        sameAs: ENTITY.sameAs,
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${pageUrl}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Ana Sayfa', item: `${BASE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'Hizmetlerimiz', item: `${BASE_URL}/hizmetlerimiz/` },
          { '@type': 'ListItem', position: 3, name: def.h1, item: pageUrl },
        ],
      },
      ...(faqEntities.length
        ? [{ '@type': 'FAQPage', '@id': `${pageUrl}#faq`, mainEntity: faqEntities }]
        : []),
    ],
  };
}

function injectSchema(html, schema) {
  const script = `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;
  if (/application\/ld\+json/i.test(html)) {
    return html.replace(/<script[^>]+type=["']application\/ld\+json["'][\s\S]*?<\/script>/gi, script);
  }
  return `${html}\n\n${script}`;
}

function buildHizmetlerimizHtml() {
  const cards = HIZMET_CARDS.map(
    (c) => `<div class="aa-service-card">
<h3>${c.title}</h3>
<p>${c.desc}</p>
<p><a href="${BASE_URL}/${c.slug}/">${c.title} hakkında bilgi alın</a></p>
</div>`
  ).join('\n');

  return `<!-- wp:html -->
<div class="aa-services-hub">
<h1>Hizmetlerimiz | Adana Avukatlık Hizmetleri</h1>

<p>Adana'da hukuki destek arayan kişiler için aile hukuku, boşanma, velayet, nafaka, miras, gayrimenkul, kira hukuku ve iş hukuku alanlarında bilgilendirici bir hizmet merkezi oluşturduk. Aşağıda uzmanlık alanlarımıza ilişkin sayfaları inceleyebilirsiniz.</p>

<h2>Adana Avukatlık Hizmetleri</h2>

<div class="aa-services-grid">
${cards}
</div>

<h2>Avukat Ceren Sümer Cilli Hakkında</h2>

<p><a href="${ENTITY.profileUrl}">Avukat Ceren Sümer Cilli</a>, Adana'da aile hukuku, boşanma davaları, velayet, nafaka, miras ve gayrimenkul uyuşmazlıkları alanlarında hukuki danışmanlık ve dava takibi desteği sunmaktadır. Süreçlerin her aşamasında bilgilendirici ve ölçülü bir yaklaşım benimsenmektedir.</p>

<p>İlgili sayfalar: <a href="${ENTITY.profileUrl}">Profil</a> · <a href="${ENTITY.contactUrl}">İletişim</a> · <a href="${BASE_URL}/adana-bosanma-avukati/">Boşanma</a> · <a href="${BASE_URL}/adana-aile-hukuku-avukati/">Aile Hukuku</a> · <a href="${BASE_URL}/adana-miras-hukuku/">Miras</a> · <a href="${BASE_URL}/adana-ortakligin-giderilmesi-davasi-avukat/">Ortaklığın Giderilmesi</a> · <a href="${BASE_URL}/adana-kira-hukuku/">Kira Hukuku</a> · <a href="${BASE_URL}/adana-is-hukuku/">İş Hukuku</a></p>

<p><em>${DISCLAIMER}</em></p>
</div>
<!-- /wp:html -->`;
}

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
  if (!response.ok) throw new Error(`${path} ${response.status}: ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : {};
}

async function updateRankMath(pageId, meta) {
  const payload = {
    rank_math_title: meta.meta_title,
    rank_math_description: meta.meta_description,
    rank_math_focus_keyword: meta.focus_keyword,
    rank_math_robots: ['index', 'follow'],
  };
  const methods = [];
  try {
    await wpPost(`/wp-json/adanaavukat/v1/rankmath-meta/${pageId}`, payload);
    methods.push('adanaavukat/v1');
  } catch (e) {
    methods.push(`adanaavukat/v1 failed: ${e.message}`);
  }
  try {
    await wpPost(`/wp-json/wp/v2/pages/${pageId}`, { meta: payload });
    methods.push('wp/v2/pages meta');
  } catch (e) {
    methods.push(`wp meta failed: ${e.message}`);
  }
  return methods;
}

async function applyUpdates(allPages, linkList) {
  const geminiConfig = getGeminiConfig();
  console.log(`Gemini model: ${geminiConfig.model}, grounding: ${geminiConfig.searchGrounding}`);
  console.log(`WP durumu: ${WP_STATUS}`);

  for (const def of SERVICE_DEFINITIONS) {
    const existing = allPages.find((p) => p.slug === def.slug);
    const wordCount = existing ? countWords(stripHtml(existing.content?.rendered || '')) : 0;

    const needsWork =
      def.action === 'create' ||
      def.action === 'expand' ||
      (def.action === 'fix-h1' && existing) ||
      (existing && wordCount < def.minWords);

    if (!needsWork && existing) {
      state.actions.skipped.push({ slug: def.slug, reason: 'Yeterli içerik mevcut' });
      continue;
    }

    console.log(`\n→ İşleniyor: ${def.slug} (${def.action})`);

    let enhanced;
    try {
      enhanced = await generateEnhanced(def, existing, linkList);
    } catch (e) {
      console.error(`  ✗ ${def.slug} atlandı: ${e.message}`);
      state.actions.skipped.push({ slug: def.slug, reason: e.message });
      continue;
    }

    let content = sanitizeContent(enhanced.content_html || '');
    const pageUrl = `${BASE_URL}/${def.slug}/`;
    const schema = buildSchema(pageUrl, def, enhanced.faq);
    content = injectSchema(content, schema);
    state.schemas.push({ slug: def.slug, types: ['LegalService', 'Person', 'BreadcrumbList', 'FAQPage'] });

    if (existing) {
      const pageStatus = existing.status === 'publish' ? 'publish' : WP_STATUS;
      const updated = await wpPost(`/wp-json/wp/v2/pages/${existing.id}`, {
        content,
        status: pageStatus,
        title: def.h1,
      });
      await updateRankMath(existing.id, enhanced);
      state.actions.updated.push({
        slug: def.slug,
        id: existing.id,
        status: updated.status,
        wordCount: countWords(stripHtml(content)),
        link: updated.link,
      });
      console.log(`  ✓ Güncellendi (ID ${existing.id})`);
    } else {
      const created = await wpPost('/wp-json/wp/v2/pages', {
        title: def.h1,
        slug: def.slug,
        content,
        status: WP_STATUS,
        excerpt: enhanced.meta_description,
      });
      await updateRankMath(created.id, enhanced);
      state.actions.created.push({
        slug: def.slug,
        id: created.id,
        status: created.status,
        link: created.link,
      });
      console.log(`  ✓ Oluşturuldu (ID ${created.id})`);
    }

    await new Promise((r) => setTimeout(r, 4000));
  }

  // Hizmetlerimiz
  console.log('\n→ Hizmetlerimiz sayfası yeniden düzenleniyor...');
  const hizmetHtml = buildHizmetlerimizHtml();
  const hizmetSchema = buildSchema(`${BASE_URL}/hizmetlerimiz/`, {
    h1: 'Hizmetlerimiz | Adana Avukatlık Hizmetleri',
    serviceArea: 'Adana Avukatlık Hizmetleri',
  }, []);
  const hizmetContent = injectSchema(hizmetHtml, hizmetSchema);

  const hizmetPage = allPages.find((p) => p.id === HIZMETLERIMIZ_ID);
  const hizmetStatus = hizmetPage?.status === 'publish' ? 'publish' : WP_STATUS;

  const hizmetUpdated = await wpPost(`/wp-json/wp/v2/pages/${HIZMETLERIMIZ_ID}`, {
    title: 'Hizmetlerimiz | Adana Avukatlık Hizmetleri',
    content: hizmetContent,
    status: hizmetStatus,
  });
  await updateRankMath(HIZMETLERIMIZ_ID, {
    meta_title: 'Hizmetlerimiz | Adana Avukatlık Hizmetleri',
    meta_description:
      'Adana avukatlık hizmetleri: aile hukuku, boşanma, velayet, nafaka, miras, gayrimenkul, kira ve iş hukuku alanlarında bilgilendirici rehber.',
    focus_keyword: 'Adana avukatlık hizmetleri',
  });
  state.actions.updated.push({
    slug: 'hizmetlerimiz',
    id: HIZMETLERIMIZ_ID,
    status: hizmetUpdated.status,
    note: 'Kurumsal yapı + entity bloğu',
  });

  // Profil entity check - add internal links if missing
  const profile = allPages.find((p) => p.slug === ENTITY.profileSlug);
  if (profile) {
    const html = profile.content?.raw || profile.content?.rendered || '';
    if (!html.includes('hizmetlerimiz')) {
      const patch = `${html}\n<p>Detaylı hizmet bilgileri için <a href="${BASE_URL}/hizmetlerimiz/">Hizmetlerimiz</a> sayfasını inceleyebilirsiniz.</p>`;
      await wpPost(`/wp-json/wp/v2/pages/${profile.id}`, { content: patch, status: profile.status });
      state.links.added.push({ from: 'profil', to: '/hizmetlerimiz/', note: 'Entity iç link' });
    }
  }

  // Check hizmetlerimiz card links for 404
  for (const card of HIZMET_CARDS) {
    const check = await checkUrl(`/${card.slug}/`);
    if (!check.ok) {
      state.links.broken.push({ path: `/${card.slug}/`, title: card.title });
    } else {
      state.links.added.push({ from: 'hizmetlerimiz', to: `/${card.slug}/`, title: card.title });
    }
  }
}

function buildUpdatedReport() {
  let md = `# Hizmet Sayfaları Güncelleme Raporu

> Tarih: ${new Date().toISOString()}  
> WP durumu: **${WP_STATUS}**

## Oluşturulan Sayfalar

${state.actions.created.length ? state.actions.created.map((a) => `- \`${a.slug}\` (ID ${a.id}) → ${a.link}`).join('\n') : '- Yok'}

## Güncellenen Sayfalar

${state.actions.updated.map((a) => `- \`${a.slug}\` (ID ${a.id})${a.note ? ` — ${a.note}` : ''}`).join('\n')}

## Atlanan Sayfalar

${state.actions.skipped.map((a) => `- \`${a.slug}\`: ${a.reason}`).join('\n') || '- Yok'}

## Slug Eşleştirmeleri (redirect önerisi)

${Object.entries(SLUG_ALIASES)
  .map(([requested, existing]) => `- \`/${requested}/\` → mevcut: \`/${existing}/\` (301 redirect önerilir)`)
  .join('\n')}

## Riskli İfadeler

${state.risks.length ? state.risks.map((r) => `- ${r}`).join('\n') : '- Tespit edilen ifadeler içerik üretiminde temizlendi'}

## Profil slug notu

- İstenen: \`/avukat-ceren-sumer-cilli/\`
- Mevcut: \`${ENTITY.profileUrl}\` (slug değiştirilmedi)
`;

  return md;
}

function buildLinksReport() {
  return `# İç Link Raporu

> Tarih: ${new Date().toISOString()}

## Hizmetlerimiz'den Eklenen Linkler

${state.links.added.map((l) => `- ${l.from} → ${l.to}${l.title ? ` (${l.title})` : ''}`).join('\n')}

## Kırık / 404 Linkler

${state.links.broken.length ? state.links.broken.map((b) => `- ❌ ${b.path} (${b.title})`).join('\n') : '- Düzeltme sonrası kırık link tespit edilmedi'}

## Slug Uyumsuzlukları

${Object.entries(SLUG_ALIASES)
  .map(([a, b]) => `- Denetim slug \`${a}\` → canlı sayfa \`${b}\``)
  .join('\n')}
`;
}

function buildSchemaReport() {
  return `# Schema Raporu

> Tarih: ${new Date().toISOString()}

## Eklenen Schema Türleri

| Sayfa | Schema |
|-------|--------|
${state.schemas.map((s) => `| ${s.slug} | ${s.types.join(', ')} |`).join('\n')}
| hizmetlerimiz | LegalService, Person, BreadcrumbList |

## Entity Bilgileri

- name: ${ENTITY.name}
- areaServed: Adana
- url: ${BASE_URL}
- sameAs: ${ENTITY.sameAs.length} profil bağlantısı (uydurma yok)

## FAQPage

FAQ içeren tüm hizmet sayfalarına FAQPage schema eklendi.
`;
}

async function main() {
  mkdirSync(resolve(rootDir, 'reports'), { recursive: true });

  console.log('WordPress bağlantısı...');
  await wpFetch('/wp-json/wp/v2/users/me');

  const allPages = await wpFetchAll('/wp-json/wp/v2/pages', { status: 'publish,draft,private' });
  state.pages = allPages;

  console.log('Yedek alınıyor...');
  await backupPages(allPages);
  console.log(`Yedek: ${state.backupPath} (${state.backups.length} sayfa)`);

  console.log('Denetim yapılıyor...');
  const audit = await runAudit(allPages);
  const auditMd = buildAuditMarkdown(audit);
  writeFileSync(resolve(rootDir, state.auditReportPath), auditMd, 'utf8');
  console.log(`Denetim raporu: ${state.auditReportPath}`);

  if (!applyMode) {
    console.log('\n--audit-only modu: güncelleme yapılmadı.');
    return;
  }

  const linkList = allPages
    .filter((p) => p.status === 'publish' || p.status === 'draft')
    .map((p) => `- ${stripHtml(p.title?.rendered || '')}: ${p.link}`)
    .join('\n');

  console.log('\nGüncellemeler uygulanıyor...');
  await applyUpdates(allPages, linkList);

  writeFileSync(resolve(rootDir, state.updatedReportPath), buildUpdatedReport(), 'utf8');
  writeFileSync(resolve(rootDir, state.linksReportPath), buildLinksReport(), 'utf8');
  writeFileSync(resolve(rootDir, state.schemaReportPath), buildSchemaReport(), 'utf8');

  console.log('\n=== Tamamlandı ===');
  console.log(`Güncelleme: ${state.updatedReportPath}`);
  console.log(`İç linkler: ${state.linksReportPath}`);
  console.log(`Schema: ${state.schemaReportPath}`);
}

main().catch((e) => {
  console.error('Hata:', e.message);
  process.exit(1);
});
