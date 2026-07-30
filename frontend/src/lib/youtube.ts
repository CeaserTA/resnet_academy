const YOUTUBE_ID_PATTERN =
    /(?:youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i;

/** Extracts the 11-character video ID from any common YouTube URL shape, or null if not one. */
export function extractYouTubeVideoId(url: string): string | null {
    const match = url.match(YOUTUBE_ID_PATTERN);
    return match ? match[1] : null;
}

export function isYouTubeUrl(url: string): boolean {
    return extractYouTubeVideoId(url) !== null;
}

/**
 * `youtube-nocookie.com` is YouTube's privacy-enhanced embed domain — no tracking cookies are
 * set until the viewer actually presses play. Used everywhere a YouTube video is embedded
 * in-app (reading lesson content and external-link resources alike), and is the one domain the
 * sanitizer allowlist trusts for iframes.
 */
export function youTubeEmbedUrl(videoId: string): string {
    return `https://www.youtube-nocookie.com/embed/${videoId}`;
}
