<?php

declare(strict_types=1);

namespace App\Enums;

enum EvaluationAttemptStatus: string
{
    case InProgress = 'in_progress';
    case Submitted = 'submitted';
    case Graded = 'graded';
}
