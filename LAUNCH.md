# Launch checklist (not yet done)

Nothing here has been applied. Each step needs approval.

## 1. Publish the redesign on GitHub Pages
1. Push the `redesign` branch and open a pull request into `main`.
2. Review the pull request, then merge. GitHub Pages redeploys from `main` within a few minutes.
3. Check https://ilanin7-ui.github.io/lantern-hunt-site/ and each page.

## 2. Custom domain: lanternhunt.org (after purchase)
1. Register lanternhunt.org (Porkbun or Cloudflare Registrar; about $8–12 first year, about $12/yr renewal).
2. Verify the domain in GitHub: Settings → Pages → "Verified domains" (account level), to prevent takeover.
3. At the DNS provider, add:
   - `A` records for `@`: 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153
   - `AAAA` records for `@`: 2606:50c0:8000::153, 2606:50c0:8001::153, 2606:50c0:8002::153, 2606:50c0:8003::153
   - `CNAME` for `www` → `ilanin7-ui.github.io`
   - No wildcard records.
4. In the repo: Settings → Pages → Custom domain → `lanternhunt.org` → Save. (This creates a `CNAME` file containing `lanternhunt.org`.)
5. In `tools/build.py`, set `SITE_URL = "https://lanternhunt.org/"`, run `python3 tools/build.py`, commit.
6. After the certificate is issued (up to 24 hours), tick "Enforce HTTPS".
7. Check: `dig lanternhunt.org +noall +answer -t A`, then load https://lanternhunt.org and https://www.lanternhunt.org.

## 3. Contact email: partners@lanternhunt.org (needs the domain first)
Every page of the site already shows partners@lanternhunt.org (Support, Partners, Privacy Policy, footer). Mail to it will bounce until this is done, so finish it before the site goes live.
1. Set up free email forwarding for partners@lanternhunt.org to your personal inbox (Cloudflare Email Routing or the registrar's free forwarding). If you want to send replies from that address, that is a separate setup (Gmail "Send mail as" with an SMTP service); confirm cost before choosing one.
2. Send a test message from an outside account to partners@lanternhunt.org and confirm it arrives.
3. The address is set in `tools/build.py` (`CONTACT`, and `PARTNERS_EMAIL = CONTACT`). Change it there and run `python3 tools/build.py` if it ever needs to change.

## 4. After launch
- Update the App Store listing's Support URL and Privacy Policy URL if they point to the github.io address (the old URLs will redirect once the custom domain is set).
