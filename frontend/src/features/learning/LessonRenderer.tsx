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
];

const ALLOWED_ATTR = ['href', 'target', 'rel', 'src', 'alt', 'class', 'style'];

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
