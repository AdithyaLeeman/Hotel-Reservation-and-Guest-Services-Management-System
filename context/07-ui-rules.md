# context/07 — UI Rules

_Rules for all pages and components. Run `/imprint` after meaningful UI work to capture patterns in `ui-registry.md`._

## General Layout

- Single-column layouts on mobile, multi-column on md+
- Maximum content width: `1280px` (`max-w-7xl`) centered
- Consistent horizontal padding: `px-4 md:px-6 lg:px-8`
- Guest portal: clean, welcoming, customer-facing design
- Staff portal: dense, information-rich, operational dashboard design

## Forms

- Every form field has a visible label (never placeholder-only)
- Required fields marked with `*`
- Validation errors shown inline below the field, using `--color-error`
- Disabled submit button while a request is in flight (loading state)
- Success state shown after submit before redirect
- Date inputs use native `<input type="date">` for simplicity
- Money amounts displayed with 2 decimal places and LKR prefix

## Tables

- Sortable columns where useful
- Empty state shown explicitly (not a blank table)
- Responsive: horizontal scroll on mobile, not collapsed rows
- Row hover highlight
- Status columns use colored badges (`--color-status-*`)
- Currency columns right-aligned
- Pagination for lists > 20 items

## Dialogs and Modals

- Overlay backdrop closes dialog on click (with keyboard Escape support)
- Destructive actions (cancel reservation, etc.) require a confirmation dialog
- Dialog has clear title, body, and action buttons
- Primary action is right-aligned, secondary/cancel is left or text-only

## Loading and Async States

- Show a spinner or skeleton while data is loading
- Never show a blank page while waiting for server data
- API errors shown with a user-friendly message (never raw SQLSTATE/stack traces)
- Optimistic UI only where rollback is safe to handle

## Error States

- Form validation: inline field errors
- API errors: toast or inline alert with actionable message
- 404: friendly "Not found" page with navigation back
- 403: friendly "Access denied" page
- 500: friendly "Something went wrong" page, log details server-side only

## Empty States

- Every list shows a meaningful empty state message and a call-to-action where applicable
- Example: "No reservations yet. Book a room to get started."

## Accessibility

- All interactive elements have unique, descriptive `id` attributes
- All images have `alt` text
- Color is never the only means of conveying information (use icon + color)
- Keyboard-navigable: tab order logical, focus visible
- Minimum contrast ratio 4.5:1 (WCAG AA)
- Form inputs associated with labels via `htmlFor`/`id`

## Responsive Behavior

- Mobile-first breakpoints
- Navigation: hamburger menu on mobile, horizontal nav on md+
- Tables: horizontal scroll on small screens
- Cards: single column on mobile, 2-3 columns on md+

## Staff vs Guest Portal Visual Distinction

- Guest portal: lighter, welcoming, hotel brand colors prominent
- Staff portal: sidebar navigation, denser data tables, operational color coding

## Temporary Mock Data

- Allowed only during isolated UI development
- Must be clearly marked with a `// TODO: replace with real API call` comment
- Must be removed or replaced before the task can reach `REVIEW`
