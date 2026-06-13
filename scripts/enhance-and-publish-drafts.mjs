/**
 * 5 WordPress draft'ını Gemini ile güçlendir ve publish et.
 * Sadece ID: 273, 274, 275, 276, 277
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { getWpConfig, getGeminiConfig } from './lib/env.mjs';
import { wpFetch, wpFetchAll } from './lib/wp-client.mjs';
import { callGemini, testGeminiConnection } from './lib/gemini.mjs';
import { stripHtml } from './lib/content-utils.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

const DRAFT_IDS = [273, 274, 275, 276, 277];
const SCHEMA_DIR = resolve(rootDir, 'reports/schema-drafts');
const REPORT_PATH = resolve(rootDir, 'reports/enhance-publish-final-report.md');

const HUB_PATTERNS = [
  { key: 'home', patterns: [/^(ana-sayfa|adana-avukat)$/, /^\/$/], label: 'Ana sayfa' },
  { key: 'profile', patterns: [/ceren.*cilli|avukat-ceren/, /kimdir/], label: 'Profil' },
  { key: 'about', patterns: [/hakkimizda/, /about-us/], label: 'Hakkımızda' },
  { key: 'contact', patterns: [/iletisim/, /contact/], label: 'İletişim' },
  { key: 'adana_avukat', patterns: [/^adana-avukat$/, /hizmetlerimiz/], label: 'Adana avukat' },
  { key: 'aile_hukuku', patterns: [/aile-hukuku/], label: 'Aile hukuku' },
  { key: 'bosanma', patterns: [/bosanma/, /boşanma/], label: 'Boşanma' },
  { key: 'nafaka', patterns: [/nafaka/], label: 'Nafaka' },
  { key: 'velayet', patterns: [/velayet/], label: 'Velayet' },
  { key: 'miras', patterns: [/miras/, /veraset/, /ortakligin-giderilmesi/], label: 'Miras' },
  { key: 'kira', patterns: [/kira/], label: 'Kira' },
  { key: 'is_hukuku', patterns: [/is-hukuku/, /iş-hukuku/], label: 'İş hukuku' },
];

const FORBIDDEN_PHRASES = [
  'en iyi avukat',
  'uzman avukat',
  'lider avukat',
  'garantili sonuç',
  'kesin kazanılır',
  'mutlaka kazanılır',
  'başarı garantisi',
  'davayı kesin kazanır',
  'en başarılı',
  'rakipsiz',
];

const CATEGORY_MAP = {
  273: 'Aile Hukuku',
  274: 'Aile Hukuku',
  275: 'Boşanma Davaları',
  276: 'Hukuk Rehberi', // will create if missing
  277: 'Aile Hukuku',
};

function stripTags(html = '') {
  return stripHtml(html);
}

function countInternalLinks(html) {
  const baseHost = 'adanaavukat.org';
  const links = [];
  const regex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    const href = m[1];
    const anchor = stripTags(m[2]);
    if (href.includes(baseHost) || href.startsWith('/')) {
      links.push({ href, anchor });
    }
  }
  return links;
}

function buildLinkMap(posts, pages) {
  const items = [...posts, ...pages]
    .filter((i) => i.status === 'publish')
    .map((i) => ({
      id: i.id,
      title: stripTags(i.title?.rendered || ''),
      slug: i.slug,
      link: i.link,
      type: i.type,
      status: i.status,
      excerpt: stripTags(i.excerpt?.rendered || '').slice(0, 200),
      categories: (i.categories || []).join(','),
      tags: (i.tags || []).join(','),
    }));

  const hubs = {};
  for (const hub of HUB_PATTERNS) {
    hubs[hub.key] = items.filter((item) =>
      hub.patterns.some((p) => p.test(item.slug) || p.test(new URL(item.link).pathname))
    );
  }

  return { items, hubs, linkList: items.map((i) => `- ${i.title}: ${i.link} (slug: ${i.slug}, type: ${i.type})`).join('\n') };
}

async function findCategoryByName(name) {
  const cats = await wpFetchAll('/wp-json/wp/v2/categories', { search: name });
  return cats.find((c) => c.name.toLowerCase() === name.toLowerCase()) || null;
}

async function ensureCategory(name) {
  let cat = await findCategoryByName(name);
  if (cat) return { id: cat.id, name: cat.name, created: false };
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const created = await wpFetch('/wp-json/wp/v2/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, slug }),
  });
  return { id: created.id, name: created.name, created: true };
}

async function resolveTags(tagNames) {
  const ids = [];
  const used = [];
  for (const name of tagNames) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    const tags = await wpFetchAll('/wp-json/wp/v2/tags', { search: trimmed });
    let tag = tags.find((t) => t.name.toLowerCase() === trimmed.toLowerCase());
    if (!tag) {
      const slug = trimmed
        .toLowerCase()
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ı/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      try {
        tag = await wpFetch('/wp-json/wp/v2/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: trimmed, slug }),
        });
        used.push({ name: trimmed, created: true });
      } catch {
        continue;
      }
    } else {
      used.push({ name: trimmed, created: false });
    }
    ids.push(tag.id);
  }
  return { ids, used };
}

function buildEnhancePrompt(post, linkMap, targetCategory) {
  return `Sen adanaavukat.org için Türkçe hukuk içeriği düzenleyen bir editörsün.

GÖREV: Aşağıdaki WordPress TASLAK yazısını SEO, AI otorite ve iç linkleme açısından güçlendir. Çıktıyı JSON olarak ver.

YAZI BİLGİSİ:
- WordPress ID: ${post.id}
- Mevcut başlık: ${stripTags(post.title?.rendered || '')}
- Slug: ${post.slug}
- Hedef kategori: ${targetCategory}

MEVCUT İÇERİK (HTML):
${post.content?.rendered || ''}

SİTE LİNK HARİTASI (SADECE BUNLARDAN LİNK VER — var olmayan URL uydurma):
${linkMap.linkList}

ÖNEMLİ HUB URL'LERİ:
${Object.entries(linkMap.hubs)
  .filter(([, v]) => v.length > 0)
  .map(([k, v]) => `${k}: ${v.map((x) => x.link).join(', ')}`)
  .join('\n')}

KURALLAR:
1. İçeriği HTML olarak döndür (<h2>, <h3>, <p>, <ul>, <ol>, <a href="...">)
2. Metnin doğal akışına 6-9 adet iç link yerleştir; sonunda "öneri listesi" bırakma
3. Aynı hedef URL'ye en fazla 2 link
4. En az 1 kez Av. Ceren Sümer Cilli profil sayfasına link (varsa)
5. En az 1 kez iletişim sayfasına link (varsa)
6. Ana sayfaya en fazla 1 link
7. Anchor text çeşitlendir; aynı anchor'ı tekrarlama
8. Av. Ceren Sümer Cilli entity'si doğal ve ölçülü (2-4 kez)
9. YASAK ifadeler: ${FORBIDDEN_PHRASES.join(', ')}
10. Her yazının SONUNA konuya özel yazar kutusu ekle (<div class="author-box"> veya <aside>)
11. FAQ bölümü: en az 5 soru-cevap, <h2>Sıkça Sorulan Sorular</h2> altında
12. Hukuki uyarı bölümü ekle
13. "somut olayın özelliklerine göre değişebilir" yaklaşımı
14. Adana yerel bağlamı koru
15. Mevcut iyi bölümleri koru, gereksiz tekrar yapma

SEO:
- seo_title: doğal, 50-60 karakter civarı
- meta_description: 140-160 karakter, keyword stuffing yok
- tags: 4-6 uygun etiket (virgülle ayrılmış string)

JSON FORMATI:
{
  "seo_title": "...",
  "meta_description": "...",
  "content_html": "...tam HTML içerik...",
  "tags": ["etiket1", "etiket2"],
  "faq": [
    {"question": "...", "answer": "..."}
  ],
  "author_box_added": true,
  "internal_link_count": 7,
  "linked_urls": ["https://...", "..."]
}`;
}

function sanitizeContent(html) {
  let out = html;
  for (const phrase of FORBIDDEN_PHRASES) {
    const re = new RegExp(phrase, 'gi');
    out = out.replace(re, 'hukuki destek');
  }
  return out;
}

function buildSchema(postId, enhanced, liveUrl) {
  const { baseUrl } = getWpConfig();
  const aboutTopics = {
    273: ['Aile hukuku', 'Boşanma', 'Nafaka', 'Velayet', 'Adana'],
    274: ['Adana avukat', 'Hukuki danışmanlık', 'Avukat seçimi', 'Adana'],
    275: ['Boşanma hukuku', 'Anlaşmalı boşanma', 'Çekişmeli boşanma', 'Adana'],
    276: ['Miras hukuku', 'Kira hukuku', 'İş hukuku', 'Adana'],
    277: ['Nafaka', 'Velayet', 'Çocuğun üstün yararı', 'Adana'],
  };

  const faqEntities = (enhanced.faq || []).map((f) => ({
    '@type': 'Question',
    name: f.question,
    acceptedAnswer: { '@type': 'Answer', text: f.answer },
  }));

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        '@id': `${liveUrl}#article`,
        headline: enhanced.seo_title,
        description: enhanced.meta_description,
        url: liveUrl,
        inLanguage: 'tr-TR',
        author: {
          '@type': 'Person',
          name: 'Av. Ceren Sümer Cilli',
          jobTitle: 'Avukat',
        },
        reviewedBy: {
          '@type': 'Person',
          name: 'Av. Ceren Sümer Cilli',
          jobTitle: 'Avukat',
        },
        publisher: {
          '@type': 'Organization',
          name: 'adanaavukat.org',
          url: baseUrl,
        },
        about: (aboutTopics[postId] || ['Hukuk', 'Adana']).map((t) => ({ '@type': 'Thing', name: t })),
        mentions: (aboutTopics[postId] || []).map((t) => ({ '@type': 'Thing', name: t })),
        areaServed: { '@type': 'City', name: 'Adana' },
      },
      {
        '@type': 'FAQPage',
        '@id': `${liveUrl}#faq`,
        mainEntity: faqEntities,
      },
    ],
  };
}

async function enhanceAndPublish() {
  const geminiConfig = getGeminiConfig();
  const results = {
    wpOk: false,
    geminiOk: false,
    model: geminiConfig.model,
    posts: [],
  };

  // 1. Test connections
  console.log('WordPress bağlantısı test ediliyor...');
  await wpFetch('/wp-json/wp/v2/users/me');
  results.wpOk = true;
  console.log('SONUÇ: WordPress BAŞARILI');

  console.log('Gemini bağlantısı test ediliyor...');
  const gemTest = await testGeminiConnection();
  results.geminiOk = gemTest.ok;
  console.log(`SONUÇ: Gemini ${gemTest.ok ? 'BAŞARILI' : 'BAŞARISIZ'}`);
  if (!gemTest.ok) throw new Error('Gemini bağlantısı başarısız');

  // 2. Link map
  console.log('\nSite link haritası çekiliyor...');
  const [posts, pages] = await Promise.all([
    wpFetchAll('/wp-json/wp/v2/posts', { status: 'publish' }),
    wpFetchAll('/wp-json/wp/v2/pages', { status: 'publish' }),
  ]);
  const linkMap = buildLinkMap(posts, pages);
  writeFileSync(
    resolve(rootDir, 'data/link-map-snapshot.json'),
    JSON.stringify(linkMap, null, 2),
    'utf8'
  );
  console.log(`Link haritası: ${linkMap.items.length} yayın`);

  mkdirSync(SCHEMA_DIR, { recursive: true });

  // 3. Process each draft
  for (const id of DRAFT_IDS) {
    console.log(`\n--- İşleniyor: ID ${id} ---`);
    const post = await wpFetch(`/wp-json/wp/v2/posts/${id}?context=edit`);
    if (!DRAFT_IDS.includes(post.id)) {
      throw new Error(`Beklenmeyen post ID: ${post.id}`);
    }

    const targetCategory = CATEGORY_MAP[id];
    const prompt = buildEnhancePrompt(post, linkMap, targetCategory);

    console.log('  Gemini ile içerik güçlendiriliyor...');
    const raw = await callGemini(prompt, { json: true, temperature: 0.4 });
    let enhanced;
    try {
      enhanced = JSON.parse(raw);
    } catch {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      enhanced = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    }

    enhanced.content_html = sanitizeContent(enhanced.content_html || '');
    const internalLinks = countInternalLinks(enhanced.content_html);

    // Category
    const category = await ensureCategory(targetCategory);
    const { ids: tagIds, used: tagsUsed } = await resolveTags(enhanced.tags || []);

    // Update post
    console.log('  WordPress güncelleniyor...');
    const updated = await wpFetch(`/wp-json/wp/v2/posts/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: enhanced.seo_title,
        content: enhanced.content_html,
        excerpt: enhanced.meta_description,
        status: 'publish',
        categories: [category.id],
        tags: tagIds,
      }),
    });

    if (updated.status !== 'publish') {
      throw new Error(`ID ${id} publish edilemedi, status: ${updated.status}`);
    }

    const schema = buildSchema(id, enhanced, updated.link);
    writeFileSync(join(SCHEMA_DIR, `adanaavukat-draft-${id}.json`), JSON.stringify(schema, null, 2), 'utf8');

    results.posts.push({
      id,
      title: enhanced.seo_title,
      liveUrl: updated.link,
      status: updated.status,
      category: category,
      tags: tagsUsed,
      internalLinkCount: internalLinks.length,
      linkedUrls: [...new Set(internalLinks.map((l) => l.href))],
      authorBoxAdded: enhanced.author_box_added ?? true,
      faqStrengthened: (enhanced.faq || []).length >= 5,
      categoryFixed: id === 276,
    });

    console.log(`  ✓ Publish edildi: ${updated.link} (${internalLinks.length} iç link)`);
    await new Promise((r) => setTimeout(r, 3000));
  }

  // Final report
  const report = buildFinalReport(results);
  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, report, 'utf8');
  console.log(`\nRapor: ${REPORT_PATH}`);
  return results;
}

function buildFinalReport(results) {
  let md = `# Enhance & Publish — Nihai Rapor

> Tarih: ${new Date().toISOString()}

## Bağlantı Testleri

| Test | Sonuç |
|------|-------|
| WordPress REST API | ${results.wpOk ? '**BAŞARILI**' : 'BAŞARISIZ'} |
| Gemini API | ${results.geminiOk ? '**BAŞARILI**' : 'BAŞARISIZ'} |
| Gemini modeli | ${results.model} |

## Güvenlik

- API key, Application Password ve .env değerleri **yazdırılmadı**
- Sadece ID 273–277 işlendi ve publish edildi
- Mevcut canlı içerikler (bu 5 dışında) **güncellenmedi**

## Yayınlanan Yazılar

`;

  for (const p of results.posts) {
    md += `### ${p.title}

| Alan | Değer |
|------|-------|
| WordPress ID | ${p.id} |
| Durum | **${p.status}** |
| Canlı URL | ${p.liveUrl} |
| İç link sayısı | ${p.internalLinkCount} |
| Kategori | ${p.category.name}${p.category.created ? ' (yeni oluşturuldu)' : ''} |
| Etiketler | ${p.tags.map((t) => t.name).join(', ')} |
| Yazar kutusu | ${p.authorBoxAdded ? 'Evet' : 'Hayır'} |
| FAQ güçlendirildi | ${p.faqStrengthened ? 'Evet (5+)' : 'Kontrol gerekli'} |
| Schema dosyası | reports/schema-drafts/adanaavukat-draft-${p.id}.json |

**Link verilen URL'ler:**
${p.linkedUrls.map((u) => `- ${u}`).join('\n')}

`;
    if (p.categoryFixed) {
      md += `_Kategori düzeltmesi: ID 276 "Hukuk Rehberi" kategorisine alındı (Aile Hukuku'ndan çıkarıldı)._\n\n`;
    }
  }

  md += `## Schema

Schema JSON-LD dosyaları local olarak oluşturuldu. Canlı siteye otomatik enjekte **edilmedi** (tema/eklenti uyumluluğu doğrulanmadı).

## Özet

- 5/5 yazı güncellendi ve **publish** edildi
- Başka canlı içerik değiştirilmedi
`;

  return md;
}

enhanceAndPublish().catch((err) => {
  console.error('Hata:', err.message);
  process.exit(1);
});
