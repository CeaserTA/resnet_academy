import { Link } from 'react-router';
import { Award, Download, ShieldCheck } from 'lucide-react';
import { PageFrame } from '@/components/layout/PageFrame';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { certificateDownloadUrl } from '@/features/progress/api';
import { useMyCertificates } from '@/features/progress/useProgress';
import { formatDate } from '@/lib/formatDate';

/**
 * The student's earned certificates — real `certificates` records (issued automatically when the
 * last module of a course is completed), not a view derived from progress percentages.
 */
export function MyCertificatesPage() {
    const { data: certificates, isLoading, isError } = useMyCertificates();
    const count = certificates?.length ?? 0;

    return (
        <PageFrame
            title="Certificates"
            subtitle={isLoading ? undefined : count === 0 ? 'Earned when you complete a course' : `${count} earned`}
        >
            {isLoading && (
                <div className="flex justify-center py-12">
                    <Spinner />
                </div>
            )}

            {isError && <Alert variant="error" message="Could not load your certificates. Refresh to try again." />}

            {!isLoading && !isError && count === 0 && (
                <EmptyState
                    icon={Award}
                    title="No certificates yet"
                    description="Finish every module of a course and its certificate appears here automatically."
                />
            )}

            {count > 0 && (
                <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {certificates!.map((certificate) => (
                        <li
                            key={certificate.id}
                            className="flex flex-col overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm"
                        >
                            <div className="flex items-start gap-3 border-b border-surface-100 bg-blue-50 px-5 py-4">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-0 text-blue-600 shadow-sm">
                                    <Award className="size-5" aria-hidden="true" />
                                </span>
                                <div className="min-w-0">
                                    <p className="text-xs font-medium uppercase tracking-widest text-blue-700">Certificate of completion</p>
                                    <h2 className="mt-0.5 text-base font-semibold text-ink-900">{certificate.course.title}</h2>
                                </div>
                            </div>

                            <dl className="grid flex-1 grid-cols-2 gap-3 px-5 py-4 text-sm">
                                <div>
                                    <dt className="text-xs text-ink-600">Issued</dt>
                                    <dd className="font-medium text-ink-900">{formatDate(certificate.issued_at)}</dd>
                                </div>
                                <div className="min-w-0">
                                    <dt className="text-xs text-ink-600">Certificate no.</dt>
                                    <dd className="truncate font-medium text-ink-900">{certificate.certificate_number}</dd>
                                </div>
                            </dl>

                            <div className="flex items-center justify-between gap-2 border-t border-surface-100 bg-surface-50 px-5 py-3">
                                <Link
                                    to={`/?verify=${encodeURIComponent(certificate.certificate_number)}`}
                                    className="inline-flex items-center gap-1.5 text-sm text-ink-600 hover:text-blue-600"
                                >
                                    <ShieldCheck className="size-4" aria-hidden="true" />
                                    Verify
                                </Link>
                                {/* rel="noopener" only — the download route needs the session cookie, which
                                    "noreferrer" would strip (see the same link on My courses). */}
                                <a
                                    href={certificateDownloadUrl(certificate.id)}
                                    target="_blank"
                                    rel="noopener"
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
                                >
                                    <Download className="size-4" aria-hidden="true" />
                                    Download PDF
                                </a>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </PageFrame>
    );
}
