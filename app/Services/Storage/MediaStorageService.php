<?php

declare(strict_types=1);

namespace App\Services\Storage;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
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
     */
    public function store(UploadedFile $file, string $prefix): string
    {
        $path = $file->store(trim($prefix, '/'), self::DISK);

        if ($path === false) {
            throw new RuntimeException('Failed to store the uploaded file.');
        }

        return $path;
    }

    /**
     * For server-generated files (certificate PDFs) that never arrive as an UploadedFile.
     */
    public function putRaw(string $path, string $contents): void
    {
        Storage::disk(self::DISK)->put($path, $contents);
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
     */
    public function url(?string $path): ?string
    {
        if ($path === null || $path === '') {
            return null;
        }

        if ($this->isExternalUrl($path)) {
            return $path;
        }

        return Storage::disk(self::DISK)->url($path);
    }

    private function isExternalUrl(string $value): bool
    {
        return str_starts_with($value, 'http://') || str_starts_with($value, 'https://');
    }
}
