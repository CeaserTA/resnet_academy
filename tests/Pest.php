<?php

declare(strict_types=1);

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

pest()->extend(TestCase::class)
    ->in('Unit');

/**
 * A real, minimal 1x1 PNG (not `UploadedFile::fake()->image()`, which needs the GD extension —
 * not installed in this environment) so Laravel's `image`/`mimes` rules, which sniff actual file
 * content rather than trusting the filename, see a genuinely valid image. Shared here rather than
 * per-file since every image-upload test (avatars, course thumbnails, ...) needs it.
 */
function fakeImageUpload(string $name = 'avatar.jpg'): UploadedFile
{
    $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=');
    $path = tempnam(sys_get_temp_dir(), 'img').'.png';
    file_put_contents($path, $png);

    return new UploadedFile($path, $name, 'image/png', null, true);
}
