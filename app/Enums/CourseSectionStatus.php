<?php

declare(strict_types=1);

namespace App\Enums;

enum CourseSectionStatus: string
{
    case Draft = 'draft';
    case Open = 'open';
    case Closed = 'closed';
    case InProgress = 'in_progress';
    case Completed = 'completed';
}
