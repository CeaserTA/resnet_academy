import { useState, type ReactNode } from 'react';
import type { Editor } from '@tiptap/react';
import {
    Bold,
    Code,
    Heading1,
    Heading2,
    Heading3,
    Highlighter,
    Image as ImageIcon,
    Italic,
    Link2,
    List,
    ListOrdered,
    Minus,
    Palette,
    Pilcrow,
    Plus,
    Quote,
    Redo2,
    Strikethrough,
    Table,
    Trash2,
    Underline as UnderlineIcon,
    Undo2,
    X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const TEXT_COLORS = ['#151a24', '#1b4fa0', '#1f8a55', '#c0392b', '#e8a33d'];

interface ToolbarButtonProps {
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    label: string;
    children: ReactNode;
}

function ToolbarButton({ onClick, active, disabled, label, children }: ToolbarButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            aria-pressed={active}
            title={label}
            className={cn(
                'flex size-8 items-center justify-center rounded-md text-ink-600 transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40',
                active && 'bg-primary/10 text-primary',
            )}
        >
            {children}
        </button>
    );
}

function Divider() {
    return <span className="mx-1 h-6 w-px shrink-0 bg-border" aria-hidden="true" />;
}

function LinkControl({ editor }: { editor: Editor }) {
    const [isOpen, setIsOpen] = useState(false);
    const [url, setUrl] = useState('');

    const openControl = () => {
        setUrl(editor.getAttributes('link').href ?? '');
        setIsOpen(true);
    };

    const confirm = () => {
        if (url.trim()) {
            editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
        } else {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
        }
        setIsOpen(false);
    };

    if (isOpen) {
        return (
            <div className="flex items-center gap-1 px-1">
                <input
                    autoFocus
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            confirm();
                        }
                        if (e.key === 'Escape') {
                            setIsOpen(false);
                        }
                    }}
                    placeholder="https://…"
                    className="h-8 w-44 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                />
                <ToolbarButton label="Confirm link" onClick={confirm}>
                    <Plus className="size-4" aria-hidden="true" />
                </ToolbarButton>
                <ToolbarButton label="Cancel" onClick={() => setIsOpen(false)}>
                    <X className="size-4" aria-hidden="true" />
                </ToolbarButton>
            </div>
        );
    }

    return (
        <ToolbarButton label="Link" active={editor.isActive('link')} onClick={openControl}>
            <Link2 className="size-4" aria-hidden="true" />
        </ToolbarButton>
    );
}

function ImageControl({ editor }: { editor: Editor }) {
    const [isOpen, setIsOpen] = useState(false);
    const [url, setUrl] = useState('');

    const confirm = () => {
        if (url.trim()) {
            editor.chain().focus().setImage({ src: url.trim() }).run();
        }
        setIsOpen(false);
        setUrl('');
    };

    if (isOpen) {
        return (
            <div className="flex items-center gap-1 px-1">
                <input
                    autoFocus
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            confirm();
                        }
                        if (e.key === 'Escape') {
                            setIsOpen(false);
                        }
                    }}
                    placeholder="Image URL…"
                    className="h-8 w-44 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                />
                <ToolbarButton label="Insert image" onClick={confirm}>
                    <Plus className="size-4" aria-hidden="true" />
                </ToolbarButton>
                <ToolbarButton label="Cancel" onClick={() => setIsOpen(false)}>
                    <X className="size-4" aria-hidden="true" />
                </ToolbarButton>
            </div>
        );
    }

    return (
        <ToolbarButton label="Image" onClick={() => setIsOpen(true)}>
            <ImageIcon className="size-4" aria-hidden="true" />
        </ToolbarButton>
    );
}

function ColorControl({ editor }: { editor: Editor }) {
    const [isOpen, setIsOpen] = useState(false);

    if (!isOpen) {
        return (
            <ToolbarButton label="Text color" onClick={() => setIsOpen(true)}>
                <Palette className="size-4" aria-hidden="true" />
            </ToolbarButton>
        );
    }

    return (
        <div className="flex items-center gap-1 px-1">
            {TEXT_COLORS.map((color) => (
                <button
                    key={color}
                    type="button"
                    aria-label={`Set text color ${color}`}
                    onClick={() => {
                        editor.chain().focus().setColor(color).run();
                        setIsOpen(false);
                    }}
                    className="size-5 rounded-full border border-border"
                    style={{ backgroundColor: color }}
                />
            ))}
            <ToolbarButton
                label="Remove color"
                onClick={() => {
                    editor.chain().focus().unsetColor().run();
                    setIsOpen(false);
                }}
            >
                <X className="size-3.5" aria-hidden="true" />
            </ToolbarButton>
        </div>
    );
}

function TableControls({ editor }: { editor: Editor }) {
    if (!editor.isActive('table')) {
        return null;
    }

    return (
        <>
            <Divider />
            <ToolbarButton label="Add row" onClick={() => editor.chain().focus().addRowAfter().run()}>
                <Plus className="size-3.5" aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton label="Delete row" onClick={() => editor.chain().focus().deleteRow().run()}>
                <Trash2 className="size-3.5" aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton label="Add column" onClick={() => editor.chain().focus().addColumnAfter().run()}>
                <Plus className="size-3.5 rotate-90" aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton label="Delete column" onClick={() => editor.chain().focus().deleteColumn().run()}>
                <Trash2 className="size-3.5 rotate-90" aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton label="Delete table" onClick={() => editor.chain().focus().deleteTable().run()}>
                <Table className="size-3.5" aria-hidden="true" />
            </ToolbarButton>
        </>
    );
}

export function RichTextToolbar({ editor }: { editor: Editor }) {
    // Defensive second layer — RichTextEditor already guards against a destroyed editor before
    // rendering this component, but `editor.isActive`/`editor.can()` below would throw on a
    // torn-down instance, so this stays safe even if that guard is ever bypassed.
    if (editor.isDestroyed) {
        return null;
    }

    return (
        <div className="flex flex-wrap items-center gap-0.5 rounded-t-md border-b border-border bg-muted/50 p-1">
            <ToolbarButton
                label="Paragraph"
                active={editor.isActive('paragraph')}
                onClick={() => editor.chain().focus().setParagraph().run()}
            >
                <Pilcrow className="size-4" aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton
                label="Heading 1"
                active={editor.isActive('heading', { level: 1 })}
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            >
                <Heading1 className="size-4" aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton
                label="Heading 2"
                active={editor.isActive('heading', { level: 2 })}
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
                <Heading2 className="size-4" aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton
                label="Heading 3"
                active={editor.isActive('heading', { level: 3 })}
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            >
                <Heading3 className="size-4" aria-hidden="true" />
            </ToolbarButton>

            <Divider />

            <ToolbarButton
                label="Bold"
                active={editor.isActive('bold')}
                onClick={() => editor.chain().focus().toggleBold().run()}
            >
                <Bold className="size-4" aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton
                label="Italic"
                active={editor.isActive('italic')}
                onClick={() => editor.chain().focus().toggleItalic().run()}
            >
                <Italic className="size-4" aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton
                label="Underline"
                active={editor.isActive('underline')}
                onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
                <UnderlineIcon className="size-4" aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton
                label="Strikethrough"
                active={editor.isActive('strike')}
                onClick={() => editor.chain().focus().toggleStrike().run()}
            >
                <Strikethrough className="size-4" aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton
                label="Inline code"
                active={editor.isActive('code')}
                onClick={() => editor.chain().focus().toggleCode().run()}
            >
                <Code className="size-4" aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton
                label="Highlight"
                active={editor.isActive('highlight')}
                onClick={() => editor.chain().focus().toggleHighlight().run()}
            >
                <Highlighter className="size-4" aria-hidden="true" />
            </ToolbarButton>
            <ColorControl editor={editor} />

            <Divider />

            <ToolbarButton
                label="Bullet list"
                active={editor.isActive('bulletList')}
                onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
                <List className="size-4" aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton
                label="Numbered list"
                active={editor.isActive('orderedList')}
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
                <ListOrdered className="size-4" aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton
                label="Block quote"
                active={editor.isActive('blockquote')}
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
            >
                <Quote className="size-4" aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton
                label="Code block"
                active={editor.isActive('codeBlock')}
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            >
                <Code className="size-4 scale-x-[-1]" aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton label="Horizontal rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
                <Minus className="size-4" aria-hidden="true" />
            </ToolbarButton>

            <Divider />

            <LinkControl editor={editor} />
            <ImageControl editor={editor} />
            <ToolbarButton
                label="Insert table"
                onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            >
                <Table className="size-4" aria-hidden="true" />
            </ToolbarButton>

            <TableControls editor={editor} />

            <Divider />

            <ToolbarButton
                label="Undo"
                disabled={!editor.can().undo()}
                onClick={() => editor.chain().focus().undo().run()}
            >
                <Undo2 className="size-4" aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton
                label="Redo"
                disabled={!editor.can().redo()}
                onClick={() => editor.chain().focus().redo().run()}
            >
                <Redo2 className="size-4" aria-hidden="true" />
            </ToolbarButton>
        </div>
    );
}
