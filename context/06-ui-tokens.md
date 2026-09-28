# context/06 — UI Tokens

_Single source of truth for design token names and values._
_Updated: P01-M01-T22 DONE. Actual CSS variables now live in `app/globals.css`._

## Status
Phase 1 — Tokens implemented in `app/globals.css` via Tailwind v4 `@theme inline`.
Root layout with Inter + JetBrains Mono via `next/font/google` implemented in `app/layout.tsx`.

## Color Palette (Implemented)

```css
/* ── Brand / Primary — Deep Teal ── */
--color-primary:        hsl(196 80% 30%)   /* #0d6e84 */
--color-primary-hover:  hsl(196 80% 25%)
--color-primary-muted:  hsl(196 40% 92%)
--color-primary-fg:     hsl(0 0% 100%)     /* text on primary bg */

/* ── Accent — Warm Gold (luxury hotel) ── */
--color-accent:         hsl(40 80% 50%)    /* #d4910a */
--color-accent-hover:   hsl(40 80% 43%)
--color-accent-muted:   hsl(40 60% 95%)
--color-accent-fg:      hsl(0 0% 100%)

/* ── Surface / Background ── */
--color-bg:             hsl(210 20% 98%)
--color-bg-subtle:      hsl(210 15% 94%)
--color-surface:        hsl(0 0% 100%)
--color-surface-raised: hsl(210 20% 98%)
--color-surface-overlay:hsl(210 15% 96%)

/* ── Text ── */
--color-text:           hsl(215 25% 12%)
--color-text-muted:     hsl(215 15% 45%)
--color-text-subtle:    hsl(215 10% 62%)
--color-text-inverse:   hsl(0 0% 100%)

/* ── Border ── */
--color-border:         hsl(215 15% 88%)
--color-border-strong:  hsl(215 15% 72%)

/* ── Semantic Status ── */
--color-success:        hsl(142 60% 35%)
--color-success-bg:     hsl(142 50% 94%)
--color-warning:        hsl(38 90% 45%)
--color-warning-bg:     hsl(38 90% 95%)
--color-error:          hsl(0 72% 48%)
--color-error-bg:       hsl(0 72% 96%)
--color-info:           hsl(210 80% 45%)
--color-info-bg:        hsl(210 80% 95%)

/* ── Status badge colors ── */
--color-status-booked:      hsl(210 80% 45%)
--color-status-checked-in:  hsl(142 60% 35%)
--color-status-checked-out: hsl(215 15% 55%)
--color-status-cancelled:   hsl(0 72% 48%)
--color-status-maintenance: hsl(38 90% 45%)
--color-status-available:   hsl(142 60% 35%)
```

### Dark Mode
Tokens above are overridden in:
- `@media (prefers-color-scheme: dark)` — OS-level automatic
- `[data-theme="dark"]` — manual toggle (staff portal preference in `localStorage['skynest-theme']`)
- `[data-theme="light"]` — force light (overrides OS dark)
- FOUC prevention: inline `<script>` in root `<head>` reads `localStorage` before paint.

## Typography (Implemented)

```css
--font-sans:  'Inter', ui-sans-serif, system-ui, sans-serif
--font-mono:  'JetBrains Mono', ui-monospace, monospace
```

- Loaded via `next/font/google` in `app/layout.tsx` (preloaded, no layout shift).
- CSS variables `--font-sans` / `--font-mono` injected as `--font-sans` / `--font-mono` in `@theme`.

## Border Radius (Implemented)

```css
--radius-sm:   0.25rem
--radius-md:   0.375rem
--radius-lg:   0.5rem
--radius-xl:   0.75rem
--radius-2xl:  1rem
--radius-full: 9999px
```

## Shadows (Implemented)

```css
--shadow-sm:   0 1px 2px 0 hsl(215 25% 12% / 0.06)
--shadow-md:   0 4px 8px ...
--shadow-lg:   0 12px 24px ...
--shadow-card: 0 2px 8px 0 hsl(215 25% 12% / 0.08)
```

## Utility Classes (Implemented in `@layer utilities`)

| Class | Purpose |
|---|---|
| `.container-page` | Centred, 1280px max-width, responsive padding |
| `.card` | Surface card with border, radius, shadow |
| `.btn`, `.btn-{variant}` | Primary, accent, outline, ghost, danger; sm/lg sizes |
| `.badge`, `.badge-{status}` | Status indicator pills |
| `.form-input` | Controlled text input with focus ring + error state |
| `.form-label`, `.form-label-required` | Field label with optional * |
| `.form-error`, `.form-hint` | Field-level error and hint text |
| `.alert`, `.alert-{type}` | Success / warning / error / info banners |
| `.skeleton` | Shimmer loading placeholder |
| `.spinner` | Inline spinning loader |
| `.divider` | 1px horizontal divider |
| `.animate-fade-in` | Page entry fade-up animation |

## Responsive Breakpoints

Tailwind defaults (Tailwind v4):
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

---

_Updated by P01-M01-T22 (globals.css) and P01-M01-T23 (layout.tsx)._


## Color Palette (Planned)

These are the intended token names. CSS variable values will be defined in `app/globals.css`.

```css
/* Base palette — to be finalized in Phase 1 */
--color-primary:        /* Main brand color — planned: deep blue/teal */
--color-primary-hover:  /* Hover state */
--color-primary-muted:  /* Subtle tint */

--color-accent:         /* Accent — planned: gold/amber for luxury hotel feel */
--color-accent-hover:

--color-surface:        /* Card/panel background */
--color-surface-raised: /* Elevated surface */
--color-surface-overlay:/* Modal overlay background */

--color-bg:             /* Page background */
--color-bg-subtle:      /* Subtle section background */

--color-text:           /* Primary text */
--color-text-muted:     /* Secondary/muted text */
--color-text-inverse:   /* Text on dark backgrounds */

--color-border:         /* Default border */
--color-border-strong:  /* Emphasized border */

--color-success:        /* Green — checked out, paid */
--color-warning:        /* Amber — partial payment, maintenance */
--color-error:          /* Red — validation error, cancelled */
--color-info:           /* Blue — informational */

/* Status badge colors */
--color-status-booked:
--color-status-checked-in:
--color-status-checked-out:
--color-status-cancelled:
```

## Typography (Planned)

```css
--font-sans:    /* Primary — planned: 'Inter', sans-serif (Google Fonts) */
--font-mono:    /* Code/data — planned: 'JetBrains Mono', monospace */

--text-xs:      /* 0.75rem */
--text-sm:      /* 0.875rem */
--text-base:    /* 1rem */
--text-lg:      /* 1.125rem */
--text-xl:      /* 1.25rem */
--text-2xl:     /* 1.5rem */
--text-3xl:     /* 1.875rem */
--text-4xl:     /* 2.25rem */

--font-normal:  /* 400 */
--font-medium:  /* 500 */
--font-semibold:/* 600 */
--font-bold:    /* 700 */
```

## Spacing

Uses Tailwind's default spacing scale. Custom tokens added here if needed.

## Border Radius

```css
--radius-sm:  /* 0.25rem */
--radius-md:  /* 0.375rem */
--radius-lg:  /* 0.5rem */
--radius-xl:  /* 0.75rem */
--radius-full:/* 9999px */
```

## Shadows

```css
--shadow-sm:
--shadow-md:
--shadow-lg:
--shadow-card:
```

## Responsive Breakpoints

Tailwind defaults:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

## Dark Mode

Dark mode supported via Tailwind's `dark:` variant.
Color tokens must have dark mode counterparts defined in `app/globals.css`.

---

_Once the shared UI shell (P01-M01-T13) is merged, update this file with the actual CSS variable values._
