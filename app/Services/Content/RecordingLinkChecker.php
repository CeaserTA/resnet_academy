<?php

declare(strict_types=1);

namespace App\Services\Content;

use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * Best-effort check that a pasted recording link is actually viewable by a student, rather than
 * one that silently bounces them to a sign-in or "request access" page.
 *
 * This is a safeguard, not a guarantee: providers change their markup, and a link can be
 * restricted to a domain that happens to include the server. It exists to catch the common
 * mistake — pasting a Drive link still set to "restricted", or a Zoom recording behind a
 * passcode — at the moment the admin saves it, instead of letting a student discover it later.
 * A failed check never blocks the save; it returns a warning for the UI to surface.
 */
final class RecordingLinkChecker
{
    private const TIMEOUT_SECONDS = 8;

    /** Markers that mean "you are looking at an access wall, not the recording". */
    private const ACCESS_WALL_HOSTS = [
        'accounts.google.com',
        'login.microsoftonline.com',
        'signin.aws.amazon.com',
    ];

    private const ACCESS_WALL_PHRASES = [
        'request access',
        'you need access',
        'sign in to continue',
        'enter the passcode',
        'this recording is password protected',
        'passcode required',
        'access denied',
        'permission denied',
        'you need permission',
    ];

    /**
     * @return array{ok: bool, reason: ?string}
     */
    public function check(string $url): array
    {
        if (! $this->isPubliclyAddressable($url)) {
            return [
                'ok' => false,
                'reason' => 'That does not look like a public web address. Paste the sharing link from Zoom or Google Drive.',
            ];
        }

        try {
            $response = Http::timeout(self::TIMEOUT_SECONDS)
                ->withHeaders(['User-Agent' => 'Mozilla/5.0 (compatible; ResnetAcademy link check)'])
                ->get($url);
        } catch (Throwable $e) {
            // Network failures are inconclusive, not proof the link is bad — say so plainly
            // rather than claiming the recording is broken. The raw transport error ("cURL error
            // 28: …") means nothing to an instructor, so it goes to the log, not the UI.
            logger()->info('Recording link check could not reach URL', ['url' => $url, 'error' => $e->getMessage()]);

            return [
                'ok' => false,
                'reason' => 'We couldn’t reach that link to check it. Open it in a private browser window to make sure students can view it.',
            ];
        }

        if ($response->status() === 401 || $response->status() === 403) {
            return [
                'ok' => false,
                'reason' => 'That link returned "not authorised" ('.$response->status().'), so students will not be able to open it. Set sharing to "Anyone with the link can view".',
            ];
        }

        if ($response->status() >= 400) {
            return [
                'ok' => false,
                'reason' => 'That link returned HTTP '.$response->status().'. Check the address is correct and the recording still exists.',
            ];
        }

        // A redirect to a provider's sign-in host is the clearest signal of a restricted link.
        $finalUrl = $this->finalUrl($response, $url);
        foreach (self::ACCESS_WALL_HOSTS as $host) {
            if (str_contains(mb_strtolower($finalUrl), $host)) {
                return [
                    'ok' => false,
                    'reason' => 'That link redirects to a sign-in page ('.$host.'), so only people already logged in to that account can open it. Set sharing to "Anyone with the link can view".',
                ];
            }
        }

        $body = mb_strtolower((string) $response->body());
        foreach (self::ACCESS_WALL_PHRASES as $phrase) {
            if (str_contains($body, $phrase)) {
                return [
                    'ok' => false,
                    'reason' => 'That page looks like an access prompt ("'.$phrase.'") rather than the recording. Check it is not passcode-protected or restricted.',
                ];
            }
        }

        return ['ok' => true, 'reason' => null];
    }

    /**
     * Refuses anything that is not plain http(s) to a public host. Without this the check would
     * be an SSRF primitive: an admin could paste an internal address and use the server to probe
     * hosts the browser cannot reach.
     */
    private function isPubliclyAddressable(string $url): bool
    {
        $parts = parse_url($url);

        if ($parts === false || ! isset($parts['scheme'], $parts['host'])) {
            return false;
        }

        if (! in_array(mb_strtolower($parts['scheme']), ['http', 'https'], true)) {
            return false;
        }

        $host = $parts['host'];

        if (in_array(mb_strtolower($host), ['localhost', 'localhost.localdomain'], true)) {
            return false;
        }

        // Resolve once and reject private/reserved space. A hostname that resolves internally is
        // rejected here rather than after the request has already been made.
        $ip = filter_var($host, FILTER_VALIDATE_IP) ? $host : gethostbyname($host);

        if (! filter_var($ip, FILTER_VALIDATE_IP)) {
            return false;
        }

        return filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false;
    }

    /** Laravel's client follows redirects; recover where it actually ended up. */
    private function finalUrl(mixed $response, string $fallback): string
    {
        try {
            $uri = $response->effectiveUri();

            return $uri !== null ? (string) $uri : $fallback;
        } catch (Throwable) {
            return $fallback;
        }
    }
}
