<?php

declare(strict_types=1);

namespace App\Services\Assessment;

use App\Enums\QuestionType;
use App\Models\QuestionBank;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

/**
 * Zero-AI CSV question import: each row maps deterministically onto the payload
 * QuestionManager::create() expects. All rows are validated up-front (with
 * row-numbered errors) and created inside a single DB transaction, so a file
 * either imports completely or not at all.
 */
final class QuestionCsvImporter
{
    /** Question types that require an options list (mirrors StoreQuestionRequest). */
    private const OPTION_TYPES = [QuestionType::McqSingle, QuestionType::McqMulti, QuestionType::TrueFalse];

    private const MAX_OPTION_COLUMNS = 8;

    public const TEMPLATE_FILENAME = 'sample_questions.csv';

    public function __construct(private readonly QuestionManager $questionManager) {}

    /**
     * @return array{imported: int}
     */
    public function import(QuestionBank $bank, UploadedFile $file): array
    {
        $handle = fopen($file->getRealPath(), 'rb');

        if ($handle === false) {
            throw ValidationException::withMessages(['csv_file' => 'Unable to read the uploaded CSV file.']);
        }

        try {
            $header = fgetcsv($handle);

            if (! is_array($header)) {
                throw ValidationException::withMessages(['csv_file' => 'The CSV file is empty — it needs a header row first.']);
            }

            $columns = $this->mapHeader($header);

            foreach (['type', 'question_text'] as $required) {
                if (! array_key_exists($required, $columns)) {
                    throw ValidationException::withMessages([
                        'csv_file' => "The header row is missing the \"{$required}\" column. Download the sample template for the expected format.",
                    ]);
                }
            }

            $payloads = [];
            $errors = [];
            $lineNumber = 1; // header

            while (($row = fgetcsv($handle)) !== false) {
                $lineNumber++;

                if ($this->isEmptyRow($row)) {
                    continue;
                }

                try {
                    $payloads[] = $this->mapRow($row, $columns, $lineNumber);
                } catch (InvalidArgumentException $e) {
                    $errors[] = $e->getMessage();
                }
            }

            if ($errors !== []) {
                throw ValidationException::withMessages(['csv_file' => $errors]);
            }

            if ($payloads === []) {
                throw ValidationException::withMessages(['csv_file' => 'The CSV file contains no question rows.']);
            }

            DB::transaction(function () use ($bank, $payloads): void {
                foreach ($payloads as $payload) {
                    $this->questionManager->create($bank, $payload);
                }
            });

            return ['imported' => count($payloads)];
        } finally {
            fclose($handle);
        }
    }

    /**
     * The downloadable sample template — one example row per question type.
     */
    public function templateCsv(): string
    {
        $stream = fopen('php://temp', 'rb+');

        fputcsv($stream, ['type', 'question_text', 'points', 'option_1', 'option_2', 'option_3', 'option_4', 'correct_options']);
        fputcsv($stream, ['mcq_single', 'What does CPU stand for?', '1', 'Central Processing Unit', 'Central Point Unit', 'Computer Personal Unit', 'Control Processing Unit', '1']);
        fputcsv($stream, ['mcq_multi', 'Which of these are operating systems?', '2', 'Windows', 'Linux', 'Excel', 'macOS', '1,2,4']);
        fputcsv($stream, ['true_false', 'HTTP is a stateless protocol.', '1', 'True', 'False', '', '', '1']);
        fputcsv($stream, ['short_answer', 'Define DNS in one sentence.', '2', '', '', '', '', '']);
        fputcsv($stream, ['essay', 'Explain the purpose of the OSI model.', '5', '', '', '', '', '']);

        rewind($stream);
        $csv = stream_get_contents($stream);
        fclose($stream);

        return $csv === false ? '' : $csv;
    }

    /**
     * Maps one CSV row onto the payload shape QuestionManager::create() expects.
     *
     * @param  list<string|null>  $row
     * @param  array<string, int>  $columns
     * @return array<string, mixed>
     */
    private function mapRow(array $row, array $columns, int $lineNumber): array
    {
        $cell = fn (string $name): string => trim((string) ($row[$columns[$name]] ?? ''));

        $typeValue = strtolower($cell('type'));
        $type = QuestionType::tryFrom($typeValue);

        if ($type === null) {
            throw new InvalidArgumentException(
                "Row {$lineNumber}: unknown type \"{$typeValue}\" — expected mcq_single, mcq_multi, true_false, short_answer or essay.",
            );
        }

        $questionText = $cell('question_text');

        if ($questionText === '') {
            throw new InvalidArgumentException("Row {$lineNumber}: question_text is required.");
        }

        $pointsRaw = $cell('points');
        $points = 1; // default when the column is left empty

        if ($pointsRaw !== '') {
            if (! is_numeric($pointsRaw) || (float) $pointsRaw < 0) {
                throw new InvalidArgumentException("Row {$lineNumber}: points must be a number greater than or equal to 0.");
            }

            $points = (int) round((float) $pointsRaw);
        }

        $payload = [
            'type' => $type->value,
            'question_text' => $questionText,
            'points' => $points,
        ];

        if (! in_array($type, self::OPTION_TYPES, true)) {
            return $payload; // short_answer / essay carry no options
        }

        // option_1..option_8 → options array, filled in order (gaps are an error so
        // correct_options indices always line up with the column numbers).
        $filled = [];

        foreach (range(1, self::MAX_OPTION_COLUMNS) as $i) {
            $key = "option_{$i}";

            if (! array_key_exists($key, $columns)) {
                continue;
            }

            $text = trim((string) ($row[$columns[$key]] ?? ''));

            if ($text !== '') {
                $filled[$i] = $text;
            }
        }

        if ($filled !== [] && array_keys($filled) !== range(1, count($filled))) {
            throw new InvalidArgumentException("Row {$lineNumber}: option columns must be filled in order starting at option_1 (no gaps).");
        }

        if (count($filled) < 2) {
            throw new InvalidArgumentException("Row {$lineNumber}: option-based questions need at least 2 options.");
        }

        if ($type === QuestionType::TrueFalse && count($filled) !== 2) {
            throw new InvalidArgumentException("Row {$lineNumber}: true_false questions need exactly 2 options.");
        }

        // correct_options: 1-based, comma-separated indices, e.g. "1" or "1,3".
        $correctRaw = $cell('correct_options');

        if ($correctRaw === '') {
            throw new InvalidArgumentException("Row {$lineNumber}: mark at least one correct option in correct_options (e.g. \"1\" or \"1,3\").");
        }

        $correctIndices = [];

        foreach (explode(',', $correctRaw) as $part) {
            $part = trim($part);

            if ($part === '') {
                continue;
            }

            if (! ctype_digit($part)) {
                throw new InvalidArgumentException("Row {$lineNumber}: correct_options must contain whole numbers like \"1\" or \"1,3\".");
            }

            $index = (int) $part;

            if ($index < 1 || $index > count($filled)) {
                throw new InvalidArgumentException("Row {$lineNumber}: correct option {$index} is out of range — this row has ".count($filled).' options.');
            }

            $correctIndices[$index] = true;
        }

        if ($correctIndices === []) {
            throw new InvalidArgumentException("Row {$lineNumber}: mark at least one correct option in correct_options.");
        }

        if ($type === QuestionType::McqSingle && count($correctIndices) > 1) {
            throw new InvalidArgumentException("Row {$lineNumber}: mcq_single allows exactly one correct option.");
        }

        $payload['options'] = array_map(
            fn (int $index, string $text): array => [
                'option_text' => $text,
                'is_correct' => isset($correctIndices[$index]),
            ],
            array_keys($filled),
            array_values($filled),
        );

        return $payload;
    }

    /**
     * @param  array<int, string|null>  $header
     * @return array<string, int>
     */
    private function mapHeader(array $header): array
    {
        $columns = [];

        foreach ($header as $index => $name) {
            // Strip a UTF-8 BOM — Excel adds one when exporting "CSV UTF-8".
            $clean = strtolower(trim((string) preg_replace('/^\x{FEFF}/u', '', (string) $name)));

            if ($clean !== '') {
                $columns[$clean] = $index;
            }
        }

        return $columns;
    }

    /**
     * @param  list<string|null>  $row
     */
    private function isEmptyRow(array $row): bool
    {
        foreach ($row as $cell) {
            if (trim((string) $cell) !== '') {
                return false;
            }
        }

        return true;
    }
}
