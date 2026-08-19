import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { ChevronLeft, ChevronRight, CheckCircle2, ExternalLink, Pause, Play, Video } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { YouTubeEmbed } from '@/components/media/YouTubeEmbed';
import { extractYouTubeVideoId } from '@/lib/youtube';
import {
    useMarkAttendance,
    useMarkOpened,
    useMarkRead,
    useRecordVideoProgress,
    useResource,
    useCourseProgress,
} from '@/features/learning/useLearning';
import { useCourseSequence } from '@/features/learning/useCourseSequence';
import { ReadingLessonView } from '@/features/learning/ReadingLessonView';
import { useCourse } from '@/features/catalogue/useCourses';
import { findAdjacentItems, itemLinkFor } from '@/lib/courseSequence';

/**
 * External links normally just navigate away in a new tab — a YouTube link is the one exception,
 * playing inline instead so students never leave the system to watch it. "Opened" is recorded as
 * soon as the embed is shown (there's no click to hook into once it's inline).
 */
function ExternalLinkViewer({
    url,
    isComplete,
    onOpened,
}: {
    url: string | null | undefined;
    isComplete: boolean;
    onOpened: () => void;
}) {
    const videoId = url ? extractYouTubeVideoId(url) : null;
    const hasNotifiedRef = useRef(false);

    useEffect(() => {
        if (videoId && !isComplete && !hasNotifiedRef.current) {
            hasNotifiedRef.current = true;
            onOpened();
        }
    }, [videoId, isComplete, onOpened]);

    if (videoId) {
        return <YouTubeEmbed videoId={videoId} />;
    }

    return (
        <a
            href={url ?? '#'}
            target="_blank"
            rel="noreferrer"
            onClick={() => !isComplete && onOpened()}
            className="inline-flex items-center gap-2 text-blue-600 hover:underline"
        >
            <ExternalLink className="size-4" aria-hidden="true" />
            Open link
        </a>
    );
}

/**
 * Simulated playback: this app doesn't have real Bunny Stream credentials wired up yet
 * (tracker 2.5), so instead of embedding a real player, a play/pause control advances a
 * position timer and sends the same watch-progress pings a real player would — the
 * completion logic being demonstrated (≥90% marks it done) is the real backend behavior,
 * only the video surface itself is a stand-in.
 */
function VideoPlayer({
    resourceId,
    durationSeconds,
    courseId,
}: {
    resourceId: number;
    durationSeconds: number;
    courseId: number;
}) {
    const [position, setPosition] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const recordProgress = useRecordVideoProgress(courseId);

    useEffect(() => {
        if (!isPlaying) {
            return;
        }

        const interval = setInterval(() => {
            setPosition((current) => {
                const next = Math.min(durationSeconds, current + 5);
                const finished = durationSeconds > 0 && next >= durationSeconds;

                if (next % 10 === 0 || finished) {
                    recordProgress.mutate({ resourceId, positionSeconds: next });
                }

                if (finished) {
                    setIsPlaying(false);
                }

                return next;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isPlaying, durationSeconds, resourceId, recordProgress]);

    const percent = durationSeconds > 0 ? Math.min(100, Math.round((position / durationSeconds) * 100)) : 0;

    return (
        <div className="flex flex-col gap-2">
            <div className="flex aspect-video items-center justify-center rounded-lg bg-ink-900 text-surface-0">
                <Video className="size-16 opacity-50" aria-hidden="true" />
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-100">
                <div
                    className={`h-full transition-all ${percent >= 90 ? 'bg-success-600' : 'bg-blue-600'}`}
                    style={{ width: `${percent}%` }}
                />
            </div>

            <div className="flex items-center justify-between text-sm text-ink-600">
                <Button variant="secondary" onClick={() => setIsPlaying((p) => !p)}>
                    {isPlaying ? (
                        <Pause className="size-4" aria-hidden="true" />
                    ) : (
                        <Play className="size-4" aria-hidden="true" />
                    )}
                    {isPlaying ? 'Pause' : 'Play'}
                </Button>
                <span>{percent}% watched — completes at 90%</span>
            </div>
        </div>
    );
}

export function ResourceViewerPage() {
    const { id } = useParams();
    const resourceId = Number(id);
    const [searchParams] = useSearchParams();
    const courseId = Number(searchParams.get('course'));

    const { data: course } = useCourse(courseId);
    const { data: resource, isLoading } = useResource(resourceId);
    const markRead = useMarkRead(courseId);
    const markOpened = useMarkOpened(courseId);
    const markAttendance = useMarkAttendance(courseId);
    const { flatItems } = useCourseSequence(courseId);

    // Fix 3: calling useCourseProgress here guarantees the backend's evaluateCourseUnlocks()
    // runs and creates ModuleProgress rows before any progress-write endpoint is called.
    // Without this, a student who deep-links directly to a resource (bypassing CoursePlayerPage)
    // would hit a 403 from assertModuleUnlocked() because no row existed yet.
    useCourseProgress(courseId);

    // Guard: ?course= param missing or invalid — all hooks have already run above
    if (!courseId || !Number.isFinite(courseId)) {
        return (
            <div className="mx-auto max-w-xl py-16 text-center">
                <p className="text-ink-600">This link is missing course context.</p>
                <Link to="/dashboard" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
                    Back to my courses
                </Link>
            </div>
        );
    }

    if (isLoading || !resource) {
        return <Spinner />;
    }

    const isComplete = resource.is_complete;

    const isReading = resource.type === 'reading';

    const { prevItem, nextItem } = findAdjacentItems(flatItems, 'resource', resource.id);

    return (
        <div className={isReading ? 'mx-auto max-w-3xl' : 'mx-auto max-w-2xl'}>
            <Breadcrumbs
                items={[
                    { label: 'My Courses', to: '/dashboard' },
                    { label: course?.title ?? '', to: `/learn/courses/${courseId}` },
                    { label: resource.title },
                ]}
            />

            <div className="mt-2 flex items-center gap-2">
                <h1 className={isReading ? 'text-3xl' : 'text-2xl'}>{resource.title}</h1>
                {isComplete && <Badge label="Completed" tone="success" icon={CheckCircle2} />}
            </div>
            {resource.description && <p className="mt-1 text-ink-600">{resource.description}</p>}

            <Card className="mt-6">
                {resource.type === 'video' && (
                    <VideoPlayer
                        resourceId={resource.id}
                        durationSeconds={resource.details.duration_seconds ?? 0}
                        courseId={courseId}
                    />
                )}

                {resource.type === 'reading' && (
                    <ReadingLessonView
                        resource={resource}
                        isComplete={Boolean(isComplete)}
                        onMarkRead={() => markRead.mutate(resource.id)}
                        isMarkingRead={markRead.isPending}
                    />
                )}

                {resource.type === 'scorm' && (
                    <div className="flex flex-col gap-4">
                        <a
                            href={resource.details.package_url ?? '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline"
                        >
                            Open SCORM package
                        </a>
                        {!isComplete && (
                            <Button
                                onClick={() => markRead.mutate(resource.id)}
                                isLoading={markRead.isPending}
                                className="self-start"
                            >
                                Mark as read
                            </Button>
                        )}
                    </div>
                )}

                {(resource.type === 'document' || resource.type === 'downloadable_file') && (
                    <div className="flex flex-col gap-4">
                        <a
                            href={resource.details.file_url ?? '#'}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => !isComplete && markOpened.mutate(resource.id)}
                            className="inline-flex items-center gap-2 text-blue-600 hover:underline"
                        >
                            <ExternalLink className="size-4" aria-hidden="true" />
                            Open file
                        </a>
                    </div>
                )}

                {resource.type === 'external_link' && (
                    <ExternalLinkViewer
                        url={resource.details.url}
                        isComplete={Boolean(isComplete)}
                        onOpened={() => markOpened.mutate(resource.id)}
                    />
                )}

                {resource.type === 'live_session' && (
                    <div className="flex flex-col gap-3">
                        <p className="text-sm text-ink-600">
                            {resource.details.provider === 'zoom' ? 'Zoom' : 'Google Meet'} —{' '}
                            {resource.details.scheduled_at && new Date(resource.details.scheduled_at).toLocaleString()}{' '}
                            ({resource.details.duration_minutes} min)
                        </p>
                        <a
                            href={resource.details.meeting_url ?? '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-blue-600 hover:underline"
                        >
                            <ExternalLink className="size-4" aria-hidden="true" />
                            Join session
                        </a>
                        {!isComplete && (
                            <Button
                                onClick={() => markAttendance.mutate(resource.id)}
                                isLoading={markAttendance.isPending}
                                className="self-start"
                            >
                                Mark as attended
                            </Button>
                        )}
                    </div>
                )}
            </Card>

            {(prevItem || nextItem) && (
                <div className="mt-4 flex items-center justify-between gap-3">
                    {prevItem ? (
                        <Link
                            to={itemLinkFor(prevItem, courseId)}
                            className="flex min-w-0 items-center gap-1.5 text-sm text-ink-600 hover:text-blue-600"
                        >
                            <ChevronLeft className="size-4 shrink-0" aria-hidden="true" />
                            <span className="flex flex-col items-start">
                                <span className="text-xs text-ink-600">Previous</span>
                                <span className="max-w-40 truncate text-ink-900 sm:max-w-xs">{prevItem.title}</span>
                            </span>
                        </Link>
                    ) : (
                        <span />
                    )}

                    {nextItem && (
                        <Link
                            to={itemLinkFor(nextItem, courseId)}
                            className="flex min-w-0 items-center gap-1.5 text-right text-sm text-ink-600 hover:text-blue-600"
                        >
                            <span className="flex flex-col items-end">
                                <span className="text-xs text-ink-600">Next</span>
                                <span className="max-w-40 truncate text-ink-900 sm:max-w-xs">{nextItem.title}</span>
                            </span>
                            <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
}