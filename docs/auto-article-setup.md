# Auto Article — GitHub Secrets

Workflow: `.github/workflows/auto-article.yml`  
Schedule: Pzt / Çar / Cum UTC 02:00 (~TR 05:00)

## Gerekli secrets

| Secret | Açıklama |
|--------|----------|
| `GEMINI_API_KEY` | Google AI Studio API anahtarı |
| `ADANAAVUKAT_WP_USERNAME` | WP kullanıcı adı |
| `ADANAAVUKAT_WP_APP_PASSWORD` | WP Application Password |

## Önerilen (featured image)

| Secret | Açıklama |
|--------|----------|
| `PEXELS_API_KEY` | Pexels |
| `PIXABAY_API_KEY` | Pixabay (yedek) |
| `UNSPLASH_ACCESS_KEY` | Unsplash (yedek) |

## Opsiyonel

| Secret / Var | Açıklama |
|--------------|----------|
| `ADANAAVUKAT_WP_BASE_URL` | Varsayılan: `https://adanaavukat.org` |
| `GEMINI_MODEL` (Actions variable) | Varsayılan: `gemini-2.5-flash` |

## Yerel test

```bash
# Draft üretir (publish etmez)
npm run auto:article

# Canlıya publish + featured image dener
npm run auto:article:publish
```

## GitHub’da ilk çalıştırma

1. Repo’ya secrets ekle
2. Actions → **Auto Article Generation** → **Run workflow**
3. Schedule otomatik devam eder
