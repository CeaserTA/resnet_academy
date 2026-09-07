import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { MessageSquare, BookOpen, Clock, AlertCircle } from 'lucide-react';
import { forumApi } from '@/lib/api/forumApi';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';

/**
 * ForumsIndexPage - Unified view of all forums from enrolled courses
 *
 * Displays a list of forums accessible to the authenticated user, grouped by course.
 * Shows thread counts, unread counts, and latest activity for each forum.
 */
export function ForumsIndexPage() {
    const { data: forums, isLoading, error } = useQuery({
        queryKey: ['forums'],
        queryFn: () => forumApi.getAllForums(),
    });

    if (isLoading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <Spinner />
            </div>
        );
    }

    if (error) {
        return (
            <div className="mx-auto max-w-4xl py-8">
                <Alert 
                    variant="error" 
                    message="Could not load forums. Please try again later." 
                />
            </div>
        );
    }

    if (!forums || forums.length === 0) {
        return (
            <div className="mx-auto max-w-4xl py-12">
                <EmptyState
                    icon={MessageSquare}
                    title="No forums available"
                    description="You don't have access to any course forums yet. Enroll in a course to join discussions."
                    action={
                        <Link
                            to="/courses"
                            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                            <BookOpen className="size-4" />
                            Browse Courses
                        </Link>
                    }
                />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-4xl py-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-ink-900">Forums</h1>
                <p className="mt-1 text-sm text-ink-600">
                    Discuss course topics, ask questions, and collaborate with fellow students
                </p>
            </div>

            <div className="space-y-4">
                {forums.map((forum) => (
                    <Link
                        key={forum.id}
                        to={`/courses/${forum.course.id}/forum`}
                        className="block"
                    >
                        <Card className="transition-shadow hover:shadow-md">
                            <div className="flex items-start justify-between gap-4">
                                {/* Left: Forum info */}
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <MessageSquare className="size-5 shrink-0 text-blue-600" aria-hidden="true" />
                                        <h2 className="text-lg font-semibold text-ink-900 truncate">
                                            {forum.title}
                                        </h2>
                                    </div>
                                    <p className="mt-1 text-sm text-ink-600">
                                        <BookOpen className="mr-1 inline-block size-4" aria-hidden="true" />
                                        {forum.course.title}
                                    </p>

                                    {/* Latest activity */}
                                    {forum.latest_thread && (
                                        <div className="mt-3 flex items-center gap-2 text-sm text-ink-600">
                                            <Clock className="size-4 shrink-0" aria-hidden="true" />
                                            <span className="truncate">
                                                <span className="font-medium">Latest:</span>{' '}
                                                {forum.latest_thread.title}
                                            </span>
                                            <span className="shrink-0 text-ink-500">
                                                {formatTimestamp(forum.latest_thread.last_activity_at)}
                                            </span>
                                        </div>
                                    )}

                                    {forum.thread_count === 0 && (
                                        <div className="mt-3 flex items-center gap-2 text-sm text-ink-500">
                                            <AlertCircle className="size-4" aria-hidden="true" />
                                            No discussions yet - be the first to post!
                                        </div>
                                    )}
                                </div>

                                {/* Right: Stats */}
                                <div className="flex shrink-0 flex-col items-end gap-2">
                                    <Badge
                                        label={`${forum.thread_count} ${forum.thread_count === 1 ? 'thread' : 'threads'}`}
                                        tone="neutral"
                                    />
                                    {forum.unread_count > 0 && (
                                        <Badge
                                            label={`${forum.unread_count} unread`}
                                            tone="progress"
                                        />
                                    )}
                                </div>
                            </div>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}

/**
 * Format timestamp for display (relative or absolute)
 */
function formatTimestamp(isoString: string): string {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

