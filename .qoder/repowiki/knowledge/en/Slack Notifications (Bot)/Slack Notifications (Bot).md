---
kind: external_dependency
name: Slack Notifications (Bot)
slug: slack
category: external_dependency
category_hints:
    - vendor_identity
    - auth_protocol
scope:
    - '**'
---

Slack is configured under `services.slack.notifications` with a bot OAuth token (`SLACK_BOT_USER_OAUTH_TOKEN`) and a default channel (`SLACK_BOT_USER_DEFAULT_CHANNEL`). This enables sending Slack messages via Laravel's notification channel.