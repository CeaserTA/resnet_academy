<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// Turn on throw so we see the real AWS SDK error
config(['filesystems.disks.r2.throw' => true]);

try {
    $disk = \Illuminate\Support\Facades\Storage::disk('r2');
    $result = $disk->put('test-probe-' . time() . '.txt', 'ok');
    echo "OK: $result\n";
} catch (\Exception $e) {
    echo "ERROR (" . get_class($e) . "): " . $e->getMessage() . "\n";
    // Print the previous exception if there is one
    if ($e->getPrevious()) {
        echo "CAUSED BY: " . $e->getPrevious()->getMessage() . "\n";
    }
}
