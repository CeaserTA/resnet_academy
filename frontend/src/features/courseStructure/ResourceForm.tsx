import { useState } from 'react';
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
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const setField = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setFields((prev) => ({ ...prev, [key]: e.target.value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            await onSubmit({ type, title, is_required: isRequired, ...fields });
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
                    <Input
                        label="File URL"
                        type="url"
                        value={fields.file_url ?? ''}
                        onChange={setField('file_url')}
                        required
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
                    <Input
                        label="Package URL"
                        type="url"
                        value={fields.package_url ?? ''}
                        onChange={setField('package_url')}
                        required
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
