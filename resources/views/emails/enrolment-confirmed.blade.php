<!doctype html>
<html>
<body style="font-family: Inter, Arial, sans-serif; color: #151A24; background: #F7F8FA; padding: 24px;">
    <div style="max-width: 480px; margin: 0 auto; background: #FFFFFF; border: 1px solid #EDEFF3; border-radius: 8px; padding: 32px;">
        <h1 style="font-size: 22px; color: #151A24; margin-top: 0;">You're confirmed</h1>
        <p>Hi {{ $enrolment->student->name }},</p>
        <p>
            You're enrolled in <strong>{{ $enrolment->course->title }}</strong>. You can access
            the course as soon as it opens.
        </p>
        <p style="color: #4A5568; font-size: 14px;">
            Enrolled on {{ $enrolment->applied_at->format('d M Y') }}.
        </p>
    </div>
</body>
</html>
