import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { ChevronLeft, ChevronRight, CheckCircle2, ExternalLink, FileText, Pause, Play, Video } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { YouTubeEmbed } from '@/components/media/YouTubeEmbed';
import { DocumentViewer } from '@/components/media/DocumentViewer';
import { extractYouTubeVideoId } from '@/lib/youtube';
import { liveSessionJoinUrl } from '@/features/learning/api';
import { useMarkOpened, useMarkRead, useRecordVideoProgress, useResource, useCourseProgress } from '@/features/learning/useLearning';
import { useCourseSequence } from '@/features/learning/useCourseSequence';
import { ReadingLessonView } from '@/features/learning/ReadingLessonView';
import { useCourse } from '@/features/catalogue/useCourses';
import { findAdjacentItems, itemLinkFor } from '@/lib/courseSequence';
import { PageFrame } from '@/components/layout/PageFrame';
import { formatDateTime } from '@/lib/formatDate';

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

const FILE_TYPE_LABELS: Record<string, string> = {
    pdf: 'PDF',
    docx: 'Word document',
    pptx: 'PowerPoint slides',
};

function formatFileSize(kb: number): string {
    return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

/** File name, type and size for document / downloadable-file resources — only what the data has. */
function FileInfo({ fileUrl, fileType, sizeKb }: { fileUrl?: string | null; fileType?: string | null; sizeKb?: number | null }) {
    // No original filename is stored; the stored path ends in it (e.g. ".../module-1-notes.docx").
    const fileName = fileUrl ? decodeURIComponent(fileUrl.split('?')[0].split('/').pop() ?? '') : '';
    const details = [fileType ? FILE_TYPE_LABELS[fileType] ?? fileType.toUpperCase() : null, sizeKb ? formatFileSize(sizeKb) : null].filter(Boolean);

    if (!fileName && details.length === 0) return null;

    return (
        <div className="flex min-w-0 items-center gap-3 rounded-lg border border-surface-100 bg-surface-50 px-3 py-2.5">
            <FileText className="size-5 shrink-0 text-blue-600" aria-hidden="true" />
            <div className="min-w-0">
                {fileName && <p className="truncate text-sm font-medium text-ink-900">{fileName}</p>}
                {details.length > 0 && <p className="text-xs text-ink-600">{details.join(' · ')}</p>}
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
        <PageFrame
            width={isReading ? 'reading' : 'full'}
            breadcrumbs={[
                { label: 'My courses', to: '/dashboard' },
                { label: course?.title ?? '', to: `/learn/courses/${courseId}` },
                { label: resource.title },
            ]}
            title={resource.title}
            titleAdornment={isComplete ? <Badge label="Completed" tone="success" icon={CheckCircle2} /> : undefined}
            subtitle={course?.title}
            // Long lessons: the same action as the button at the end, reachable without scrolling.
            actions={
                isReading && !isComplete ? (
                    <Button size="sm" onClick={() => markRead.mutate(resource.id)} isLoading={markRead.isPending}>
                        <CheckCircle2 className="size-3.5" aria-hidden="true" />
                        Mark as read
                    </Button>
                ) : undefined
            }
        >
            {resource.description && <p className="text-sm text-ink-600">{resource.description}</p>}
            <Card>
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

                {resource.type === 'document' && (
                    <div className="flex flex-col gap-4">
                        {/*
                            Completion for documents follows the same explicit "Mark as read"
                            convention as reading/SCORM resources (ProgressEngine::isResourceComplete
                            checks marked_read_at for all three) — not the auto-fired "opened" signal
                            external links and downloadable files use, which a different backend
                            field tracks and which never satisfies the document completion check.
                        */}
                        <FileInfo fileUrl={resource.details.file_url} fileType={resource.details.file_type} sizeKb={resource.details.file_size_kb} />
                        <DocumentViewer fileUrl={resource.details.file_url} fileType={resource.details.file_type} title={resource.title} />
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

                {resource.type === 'downloadable_file' && (
                    <div className="flex flex-col gap-4">
                        <FileInfo fileUrl={resource.details.file_url} fileType={resource.details.file_type} sizeKb={resource.details.file_size_kb} />
                        <a
                            href={resource.details.file_url ?? '#'}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => !isComplete && markOpened.mutate(resource.id)}
                            className="inline-flex items-center gap-2 self-start text-sm text-blue-600 hover:underline"
                        >
                            <ExternalLink className="size-4" aria-hidden="true" />
                            Open file
                        </a>
                        {/* Downloadable files complete on "opened" (ProgressEngine), so this uses the
                            same signal as opening the file — for students who downloaded it earlier
                            or opened it outside the app. */}
                        {!isComplete && (
                            <Button
                                onClick={() => markOpened.mutate(resource.id)}
                                isLoading={markOpened.isPending}
                                className="self-start"
                            >
                                Mark as complete
                            </Button>
                        )}
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
                            {resource.details.scheduled_at && formatDateTime(resource.details.scheduled_at)}{' '}
                            ({resource.details.duration_minutes} min)
                        </p>
                        {/*
                            Phase 1 verified attendance: this links to the backend join-redirect
                            endpoint, never to resource.details.meeting_url directly — the server
                            records attendance only when this link is actually followed, then 302s
                            to the real Zoom/Meet URL. There is no separate "mark as attended"
                            action any more; joining IS how attendance gets recorded.

                            rel="noopener" only — NOT "noreferrer". This link's target is a
                            same-site Sanctum-authenticated API route, and Sanctum's
                            EnsureFrontendRequestsAreStateful middleware only honors the session
                            cookie when it recognizes the request as coming from this SPA, which
                            it does by checking the Origin/Referer header against
                            SANCTUM_STATEFUL_DOMAINS. "noreferrer" strips that header, so the
                            already-logged-in student would get treated as a guest and bounced to
                            the frontend's own /login page (see bootstrap/app.php's
                            redirectGuestsTo). "noopener" alone still blocks the new tab from
                            getting a window.opener handle back to this page, which is the actual
                            security property target="_blank" needs here.
                        */}
                        {resource.details.access_state !== 'recording' && resource.details.access_state !== 'recording_pending' && (
                            <a
                                href={liveSessionJoinUrl(resource.id)}
                                target="_blank"
                                rel="noopener"
                                className="inline-flex items-center gap-2 self-start text-blue-600 hover:underline"
                            >
                                <ExternalLink className="size-4" aria-hidden="true" />
                                Join session
                            </a>
                        )}

                        {/*
                            Once the join window closes the session can never be attended again,
                            so the recording becomes the only route through what is a required
                            item. Opening it completes the resource exactly as an external link
                            does — same markOpened signal, same completion rule.
                        */}
                        {resource.details.access_state === 'recording' && resource.details.recording_url && (
                            <div className="flex flex-col gap-2">
                                <p className="text-sm text-ink-600">
                                    This session has already taken place. Watch the recording to complete it.
                                </p>
                                <a
                                    href={resource.details.recording_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={() => !isComplete && markOpened.mutate(resource.id)}
                                    className="inline-flex items-center gap-2 self-start text-blue-600 hover:underline"
                                >
                                    <ExternalLink className="size-4" aria-hidden="true" />
                                    Watch the recording
                                </a>
                            </div>
                        )}

                        {resource.details.access_state === 'recording_pending' && (
                            <Alert
                                variant="warning"
                                message={
                                    'This session has already taken place and the recording hasn’t been posted yet. '
                                    + 'Check back soon — once your instructor adds it, you can watch it here to complete this item.'
                                }
                            />
                        )}
                    </div>
                )}
            </Card>

            {(prevItem || nextItem) && (
                <div className="flex items-center justify-between gap-3">
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
        </PageFrame>
    );
}