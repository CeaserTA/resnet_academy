<?php

declare(strict_types=1);

namespace App\Enums;

enum AssignmentSubmissionType: string
{
    case File = 'file';
    case Text = 'text';
    case Both = 'both';
}
