<?php

declare(strict_types=1);

namespace App\Enums;

enum ResourceType: string
{
    case Video = 'video';
    case Document = 'document';
    case Reading = 'reading';
    case ExternalLink = 'external_link';
    case Scorm = 'scorm';
    case LiveSession = 'live_session';
    case DownloadableFile = 'downloadable_file';
}
