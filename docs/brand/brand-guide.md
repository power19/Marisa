# Brand Guide — Far East Property Management

**Brand name:** Far East Property Management
**Short name:** Far East (used in nav, logo lockup, page titles)
**Tagline:** Property Management (as shown in logo)

Replace all `{{BRAND_NAME}}` tokens in code and copy with `Far East Property Management`
or `Far East` depending on context (see usage rules below).

---

## Logo

- **Primary logo:** circular emblem with residential + commercial buildings in red & charcoal,
  "FAR EAST" in bold geometric sans-serif, "PROPERTY MANAGEMENT" in light sans-serif below.
- **Logo file:** `web/public/brand/logo.png` (place the logo file here)
- **Favicon:** `web/public/favicon.ico` (extract from logo)
- **Logo on dark backgrounds:** use the white variant if available; otherwise place on
  a charcoal or black background.
- **Minimum size:** never render the logo below 120px wide — the building detail becomes
  illegible.
- **Clear space:** maintain at least the height of the "F" in FAR EAST as clear space
  around all sides of the logo.
- **Never:** recolor the logo, stretch it, add drop shadows, or place it on a busy background.

### Name usage
| Context | Use |
|---|---|
| Browser `<title>` | `Far East Property Management` |
| Navbar / logo lockup | `FAR EAST` (logo handles the full name) |
| Email subject lines | `Far East Property Management` |
| Short references in body copy | `Far East` |
| Footer copyright | `© {year} Far East Property Management` |

---

## Color palette

Matched directly from the logo artwork.

| Name | Hex | RGB | Usage |
|---|---|---|---|
| **Brand Red** | `#CC1010` | 204, 16, 16 | Primary brand color. CTAs, accents, active states, logo red elements. |
| **Brand Red Dark** | `#A50D0D` | 165, 13, 13 | Hover state for red elements. |
| **Brand Red Light** | `#E01414` | 224, 20, 20 | Subtle accent variant, badge highlights. |
| **Charcoal** | `#2B2B2B` | 43, 43, 43 | Logo dark elements, primary text, navbar. Matches logo charcoal. |
| **Dark** | `#1A1A1A` | 26, 26, 26 | Footer backgrounds, deep surfaces. |
| **Off-white** | `#F8F6F3` | 248, 246, 243 | Page background. Warm white — not pure #FFF. |
| **White** | `#FFFFFF` | 255, 255, 255 | Cards, overlays, text on dark backgrounds. |
| **Grey Light** | `#E8E4E0` | 232, 228, 224 | Borders, dividers. |
| **Grey Medium** | `#9E9A96` | 158, 154, 150 | Secondary text, placeholders, captions. |

### Color usage rules
- **Brand Red** is for action and emphasis — CTAs, active nav, status badges, accents.
- **Charcoal** is the primary structural color — navbar, headings, footer, body text.
- **Off-white** is the default page background — never pure white as the page BG.
- Never place Brand Red text on a red background.
- White space is a design element — use it generously between sections.
- No gradients. No colors outside this palette.

---

## Typography

### Fonts
| Role | Font | Weight | Source |
|---|---|---|---|
| Display / Hero headlines | **Cormorant Garamond** | 300, 400, 600 | Google Fonts |
| Section headings (H2–H3) | **Cormorant Garamond** | 400, 600 | Google Fonts |
| Body text, UI, labels | **Inter** | 300, 400, 500, 600 | Google Fonts |
| Price display | **Cormorant Garamond** | 300 | Google Fonts |
| Buttons, navigation, tags | **Inter** | 500, 600 | Google Fonts |

> The logo uses its own geometric sans-serif ("FAR EAST"). This is logo-only —
> do not replicate this font in the web UI. The website uses Cormorant + Inter.

### Type scale
| Element | Font | Size | Weight | Line height |
|---|---|---|---|---|
| Hero headline | Cormorant Garamond | 4.5rem (72px) | 300 | 1.1 |
| H1 | Cormorant Garamond | 3rem (48px) | 400 | 1.15 |
| H2 | Cormorant Garamond | 2.25rem (36px) | 400 | 1.2 |
| H3 | Cormorant Garamond | 1.5rem (24px) | 600 | 1.25 |
| Body large | Inter | 1.125rem (18px) | 400 | 1.7 |
| Body | Inter | 1rem (16px) | 400 | 1.7 |
| Small / caption | Inter | 0.875rem (14px) | 400 | 1.5 |
| Label / tag | Inter | 0.75rem (12px) | 600 | 1.4 |
| Price | Cormorant Garamond | 2rem (32px) | 300 | 1.2 |
| Navigation | Inter | 0.9375rem (15px) | 500 | — |

### Typography rules
- Headlines: Cormorant Garamond with generous letter-spacing.
- Never use Cormorant Garamond below 18px.
- Body text: always Inter. Never Cormorant for long-form reading.
- Prices: always Cormorant Garamond — deliberate premium signal.
- All-caps only for labels/tags in Inter, never in Cormorant.

---

## Spacing & layout

- Base unit: `8px`.
- Generous section padding — minimum `48px` top/bottom on desktop.
- Max content width: `1280px` centered.
- Listing grid: 3 columns desktop, 2 tablet, 1 mobile.

---

## Component visual identity

### Buttons
- **Primary:** Brand Red `#CC1010` background, white Inter text, `border-radius: 2px`.
  Hover: Brand Red Dark `#A50D0D`.
- **Secondary:** Charcoal `#2B2B2B` background, white text. Hover: `#1A1A1A`.
- **Ghost:** Transparent, `1px` Brand Red border, Brand Red text. Hover: fill red.
- No pill/rounded buttons. Sharp or `2px` radius only.

### Cards
- White background, `1px` grey-light border.
- Shadow: `0 2px 12px rgba(0,0,0,0.06)`. Hover: deeper shadow + `translateY(-2px)`.
- Status badge: Brand Red for `new`, Charcoal for `sold`/`rented`, Grey for others.
- Price in Cormorant Garamond, address in Inter.

### Navigation
- Charcoal/black background, white Inter text.
- Brand Red underline or dot on active/hover links.
- Logo left, nav links center/right, CTA button (red) far right.

### Footer
- Dark `#1A1A1A` background, white Inter text.
- Brand Red for section headings and hover links.

### Status badges
| Status | Background | Text |
|---|---|---|
| New | Brand Red `#CC1010` | White |
| Available | Charcoal `#2B2B2B` | White |
| Reduced | Brand Red Light `#E01414` | White |
| Under Contract | Grey Medium `#9E9A96` | White |
| Sold | Dark `#1A1A1A` | Grey Light |
| Rented | Dark `#1A1A1A` | Grey Light |

---

## Imagery

- Architectural photography: clean, well-lit, professional.
- Real property photography only — no stock photo feel.
- Hero images: high-contrast, dramatic framing.
- No heavy filters or color grading.

---

## What is NOT the brand

- No gradients.
- No colors outside the palette above.
- No rounded corners beyond `4px`.
- No playful or decorative fonts other than Cormorant + Inter.
- No shadows heavier than `0 4px 24px rgba(0,0,0,0.12)`.
- No busy patterns or textures.
- No recoloring or distorting the logo.
