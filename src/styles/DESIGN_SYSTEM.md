# Design System Guide

This document outlines the typography and color system used throughout the codebase. **All new components must follow this guide.**

---

## Color System

Colors are defined as CSS variables in `globals.css` and mapped to Tailwind utility classes in `tailwind.config.ts`. All colors support dark mode automatically.

### Brand Colors

| Token | Light Mode | Usage | Tailwind Class |
|-------|------------|-------|----------------|
| `primary` | Teal #0d9488 | Primary actions, brand | `bg-primary`, `text-primary` |
| `primary-hover` | #0f766e | Hover state | `bg-primary-hover` |
| `primary-light` | #ccfbf1 | Subtle backgrounds | `bg-primary-light` |
| `secondary` | Indigo #6366f1 | Secondary actions | `bg-secondary`, `text-secondary` |
| `accent` | Amber #f59e0b | Highlights, attention | `bg-accent`, `text-accent` |

### Surface Colors

| Token | Usage | Tailwind Class |
|-------|-------|----------------|
| `background` | Page backgrounds | `bg-background` |
| `foreground` | Primary text | `text-foreground` |
| `card` | Card backgrounds | `bg-card` |
| `card-foreground` | Card text | `text-card-foreground` |
| `popover` | Dropdown/tooltip backgrounds | `bg-popover` |
| `muted` | Subtle backgrounds | `bg-muted` |
| `muted-foreground` | Secondary text | `text-muted-foreground` |
| `subtle` | Very light backgrounds | `bg-subtle` |

### UI Element Colors

| Token | Usage | Tailwind Class |
|-------|-------|----------------|
| `border` | Borders | `border-border` |
| `input` | Input borders | `border-input` |
| `ring` | Focus rings | `ring-ring` |

### Status Colors

Each status color has three variants: DEFAULT, `-foreground`, and `-light`.

| Status | Color | Usage |
|--------|-------|-------|
| `success` | Green | Success states, completed |
| `warning` | Amber | Warnings, pending |
| `error` | Red | Errors, destructive |
| `info` | Blue | Information, links |

**Usage Examples:**
```tsx
// Success message
<div className="bg-success-light border border-success/30 text-success">
  Operation successful
</div>

// Error state
<p className="text-error">Something went wrong</p>
```

---

## Typography System

### Semantic Text Classes

Use these semantic classes instead of raw Tailwind sizes. They include optimized line-height, letter-spacing, and font-weight.

#### Display (Hero sections, landing pages)

| Class | Size | Use Case |
|-------|------|----------|
| `text-display-2xl` | 4.5rem | Main hero headlines |
| `text-display-xl` | 3.75rem | Large hero text |
| `text-display-lg` | 3rem | Section heroes |
| `text-display-md` | 2.25rem | Feature headlines |
| `text-display-sm` | 1.875rem | Large numbers, stats |

#### Headings (Section titles, cards)

| Class | Size | Use Case |
|-------|------|----------|
| `text-heading-xl` | 1.5rem | Page titles |
| `text-heading-lg` | 1.25rem | Section titles, modal headers |
| `text-heading-md` | 1.125rem | Card titles |
| `text-heading-sm` | 1rem | Subsection titles |

#### Body (Paragraphs, descriptions)

| Class | Size | Use Case |
|-------|------|----------|
| `text-body-lg` | 1.125rem | Lead paragraphs |
| `text-body-md` | 1rem | Default body text |
| `text-body-sm` | 0.875rem | Secondary text, descriptions |
| `text-body-xs` | 0.75rem | Small helper text |

#### Labels (Form fields, buttons)

| Class | Size | Use Case |
|-------|------|----------|
| `text-label-lg` | 0.875rem | Primary labels, links |
| `text-label-md` | 0.8125rem | Form labels, menu items |
| `text-label-sm` | 0.75rem | Small labels, badges |

#### Special

| Class | Size | Use Case |
|-------|------|----------|
| `text-caption` | 0.75rem | Timestamps, metadata |
| `text-overline` | 0.6875rem | Category labels (use with `uppercase`) |

---

## Usage Guidelines

### DO ✅

```tsx
// Headings
<h1 className="text-display-lg text-foreground">Page Title</h1>
<h2 className="text-heading-lg text-foreground">Section Title</h2>
<h3 className="text-heading-md text-foreground">Card Title</h3>

// Body text
<p className="text-body-md text-foreground">Main content here.</p>
<p className="text-body-sm text-muted-foreground">Secondary description.</p>

// Labels
<label className="text-label-md text-foreground">Form Label</label>
<span className="text-label-sm text-muted-foreground">Helper text</span>

// Captions and metadata
<span className="text-caption text-muted-foreground">2 hours ago</span>
<span className="text-overline uppercase text-muted-foreground">Category</span>

// Status messages
<div className="bg-error-light text-error text-body-sm">Error message</div>
<div className="bg-success-light text-success text-body-sm">Success!</div>
```

### DON'T ❌

```tsx
// Avoid raw Tailwind sizes
<h1 className="text-lg font-semibold">Title</h1>  // ❌
<h1 className="text-heading-lg text-foreground">Title</h1>  // ✅

// Avoid hardcoded colors
<p className="text-gray-500">Text</p>  // ❌
<p className="text-muted-foreground">Text</p>  // ✅

// Avoid combining size + weight manually
<span className="text-sm font-medium">Label</span>  // ❌
<span className="text-label-md">Label</span>  // ✅
```

---

## Common Patterns

### Form Fields

```tsx
<div>
  <label className="block text-label-md text-foreground mb-1">
    Email Address
  </label>
  <input
    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
  />
  <p className="mt-1 text-caption text-muted-foreground">
    We'll never share your email.
  </p>
</div>
```

### Cards

```tsx
<div className="bg-card border border-border rounded-lg p-4">
  <h3 className="text-heading-md text-card-foreground">Card Title</h3>
  <p className="text-body-sm text-muted-foreground mt-1">
    Card description goes here.
  </p>
</div>
```

### Overlays/Modals

```tsx
<div className="bg-card shadow-xl">
  <div className="p-4 border-b border-border">
    <h2 className="text-heading-lg text-foreground">Modal Title</h2>
  </div>
  <div className="p-4">
    <p className="text-body-md text-foreground">Modal content</p>
  </div>
</div>
```

### Buttons

```tsx
// Primary button
<button className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary-hover rounded-lg text-label-md">
  Save Changes
</button>

// Secondary button
<button className="px-4 py-2 bg-muted text-foreground hover:bg-muted/80 rounded-lg text-label-md">
  Cancel
</button>

// Text button
<button className="text-body-sm text-muted-foreground hover:text-foreground">
  Learn more
</button>
```

### Error States

```tsx
<div className="p-3 bg-error-light border border-error/30 rounded-lg">
  <p className="text-body-sm text-error">Something went wrong</p>
</div>
```

### Success States

```tsx
<div className="p-3 bg-success-light border border-success/30 rounded-lg">
  <p className="text-body-sm text-success">Operation completed!</p>
</div>
```

---

## Quick Reference

### Typography Quick Pick

| Use Case | Class |
|----------|-------|
| Page title | `text-heading-xl` or `text-display-*` |
| Section header | `text-heading-lg` |
| Card/modal title | `text-heading-md` |
| Body text | `text-body-md` |
| Secondary text | `text-body-sm text-muted-foreground` |
| Form labels | `text-label-md` |
| Buttons | `text-label-md` or `text-body-sm` |
| Badges | `text-label-sm` or `text-caption` |
| Timestamps | `text-caption text-muted-foreground` |

### Color Quick Pick

| Use Case | Class |
|----------|-------|
| Primary text | `text-foreground` |
| Secondary text | `text-muted-foreground` |
| Primary action | `bg-primary text-primary-foreground` |
| Page background | `bg-background` |
| Card background | `bg-card` |
| Borders | `border-border` |
| Error | `text-error`, `bg-error-light` |
| Success | `text-success`, `bg-success-light` |
| Warning | `text-warning`, `bg-warning-light` |
| Info/Links | `text-info` |

---

## Files Reference

- **CSS Variables**: `src/app/globals.css`
- **Tailwind Config**: `tailwind.config.ts`
- **This Guide**: `src/styles/DESIGN_SYSTEM.md`
