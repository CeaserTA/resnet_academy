import { useRef, useState } from 'react';
import { Bold, Code, Eye, Italic, List, ListOrdered, Pencil, Terminal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Textarea } from '@/components/ui/Textarea';
import { Tooltip } from '@/components/ui/Tooltip';
import { MarkdownContent } from '@/lib/markdown/MarkdownContent';
import { cn } from '@/lib/utils';

function ToolbarButton({
    icon: Icon,
    label,
    onClick,
    active,
}: {
    icon: LucideIcon;
    label: string;
    onClick: () => void;
    active?: boolean;
}) {
    return (
        <Tooltip label={label}>
            <button
                type="button"
                onClick={onClick}
                aria-label={label}
                aria-pressed={active}
                className={cn(
                    'flex items-center justify-center rounded-md p-1.5 hover:bg-surface-100',
                    active ? 'bg-surface-100 text-ink-900' : 'text-ink-600',
                )}
            >
                <Icon className="size-4" aria-hidden="true" />
            </button>
        </Tooltip>
    );
}

interface MarkdownComposerProps {
    value: string;
    onChange: (value: string) => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    rows?: number;
    required?: boolean;
}

/**
 * A formatting toolbar over a controlled Markdown textarea, plus a live preview toggle rendered
 * via `MarkdownContent`. Body stays plain Markdown text (no editor framework, no schema change)
 * — buttons just insert/wrap syntax at the current cursor/selection, the same lightweight
 * pattern most Markdown-based composers (GitHub, etc.) use.
 */
export function MarkdownComposer({ value, onChange, onKeyDown, placeholder, rows = 4, required }: MarkdownComposerProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [showPreview, setShowPreview] = useState(false);

    const wrapSelection = (marker: string) => {
        const el = textareaRef.current;
        if (!el) {
            return;
        }

        const start = el.selectionStart;
        const end = el.selectionEnd;
        const selected = value.slice(start, end);
        const next = value.slice(0, start) + marker + selected + marker + value.slice(end);
        onChange(next);

        requestAnimationFrame(() => {
            el.focus();
            el.setSelectionRange(start + marker.length, start + marker.length + selected.length);
        });
    };

    const insertLinePrefix = (prefix: string) => {
        const el = textareaRef.current;
        if (!el) {
            return;
        }

        const start = el.selectionStart;
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
        onChange(next);

        requestAnimationFrame(() => {
            el.focus();
            el.setSelectionRange(start + prefix.length, start + prefix.length);
        });
    };

    const insertCodeBlock = () => {
        const el = textareaRef.current;
        if (!el) {
            return;
        }

        const start = el.selectionStart;
        const end = el.selectionEnd;
        const selected = value.slice(start, end) || 'code';
        const block = '```\n' + selected + '\n```';
        const next = value.slice(0, start) + block + value.slice(end);
        onChange(next);

        requestAnimationFrame(() => {
            el.focus();
            el.setSelectionRange(start + 4, start + 4 + selected.length);
        });
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1 rounded-md border border-surface-100 bg-surface-50 p-1">
                <ToolbarButton icon={Bold} label="Bold" onClick={() => wrapSelection('**')} />
                <ToolbarButton icon={Italic} label="Italic" onClick={() => wrapSelection('*')} />
                <ToolbarButton icon={List} label="Bullet list" onClick={() => insertLinePrefix('- ')} />
                <ToolbarButton icon={ListOrdered} label="Numbered list" onClick={() => insertLinePrefix('1. ')} />
                <ToolbarButton icon={Code} label="Inline code" onClick={() => wrapSelection('`')} />
                <ToolbarButton icon={Terminal} label="Code block" onClick={insertCodeBlock} />
                <div className="ml-auto">
                    <ToolbarButton
                        icon={showPreview ? Pencil : Eye}
                        label={showPreview ? 'Edit' : 'Preview'}
                        active={showPreview}
                        onClick={() => setShowPreview((prev) => !prev)}
                    />
                </div>
            </div>

            {showPreview ? (
                <div className="min-h-20 rounded-md border border-surface-100 bg-surface-0 px-3 py-2">
                    {value.trim() ? (
                        <MarkdownContent>{value}</MarkdownContent>
                    ) : (
                        <p className="text-sm text-ink-600">Nothing to preview yet.</p>
                    )}
                </div>
            ) : (
                <Textarea
                    ref={textareaRef}
                    label=""
                    placeholder={placeholder}
                    rows={rows}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={onKeyDown}
                    required={required}
                    className="font-mono text-sm"
                />
            )}
        </div>
    );
}
