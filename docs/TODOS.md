# Technical improvements
- Consolidate scripts (remove legacy JS and keep one form/webhook flow).
- Add more languages
- Add webhook contract tests (payload validation and mock responses).
- Ajustar a execução do deploy barrando com gates de qualdiade
- Integrate real email delivery (Resend/SendGrid) for /api/auth/forgot-password
  in backend-server.js — it currently only logs the request.
- Generate a SONAR_TOKEN at https://sonarcloud.io/account/security/ and add it
  as a repo secret (`gh secret set SONAR_TOKEN`) — it's missing entirely, so
  the sonarcloud.yml workflow fails on every push and Sonar never re-scans.
- Once SONAR_TOKEN is restored, re-check tests/unit/script.test.mjs's
  duplicated-lines finding with real Sonar data (couldn't get exact
  duplicate ranges without the token; likely a New Code baseline reset from
  the 1.1.1 release rather than new duplication).
- Mark the ci.yml `test` job's plain `npm ci` (no --ignore-scripts) as Safe
  in SonarCloud once access is restored — that job runs Playwright e2e
  tests and genuinely needs the postinstall browser install.

# Business and product improvements

- criar logo do instagram e do pinterest e do linktree na home
- Thank-you page with a clear upsell and CTA to buy.
- Email sequence (welcome + tips + offer) via Make.
- Segmented lead magnets (first-time visitors, families, nomads).
- Social proof (testimonials, ratings, reader count).
- "What you get" section with preview (summary + sample pages).
- Light urgency (limited bonus, temporary price).
- FAQ focused on purchase objections.
- Quick feedback prompt after download.
- Linktree with UTM and a primary CTA.
- Social follow CTA after submission.

# Competitive study (generic model)

## Competitor types

- Travel ebooks and digital guides for Brazil.
- Blogs and travel content sites.
- Tour agencies and package sellers.
- Creators selling guides on YouTube/Instagram.
- Community-based products (paid newsletters or groups).

## Comparison dimensions

- Value proposition (safety, culture, itinerary, savings).
- Product format (ebook, video, community, consulting).
- Price and guarantee (refund, bonus, trial).
- Social proof (reviews, testimonials, metrics).
- Purchase experience (checkout, onboarding, access time).
- Distribution (SEO, Instagram, YouTube, affiliates, ads).
- Free content (lead magnet, checklist, mini course).
- Differentiation (local expertise, updates, support).

## Common competitor patterns (hypotheses)

- Generic itineraries and surface-level tips.
- Little focus on safety and etiquette.
- Long PDFs that are hard to act on.
- Weak personalization or segmentation.

## Differentiation opportunities

- Positioning: practical + safety + local culture.
- Short, actionable delivery (checklists, quick tips).
- Bonus: scams checklist + etiquette cheatsheet.
- Strong author credibility (Brazilian local).
- Clear guarantee and low price to reduce risk.

# Priority roadmap (impact vs effort)

## High impact, low effort

- Sharpen copy for benefit clarity.
- Add basic social proof (3 testimonials).
- Use one primary CTA per section.
- Clear lead magnet promise + instant delivery.

## High impact, medium effort

- Email sequence automation.
- Time-limited bonus.
- Thank-you page upsell.

## High impact, high effort

- Community or support channel.
- Video mini-course.
- Partnerships and affiliates with UTM tracking.
