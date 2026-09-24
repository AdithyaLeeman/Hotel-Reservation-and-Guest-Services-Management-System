# context/06 — UI Tokens

_This file points to CSS variable definitions. Do not duplicate token values here._
_Update this file after the shared UI shell is built (P01-M01-T13)._

## Status
Phase 0 — Tokens defined as planned values. Actual CSS variables to be implemented in `app/globals.css` during Phase 1.

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
