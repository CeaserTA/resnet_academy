---
kind: external_dependency
name: Postmark Email Delivery Service
slug: postmark
category: external_dependency
scope:
    - '**'
---

Postmark is configured as a mailer transport and services entry keyed by `POSTMARK_API_KEY`. It participates in the round-robin mailer configuration alongside SES, providing a secondary delivery channel. A commented-out `message_stream_id` option indicates the team may switch to Postmark Streams.