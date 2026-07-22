# UI Context — Resnet LMS

Design system for the React frontend. Companion to `architecture.md` (component structure) and
`code-standards.md` §4 (frontend conventions). This is a working dashboard product for three
distinct roles, not a marketing site — the design has to hold up over hundreds of daily-use
screens (gradebooks, module lists, forums), not just look good on a landing page.

**Primary color: blue.** Everything below is built around that, but a single flat blue used
everywhere reads generic — the palette gives it a specific hue, a supporting neutral, and one
warm accent so the product has an identity rather than just "the default blue theme."

---

## 1. Design principles for this product

- **Clarity over decoration.** A student needs to know in half a second whether a module is
  locked, in progress, or done. Status is communicated by color + icon + label together, never
  color alone (colorblind-safe, and matches the accessibility requirement in `architecture.md`).
- **One accent, spent deliberately.** Blue carries navigation, structure, and primary actions.
  The warm accent (amber) is reserved for moments that deserve attention — a newly unlocked
  module, a certificate, a due-soon warning — not buttons in general. If everything is
  highlighted, nothing is.
- **Consistent status vocabulary.** The same status a database enum uses (`schema.sql`) is the
  same word and the same color shown to the user everywhere in the app. Don't let "in progress"
  in one screen become "ongoing" in another.
- **Restraint scales better than flourish.** This UI will be looked at daily by instructors
  grading dozens of submissions — the interface should recede and let the content (a video, a
  gradebook, a forum thread) be the thing people focus on.

---

## 2. Color system

### Primary — blue

| Token | Hex | Use |
|---|---|---|
| `blue-900` | `#0B2A54` | Highest-contrast text on light backgrounds, dark-mode surfaces |
| `blue-700` | `#123C7A` | Sidebar/nav background, headers |
| `blue-600` | `#1B4FA0` | **Primary brand color** — primary buttons, links, active nav state, focus rings |
| `blue-400` | `#4B79C4` | Hover states, secondary emphasis |
| `blue-100` | `#E3EAF7` | Selected-row backgrounds, subtle info banners, chart fills |
| `blue-50` | `#F3F6FC` | Page background tint (used sparingly, not on every surface) |

`blue-600` (`#1B4FA0`) is *the* Resnet Blue — a deep, slightly cool royal blue rather than a
generic Bootstrap/Material blue. It's the color on the logo mark, the primary button, and the
active state in navigation. Don't substitute a different blue shade for these three uses.

### Accent — warm amber (used sparingly)

| Token | Hex | Use |
|---|---|---|
| `amber-500` | `#E8A33D` | "Newly unlocked," certificate/achievement moments, due-soon highlight |
| `amber-100` | `#FBEBD2` | Background for the above, in banners/badges |

This is the one warm note against an otherwise cool, structured palette — reserved for the
handful of moments in §1 above. It is never a default button color.

### Neutrals

| Token | Hex | Use |
|---|---|---|
| `ink-900` | `#151A24` | Body text (a warm-black, not pure `#000`, paired with the blue family) |
| `ink-600` | `#4A5568` | Secondary text, labels |
| `ink-300` | `#A0AEC0` | Placeholder text, disabled state, dividers |
| `surface-0` | `#FFFFFF` | Cards, modals, primary content surfaces |
| `surface-50` | `#F7F8FA` | App background |
| `surface-100` | `#EDEFF3` | Table stripes, input backgrounds |

### Semantic (status — maps directly to `schema.sql` enums)

| Token | Hex | Maps to |
|---|---|---|
| `success-600` | `#1F8A55` | `completed`, `passed`, `graded`, `paid` |
| `progress-600` | `blue-600` (`#1B4FA0`) | `in_progress`, `submitted` |
| `neutral-500` | `ink-300` (`#A0AEC0`) | `not_started`, `locked` |
| `warning-600` | `amber-500` (`#E8A33D`) | due-soon, late-but-accepted submission |
| `danger-600` | `#C0392B` | `failed`, validation errors, `suspended`, overdue/blocking states |

Reusing `blue-600` for "in progress" keeps the palette tight — it's already the primary color, so
an in-progress badge reads as "the system is actively tracking this," not as a fourth unrelated
hue.

### What to avoid

- Don't reach for a warm cream background + terracotta accent, a near-black theme with a neon
  accent, or a hairline-rule broadsheet layout — none of those fit a blue-led, dashboard-dense
  product, and all three are current AI-design defaults worth deliberately avoiding.
- Don't introduce a second blue shade for "links" that isn't `blue-600`/`blue-400` — one blue
  family, used consistently, is what makes the palette read as intentional rather than default.

---

## 3. Typography

| Role | Typeface | Notes |
|---|---|---|
| Display / headings | **Sora** | Geometric, slightly technical — used for page titles, module/course names. Weight 600–700 only; don't use it for body copy. |
| Body | **Inter** | High legibility at small sizes, wide language support (relevant given the multi-role, potentially multi-language user base). Weight 400 body, 500 for emphasis. |
| Data / utility | **IBM Plex Mono** | Gradebook numbers, timestamps, certificate numbers, code-like identifiers — anywhere tabular alignment matters. |

**Scale** (rem, 16px base): `12` caption · `14` body-small · `16` body · `18` body-large ·
`22` H3 · `28` H2 · `36` H1. Line height 1.5 for body, 1.2 for headings.

Headings use `ink-900`, not `blue-600` — color is reserved for interactive/status elements, not
spent on every title, or it stops meaning anything.

---

## 4. Layout & spacing

- Spacing scale: 4px base unit (4, 8, 12, 16, 24, 32, 48, 64). No arbitrary one-off values.
- Primary app shell: fixed left sidebar (role-aware navigation) + content area. Sidebar uses
  `blue-700` background with `surface-0` text — the one place blue is a background, not just an
  accent, so the product's identity is visible even when the content area is neutral.
- Content surfaces are white (`surface-0`) cards on a `surface-50` page background — not white
  content directly on white background with no separation.
- Breakpoints: mobile `< 640px`, tablet `640–1024px`, desktop `> 1024px`. Sidebar collapses to a
  bottom nav or drawer below `1024px` — required, not optional, per the PRD's mobile
  responsiveness requirement.
- Grid: 12-column on desktop, single column on mobile. Course catalogue and module lists use a
  responsive card grid (`grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`), not a
  fixed column count that breaks at odd widths.

---

## 5. Iconography

- **Lucide** icon set, consistently — stroke-based, matches the geometric feel of Sora, and is
  already available in this environment's component libraries. Don't mix in a second icon set.
- Icon + label together for anything status-related (a lock icon alone isn't enough — pair it
  with the word "Locked").
- Icon weight/size: 16px inline with text, 20px in buttons/nav, 24px for empty-state illustration
  anchors. No icon stands alone as the only affordance for a destructive action.

---

## 6. Component patterns

### Buttons
- **Primary** (`blue-600` fill, white text) — one per view/section for the single most important
  action ("Submit assignment", "Enrol"). Not every action gets a primary button.
- **Secondary** (`blue-600` outline, `blue-600` text, transparent fill) — supporting actions.
- **Ghost/tertiary** (no border, `ink-600` text) — low-emphasis actions (Cancel, Skip).
- **Destructive** (`danger-600`) — delete/withdraw/suspend actions only, always with a
  confirmation step.

### Status badges
Pill-shaped, colored background at 15% opacity of the semantic token + full-opacity text/icon in
that token color (e.g. a "Completed" badge: `success-600` text on a pale green fill). Label text
matches the enum values in `schema.sql` in plain English (`in_progress` → "In progress", not
"Ongoing" or "Active").

### Progress indicators
- Module/course completion: horizontal bar, `blue-600` fill, `surface-100` track.
- Video watch progress: thin bar under the video player, switches to `success-600` at the 90%
  completion threshold — a visible, honest reflection of the same number the Progress Engine
  uses server-side, not a separate client-side approximation.

### Cards (course/module lists)
White surface, 1px `surface-100` border, subtle shadow on hover only (not resting state — a flat
list shouldn't look like it's floating by default). Locked modules render at reduced opacity
(~60%) with a lock icon, never simply hidden — a student should see the shape of the course even
before it unlocks.

### Tables (gradebook, submissions, admin lists)
Zebra striping (`surface-100` on alternate rows), sticky header on scroll, numeric columns
right-aligned in `IBM Plex Mono`. Row-level actions appear on hover, not permanently visible
clutter.

### Empty states
Every empty list (no forum posts yet, no submissions yet, no courses enrolled) gets a short,
direct message plus the one relevant action — "You haven't enrolled in any courses yet" +
"Browse the catalogue" — not a bare "No data" or a decorative illustration with no next step.

### Errors & validation
Inline, next to the field, in `danger-600`, stated plainly: "Due date must be after the start
date," not "Invalid input." Toasts for system-level errors (failed save, network issue), inline
messages for form validation — don't use a toast for something the user needs to keep looking at
while they fix it.

---

## 7. Motion

Used to confirm state changes, not to decorate: a module card transitioning from locked to
unlocked animates its opacity/icon change (short, ~200ms); a submitted assignment gives a brief
confirmation state on the button before returning to normal. No page-load animation sequences, no
scroll-triggered reveals — this is a tool people use daily, not a one-time landing experience.
`prefers-reduced-motion` is respected everywhere; every animation has a static equivalent.

---

## 8. Accessibility

- Text contrast meets WCAG 2.1 AA against its background at every token pairing above (`ink-900`
  on `surface-0`/`surface-50`, white on `blue-600`, etc. — verify any new color addition against
  this before shipping it).
- Visible keyboard focus ring in `blue-600` at 2px, on every interactive element, no exceptions
  for "it looked cleaner without it."
- Status is never color-only (see §1) — icon and text label always accompany a status color.
- Video resources display captions (`resources.resource_videos.caption_url`) with a visible
  toggle, not buried in a settings menu.

---

## 9. Voice & content

- Active voice, plain terms, from the user's side of the screen: "Submit assignment," not
  "Assignment submission process initiated." A button's label and its resulting confirmation use
  the same verb ("Submit" → "Submitted," not "Submit" → "Your work has been received").
- Name things the way the PRD and schema already do — "module," "evaluation," "enrolment" — not
  synonyms invented per screen.
- Errors state what happened and how to fix it, without apologizing or being vague: "This file is
  larger than 50MB. Compress it or choose a smaller file," not "Oops, something went wrong."

---

## 10. Quick reference — do / don't

| Do | Don't |
|---|---|
| One `blue-600` primary action per view | Multiple competing primary buttons on one screen |
| Status = color + icon + label | Status = color alone |
| Amber reserved for unlock/achievement/due-soon moments | Amber as a general accent or button color |
| Lucide icons throughout | Mixing icon sets |
| Same status words as `schema.sql` enums | Inventing friendlier synonyms per screen |
| Locked content shown, dimmed | Locked content hidden entirely |
