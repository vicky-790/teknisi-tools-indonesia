TEKNISI TOOLS INDONESIA — V1.5 CONTENT GROWTH

LIVE BASE URL
https://teknisi-tools-indonesia.pages.dev/

WHAT'S NEW
- 7 original SEO knowledge guides (Electrical, MCB, cable, voltage drop, energy, HVAC, 3 phase)
- Internal links from 7 calculators to the relevant guide
- Homepage knowledge section + upgraded Knowledge index
- Article + Breadcrumb structured data
- Sitemap expanded to 26 public URLs with lastmod 2026-10-06
- Google Search Console verification file preserved
- Analytics-ready loader added (disabled by default until an ID/token is configured)
- Service worker cache bumped to tti-v15

IMPORTANT
Do not delete google8bd1361f6dbe3d51.html while the Search Console URL-prefix property is in use.

ANALYTICS
assets/analytics.js contains two empty values:
  ga4MeasurementId: ''
  cloudflareToken: ''
Leave them empty if you do not want analytics yet. Search Console will still report Google search performance after data becomes available.

DEPLOY OVER CURRENT LOCAL GIT REPO
1. Put this ZIP in /sdcard/Download
2. cd /sdcard/Download
3. unzip -o Teknisi-Tools-Indonesia-V1.5-Content-Growth.zip
4. cd teknisi-tools-v1.3.1-mobile-fix
5. git status
6. git add .
7. git commit -m "V1.5 Content Growth"
8. git push

Cloudflare Pages should auto-deploy from GitHub main.

POST DEPLOY CHECK
- /
- /pages/artikel.html
- /articles/cara-menghitung-watt-ke-ampere.html
- /sitemap.xml
- /google8bd1361f6dbe3d51.html

SEO NOTE
Do not repeatedly request indexing for every URL. Keep the sitemap submitted in Search Console and prioritize homepage + strongest pages when manual request quota is available.


V1.5.1 Navigation Fix
- Fix ERR_FAILED saat membuka Tools/Knowledge akibat service-worker navigation handling.
- HTML navigation sekarang network-first dengan cache fallback.
- sw.js dipaksa no-cache agar update cepat.
- Analytics V1.5 tetap dipertahankan.
