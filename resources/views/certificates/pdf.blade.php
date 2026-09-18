<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page { margin: 0; }
        body { font-family: sans-serif; text-align: center; padding: 48px 50px; color: #1a1a1a; }
        .border { border: 6px double #1d4ed8; padding: 34px 40px 28px; }

        /* Faint background mark, for visual depth and light forgery resistance.

           Neither of the two obvious approaches works here: dompdf paints positioned frames after
           in-flow content (so the mark lands on top of the text, punching pale holes through the
           glyphs), and its CSS background-image renderer goes through ext-gd, which cannot read
           an SVG and is not guaranteed to be installed. `z-index: -1` drops this image back into
           the same painting pass as the in-flow content, where — being the first element in the
           document — it is drawn before anything else. */
        .watermark { position: absolute; z-index: -1; top: 250px; left: 267px; width: 260px; height: 260px; }

        /* Brand lockup — the same graduation cap and wordmark the website header uses. */
        .brand { margin-bottom: 4px; }
        .brand img { width: 26px; height: 26px; vertical-align: middle; }
        .brand-name { font-size: 19px; font-weight: bold; color: #0f172a; letter-spacing: 0.5px; vertical-align: middle; padding-left: 6px; }
        .brand-rule { width: 90px; border: 0; border-top: 1px solid #bfdbfe; margin: 12px auto 22px; }

        h1 { font-size: 14px; letter-spacing: 4px; text-transform: uppercase; color: #64748b; margin-bottom: 32px; }
        .student { font-family: serif; font-size: 32px; font-weight: bold; margin: 20px 0; color: #0f172a; }
        .course { font-size: 22px; margin: 20px 0; color: #1d4ed8; }
        .period { font-size: 12px; color: #475569; margin-top: -8px; }
        .meta { margin-top: 34px; font-size: 12px; color: #64748b; }
        .meta p { margin: 4px 0; }

        /* dompdf has no flexbox — the signing row is a table. */
        .signing { width: 100%; margin-top: 30px; border-collapse: collapse; }
        .signing td { vertical-align: bottom; }
        .sign-cell { width: 45%; text-align: center; }
        .seal-cell { width: 25%; text-align: center; }
        .qr-cell { width: 30%; text-align: center; }
        .signature img { width: 150px; height: 48px; }
        .sign-rule { border-top: 1px solid #94a3b8; margin: 2px 24px 6px; }
        .sign-name { font-size: 12px; font-weight: bold; color: #0f172a; }
        .sign-title { font-size: 10px; color: #64748b; margin-top: 2px; }
        .seal img { width: 84px; height: 84px; }
        .qr img { width: 78px; height: 78px; }
        .qr-caption { font-size: 8px; color: #64748b; margin-top: 4px; letter-spacing: 0.4px; text-transform: uppercase; }

        .doc-footer { margin-top: 26px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #94a3b8; }
        .doc-footer span { color: #64748b; }

    </style>
</head>
<body>
    <img class="watermark" src="{{ $watermark }}" alt="">

    <div class="border">
        <div class="brand">
            <img src="{{ $logo }}" alt=""><span class="brand-name">{{ $institution }}</span>
        </div>
        <hr class="brand-rule">

        <h1>Certificate of Completion</h1>
        <p>This certifies that</p>
        <p class="student">{{ $studentName }}</p>
        <p>has successfully completed</p>
        <p class="course">{{ $courseTitle }}</p>
        @if ($studyPeriod)
            <p class="period">Course period: {{ $studyPeriod }}</p>
        @endif

        <div class="meta">
            <p>Certificate No. {{ $certificateNumber }}</p>
            <p>Issued {{ $issuedAt }}</p>
        </div>

        <table class="signing">
            <tr>
                <td class="qr-cell">
                    <div class="qr">
                        <img src="{{ $qrCode }}" alt="QR code linking to this certificate's verification page">
                        <p class="qr-caption">Scan to verify</p>
                    </div>
                </td>
                <td class="sign-cell">
                    <div class="signature"><img src="{{ $signature }}" alt=""></div>
                    <div class="sign-rule"></div>
                    <p class="sign-name">{{ $signatoryName }}</p>
                    <p class="sign-title">{{ $signatoryTitle }}</p>
                </td>
                <td class="seal-cell">
                    <div class="seal"><img src="{{ $seal }}" alt=""></div>
                </td>
            </tr>
        </table>

        <div class="doc-footer">
            <p>Issued by {{ $institution }} &bull; <span>{{ $website }}</span></p>
            <p>Verify this certificate at <span>{{ $verificationUrl }}</span></p>
        </div>
    </div>
</body>
</html>
