import { useEffect, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { RichTextToolbar } from '@/components/editor/RichTextToolbar';
import { lowlight } from '@/components/editor/lowlight';
import { normalizeLessonHtml } from '@/components/editor/htmlContent';
import { cn } from '@/lib/utils';
import './editor-content.css';

interface RichTextEditorProps {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    className?: string;
}

/**
 * Controlled Tiptap editor for lesson content. Legacy `content_html` values with no HTML tags at
 * all (pre-dating this editor) are upgraded to real paragraphs via `normalizeLessonHtml()` before
 * being loaded, so multi-paragraph plain text doesn't collapse into one unsplit block.
 */
export default function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
    const [isFocused, setIsFocused] = useState(false);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                codeBlock: false,
                link: {
                    openOnClick: false,
                    autolink: true,
                    HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
                },
            }),
            Highlight,
            TextStyle,
            Color,
            Image,
            Table.configure({ resizable: false }),
            TableRow,
            TableHeader,
            TableCell,
            CodeBlockLowlight.configure({ lowlight }),
        ],
        content: normalizeLessonHtml(value),
        onUpdate: ({ editor: instance }) => onChange(instance.getHTML()),
        onFocus: () => setIsFocused(true),
        onBlur: () => setIsFocused(false),
        editorProps: {
            attributes: {
                class: 'editor-content min-h-[10rem] px-3 py-2 text-sm text-foreground focus:outline-none',
            },
        },
    });

    // Keeps the editor in sync if `value` changes from outside (e.g. loading a different
    // resource into the same mounted form) without fighting the editor's own onUpdate calls.
    useEffect(() => {
        if (!editor || editor.isDestroyed) {
            return;
        }

        const normalized = normalizeLessonHtml(value);
        if (normalized !== editor.getHTML()) {
            editor.commands.setContent(normalized, { emitUpdate: false });
        }
    }, [value, editor]);

    // `editor` can be a real, non-null object that's still been torn down — under React's
    // <StrictMode> (wrapping the whole app in main.tsx), concurrent rendering can retry a render
    // pass after `@tiptap/react`'s instance manager has already destroyed the previous editor,
    // leaving a stale reference whose internals (e.g. `commandManager`) are null. `isDestroyed`
    // is Tiptap's own documented guard for exactly this — a plain `!editor` check isn't enough.
    if (!editor || editor.isDestroyed) {
        return null;
    }

    return (
        <div className={cn('rounded-md border border-input bg-background', isFocused && 'ring-2 ring-ring', className)}>
            <RichTextToolbar editor={editor} />
            {/* Placeholder is anchored to the content area itself, not a guessed pixel offset
                from the top of the whole component — the toolbar wraps to a variable number of
                rows depending on available width, so a fixed offset would render the placeholder
                text underneath/through the wrapped icon rows instead of inside the content area. */}
            <div className="relative">
                <EditorContent editor={editor} />
                {editor.isEmpty && !isFocused && placeholder && (
                    <p className="pointer-events-none absolute left-3 top-2 text-sm text-muted-foreground">{placeholder}</p>
                )}
            </div>
        </div>
    );
}
