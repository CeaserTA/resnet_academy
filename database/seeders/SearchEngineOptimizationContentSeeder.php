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
use Illuminate\Support\Facades\Storage;

/**
 * Seeds the "Search Engine Optimization" course with a 9-module beginner curriculum and real,
 * module-specific content: a YouTube lesson, a scheduled live session, three instructional
 * documents (Word/PDF/PowerPoint, generated once and committed under
 * content/search-engine-optimization/), one realistic assignment and one quiz — per module.
 *
 * Mirrors BackendDevelopmentContentSeeder / FrontendDevelopmentContentSeeder. The difference is
 * the first step: this course originally had 5 broader modules, so syncModules() reshapes it to
 * the 9 approved modules by order_index (renaming 1–5 in place, creating 6–9). That is only safe
 * because the original modules had no resources, assessments or enrolments when this was written.
 *
 * Idempotent: modules are matched by (course, order_index); every resource/assignment/question
 * bank/question/evaluation is looked up by its natural key before being created; documents are
 * written to a deterministic storage path. Re-running never duplicates rows or files.
 *
 * Run with: php artisan db:seed --class=SearchEngineOptimizationContentSeeder
 */
final class SearchEngineOptimizationContentSeeder extends Seeder
{
    private const COURSE_SLUG = 'search-engine-optimization';

    private const CONTENT_DIR = __DIR__.'/content/search-engine-optimization';

    public function run(): void
    {
        $course = Course::where('slug', self::COURSE_SLUG)->first();

        if (! $course) {
            $this->command?->warn('No course with slug "'.self::COURSE_SLUG.'" found — skipping SearchEngineOptimizationContentSeeder.');

            return;
        }

        $moduleContent = $this->moduleContent();
        $this->syncModules($course, $moduleContent);

        $modules = Module::where('course_id', $course->id)->orderBy('order_index')->get();

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

        $this->command?->info('Search Engine Optimization content seeded for '.$modules->count().' modules.');
    }

    /**
     * @param  array<int, array<string, mixed>>  $moduleContent
     */
    private function syncModules(Course $course, array $moduleContent): void
    {
        foreach ($moduleContent as $orderIndex => $content) {
            $module = Module::where('course_id', $course->id)->where('order_index', $orderIndex)->first();

            if ($module) {
                if ($module->title !== $content['module']['title'] || $module->description !== $content['module']['description']) {
                    $module->update($content['module']);
                }

                continue;
            }

            Module::create(['course_id' => $course->id, 'order_index' => $orderIndex] + $content['module']);
        }
    }

    private function seedYoutubeResource(Module $module, array $content): void
    {
        $title = $content['topic'].' — Video Lesson';

        if (Resource::where('module_id', $module->id)->where('title', $title)->exists()) {
            return;
        }

        app(ResourceManager::class)->create($module, [
            'type' => 'external_link',
            'title' => $title,
            'description' => 'YouTube: "'.$content['youtube']['title'].'" ('.$content['youtube']['channel'].'). '.$content['youtube']['why'],
            'url' => $content['youtube']['url'],
        ]);
    }

    private function seedLiveSessionResource(Module $module, array $content): void
    {
        $title = 'Live Session: '.$content['topic'];

        if (Resource::where('module_id', $module->id)->where('title', $title)->exists()) {
            return;
        }

        // Google Meet codes are three lowercase-letter groups; derive a stable one per module.
        $code = substr(md5('seo-module-'.$module->order_index), 0, 10);
        $code = strtr($code, '0123456789', 'abcdefghij');

        app(ResourceManager::class)->create($module, [
            'type' => 'live_session',
            'title' => $title,
            'description' => 'Live, instructor-led session: '.$content['liveSessionTopic'].
                '. PLACEHOLDER meeting link — the real room link is shared with your cohort before the session.',
            'provider' => 'google_meet',
            'meeting_url' => 'https://meet.google.com/'.substr($code, 0, 3).'-'.substr($code, 3, 4).'-'.substr($code, 7, 3),
            'scheduled_at' => now()->addWeeks($module->order_index)->next('Thursday')->setTime(18, 0),
            'duration_minutes' => 60,
        ]);
    }

    private function seedDocumentResources(Course $course, Module $module, array $content): void
    {
        $mediaStorage = app(MediaStorageService::class);
        $resourceManager = app(ResourceManager::class);
        $base = 'module-'.$module->order_index.'-'.$content['fileSlug'];

        $documents = [
            ['label' => 'Lecture Notes (Word)', 'filename' => "{$base}-lecture-notes.docx", 'fileType' => 'docx', 'description' => 'Full lecture notes: '.$content['docs']['notes']],
            ['label' => 'Quick Reference (PDF)', 'filename' => "{$base}-quick-reference.pdf", 'fileType' => 'pdf', 'description' => 'One-page quick reference: '.$content['docs']['reference']],
            ['label' => 'Slide Deck (PowerPoint)', 'filename' => "{$base}-slides.pptx", 'fileType' => 'pptx', 'description' => 'Lecture slides: '.$content['docs']['slides']],
        ];

        foreach ($documents as $doc) {
            $title = $content['topic'].' — '.$doc['label'];
            $bytes = file_get_contents(self::CONTENT_DIR.'/'.$doc['filename']);
            $sizeKb = (int) ceil(strlen($bytes) / 1024);

            // Deterministic path so re-seeding overwrites the same object instead of orphaning copies.
            // Uploaded on every run (not only when the row is new) so a re-run also restores files
            // whose earlier upload failed — e.g. R2 rejecting requests from a machine with a skewed clock.
            $storagePath = "resources/{$course->id}/seed/{$doc['filename']}";

            try {
                $mediaStorage->putRaw($storagePath, $bytes);
                $stored = $this->isStored($storagePath);
            } catch (\RuntimeException) {
                $stored = false;
            }

            if (! $stored) {
                $this->command?->warn("Upload failed for {$storagePath} — check R2 credentials and that the system clock is in sync, then re-run this seeder.");
            }

            if (Resource::where('module_id', $module->id)->where('title', $title)->exists()) {
                continue;
            }

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

    /**
     * Double-checks an upload: older MediaStorageService::putRaw() failed silently (the r2 disk
     * uses 'throw' => false), and when R2 is unreachable the existence check itself throws.
     */
    private function isStored(string $path): bool
    {
        try {
            return Storage::disk('r2')->exists($path);
        } catch (\Throwable) {
            return false;
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
                QuestionType::McqSingle->value => array_map(
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
            'instructions' => 'You have 20 minutes and need a score of 70% or higher to pass. You may attempt this quiz up to 3 times.',
            'pass_score' => 70.00,
            'max_attempts' => 3,
            'time_limit_minutes' => 20,
            'question_ids' => $questionIds,
        ]);
    }

    /**
     * Keyed by order_index (1..9). Correct mcq_single options are deliberately NOT always first.
     *
     * @return array<int, array<string, mixed>>
     */
    private function moduleContent(): array
    {
        $mcq = fn (string $text, array $options, int $correct): array => [
            'type' => 'mcq_single',
            'text' => $text,
            'options' => array_map(fn (string $o, int $i) => ['text' => $o, 'correct' => $i === $correct], $options, array_keys($options)),
        ];
        $tf = fn (string $text, bool $correct): array => ['type' => 'true_false', 'text' => $text, 'correct' => $correct];
        $short = fn (string $text): array => ['type' => 'short_answer', 'text' => $text];

        return [
            1 => [
                'module' => ['title' => 'How Search Engines Work', 'description' => 'How Google crawls, indexes and ranks pages; search intent; and the features of the modern results page, including AI Overviews and the local pack.'],
                'topic' => 'How Search Engines Work',
                'fileSlug' => 'how-search-works',
                'liveSessionTopic' => 'tracing how a real Kampala business page is crawled, indexed and ranked using Search Console\'s URL Inspection tool',
                'youtube' => ['url' => 'https://www.youtube.com/watch?v=5MIAugQ17ks', 'title' => 'Introducing How Search Works', 'channel' => 'Google Search Central', 'why' => 'Google\'s own engineer introduces crawling, indexing and serving — the backbone of this module.'],
                'docs' => ['notes' => 'crawling, indexing, serving, search intent and SERP features, with a myths-vs-reality table.', 'reference' => 'the three stages of search, intent types and SERP features at a glance.', 'slides' => 'how Google turns the web into ranked results.'],
                'assignment' => [
                    'title' => 'Trace a Page Through Crawling, Indexing and Ranking',
                    'instructions' => "Choose one real business website in Uganda (not your own) and one of its important pages, such as a service or product page.\n\n1. Crawling: open the site's robots.txt (add /robots.txt to the domain). Is the page allowed to be crawled? Is an XML sitemap referenced?\n2. Indexing: search Google for site: followed by the page's URL. Is it indexed? Note the title and description Google shows.\n3. Intent: pick the query you think this page should rank for. Search it and classify the intent (informational, navigational, commercial or transactional) based on the kinds of pages that rank.\n4. SERP features: list every feature on that results page (AI Overview, local pack, People Also Ask, video, images, featured snippet).\n5. Verdict: in 250–400 words, explain whether the page is a good match for the query's intent and one change that would improve its chances.\n\nSubmit screenshots of steps 1–4 and your written verdict.",
                    'dueDays' => 7,
                ],
                'evaluation' => [
                    'title' => 'How Search Works Check',
                    'description' => 'Tests the crawling → indexing → serving pipeline, search intent and SERP features.',
                    'questions' => [
                        $mcq('Which stage of Google Search stores and organises page content so it can later be retrieved for queries?', ['Crawling', 'Indexing', 'Serving', 'Rendering the SERP'], 1),
                        $tf('Blocking a URL in robots.txt guarantees it will never appear in Google\'s search results.', false),
                        $mcq('A search for "best laptops for students 2026" most likely has which intent?', ['Navigational', 'Transactional', 'Commercial investigation', 'Local'], 2),
                        $mcq('What does canonicalisation do?', ['Chooses one URL to represent a group of duplicate pages', 'Speeds up crawling of JavaScript', 'Adds star ratings to results', 'Blocks spam links'], 0),
                        $mcq('Which of these is a confirmed myth?', ['Page speed can affect rankings', 'The meta keywords tag helps Google rank pages', 'Links help Google discover pages', 'Mobile usability matters'], 1),
                        $short('Name the automated program Google uses to discover and download web pages.'),
                    ],
                ],
            ],

            2 => [
                'module' => ['title' => 'Keyword Research', 'description' => 'Finding the words your audience searches for, judging keywords by intent, difficulty and traffic potential, and mapping one topic to each page.'],
                'topic' => 'Keyword Research',
                'fileSlug' => 'keyword-research',
                'liveSessionTopic' => 'building a keyword map for a real Ugandan small business using free tools',
                'youtube' => ['url' => 'https://www.youtube.com/watch?v=GsW5GeDXNkU', 'title' => 'Keyword Research Pt. 2: How to Find Keywords for Your Website - 1.3. SEO Course by Ahrefs', 'channel' => 'Ahrefs', 'why' => 'Walks through generating and evaluating keyword ideas step by step.'],
                'docs' => ['notes' => 'seed keywords, volume vs difficulty vs traffic potential, intent, long-tail keywords and keyword mapping.', 'reference' => 'keyword metrics, free tools and a sample keyword map.', 'slides' => 'from seed keywords to a keyword map.'],
                'assignment' => [
                    'title' => 'Keyword Research for a Kampala Business',
                    'instructions' => "Pick one of these sample businesses: a Kampala coffee roaster selling online, a driving school in Entebbe, or a web-design studio in Kampala.\n\n1. List 10 seed keywords a real customer might use.\n2. Using free tools (Google autocomplete, People Also Ask, Google Keyword Planner and/or the free versions of Ahrefs or Semrush tools), expand these into at least 30 keyword ideas.\n3. For the 15 most promising, record: estimated volume (range is fine), intent, and what type of page currently ranks.\n4. Group them into topics and build a keyword map assigning each topic to one existing or proposed page URL.\n5. In 200–300 words, justify your top three priority topics for a brand-new website with few backlinks.\n\nSubmit your spreadsheet (or a table in text) and your justification.",
                    'dueDays' => 7,
                ],
                'evaluation' => [
                    'title' => 'Keyword Research Check',
                    'description' => 'Tests keyword metrics, intent analysis, long-tail strategy and keyword mapping.',
                    'questions' => [
                        $mcq('Why is "traffic potential" often more useful than a single keyword\'s search volume?', ['It includes paid ad clicks', 'A top-ranking page usually ranks for many related variations too', 'It is always an exact figure', 'Google publishes it in Search Console'], 1),
                        $mcq('The results for a query are all "top 10" list articles. What should you create to compete?', ['A product page', 'A contact page', 'A well-researched list article', 'A PDF brochure'], 2),
                        $tf('New websites with few backlinks usually find it easier to rank for long-tail keywords than for broad head terms.', true),
                        $mcq('Two pages on your site target the same intent and keep swapping positions. What is this called?', ['Keyword cannibalisation', 'Keyword stuffing', 'Canonicalisation', 'Link building'], 0),
                        $mcq('Which free source shows the actual queries your site already receives clicks from?', ['Google Business Profile', 'Google Search Console', 'robots.txt', 'PageSpeed Insights'], 1),
                        $short('In one sentence, what is search intent?'),
                    ],
                ],
            ],

            3 => [
                'module' => ['title' => 'On-Page SEO', 'description' => 'Optimising title tags, meta descriptions, headings, content, images and internal links so each page clearly matches its target topic.'],
                'topic' => 'On-Page SEO',
                'fileSlug' => 'on-page-seo',
                'liveSessionTopic' => 'auditing and rewriting the titles, headings and internal links of a live small-business page',
                'youtube' => ['url' => 'https://www.youtube.com/watch?v=IrFAeQgzE7w', 'title' => 'On-Page SEO Pt 2: How to Optimize a Page for a Keyword - 2.2. SEO Course by Ahrefs', 'channel' => 'Ahrefs', 'why' => 'Demonstrates optimising a real page for a target keyword.'],
                'docs' => ['notes' => 'title tags, meta descriptions, heading structure, URLs, images and internal linking with before/after examples.', 'reference' => 'an on-page checklist with good practice and common mistakes.', 'slides' => 'the on-page elements that matter and how to get them right.'],
                'assignment' => [
                    'title' => 'On-Page Audit and Rewrite',
                    'instructions' => "Choose one service or product page on a real Ugandan business website and a realistic target keyword for it.\n\n1. Record the current title tag, meta description, H1, H2s, URL and the alt text of the main image (use View Source or a browser SEO extension).\n2. Search the target keyword and note what the top three results do better (intent, structure, depth).\n3. Rewrite: a new title (50–60 characters), a new meta description (150–160 characters), a new H1 and an improved H2 outline.\n4. Suggest three internal links the site should add to this page, with the linking page and descriptive anchor text for each.\n5. Explain each change in one or two sentences.\n\nSubmit a before/after table and your explanations.",
                    'dueDays' => 7,
                ],
                'evaluation' => [
                    'title' => 'On-Page SEO Check',
                    'description' => 'Tests title tags, meta descriptions, heading structure, images and internal links.',
                    'questions' => [
                        $mcq('What is the main SEO benefit of a well-written meta description?', ['It is a strong ranking factor', 'It can improve click-through rate from results', 'It stops Google rewriting titles', 'It speeds up crawling'], 1),
                        $mcq('Which title tag is best for a Kampala web-design service page?', ['Home | Welcome', 'Web Design Web Design Kampala Web Design Uganda Cheap', 'Website Design in Kampala — Fast, Mobile-Friendly Sites | PixelWorks', 'Services'], 2),
                        $tf('A page should normally have exactly one H1 that states its main topic.', true),
                        $mcq('Which anchor text is most helpful for an internal link to your ecommerce packages?', ['click here', 'read more', 'see our ecommerce website packages', 'this page'], 2),
                        $mcq('What is the purpose of image alt text?', ['To describe the image for screen readers and image search', 'To store the image file size', 'To list as many keywords as possible', 'To set the image dimensions'], 0),
                        $short('What is an "orphan page"?'),
                    ],
                ],
            ],

            4 => [
                'module' => ['title' => 'Technical SEO', 'description' => 'Making sites crawlable and indexable: robots.txt, noindex, canonical tags, redirects, XML sitemaps, HTTPS, status codes and structured data.'],
                'topic' => 'Technical SEO',
                'fileSlug' => 'technical-seo',
                'liveSessionTopic' => 'running a technical crawl of a sample site and fixing robots.txt, redirect and sitemap issues',
                'youtube' => ['url' => 'https://www.youtube.com/watch?v=RFlpwKQ0bEs', 'title' => 'Technical SEO Best Practices for Beginners - 4.2. SEO Course by Ahrefs', 'channel' => 'Ahrefs', 'why' => 'Covers the core technical checks every beginner should know.'],
                'docs' => ['notes' => 'robots.txt, noindex, canonicals, redirects, sitemaps, HTTPS, status codes and JSON-LD structured data.', 'reference' => 'which control to use for which goal, plus status codes.', 'slides' => 'crawlability, indexing controls and structured data.'],
                'assignment' => [
                    'title' => 'Technical SEO Health Check',
                    'instructions' => "Crawl a real website of your choice (up to 500 URLs) with the free version of Screaming Frog SEO Spider or Ahrefs Webmaster Tools.\n\n1. Report the number of URLs returning 200, 3xx, 4xx and 5xx.\n2. Find at least one redirect chain or broken internal link and state how to fix it.\n3. Review robots.txt: is anything important blocked? Is a sitemap referenced?\n4. Open the XML sitemap: does it contain any non-200, redirected or noindex URLs?\n5. Test one page in Google's Rich Results Test. Which structured data types are present and are there errors? Write a correct JSON-LD snippet for one type the page is missing (for example Organization or BreadcrumbList) that matches the visible content.\n\nSubmit your findings as a short report with screenshots and your JSON-LD snippet.",
                    'dueDays' => 10,
                ],
                'evaluation' => [
                    'title' => 'Technical SEO Check',
                    'description' => 'Tests crawling and indexing controls, sitemaps, status codes and structured data.',
                    'questions' => [
                        $mcq('You want a thank-you page to stay out of Google\'s results. What should you use?', ['robots.txt Disallow', 'A noindex meta robots tag', 'A 302 redirect', 'A longer title tag'], 1),
                        $mcq('A page has moved permanently to a new URL. Which response should the old URL return?', ['200', '302', '301', '503'], 2),
                        $tf('An XML sitemap should include redirected and noindexed URLs so Google can find them.', false),
                        $mcq('Which structured data format does Google recommend?', ['Microdata only', 'JSON-LD', 'RDFa only', 'Meta keywords'], 1),
                        $mcq('What is the maximum number of URLs in a single XML sitemap file?', ['1,000', '10,000', '50,000', 'Unlimited'], 2),
                        $short('What does rel="canonical" tell Google?'),
                    ],
                ],
            ],

            5 => [
                'module' => ['title' => 'Page Experience: Mobile & Core Web Vitals', 'description' => 'Mobile-first indexing and the Core Web Vitals — LCP, INP and CLS — with field vs lab data and practical speed fixes.'],
                'topic' => 'Page Experience',
                'fileSlug' => 'page-experience',
                'liveSessionTopic' => 'measuring a live site\'s Core Web Vitals in PageSpeed Insights and Chrome DevTools and fixing the worst metric',
                'youtube' => ['url' => 'https://www.youtube.com/watch?v=M5oe010pYbA', 'title' => 'Monitor live Core Web Vitals in Chrome DevTools #DevToolsTips', 'channel' => 'Chrome for Developers', 'why' => 'Shows how to see LCP, INP and CLS live while you use a page — the fastest way to debug them.'],
                'docs' => ['notes' => 'mobile-first indexing, LCP/INP/CLS with thresholds, field vs lab data and fixes for each metric.', 'reference' => 'Core Web Vitals thresholds and a symptom → cause → fix table.', 'slides' => 'mobile-first indexing and the three Core Web Vitals.'],
                'assignment' => [
                    'title' => 'Core Web Vitals Diagnosis',
                    'instructions' => "Pick a real Ugandan news, shopping or business website.\n\n1. Run its homepage and one inner page through PageSpeed Insights (mobile). Record the field data (if available) and lab data for LCP, INP (or Total Blocking Time in lab) and CLS.\n2. Identify the LCP element on each page and explain why it loads slowly (or quickly).\n3. Open the page in Chrome DevTools' Performance panel, interact with it (open a menu, tap a button) and record the INP value you observe.\n4. Find one cause of layout shift, if any.\n5. Write a prioritised list of five fixes, each with the metric it improves and why.\n\nSubmit screenshots and your list of fixes.",
                    'dueDays' => 7,
                ],
                'evaluation' => [
                    'title' => 'Page Experience Check',
                    'description' => 'Tests mobile-first indexing, Core Web Vitals thresholds and common performance fixes.',
                    'questions' => [
                        $mcq('Which metric replaced First Input Delay (FID) as a Core Web Vital in March 2024?', ['Time to First Byte', 'Interaction to Next Paint (INP)', 'First Contentful Paint', 'Speed Index'], 1),
                        $mcq('What is the "good" threshold for Largest Contentful Paint?', ['1.0 s or less', '2.5 s or less', '4.0 s or less', '10 s or less'], 1),
                        $mcq('Text jumps down the page as an ad loads above it. Which metric is affected?', ['LCP', 'INP', 'CLS', 'TTFB'], 2),
                        $tf('Google primarily uses the mobile version of a site\'s content for indexing and ranking.', true),
                        $mcq('Which fix is most likely to improve a slow LCP caused by a large hero image?', ['Lazy-load the hero image', 'Compress it to WebP/AVIF and preload it', 'Add more JavaScript', 'Remove the page title'], 1),
                        $short('What is the difference between field data and lab data?'),
                    ],
                ],
            ],

            6 => [
                'module' => ['title' => 'Content Strategy for SEO', 'description' => 'Planning topic clusters, writing helpful people-first content that shows E-E-A-T, and running an editorial calendar with regular refreshes.'],
                'topic' => 'Content Strategy for SEO',
                'fileSlug' => 'content-strategy',
                'liveSessionTopic' => 'designing a topic cluster and a four-week editorial calendar for a sample Kampala business',
                'youtube' => ['url' => 'https://www.youtube.com/watch?v=n5KKbPS6N-g', 'title' => 'How to Create Content that\'s "Better" than Your Competitor\'s', 'channel' => 'Ahrefs', 'why' => 'Explains the concrete ways content can be better than what already ranks.'],
                'docs' => ['notes' => 'topic clusters, helpful content, E-E-A-T, AI-assisted content and editorial calendars.', 'reference' => 'a sample topic cluster and E-E-A-T signals.', 'slides' => 'planning content that ranks and deserves to.'],
                'assignment' => [
                    'title' => 'Topic Cluster and Editorial Calendar',
                    'instructions' => "Using the business from your keyword research assignment (or a new one approved by your mentor):\n\n1. Define one pillar topic and at least five cluster articles, each with a working title, target keyword and intent.\n2. Draw or list the internal links between pillar and clusters.\n3. For the pillar page, compare the top three ranking results and list at least three concrete ways your page will be better (fresher data, local prices, original photos, a template, answers to follow-up questions).\n4. Describe how you will show E-E-A-T on the pillar page (author, experience, sources, trust signals).\n5. Build a four-week editorial calendar: title, format, owner, due date, status.\n\nSubmit your cluster plan, the \"better than competitors\" list and the calendar.",
                    'dueDays' => 10,
                ],
                'evaluation' => [
                    'title' => 'Content Strategy Check',
                    'description' => 'Tests topic clusters, helpful content, E-E-A-T and content planning.',
                    'questions' => [
                        $mcq('In a topic cluster, what is the pillar page?', ['A page that covers a broad topic and links to detailed subtopic pages', 'The homepage', 'A page with only images', 'A paid landing page'], 0),
                        $mcq('In E-E-A-T, which element does Google describe as the most important?', ['Experience', 'Expertise', 'Authoritativeness', 'Trustworthiness'], 3),
                        $tf('Google\'s guidance says content is judged on whether it is helpful, not simply on whether AI was used to produce it.', true),
                        $mcq('Which is the best way to make content "better" than what ranks?', ['Make it twice as long', 'Repeat the keyword more often', 'Add original data, first-hand examples or local detail competitors lack', 'Copy the top result and reword it'], 2),
                        $mcq('Search Console shows a page with rising impressions but falling clicks. A sensible action is to…', ['Delete the page', 'Refresh the content and improve its title and snippet', 'Block it in robots.txt', 'Buy links to it'], 1),
                        $short('Give one way to demonstrate first-hand experience in an article.'),
                    ],
                ],
            ],

            7 => [
                'module' => ['title' => 'Off-Page & Local SEO', 'description' => 'Earning quality backlinks through linkable assets, outreach and digital PR, avoiding link schemes, and optimising Google Business Profile for local search.'],
                'topic' => 'Off-Page & Local SEO',
                'fileSlug' => 'off-page-local-seo',
                'liveSessionTopic' => 'optimising a real Google Business Profile and drafting a link-outreach email for a linkable asset',
                'youtube' => ['url' => 'https://www.youtube.com/watch?v=jTABfFhvFpE', 'title' => 'Link Building Tactics for Beginners - 3.4. SEO Course by Ahrefs', 'channel' => 'Ahrefs', 'why' => 'Three proven, beginner-friendly link-building tactics.'],
                'docs' => ['notes' => 'link quality, ethical link building, link attributes and spam policies, Google Business Profile, reviews and citations.', 'reference' => 'good vs risky links and a Google Business Profile checklist.', 'slides' => 'earning links and winning the local pack.'],
                'assignment' => [
                    'title' => 'Link Opportunities and Local Profile Plan',
                    'instructions' => "Choose a real local business in Uganda that serves customers in a specific area.\n\n1. Find its Google Business Profile (if any) and score it against the module checklist: name, primary category, hours, photos, services, description, reviews and review responses.\n2. Check NAP consistency: compare the name, address and phone number on its website, Google Business Profile and two directories.\n3. Propose one linkable asset the business could create (e.g. a local price guide or original survey) and list five realistic websites that might link to it, with why.\n4. Write a short, personalised outreach email (under 150 words) to one of them.\n5. Flag any link tactic you would NOT use for this business and why.\n\nSubmit the profile scorecard, NAP comparison, asset idea with prospects and your email.",
                    'dueDays' => 10,
                ],
                'evaluation' => [
                    'title' => 'Off-Page & Local SEO Check',
                    'description' => 'Tests link quality, link attributes, spam policies and local SEO.',
                    'questions' => [
                        $mcq('Which link is likely to be the most valuable?', ['A footer link from an unrelated overseas site', 'An editorial link in a relevant article on a respected Ugandan news site', 'A link from a directory package of 500 sites', 'A link in a spam blog comment'], 1),
                        $mcq('Which rel attribute should a paid placement use?', ['rel="ugc"', 'rel="canonical"', 'rel="sponsored"', 'rel="alternate"'], 2),
                        $tf('Buying links that pass ranking credit is a violation of Google\'s spam policies.', true),
                        $mcq('What does NAP stand for in local SEO?', ['Name, Address, Phone number', 'New Article Publishing', 'Network Access Point', 'No-index Attribute Policy'], 0),
                        $mcq('Which three factors does Google use for local results?', ['Price, speed and colour', 'Relevance, distance and prominence', 'Word count, images and fonts', 'Age, length and budget'], 1),
                        $short('What is a "linkable asset"?'),
                    ],
                ],
            ],

            8 => [
                'module' => ['title' => 'Measuring SEO: Search Console & GA4', 'description' => 'Using Google Search Console and Google Analytics 4 to track visibility, traffic and key events, diagnose indexing, and report on algorithm updates.'],
                'topic' => 'Measuring SEO',
                'fileSlug' => 'measuring-seo',
                'liveSessionTopic' => 'setting up Search Console and GA4 on a live site and building a first monthly report',
                'youtube' => ['url' => 'https://www.youtube.com/watch?v=ONr5Z7VhNFI', 'title' => 'Intro to Google Search Console - Search Console Training', 'channel' => 'Google Search Central', 'why' => 'Google\'s official introduction to Search Console. The interface has evolved since recording, but the reports and concepts it teaches are unchanged.'],
                'docs' => ['notes' => 'Search Console reports, URL Inspection, GA4 key events and organic traffic, SEO reporting and algorithm updates.', 'reference' => 'Search Console metrics and a monthly SEO report template.', 'slides' => 'measuring and reporting SEO performance.'],
                'assignment' => [
                    'title' => 'Build a Monthly SEO Report',
                    'instructions' => "Use a website you have Search Console and GA4 access to (your own, a family business, or the Google Merchandise Store GA4 demo account for the analytics part).\n\n1. Search Console: export the last 3 months of Performance data. List the top 10 queries and top 5 pages by clicks, and one page with high impressions but low CTR.\n2. Page indexing: record the number of indexed pages and the top two reasons pages are not indexed.\n3. GA4: report organic sessions for the same period and at least one key event from organic traffic.\n4. Check the Google Search Status Dashboard for any updates in the period and say whether they coincide with changes you see.\n5. Write a one-page report using the module template: visibility, traffic, outcomes, health and three next actions.\n\nSubmit your report with supporting screenshots.",
                    'dueDays' => 10,
                ],
                'evaluation' => [
                    'title' => 'Measuring SEO Check',
                    'description' => 'Tests Search Console metrics, indexing diagnosis, GA4 key events and responding to updates.',
                    'questions' => [
                        $mcq('In Search Console, CTR is calculated as…', ['Impressions ÷ clicks', 'Clicks ÷ impressions', 'Clicks ÷ sessions', 'Position ÷ impressions'], 1),
                        $mcq('What does GA4 call the actions you mark as important to the business?', ['Goals', 'Key events', 'Hits', 'Funnels'], 1),
                        $tf('Search Console keeps performance data for 16 months.', true),
                        $mcq('Rankings drop during a confirmed core update rollout. What is the best first step?', ['Rewrite every page immediately', 'Disavow all links', 'Wait for the rollout to finish, then compare before and after', 'Move to a new domain'], 2),
                        $mcq('Which Search Console tool shows the canonical URL Google selected for a specific page?', ['URL Inspection', 'Links report', 'Removals', 'Disavow tool'], 0),
                        $short('Name the three questions a useful monthly SEO report should answer.'),
                    ],
                ],
            ],

            9 => [
                'module' => ['title' => 'Final Project: SEO Audit & Strategy', 'description' => 'Conduct a full technical, on-page, content, off-page and local audit of a real website and present a prioritised 90-day action plan.'],
                'topic' => 'SEO Audit & Strategy',
                'fileSlug' => 'final-project-seo-audit',
                'liveSessionTopic' => 'a walkthrough of a complete sample audit, from crawl to executive summary, with Q&A on your projects',
                'youtube' => ['url' => 'https://www.youtube.com/watch?v=DaUIMuFXABQ', 'title' => 'How to Do an SEO Audit in Under 20 minutes', 'channel' => 'Ahrefs Tutorials', 'why' => 'A fast, practical audit walkthrough to model your own audit process on.'],
                'docs' => ['notes' => 'audit scope, technical, on-page, content, off-page and local checks, prioritisation and presenting findings.', 'reference' => 'an impact/effort matrix and the list of audit deliverables.', 'slides' => 'running an audit and turning it into a 90-day plan.'],
                'assignment' => [
                    'title' => 'Final Project: Complete SEO Audit and 90-Day Plan',
                    'instructions' => "Audit a real website approved by your mentor (ideally a Ugandan business willing to receive your findings).\n\nYour submission must include:\n1. Scope and baseline: goals, priority pages and baseline metrics (indexed pages, organic clicks, key events, Core Web Vitals status) — use public tools where you lack account access and state this.\n2. Findings log: at least 15 findings across technical, page experience, on-page, content, off-page and local. For each give the evidence, affected URLs and priority.\n3. Impact/effort matrix placing every finding in a quadrant.\n4. 90-day action plan: tasks, owner role, week, and the metric that will show success.\n5. Executive summary (maximum one page) written for a non-technical business owner, explaining the top five issues in terms of customers or revenue.\n6. A 5-minute recorded presentation or slide deck of your summary.\n\nYou will be assessed on accuracy of findings, quality of prioritisation, clarity of communication and realism of the plan.",
                    'dueDays' => 21,
                ],
                'evaluation' => [
                    'title' => 'SEO Audit Readiness Check',
                    'description' => 'Tests how to scope, prioritise and communicate a professional SEO audit.',
                    'questions' => [
                        $mcq('Which type of issue should an audit normally prioritise first?', ['Missing alt text on old blog images', 'Important pages blocked from crawling or indexing', 'Footer link colours', 'Using the brand name in every title'], 1),
                        $mcq('In an impact/effort matrix, which findings are "quick wins"?', ['High impact, low effort', 'Low impact, high effort', 'High impact, high effort', 'Low impact, low effort'], 0),
                        $tf('An executive summary for a business owner should lead with technical jargon to show expertise.', false),
                        $mcq('Why record baseline metrics before making changes?', ['Google requires it', 'To measure the impact of your recommendations later', 'To increase crawl budget', 'To pass Core Web Vitals'], 1),
                        $mcq('Which is the best way to find realistic link-building targets during an audit?', ['Buy a list of 1,000 directories', 'Compare referring domains with competitors to find link gaps', 'Only use nofollow links', 'Ignore competitors'], 1),
                        $short('List the five audit areas covered in this module.'),
                    ],
                ],
            ],
        ];
    }
}
