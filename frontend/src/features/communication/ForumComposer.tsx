import { useRef, useState } from 'react';
import { FileText, Image as ImageIcon, Music, Video, X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { MarkdownComposer } from '@/lib/markdown/MarkdownComposer';
import { useForumTags } from '@/features/communication/useCommunication';
import type { ForumPostAttachmentType } from '@/lib/api/types';
import type { ForumPostAttachmentInput } from '@/features/communication/api';

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

const ATTACHMENT_ACCEPT: Record<'image' | 'video' | 'audio', string> = {
    image: 'image/jpeg,image/png,image/webp,image/gif',
    video: 'video/mp4,video/webm,video/quicktime,video/ogg',
    audio: 'audio/mpeg,audio/wav,audio/mp4,audio/ogg',
};

interface ForumComposerProps {
    /** Title + tag inputs only make sense when starting a new discussion, not when editing a post's body. */
    isNewDiscussion?: boolean;
    initialTitle?: string;
    initialTags?: string[];
    initialBody?: string;
    initialAttachmentType?: ForumPostAttachmentType | null;
    existingAttachmentName?: string | null;
    submitLabel?: string;
    placeholder?: string;
    onCancel?: () => void;
    onSubmit: (values: { title?: string; body: string; tags?: string[] } & ForumPostAttachmentInput) => Promise<void>;
    isSubmitting?: boolean;
}

/**
 * Shared by "new discussion" and "edit a post's body" — title/tags only render for the former.
 * Image/Video/Audio each open a hidden file input for that type; Article just switches the
 * composer to a long-form write-up — no file (confirmed with the user in an earlier pass:
 * "Article" is a long-form text mode, not an upload). Body itself is Markdown, edited via
 * `MarkdownComposer`'s formatting toolbar + live preview.
 */
export function ForumComposer({
    isNewDiscussion = false,
    initialTitle = '',
    initialTags = [],
    initialBody = '',
    initialAttachmentType = null,
    existingAttachmentName = null,
    submitLabel = 'Post',
    placeholder = 'Share your thoughts',
    onCancel,
    onSubmit,
    isSubmitting = false,
}: ForumComposerProps) {
    const [title, setTitle] = useState(initialTitle);
    const [tags, setTags] = useState<string[]>(initialTags);
    const [tagInput, setTagInput] = useState('');
    const [body, setBody] = useState(initialBody);
    const [attachmentType, setAttachmentType] = useState<ForumPostAttachmentType | null>(initialAttachmentType);
    const [file, setFile] = useState<File | null>(null);
    const [keptExistingAttachment, setKeptExistingAttachment] = useState(existingAttachmentName !== null);
    const [fileError, setFileError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pendingFileKind = useRef<'image' | 'video' | 'audio' | null>(null);
    const { data: existingTags } = useForumTags();

    const openFilePicker = (kind: 'image' | 'video' | 'audio') => {
        pendingFileKind.current = kind;
        if (fileInputRef.current) {
            fileInputRef.current.accept = ATTACHMENT_ACCEPT[kind];
            fileInputRef.current.click();
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        e.target.value = '';
        if (!selected || !pendingFileKind.current) {
            return;
        }

        if (selected.size > MAX_ATTACHMENT_BYTES) {
            setFileError('That file is over 5MB. Choose a smaller one.');
            return;
        }

        setFileError(null);
        setFile(selected);
        setKeptExistingAttachment(false);
        setAttachmentType(pendingFileKind.current);
    };

    const toggleArticleMode = () => {
        if (attachmentType === 'article') {
            setAttachmentType(null);
            return;
        }
        removeAttachment();
        setAttachmentType('article');
    };

    const removeAttachment = () => {
        setFile(null);
        setKeptExistingAttachment(false);
        setAttachmentType(null);
        setFileError(null);
    };

    const addTag = (raw: string) => {
        const value = raw.trim();
        if (!value || tags.some((tag) => tag.toLowerCase() === value.toLowerCase()) || tags.length >= 10) {
            setTagInput('');
            return;
        }
        setTags((prev) => [...prev, value]);
        setTagInput('');
    };

    const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(tagInput);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!body.trim() || fileError || (isNewDiscussion && !title.trim())) {
            return;
        }

        await onSubmit({
            title: isNewDiscussion ? title : undefined,
            body,
            tags: isNewDiscussion ? tags : undefined,
            attachmentType: attachmentType ?? undefined,
            attachment: file ?? undefined,
            removeAttachment: existingAttachmentName !== null && !keptExistingAttachment && !file,
        });

        setTitle('');
        setTags([]);
        setBody('');
        setFile(null);
        setAttachmentType(null);
        setKeptExistingAttachment(false);
    };

    const isArticleMode = attachmentType === 'article';
    const attachmentLabel = file?.name ?? (keptExistingAttachment ? existingAttachmentName : null);

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-surface-100 bg-surface-0 p-4">
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />

            {fileError && <Alert variant="error" message={fileError} />}

            {isNewDiscussion && (
                <>
                    <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />

                    <div className="flex flex-col gap-1.5">
                        <span className="text-sm font-medium text-ink-900">Tags (optional)</span>
                        {tags.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5">
                                {tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="inline-flex items-center gap-1 rounded-full bg-ink-300/20 px-2.5 py-0.5 text-xs font-medium text-ink-600"
                                    >
                                        {tag}
                                        <button
                                            type="button"
                                            onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                                            aria-label={`Remove tag ${tag}`}
                                        >
                                            <X className="size-3" aria-hidden="true" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                        <input
                            list="forum-tag-suggestions"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={handleTagKeyDown}
                            onBlur={() => addTag(tagInput)}
                            placeholder="e.g. Flutter, Navigation — press Enter to add"
                            className="rounded-md border border-surface-100 bg-surface-0 px-3 py-2 text-sm text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                        />
                        <datalist id="forum-tag-suggestions">
                            {(existingTags ?? []).map((tag) => (
                                <option key={tag.id} value={tag.name} />
                            ))}
                        </datalist>
                    </div>
                </>
            )}

            <MarkdownComposer value={body} onChange={setBody} placeholder={placeholder} rows={isArticleMode ? 8 : 4} required />

            {attachmentType && attachmentType !== 'article' && (
                <div className="flex items-center justify-between rounded-md bg-surface-50 px-3 py-2 text-sm text-ink-600">
                    <span className="truncate">{attachmentLabel}</span>
                    <button type="button" onClick={removeAttachment} aria-label="Remove attachment" className="shrink-0">
                        <X className="size-4" aria-hidden="true" />
                    </button>
                </div>
            )}

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => openFilePicker('image')}
                        aria-label="Attach an image"
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-ink-600 hover:bg-surface-100"
                    >
                        <ImageIcon className="size-4 text-amber-600" aria-hidden="true" />
                        Image
                    </button>
                    <button
                        type="button"
                        onClick={() => openFilePicker('video')}
                        aria-label="Attach a video, up to 5MB"
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-ink-600 hover:bg-surface-100"
                    >
                        <Video className="size-4 text-blue-600" aria-hidden="true" />
                        Video
                    </button>
                    <button
                        type="button"
                        onClick={() => openFilePicker('audio')}
                        aria-label="Attach audio"
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-ink-600 hover:bg-surface-100"
                    >
                        <Music className="size-4 text-emerald-600" aria-hidden="true" />
                        Audio
                    </button>
                    <button
                        type="button"
                        onClick={toggleArticleMode}
                        aria-label={isArticleMode ? 'Switch back to a short post' : 'Write a long-form article'}
                        aria-pressed={isArticleMode}
                        className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-surface-100 ${isArticleMode ? 'bg-surface-100 text-ink-900' : 'text-ink-600'}`}
                    >
                        <FileText className="size-4 text-rose-600" aria-hidden="true" />
                        Article
                    </button>
                </div>

                <div className="flex gap-2">
                    {onCancel && (
                        <Button type="button" variant="ghost" onClick={onCancel}>
                            Cancel
                        </Button>
                    )}
                    <Button type="submit" isLoading={isSubmitting} disabled={!body.trim() || (isNewDiscussion && !title.trim())}>
                        {submitLabel}
                    </Button>
                </div>
            </div>
        </form>
    );
}
