<?php

declare(strict_types=1);

namespace App\Enums;

enum ScormStandard: string
{
    case Scorm12 = 'scorm_1_2';
    case Scorm2004 = 'scorm_2004';
    case Xapi = 'xapi';
}
