# Tasks

## 1. Fix: logged-in users appear logged out on public pages (catalogue, cohort, about, contact)

`LandingHeader` already supports an authenticated state (`isAuthenticated` prop — avatar/profile menu vs "Log in"/"Sign up"), but none of its call sites pass the prop, so it always defaults to `false` even when the user is logged in:

- `frontend/src/features/catalogue/CataloguePage.tsx`
- `frontend/src/features/catalogue/CohortPage.tsx`
- `frontend/src/pages/AboutPage.tsx`
- `frontend/src/pages/ContactPage.tsx`

Fix all four to pass the real auth state (ideally pull it from wherever the app already tracks the logged-in user/session — a shared auth context/hook — rather than wiring it separately at each page, so this can't regress the same way again). Verify: log in, then visit each of the four pages — the header should show the logged-in state, not the logged-out one.

## 2. Fix: saving the profile gives no confirmation or forward path

`/profile/complete` — filling in the required fields and clicking **Save profile** does persist correctly, but the page gives no feedback: no success message, the form stays visible, and the "Complete your profile" banner doesn't update. The user has no way to tell whether the click worked.

Fix so that on a successful save:
- Show a clear success confirmation (toast/banner message).
- Update the profile-completion banner/progress immediately to reflect the new state (it should no longer say the profile is incomplete once it is).
- Send the user forward toward what the profile unlocks (e.g. back to the course application flow they came from, or wherever makes sense given the surrounding flow) rather than leaving them stuck on the same form.

Verify: complete the required fields, save, and confirm the user sees success feedback and an updated banner without needing to reload or navigate away manually.
