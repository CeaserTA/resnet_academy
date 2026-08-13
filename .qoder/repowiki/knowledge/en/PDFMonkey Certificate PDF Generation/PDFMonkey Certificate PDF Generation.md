---
kind: external_dependency
name: PDFMonkey Certificate PDF Generation
slug: pdfmonkey
category: external_dependency
category_hints:
    - vendor_identity
    - sdk_real_api
scope:
    - '**'
---

Certificate PDFs are generated asynchronously via the `GenerateCertificatePdf` job, which calls the PDFMonkey API to render certificates from templates. The job runs on the queue so certificate generation does not block enrolment confirmation flows.