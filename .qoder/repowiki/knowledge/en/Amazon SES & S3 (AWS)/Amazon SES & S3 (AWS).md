---
kind: external_dependency
name: Amazon SES & S3 (AWS)
slug: amazon-ses
category: external_dependency
category_hints:
    - vendor_identity
    - auth_protocol
scope:
    - '**'
---

SES is configured as a mail transport (`mailers.ses`) and as an S3 filesystem disk (`disks.s3`) sharing the same AWS credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION`, `AWS_BUCKET`, `AWS_URL`, `AWS_ENDPOINT`). The S3 disk driver is provided by `league/flysystem-aws-s3-v3`. SES also appears in the round-robin failover mailer alongside Postmark. Region defaults to `us-east-1` when not set.