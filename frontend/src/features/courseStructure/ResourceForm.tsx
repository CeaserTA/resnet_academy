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
import type { CohortCourse, ResourceModuleItem, ResourceType } from '@/lib/api/types';
import type { ResourcePayload } from '@/features/courseStructure/api';

// Lazy-loaded: Tiptap + its extensions are only needed on this instructor-authoring path, never
// on the far more frequently hit student reading path, so they shouldn't bloat the main bundle.
const RichTextEditor = lazy(() => import('@/components/editor/RichTextEditor'));

interface ResourceFormProps {
    /** When set, the form edits this existing resource instead of creating a new one. */
    resource?: ResourceModuleItem;
    /**
     * Resolves with a warning when the save succeeded but the recording link looks unreachable
     * to students. The form stays open and shows it rather than closing on a silent problem.
     */
    onSubmit: (payload: ResourcePayload) => Promise<string | null | void>;
    onCancel: () => void;
    /**
     * The cohorts the course runs in. A live session is run for one intake, with its own date,
     * link and attendance list, so the form asks which. Left out (or empty), the session is not
     * tied to a cohort.
     */
    cohorts?: CohortCourse[];
}

/** Sentinel for "not tied to a cohort" — the Select cannot hold an empty-string option value. */
const ALL_COHORTS = 'all';

function formatDay(iso: string): string {
    return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

const MAX_RESOURCE_FILE_BYTES = 20 * 1024 * 1024;

/**
 * Converts a UTC ISO datetime from the API into the local wall-clock string
 * <input type="datetime-local"> expects (e.g. "2026-09-11T13:00"). A naive `.slice(0, 16)` on
 * the ISO string would keep it in UTC instead of the viewer's local time, shifting it by the
 * browser's UTC offset.
 */
function toLocalDatetimeInputValue(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Flattens a resource's `details` into the same string-keyed shape the form's `fields` state uses. */
function detailsToFields(resource: ResourceModuleItem): Record<string, string> {
    const fields: Record<string, string> = {};
    for (const [key, value] of Object.entries(resource.details)) {
        if (value === null || value === undefined) continue;
        fields[key] = key === 'scheduled_at' ? toLocalDatetimeInputValue(String(value)) : String(value);
    }
    return fields;
}

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
        // Don't clear the input value before reading — that would wipe the file reference.
        if (!selected) return;

        setFileError(null);
        if (selected.size > MAX_RESOURCE_FILE_BYTES) {
            setFileError('That file is over 20 MB. Choose a smaller one.');
            e.target.value = '';
            return;
        }
        onFile(selected);
        // Reset so selecting the same file again still fires onChange
        e.target.value = '';
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
                <div className="mt-1">
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 transition hover:bg-surface-100">
                        <Upload className="size-4 shrink-0 text-ink-600" aria-hidden="true" />
                        <span className="flex min-w-0 flex-1 items-center gap-2">
                            {file ? (
                                <span className="truncate text-sm font-medium text-ink-900">{file.name}</span>
                            ) : (
                                <span className="text-sm text-ink-600">Click to choose a file…</span>
                            )}
                        </span>
                        {file && (
                            <span className="shrink-0 text-xs text-ink-600">
                                {(file.size / 1024 / 1024).toFixed(1)} MB
                            </span>
                        )}
                        <input
                            type="file"
                            accept={accept}
                            onChange={handleFileChange}
                            className="sr-only"
                        />
                    </label>
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
export function ResourceForm({ resource, onSubmit, onCancel, cohorts = [] }: ResourceFormProps) {
    const isEditing = !!resource;
    const [type, setType] = useState<ResourceType>(resource?.type ?? 'reading');
    const [title, setTitle] = useState(resource?.title ?? '');
    const [isRequired, setIsRequired] = useState(resource?.is_required ?? true);
    const [fields, setFields] = useState<Record<string, string>>(resource ? detailsToFields(resource) : {});
    const [file, setFile] = useState<File | null>(null);
    const [packageFile, setPackageFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [recordingWarning, setRecordingWarning] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const setField = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setFields((prev) => ({ ...prev, [key]: e.target.value }));

    // Which cohort a live session is for. A brand-new session on a course that runs in several
    // cohorts starts with nothing chosen, because there is no sensible default. A single-cohort
    // course, and an existing session that was never tied to a cohort, start on "everyone".
    const cohortChoice = fields.cohort_id ?? (isEditing || cohorts.length <= 1 ? ALL_COHORTS : '');
    const chosenCohort = cohorts.find((c) => String(c.cohort_id) === cohortChoice);
    // "Everyone" is offered where it can be saved: a course with at most one cohort, or a session
    // that already has no cohort (so it can still be edited without being forced to pick one).
    const canChooseEveryone = cohorts.length <= 1 || (isEditing && !resource?.details?.cohort_id);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setRecordingWarning(null);

        if (type === 'reading' && !(fields.content_html ?? '').replace(/<[^>]+>/g, '').trim()) {
            setError('Lesson content is required.');
            return;
        }

        if (type === 'live_session' && cohorts.length > 0 && cohortChoice === '') {
            setError('Choose which cohort this live session is for.');
            return;
        }

        setIsSubmitting(true);

        try {
            const warning = await onSubmit({
                // `type` is immutable after creation — UpdateResourceRequest has no rule for it,
                // so Laravel's validated() silently drops it on edit; harmless to always include.
                type,
                title,
                is_required: isRequired,
                ...fields,
                ...(type === 'document' ? { file_type: fields.file_type ?? 'pdf' } : {}),
                ...(type === 'scorm' ? { standard: fields.standard ?? 'scorm_2004' } : {}),
                ...(type === 'live_session'
                    ? {
                        provider: fields.provider ?? 'zoom',
                        ...(cohorts.length > 0
                            ? { cohort_id: cohortChoice === ALL_COHORTS || cohortChoice === '' ? null : Number(cohortChoice) }
                            : {}),
                        // <input type="datetime-local"> gives a naive local wall-clock string
                        // (no offset) — convert it to a real UTC instant before sending, since
                        // the browser interprets an offset-less string as local time but the
                        // backend (APP timezone UTC) would otherwise store it as literal UTC.
                        ...(fields.scheduled_at ? { scheduled_at: new Date(fields.scheduled_at).toISOString() } : {}),
                    }
                    : {}),
                ...(file ? { file } : {}),
                ...(packageFile ? { package: packageFile } : {}),
            });

            // Saved, but the recording link looks unreachable — keep the form open so the admin
            // can fix it now, rather than a student discovering it later.
            if (typeof warning === 'string' && warning !== '') {
                setRecordingWarning(warning);
            }
        } catch (err) {
            setError(err instanceof ApiError ? err.message : `Could not ${isEditing ? 'save' : 'create'} the resource.`);
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
                    <p className="text-sm font-semibold text-blue-900">{isEditing ? 'Edit resource' : 'New resource'}</p>
                    <p className="text-xs text-blue-500">
                        {isEditing ? 'Update the details and save' : 'Choose a type, fill in the details, and save'}
                    </p>
                </div>
            </div>

            <div className="flex flex-col gap-5 p-5">
                {error && <Alert variant="error" message={error} />}
                {recordingWarning && (
                    <Alert
                        variant="warning"
                        message={`Saved — but students may not be able to open this recording. ${recordingWarning}`}
                    />
                )}

                {/* ── Type picker ── */}
                <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-600">Resource type</p>
                    <div className="flex flex-wrap gap-2">
                        {resourceTypes.map(({ value, label, icon: Icon, description }) => (
                            <button
                                key={value}
                                type="button"
                                disabled={isEditing}
                                onClick={() => setType(value)}
                                title={isEditing ? 'Type cannot be changed after creation' : description}
                                className={cn(
                                    'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
                                    type === value
                                        ? 'border-blue-300 bg-blue-50 text-blue-700 shadow-sm'
                                        : 'border-surface-200 bg-surface-0 text-ink-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700',
                                    isEditing && 'cursor-not-allowed opacity-60 hover:border-surface-200 hover:bg-surface-0 hover:text-ink-600',
                                )}
                            >
                                <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                                {label}
                            </button>
                        ))}
                    </div>
                    <p className="mt-1.5 text-xs text-ink-600">
                        {isEditing ? "Type can't be changed after creation." : activeType.description}
                    </p>
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
                                <div className="flex h-48 items-center justify-center rounded-lg border border-surface-200 text-sm text-ink-600">
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
                        {cohorts.length > 0 && (
                            <div className="sm:col-span-2">
                                <Select
                                    label="Cohort"
                                    value={cohortChoice}
                                    placeholder="Choose a cohort"
                                    onChange={(e) => setFields((prev) => ({ ...prev, cohort_id: e.target.value }))}
                                >
                                    {canChooseEveryone && <option value={ALL_COHORTS}>Everyone taking this course</option>}
                                    {cohorts.map((c) => (
                                        <option key={c.cohort_id} value={String(c.cohort_id)}>
                                            {c.cohort_name ?? `Cohort ${c.cohort_id}`}
                                        </option>
                                    ))}
                                </Select>
                                <p className="mt-1 text-xs text-ink-500">
                                    {cohorts.length > 1
                                        ? 'This course runs in more than one cohort. A live session is run for one of them, with its own date and link. Add one session per cohort. Only that cohort’s students see it.'
                                        : 'Only students in the chosen cohort see the session. Leave it on everyone to show it to the whole course.'}
                                </p>
                            </div>
                        )}
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
                        <div>
                            <Input
                                label="Scheduled at"
                                type="datetime-local"
                                value={fields.scheduled_at ?? ''}
                                onChange={setField('scheduled_at')}
                                required
                            />
                            {chosenCohort?.start_date && chosenCohort?.end_date && (
                                <p className="mt-1 text-xs text-ink-500">
                                    {chosenCohort.cohort_name ?? 'This cohort'} runs {formatDay(chosenCohort.start_date)} to{' '}
                                    {formatDay(chosenCohort.end_date)}. The date must fall within it.
                                </p>
                            )}
                        </div>
                        <Input
                            label="Duration (minutes)"
                            type="number"
                            value={fields.duration_minutes ?? ''}
                            onChange={setField('duration_minutes')}
                            required
                        />
                        <div className="sm:col-span-2">
                            <Input
                                label="Recording link (after the session)"
                                type="url"
                                value={fields.recording_url ?? ''}
                                onChange={setField('recording_url')}
                                placeholder="https://drive.google.com/… or https://zoom.us/rec/…"
                            />
                            <p className="mt-1 text-xs text-ink-500">
                                Students who missed the live session complete it by watching this. Make sure sharing is
                                set to <span className="font-medium text-ink-700">&ldquo;Anyone with the link can view&rdquo;</span>{' '}
                                (Google Drive), or that the recording isn&rsquo;t passcode-protected or limited to
                                signed-in users (Zoom) — otherwise students won&rsquo;t be able to open it.
                            </p>
                        </div>
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
                        <p className="text-xs text-ink-600">Students must complete this to unlock the next module</p>
                    </div>
                </label>

                {/* ── Actions ── */}
                <div className="flex items-center gap-2 pt-1">
                    <Button type="submit" isLoading={isSubmitting}>
                        {isEditing ? 'Save changes' : 'Add resource'}
                    </Button>
                    <Button type="button" variant="ghost" onClick={onCancel}>
                        Cancel
                    </Button>
                </div>
            </div>
        </form>
    );
}
