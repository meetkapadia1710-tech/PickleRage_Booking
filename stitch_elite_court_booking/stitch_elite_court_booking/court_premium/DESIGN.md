---
name: Court Premium
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#3f4945'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#707975'
  outline-variant: '#bfc9c4'
  surface-tint: '#29695b'
  primary: '#00342b'
  on-primary: '#ffffff'
  primary-container: '#004d40'
  on-primary-container: '#7ebdac'
  inverse-primary: '#94d3c1'
  secondary: '#795900'
  on-secondary: '#ffffff'
  secondary-container: '#ffbf00'
  on-secondary-container: '#6d5000'
  tertiary: '#00332f'
  on-tertiary: '#ffffff'
  tertiary-container: '#004c46'
  on-tertiary-container: '#4cc2b5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#afefdd'
  primary-fixed-dim: '#94d3c1'
  on-primary-fixed: '#00201a'
  on-primary-fixed-variant: '#065043'
  secondary-fixed: '#ffdfa0'
  secondary-fixed-dim: '#fbbc00'
  on-secondary-fixed: '#261a00'
  on-secondary-fixed-variant: '#5c4300'
  tertiary-fixed: '#84f5e8'
  tertiary-fixed-dim: '#66d9cc'
  on-tertiary-fixed: '#00201d'
  on-tertiary-fixed-variant: '#005049'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.1px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.5px
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  margin-main: 20px
  gutter: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
  touch-target: 48px
---

## Brand & Style

This design system is built for a premium sports booking experience that prioritizes speed, clarity, and athletic confidence. The aesthetic blends the systematic logic of modern fintech interfaces with the fluid, personalized nature of Material You. It targets active professionals who value their time and seek a frictionless way to access high-end athletic facilities.

The design style is **Modern Corporate** with a **Minimalist** edge. It utilizes generous whitespace to reduce cognitive load during the booking process, while employing vibrant accents to highlight actionable "win" states. The interface should feel "athletic"—lean, high-performance, and precise—avoiding unnecessary decorative elements in favor of functional elegance and structural integrity.

## Colors

The palette is anchored by a deep, authoritative teal that evokes exclusivity and stability. The amber accent is used sparingly but decisively for primary calls to action, active booking statuses, and "Premium" tier indicators, ensuring they pop against the cooler background tones.

- **Primary (Deep Teal):** Used for navigation bars, primary branding, and heavy structural elements.
- **Secondary (Amber):** The "action" color. Reserved for the final 'Book Now' buttons and critical highlights.
- **Tertiary (Soft Teal):** Used for selection states, chips, and secondary accents to maintain tonal harmony.
- **Surface/Background:** A crisp white (#FFFFFF) for primary cards and a very light cool gray (#F8F9FA) for the main application background to create subtle separation.

## Typography

We use **Plus Jakarta Sans** across the entire system. Its geometric yet open counters provide the modern, friendly, and legible character required for a fast-paced booking app. 

- **Headlines:** Use Bold (700) weights with slight negative letter-spacing to create a "locked-in" athletic feel.
- **Body:** Regular (400) weight ensures high readability for court descriptions and terms.
- **Labels:** Medium to Semi-Bold (500-600) weights are used for buttons, metadata, and category tags to ensure they remain distinct from body copy.

## Layout & Spacing

The layout follows a **Fluid Grid** model optimized for Android viewports. A 4-column grid is standard for mobile, with 20px outer margins to ensure content doesn't feel cramped against the device edges.

- **Vertical Rhythm:** Elements are stacked using an 8px base unit. 
- **Touch Targets:** All interactive elements (buttons, selectors) must maintain a minimum height/width of 48px to satisfy accessibility and ease of use during physical activity.
- **Safe Areas:** Adhere strictly to Android system bars and gesture navigation areas, ensuring the Deep Teal primary color is reflected in the Status Bar for a cohesive "full-bleed" feel.

## Elevation & Depth

This design system uses **Tonal Layers** combined with **Ambient Shadows**. Instead of heavy shadows, we use elevation to create functional hierarchy.

- **Level 0 (Background):** #F8F9FA.
- **Level 1 (Cards/Sheets):** #FFFFFF with a very soft, diffused shadow (Y: 4px, Blur: 12px, Opacity: 4%, Color: Primary). This creates a "lifted" effect without looking dated.
- **Level 2 (Floating Action Buttons/Modals):** Increased shadow spread (Y: 8px, Blur: 20px, Opacity: 8%) to indicate immediate priority.
- **Selection States:** Use a 1px inner stroke of the Primary color or a subtle Tonal fill rather than shadow changes to indicate "active" selection.

## Shapes

The shape language is defined by **Large Rounded Corners**. Following the user request for 20px corners, the system adopts a high-radius approach that feels approachable and premium.

- **Containers & Cards:** Use a base radius of 20px (`rounded-xl` equivalent in this system).
- **Buttons:** Fully pill-shaped or 16px radius to differentiate them from the structural containers they sit within.
- **Small Elements:** Tooltips and chips use a 12px radius to maintain the "soft-geometric" theme at scale.

## Components

### Buttons
- **Primary:** Amber background with Deep Teal text for maximum contrast. 20px or pill-shaped radius.
- **Secondary:** Deep Teal outline (1.5px) with transparent background.
- **Ghost:** No border, Deep Teal text. Used for "Cancel" or "View All" actions.

### Cards (Court Listings)
- White background, 20px corner radius.
- Imagery should be top-aligned with a subtle gradient overlay for text legibility if labels are placed over the image.
- Metadata (distance, price, rating) uses `label-md` for high density without clutter.

### Selection Chips (Time Slots)
- **Unselected:** Light Gray fill (#F1F3F4), no border.
- **Selected:** Deep Teal fill with White text.
- **Unavailable:** Strikethrough or 30% opacity.

### Input Fields
- Outlined style with 12px corner radius. 
- 1.5px border weight. 
- Label floats to the top border on focus (Material UI style).

### Availability Calendar
- A horizontal scrolling date picker. The "Active" date is highlighted with a Deep Teal circle and White text, while the current day is marked with a small Amber dot underneath.