<?php

declare(strict_types=1);

namespace App\Enums;

enum DocumentFileType: string
{
    case Pdf = 'pdf';
    case Pptx = 'pptx';
    case Docx = 'docx';
}
