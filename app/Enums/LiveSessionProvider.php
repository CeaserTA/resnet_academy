<?php

declare(strict_types=1);

namespace App\Enums;

enum LiveSessionProvider: string
{
    case Zoom = 'zoom';
    case GoogleMeet = 'google_meet';
}
