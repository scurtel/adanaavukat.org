import { FORBIDDEN_PHRASES } from './service-pages-config.mjs';

/** Uzun ifadeler önce — kısmi eşleşme hatalarını önler */
export const PHRASE_REPLACEMENTS = [
  [
    'Adana Boşanma Avukatı | Anlaşmalı ve Çekişmeli Davalarda Uzman Hukuki Destek',
    'Adana Boşanma Avukatı',
  ],
  [
    'Adana Boşanma Avukatı | Ceren Sümer Cilli ile Güçlü Hukuki Süreç',
    'Adana Boşanma Avukatı | Anlaşmalı ve Çekişmeli Davalar',
  ],
  ['Adana Boşanma Avukatı ile Sürecinizi Güvence Altına Alın', 'Adana Boşanma Davası Süreci Hakkında'],
  ['Çekişmeli boşanma davası nasıl kazanılır?', 'Çekişmeli boşanma davasında süreç nasıl ilerler?'],
  [
    'Neden Profesyonel Boşanma Avukatı ile Çalışmalısınız?',
    'Boşanma Sürecinde Hukuki Destek Neden Önemlidir?',
  ],
  ['uzman hukuki destek', 'hukuki destek'],
  ['Uzman Hukuki Destek', 'Hukuki Destek'],
  ['güçlü hukuki süreç', 'boşanma dava süreci'],
  ['Güçlü Hukuki Süreç', 'Boşanma Dava Süreci'],
  ['güçlü temsil', 'hukuki temsil'],
  ['Güçlü temsil', 'Hukuki temsil'],
  ['güvence altına alın', 'usulüne uygun yürütün'],
  ['Güvence Altına Alın', 'Usulüne Uygun Yürütün'],
  ['hemen iletişime geçin', 'iletişim sayfasından bilgi alabilirsiniz'],
  ['Hemen iletişime geçin', 'İletişim sayfasından bilgi alabilirsiniz'],
  ['hemen inceleyin', 'sayfayı inceleyebilirsiniz'],
  ['Hemen inceleyin', 'Sayfayı inceleyebilirsiniz'],
  ['hemen bilgi alın', 'bilgi alabilirsiniz'],
  ['doğru yerdesiniz', 'bilgilendirici rehber sunulmaktadır'],
  ['sonuç odaklı', 'süreç odaklı'],
  ['en iyi şekilde', 'üstün yarar ilkesi çerçevesinde'],
  ['davanın sonucunu doğrudan etkiler', 'sürecin seyrini etkileyebilir'],
  ['pratik ve sonuç odaklı', 'planlı ve süreç odaklı'],
];

export function findRiskyPhrases(text = '') {
  const lower = text.toLowerCase();
  const hits = new Set();

  for (const phrase of FORBIDDEN_PHRASES) {
    if (lower.includes(phrase.toLowerCase())) {
      hits.add(phrase);
    }
  }

  for (const [from] of PHRASE_REPLACEMENTS) {
    if (lower.includes(from.toLowerCase())) {
      hits.add(from);
    }
  }

  if (/nasıl kazanılır/i.test(text)) hits.add('nasıl kazanılır');
  if (/hemen iletişim/i.test(text)) hits.add('hemen iletişim');
  if (/uzman hukuki/i.test(text)) hits.add('uzman hukuki');

  return [...hits];
}

export function sanitizeAdvertisingText(text = '') {
  if (!text) return { text, changed: false, notes: [] };

  let out = text;
  const notes = [];

  for (const [from, to] of PHRASE_REPLACEMENTS) {
    const re = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    if (re.test(out)) {
      out = out.replace(re, to);
      notes.push(`${from} → ${to}`);
    }
  }

  for (const phrase of FORBIDDEN_PHRASES) {
    const re = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    if (re.test(out)) {
      out = out.replace(re, '').replace(/\s{2,}/g, ' ');
      notes.push(`kaldırıldı: ${phrase}`);
    }
  }

  out = out
    .replace(/👉\s*Detaylı bilgi için:?\s*/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim();

  return { text: out, changed: out !== text, notes };
}
