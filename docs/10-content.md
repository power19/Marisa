# 10 — Content Pages & i18n

> Read this before building any static content page, writing i18n message files,
> or adding any user-facing string to the codebase.

---

## Locales

Two locales are supported. Default is `en`.

| Code | Language | Status |
|---|---|---|
| `en` | English | Required — all strings must have an `en` value |
| `nl` | Dutch | Required at launch |

**Never invent copy for `nl`.** Leave the value as an empty string `""` or omit
the key — the i18n library will fall back to `en`. Do not use machine translation.

---

## i18n message files

Message files live in `web/messages/{locale}.json`. Structure them by page/component:

```json
{
  "nav": {
    "buy": "Buy",
    "rent": "Rent",
    "about": "About",
    "contact": "Contact"
  },
  "home": {
    "hero_title": "Find Your Property in Suriname",
    "hero_subtitle": "...",
    "search_cta": "Search"
  },
  "listing": {
    "price_on_request": "Price upon Request",
    "bedrooms": "{count} Bedrooms",
    "bathrooms": "{count} Bathrooms"
  },
  "contact": {
    "inquiry_form_title": "Send an Inquiry",
    "submit": "Send Message"
  }
}
```

Rules:
- Keys are `snake_case`.
- Nested by page/component, not flat.
- Pluralization: use `{count}` tokens; implement via the i18n library's plural rules.
- Never put a hardcoded English string in a `.tsx` file — it must come from the message file.
- Brand name: use `Far East Property Management` in message files. Short form `Far East` where space is limited.

---

## Content pages

These pages are required at launch (M6). Each must be localized and have a real slug.

| Route | Page | Content source |
|---|---|---|
| `/` | Home | Dynamic (Directus listings) + static hero copy |
| `/search` | Search & Results | Dynamic (Directus listings) |
| `/listings/[slug]` | Listing Detail | Dynamic (Directus) |
| `/about` | About / Team | Static copy + dynamic agent list (Directus) |
| `/buying` | Buying Guide | Static copy |
| `/selling` | Selling Guide | Static copy |
| `/renting` | Renting Guide | Static copy |
| `/expat` | Expat Homes | Static copy + filtered listings (expat type) |
| `/contact` | Contact | Static copy + inquiry form |
| `/privacy` | Privacy Policy | Static copy — **required before accounts go live** |
| `/account` | Visitor Account | Dynamic (saved searches) |

### Placeholder copy convention
Until real copy is supplied, use descriptive placeholders — not Lorem Ipsum:

```tsx
// Good
<p>{t('buying.intro') || '[Buying guide introduction — copy TBD]'}</p>

// Bad
<p>Lorem ipsum dolor sit amet...</p>
```

---

## Home page sections

Mirror the reference site (`kwsuriname.com`) structure:

1. **Hero** — full-width image/video, search widget overlay (offer type, property type,
   district, keyword, price range).
2. **New Listings** — grid of newest `available` listings (SSR, 6–8 cards).
3. **Featured Listings** — grid where `featured = true` (SSR).
4. **For Sale** — grid filtered to `offer_type = sale` (SSR).
5. **For Rent** — grid filtered to `offer_type = rent` (SSR).
6. **Your Journey** — three CTAs: Buying, Selling, Renting (static, links to guide pages).
7. **Meet the Team** — agent cards pulled from Directus (`approved = true`).
8. **Contact footer** — address, email, phone, WhatsApp, social links.

Contact details (address, phone, WhatsApp, socials) are **business decisions TBD**.
Use `{{CONTACT_ADDRESS}}`, `{{CONTACT_PHONE}}`, `{{WHATSAPP_NUMBER}}` tokens as placeholders.

---

## SEO requirements (per page)

Every page must have:
- `<title>` — include `Far East Property Management` and a page-specific descriptor.
- `<meta name="description">` — unique per page, localized.
- `<link rel="canonical">` — canonical URL with locale prefix.
- `<link rel="alternate" hreflang="...">` — for all three locales.

Listing detail page additionally:
- `schema.org/RealEstateListing` JSON-LD structured data.
- Open Graph tags (`og:title`, `og:description`, `og:image` — primary listing photo).

Search/results page:
- Must be **server-rendered** (not client-side filtered) so search engines can index
  filtered result pages via query params.
- `<meta name="robots" content="noindex">` on paginated pages beyond page 1 (optional, confirm).

---

## Footer content tokens

Use these tokens in code until business decisions are made:

| Token | Meaning |
|---|---|
| `Far East Property Management` | Agency full name (use `Far East` short form where space is limited) |
| `{{CONTACT_ADDRESS}}` | Physical office address |
| `{{CONTACT_PHONE}}` | Main phone number |
| `{{WHATSAPP_NUMBER}}` | WhatsApp business number (international format) |
| `{{CONTACT_EMAIL}}` | General contact email |
| `{{CENTRAL_INBOX_EMAIL}}` | Inquiry routing email (may differ from contact) |
| `{{DOMAIN}}` | The .com domain |

---

## Privacy policy

The privacy policy page is **required before any of the following go live:**
- Visitor account registration
- Saved searches / email alerts
- Inquiry forms (collecting name, email, phone)

Minimum required disclosures:
- What data is collected and why.
- How inquiry and account data is stored and used.
- That saved-search emails include an unsubscribe link.
- Contact details for data requests.

This is a legal document — provide a placeholder structure but flag clearly that it needs
review by someone with knowledge of Suriname / applicable privacy law before launch.
