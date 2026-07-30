import { useMemo } from 'react';
import DOMPurify from 'dompurify';
import 'highlight.js/styles/atom-one-light.css';
import { normalizeLessonHtml } from '@/components/editor/htmlContent';
import '@/features/learning/lesson-content.css';

const ALLOWED_TAGS = [
    'h1',
    'h2',
    'h3',
    'p',
    'strong',
    'em',
    'u',
    's',
    'mark',
    'span',
    'ul',
    'ol',
    'li',
    'blockquote',
    'pre',
    'code',
    'hr',
    'a',
    'img',
    'br',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'div',
    'iframe',
];

const ALLOWED_ATTR = [
    'href',
    'target',
    'rel',
    'src',
    'alt',
    'class',
    'style',
    'width',
    'height',
    'allow',
    'allowfullscreen',
    'frameborder',
    'title',
    'data-youtube-video',
];

// Only youtube.com/youtube-nocookie.com embed URLs are allowed through — an iframe is otherwise
// a real code-injection surface (arbitrary cross-origin content, clickjacking), so this is a hard
// allowlist, not just a UI convenience. Applies to every iframe, however it got into the stored
// HTML (the editor's YouTube extension, or old content saved before this check existed).
const YOUTUBE_EMBED_SRC = /^https:\/\/www\.youtube(-nocookie)?\.com\/embed\//;

DOMPurify.addHook('uponSanitizeElement', (node, data) => {
    if (data.tagName === 'iframe') {
        const src = node instanceof Element ? node.getAttribute('src') : null;
        if (!src || !YOUTUBE_EMBED_SRC.test(src)) {
            node.parentNode?.removeChild(node);
        }
    }
});

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
    }
});

interface LessonRendererProps {
    html: string | null | undefined;
    className?: string;
}

/**
 * The one place lesson content actually gets rendered as HTML. Sanitizes with a narrow allowlist
 * (only what the Tiptap editor's configured extension set can produce) rather than DOMPurify's
 * wide-open default profile, and force-adds target/rel to every link as defense-in-depth — Tiptap
 * already bakes that in at save time, but old hand-typed records may predate it.
 */
export function LessonRenderer({ html, className }: LessonRendererProps) {
    const sanitized = useMemo(() => {
        const normalized = normalizeLessonHtml(html);
        return DOMPurify.sanitize(normalized, { ALLOWED_TAGS, ALLOWED_ATTR });
    }, [html]);

    if (!sanitized) {
        return null;
    }

    return <div className={`lesson-content ${className ?? ''}`} dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
