<?php

declare(strict_types=1);

namespace App\Services\Storage;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * The single seam every upload in this app goes through — profile images, course thumbnails,
 * resource files, forum attachments, payment receipts, and generated certificate PDFs all store
 * to the same Cloudflare R2 disk (config/filesystems.php's 'r2') via this class rather than each
 * call site hardcoding its own `Storage::disk(...)` calls. Callers store/read a relative path;
 * this class is the only place that knows how to turn that path into a public URL.
 *
 * Values passed in/out of this class can be either a relative R2 path (everything stored via
 * `store()`/`putRaw()` below) or an already-absolute external URL — e.g. a Google account avatar
 * from Socialite, or any pre-existing "paste a URL" value from before uploads existed. `url()`
 * and `delete()` both detect and pass through external URLs untouched, so old data and new
 * uploads can coexist without a backfill migration.
 */
final class MediaStorageService
{
    private const DISK = 'r2';

    /**
     * Stores an uploaded file under the given prefix (e.g. "profiles", "courses/12") and returns
     * the resulting relative path — never a URL — for the caller to persist on the model.
     *
     * Tries the R2 disk first; if that fails (e.g. credentials not configured in local dev),
     * falls back to the local 'public' disk so development can continue without R2 set up.
     */
    public function store(UploadedFile $file, string $prefix): string
    {
        $prefix = trim($prefix, '/');

        // Named explicitly with the client's original extension rather than $file->store()'s
        // default (which names the file via UploadedFile::hashName(), built from
        // guessExtension() — the extension PHP's fileinfo derives from the file's actual
        // content). Real Word/PowerPoint documents are OOXML zip archives that fileinfo's magic
        // database frequently misidentifies as something generic depending on internal file
        // ordering, which previously could store e.g. a genuine "notes.docx" as "<hash>.txt" —
        // still a valid upload, but served back with the wrong extension and Content-Type.
        $extension = $file->getClientOriginalExtension();
        $filename = Str::random(40).($extension !== '' ? ".{$extension}" : '');

        $path = $file->storeAs($prefix, $filename, self::DISK);

        // R2 configured but upload failed — try the local public disk as a fallback
        // so development environments without working R2 credentials don't hard-crash.
        if ($path === false) {
            $path = $file->storeAs($prefix, $filename, 'public');
        }

        if ($path === false) {
            throw new RuntimeException('Failed to store the uploaded file.');
        }

        return $path;
    }

    /**
     * For server-generated files (certificate PDFs) that never arrive as an UploadedFile.
     *
     * The r2 disk sets 'throw' => false, so a failed write returns false rather than raising.
     * Without this check the caller would happily persist a path to a file that was never
     * written, producing a stored URL that 404s.
     */
    public function putRaw(string $path, string $contents): void
    {
        if (! Storage::disk(self::DISK)->put($path, $contents)) {
            throw new RuntimeException("Failed to store generated file at {$path}.");
        }
    }

    /**
     * Deletes the file at $path. A no-op for null/empty values and for external URLs — we only
     * ever own files under our own relative paths, never someone else's URL.
     */
    public function delete(?string $path): void
    {
        if ($path === null || $path === '' || $this->isExternalUrl($path)) {
            return;
        }

        Storage::disk(self::DISK)->delete($path);
    }

    /**
     * Resolves a stored value to a public URL. Passes an already-absolute URL through unchanged;
     * builds one from the R2 disk's configured public base (R2_URL) for a relative path.
     * Falls back to the local public disk URL for paths stored during local dev (no R2).
     */
    public function url(?string $path): ?string
    {
        if ($path === null || $path === '') {
            return null;
        }

        if ($this->isExternalUrl($path)) {
            return $path;
        }

        // If the R2 disk has a usable URL config, use it; otherwise fall back to local storage.
        $r2Url = config('filesystems.disks.r2.url');
        if ($r2Url) {
            return Storage::disk(self::DISK)->url($path);
        }

        return Storage::disk('public')->url($path);
    }

    private function isExternalUrl(string $value): bool
    {
        return str_starts_with($value, 'http://') || str_starts_with($value, 'https://');
    }
}
