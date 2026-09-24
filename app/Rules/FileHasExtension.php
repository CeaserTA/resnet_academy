<?php

declare(strict_types=1);

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Http\UploadedFile;

/**
 * Validates an uploaded file's extension against an allowlist using the client-supplied
 * filename, instead of Laravel's built-in `mimes:` rule (which checks `UploadedFile::
 * guessExtension()` — the extension Symfony's Fileinfo-based mime guesser derives from the
 * file's actual content). Real Word/PowerPoint documents are OOXML zip archives, and depending
 * on internal file ordering and the server's libmagic database, that guesser frequently reports
 * a generic `application/zip` or `application/octet-stream` for a perfectly valid .docx/.pptx,
 * failing `mimes:docx,pptx,...` even though the file is genuinely what its name says it is.
 * Resource uploads are already gated to authenticated admins/instructors (see
 * StoreResourceRequest::authorize()), so trusting the filename extension here — the same trust
 * boundary the browser's own file picker already applies via its `accept` attribute — is an
 * acceptable trade-off for actually letting real Office documents through.
 */
final class FileHasExtension implements ValidationRule
{
    /**
     * @param  array<int, string>  $extensions
     */
    public function __construct(private readonly array $extensions) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! $value instanceof UploadedFile) {
            return;
        }

        $extension = strtolower($value->getClientOriginalExtension());

        if (! in_array($extension, $this->extensions, true)) {
            $fail('The '.$attribute.' field must be a file of type: '.implode(', ', $this->extensions).'.');
        }
    }
}
