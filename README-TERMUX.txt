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
