<?php

declare(strict_types=1);

namespace App\Enums;

enum ForumPostAttachmentType: string
{
    case Image = 'image';
    case Video = 'video';
    case Audio = 'audio';
    case Article = 'article';
}
