---
kind: external_dependency
name: Cloudflare R2 Object Storage (S3-compatible)
slug: cloudflare-r2
category: external_dependency
category_hints:
    - vendor_identity
    - client_constraint
scope:
    - '**'
---

R2 is configured as an S3-compatible filesystem disk named `r2` in `config/filesystems.php`, used for profile images, course thumbnails, resource files, forum attachments, payment receipts, and certificate PDFs. It authenticates via `R2_ACCESS_KEY` / `R2_SECRET_KEY` environment variables, targets bucket `R2_BUCKET`, uses path-style endpoints (`use_path_style_endpoint: true`), and connects to R2's private S3 API endpoint via `R2_ENDPOINT`. Public file URLs are built from `R2_URL`, which may be a custom domain or the default `*.r2.dev` bucket URL. Videos are explicitly excluded — they are hosted separately on Bunny Stream and never touch this disk. Region is hardcoded to `auto` because R2 has no real regions.