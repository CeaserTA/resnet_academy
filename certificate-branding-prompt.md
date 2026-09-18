# Task: Certificate branding and trust elements

The auto-generated certificate (see attached reference image) currently has no institutional branding at all — no logo, no institution name anywhere on it, nothing tying it back to ResNet Academy. Update the certificate template to add branding and a few trust/credibility elements.

**First step:** find how the certificate is actually rendered (e.g. an HTML template converted to PDF, or something else) so the rest of this can be scoped to the real implementation rather than assumed.

## Must add — branding
- ResNet Academy logo, placed prominently (top of the certificate).
- The institution's full name printed on the certificate itself — right now only the course name appears; nothing states who issued it.
- Footer with the website URL and/or the certificate verification page URL.

**Note on assets:**
- Logo: no need for a separate logo file — use the "ResNet Academy" name paired with the graduation-cap icon already used on the homepage, styled consistently with how it appears there.
- Signature/seal: use a sample/placeholder signature and seal graphic for now (these can be swapped for real ones later) — don't block the rest of this task on sourcing real ones.

 trust/credibility
- **QR code** linking to the certificate verification modal, pre-filled with the certificate number so scanning it lands directly on the "valid" result — no manual entry needed. (This pairs with the existing verification modal work— confirm the URL format matches what that page expects.)
- **Signature line** — instructor/program director name and title, rendered in a signature-style font or an actual signature image if one becomes available.
- **Official seal/stamp graphic** near the signature.
- **Course duration/completion period** (e.g. "Aug – Sep 2026"), distinct from the existing "Issued" date, if that data is available on the course/cohort.

## Polish — lower priority
- Render the student's name in a distinct script/serif font, separate from the rest of the certificate's typeface.
- Subtle background watermark (faint logo or pattern) for visual depth and light forgery-resistance.

Leave everything else about the current layout, spacing, and course-name accent color as-is — no need to touch what's already working.

## Testing
- Generate a certificate for a completed course and visually confirm: logo, institution name, footer/URL, QR code (scan it and confirm it opens the correct verification result), signature area, and seal all render correctly in the output PDF.
- Confirm the layout doesn't break for a long student name or long course name (check for overlap/overflow).
- Confirm existing certificates (already generated before this change) still open/download correctly — this should only affect the template used for new renders, not break access to already-issued ones.
- Log any friction or inconsistency found, with evidence — only real issues.
