TEKNISI TOOLS INDONESIA — V1.7.2 DUAL GEO ANALYTICS

LIVE BASE URL
https://teknisi-tools-indonesia.pages.dev/

WHAT'S NEW
- Keeps V1.7.1 anonymous usage analytics, device/source/landing intelligence.
- Network-based geolocation from Cloudflare request metadata:
  country, region, city, latitude, longitude, timezone when available.
- Network coordinates are rounded and are APPROXIMATE, not GPS.
- Optional precise browser GPS:
  * never requested automatically before a clear in-site consent action
  * visitor must tap “Izinkan GPS”, then approve the browser permission prompt
  * latitude / longitude / accuracy are stored only after approval
  * calculator still works normally when GPS is refused
  * GPS fields older than 7 days are cleared on the next analytics API activity
- Private map in /pages/statistik.html:
  * approximate network points
  * precise GPS opt-in points
  * exact coordinates are NOT exposed by the public stats API
  * Geo View requires a Cloudflare secret named STATS_TOKEN
- Privacy page includes location disclosure and a reset-preference control.

PRIVACY DESIGN
- NO raw IP stored by the custom analytics database.
- NO name, email, phone, account identity, calculator inputs/results.
- NO full referrer URL/query string.
- Search queries from Google remain aggregate-only in Google Search Console.
- Precise GPS requires explicit permission and uses short retention: GPS fields older than 7 days are purged on subsequent analytics activity.
- Network/IP geolocation can be inaccurate due to ISP/mobile network/VPN.

BACKEND
Cloudflare Pages Functions + D1
Required D1 binding: ANALYTICS_DB
Required private dashboard secret: STATS_TOKEN

D1 SETUP — ONLY IF ANALYTICS_DB IS NOT ALREADY CONNECTED
1. Cloudflare Dashboard -> Workers & Pages -> teknisi-tools-indonesia.
2. Create a D1 database, for example: teknisi-tools-analytics.
3. Project -> Settings -> Bindings -> Add -> D1 database binding.
4. Variable name MUST be: ANALYTICS_DB
5. Select the database and save.
6. Redeploy after adding the binding.
7. The first API request auto-creates/auto-migrates the schema.

IF V1.7 / V1.7.1 D1 IS ALREADY CONNECTED
DO NOT create a second database. Keep ANALYTICS_DB. V1.7.2 automatically
adds approx_lat, approx_lon, gps_lat, gps_lon, gps_accuracy and gps_permission.
Existing rows stay valid; old rows simply have empty coordinate fields.

CREATE PRIVATE GEO DASHBOARD TOKEN
1. Project -> Settings -> Variables and Secrets -> Add.
2. Name: STATS_TOKEN
3. Set it as a secret with a strong random value (recommended 32+ random chars).
4. Save and redeploy if Cloudflare asks.
5. DO NOT put this token in GitHub/source and DO NOT send it in chat/screenshots.
6. Open /pages/statistik.html and enter the token in “Private Geo View”.
   The browser keeps it only in sessionStorage for the current tab/session.

GENERATE A RANDOM TOKEN IN TERMUX (OPTIONAL)
python -c "import secrets; print(secrets.token_urlsafe(32))"

DEPLOY OVER CURRENT LOCAL GIT REPO
1. Put Teknisi-Tools-Indonesia-V1.7.2-Dual-Geo-Analytics.zip in /sdcard/Download
2. cd /sdcard/Download
3. unzip -o Teknisi-Tools-Indonesia-V1.7.2-Dual-Geo-Analytics.zip
4. cd teknisi-tools-v1.3.1-mobile-fix
5. git add .
6. git commit -m "V1.7.2 Dual Geo Analytics"
7. git push

TEST AFTER CLOUDFLARE DEPLOY
A. Public analytics:
   https://teknisi-tools-indonesia.pages.dev/pages/statistik.html
B. Open the homepage in a normal browser. The optional location panel appears.
C. Tap “Izinkan GPS” only for a test device you control; accept browser permission.
D. Return to Statistics -> Private Geo View -> enter STATS_TOKEN.
E. The map should show:
   - rounded Network location points
   - Precise GPS opt-in point with accuracy when consent was granted

IMPORTANT
- GPS only works in secure contexts (the Pages HTTPS domain is secure).
- Browser/OS permission settings can still block location.
- Do not interpret Cloudflare network coordinates as a home address.
- Do not claim Google keyword data belongs to a specific visitor; Search Console
  intentionally reports organic queries in aggregate.


=== V1.8 SEO GROWTH + MONETIZATION READY ===
- 6 artikel long-tail baru (total 13 guide)
- Knowledge live search + RSS feed
- Editorial/methodology + monetization disclosure
- monetization-config.js + monetization.js: ads/affiliate OFF by default
- ads.txt placeholder only; replace with exact line from AdSense after account approval
- Never invent/fake ca-pub ID or ad slot ID.
- Custom Analytics/D1/Persistent Admin preserved.

ADSense AFTER APPROVAL:
1) Edit assets/monetization-config.js
2) Set adsenseClient to your real ca-pub-XXXXXXXXXXXXXXXX
3) Set real numeric slot IDs copied from AdSense
4) Replace ads.txt example/comment with the exact authorized-seller line from AdSense
5) Redeploy and verify ads.txt at /ads.txt
6) Update Privacy/consent behavior if your actual ad configuration requires it.

Affiliate:
- Set affiliate.enabled=true and only fill URLs from your real partner account.
- Links are automatically rel=sponsored nofollow noopener.

Recommended before AdSense review: use a custom domain, keep adding original content, and wait for real organic traffic. Site approval is never guaranteed.
