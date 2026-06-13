import { getGeminiConfig } from './env.mjs';

export async function callGemini(prompt, options = {}) {
  const config = getGeminiConfig();
  if (!config.apiKey) {
    throw new Error('GEMINI_API_KEY tanımlı değil');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;

  const useGrounding = config.searchGrounding && options.grounding !== false && !options.json;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: options.temperature ?? 0.5,
      maxOutputTokens: options.maxOutputTokens ?? 16384,
      responseMimeType: options.json && !useGrounding ? 'application/json' : undefined,
    },
  };

  if (useGrounding) {
    body.tools = [{ google_search: {} }];
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error: ${response.status} — ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini yanıtı boş veya beklenmeyen formatta');
  }
  return text;
}

export async function testGeminiConnection() {
  const result = await callGemini('Türkçe kısa bir cümle üret: bağlantı başarılı.');
  return { ok: true, hasResponse: result.length > 0 };
}
