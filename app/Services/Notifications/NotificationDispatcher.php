<?php

declare(strict_types=1);

namespace App\Services\Notifications;

use App\Enums\EnrolmentStatus;
use App\Enums\NotificationChannel;
use App\Models\Announcement;
use App\Models\Certificate;
use App\Models\Conversation;
use App\Models\Course;
use App\Models\ForumThread;
use App\Models\Module;
use App\Models\Notification;
use App\Models\Ticket;
use App\Models\User;

/**
 * In-app notification writes only, for now — email/SMS/push fan-out and the read/unread
 * inbox API are Phase 5 (`notifications` table already exists so this doesn't need a schema
 * change when that phase lands). This class is the single write path so Phase 5 has one
 * place to extend, not one per call site.
 */
final class NotificationDispatcher
{
    public function notify(User $user, string $type, string $title, ?string $body = null, ?string $relatedEntityType = null, ?int $relatedEntityId = null): Notification
    {
        return Notification::create([
            'user_id' => $user->id,
            'channel' => NotificationChannel::InApp,
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'related_entity_type' => $relatedEntityType,
            'related_entity_id' => $relatedEntityId,
            'sent_at' => now(),
        ]);
    }

    /**
     * Business rule "Course versioning": already-enrolled students see the new version
     * immediately, but are informed of what changed.
     */
    public function notifyCourseChanged(Course $course, string $changeSummary): void
    {
        $studentIds = $course->enrolments()->where('status', EnrolmentStatus::Confirmed)->pluck('student_id');

        foreach (User::query()->whereIn('id', $studentIds)->get() as $student) {
            $this->notify(
                user: $student,
                type: 'course_updated',
                title: "{$course->title} was updated",
                body: $changeSummary,
                relatedEntityType: 'course',
                relatedEntityId: $course->id,
            );
        }
    }

    /**
     * architecture.md §5.4: certificate issuance sends a notification alongside the async PDF
     * generation job — the two are independent so a slow render never delays telling the
     * student they finished the course.
     */
    public function notifyCertificateIssued(Certificate $certificate): void
    {
        $this->notify(
            user: $certificate->student,
            type: 'certificate_issued',
            title: "You earned a certificate for {$certificate->course->title}",
            body: "Certificate number {$certificate->certificate_number}.",
            relatedEntityType: 'certificate',
            relatedEntityId: $certificate->id,
        );
    }

    /**
     * FR-15/16/17: fired for every conversation participant except the sender.
     */
    public function notifyNewMessage(User $recipient, Conversation $conversation, User $sender): void
    {
        $this->notify(
            user: $recipient,
            type: 'new_message',
            title: "New message from {$sender->name}",
            body: $conversation->subject,
            relatedEntityType: 'conversation',
            relatedEntityId: $conversation->id,
        );
    }

    /**
     * Business rule (User Roles table, "Student support tickets"): fired at the other party
     * whenever a ticket gets a new reply — student when staff replies, staff when the student
     * replies.
     */
    public function notifyTicketReply(User $recipient, Ticket $ticket, User $sender): void
    {
        $this->notify(
            user: $recipient,
            type: 'ticket_reply',
            title: "{$sender->name} replied to \"{$ticket->subject}\"",
            relatedEntityType: 'ticket',
            relatedEntityId: $ticket->id,
        );
    }

    /**
     * Business rule "Notifications system": new forum reply — notified to the thread's
     * creator only (not every prior poster), matching this MVP's scope. `title` is now
     * internal-only (the feed redesign never shows it), so the message no longer quotes it.
     */
    public function notifyForumReply(User $recipient, ForumThread $thread, User $replier): void
    {
        $this->notify(
            user: $recipient,
            type: 'forum_reply',
            title: "{$replier->name} replied to your post",
            relatedEntityType: 'forum_thread',
            relatedEntityId: $thread->id,
        );
    }

    /**
     * FR "Announcements": broadcast from Instructor/Admin to every confirmed-enrolled student
     * in the course, same fan-out shape as notifyCourseChanged().
     */
    public function notifyAnnouncementPosted(Announcement $announcement): void
    {
        $studentIds = $announcement->course->enrolments()->where('status', EnrolmentStatus::Confirmed)->pluck('student_id');

        foreach (User::query()->whereIn('id', $studentIds)->get() as $student) {
            $this->notify(
                user: $student,
                type: 'announcement_posted',
                title: $announcement->title,
                body: $announcement->body,
                relatedEntityType: 'announcement',
                relatedEntityId: $announcement->id,
            );
        }
    }

    /**
     * Business rule "Notifications system": "new grade posted" — called from
     * AssignmentSubmissionService::grade() and EvaluationAttemptService when an attempt is
     * finalized, so a student never has to keep re-checking the gradebook.
     */
    public function notifyGradePosted(User $student, string $itemTitle, string $relatedEntityType, int $relatedEntityId): void
    {
        $this->notify(
            user: $student,
            type: 'grade_posted',
            title: "Your grade for \"{$itemTitle}\" is ready",
            relatedEntityType: $relatedEntityType,
            relatedEntityId: $relatedEntityId,
        );
    }

    /**
     * Business rule "Notifications system": "module unlocked" — called from
     * ProgressEngine::evaluateCourseUnlocks() the moment a module flips from locked to
     * not_started.
     */
    public function notifyModuleUnlocked(User $student, Module $module): void
    {
        $this->notify(
            user: $student,
            type: 'module_unlocked',
            title: "\"{$module->title}\" is now unlocked",
            relatedEntityType: 'module',
            relatedEntityId: $module->id,
        );
    }
}
