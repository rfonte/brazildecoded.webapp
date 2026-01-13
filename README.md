# brazildecoded.webapp

![Deploy Eleventy to GitHub Pages](https://github.com/rfonte/brazildecoded.webapp/actions/workflows/pages.yml/badge.svg)

Static site for BrazilDecoded, built with Eleventy. This repo includes templates, styles, and scripts for the lead capture prototype and support pages.

**Project overview**

- **Scope:** static site with email lead capture, support form, and local admin page (localStorage prototype).
- **Strengths:** clear Eleventy structure, modern CSS, accessibility basics (skip link, focus states, ARIA).
- **Current limits:** data persistence is local; external integrations (Make/Mailchimp/backend) require setup.

**Structure**

- `src/index.njk` - home page
- `src/pages/cadastro.njk` - starter kit form (lead capture)
- `src/pages/contato.njk` - support form (localStorage prototype)
- `src/pages/leads.njk` - admin page to view/export leads
- `src/pages/thank-you.njk` - confirmation page
- `src/pages/contato-sucesso.njk` - starter kit success page
- `src/_includes/layout.njk` - shared layout + script include
- `src/assets/` - source CSS and JS
- `src/CNAME` - custom domain for GitHub Pages
- `dist/` - build output (not committed)

**Local development**

```powershell
npm install
npm run serve
```

Open `http://localhost:8080/`.

Structured-data (JSON-LD) check

After running a build, you can validate the generated JSON-LD blocks with the local checker:

```powershell
# build the site to `dist/`
npm run build
# run the structured-data report (or `node tools/structured-data-report.js`)
npm run sd:report
```

**Build**

```powershell
npm run build
```

**Tests**

- Unit (Vitest):

```powershell
npm run test:unit
```

- Unit with coverage:

```powershell
npm run test:unit:coverage
```

- E2E (Playwright):

```powershell
npm run test:e2e
```

**Lint**

```powershell
npm run lint
```

**Formatting**

```powershell
npm run format
```

**Forms and lead flow**

- Starter kit form uses `data-make-url` to post to Make (webhook).
- Local admin page: `http://localhost:8080/pages/leads.html`.

**Sensitive configuration (webhook, consent, privacy)**

- `data-make-url` in `src/pages/cadastro.njk` is a sensitive webhook endpoint. Keep it out of public docs and rotate it if exposed.
- Consent checkbox (`#consent`) must remain required before any webhook submission.
- Do not store or transmit personal data without consent, and keep privacy messaging aligned with local regulations.

**Make webhook setup**

- Create a scenario with a **Custom webhook** trigger.
- Copy the webhook URL into `data-make-url` in `src/pages/cadastro.njk`.
- Activate the scenario (Run once to test, then switch ON).
- Add downstream modules (Google Sheets, Mailchimp, email, etc.).

**Privacy and consent**

- Starter kit form requires explicit consent. Do not store or send data without consent.

**Deploy**

- GitHub Pages via GitHub Actions, publishing `dist/`.

**GitHub Pages caching (Cloudflare)**

GitHub Pages ignores `_headers`, so you need a CDN like Cloudflare if you want custom cache headers:

- Add the custom domain in Cloudflare and set DNS to "proxied" (orange cloud).
- Set cache rules:
  - `*/*` -> Cache HTML with "Bypass cache" or short TTL.
  - `/assets/*` and `/images/*` -> Cache Everything, Edge TTL 1 year.
- Keep cache busting with `site.buildVersion` for CSS/JS.
