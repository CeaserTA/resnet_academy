<?php

declare(strict_types=1);

namespace App\Enums;

enum ForumPostReportStatus: string
{
    case Pending = 'pending';
    case Reviewed = 'reviewed';
    case Dismissed = 'dismissed';
}
