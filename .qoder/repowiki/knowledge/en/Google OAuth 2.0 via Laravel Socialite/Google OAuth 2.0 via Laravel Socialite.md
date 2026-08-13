---
kind: external_dependency
name: Google OAuth 2.0 via Laravel Socialite
slug: google-oauth
category: external_dependency
category_hints:
    - auth_protocol
    - vendor_identity
scope:
    - '**'
---

Google is configured as a Socialite provider in `config/services.php` with `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI`. The `OAuthProvider::Google` enum and `OauthAccount` model store the resulting provider/user mapping, enabling users to link their Google account to a Resnet Academy user.