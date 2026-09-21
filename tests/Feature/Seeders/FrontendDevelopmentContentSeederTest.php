<?php

declare(strict_types=1);

use App\Enums\QuestionType;
use App\Models\Assignment;
use App\Models\Course;
use App\Models\Evaluation;
use App\Models\Module;
use App\Models\ModuleItem;
use App\Models\Question;
use App\Models\QuestionBank;
use App\Models\Resource;
use App\Models\ResourceDocument;
use Database\Seeders\FrontendDevelopmentContentSeeder;
use Illuminate\Support\Facades\Storage;

beforeEach(function (): void {
    Storage::fake('r2');
});

function frontendCourse(): Course
{
    return Course::factory()->create(['title' => 'Frontend Development', 'slug' => 'frontend-development']);
}

/**
 * @return array<string, int>
 */
function frontendSeedCounts(): array
{
    return [
        'modules' => Module::count(),
        'resources' => Resource::count(),
        'module_items' => ModuleItem::count(),
        'assignments' => Assignment::count(),
        'evaluations' => Evaluation::count(),
        'banks' => QuestionBank::count(),
        'questions' => Question::count(),
    ];
}

it('creates the five modules and every kind of content on each one', function (): void {
    $course = frontendCourse();

    $this->seed(FrontendDevelopmentContentSeeder::class);

    $modules = Module::where('course_id', $course->id)->orderBy('order_index')->get();
    expect($modules)->toHaveCount(5);
    expect($modules->pluck('order_index')->all())->toBe([1, 2, 3, 4, 5]);

    foreach ($modules as $module) {
        expect($module->title)->toStartWith("Module {$module->order_index} — ");
        expect(strlen($module->description))->toBeGreaterThan(200);

        $resources = Resource::where('module_id', $module->id)->get();
        expect($resources)->toHaveCount(5);
        expect($resources->where('type.value', 'external_link'))->toHaveCount(1);
        expect($resources->where('type.value', 'live_session'))->toHaveCount(1);
        expect($resources->where('type.value', 'document'))->toHaveCount(3);

        expect(Assignment::where('module_id', $module->id)->count())->toBe(1);
        expect(Evaluation::where('module_id', $module->id)->count())->toBe(1);
    }
});

it('attaches a docx, a pdf and a pptx to every module and stores each file', function (): void {
    $course = frontendCourse();

    $this->seed(FrontendDevelopmentContentSeeder::class);

    foreach (Module::where('course_id', $course->id)->get() as $module) {
        $documentIds = Resource::where('module_id', $module->id)->where('type', 'document')->pluck('id');
        $details = ResourceDocument::whereIn('resource_id', $documentIds)->get();

        expect($details->map(fn ($detail) => $detail->file_type->value)->sort()->values()->all())->toBe(['docx', 'pdf', 'pptx']);

        foreach ($details as $detail) {
            Storage::disk('r2')->assertExists($detail->file_url);
            expect($detail->file_size_kb)->toBeGreaterThan(1);
        }
    }
});

it('links a real YouTube watch URL and a clearly labelled placeholder live session per module', function (): void {
    frontendCourse();

    $this->seed(FrontendDevelopmentContentSeeder::class);

    $videoUrls = Resource::where('type', 'external_link')->with('externalLink')->get()->map(fn ($r) => $r->externalLink->url);
    expect($videoUrls)->toHaveCount(5);
    expect($videoUrls->unique())->toHaveCount(5);

    foreach ($videoUrls as $url) {
        expect($url)->toMatch('~^https://www\.youtube\.com/watch\?v=[A-Za-z0-9_-]{11}$~');
    }

    foreach (Resource::where('type', 'live_session')->get() as $session) {
        expect($session->title)->toStartWith('Live Session: ');
        expect($session->description)->toContain('placeholder meeting room');
    }
});

it('writes a due date on every assignment and 6 real questions on every quiz', function (): void {
    frontendCourse();

    $this->seed(FrontendDevelopmentContentSeeder::class);

    foreach (Assignment::all() as $assignment) {
        expect($assignment->due_at)->not->toBeNull();
        expect(strlen($assignment->instructions))->toBeGreaterThan(800);
    }

    foreach (Evaluation::with('questions.options')->get() as $evaluation) {
        expect($evaluation->questions)->toHaveCount(6);

        foreach ($evaluation->questions as $question) {
            match ($question->type) {
                QuestionType::McqSingle => expect($question->options->where('is_correct', true))->toHaveCount(1)
                    ->and($question->options)->toHaveCount(4),
                QuestionType::McqMulti => expect($question->options->where('is_correct', true)->count())->toBeGreaterThanOrEqual(2)
                    ->and($question->options->where('is_correct', false)->count())->toBeGreaterThanOrEqual(1),
                QuestionType::TrueFalse => expect($question->options->where('is_correct', true))->toHaveCount(1)
                    ->and($question->options)->toHaveCount(2),
                QuestionType::ShortAnswer => expect($question->options)->toHaveCount(0),
                default => throw new RuntimeException("Unexpected question type {$question->type->value}"),
            };
        }
    }
});

it('contains no placeholder filler text anywhere in the seeded content', function (): void {
    frontendCourse();

    $this->seed(FrontendDevelopmentContentSeeder::class);

    $text = collect()
        ->merge(Module::pluck('description'))
        ->merge(Resource::pluck('description'))
        ->merge(Assignment::pluck('instructions'))
        ->merge(Evaluation::pluck('description'))
        ->merge(Question::pluck('question_text'))
        ->implode(' ');

    expect(strtolower($text))->not->toMatch('/lorem|ipsum|dolor sit amet|todo|tbd/');
});

it('is idempotent: running the seeder again creates nothing new', function (): void {
    frontendCourse();

    $this->seed(FrontendDevelopmentContentSeeder::class);
    $first = frontendSeedCounts();

    $this->seed(FrontendDevelopmentContentSeeder::class);

    expect(frontendSeedCounts())->toBe($first);
    expect($first)->toMatchArray(['modules' => 5, 'resources' => 25, 'assignments' => 5, 'evaluations' => 5, 'banks' => 5, 'questions' => 30]);
});

it('keeps an existing module in the same position and attaches the content to it', function (): void {
    $course = frontendCourse();
    $existing = Module::factory()->for($course)->create(['order_index' => 1, 'title' => 'Hand-made module one', 'description' => 'Written by an admin.']);

    $this->seed(FrontendDevelopmentContentSeeder::class);

    expect(Module::where('course_id', $course->id)->count())->toBe(5);
    expect($existing->fresh()->title)->toBe('Hand-made module one');
    expect(Resource::where('module_id', $existing->id)->count())->toBe(5);
});

it('does nothing, without failing, when the course does not exist', function (): void {
    $this->seed(FrontendDevelopmentContentSeeder::class);

    expect(Module::count())->toBe(0);
    expect(Resource::count())->toBe(0);
});
