---
kind: frontend_style
name: Tailwind CSS v4 + shadcn/ui Design System with Custom Tokens
category: frontend_style
scope:
    - '**'
source_files:
    - frontend/package.json
    - frontend/components.json
    - frontend/src/index.css
    - frontend/vite.config.ts
    - frontend/src/lib/utils.ts
    - frontend/src/components/ui/Button.tsx
    - frontend/src/components/ui/Card.tsx
    - frontend/src/components/ui/Badge.tsx
    - frontend/src/components/ui/Input.tsx
    - frontend/src/components/ui/Select.tsx
    - frontend/src/components/ui/Modal.tsx
    - frontend/src/components/ui/Tooltip.tsx
    - frontend/src/components/ui/Avatar.tsx
    - frontend/src/components/ui/ProgressBar.tsx
    - frontend/src/components/ui/Skeleton.tsx
    - frontend/src/components/ui/StarRating.tsx
---

## What system/approach is used

The frontend (`frontend/`) is a React 19 + Vite SPA styled exclusively with **Tailwind CSS v4** (via `@tailwindcss/vite` plugin, no legacy `tailwind.config.js`). Visual primitives are built on top of **shadcn/ui** (configured via `components.json`, style `base-nova`, RSC disabled) and composed from Radix UI primitives (`@radix-ui/react-*`). Component styling uses **class-variance-authority (cva)** for variant-driven components and **clsx + tailwind-merge** through a shared `cn()` helper in `src/lib/utils.ts`. Icons come from **lucide-react**. Fonts are loaded via Google Fonts: Inter (body), Sora (display), IBM Plex Mono (monospace). There is no Sass/Less; all styles live in `src/index.css` and inline Tailwind utility classes.

## Key files and packages

- `frontend/package.json` — declares Tailwind v4, `@tailwindcss/vite`, shadcn, Radix UI, cva, clsx, tailwind-merge, lucide-react, react-hook-form + zod validation.
- `frontend/components.json` — shadcn/ui configuration: `style: base-nova`, `tsx: true`, `rsc: false`, `baseColor: neutral`, aliases `@/components`, `@/lib/utils`, `@/components/ui`, `@/hooks`.
- `frontend/src/index.css` — single source of truth for the design system. Declares the `@theme` block with custom semantic tokens (`--color-blue-*`, `--color-ink-*`, `--color-surface-*`, `--color-success/warning/danger-*`) and maps them to shadcn-compatible CSS variables (`--color-primary`, `--color-background`, `--color-card`, `--color-ring`, etc.). Also defines font families and global `@layer base` rules (body typography, heading styles, `:focus-visible` outline).
- `frontend/vite.config.ts` — registers `react()` and `@tailwindcss/vite` plugins, sets `@` alias to `src/`.
- `frontend/src/lib/utils.ts` — exports `cn(...inputs)` that merges class names via `clsx` + `tailwind-merge`; also contains non-styling helpers like `formatRelativeTime`.
- `frontend/src/components/ui/*` — hand-built primitive components (Button, Card, Badge, Input, Select, Modal, Tooltip, Avatar, ProgressBar, Skeleton, StarRating, StatCard, etc.) that compose Tailwind utilities and shadcn tokens rather than importing prebuilt shadcn components.
- `frontend/@/components/ui/card.tsx` and `select.tsx` — vendored shadcn-style primitives under the root `@/components/ui` path.

## Architecture and conventions

1. **Design tokens over raw colors.** All brand colors are defined as CSS custom properties in `@theme` (`--color-blue-600`, `--color-ink-900`, `--color-surface-0`, `--color-danger-600`, …) and referenced throughout components by their Tailwind-prefixed forms (`bg-blue-600`, `text-ink-900`, `border-surface-100`). The shadcn variable layer (`--color-primary`, `--color-destructive`, …) is aliased onto these tokens so shadcn-generated class names resolve to the app palette.

2. **Primitive component pattern.** Each UI primitive lives in `src/components/ui/<Name>.tsx`, uses `forwardRef`, composes variants via `cva`, and merges user className via `cn()`. Example: `Button.tsx` defines `buttonVariants` with `variant` (`primary | secondary | ghost | destructive | outline`) and `size` (`default | sm | lg | icon`) plus an `isLoading` spinner and `asChild` slot support via `@radix-ui/react-slot`.

3. **Feature-scoped composition.** Domain features live under `src/features/<feature>/` (e.g. `auth`, `catalogue`, `learning`, `assessment`, `admin`, `communication`, `sections`, `profile`, `progress`, `reviews`, `analytics`, `enrolment`, `courseStructure`, `courseApplications`, `forums`). Feature folders compose the shared `@/components/ui` primitives into page-level screens. Top-level pages (`src/pages/`) host only public marketing routes (About, Contact, Landing, NotFound).

4. **Typography & spacing.** Body text uses `font-body` (Inter); headings use `font-display` (Sora); monospace uses `font-mono` (IBM Plex Mono). Global base layer applies `antialiased`, background/foreground tokens, and consistent focus outlines (`outline-primary`).

5. **Responsive strategy.** No custom breakpoints or media queries are declared; responsiveness is achieved entirely through Tailwind's responsive prefixes (e.g. `md:`, `lg:`) applied directly in component classNames.

6. **Validation-driven form styling.** Forms combine `react-hook-form` with `zod` resolvers; error states are surfaced via semantic tokens (`danger-600`) rather than ad-hoc colors.

## Conventions and constraints

- **No `tailwind.config.js`** — Tailwind v4 is configured entirely inside `src/index.css` via `@theme`. Adding new colors or fonts must go there.
- **All color usage goes through token variables** — components reference `bg-blue-600`, `text-ink-600`, `border-surface-100`, `bg-danger-600`, etc., never hard-coded hex values.
- **Component className merging rule** — every UI primitive accepts a `className` prop and passes it through `cn(defaultClasses, className)` so callers can override without duplication.
- **Variant-driven styling** — multi-state components (Button, etc.) declare their visual variants via `cva` rather than conditional props, keeping class logic centralized.
- **shadcn compatibility layer** — shadcn CSS variables are re-mapped to the app's semantic tokens at the bottom of `@theme`; this ensures any shadcn-generated class (e.g. `bg-primary`, `border-input`, `ring-ring`) resolves to the Resnet Academy palette.
- **Font loading** — fonts are imported via `@import url('...')` at the top of `index.css` and exposed as CSS variables (`--font-display`, `--font-body`, `--font-mono`) consumed via `font-family` utilities.
- **Accessibility baseline** — `:focus-visible` gets a consistent `outline-2 outline-offset-2 outline-primary` ring globally; icons used as decorative elements include `aria-hidden="true"` (see Button's loader spinner).
- **Build pipeline** — Vite compiles TypeScript then runs Tailwind v4 via its Vite plugin; production builds go through `vite build`.