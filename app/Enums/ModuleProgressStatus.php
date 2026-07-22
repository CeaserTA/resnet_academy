<?php

declare(strict_types=1);

namespace App\Enums;

enum ModuleProgressStatus: string
{
    case Locked = 'locked';
    case NotStarted = 'not_started';
    case InProgress = 'in_progress';
    case Completed = 'completed';
}
