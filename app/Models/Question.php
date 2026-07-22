<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\QuestionType;
use Database\Factories\QuestionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class Question extends Model
{
    /** @use HasFactory<QuestionFactory> */
    use HasFactory;

    public const UPDATED_AT = null;

    protected $fillable = [
        'question_bank_id',
        'type',
        'question_text',
        'points',
        'auto_gradable',
    ];

    protected $casts = [
        'type' => QuestionType::class,
        'points' => 'decimal:2',
        'auto_gradable' => 'boolean',
    ];

    /**
     * @return BelongsTo<QuestionBank, $this>
     */
    public function bank(): BelongsTo
    {
        return $this->belongsTo(QuestionBank::class, 'question_bank_id');
    }

    /**
     * @return HasMany<QuestionOption, $this>
     */
    public function options(): HasMany
    {
        return $this->hasMany(QuestionOption::class);
    }

    /**
     * @return BelongsToMany<Evaluation, $this>
     */
    public function evaluations(): BelongsToMany
    {
        return $this->belongsToMany(Evaluation::class, 'evaluation_questions')->withPivot('order_index');
    }
}
