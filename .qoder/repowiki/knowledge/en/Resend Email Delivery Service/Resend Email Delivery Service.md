---
kind: external_dependency
name: Resend Email Delivery Service
slug: resend
category: external_dependency
category_hints:
    - vendor_identity
    - auth_protocol
scope:
    - '**'
---

Resend is registered as both a mailer transport (`mailers.resend.transport = 'resend'`) and a services entry keyed by `RESEND_API_KEY` in `config/services.php`. It is one of several available transports (smtp, ses, postmark, resend, sendmail, log) and can be selected via `MAIL_MAILER`. The package `resend/resend-laravel` provides the Laravel integration.