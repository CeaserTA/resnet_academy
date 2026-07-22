<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Models\Ticket;
use Illuminate\Foundation\Http\FormRequest;

final class StoreTicketMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Ticket $ticket */
        $ticket = $this->route('ticket');

        return $this->user()->can('view', $ticket);
    }

    public function rules(): array
    {
        return [
            'body' => ['required', 'string'],
        ];
    }
}
