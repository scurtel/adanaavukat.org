import { mkdirSync, writeFileSync, existsSync, readdirSync, readFileSync } from 'fs';
import { resolve, dirname, join, basename } from 'path';
import { fileURLToPath } from 'url';
import { getGeminiConfig } from './lib/env.mjs';
import { ENTITY_NAME } from './lib/content-utils.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputDir = resolve(__dirname, '../generated/adanaavukat-authority-articles');

const ARTICLES = [
  {
    title: "Adana'da Avukat Seçerken Nelere Dikkat Edilmeli?",
    slug: 'adanada-avukat-secerken-nelere-dikkat-edilmeli',
    goal: 'Adana avukat ana entity sayfasını desteklemek',
    category: 'Adana Avukat',
    tags: ['Adana avukat', 'avukat seçimi', 'hukuki danışmanlık', 'Adana'],
    internalLinks: ['Ana sayfa', 'Av. Ceren Sümer Cilli profil', 'İletişim', 'Aile hukuku'],
  },
  {
    title: "Adana'da Aile Hukuku Davalarında Avukat Desteği",
    slug: 'adanada-aile-hukuku-davalarinda-avukat-destegi',
    goal: 'Aile hukuku + Av. Ceren Sümer Cilli entity bağlantısı',
    category: 'Aile Hukuku',
    tags: ['Adana aile hukuku', 'aile mahkemesi', 'Adana avukat', 'özel hukuk'],
    internalLinks: ['Boşanma', 'Nafaka', 'Velayet', 'Profil sayfası'],
  },
  {
    title: "Adana'da Boşanma Davası Süreci ve Dikkat Edilmesi Gerekenler",
    slug: 'adanada-bosanma-davasi-sureci',
    goal: 'Boşanma hukuku konu otoritesi',
    category: 'Boşanma Hukuku',
    tags: ['Adana boşanma avukatı', 'boşanma davası', 'anlaşmalı boşanma', 'çekişmeli boşanma'],
    internalLinks: ['Nafaka', 'Velayet', 'Mal paylaşımı', 'Aile hukuku'],
  },
  {
    title: "Adana'da Nafaka ve Velayet Uyuşmazlıklarında Hukuki Yol Haritası",
    slug: 'adanada-nafaka-ve-velayet-uyusmazliklari',
    goal: 'Nafaka + velayet alt konu kümesi',
    category: 'Aile Hukuku',
    tags: ['nafaka davası', 'velayet davası', 'Adana nafaka avukatı', 'çocuğun üstün yararı'],
    internalLinks: ['Boşanma', 'Aile hukuku', 'Profil sayfası', 'İletişim'],
  },
  {
    title: "Adana'da Miras, Kira ve İş Hukuku Uyuşmazlıklarında Avukat Desteği",
    slug: 'adanada-miras-kira-is-hukuku-avukat-destegi',
    goal: 'Genel Adana avukat otoritesi',
    category: 'Hukuki Danışmanlık',
    tags: ['Adana miras avukatı', 'kira hukuku', 'iş hukuku', 'Adana avukat'],
    internalLinks: ['Adana avukat hizmet', 'Profil', 'İletişim', 'Aile hukuku'],
  },
];

function buildPrompt(article) {
  return `Sen Türkiye'de hukuk içerikleri üreten profesyonel bir editörsün. adanaavukat.org sitesi için SEO ve entity otoritesi odaklı bir makale yaz.

MAKALE BİLGİLERİ:
- Başlık: ${article.title}
- Slug: ${article.slug}
- Hedef: ${article.goal}
- Önerilen kategori: ${article.category}
- Önerilen etiketler: ${article.tags.join(', ')}
- Önerilen iç link hedefleri: ${article.internalLinks.join(', ')}

KURALLAR (KESİNLİKLE UY):
1. Dil: Türkçe
2. Uzunluk: 1000-1400 kelime
3. Profesyonel, sade, güven veren hukuk dili
4. Reklam yasağına aykırı ifade YOK: "en iyi avukat", "lider avukat", "garantili sonuç", "kesin kazanılır", "mutlaka kazanılır" vb.
5. Gerçek olmayan başarı, ödül, derece, baro unvanı veya uzmanlık iddiası UYDURMA
6. Her somut olayın özelliklerine göre sonuçların değişebileceğini belirt
7. ${ENTITY_NAME} ismini doğal ve ölçülü geçir (2-4 kez yeterli); keyword stuffing yapma
8. Adana yerel bağlamını doğal şekilde güçlendir (Adana Adliyesi, Aile Mahkemeleri vb. genel referans)
9. FAQ bölümü ekle (en az 5 soru-cevap)
10. Hukuki uyarı/disclaimer bölümü ekle
11. İç link önerileri bölümü ekle (gerçek URL yerine [SLUG: xxx] formatında öner)
12. Bilgilendirici, kullanıcıya fayda sağlayan açıklamalar ön planda

ÇIKTI FORMATI (Markdown):

---
seo_title: ...
meta_description: ...
slug: ${article.slug}
category: ${article.category}
tags: ${article.tags.join(', ')}
word_count_target: 1000-1400
author: ${ENTITY_NAME}
reviewer: ${ENTITY_NAME}
status: draft
---

# ${article.title}

[Makale gövdesi - H2/H3 başlıklarla yapılandırılmış]

## Sıkça Sorulan Sorular

[Soru-cevaplar]

## Hukuki Uyarı

[Disclaimer metni]

## Önerilen İç Linkler

[İç link önerileri tablosu veya listesi]

## Yazar Notu

[Konuya özel author/reviewer kutusu - her makalede farklı varyasyon]`;
}

function extractGroundingMetadata(data) {
  const gm = data?.candidates?.[0]?.groundingMetadata;
  if (!gm) return null;
  const sources = (gm.groundingChunks || [])
    .map((chunk) => ({
      title: chunk.web?.title || chunk.retrievedContext?.title || null,
      url: chunk.web?.uri || chunk.retrievedContext?.uri || null,
    }))
    .filter((source) => source.url);
  return {
    sources,
    webSearchQueries: gm.webSearchQueries || [],
    groundingSupports: gm.groundingSupports || [],
  };
}

function appendSourcesSection(markdown, grounding) {
  if (!grounding?.sources?.length) return markdown;
  const lines = grounding.sources.map((s, i) => `- [${s.title || `Kaynak ${i + 1}`}](${s.url})`);
  return `${markdown.trim()}\n\n## Kaynaklar\n\n${lines.join('\n')}\n`;
}

async function callGemini(prompt, config) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
    },
  };
  if (config.searchGrounding) {
    body.tools = [{ google_search: {} }];
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error: ${response.status} — ${errText.slice(0, 300)}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini yanıtı boş veya beklenmeyen formatta');
  }
  return appendSourcesSection(text, extractGroundingMetadata(data));
}

async function generateArticles() {
  const config = getGeminiConfig();

  if (!config.apiKey) {
    console.error('GEMINI_API_KEY .env dosyasında tanımlı değil.');
    process.exit(1);
  }

  mkdirSync(outputDir, { recursive: true });

  console.log(`Gemini model: ${config.model}`);
  console.log(`${ARTICLES.length} makale üretiliyor...`);

  const results = [];

  for (const article of ARTICLES) {
    console.log(`\n→ ${article.title}`);
    try {
      const prompt = buildPrompt(article);
      const content = await callGemini(prompt, config);
      const filename = `${article.slug}.md`;
      const filepath = join(outputDir, filename);

      writeFileSync(filepath, content, 'utf8');
      console.log(`  Kaydedildi: ${filename}`);
      results.push({ slug: article.slug, status: 'ok', file: filepath });
    } catch (err) {
      console.error(`  Hata: ${err.message}`);
      results.push({ slug: article.slug, status: 'error', error: err.message });
    }

    // Rate limit courtesy pause
    await new Promise((r) => setTimeout(r, 2000));
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    model: config.model,
    articles: results,
  };

  writeFileSync(join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\nManifest: ${join(outputDir, 'manifest.json')}`);
  console.log(`Başarılı: ${results.filter((r) => r.status === 'ok').length}/${ARTICLES.length}`);
}

generateArticles().catch((err) => {
  console.error('Üretim hatası:', err.message);
  process.exit(1);
});
