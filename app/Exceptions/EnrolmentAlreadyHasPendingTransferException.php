<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

final class EnrolmentAlreadyHasPendingTransferException extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('You already have a pending transfer request.');
    }
}