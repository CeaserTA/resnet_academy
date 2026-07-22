<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ModuleItemType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * item_id is a manual polymorphic reference into resources/assignments/evaluations,
 * selected by item_type. It is not Laravel's default morph-map shape (there's no
 * single discriminator column pointing at one table), so this deliberately does not
 * use morphTo() — resolveItem() below does the type-directed lookup instead.
 */
final class ModuleItem extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'module_id',
        'item_type',
        'item_id',
        'order_index',
        'is_required',
    ];

    protected $casts = [
        'item_type' => ModuleItemType::class,
        'order_index' => 'integer',
        'is_required' => 'boolean',
    ];

    /**
     * @return BelongsTo<Module, $this>
     */
    public function module(): BelongsTo
    {
        return $this->belongsTo(Module::class);
    }

    public function resolveItem(): Resource|Assignment|Evaluation
    {
        return match ($this->item_type) {
            ModuleItemType::Resource => Resource::findOrFail($this->item_id),
            ModuleItemType::Assignment => Assignment::findOrFail($this->item_id),
            ModuleItemType::Evaluation => Evaluation::findOrFail($this->item_id),
        };
    }
}
