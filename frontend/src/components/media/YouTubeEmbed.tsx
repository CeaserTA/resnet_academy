import { youTubeEmbedUrl } from '@/lib/youtube';
import { cn } from '@/lib/utils';

interface YouTubeEmbedProps {
    videoId: string;
    title?: string;
    className?: string;
}

/**
 * Responsive 16:9 YouTube embed via the privacy-enhanced youtube-nocookie.com domain — the same
 * embed convention `LessonRenderer`'s sanitizer allowlist trusts for reading-lesson content, used
 * here for `external_link` resources so a YouTube link plays inline instead of leaving the app.
 */
export function YouTubeEmbed({ videoId, title, className }: YouTubeEmbedProps) {
    return (
        <div className={cn('relative aspect-video w-full overflow-hidden rounded-lg', className)}>
            <iframe
                src={youTubeEmbedUrl(videoId)}
                title={title ?? 'YouTube video player'}
                className="absolute inset-0 size-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
            />
        </div>
    );
}
