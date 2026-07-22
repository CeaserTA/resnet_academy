<?php

declare(strict_types=1);

namespace App\Enums;

enum EnrolmentSource: string
{
    case Self = 'self';
    case AdminBulk = 'admin_bulk';
}
