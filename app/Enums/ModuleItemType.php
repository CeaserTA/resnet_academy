<?php

declare(strict_types=1);

namespace App\Enums;

enum ModuleItemType: string
{
    case Resource = 'resource';
    case Assignment = 'assignment';
    case Evaluation = 'evaluation';
}
