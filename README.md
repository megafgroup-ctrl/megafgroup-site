# Megaf Group — megafgroup.com

Şirket web sitesi, 9 dil: EN/RU/TR/DE/FR/IT/ZH/KO/AR. Cloudflare Pages ile yayınlanır; `main` dalına her gönderim siteyi otomatik günceller.

## Yapı
- Her dilin kendi adresi var: `/en/`, `/ru/`, `/tr/`, `/de/`, `/fr/`, `/it/`, `/zh/`, `/ko/`, `/ar/`.
- Kök adres `/` ziyaretçiyi tarayıcı diline (veya en son seçtiği dile) göre doğru sayfaya yönlendirir.
- `sitemap.xml` ve `robots.txt` arama motorları içindir.

## Düzenleme
1. Sadece `_src/template.html` dosyasını düzenle (metinler içindeki `const T={...}` sözlüğünde).
2. Sayfaları yeniden üret: `python3 _src/build.py` (Python Playwright + Chromium gerekir).
3. Üretilen `index.html`, `*/index.html`, `sitemap.xml` dosyalarıyla birlikte gönder.

Kök ve dil klasörlerindeki `index.html` dosyaları üretilmiş dosyalardır; elle düzenleme.
