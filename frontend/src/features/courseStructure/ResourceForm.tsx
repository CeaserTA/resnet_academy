import { lazy, Suspense, useState } from 'react';
import {
    FileEdit,
    Link as LinkIcon,
    Upload,
    Video,
    FileText,
    BookOpen,
    Globe,
    Package,
    Radio,
    Download,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { cn } from '@/lib/utils';
import { ApiError } from '@/lib/api/client';
import type { ResourceType } from '@/lib/api/types';
import type { ResourcePayload } from '@/features/courseStructure/api';

// Lazy-loaded: Tiptap + its extensions are only needed on this instructor-authoring path, never
// on the far more frequently hit student reading path, so they shouldn't bloat the main bundle.
const RichTextEditor = lazy(() => import('@/components/editor/RichTextEditor'));

interface ResourceFormProps {
    onSubmit: (payload: ResourcePayload) => Promise<void>;
    onCancel: () => void;
}

const MAX_RESOURCE_FILE_BYTES = 20 * 1024 * 1024;

// ─── Resource type pill config ─────────────────────────────────────────────────

const resourceTypes: {
    value: ResourceType;
    label: string;
    icon: React.ElementType;
    description: string;
}[] = [
        { value: 'reading', label: 'Reading', icon: BookOpen, description: 'Rich-text lesson' },
        { value: 'video', label: 'Video', icon: Video, description: 'Bunny Stream' },
        { value: 'document', label: 'Document', icon: FileText, description: 'PDF / DOCX / PPTX' },
        { value: 'external_link', label: 'Link', icon: Globe, description: 'External URL' },
        { value: 'live_session', label: 'Live', icon: Radio, description: 'Zoom / Meet' },
        { value: 'downloadable_file', label: 'Download', icon: Download, description: 'Any file' },
        { value: 'scorm', label: 'SCORM', icon: Package, description: 'SCORM / xAPI' },
    ];

// ─── File-or-URL field ────────────────────────────────────────────────────────

function FileOrUrlField({
    label,
    urlLabel,
    file,
    url,
    onFile,
    onUrl,
    accept,
}: {
    label: string;
    urlLabel: string;
    file: File | null;
    url: string;
    onFile: (file: File | null) => void;
    onUrl: (value: string) => void;
    accept: string;
}) {
    const [mode, setMode] = useState<'upload' | 'url'>('upload');
    const [fileError, setFileError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        e.target.value = '';
        if (!selected) return;

        setFileError(null);
        if (selected.size > MAX_RESOURCE_FILE_BYTES) {
            setFileError('That file is over 20 MB. Choose a smaller one.');
            return;
        }
        onFile(selected);
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-ink-900">{label}</p>
                <button
                    type="button"
                    onClick={() => setMode((m) => (m === 'upload' ? 'url' : 'upload'))}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                    {mode === 'upload' ? (
                        <><LinkIcon className="size-3" aria-hidden="true" />Paste a URL instead</>
                    ) : (
                        <><Upload className="size-3" aria-hidden="true" />Upload a file instead</>
                    )}
                </button>
            </div>

            {fileError && <Alert variant="error" message={fileError} className="mb-1" />}

            {mode === 'upload' ? (
                <div className="flex items-center gap-2 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2">
                    <Upload className="size-4 shrink-0 text-ink-400" aria-hidden="true" />
                    <input
                        type="file"
                        accept={accept}
                        onChange={handleFileChange}
                        className="text-sm text-ink-600 file:mr-2 file:rounded file:border-0 file:bg-blue-50 file:px-2 file:py-1 file:text-xs file:font-medium file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {file && <span className="truncate text-xs text-ink-500">{file.name}</span>}
                </div>
            ) : (
                <Input label={urlLabel} type="url" value={url} onChange={(e) => onUrl(e.target.value)} required />
            )}
        </div>
    );
}

// ─── Main form ────────────────────────────────────────────────────────────────

/**
 * One form, fields shown depend on `type` — mirrors StoreResourceRequest's conditional
 * validation on the backend so the client and server never disagree about what's required.
 */
export function ResourceForm({ onSubmit, onCancel }: ResourceFormProps) {
    const [type, setType] = useState<ResourceType>('reading');
    const [title, setTitle] = useState('');
    const [isRequired, setIsRequired] = useState(true);
    const [fields, setFields] = useState<Record<string, string>>({});
    const [file, setFile] = useState<File | null>(null);
    const [packageFile, setPackageFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const setField = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setFields((prev) => ({ ...prev, [key]: e.target.value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (type === 'reading' && !(fields.content_html ?? '').replace(/<[^>]+>/g, '').trim()) {
            setError('Lesson content is required.');
            return;
        }

        setIsSubmitting(true);

        try {
            await onSubmit({
                type,
                title,
                is_required: isRequired,
                ...fields,
                ...(type === 'document' ? { file_type: fields.file_type ?? 'pdf' } : {}),
                ...(type === 'scorm' ? { standard: fields.standard ?? 'scorm_2004' } : {}),
                ...(type === 'live_session' ? { provider: fields.provider ?? 'zoom' } : {}),
                ...(file ? { file } : {}),
                ...(packageFile ? { package: packageFile } : {}),
            });
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Could not create the resource.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const activeType = resourceTypes.find((t) => t.value === type)!;

    return (
        <form onSubmit={handleSubmit} className="flex flex-col">
            {/* ── Coloured header banner ── */}
            <div className="flex items-center gap-3 rounded-t-lg bg-blue-50 px-5 py-4 border-b border-blue-100">
                <span className="flex size-9 items-center justify-center rounded-lg bg-blue-100">
                    <FileEdit className="size-4 text-blue-600" aria-hidden="true" />
                </span>
                <div>
                    <p className="text-sm font-semibold text-blue-900">New resource</p>
                    <p className="text-xs text-blue-500">Choose a type, fill in the details, and save</p>
                </div>
            </div>

            <div className="flex flex-col gap-5 p-5">
                {error && <Alert variant="error" message={error} />}

                {/* ── Type picker ── */}
                <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Resource type</p>
                    <div className="flex flex-wrap gap-2">
                        {resourceTypes.map(({ value, label, icon: Icon, description }) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setType(value)}
                                title={description}
                                className={cn(
                                    'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
                                    type === value
                                        ? 'border-blue-300 bg-blue-50 text-blue-700 shadow-sm'
                                        : 'border-surface-200 bg-surface-0 text-ink-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700',
                                )}
                            >
                                <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                                {label}
                            </button>
                        ))}
                    </div>
                    <p className="mt-1.5 text-xs text-ink-400">{activeType.description}</p>
                </div>

                {/* ── Title ── */}
                <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />

                {/* ── Type-specific fields ── */}
                {type === 'video' && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Input
                            label="Bunny Stream video ID"
                            value={fields.bunny_stream_video_id ?? ''}
                            onChange={setField('bunny_stream_video_id')}
                            required
                        />
                        <Input
                            label="Duration (seconds)"
                            type="number"
                            value={fields.duration_seconds ?? ''}
                            onChange={setField('duration_seconds')}
                        />
                    </div>
                )}

                {(type === 'document' || type === 'downloadable_file') && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <FileOrUrlField
                            label="File"
                            urlLabel="File URL"
                            file={file}
                            url={fields.file_url ?? ''}
                            onFile={setFile}
                            onUrl={(value) => setFields((prev) => ({ ...prev, file_url: value }))}
                            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.csv,.txt"
                        />
                        {type === 'document' && (
                            <Select
                                label="File type"
                                value={fields.file_type ?? 'pdf'}
                                onChange={setField('file_type') as never}
                            >
                                <option value="pdf">PDF</option>
                                <option value="pptx">PPTX</option>
                                <option value="docx">DOCX</option>
                            </Select>
                        )}
                    </div>
                )}

                {type === 'reading' && (
                    <div>
                        <p className="mb-1.5 text-sm font-medium text-ink-900">Lesson content</p>
                        <Suspense
                            fallback={
                                <div className="flex h-48 items-center justify-center rounded-lg border border-surface-200 text-sm text-ink-400">
                                    Loading editor…
                                </div>
                            }
                        >
                            <RichTextEditor
                                value={fields.content_html ?? ''}
                                onChange={(html) => setFields((prev) => ({ ...prev, content_html: html }))}
                                placeholder="Write the lesson…"
                            />
                        </Suspense>
                    </div>
                )}

                {type === 'external_link' && (
                    <Input label="URL" type="url" value={fields.url ?? ''} onChange={setField('url')} required />
                )}

                {type === 'scorm' && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <FileOrUrlField
                            label="Package"
                            urlLabel="Package URL"
                            file={packageFile}
                            url={fields.package_url ?? ''}
                            onFile={setPackageFile}
                            onUrl={(value) => setFields((prev) => ({ ...prev, package_url: value }))}
                            accept=".zip"
                        />
                        <Select
                            label="Standard"
                            value={fields.standard ?? 'scorm_2004'}
                            onChange={setField('standard') as never}
                        >
                            <option value="scorm_1_2">SCORM 1.2</option>
                            <option value="scorm_2004">SCORM 2004</option>
                            <option value="xapi">xAPI</option>
                        </Select>
                    </div>
                )}

                {type === 'live_session' && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Select label="Provider" value={fields.provider ?? 'zoom'} onChange={setField('provider') as never}>
                            <option value="zoom">Zoom</option>
                            <option value="google_meet">Google Meet</option>
                        </Select>
                        <Input
                            label="Meeting URL"
                            type="url"
                            value={fields.meeting_url ?? ''}
                            onChange={setField('meeting_url')}
                            required
                        />
                        <Input
                            label="Scheduled at"
                            type="datetime-local"
                            value={fields.scheduled_at ?? ''}
                            onChange={setField('scheduled_at')}
                            required
                        />
                        <Input
                            label="Duration (minutes)"
                            type="number"
                            value={fields.duration_minutes ?? ''}
                            onChange={setField('duration_minutes')}
                            required
                        />
                    </div>
                )}

                {/* ── Required toggle ── */}
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-surface-100 bg-surface-50 px-4 py-3 transition hover:bg-surface-100">
                    <input
                        type="checkbox"
                        checked={isRequired}
                        onChange={(e) => setIsRequired(e.target.checked)}
                        className="size-4 rounded accent-blue-600"
                    />
                    <div>
                        <p className="text-sm font-medium text-ink-900">Required for module completion</p>
                        <p className="text-xs text-ink-400">Students must complete this to unlock the next module</p>
                    </div>
                </label>

                {/* ── Actions ── */}
                <div className="flex items-center gap-2 pt-1">
                    <Button type="submit" isLoading={isSubmitting}>
                        Add resource
                    </Button>
                    <Button type="button" variant="ghost" onClick={onCancel}>
                        Cancel
                    </Button>
                </div>
            </div>
        </form>
    );
}
