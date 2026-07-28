<?php
$dotenv = file_get_contents('.env');
preg_match('/R2_ACCESS_KEY=(.+)/', $dotenv, $m);
echo 'KEY: [' . trim($m[1] ?? '') . "]\n";
preg_match('/R2_BUCKET=(.+)/', $dotenv, $m);
echo 'BUCKET: [' . trim($m[1] ?? '') . "]\n";
preg_match('/R2_ENDPOINT=(.+)/', $dotenv, $m);
echo 'ENDPOINT: [' . trim($m[1] ?? '') . "]\n";
preg_match('/R2_SECRET_KEY=(.+)/', $dotenv, $m);
echo 'SECRET len: ' . strlen(trim($m[1] ?? '')) . "\n";
