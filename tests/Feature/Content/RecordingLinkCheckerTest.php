<?php

declare(strict_types=1);

use App\Services\Content\RecordingLinkChecker;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

/**
 * The checker exists to catch the common mistake — pasting a Drive link still set to
 * "restricted", or a Zoom recording behind a passcode — at the moment the admin saves it. It is
 * best-effort by design: it must never block a save, only warn.
 */
it('accepts a link that serves the recording page', function (): void {
    Http::fake(['*' => Http::response('<html><body>Recording player</body></html>', 200)]);

    $result = app(RecordingLinkChecker::class)->check('https://drive.google.com/file/d/abc123/view');

    expect($result['ok'])->toBeTrue();
    expect($result['reason'])->toBeNull();
});

it('warns when the link returns not-authorised', function (): void {
    Http::fake(['*' => Http::response('nope', 403)]);

    $result = app(RecordingLinkChecker::class)->check('https://drive.google.com/file/d/abc123/view');

    expect($result['ok'])->toBeFalse();
    expect($result['reason'])->toContain('not authorised');
});

it('warns when the page is an access prompt rather than the recording', function (): void {
    Http::fake(['*' => Http::response('<html><body>You need access. Request access to this item.</body></html>', 200)]);

    $result = app(RecordingLinkChecker::class)->check('https://drive.google.com/file/d/abc123/view');

    expect($result['ok'])->toBeFalse();
    expect($result['reason'])->toContain('access prompt');
});

it('warns when a Zoom recording is passcode protected', function (): void {
    Http::fake(['*' => Http::response('<html><body>Please enter the passcode to watch</body></html>', 200)]);

    $result = app(RecordingLinkChecker::class)->check('https://zoom.us/rec/share/abc123');

    expect($result['ok'])->toBeFalse();
    expect($result['reason'])->toContain('access prompt');
});

it('warns rather than claiming success when the link cannot be reached at all', function (): void {
    Http::fake(fn () => throw new ConnectionException('Connection timed out'));

    $result = app(RecordingLinkChecker::class)->check('https://drive.google.com/file/d/abc123/view');

    expect($result['ok'])->toBeFalse();
    expect($result['reason'])->toContain('reach that link');
    // The transport error is for the log, not the instructor reading the warning.
    expect($result['reason'])->not->toContain('Connection timed out');
});

it('refuses to fetch anything that is not a public http(s) address', function (string $url): void {
    // Without this the checker would be an SSRF primitive: an admin could paste an internal
    // address and use the server to probe hosts their browser cannot reach.
    Http::fake(['*' => Http::response('should never be requested', 200)]);

    $result = app(RecordingLinkChecker::class)->check($url);

    expect($result['ok'])->toBeFalse();
    Http::assertNothingSent();
})->with([
    'localhost' => 'http://localhost/admin',
    'loopback ip' => 'http://127.0.0.1:8000/api/v1/courses',
    'private range' => 'http://192.168.1.1/',
    'file scheme' => 'file:///etc/passwd',
]);
