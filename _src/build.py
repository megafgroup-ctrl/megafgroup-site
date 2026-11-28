"""Build one static page per language from _src/template.html.

Run from the repository root:  python3 _src/build.py
Needs Python Playwright with Chromium. Edit only _src/template.html, then rebuild.
Writes: /index.html (root, redirects visitors to their language), /<lang>/index.html,
sitemap.xml and robots.txt.
"""
import json, os, re, tempfile, html
from playwright.sync_api import sync_playwright

SITE = 'https://megafgroup.com'
LANGS = ['en', 'ru', 'uz', 'tr', 'de', 'fr', 'it', 'zh', 'ko', 'ar']
OG_LOCALE = {'en': 'en_US', 'ru': 'ru_RU', 'tr': 'tr_TR', 'de': 'de_DE', 'fr': 'fr_FR',
             'it': 'it_IT', 'zh': 'zh_CN', 'ko': 'ko_KR', 'ar': 'ar_QA', 'uz': 'uz_UZ'}
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TPL = open(os.path.join(ROOT, '_src', 'template.html'), encoding='utf-8').read()


def head_tags(lang, d, canonical_path):
    title = f"Megaf Group — {d['h1']}"
    desc = d['hsub'] + ' ' + ' · '.join(x[1] for x in d['svc'])
    url = SITE + canonical_path
    t = [f'<title>{html.escape(title)}</title>',
         f'<meta name="description" content="{html.escape(desc[:300])}">',
         f'<link rel="canonical" href="{url}">']
    for l in LANGS:
        t.append(f'<link rel="alternate" hreflang="{l}" href="{SITE}/{l}/">')
    t.append(f'<link rel="alternate" hreflang="x-default" href="{SITE}/">')
    t += [f'<meta property="og:type" content="website">',
          f'<meta property="og:site_name" content="Megaf Group">',
          f'<meta property="og:title" content="{html.escape(title)}">',
          f'<meta property="og:description" content="{html.escape(d["hsub"])}">',
          f'<meta property="og:url" content="{url}">',
          f'<meta property="og:image" content="{SITE}/img/hero.jpg">',
          f'<meta property="og:locale" content="{OG_LOCALE[lang]}">',
          '<meta name="twitter:card" content="summary_large_image">']
    org = {
        "@context": "https://schema.org", "@type": "GeneralContractor",
        "name": "Megaf Group", "legalName": "ТОО «Megaf Group»", "url": SITE + "/",
        "image": SITE + "/img/hero.jpg", "logo": SITE + "/img/hero.jpg",
        "description": d['hsub'], "telephone": "+77018655101", "email": "Megaf.Group@gmail.com",
        "founder": {"@type": "Person", "name": "Mehmet Şahin"},
        "address": {"@type": "PostalAddress", "addressLocality": "Shymkent", "addressCountry": "KZ"},
        "areaServed": ["Kazakhstan", "Central Asia", "Middle East", "Worldwide"],
        "knowsAbout": [x[1] for x in d['svc']],
        "inLanguage": lang,
    }
    t.append('<script type="application/ld+json">' + json.dumps(org, ensure_ascii=False) + '</script>')
    return '\n'.join(t)


def main():
    pages = {}
    with sync_playwright() as p:
        b = p.chromium.launch()
        for lang in LANGS:
            src = TPL.replace('<html lang="en">', f'<html lang="en" data-page="{lang}">', 1)
            with tempfile.NamedTemporaryFile('w', suffix='.html', delete=False, encoding='utf-8') as f:
                f.write(src); tmp = f.name
            pg = b.new_page(viewport={'width': 1280, 'height': 900})
            errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto('file://' + tmp); pg.wait_for_timeout(600)
            if errs: raise SystemExit(f'{lang}: {errs}')
            d = pg.evaluate("(l)=>window.__T[l]", lang)
            out = pg.evaluate("'<!DOCTYPE html>\\n'+document.documentElement.outerHTML")
            pg.close(); os.unlink(tmp)
            pages[lang] = (out, d)
        b.close()
    for lang, (out, d) in pages.items():
        out = re.sub(r'<title>.*?</title>', lambda m: head_tags(lang, d, f'/{lang}/'), out, count=1, flags=re.S)
        os.makedirs(os.path.join(ROOT, lang), exist_ok=True)
        open(os.path.join(ROOT, lang, 'index.html'), 'w', encoding='utf-8').write(out)
    # root: English content for crawlers, visitors are sent to their language page by the script
    out, d = pages['en']
    out = out.replace(' data-page="en"', '', 1)
    out = re.sub(r'<title>.*?</title>', lambda m: head_tags('en', d, '/en/'), out, count=1, flags=re.S)
    open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf-8').write(out)
    # sitemap with language alternates
    alts = ''.join(f'<xhtml:link rel="alternate" hreflang="{l}" href="{SITE}/{l}/"/>' for l in LANGS)
    urls = ''.join(f'<url><loc>{SITE}/{l}/</loc>{alts}<xhtml:link rel="alternate" hreflang="x-default" href="{SITE}/"/></url>\n' for l in LANGS)
    open(os.path.join(ROOT, 'sitemap.xml'), 'w', encoding='utf-8').write(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + urls + '</urlset>\n')
    open(os.path.join(ROOT, 'robots.txt'), 'w').write(f'User-agent: *\nAllow: /\nDisallow: /_src/\n\nSitemap: {SITE}/sitemap.xml\n')
    print('built', ', '.join(LANGS))


if __name__ == '__main__':
    main()
