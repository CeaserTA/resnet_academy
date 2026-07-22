<?php

declare(strict_types=1);

namespace App\Enums;

enum ResourceProgressStatus: string
{
    case NotStarted = 'not_started';
    case InProgress = 'in_progress';
    case Completed = 'completed';
}
