<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ClearSeededDataExceptUsers extends Command
{
    protected $signature = 'db:clear-except-users';

    protected $description = 'Clear all seeded data from database except users table';

    public function handle(): int
    {
        if (!$this->confirm('This will delete ALL data except users. Are you sure?')) {
            $this->info('Operation cancelled.');
            return self::SUCCESS;
        }

        $this->info('Clearing seeded data...');

        DB::statement('SET FOREIGN_KEY_CHECKS=0');

        try {
            // Tables to clear (in order to avoid foreign key constraint issues)
            $tablesToClear = [
                // Forum and communication
                'forum_post_reports',
                'forum_post_tags',
                'forum_posts',
                'forum_threads',
                'forum_tags',
                'messages',
                'conversations',
                'conversation_user',
                'ticket_messages',
                'tickets',
                
                // Notifications and logs
                'notifications',
                'audit_logs',
                'engagement_events',
                
                // Certificates and reviews
                'course_reviews',
                'certificates',
                
                // Payments and orders
                'payment_submissions',
                'orders',
                
                // Enrolments
                'course_applications',
                'course_sections',
                'enrolments',
                
                // Progress tracking
                'video_watch_pings',
                'resource_progress',
                'module_progress',
                'live_session_attendance',
                
                // Module items
                'module_items',
                
                // Evaluations
                'evaluation_attempt_answers',
                'evaluation_attempts',
                'evaluation_question',
                'evaluations',
                
                // Questions
                'question_options',
                'questions',
                'question_banks',
                
                // Assignments
                'plagiarism_reports',
                'assignment_submission_rubric_scores',
                'assignment_submissions',
                'assignment_rubrics',
                'assignments',
                'late_penalty_policy_tiers',
                'late_penalty_policies',
                
                // Resources
                'resource_scorm_packages',
                'resource_downloadable_files',
                'resources',
                
                // Modules
                'module_group',
                'modules',
                
                // Groups
                'group_member',
                'groups_cohorts',
                
                // Courses
                'course_change_logs',
                'course_instructor',
                'courses',
                
                // Categories
                'categories',
                
                // Announcements
                'announcements',
                
                // OAuth accounts (keep if you want to preserve OAuth links for users)
                // Comment this out if you want to keep OAuth accounts
                'oauth_accounts',
            ];

            foreach ($tablesToClear as $table) {
                if (Schema::hasTable($table)) {
                    $count = DB::table($table)->count();
                    DB::table($table)->truncate();
                    $this->info("✓ Cleared {$table} ({$count} rows)");
                } else {
                    $this->warn("⚠ Table {$table} does not exist, skipping");
                }
            }

            $this->newLine();
            $this->info('✓ All seeded data cleared successfully!');
            $this->info('✓ Users table preserved');

        } catch (\Exception $e) {
            $this->error('Error clearing data: ' . $e->getMessage());
            return self::FAILURE;
        } finally {
            DB::statement('SET FOREIGN_KEY_CHECKS=1');
        }

        return self::SUCCESS;
    }
}
