TEKNISI TOOLS INDONESIA — V1.6 INDEX BOOST

LIVE BASE URL
https://teknisi-tools-indonesia.pages.dev/

STATUS BEFORE THIS RELEASE
- Homepage confirmed by Google Search Console as Submitted and indexed.
- Priority inner pages were still reported as URL is unknown to Google when checked on 2026-10-06.
- sitemap.xml had 0 warnings and 0 errors, but was still pending at that check.

WHAT'S NEW
- Visible breadcrumbs on tool, article and core pages.
- BreadcrumbList structured data added to all 10 calculator pages and core pages.
- Meta descriptions added to calculator and core pages that previously relied only on Open Graph descriptions.
- Related-calculation clusters added to every calculator page.
- Related-guide clusters added to all 7 engineering articles.
- Stronger internal linking between Tools ↔ Knowledge ↔ related calculations.
- Homepage Popular Technical Paths section creates direct crawl paths to priority tool/article pairs.
- New HTML sitemap at /pages/sitemap.html as an additional crawl/navigation hub.
- XML sitemap expanded from 26 to 27 public URLs.
- Google verification file preserved.
- Cloudflare/analytics integration preserved.
- V1.5.1 network-first navigation fix preserved.
- Service worker cache bumped to tti-v16-indexboost.

IMPORTANT
Do not delete google8bd1361f6dbe3d51.html while the Search Console URL-prefix property is in use.

DEPLOY OVER CURRENT LOCAL GIT REPO
1. Put Teknisi-Tools-Indonesia-V1.6-Index-Boost.zip in /sdcard/Download
2. cd /sdcard/Download
3. unzip -o Teknisi-Tools-Indonesia-V1.6-Index-Boost.zip
4. cd teknisi-tools-v1.3.1-mobile-fix
5. git status
6. git add .
7. git commit -m "V1.6 Index Boost"
8. git push

POST DEPLOY CHECK
- /
- /pages/tools.html
- /pages/artikel.html
- /pages/sitemap.html
- /tools/watt-ampere.html
- /articles/cara-menghitung-watt-ke-ampere.html
- /sitemap.xml
- /google8bd1361f6dbe3d51.html

AFTER DEPLOY
Re-submit the existing sitemap in Search Console so Google is prompted to refetch the updated 27-URL sitemap. Do not repeatedly request manual indexing for the same URL.


========================================================
V1.7 CUSTOM ANALYTICS + DASHBOARD STATISTIK
========================================================
Frontend event tracker: /assets/events.js
Event API:             /api/event
Stats API:             /api/stats
Dashboard:             /pages/statistik.html
Backend:               Cloudflare Pages Functions + D1
Required D1 binding:   ANALYTICS_DB

PRIVACY:
Custom analytics DOES NOT send calculator input values or calculation results.
It records only event type, page path, short page label, timestamp, and a
random temporary session ID. Cloudflare Web Analytics can continue running
alongside this custom analytics.

CLOUDFLARE SETUP AFTER GIT DEPLOY:
1. Cloudflare Dashboard -> Workers & Pages -> teknisi-tools-indonesia.
2. Create a D1 database, suggested name: teknisi-tools-analytics.
3. In the Pages project Settings/Bindings, add a D1 binding.
4. Variable/binding name MUST be: ANALYTICS_DB
5. Select the D1 database created in step 2 and save.
6. Trigger a new deployment if Cloudflare asks for one.
7. Open https://teknisi-tools-indonesia.pages.dev/pages/statistik.html
8. The first API request automatically creates the required D1 table/indexes.
No SQL paste is required.

If dashboard shows "Database belum terhubung", the code is already deployed;
only the ANALYTICS_DB D1 binding is still missing or not active on production.
