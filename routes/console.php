<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('enrolments:send-due-confirmation-emails')->everyFiveMinutes();
Schedule::command('progress:evaluate-module-unlocks')->everyFiveMinutes();
Schedule::command('modules:purge-soft-deleted')->daily();
