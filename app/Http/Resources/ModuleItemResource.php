<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class ModuleItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'module_id' => $this->module_id,
            'item_type' => $this->item_type->value,
            'item_id' => $this->item_id,
            'order_index' => $this->order_index,
            'is_required' => $this->is_required,
        ];
    }
}
