# Lawyer Profile Enrichment Report

> 2026-10-06T11:08:04.732Z

## 1. Changed files
- `scripts/lib/profile-content.mjs`
- `scripts/enrich-lawyer-profile.mjs`
- `generated/lawyer-profile-content.json`
- `generated/lawyer-profile-content.md`
- WP page #268 content + Rank Math meta
- Backup: `/Users/yigitc/Desktop/Cursor Dosyalar/adanaavukat.org/data/backups/profile-268-before-enrich-2026-10-06T11-07-48.json`

## 2. New sections
- İçindekiler
- Mesleki yaklaşım (genişletilmiş)
- Boşanma: anlaşmalı / çekişmeli alt başlıklar
- Velayet, nafaka, mal rejimi, ziynet, aile konutu, 6284 (genişletilmiş)
- Değerlendirme süreci
- Sık sorulan sorular (FAQ + FAQPage schema)
- Korunan: makale shortcode’ları, platform linkleri

## 3. Word count
- Eski (ana içerik ~): 2172
- Yeni (ana içerik ~): 2172

## 4. Internal links
- aile hukuku, rehber, boşanma, anlaşmalı, çekişmeli, velayet, nafaka, mal paylaşımı, gayrimenkul, iletişim, resmî site
- Live missing: yok
- Link statuses: {"/adana-aile-hukuku-avukati/":200,"/adana-bosanma-avukati/":200,"/adana-anlasmali-bosanma-avukati/":200,"/cekismeli-bosanma-davasi/":200,"/velayet-davasi-avukati-adana/":200,"/nafaka-davasi/":200,"/adana-ortakligin-giderilmesi-davasi-avukat/":200,"/gayrimenkul-avukati-adana/":200,"/aile-hukuku-rehberi/":200,"/iletisim/":200,"https://www.cerensumer.av.tr/av-ceren-sumer-cilli/":200}

## 5. Meta / schema
- Rank Math apply: true
- Title: Avukat Ceren Sümer Cilli | Adana Aile Hukuku
- Description: Avukat Ceren Sümer Cilli profili: Adana’da aile hukuku, boşanma, velayet, nafaka, mal rejimi, ziynet ve aile konutu konularında genel bilgilendirme.
- Schema parse OK: true
- FAQPage schema: true

## 6. Gemini
- Model: gemini-2.5-flash
- Stage: one-shot content generation → persistent JSON → WP apply
- Grounding enabled: true
- Grounding sources (sample): https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQECbG_AK85g49R5o1oryc4vNJ21hbobXWfY4r7gKvbuaWU-oAAOGPnq5vuFOiuz4sQ2n8YUgAi7tSy12LGniwOxkD0HTUQX-QkactcsksYPAZTBeXwKvN5QjMK4P-xIwOWAxtWxY8astlbW5b_i | https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFhl-t3UfFt0kwpNUJUmkhEuaIMD2nxa4YPPXdT-gkXV5SJgQ9h4d9SSdcNUEOIobztrqPR6t8JTj4Pcb8bBR2-P7CzpG41t2bWkLOoyUO7uEiC8b-aVrtwirA0g3AAWxaSOW-yi3MmF7cLPJvfqt6HfjrRacw= | https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEcp_kEYE5KWfOPpuinF_8DR0Rd26DV7ygyuU4Cv5zp6NmoXb2mdkspNVgddfg_hnDy9xXDn9IIzUQn61N5XDMidgH9D81b-QDUpSgKP0dJ1zmIhyWt_hfS9lOH4yJoHoTxOrxJ16UGJcb1nRDVjYACsCgxSDPcSsxz2zZpviwcsS5WM4Gthc4omLCDV37qvKwfNrSSXE5lwdM- | https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQE9VDIn77TvB6AhTg7G4zW6LoCBWiEgQqSgf9MmsRW2qzwInvFigRsyTxDzVqjl52Sea2LPpOz8FI5CIWkLdWibQXynkEgC3QuktBX4s8byrO4-xnc9f77NK8bU_3v5oHdMTL5NuIXAJ3mCpk1OZ2YRx0fBbdL_erduUl-I7wDCOOU9szyM8FP5nlrnpmXqfHwD4IQGcQQ= | https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQH7QCDrZ3JxXh0mj4nbbLmyOqt0WIecMuR1NHat7asbNTXBBEp5aOOq5ozxPgl__Gjlvzt204sbA9JtnoiaUMHkewURhGK95tFfgQLcXdeY83-Qd-29L6M08Z27CCQxY1plAIhcCBt859ffkQ==

## 7. Verification
- HTTP: 200
- H1 count: 1 (Avukat Ceren Sümer Cilli)
- Articles section: true
- Recent section: true
- Platforms: true
- TOC/FAQ/Process: true/true/true
- Banned phrases: yok
- API key in page HTML: yok
- API key in generated artifacts: yok
- .env tracked in git: hayır

## 8. Fabricated bio check
- Script prompt forbids bio invention; disclaimer preserved; banned-pattern scan on live HTML: PASS
