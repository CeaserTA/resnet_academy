import { useEffect, useState } from 'react';
import { Award, Download, RefreshCw, Search } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { ApiError } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { useCourses } from '@/features/catalogue/useCourses';
import { useCohorts } from '@/features/cohorts/useCohorts';
import { certificateDownloadUrl } from '@/features/progress/api';
import { useAdminCertificates, useRegenerateCertificate } from '@/features/admin/certificates/useAdminCertificates';
import type { AdminCertificate, CertificateStatus } from '@/lib/api/types';

const STATUS_TABS: [CertificateStatus | 'all', string][] = [
    ['all', 'All'],
    ['generating', 'Generating'],
    ['ready', 'Ready'],
];

const selectClass =
    'rounded-lg border border-surface-100 bg-surface-0 px-3 py-1.5 text-sm text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600';

const GRID = 'grid grid-cols-[minmax(180px,1.3fr)_minmax(160px,1.2fr)_minmax(150px,1fr)_110px_100px_170px] items-center gap-2';

/**
 * Admin-only support screen for issued certificates: find a student's certificate quickly, open
 * it, and re-run PDF generation for one that never finished. Access is enforced server-side by
 * CertificatePolicy — the route guard and nav entry are only conveniences.
 */
export function AdminCertificatesPage() {
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [courseId, setCourseId] = useState<number | ''>('');
    const [cohortId, setCohortId] = useState<number | ''>('');
    const [status, setStatus] = useState<CertificateStatus | 'all'>('all');
    const [page, setPage] = useState(1);
    const [actionError, setActionError] = useState<string | null>(null);

    const { data: courses } = useCourses({});
    const { data: cohorts } = useCohorts();

    useEffect(() => {
        const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
        return () => clearTimeout(timer);
    }, [searchInput]);

    useEffect(() => {
        setPage(1);
    }, [search, courseId, cohortId, status]);

    const { data, isLoading, isFetching } = useAdminCertificates({
        search: search || undefined,
        course_id: courseId === '' ? undefined : courseId,
        cohort_id: cohortId === '' ? undefined : cohortId,
        status: status === 'all' ? undefined : status,
        page,
    });
    const regenerate = useRegenerateCertificate();

    const certificates = data?.data ?? [];
    const meta = data?.meta;

    const handleRegenerate = async (certificate: AdminCertificate) => {
        setActionError(null);
        try {
            await regenerate.mutateAsync(certificate.id);
        } catch (err) {
            setActionError(err instanceof ApiError ? err.message : 'Could not regenerate this certificate.');
        }
    };

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-lg font-semibold text-ink-900">Certificates</h1>
                <p className="text-xs text-ink-400">Every issued certificate. Search by student, email or certificate number.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <select
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value === '' ? '' : Number(e.target.value))}
                    aria-label="Filter by course"
                    className={selectClass}
                >
                    <option value="">All courses</option>
                    {(courses?.data ?? []).map((course) => (
                        <option key={course.id} value={course.id}>{course.title}</option>
                    ))}
                </select>

                <select
                    value={cohortId}
                    onChange={(e) => setCohortId(e.target.value === '' ? '' : Number(e.target.value))}
                    aria-label="Filter by cohort"
                    className={selectClass}
                >
                    <option value="">All cohorts</option>
                    {(cohorts ?? []).map((cohort) => (
                        <option key={cohort.id} value={cohort.id}>{cohort.name}</option>
                    ))}
                </select>

                <div className="flex items-center gap-0.5 rounded-lg border border-surface-100 bg-surface-50 p-0.5" role="group" aria-label="Filter by status">
                    {STATUS_TABS.map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setStatus(value)}
                            aria-pressed={status === value}
                            className={cn(
                                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                                status === value ? 'bg-blue-600 text-white shadow-sm' : 'text-ink-600 hover:text-ink-900',
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div className="relative ml-auto w-full max-w-64">
                    <Search className="absolute left-3 top-1/2 z-10 size-3.5 -translate-y-1/2 text-ink-600" aria-hidden="true" />
                    <input
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Name, email or CERT-…"
                        aria-label="Search certificates"
                        className="w-full rounded-lg border border-surface-100 bg-surface-50 py-1.5 pl-8 pr-3 text-sm text-ink-900 transition focus-visible:bg-surface-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    />
                </div>
            </div>

            {actionError && <Alert variant="error" message={actionError} onDismiss={() => setActionError(null)} />}

            {isLoading && <Spinner className="mt-6" />}

            {!isLoading && certificates.length === 0 && (
                <EmptyState icon={Award} title="No certificates" description="Nothing matches these filters." className="mt-6" />
            )}

            {!isLoading && certificates.length > 0 && (
                <div className={cn('overflow-x-auto rounded-xl border border-surface-100 bg-surface-0 shadow-sm', isFetching && 'opacity-70')}>
                    <div className={cn(GRID, 'min-w-[900px] border-b border-surface-100 bg-surface-50 px-4 py-2.5')}>
                        {['Student', 'Course / cohort', 'Certificate', 'Status', 'Issued'].map((heading) => (
                            <span key={heading} className="text-xs font-medium uppercase tracking-wide text-ink-600">{heading}</span>
                        ))}
                        <span className="text-right text-xs font-medium uppercase tracking-wide text-ink-600">Actions</span>
                    </div>

                    <ul className="min-w-[900px] divide-y divide-surface-100">
                        {certificates.map((certificate) => {
                            const isRegenerating = regenerate.isPending && regenerate.variables === certificate.id;

                            return (
                                <li key={certificate.id} className={cn(GRID, 'px-4 py-3 hover:bg-surface-50')}>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-ink-900">{certificate.student.name}</p>
                                        <p className="truncate text-xs text-ink-400">{certificate.student.email}</p>
                                    </div>

                                    <div className="min-w-0">
                                        <p className="truncate text-sm text-ink-900">{certificate.course.title}</p>
                                        <p className="truncate text-xs text-ink-400">{certificate.cohort?.name ?? '—'}</p>
                                    </div>

                                    <p className="truncate font-mono text-xs text-ink-600">{certificate.certificate_number}</p>

                                    {certificate.status === 'ready' ? (
                                        <Badge label="Ready" tone="success" />
                                    ) : (
                                        <Badge label="Generating" tone="warning" />
                                    )}

                                    <p className="font-mono text-xs text-ink-400">{new Date(certificate.issued_at).toLocaleDateString()}</p>

                                    <div className="flex items-center justify-end gap-1">
                                        {/*
                                            The download endpoint renders on demand, so this works even
                                            for a certificate still marked "generating". rel="noopener"
                                            only — "noreferrer" strips the Referer Sanctum needs, and the
                                            admin would be bounced to /login.
                                        */}
                                        <a
                                            href={certificateDownloadUrl(certificate.id)}
                                            target="_blank"
                                            rel="noopener"
                                            aria-label={`Open certificate ${certificate.certificate_number}`}
                                            className="inline-flex items-center gap-1 rounded-lg border border-surface-100 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-600/10"
                                        >
                                            <Download className="size-3.5" aria-hidden="true" />
                                            Open
                                        </a>
                                        {certificate.status === 'generating' && (
                                            <button
                                                type="button"
                                                onClick={() => handleRegenerate(certificate)}
                                                disabled={regenerate.isPending}
                                                aria-label={`Regenerate certificate ${certificate.certificate_number}`}
                                                className="inline-flex items-center gap-1 rounded-lg border border-surface-100 px-2 py-1 text-xs font-medium text-ink-600 hover:bg-surface-100 disabled:opacity-50"
                                            >
                                                <RefreshCw className={cn('size-3.5', isRegenerating && 'animate-spin')} aria-hidden="true" />
                                                Regenerate
                                            </button>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>

                    {meta && meta.last_page > 1 && (
                        <div className="flex min-w-[900px] items-center justify-between border-t border-surface-100 px-4 py-2.5">
                            <p className="text-xs text-ink-400">
                                Page {meta.current_page} of {meta.last_page} · {meta.total} certificates
                            </p>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={meta.current_page <= 1}
                                    className="rounded-lg border border-surface-100 px-2 py-1 text-xs disabled:opacity-40"
                                >
                                    Previous
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
                                    disabled={meta.current_page >= meta.last_page}
                                    className="rounded-lg border border-surface-100 px-2 py-1 text-xs disabled:opacity-40"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
