<?php

declare(strict_types=1);

namespace App\Enums;

enum SubmissionStatus: string
{
    case Submitted = 'submitted';
    case Graded = 'graded';
}
