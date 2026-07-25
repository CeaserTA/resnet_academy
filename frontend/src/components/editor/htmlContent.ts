const HTML_TAG_PATTERN = /<[a-z][\s\S]*>/i;

/** True if the value already contains at least one HTML tag. */
export function looksLikeHtml(value: string): boolean {
    return HTML_TAG_PATTERN.test(value);
}

/**
 * Legacy `content_html` records predate any real editor and can be bare plain text (the old
 * textarea's label said "Content (HTML)" but nothing enforced it). Splits on blank lines into
 * `<p>` tags so multi-paragraph legacy text doesn't collapse into a single unsplit block — either
 * when loaded into the Tiptap editor for the first time, or when rendered as-is for a record that
 * hasn't been re-saved through the new editor yet.
 */
export function plainTextToHtml(value: string): string {
    const paragraphs = value
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);

    if (paragraphs.length === 0) {
        return '';
    }

    return paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`).join('');
}

function escapeHtml(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Normalizes a stored `content_html` value for either the editor or the renderer to consume. */
export function normalizeLessonHtml(value: string | null | undefined): string {
    if (!value) {
        return '';
    }

    return looksLikeHtml(value) ? value : plainTextToHtml(value);
}
