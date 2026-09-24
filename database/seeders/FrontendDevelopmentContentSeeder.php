<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\QuestionType;
use App\Models\Assignment;
use App\Models\Course;
use App\Models\Evaluation;
use App\Models\Module;
use App\Models\Question;
use App\Models\QuestionBank;
use App\Models\Resource;
use App\Services\Assessment\AssignmentManager;
use App\Services\Assessment\EvaluationManager;
use App\Services\Assessment\QuestionManager;
use App\Services\Content\ResourceManager;
use App\Services\Storage\MediaStorageService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seeds the "Frontend Development" course: its 5 modules, then real, module-specific content on
 * each — a YouTube walkthrough, a scheduled live session, three instructional documents
 * (Word/PDF/PowerPoint, generated once and committed under content/frontend-development/), one
 * realistic assignment, and one quiz with real questions.
 *
 * Follows BackendDevelopmentContentSeeder's conventions. The course itself is real data created
 * outside the DatabaseSeeder's synthetic courses, so it is looked up by slug and this seeder
 * warns and exits (rather than failing `db:seed`) if it does not exist in this environment.
 *
 * Idempotent: modules are keyed by (course, order_index), and every resource, assignment,
 * question bank, question and evaluation is looked up by its natural key before being created.
 * File uploads use a deterministic storage path, so re-running never duplicates rows or files.
 * If a module with the same position already exists (for example one an admin created by hand in
 * the UI), it is kept as-is and the content is attached to it. Each module's writes share one
 * transaction.
 *
 * Run explicitly: php artisan db:seed --class=FrontendDevelopmentContentSeeder
 */
final class FrontendDevelopmentContentSeeder extends Seeder
{
    private const COURSE_SLUG = 'frontend-development';

    private const CONTENT_DIR = __DIR__.'/content/frontend-development';

    public function run(): void
    {
        $course = Course::where('slug', self::COURSE_SLUG)->first();

        if (! $course) {
            $this->command?->warn('No course with slug "'.self::COURSE_SLUG.'" found — skipping FrontendDevelopmentContentSeeder.');

            return;
        }

        $this->seedModules($course);

        $modules = Module::where('course_id', $course->id)->orderBy('order_index')->get();
        $moduleContent = $this->moduleContent();

        foreach ($modules as $module) {
            $content = $moduleContent[$module->order_index] ?? null;

            if ($content === null) {
                continue;
            }

            DB::transaction(function () use ($course, $module, $content): void {
                $this->seedYoutubeResource($module, $content);
                $this->seedLiveSessionResource($module, $content);
                $this->seedDocumentResources($course, $module, $content);
                $this->seedAssignment($module, $content);
                $this->seedEvaluation($course, $module, $content);
            });
        }

        $this->command?->info('Frontend Development content seeded for '.$modules->count().' modules.');
    }

    private function seedModules(Course $course): void
    {
        foreach ($this->modules() as $orderIndex => $module) {
            Module::firstOrCreate(
                ['course_id' => $course->id, 'order_index' => $orderIndex],
                ['title' => $module['title'], 'description' => $module['description']],
            );
        }
    }

    private function seedYoutubeResource(Module $module, array $content): void
    {
        $title = $content['topic'].' — Video Walkthrough';

        if (Resource::where('module_id', $module->id)->where('title', $title)->exists()) {
            return;
        }

        app(ResourceManager::class)->create($module, [
            'type' => 'external_link',
            'title' => $title,
            'description' => 'Real YouTube video: "'.$content['youtube']['title'].'" by '.$content['youtube']['channel'].'. '.$content['youtube']['covers'],
            'url' => $content['youtube']['url'],
        ]);
    }

    private function seedLiveSessionResource(Module $module, array $content): void
    {
        $title = 'Live Session: '.$content['topic'];

        if (Resource::where('module_id', $module->id)->where('title', $title)->exists()) {
            return;
        }

        app(ResourceManager::class)->create($module, [
            'type' => 'live_session',
            'title' => $title,
            'description' => 'Scheduled live session for this module, covering: '.$content['liveSessionTopic'].
                '. This is a placeholder meeting room — the real link is shared with the cohort ahead of the session.',
            'provider' => 'zoom',
            'meeting_url' => 'https://zoom.us/j/'.(8300000000 + $module->id).'?pwd=frontenddev-module-'.$module->order_index,
            'scheduled_at' => now()->addWeeks($module->order_index)->next('Wednesday')->setTime(17, 0),
            'duration_minutes' => 60,
        ]);
    }

    private function seedDocumentResources(Course $course, Module $module, array $content): void
    {
        $mediaStorage = app(MediaStorageService::class);
        $resourceManager = app(ResourceManager::class);

        foreach ($content['documents'] as $doc) {
            $title = $content['topic'].' — '.$doc['label'];

            if (Resource::where('module_id', $module->id)->where('title', $title)->exists()) {
                continue;
            }

            $bytes = file_get_contents(self::CONTENT_DIR.'/'.$doc['filename']);
            $sizeKb = (int) ceil(strlen($bytes) / 1024);

            // Deterministic path (not a random hash) so re-seeding overwrites the same object
            // on the storage disk instead of accumulating orphaned copies.
            $storagePath = "resources/{$course->id}/seed/{$doc['filename']}";
            $mediaStorage->putRaw($storagePath, $bytes);

            $resourceManager->create($module, [
                'type' => 'document',
                'title' => $title,
                'description' => $doc['description'],
                'file_url' => $storagePath,
                'file_type' => $doc['fileType'],
                'file_size_kb' => $sizeKb,
            ]);
        }
    }

    private function seedAssignment(Module $module, array $content): void
    {
        $title = $content['assignment']['title'];

        if (Assignment::where('module_id', $module->id)->where('title', $title)->exists()) {
            return;
        }

        app(AssignmentManager::class)->create($module, [
            'title' => $title,
            'instructions' => $content['assignment']['instructions'],
            'submission_type' => 'both',
            'due_at' => now()->addDays($content['assignment']['dueDays']),
            'allow_late' => true,
            'max_score' => 100,
        ]);
    }

    private function seedEvaluation(Course $course, Module $module, array $content): void
    {
        $evalTitle = $content['evaluation']['title'];

        if (Evaluation::where('module_id', $module->id)->where('title', $evalTitle)->exists()) {
            return;
        }

        $bankTitle = $content['topic'].' — Quiz Question Bank';
        $bank = QuestionBank::where('course_id', $course->id)->where('title', $bankTitle)->first()
            ?? QuestionBank::create(['course_id' => $course->id, 'title' => $bankTitle]);

        $questionManager = app(QuestionManager::class);
        $questionIds = [];

        foreach ($content['evaluation']['questions'] as $q) {
            $existing = Question::where('question_bank_id', $bank->id)->where('question_text', $q['text'])->first();

            if ($existing) {
                $questionIds[] = $existing->id;

                continue;
            }

            $options = match ($q['type']) {
                QuestionType::McqSingle->value, QuestionType::McqMulti->value => array_map(
                    fn (array $o) => ['option_text' => $o['text'], 'is_correct' => $o['correct']],
                    $q['options'],
                ),
                QuestionType::TrueFalse->value => [
                    ['option_text' => 'True', 'is_correct' => $q['correct'] === true],
                    ['option_text' => 'False', 'is_correct' => $q['correct'] === false],
                ],
                default => [],
            };

            $question = $questionManager->create($bank, [
                'type' => $q['type'],
                'question_text' => $q['text'],
                'points' => 1,
                'options' => $options,
            ]);

            $questionIds[] = $question->id;
        }

        app(EvaluationManager::class)->create($module, [
            'title' => $evalTitle,
            'description' => $content['evaluation']['description'],
            'instructions' => 'You have 20 minutes and need a score of 70% or higher to pass. You may attempt this quiz up to 3 times. Questions marked "Select all that apply" have more than one correct answer. The short-answer question is graded by your instructor, so your score appears once they have reviewed it.',
            'pass_score' => 70.00,
            'max_attempts' => 3,
            'time_limit_minutes' => 20,
            'question_ids' => $questionIds,
        ]);
    }

    /**
     * The five modules, keyed by order_index. Titles follow the "Module N — Title" convention of
     * the Backend Development course.
     *
     * @return array<int, array{title: string, description: string}>
     */
    private function modules(): array
    {
        return [
            1 => [
                'title' => 'Module 1 — HTML & Web Fundamentals',
                'description' => 'This module introduces learners to how the web works and how web pages are structured. Learners will explore how browsers request and render pages, the anatomy of an HTML5 document, semantic elements, links, lists, images, tables, and accessible forms with built-in validation. The module also introduces browser developer tools and markup validation. By the end of the module, learners will be able to write a valid, semantic, accessible HTML page from scratch.',
            ],
            2 => [
                'title' => 'Module 2 — CSS Styling & Layout',
                'description' => 'This module teaches learners how to style web pages and control their layout using CSS. Learners will explore selectors, the cascade and specificity, the box model, typography, colour, and units, followed by positioning, Flexbox, and CSS Grid. The module also covers debugging styles with browser developer tools. By the end of the module, learners will be able to turn plain HTML into a well-designed, well-structured page.',
            ],
            3 => [
                'title' => 'Module 3 — Responsive Web Design',
                'description' => 'This module teaches learners how to build websites that adapt to any screen size. Learners will explore the viewport, mobile-first design, media queries, fluid layouts with min(), max(), clamp(), and Grid, responsive images, CSS custom properties, dark mode, transitions, and reduced-motion preferences. By the end of the module, learners will be able to make a complete website work well on phones, tablets, and desktops.',
            ],
            4 => [
                'title' => 'Module 4 — JavaScript Fundamentals & the DOM',
                'description' => 'This module introduces learners to JavaScript and how it brings web pages to life. Learners will explore variables, data types, control flow, functions, arrays, and objects before using the Document Object Model (DOM) to select, create, and change elements. The module also covers events, event delegation, and form validation. By the end of the module, learners will be able to build interactive, data-driven page features.',
            ],
            5 => [
                'title' => 'Module 5 — APIs, Tooling & Deployment',
                'description' => 'This module teaches learners how frontend applications communicate with servers and how they are prepared for production. Learners will explore HTTP and JSON, Promises, async/await, the Fetch API, loading and error states, browser storage, and ES modules. The module also introduces npm, Vite, and Git, and concludes with deploying a finished site to GitHub Pages or Netlify. By the end of the module, learners will be able to build and publish a complete frontend project.',
            ],
        ];
    }

    /**
     * Keyed by the module's order_index within the Frontend Development course (1..5). The
     * correct answer for each mcq question is listed first, matching what QuestionManager
     * persists via order_index.
     *
     * @return array<int, array<string, mixed>>
     */
    private function moduleContent(): array
    {
        return [
            1 => [
                'topic' => 'HTML & Web Fundamentals',
                'liveSessionTopic' => 'inspecting real pages with browser DevTools and building a semantic page skeleton',
                'youtube' => [
                    'url' => 'https://www.youtube.com/watch?v=pQN-pnXPaVg',
                    'title' => 'HTML Full Course - Build a Website Tutorial',
                    'channel' => 'freeCodeCamp.org',
                    'covers' => 'A beginner course that teaches HTML5 fundamentals by building a website, directly relevant to this module.',
                ],
                'documents' => [
                    ['label' => 'Lecture Notes (Word)', 'filename' => 'module-1-html-lecture-notes.docx', 'fileType' => 'docx', 'description' => 'Detailed lecture notes on how the web works, the HTML document skeleton, semantic elements, links, images, tables, forms and accessibility, with code examples.'],
                    ['label' => 'Quick Reference (PDF)', 'filename' => 'module-1-html-quick-reference.pdf', 'fileType' => 'pdf', 'description' => 'Quick reference: the document skeleton, semantic layout elements, common attributes, form controls and an accessibility checklist.'],
                    ['label' => 'Slide Deck (PowerPoint)', 'filename' => 'module-1-html-slides.pptx', 'fileType' => 'pptx', 'description' => 'Lecture slides summarising how a page reaches the screen, semantic HTML, forms and accessibility.'],
                ],
                'assignment' => [
                    'title' => 'Build a Semantic Community Coding Club Page',
                    'instructions' => 'Create a single HTML file, index.html, for a fictional community coding club (choose the name and details yourself). Use no CSS and no JavaScript yet. The page must meet all of these requirements. (1) Start with a valid HTML5 skeleton: the doctype, a lang attribute, the charset and viewport meta tags, and a unique descriptive title. (2) Use a header element containing the club name and a nav element with three in-page links (#about, #schedule and #join) that jump to matching sections. (3) Use a main element containing three sections with the ids about, schedule and join, each with an h2 heading, under a single h1 for the page. (4) In the about section, include a figure with an img that has meaningful alt text plus width and height attributes, and an ordered list of four steps a new member follows. (5) In the schedule section, include a table with a caption, thead, tbody and th elements that use the scope attribute, listing at least four weekly sessions with day, topic and time. (6) In the join section, include a form with labelled controls: full name (required, at least 2 characters), email (type email, required), a select for preferred day, a radio group inside a fieldset with a legend for experience level, a textarea for a message, a required consent checkbox, and a submit button. (7) End with a footer element containing contact details. Run the finished page through the W3C Markup Validator at validator.w3.org and fix every error it reports. Submit your HTML (paste it or upload the file) together with a note of 150 to 250 words that explains three places where you chose a semantic element instead of a div and what a screen reader user gains from each, and confirms that the validator reports no errors.',
                    'dueDays' => 10,
                ],
                'evaluation' => [
                    'title' => 'HTML & Web Fundamentals Check',
                    'description' => 'Tests understanding of the HTML document structure, semantic elements, accessibility and forms.',
                    'questions' => [
                        ['type' => 'mcq_single', 'text' => 'Which element is the most appropriate choice for the block of primary navigation links at the top of a page?', 'options' => [
                            ['text' => '<nav>', 'correct' => true], ['text' => '<section>', 'correct' => false], ['text' => '<aside>', 'correct' => false], ['text' => '<div>', 'correct' => false],
                        ]],
                        ['type' => 'mcq_single', 'text' => 'What is the purpose of the alt attribute on an img element?', 'options' => [
                            ['text' => 'It gives a text alternative for people who cannot see the image, and is shown if the image fails to load', 'correct' => true], ['text' => 'It sets the tooltip that appears when the mouse hovers over the image', 'correct' => false], ['text' => 'It makes the image load faster by caching it', 'correct' => false], ['text' => 'It sets the image width when the file is missing', 'correct' => false],
                        ]],
                        ['type' => 'true_false', 'text' => 'When a label element uses the for attribute, its value must match the id of the form control it labels.', 'correct' => true],
                        ['type' => 'mcq_multi', 'text' => 'Which of the following are valid values for the type attribute of an input element? (Select all that apply.)', 'options' => [
                            ['text' => 'email', 'correct' => true], ['text' => 'date', 'correct' => true], ['text' => 'checkbox', 'correct' => true], ['text' => 'dropdown', 'correct' => false], ['text' => 'textbox', 'correct' => false],
                        ]],
                        ['type' => 'mcq_single', 'text' => 'What does the declaration <!DOCTYPE html> at the top of a document do?', 'options' => [
                            ['text' => 'It tells the browser to render the page in standards mode', 'correct' => true], ['text' => 'It links the page to a default stylesheet', 'correct' => false], ['text' => 'It declares the character encoding as UTF-8', 'correct' => false], ['text' => 'It makes the page load faster', 'correct' => false],
                        ]],
                        ['type' => 'short_answer', 'text' => 'In one or two sentences, explain why using a table to lay out the parts of a web page is considered bad practice.'],
                    ],
                ],
            ],

            2 => [
                'topic' => 'CSS Styling & Layout',
                'liveSessionTopic' => 'debugging a broken layout with Flexbox and Grid in browser DevTools',
                'youtube' => [
                    'url' => 'https://www.youtube.com/watch?v=ieTHC78giGQ',
                    'title' => 'CSS Full Course - Includes Flexbox and CSS Grid Tutorials',
                    'channel' => 'freeCodeCamp.org',
                    'covers' => 'A full CSS course that includes the Flexbox and CSS Grid layout tutorials, directly relevant to this module.',
                ],
                'documents' => [
                    ['label' => 'Lecture Notes (Word)', 'filename' => 'module-2-css-lecture-notes.docx', 'fileType' => 'docx', 'description' => 'Lecture notes on the cascade and specificity, selectors, the box model, typography, units, positioning, Flexbox and CSS Grid, with code examples.'],
                    ['label' => 'Quick Reference (PDF)', 'filename' => 'module-2-css-quick-reference.pdf', 'fileType' => 'pdf', 'description' => 'Quick reference: specificity scores, the box model, units, positioning values, and Flexbox and Grid property cheat sheets.'],
                    ['label' => 'Slide Deck (PowerPoint)', 'filename' => 'module-2-css-slides.pptx', 'fileType' => 'pptx', 'description' => 'Lecture slides summarising the cascade, the box model, Flexbox and CSS Grid.'],
                ],
                'assignment' => [
                    'title' => 'Style the Coding Club Page with Flexbox and Grid',
                    'instructions' => 'Starting from your Module 1 page, add an external stylesheet, styles.css, linked from the head. Do not use inline styles, do not use !important, and change the HTML only to add classes, the link element, and wrapper elements if you need them. Requirements: (1) Begin with a reset that sets box-sizing: border-box on all elements. (2) On body, set the font family, a base font size in rem, and a unitless line-height, and limit paragraph line length using max-width in ch. (3) Define a palette of at least four colours and make sure body text and button text meet a contrast ratio of at least 4.5 to 1 (check with the colour picker in your browser DevTools). (4) Lay out the header with Flexbox so the club name sits on the left and the navigation links sit on the right, with a gap between the links. (5) Lay out the main element with CSS Grid so that the join section sits in a narrower right-hand column beside the about and schedule sections (hint: grid-column and grid-row let one item span several rows). (6) Style the table with borders, padding and zebra striping using nth-child. (7) Give form controls a visible :focus style and give the submit button a :hover style. (8) Use at least one class selector, one descendant or child combinator, and one attribute selector. Submit your styles.css together with a note of 150 to 250 words that names one place where two of your rules conflicted and explains, using specificity or source order, which rule won and why. Include a short description or screenshot of the result.',
                    'dueDays' => 10,
                ],
                'evaluation' => [
                    'title' => 'CSS Styling & Layout Check',
                    'description' => 'Tests understanding of the box model, specificity, positioning, Flexbox and CSS Grid.',
                    'questions' => [
                        ['type' => 'mcq_single', 'text' => 'An element has width: 200px, padding: 20px and a 5px solid border. With box-sizing: border-box, what is the total width the box occupies on the page?', 'options' => [
                            ['text' => '200px', 'correct' => true], ['text' => '250px', 'correct' => false], ['text' => '245px', 'correct' => false], ['text' => '240px', 'correct' => false],
                        ]],
                        ['type' => 'mcq_single', 'text' => 'Which of these selectors has the highest specificity?', 'options' => [
                            ['text' => '#nav a', 'correct' => true], ['text' => '.menu .item', 'correct' => false], ['text' => 'nav ul li a', 'correct' => false], ['text' => 'a:hover', 'correct' => false],
                        ]],
                        ['type' => 'true_false', 'text' => 'In a flex container that uses the default flex-direction, justify-content distributes items along the vertical axis.', 'correct' => false],
                        ['type' => 'mcq_single', 'text' => 'Which CSS layout feature is designed to place content in rows and columns at the same time?', 'options' => [
                            ['text' => 'CSS Grid', 'correct' => true], ['text' => 'Floats', 'correct' => false], ['text' => 'position: absolute', 'correct' => false], ['text' => 'display: inline', 'correct' => false],
                        ]],
                        ['type' => 'mcq_multi', 'text' => 'Which of the following are valid values of the position property? (Select all that apply.)', 'options' => [
                            ['text' => 'relative', 'correct' => true], ['text' => 'sticky', 'correct' => true], ['text' => 'fixed', 'correct' => true], ['text' => 'floating', 'correct' => false], ['text' => 'centered', 'correct' => false],
                        ]],
                        ['type' => 'short_answer', 'text' => 'In one or two sentences, explain the difference between the em unit and the rem unit.'],
                    ],
                ],
            ],

            3 => [
                'topic' => 'Responsive Web Design',
                'liveSessionTopic' => 'converting a desktop-only layout to a mobile-first responsive layout',
                'youtube' => [
                    'url' => 'https://www.youtube.com/watch?v=kBNrc1_mTr8',
                    'title' => 'Let\'s code a responsive webpage! (Mobile First) | Meta Viewport, Flexbox & Media Queries Explained',
                    'channel' => 'VirtualAddiction',
                    'covers' => 'Builds a responsive page mobile-first while explaining the viewport meta tag, Flexbox and media queries, directly relevant to this module.',
                ],
                'documents' => [
                    ['label' => 'Lecture Notes (Word)', 'filename' => 'module-3-responsive-lecture-notes.docx', 'fileType' => 'docx', 'description' => 'Lecture notes on the viewport, mobile-first CSS, media queries, fluid sizing, responsive images, custom properties, dark mode and animation, with code examples.'],
                    ['label' => 'Quick Reference (PDF)', 'filename' => 'module-3-responsive-quick-reference.pdf', 'fileType' => 'pdf', 'description' => 'Quick reference: mobile-first media queries, preference queries, clamp and min, srcset and picture patterns, and a testing checklist.'],
                    ['label' => 'Slide Deck (PowerPoint)', 'filename' => 'module-3-responsive-slides.pptx', 'fileType' => 'pptx', 'description' => 'Lecture slides summarising mobile-first design, fluid layouts, responsive images and CSS variables.'],
                ],
                'assignment' => [
                    'title' => 'Make the Coding Club Page Mobile-First Responsive',
                    'instructions' => 'Convert your Module 2 stylesheet to a mobile-first approach. Requirements: (1) Confirm the viewport meta tag is present in the head. (2) Rewrite the layout so the base styles, which have no media query, give a single-column layout that works on a 320px-wide screen with no horizontal scrolling. Then use min-width media queries written in rem units to introduce the header Flexbox row and the two-column Grid only when there is room. Choose your breakpoints by widening the window until the content starts to look wrong, not from a list of device sizes. (3) Make images flexible with max-width: 100% and height: auto, and offer at least two image files through srcset and sizes on the figure image, keeping the width and height attributes. (4) Use clamp() for the h1 font size, and give the page a centred, fluid container using min() or max-width with margin-inline: auto. (5) Move your colours and spacing into CSS custom properties on :root, and add a dark colour scheme using @media (prefers-color-scheme: dark) that changes only the variable values. (6) Add a transition on hover and focus-visible to the submit button, and disable it inside @media (prefers-reduced-motion: reduce). (7) Make every link and button in the navigation at least 44px tall. Test at 320px, 768px and 1280px using the DevTools device toolbar. Submit your updated CSS and any HTML changes together with a test report of 150 to 250 words that states, for each of the three widths, what the layout looks like and any problem you found and fixed, and names the breakpoint values you chose and why.',
                    'dueDays' => 12,
                ],
                'evaluation' => [
                    'title' => 'Responsive Web Design Check',
                    'description' => 'Tests understanding of the viewport, mobile-first media queries, fluid sizing and responsive images.',
                    'questions' => [
                        ['type' => 'mcq_single', 'text' => 'Which tag must be present in the head so that a page lays out at the real device width on a phone?', 'options' => [
                            ['text' => '<meta name="viewport" content="width=device-width, initial-scale=1">', 'correct' => true], ['text' => '<meta name="responsive" content="true">', 'correct' => false], ['text' => '<meta charset="device-width">', 'correct' => false], ['text' => '<link rel="viewport" href="device-width">', 'correct' => false],
                        ]],
                        ['type' => 'mcq_single', 'text' => 'In a mobile-first stylesheet, which media feature is normally used to add styles as the screen gets wider?', 'options' => [
                            ['text' => 'min-width', 'correct' => true], ['text' => 'max-width', 'correct' => false], ['text' => 'max-height', 'correct' => false], ['text' => 'prefers-color-scheme', 'correct' => false],
                        ]],
                        ['type' => 'true_false', 'text' => 'The rule img { max-width: 100%; height: auto; } stops an image from overflowing its container while keeping its proportions.', 'correct' => true],
                        ['type' => 'mcq_single', 'text' => 'What does font-size: clamp(1rem, 2.5vw, 2rem) do?', 'options' => [
                            ['text' => 'Scales with the viewport width but never goes below 1rem or above 2rem', 'correct' => true], ['text' => 'Sets the size to 2.5vw only when the viewport is between 1rem and 2rem wide', 'correct' => false], ['text' => 'Always sets the size to 1rem', 'correct' => false], ['text' => 'Uses whichever of the three values is largest', 'correct' => false],
                        ]],
                        ['type' => 'mcq_single', 'text' => 'Which declaration creates as many columns of at least 16rem as will fit, sharing any leftover space, without using any media queries?', 'options' => [
                            ['text' => 'grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr))', 'correct' => true], ['text' => 'grid-template-columns: 16rem 16rem 16rem', 'correct' => false], ['text' => 'grid-template-columns: repeat(16, 1fr)', 'correct' => false], ['text' => 'display: inline-grid; width: 16rem', 'correct' => false],
                        ]],
                        ['type' => 'short_answer', 'text' => 'In one or two sentences, explain why breakpoints should be placed where the content starts to look wrong rather than at specific device widths.'],
                    ],
                ],
            ],

            4 => [
                'topic' => 'JavaScript Fundamentals & the DOM',
                'liveSessionTopic' => 'building a filterable list with DOM events',
                'youtube' => [
                    'url' => 'https://www.youtube.com/watch?v=5fb2aPlgoys',
                    'title' => 'JavaScript DOM Manipulation – Full Course for Beginners',
                    'channel' => 'freeCodeCamp.org',
                    'covers' => 'Teaches how to add, remove and modify elements of a web page with JavaScript. Use it alongside the lecture notes, which also cover the language fundamentals.',
                ],
                'documents' => [
                    ['label' => 'Lecture Notes (Word)', 'filename' => 'module-4-javascript-dom-lecture-notes.docx', 'fileType' => 'docx', 'description' => 'Lecture notes on JavaScript variables, functions, arrays and objects, the DOM, events, event delegation and form validation, with code examples.'],
                    ['label' => 'Quick Reference (PDF)', 'filename' => 'module-4-javascript-dom-quick-reference.pdf', 'fileType' => 'pdf', 'description' => 'Quick reference: JavaScript syntax, array methods, DOM selection and changes, events and the Constraint Validation API.'],
                    ['label' => 'Slide Deck (PowerPoint)', 'filename' => 'module-4-javascript-dom-slides.pptx', 'fileType' => 'pptx', 'description' => 'Lecture slides summarising JavaScript fundamentals, the DOM, events and form validation.'],
                ],
                'assignment' => [
                    'title' => 'Build a Filterable Course List and Validate the Enquiry Form',
                    'instructions' => 'Add JavaScript to your coding club page in a file named app.js, loaded with a script element that has the defer attribute. Do not use innerHTML with any user-supplied text. Requirements: (1) Define an array of at least six course objects, each with a title, a level ("beginner", "intermediate" or "advanced") and a number of weeks. (2) Render the courses as cards in a new section of the page using document.createElement, textContent and classList, through one function that takes a course and returns its element. (3) Add a text search input and a level select. Use the input and change events so the list re-renders to show only the courses that match both the search text (case-insensitive, matching part of the title) and the selected level, using filter. Show a message when no course matches, and show the number of matching courses in an element with role="status". (4) Use one click listener on the list container, with event delegation and closest(), so that clicking a card toggles a selected class on it. (5) Validate the enquiry form from Module 1 in a submit event listener: call preventDefault, then check the full name (required, at least 2 characters) and the email (valid format) using the validity properties. Show a specific error message beside each invalid field and set aria-invalid on it. On success, show a confirmation message in an element with role="status" and reset the form. Do not send the data anywhere. Submit app.js and any HTML or CSS changes, together with a note of 150 to 250 words describing three test cases you ran (including one invalid form case and one search with no match) and what you observed.',
                    'dueDays' => 14,
                ],
                'evaluation' => [
                    'title' => 'JavaScript Fundamentals & the DOM Check',
                    'description' => 'Tests understanding of core JavaScript, array methods, DOM manipulation and events.',
                    'questions' => [
                        ['type' => 'mcq_single', 'text' => 'What does document.querySelector(".card") return when no element on the page has the class card?', 'options' => [
                            ['text' => 'null', 'correct' => true], ['text' => 'An empty array', 'correct' => false], ['text' => 'undefined', 'correct' => false], ['text' => 'It throws a SyntaxError', 'correct' => false],
                        ]],
                        ['type' => 'mcq_single', 'text' => 'Which is the safest way to insert text typed by a user into an element?', 'options' => [
                            ['text' => 'element.textContent = value', 'correct' => true], ['text' => 'element.innerHTML = value', 'correct' => false], ['text' => 'element.outerHTML = value', 'correct' => false], ['text' => 'document.write(value)', 'correct' => false],
                        ]],
                        ['type' => 'true_false', 'text' => 'The strict equality operator === compares both value and type, without converting either operand.', 'correct' => true],
                        ['type' => 'mcq_single', 'text' => 'What is the value of [1, 2, 3, 4].filter((n) => n % 2 === 0)?', 'options' => [
                            ['text' => '[2, 4]', 'correct' => true], ['text' => '[1, 3]', 'correct' => false], ['text' => '6', 'correct' => false], ['text' => '[false, true, false, true]', 'correct' => false],
                        ]],
                        ['type' => 'mcq_single', 'text' => 'What does calling event.preventDefault() inside a form submit listener do?', 'options' => [
                            ['text' => 'It stops the browser performing its default action, such as navigating away, so JavaScript can handle the submission', 'correct' => true], ['text' => 'It permanently removes the listener from the form', 'correct' => false], ['text' => 'It validates every field automatically', 'correct' => false], ['text' => 'It stops the event bubbling up to parent elements', 'correct' => false],
                        ]],
                        ['type' => 'short_answer', 'text' => 'In two or three sentences, explain what event delegation is and why it suits a list whose items are added while the page is running.'],
                    ],
                ],
            ],

            5 => [
                'topic' => 'APIs, Tooling & Deployment',
                'liveSessionTopic' => 'fetching an API, handling failure states and deploying a Vite build',
                'youtube' => [
                    'url' => 'https://www.youtube.com/watch?v=kXSMTvvObLg',
                    'title' => 'Learn the Fetch API with Async/Await',
                    'channel' => 'Francisco Reynoso',
                    'covers' => 'Shows how to make HTTP requests in vanilla JavaScript with the Fetch API and async/await, directly relevant to this module.',
                ],
                'documents' => [
                    ['label' => 'Lecture Notes (Word)', 'filename' => 'module-5-apis-deployment-lecture-notes.docx', 'fileType' => 'docx', 'description' => 'Lecture notes on HTTP and CORS, Promises, the Fetch API, UI states, localStorage, ES modules, npm, Vite, Git and deployment, with code examples.'],
                    ['label' => 'Quick Reference (PDF)', 'filename' => 'module-5-apis-deployment-quick-reference.pdf', 'fileType' => 'pdf', 'description' => 'Quick reference: HTTP status codes, fetch patterns, localStorage, ES modules, Vite and Git commands, and a deployment checklist.'],
                    ['label' => 'Slide Deck (PowerPoint)', 'filename' => 'module-5-apis-deployment-slides.pptx', 'fileType' => 'pptx', 'description' => 'Lecture slides summarising fetch and async/await, UI states, browser storage, Vite, Git and deployment.'],
                ],
                'assignment' => [
                    'title' => 'Fetch, Save and Deploy an Instructor Directory',
                    'instructions' => 'Build and publish a small project called instructor-directory, created with Vite (vanilla template), that lists instructors loaded from the public JSONPlaceholder API at https://jsonplaceholder.typicode.com/users. Requirements: (1) Fetch the users with async/await in a function that checks response.ok and throws a helpful error for any non-2xx status. (2) Show all four states: a loading message while waiting; the list of names, emails and company names (user.company.name) on success; a friendly empty-state message when a search matches nobody; and a plain-language error message with a Retry button when the request fails. Test the error state by setting the DevTools Network panel to Offline before loading the page. (3) Add a search box that filters the loaded users by name without making a new request. (4) Add a Favourite button to each instructor that toggles that instructor and saves the list of favourite ids in localStorage as JSON, so favourites are still marked after a page reload. Read the saved value defensively so corrupt data cannot crash the page. (5) Split your code into at least two ES modules, for example api.js and storage.js, that export functions and are imported by main.js. (6) Keep the project in a Git repository with at least five commits that have meaningful messages, and add a .gitignore that excludes node_modules and dist. (7) Deploy the production build to Netlify or GitHub Pages (if you use GitHub Pages, set the base option in vite.config.js) and open the live link on a phone. Submit the live URL and the GitHub repository URL as text, together with a note of 150 to 250 words explaining how each of the four states behaves, how you tested the error state, and one problem you met while deploying and how you fixed it.',
                    'dueDays' => 14,
                ],
                'evaluation' => [
                    'title' => 'APIs, Tooling & Deployment Check',
                    'description' => 'Tests understanding of the Fetch API, async/await, browser storage, Vite tooling and deployment.',
                    'questions' => [
                        ['type' => 'mcq_single', 'text' => 'When does the promise returned by fetch() reject?', 'options' => [
                            ['text' => 'Only when the request fails at the network level, for example when the user is offline', 'correct' => true], ['text' => 'Whenever the response status is 400 or higher', 'correct' => false], ['text' => 'Whenever the response body is not valid JSON', 'correct' => false], ['text' => 'Whenever the response status is anything other than 200', 'correct' => false],
                        ]],
                        ['type' => 'mcq_single', 'text' => 'Which property of a fetch Response is true for status codes from 200 to 299?', 'options' => [
                            ['text' => 'ok', 'correct' => true], ['text' => 'success', 'correct' => false], ['text' => 'valid', 'correct' => false], ['text' => 'done', 'correct' => false],
                        ]],
                        ['type' => 'true_false', 'text' => 'localStorage can only store strings, so an object must be converted with JSON.stringify before it is saved.', 'correct' => true],
                        ['type' => 'mcq_single', 'text' => 'In a Vite project, which environment variables are exposed to code running in the browser?', 'options' => [
                            ['text' => 'Only those whose names start with VITE_', 'correct' => true], ['text' => 'Every variable defined in the .env file', 'correct' => false], ['text' => 'Only those whose names start with SECRET_', 'correct' => false], ['text' => 'None of them', 'correct' => false],
                        ]],
                        ['type' => 'mcq_single', 'text' => 'Which command creates the optimised production files, in the dist folder, for a Vite project?', 'options' => [
                            ['text' => 'npm run build', 'correct' => true], ['text' => 'npm run dev', 'correct' => false], ['text' => 'npm run preview', 'correct' => false], ['text' => 'npm install', 'correct' => false],
                        ]],
                        ['type' => 'short_answer', 'text' => 'A fetch request to an API returns a 500 status. In two or three sentences, describe what your interface should show the user and why.'],
                    ],
                ],
            ],
        ];
    }
}
