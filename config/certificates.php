<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Issuing institution
    |--------------------------------------------------------------------------
    |
    | Printed on the certificate itself. Deliberately separate from APP_NAME
    | ("Resnet LMS"), which names the software rather than the school awarding
    | the qualification.
    |
    */

    'institution' => env('CERTIFICATE_INSTITUTION', 'Resnet Academy'),

    /*
    |--------------------------------------------------------------------------
    | Public website
    |--------------------------------------------------------------------------
    |
    | Shown in the certificate footer and used to build the verification URL
    | behind the QR code.
    |
    */

    'website' => env('CERTIFICATE_WEBSITE', env('FRONTEND_URL', 'http://localhost:3000')),

    /*
    |--------------------------------------------------------------------------
    | Fallback signatory
    |--------------------------------------------------------------------------
    |
    | The signature line names the instructor who taught the student's cohort.
    | Where a course was taken outside a cohort, or the offering has no primary
    | instructor recorded, the certificate is signed for the institution instead.
    |
    */

    'signatory' => [
        'name' => env('CERTIFICATE_SIGNATORY_NAME', 'Resnet Academy'),
        'title' => env('CERTIFICATE_SIGNATORY_TITLE', 'Programme Director'),
    ],

];
