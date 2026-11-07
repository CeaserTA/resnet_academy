<?php

declare(strict_types=1);

use App\Services\Storage\MediaStorageService;
use Illuminate\Support\Facades\Storage;

it('links to the local copy when an upload fell back to the public disk, even with R2 configured (BACKEND_CHANGES.md §4)', function (): void {
    config(['filesystems.disks.r2.url' => 'https://r2.example.com']);
    Storage::fake('public');
    Storage::disk('public')->put('payment-receipts/1/receipt.jpg', 'image');

    $url = app(MediaStorageService::class)->url('payment-receipts/1/receipt.jpg');

    expect($url)->toBe(Storage::disk('public')->url('payment-receipts/1/receipt.jpg'));
});

it('still links to R2 for files that are not stored locally', function (): void {
    config(['filesystems.disks.r2.url' => 'https://r2.example.com']);
    Storage::fake('public');

    $url = app(MediaStorageService::class)->url('payment-receipts/1/receipt.jpg');

    expect($url)->toStartWith('https://r2.example.com');
});
