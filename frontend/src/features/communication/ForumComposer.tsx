import { useRef, useState } from 'react';
import { FileText, Image as ImageIcon, Music, Video, X } from 'lucide-react';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import type { ForumPostAttachmentType } from '@/lib/api/types';
import type { ForumPostAttachmentInput } from '@/features/communication/api';

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

const ATTACHMENT_ACCEPT: Record<'image' | 'video' | 'audio', string> = {
    image: 'image/jpeg,image/png,image/webp,image/gif',
    video: 'video/mp4,video/webm,video/quicktime,video/ogg',
    audio: 'audio/mpeg,audio/wav,audio/mp4,audio/ogg',
};

interface ForumComposerProps {
    initialBody?: string;
    initialAttachmentType?: ForumPostAttachmentType | null;
    existingAttachmentName?: string | null;
    submitLabel?: string;
    placeholder?: string;
    onCancel?: () => void;
    onSubmit: (body: string, input: ForumPostAttachmentInput) => Promise<void>;
    isSubmitting?: boolean;
}

/**
 * Shared by the Feed/My Posts composer and post editing. Image/Video/Audio each open a hidden
 * file input for that type; Article just expands the textarea for a longer write-up — no file
 * (confirmed with the user: "Article" is a long-form text mode, not an upload).
 */
export function ForumComposer({
    initialBody = '',
    initialAttachmentType = null,
    existingAttachmentName = null,
    submitLabel = 'Post',
    placeholder = 'Share your thoughts',
    onCancel,
    onSubmit,
    isSubmitting = false,
}: ForumComposerProps) {
    const [body, setBody] = useState(initialBody);
    const [attachmentType, setAttachmentType] = useState<ForumPostAttachmentType | null>(initialAttachmentType);
    const [file, setFile] = useState<File | null>(null);
    const [keptExistingAttachment, setKeptExistingAttachment] = useState(existingAttachmentName !== null);
    const [fileError, setFileError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pendingFileKind = useRef<'image' | 'video' | 'audio' | null>(null);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!body.trim() || fileError) {
            return;
        }

        await onSubmit(body, {
            attachmentType: attachmentType ?? undefined,
            attachment: file ?? undefined,
            removeAttachment: existingAttachmentName !== null && !keptExistingAttachment && !file,
        });

        setBody('');
        setFile(null);
        setAttachmentType(null);
        setKeptExistingAttachment(false);
    };

    const isArticleMode = attachmentType === 'article';
    const attachmentLabel = file?.name ?? (keptExistingAttachment ? existingAttachmentName : null);

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-md border border-surface-100 bg-surface-50 p-4">
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />

            {fileError && <Alert variant="error" message={fileError} />}

            <Textarea
                label=""
                placeholder={placeholder}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={isArticleMode ? 8 : 2}
                required
            />

            {attachmentType && attachmentType !== 'article' && (
                <div className="flex items-center justify-between rounded-md bg-surface-0 px-3 py-2 text-sm text-ink-600">
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
                    <Button type="submit" isLoading={isSubmitting} disabled={!body.trim()}>
                        {submitLabel}
                    </Button>
                </div>
            </div>
        </form>
    );
}
