---
version: beta
name: Alibaba Cloud
description: A cloud-first interface where structured technology meets vibrant visual storytelling. Gradient-lit hero canvases give way to crisp card grids, anchored by PingFang SC headlines with moderate tracking and a single Cloud Blue (#1677ff) interactive thread. UI serves the technology — soft purple-blue gradients, colored feature cards, and data-driven stat displays express the energy of intelligent cloud computing. No flat monotone; gradient atmospheres and pastel card surfaces elevate every section into a visual narrative.

colors:
  primary: "#1677ff"
  primary-focus: "#4096ff"
  primary-on-dark: "#69b1ff"
  primary-hover: "#0958d9"
  ink: "#1a1a1a"
  body: "#1a1a1a"
  body-on-dark: "#ffffff"
  body-muted: "#8c8c8c"
  ink-muted-80: "#333333"
  ink-muted-48: "#8c8c8c"
  divider-soft: "#f0f0f0"
  hairline: "#e8e8e8"
  canvas: "#ffffff"
  canvas-parchment: "#f5f7fa"
  surface-pearl: "#fafbfc"
  surface-tile-1: "#0a1628"
  surface-tile-2: "#111d35"
  surface-tile-3: "#162444"
  surface-black: "#000000"
  surface-chip-translucent: "#d9d9d9"
  on-primary: "#ffffff"
  on-dark: "#ffffff"
  gradient-hero-start: "#e6f0ff"
  gradient-hero-end: "#f0e6ff"
  gradient-card-purple: "#f3e8ff"
  gradient-card-blue: "#e6f4ff"
  gradient-card-teal: "#e6fffb"
  gradient-card-dark: "#141b2d"
  accent-purple: "#722ed1"
  accent-purple-light: "#9254de"
  stat-number: "#722ed1"

typography:
  hero-display:
    fontFamily: "PingFang SC, Microsoft YaHei, Helvetica Neue, system-ui, sans-serif"
    fontSize: 56px
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: 0
  display-lg:
    fontFamily: "PingFang SC, Microsoft YaHei, Helvetica Neue, system-ui, sans-serif"
    fontSize: 40px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0
  display-md:
    fontFamily: "PingFang SC, Microsoft YaHei, Helvetica Neue, system-ui, sans-serif"
    fontSize: 32px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: 0
  lead:
    fontFamily: "PingFang SC, Microsoft YaHei, Helvetica Neue, system-ui, sans-serif"
    fontSize: 24px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  tagline:
    fontFamily: "PingFang SC, Microsoft YaHei, Helvetica Neue, system-ui, sans-serif"
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0
  body-strong:
    fontFamily: "PingFang SC, Microsoft YaHei, Helvetica Neue, system-ui, sans-serif"
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.6
    letterSpacing: 0
  body:
    fontFamily: "PingFang SC, Microsoft YaHei, Helvetica Neue, system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0
  dense-link:
    fontFamily: "PingFang SC, Microsoft YaHei, Helvetica Neue, system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 2.0
    letterSpacing: 0
  caption:
    fontFamily: "PingFang SC, Microsoft YaHei, Helvetica Neue, system-ui, sans-serif"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  caption-strong:
    fontFamily: "PingFang SC, Microsoft YaHei, Helvetica Neue, system-ui, sans-serif"
    fontSize: 13px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0
  button-large:
    fontFamily: "PingFang SC, Microsoft YaHei, Helvetica Neue, system-ui, sans-serif"
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.0
    letterSpacing: 0
  button-utility:
    fontFamily: "PingFang SC, Microsoft YaHei, Helvetica Neue, system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.29
    letterSpacing: 0
  fine-print:
    fontFamily: "PingFang SC, Microsoft YaHei, Helvetica Neue, system-ui, sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0
  stat-number:
    fontFamily: "PingFang SC, Microsoft YaHei, Helvetica Neue, system-ui, sans-serif"
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -1px
  nav-link:
    fontFamily: "PingFang SC, Microsoft YaHei, Helvetica Neue, system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.0
    letterSpacing: 0

rounded:
  none: 0px
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  pill: 9999px
  full: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  section: 80px

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-utility}"
    rounded: "{rounded.md}"
    padding: 10px 24px
  button-primary-focus:
    backgroundColor: "{colors.primary-focus}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
  button-primary-active:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
  button-secondary-outline:
    backgroundColor: transparent
    textColor: "{colors.primary}"
    typography: "{typography.button-utility}"
    rounded: "{rounded.md}"
    border: 1px solid "{colors.primary}"
    padding: 10px 24px
  button-dark-utility:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-dark}"
    typography: "{typography.button-utility}"
    rounded: "{rounded.xs}"
    padding: 8px 16px
  button-pearl-capsule:
    backgroundColor: "{colors.surface-pearl}"
    textColor: "{colors.ink-muted-80}"
    typography: "{typography.caption}"
    rounded: "{rounded.md}"
    padding: 8px 14px
  button-store-hero:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-large}"
    rounded: "{rounded.md}"
    padding: 14px 32px
  button-icon-circular:
    backgroundColor: "{colors.surface-chip-translucent}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    size: 44px
  text-link:
    backgroundColor: transparent
    textColor: "{colors.primary}"
    typography: "{typography.body}"
  text-link-on-dark:
    backgroundColor: transparent
    textColor: "{colors.primary-on-dark}"
    typography: "{typography.body}"
  global-nav:
    backgroundColor: "{colors.surface-black}"
    textColor: "{colors.on-dark}"
    typography: "{typography.nav-link}"
    height: 56px
  sub-nav-frosted:
    backgroundColor: "{colors.canvas-parchment}"
    textColor: "{colors.ink}"
    typography: "{typography.tagline}"
    height: 52px
  hero-gradient:
    background: "linear-gradient(135deg, {colors.gradient-hero-start}, {colors.gradient-hero-end})"
    textColor: "{colors.ink}"
    typography: "{typography.hero-display}"
    padding: "{spacing.section}"
  product-tile-light:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.display-lg}"
    rounded: "{rounded.none}"
    padding: 80px
  product-tile-parchment:
    backgroundColor: "{colors.canvas-parchment}"
    textColor: "{colors.ink}"
    typography: "{typography.display-lg}"
    rounded: "{rounded.none}"
    padding: 80px
  product-tile-dark:
    backgroundColor: "{colors.surface-tile-1}"
    textColor: "{colors.on-dark}"
    typography: "{typography.display-lg}"
    rounded: "{rounded.none}"
    padding: 80px
  product-tile-dark-2:
    backgroundColor: "{colors.surface-tile-2}"
    textColor: "{colors.on-dark}"
    rounded: "{rounded.none}"
  product-tile-dark-3:
    backgroundColor: "{colors.surface-tile-3}"
    textColor: "{colors.on-dark}"
    rounded: "{rounded.none}"
  feature-card-purple:
    backgroundColor: "{colors.gradient-card-purple}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: 24px
  feature-card-blue:
    backgroundColor: "{colors.gradient-card-blue}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: 24px
  feature-card-teal:
    backgroundColor: "{colors.gradient-card-teal}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: 24px
  feature-card-dark:
    backgroundColor: "{colors.gradient-card-dark}"
    textColor: "{colors.on-dark}"
    rounded: "{rounded.xl}"
    padding: 24px
  store-utility-card:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.lg}"
    padding: 24px
  stat-display:
    backgroundColor: transparent
    textColor: "{colors.stat-number}"
    typography: "{typography.stat-number}"
  badge-tag:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.caption}"
    rounded: "{rounded.xs}"
    padding: 2px 8px
  configurator-option-chip:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.md}"
    padding: 12px 16px
  configurator-option-chip-selected:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  search-input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 12px 20px
    height: 44px
  floating-sticky-bar:
    backgroundColor: "{colors.canvas-parchment}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    height: 64px
    padding: 12px 32px
  partner-logo-row:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-muted-48}"
    padding: 40px 0
  footer:
    backgroundColor: "{colors.canvas-parchment}"
    textColor: "{colors.ink-muted-80}"
    typography: "{typography.fine-print}"
    padding: 64px
---

## Overview

Alibaba Cloud's web presence is a layered visual narrative where **gradient atmospheres frame structured card grids**. Every page opens with a soft blue-to-purple gradient hero — the signature "Cloud Gradient" — that establishes a sense of intelligent vitality before giving way to crisp, well-organized card layouts. Feature sections use pastel-tinted cards (purple, blue, teal, dark) to differentiate categories while maintaining visual cohesion. Data-driven stat displays in bold purple numerals anchor trust and scale.

The design moves beyond the flat tile alternation of earlier eras. While full-bleed light/dark section alternation still provides rhythm, the addition of gradient backgrounds, colored feature cards, and stat-driven credibility sections creates a richer, more dimensional experience. Typography remains confident and structured; the blue primary (#1677ff) is the single interactive thread across all surfaces. Purple accents appear in gradient contexts and stat numerals — not as a competing accent but as a gradient companion.

Density is calibrated for enterprise SaaS with visual warmth. Card grids use 3–4 columns with generous internal padding. Feature cards carry unique pastel backgrounds that serve as visual categorization — the color of the card IS the category signal. The overall effect is a cloud platform that feels like a smart, approachable command center: structured but warm, data-rich but never overwhelming.

**Key Characteristics:**
- Gradient-first presentation; the Cloud Gradient (blue→purple) opens every major surface and sets the tone.
- Single blue accent (`{colors.primary}` — #1677ff) carries every interactive element: links, CTAs, focus rings, active states.
- Purple as gradient companion: `{colors.accent-purple}` (#722ed1) appears in stat numerals, gradient endpoints, and feature card headers — not as a standalone accent.
- Four pastel feature card grammars: purple, blue, teal, dark — each card's background color signals its domain.
- Card-based layouts with rounded corners (`{rounded.xl}` 16px for feature cards, `{rounded.lg}` 12px for utility cards).
- Stat-driven credibility sections: large purple numerals (`{typography.stat-number}`) with labels beneath.
- Badge/tag system: small blue tags with `{rounded.xs}` identify product categories (e.g., "大模型").
- PingFang SC + Microsoft YaHei — clean tracking at display sizes, no aggressive letter-spacing expansion.
- Soft elevation on cards — shadows create depth without decoration; gradient backgrounds provide atmospheric depth instead.
- Two-row nav: dark global nav + frosted sub-nav with persistent primary CTA.
- Partner logo row for social proof at section boundaries.

## Colors

> **Source pages analyzed:** homepage, AI model showcase, product index, solutions, footer/infrastructure section. The color system is consistent across all surfaces; only the surface-mode and gradient mix differs.

### Brand & Accent
- **Cloud Blue** (`{colors.primary}` — #1677ff): The single brand-level interactive color. All text links, all blue CTA buttons ("立即查看", "立即选购"), focus rings, active category chips, and badge tags. This is Alibaba Cloud's authoritative "action" signal — clear, trustworthy, and instantly recognizable.
- **Focus Blue** (`{colors.primary-focus}` — #4096ff): A brighter variant for keyboard focus rings and hover states on primary buttons.
- **Hover Blue** (`{colors.primary-hover}` — #0958d9): A deeper blue for active/pressed states on primary buttons — shifts darker rather than lighter for a satisfying press feel.
- **Dark-Surface Blue** (`{colors.primary-on-dark}` — #69b1ff): A lighter blue used on dark surfaces for inline links and callouts where Cloud Blue would lack contrast.

### Gradient & Atmosphere
- **Hero Gradient Start** (`{colors.gradient-hero-start}` — #e6f0ff): The light-blue anchor of the signature Cloud Gradient — used as the starting point for hero section backgrounds.
- **Hero Gradient End** (`{colors.gradient-hero-end}` — #f0e6ff): The light-purple endpoint — completing the blue→purple gradient that opens every major surface.
- **Card Purple** (`{colors.gradient-card-purple}` — #f3e8ff): Pastel purple fill for AI/model feature cards — signals intelligence and creativity domain.
- **Card Blue** (`{colors.gradient-card-blue}` — #e6f4ff): Pastel blue fill for compute/infrastructure feature cards — signals reliability and performance domain.
- **Card Teal** (`{colors.gradient-card-teal}` — #e6fffb): Pastel teal fill for data/analytics feature cards — signals insight and clarity domain.
- **Card Dark** (`{colors.gradient-card-dark}` — #141b2d): Deep navy fill for premium/highlight feature cards — signals depth and capability domain.

### Accent
- **Accent Purple** (`{colors.accent-purple}` — #722ed1): The gradient companion. Used in stat numerals (`{typography.stat-number}`), gradient hero text highlights, and feature card headers. Not a standalone accent — always appears in gradient or stat contexts.
- **Accent Purple Light** (`{colors.accent-purple-light}` — #9254de): A lighter variant for purple text on lighter surfaces or for secondary purple elements.
- **Stat Number** (`{colors.stat-number}` — #722ed1): Dedicated token for the large credibility numerals — same hex as accent-purple but semantically distinct.

### Surface
- **Pure White** (`{colors.canvas}` — #ffffff): The dominant canvas. Content cards, utility grids, console surfaces.
- **Cool Parchment** (`{colors.canvas-parchment}` — #f5f7fa): The off-white with a cool blue-gray tint. Used for alternating light sections, footer, sub-nav frosted background, and the default page canvas in utility sections. Cooler than the previous generation's #f7f8fa.
- **Pearl Button** (`{colors.surface-pearl}` — #fafbfc): Near-white for secondary "ghost" buttons — lighter than parchment so the button reads as a button.
- **Deep Navy Tile 1** (`{colors.surface-tile-1}` — #0a1628): The primary dark-tile surface — a deep navy with blue undertone, evoking cloud infrastructure depth. Warmer and more saturated than the previous generation's #1a1a2e.
- **Deep Navy Tile 2** (`{colors.surface-tile-2}` — #111d35): A micro-step lighter — used where a dark tile sits adjacent to Tile 1 for the faintest separation.
- **Deep Navy Tile 3** (`{colors.surface-tile-3}` — #162444): A micro-step lighter still — used at the bottom of the stack and in embedded video frames.
- **Pure Black** (`{colors.surface-black}` — #000000): Reserved for the global nav bar background and video player overlays.
- **Translucent Chip Gray** (`{colors.surface-chip-translucent}` — #d9d9d9): The base hex for translucent gray chips over imagery. In production, applied at ~64% alpha.

### Text
- **Near-Black Ink** (`{colors.ink}` — #1a1a1a): The voice of every headline and body paragraph on light surfaces.
- **Body** (`{colors.body}` — #1a1a1a): Same hex as ink — one near-black tone for all text on light surfaces.
- **Body On Dark** (`{colors.body-on-dark}` — #ffffff): All text on dark tiles and the global nav bar.
- **Body Muted** (`{colors.body-muted}` — #8c8c8c): Secondary copy on light surfaces and muted labels.
- **Ink Muted 80** (`{colors.ink-muted-80}` — #333333): Body text on pearl button surfaces — slightly softer than pure black.
- **Ink Muted 48** (`{colors.ink-muted-48}` — #8c8c8c): Disabled states, legal fine-print, and partner logo row text.

### Hairlines & Borders
- **Divider Soft** (`{colors.divider-soft}` — #f0f0f0): Border tone on secondary elements. In production, often applied as `rgba(0, 0, 0, 0.04)`.
- **Hairline** (`{colors.hairline}` — #e8e8e8): The 1px hairline border on utility cards and configurator chips.

### Brand Gradient
The Cloud Gradient is the signature atmospheric effect: `linear-gradient(135deg, {colors.gradient-hero-start}, {colors.gradient-hero-end})` — a diagonal sweep from soft blue to soft purple. It appears on hero sections, stat display backgrounds, and select feature card environments. This is not a decorative flourish; it's the visual signature that distinguishes Alibaba Cloud's design from flat enterprise UIs.

Additional gradient patterns:
- **Radial product glow**: Soft radial gradients emanating from product imagery corners — `radial-gradient(circle at top right, rgba(22, 119, 255, 0.08), transparent 70%)`.
- **Feature card atmosphere**: Each pastel card color IS the gradient — the flat pastel fill provides sufficient atmospheric depth without additional CSS gradients.

## Typography

### Font Family
- **Display / Body / UI**: `PingFang SC, Microsoft YaHei, Helvetica Neue, system-ui, sans-serif` — Alibaba Cloud's prioritized font stack. PingFang SC for macOS/iOS Chinese, Microsoft YaHei for Windows Chinese, Helvetica Neue for Latin characters. All sizes use the same stack; weight and size differentiate hierarchy.
- **OpenType features**: Standard numeric rendering. Display sizes use zero or minimal letter-spacing — the current generation moves away from the previous expanded tracking approach.

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.hero-display}` | 56px | 600 | 1.10 | 0 | Hero headline; clean and direct |
| `{typography.display-lg}` | 40px | 600 | 1.20 | 0 | Section headlines, tile headlines |
| `{typography.display-md}` | 32px | 600 | 1.30 | 0 | Sub-section heads |
| `{typography.lead}` | 24px | 400 | 1.50 | 0 | Product tile subcopy, lead paragraphs |
| `{typography.tagline}` | 20px | 600 | 1.40 | 0 | Sub-tile tagline, feature card titles |
| `{typography.body-strong}` | 16px | 600 | 1.60 | 0 | Inline strong emphasis |
| `{typography.body}` | 14px | 400 | 1.60 | 0 | Default paragraph, card descriptions |
| `{typography.dense-link}` | 14px | 400 | 2.00 | 0 | Footer link lists (relaxed leading) |
| `{typography.caption}` | 13px | 400 | 1.50 | 0 | Secondary captions, badge text |
| `{typography.caption-strong}` | 13px | 600 | 1.40 | 0 | Emphasized captions |
| `{typography.button-large}` | 16px | 500 | 1.0 | 0 | Hero CTAs |
| `{typography.button-utility}` | 14px | 400 | 1.29 | 0 | Utility/nav button labels |
| `{typography.fine-print}` | 12px | 400 | 1.40 | 0 | Fine-print, footer body |
| `{typography.stat-number}` | 48px | 700 | 1.10 | -1px | Credibility stat numerals (purple) |
| `{typography.nav-link}` | 14px | 400 | 1.0 | 0 | Global nav menu items |

### Principles

- **Zero letter-spacing at display sizes.** The current generation favors clean, tight headlines without the expanded tracking of the previous era. Chinese characters are inherently well-spaced; additional tracking is unnecessary and can reduce readability.
- **Body copy at 14px, the enterprise SaaS standard.** Alibaba Cloud runs paragraph text at 14px — slightly smaller than the previous 16px — allowing higher information density while maintaining readability. Larger text (16px) is reserved for emphasized body copy (`{typography.body-strong}`).
- **Weight 700 for stat numerals.** The bold stat numbers (`{typography.stat-number}`) use weight 700 with slight negative tracking (-1px) for a powerful, confident presence.
- **Weight 600 for headlines; 500 for large CTAs.** Headlines sit at weight 600. Weight 500 is used for `{typography.button-large}` (16px) when a touch more approachability is needed on primary actions.
- **Line-height is context-specific.** Display sizes use 1.10–1.30. Body uses 1.60. Footer links use 2.00 for scannable columns.
- **Weight 300 is available but extremely rare.** The ladder is 300 / 400 / 500 / 600 / 700. Most surfaces use 400/600.

### Note on Font Substitutes
PingFang SC and Microsoft YaHei are system fonts. When building off-system:

- Use `system-ui, -apple-system, sans-serif` as the fallback stack — on macOS/iOS this resolves to PingFang SC; on Windows to Microsoft YaHei.
- For non-Chinese platforms, **Inter** (Google Fonts, variable) is the closest open-source equivalent for Latin characters. Inter at weight 600 approximates the structured feel.
- Maintain zero or minimal `letter-spacing` on display sizes — the current design favors tight, clean headlines.
- For body text, the 1.60 line-height works well across both Chinese and Latin scripts.

## Layout

### Spacing System
- **Base unit:** 8px. Sub-base values (4, 8, 12, 16, 24) are used for tight adjustments; structural layout snaps to 8/16/24/32/48.
- **Tokens:** `{spacing.xxs}` 4px · `{spacing.xs}` 8px · `{spacing.sm}` 12px · `{spacing.md}` 16px · `{spacing.lg}` 24px · `{spacing.xl}` 32px · `{spacing.xxl}` 48px · `{spacing.section}` 80px.
- **Section vertical padding:** `{spacing.section}` (80px) inside a product tile; tiles stack edge-to-edge with 0 gap (the color/gradient change provides the break).
- **Card padding:** `{spacing.lg}` (24px) inside utility and feature cards.
- **Button padding:** 8–14px vertical, 16–32px horizontal.
- **Feature card grid gap:** 20–24px between cards.

### Grid & Container
- **Max content width:** ~1200px on text-heavy sections, ~1440px on product grids, full-bleed for hero sections with gradient backgrounds.
- **Column patterns:** 3–4 column feature card grid; 3-column product card grid; 2-column hero layouts (content + visual); single-column centered stack on hero tiles.
- **Gutters:** 20–24px between cards in utility and feature grids.
- **Grid philosophy:** Card-based modular grid. Every element lives within a rounded-corner card — no raw content touches the viewport edge except hero gradients and nav bars.

### Whitespace Philosophy
Alibaba Cloud's whitespace is structured breathing room amplified by gradient atmospheres. Each section begins with the Cloud Gradient or a solid surface color that visually separates it from neighbors. Feature cards have generous internal padding (24px) with clear separation between icon, title, description, and CTA. Stat displays float in open space with large numerals that command attention. The footer goes deliberately dense for information scanning.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| Flat gradient | Cloud Gradient background | Hero sections, stat backgrounds |
| Flat pastel | Solid pastel background | Feature cards (purple, blue, teal, dark) |
| Soft hairline | 1px `rgba(0, 0, 0, 0.06)` border | Utility cards, configurator chips |
| Backdrop blur | `backdrop-filter: blur(20px) saturate(180%)` on Parchment 80% | Sub-nav and floating sticky bar |
| Card shadow | `rgba(0, 0, 0, 0.08) 0px 2px 8px` | Product/utility cards resting on a surface |
| Elevated shadow | `rgba(0, 0, 0, 0.12) 0px 4px 20px` | Hovering cards, modals, dropdowns |

**Shadow philosophy.** Alibaba Cloud uses softer shadows than the previous generation — the shift from `0.12` opacity to `0.08` opacity for default card shadows creates a flatter, more modern feel. Gradient backgrounds provide atmospheric depth instead of relying on heavy shadows. The "Cloud Gradient" IS the primary depth indicator — its presence signals a hero or featured section; its absence signals utility content.

### Decorative Depth
- **Cloud Gradient** on hero sections supplies the primary atmospheric effect — no additional CSS gradients or shadows needed.
- **Pastel card surfaces** create visual categorization through color alone — depth comes from the color, not from shadow.
- **Edge-to-edge tile alternation** (gradient hero → white cards → dark tiles → parchment footer) creates rhythm without borders or heavy shadows.
- **Backdrop-filter blur** on `{component.sub-nav-frosted}` and `{component.floating-sticky-bar}` creates a frosted-glass "floating over content" effect.
- **3D/stylized graphics** (globe visualizations, infrastructure diagrams) supply mood and technology association.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.none}` | 0px | Full-bleed product tiles |
| `{rounded.xs}` | 4px | Badge tags, compact utility elements |
| `{rounded.sm}` | 6px | Search inputs, inline elements |
| `{rounded.md}` | 8px | Primary CTAs, secondary buttons, option chips |
| `{rounded.lg}` | 12px | Utility cards, product grid cards |
| `{rounded.xl}` | 16px | Feature cards, promotional cards |
| `{rounded.pill}` | 9999px | Category filter chips |
| `{rounded.full}` | 9999px | Circular icon buttons |

### Product Imagery Geometry
- **Hero imagery**: full-bleed with gradient overlay; product renders are geometric and clean.
- **Feature card visuals**: embedded within pastel rounded cards, maintaining the card's `{rounded.xl}` radius.
- **Product grid**: 4:3 or 1:1 crops at `{rounded.lg}` (12px) radius with light neutral backgrounds.
- **No rounded imagery in full-bleed tiles** — images are full-bleed rectangular. Rounding appears only on card-contained imagery.
- **Badge tags** use `{rounded.xs}` (4px) — nearly rectangular for a technical, precise feel.

## Components

### Top Navigation

**`global-nav`** — Persistent black nav bar pinned to the top of every page. Background `{colors.surface-black}`, height 56px, text `{colors.on-dark}` in `{typography.nav-link}` (14px / 400). Links are quiet, spaced ~24px apart. Right-aligned cluster: Search icon, Console entry, Language selector, Login/Sign-up buttons — always visible. The Aliyun logo (orange cloud icon + text) sits at the left. On mobile, collapses to hamburger at ~834px.

**`sub-nav-frosted`** — Surface-specific nav that sticks below the global nav. Background `{colors.canvas-parchment}` at 80% opacity with backdrop-filter blur, creating a frosted-glass effect. Height 52px. Content on left: page or product category name in `{typography.tagline}` (20px / 600). Content right: inline nav links in `{typography.button-utility}` (14px), ending in a persistent `{component.button-primary}` CTA.

### Hero Section

**`hero-gradient`** — The signature opening section. Background Cloud Gradient (`linear-gradient(135deg, {colors.gradient-hero-start}, {colors.gradient-hero-end})`), text `{colors.ink}`. Centered stack: headline in `{typography.hero-display}` (56px / 600) → subheadline in `{typography.lead}` (24px / 400) → one or two CTAs (`{component.button-primary}` + optional `{component.button-secondary-outline}`). The gradient creates immediate visual impact and establishes the blue→purple atmospheric thread.

### Feature Cards

**`feature-card-purple`** — Pastel purple card for AI/intelligence features. Background `{colors.gradient-card-purple}` (#f3e8ff), text `{colors.ink}`, rounded `{rounded.xl}` (16px), padding `{spacing.lg}` (24px). Contains: icon → title in `{typography.tagline}` (20px / 600) → description in `{typography.body}` (14px / 400) → illustrative image or CTA.

**`feature-card-blue`** — Same structure on `{colors.gradient-card-blue}` (#e6f4ff) — signals compute/infrastructure domain.

**`feature-card-teal`** — Same structure on `{colors.gradient-card-teal}` (#e6fffb) — signals data/analytics domain.

**`feature-card-dark`** — Same structure on `{colors.gradient-card-dark}` (#141b2d) with `{colors.on-dark}` text — signals premium/highlight domain.

Feature cards appear in 2×2 or 4-column grids. The card background color IS the visual categorization — no additional icons or labels needed to distinguish domains.

### Buttons

**`button-primary`** — The signature Alibaba Cloud action. Background `{colors.primary}` (Cloud Blue #1677ff), text `{colors.on-primary}` in `{typography.button-utility}` (14px / 400), rounded `{rounded.md}` (8px — slightly more rounded than the previous generation's 6px), padding 10px × 24px. The 8px radius is the brand action signal — approachable but precise.
- Active state: `{component.button-primary-active}` — background shifts to `{colors.primary-hover}` (#0958d9), `transform: scale(0.95)`.
- Focus state: `{component.button-primary-focus}` — background `{colors.primary-focus}`, outline 2px solid `{colors.primary-focus}`.

**`button-secondary-outline`** — Used as the second CTA when two buttons appear together. Background transparent, text `{colors.primary}`, 1px solid `{colors.primary}` border, rounded `{rounded.md}` (8px), padding 10px × 24px. Reads as a "ghost outline."

**`button-dark-utility`** — Global nav actions (Sign In, Console). Background `{colors.ink}` (#1a1a1a), text `{colors.on-dark}` in `{typography.button-utility}` (14px / 400), rounded `{rounded.xs}` (4px), padding 8px × 16px. Active state: `transform: scale(0.95)`.

**`button-pearl-capsule`** — Product-card secondary button. Background `{colors.surface-pearl}` (#fafbfc), text `{colors.ink-muted-80}` in `{typography.caption}` (13px), 1px solid `{colors.divider-soft}` border, rounded `{rounded.md}` (8px), padding 8px × 14px.

**`button-store-hero`** — Larger primary CTA for hero surfaces. Same Cloud Blue + White as `{component.button-primary}`, but with `{typography.button-large}` (16px / 500) and more padding (14px × 32px).

**`button-icon-circular`** — Floats over imagery. 44 × 44px, background `{colors.surface-chip-translucent}` at ~64% alpha, icon in `{colors.ink}`, rounded `{rounded.full}`.

**`text-link`** — Inline body links in `{colors.primary}` (Cloud Blue). Underlined or non-underlined per context.

**`text-link-on-dark`** — Inline body links on dark tiles in `{colors.primary-on-dark}` (#69b1ff) — Cloud Blue would lack contrast against dark navy tiles.

### Cards & Containers

**`product-tile-light`** — Full-bleed light tile. Background `{colors.canvas}` (white), text `{colors.ink}`, rounded `{rounded.none}` (0 — tiles touch edges), vertical padding `{spacing.section}` (80px). Centered stack: headline → subcopy → CTAs → product imagery.

**`product-tile-parchment`** — Same as `{component.product-tile-light}` but on `{colors.canvas-parchment}` (#f5f7fa). Used to break consecutive white tiles.

**`product-tile-dark`** — Full-bleed dark tile. Background `{colors.surface-tile-1}` (#0a1628), text `{colors.on-dark}`, rounded `{rounded.none}`, vertical padding `{spacing.section}` (80px). Same content stack as light tile but with `{component.text-link-on-dark}` for inline copy.

**`product-tile-dark-2`** — Variant on `{colors.surface-tile-2}` (#111d35). Micro-step separation from `{component.product-tile-dark}`.

**`product-tile-dark-3`** — Variant on `{colors.surface-tile-3}` (#162444). Bottom-of-stack and video frames.

**`store-utility-card`** — Used in product grids and console interfaces. Background `{colors.canvas}`, 1px solid `{colors.hairline}` border, rounded `{rounded.lg}` (12px), padding `{spacing.lg}` (24px). Contains: product image → name in `{typography.body-strong}` (16px / 600) → description in `{typography.body}` (14px / 400) → CTA link. Card shadow: `rgba(0, 0, 0, 0.08) 0px 2px 8px`.

**`stat-display`** — Credibility statistics display. Large numerals in `{colors.stat-number}` (#722ed1) at `{typography.stat-number}` (48px / 700), labels below in `{typography.body}` (14px / 400) in `{colors.ink-muted-80}`. Arranged in a horizontal row (3–4 stats) with generous spacing. May sit on the Cloud Gradient background or on a light canvas.

**`badge-tag`** — Small rectangular tag identifying product categories. Background `{colors.primary}`, text `{colors.on-primary}` in `{typography.caption}` (13px), rounded `{rounded.xs}` (4px), padding 2px × 8px. Used to label "大模型" (Large Model) products, new items, etc.

**`configurator-option-chip`** — Tappable cell for configuration. Background `{colors.canvas}`, text `{colors.ink}` in `{typography.caption}`, rounded `{rounded.md}`, padding 12px × 16px.

**`configurator-option-chip-selected`** — Selected state. Border upgrades to 2px solid `{colors.primary-focus}`.

**`partner-logo-row`** — Horizontal row of grayscale partner/customer logos. Background `{colors.canvas}`, logos in `{colors.ink-muted-48}` (grayed out), padding 40px vertical. Used for social proof at section boundaries.

**`floating-sticky-bar`** — Floats at the bottom of the viewport during scroll. Background `{colors.canvas-parchment}` at 80% opacity with `backdrop-filter: blur(20px)`, height 64px, padding 12px × 32px. Left: running price total. Right: `{component.button-primary}` CTA.

### Inputs & Forms

**`search-input`** — Product search input. Background `{colors.canvas}`, text `{colors.ink}` in `{typography.body}` (14px), 1px solid `rgba(0, 0, 0, 0.06)` border, rounded `{rounded.md}` (8px), padding 12px × 20px, height 44px. Leading icon: search glyph at 14px, muted tint.

### Footer

**`footer`** — Background `{colors.canvas-parchment}` (#f5f7fa), text `{colors.ink-muted-80}`. Link columns in `{typography.dense-link}` (14px / 400 / 2.00 line-height). Column headings in `{typography.caption-strong}` (13px / 600). Legal row in `{typography.fine-print}` (12px / 400) with `{colors.ink-muted-48}` text. Vertical padding 64px.

## Do's and Don'ts

### Do
- Use `{colors.primary}` (Cloud Blue #1677ff) for every interactive element — links, CTAs, focus signals, active chips — and nothing else. The single accent is non-negotiable.
- Open major surfaces with the Cloud Gradient — `linear-gradient(135deg, {colors.gradient-hero-start}, {colors.gradient-hero-end})` — it's the visual signature.
- Use `{colors.accent-purple}` (#722ed1) for stat numerals and gradient context highlights — it's the gradient companion, not a competing accent.
- Assign feature card domains by pastel color — purple for AI, blue for compute, teal for data, dark for premium. The color IS the category.
- Set headlines in `{typography.hero-display}` or `{typography.display-lg}` with zero letter-spacing for clean, modern typography.
- Run body copy at `{typography.body}` (14px / 400 / 1.60) — the enterprise SaaS standard.
- Use `{rounded.md}` (8px) for primary CTAs and `{rounded.xl}` (16px) for feature cards — the slight roundness is approachable and modern.
- Apply soft card shadow (`rgba(0, 0, 0, 0.08) 0px 2px 8px`) to utility cards for gentle elevation.
- Use `transform: scale(0.95)` as the active/press state on every button — the system-wide micro-interaction.
- Keep the global nav `{colors.surface-black}` — it's the only place pure black appears.
- Use stat displays with `{colors.stat-number}` purple numerals for credibility sections.

### Don't
- Don't introduce a second accent color competing with Cloud Blue; every "click me" signal is `{colors.primary}`.
- Don't use expanded letter-spacing on headlines — the current design favors tight, clean tracking.
- Don't use heavy shadows — gradient backgrounds and pastel card colors provide depth; shadows should be subtle (0.08 opacity max for default).
- Don't use body copy at 16px for standard paragraphs — 14px is the current enterprise density; 16px is reserved for `{typography.body-strong}` emphasis.
- Don't round full-bleed tiles — tiles are rectangular and edge-to-edge; gradient/color change is the divider.
- Don't use `{colors.primary-on-dark}` (#69b1ff) on light surfaces — it's the dark-tile-only variant. Cloud Blue is for light surfaces.
- Don't mix pastel card colors without domain purpose — each color signals a category; random color assignment breaks the system.
- Don't use `{colors.accent-purple}` as a standalone interactive color — it appears only in gradients and stat contexts.

## Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|---|---|---|
| Small phone | ≤ 419px | Single-column tiles; sub-nav collapses to category name + CTA only; hero typography drops to 28px |
| Phone | 420–640px | Single-column stack; feature cards stack vertically; hero h1 drops to 32px |
| Large phone | 641–735px | Tighter tile padding (48px vertical vs 80px) |
| Tablet portrait | 736–833px | Global nav collapses to hamburger; sub-nav hides inline links, keeps CTA |
| Tablet landscape | 834–1023px | Global nav returns fully expanded; 4-column grids become 2-column |
| Small desktop | 1024–1068px | Feature cards in 2×2 grid; hero h1 stays at 40px |
| Desktop | 1069–1440px | Full layout; 3–4 column grids; 1440px content max |
| Wide desktop | ≥ 1441px | Content locks at 1440px, margins absorb extra width |

The structural breakpoints: 1440px (content lock), 1068px (small-desktop), 833px (tablet landscape switch), 734px (tablet portrait), 640px (phone), 480px (small phone).

### Touch Targets
- Minimum 44 × 44px. `{component.button-primary}` lands at ~44 × 100px.
- `{component.button-icon-circular}` is exactly 44 × 44px.
- Feature card touch targets include the entire card surface.

### Collapsing Strategy
- **Global nav**: full horizontal link row → logo + hamburger + search at 834px and below.
- **Sub-nav**: category name + inline links + CTA → category name + CTA only at mobile.
- **Feature cards**: 4-column → 2-column at 834px → 1-column at 640px.
- **Product grids**: 3-col → 2-col (834px) → 1-col (640px).
- **Hero typography**: `{typography.hero-display}` (56px) → 40px at 1068px → 32px at 640px → 28px at 419px.
- **Cloud Gradient**: Maintained across all breakpoints — the gradient IS the hero, it doesn't collapse.

## Iteration Guide

1. Focus on ONE component at a time. Reference its YAML key directly (`{component.feature-card-purple}`, `{component.search-input}`).
2. Variants of an existing component (`-focus`, `-active`, `-2`, `-3`) live as separate entries in `components:`.
3. Use `{token.refs}` everywhere — never inline hex.
4. Never document hover. Default and Active/Pressed states only.
5. Display headlines stay PingFang SC / Microsoft YaHei 600 with zero letter-spacing. Body stays 400 at 14px. The boundary is unbreakable.
6. The soft card shadow (`rgba(0, 0, 0, 0.08) 0px 2px 8px`) is the default elevation for utility cards.
7. When in doubt about emphasis: use the Cloud Gradient or a pastel card color before adding chrome.
8. Feature card domain colors are non-negotiable — purple=AI, blue=compute, teal=data, dark=premium.
9. The Cloud Gradient opens every major surface — it's the visual signature, not an optional decoration.

## Known Gaps

- Form validation and error states follow enterprise patterns but are not fully documented as tokens.
- The exact Cloud Gradient angle (135deg) may vary per surface — some pages use 120deg or 150deg for subtle variation; this isn't formalized as a token.
- 3D/stylized graphics (globe visualizations, infrastructure diagrams) are content assets, not design tokens.
- Dark-mode counterparts for feature cards and product utility cards were not surfaced on the analyzed pages; the system documented is the light-dominant variant.
- The backdrop-filter blur radius on `{component.sub-nav-frosted}` and `{component.floating-sticky-bar}` is platform-dependent; production CSS uses `saturate(180%) blur(20px)` as a typical baseline.
- Animation and transition patterns (card entrance animations, scroll-triggered reveals) are implemented but not formalized as tokens.
- The search input's expanded state (full-width search overlay) is a behavioral pattern not documented as a component variant.
