---
kind: external_dependency
name: Bunny Stream Video Hosting
slug: bunny-stream
category: external_dependency
category_hints:
    - vendor_identity
    - client_constraint
scope:
    - '**'
---

Videos are hosted on Bunny Stream and are intentionally kept separate from the R2/S3 object storage pipeline — they never touch the application's filesystem disks. This separation means video assets are streamed directly from Bunny rather than being downloaded and re-hosted.