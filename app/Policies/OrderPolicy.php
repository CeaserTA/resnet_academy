<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Order;
use App\Models\User;

final class OrderPolicy
{
    /**
     * Only the order's own student can submit a payment against it — the admin's manual
     * "record a payment" path (`Admin\OrderController::update()`) is a separate, independent
     * mechanism and isn't gated here.
     */
    public function submitPayment(User $user, Order $order): bool
    {
        return $order->student_id === $user->id;
    }
}
