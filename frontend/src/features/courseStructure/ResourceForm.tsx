import { useState } from 'react';
import { Link as LinkIcon, Upload } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ApiError } from '@/lib/api/client';
import type { ResourceType } from '@/lib/api/types';
import type { ResourcePayload } from '@/features/courseStructure/api';

interface ResourceFormProps {
    onSubmit: (payload: ResourcePayload) => Promise<void>;
    onCancel: () => void;
}

const MAX_RESOURCE_FILE_BYTES = 20 * 1024 * 1024;

/**
 * Shared by the document/downloadable_file `file` field and the scorm `package` field — either
 * upload a file (primary) or fall back to pasting a URL, keeping the capability the plain
 * `Input type="url"` already had rather than replacing it outright.
 */
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
        if (!selected) {
            return;
        }

        setFileError(null);
        if (selected.size > MAX_RESOURCE_FILE_BYTES) {
            setFileError('That file is over 20MB. Choose a smaller one.');
            return;
        }

        onFile(selected);
    };

    return (
        <div>
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-ink-900">{label}</p>
                <button
                    type="button"
                    onClick={() => setMode((m) => (m === 'upload' ? 'url' : 'upload'))}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                    {mode === 'upload' ? (
                        <>
                            <LinkIcon className="size-3" aria-hidden="true" />
                            Paste a URL instead
                        </>
                    ) : (
                        <>
                            <Upload className="size-3" aria-hidden="true" />
                            Upload a file instead
                        </>
                    )}
                </button>
            </div>

            {fileError && <Alert variant="error" message={fileError} className="mt-1" />}

            {mode === 'upload' ? (
                <div className="mt-1 flex items-center gap-2">
                    <input type="file" accept={accept} onChange={handleFileChange} className="text-sm text-ink-600" />
                    {file && <span className="text-xs text-ink-600">{file.name}</span>}
                </div>
            ) : (
                <Input label={urlLabel} type="url" value={url} onChange={(e) => onUrl(e.target.value)} required className="mt-1" />
            )}
        </div>
    );
}

const typeLabels: Record<ResourceType, string> = {
    video: 'Video',
    document: 'Document (PDF/PPTX/DOCX)',
    reading: 'Reading / text lesson',
    external_link: 'External link',
    scorm: 'SCORM/xAPI package',
    live_session: 'Live session',
    downloadable_file: 'Downloadable file',
};

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
        setIsSubmitting(true);

        try {
            await onSubmit({
                type,
                title,
                is_required: isRequired,
                ...fields,
                ...(file ? { file } : {}),
                ...(packageFile ? { package: packageFile } : {}),
            });
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Could not create the resource.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-3 rounded-md border border-surface-100 bg-surface-50 p-4"
        >
            {error && <Alert variant="error" message={error} />}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Select label="Type" value={type} onChange={(e) => setType(e.target.value as ResourceType)}>
                    {Object.entries(typeLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                            {label}
                        </option>
                    ))}
                </Select>
                <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>

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
                <Textarea
                    label="Content (HTML)"
                    rows={4}
                    value={fields.content_html ?? ''}
                    onChange={setField('content_html')}
                    required
                />
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

            <label className="flex items-center gap-2 text-sm text-ink-900">
                <input type="checkbox" checked={isRequired} onChange={(e) => setIsRequired(e.target.checked)} />
                Required for module completion
            </label>

            <div className="flex gap-2">
                <Button type="submit" isLoading={isSubmitting}>
                    Add resource
                </Button>
                <Button type="button" variant="ghost" onClick={onCancel}>
                    Cancel
                </Button>
            </div>
        </form>
    );
}
