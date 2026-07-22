<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Enums\TicketStatus;
use App\Models\Ticket;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;

final class UpdateTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Ticket $ticket */
        $ticket = $this->route('ticket');

        return $this->user()->can('manage', $ticket);
    }

    public function rules(): array
    {
        return [
            'status' => ['sometimes', new Enum(TicketStatus::class)],
            'assigned_to' => ['sometimes', 'nullable', 'integer', Rule::exists('users', 'id')],
        ];
    }
}
