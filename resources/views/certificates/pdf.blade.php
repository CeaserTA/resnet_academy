<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: sans-serif; text-align: center; padding: 80px 60px; color: #1a1a1a; }
        .border { border: 6px double #1d4ed8; padding: 60px; }
        h1 { font-size: 14px; letter-spacing: 4px; text-transform: uppercase; color: #64748b; margin-bottom: 40px; }
        .student { font-size: 32px; font-weight: bold; margin: 20px 0; }
        .course { font-size: 22px; margin: 20px 0; color: #1d4ed8; }
        .meta { margin-top: 60px; font-size: 12px; color: #64748b; }
    </style>
</head>
<body>
    <div class="border">
        <h1>Certificate of Completion</h1>
        <p>This certifies that</p>
        <p class="student">{{ $studentName }}</p>
        <p>has successfully completed</p>
        <p class="course">{{ $courseTitle }}</p>
        <div class="meta">
            <p>Certificate No. {{ $certificateNumber }}</p>
            <p>Issued {{ $issuedAt }}</p>
        </div>
    </div>
</body>
</html>
