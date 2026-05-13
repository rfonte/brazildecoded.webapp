SEO: Keyword Mapping

Goal: improve organic ranking and conversion with a focus on eBook sales and lead capture.

## Domain Verification

The site includes domain verification meta tags for:
- **Google Search Console:** `<meta name="google-site-verification" content="GwKXjSPv8jfDW6ujzzrmT-BbY9cuDHVS0rD-N88WvcM" />`
- **Pinterest:** `<meta name="p:domain_verify" content="699071a59134c23320fa27296e5d386b" />`

These tags are managed in `src/_includes/layout.njk` and included on all pages via the base layout.

**Updating Pinterest verification token:**
1. If the token changes, update the `content` attribute in `src/_includes/layout.njk` (line 9)
2. Update this documentation with the new token value
3. Rebuild and deploy the site

1) Primary keywords per page

- Home (`/index.html`)
  - Primary: "Brazil travel guide", "travel to Brazil guide", "Brazil travel tips"
  - Secondary: "Brazil itineraries", "Brazil safety tips", "things to do in Brazil"
  - Suggested meta title: "BrazilDecoded - Brazil Travel Guide | Tips, Safety, Itineraries"
  - Suggested meta description: "Practical Brazil travel guide with safety tips, transportation advice, must-see places, and itineraries. Buy the eBook or download the free Starter Kit."

- Starter Kit (`/free-starter-kit/`)
  - Primary: "Brazil starter kit", "free Brazil travel kit", "Brazil travel checklist"
  - Secondary: "free travel guide Brazil", "Brazil travel PDF"
  - Title: "BrazilDecoded - Free Brazil Starter Kit"
  - Description: "Get the BrazilDecoded starter kit by email with safety tips, etiquette guidance, and a travel checklist."

- Checkout / sales page (Hotmart/Gumroad)
  - Primary: "buy Brazil travel guide", "Brazil travel guide ebook", "Brazil guide book"
  - Use product pages with `Product` schema plus price and availability.

- Contact (`/pages/contato.html`)
  - Primary: "BrazilDecoded contact", "Brazil travel guide support", "Brazil travel guide partnerships"
  - Description: "Contact BrazilDecoded for partnerships, customer support, or questions about the travel guide."

- Thank-you (noindex)
  - Title: "Thank you - Request received | BrazilDecoded"

2) Changes applied in this update

- Titles and descriptions standardized to English for: `index.njk`, `free-starter-kit.njk`, `contact.njk`, `thank-you.njk`.
- `free-starter-kit.njk` includes `Product` JSON-LD for rich results.
- `src/_data/site.json` updated with English description and nav labels.
- `src/_includes/layout.njk` provides WebSite and Organization JSON-LD plus OG/Twitter defaults.
- `src/sitemap.xml.njk` includes changefreq and priority metadata.

3) Recommended next steps

- Map long-tail keywords by section (example: "7 day Brazil itinerary Rio and Salvador").
- Create optimized content pages (blog/guides) to capture organic traffic.
- Implement `hreflang` if you add multilingual content.
- Submit the sitemap in Google Search Console and test pages with Rich Results.
- Monitor traffic and conversions with GA4 and iterate on copy and layout.

4) Monitoring and metrics

- Starter kit form conversion rate, sales page views, organic CTR.
- Recommended tools: Google Search Console, Google Analytics (GA4), Hotjar, Ahrefs or SEMrush.

If you want, I can add hreflang, title variants for A/B testing, or draft the first optimized content page (example: "7 Day Brazil Itinerary: The Essentials").
