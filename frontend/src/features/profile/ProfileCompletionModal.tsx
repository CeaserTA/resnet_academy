import { Link } from 'react-router';
import { AlertCircle, ArrowRight, CheckCircle2, X, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { ProfileStatus } from '@/lib/api/profileApi';

function formatFieldName(fieldName: string): string {
    return fieldName
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

/**
 * Shared "Complete your profile" nudge modal. Originally lived in `MyCoursesPage`;
 * extracted so the course detail page can gate the application flow with the same UI
 * (`CourseDetailPage` opens it before the `ApplicationModal` when the profile is incomplete).
 */
export function ProfileCompletionModal({
    profileStatus,
    onClose,
}: {
    profileStatus: ProfileStatus;
    onClose: () => void;
}) {
    const allFields = [
        ...profileStatus.completed.map((f) => ({ name: f, done: true })),
        ...profileStatus.missing.map((f) => ({ name: f, done: false })),
    ].sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Complete your profile"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Panel */}
            <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-surface-0 shadow-xl">
                {/* Header gradient strip */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <span className="flex size-10 items-center justify-center rounded-full bg-white/20">
                                <AlertCircle className="size-5 text-white" />
                            </span>
                            <div>
                                <h2 className="text-base font-semibold text-white">Complete your profile</h2>
                                <p className="text-xs text-blue-100">
                                    Required to apply for courses
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            aria-label="Close"
                            className="rounded-lg p-1.5 text-white/70 transition hover:bg-white/20 hover:text-white"
                        >
                            <X className="size-4" aria-hidden="true" />
                        </button>
                    </div>

                    {/* Progress */}
                    <div className="mt-4">
                        <div className="flex items-center justify-between text-xs text-blue-100">
                            <span>Profile completion</span>
                            <span className="font-mono font-medium text-white">{profileStatus.percentage}%</span>
                        </div>
                        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/20">
                            <div
                                className="h-full rounded-full bg-white transition-all duration-500"
                                style={{ width: `${profileStatus.percentage}%` }}
                                role="presentation"
                            />
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="px-6 py-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-600">Required fields</p>
                    <div className="mt-3 grid grid-cols-2 gap-1.5">
                        {allFields.map(({ name, done }) => (
                            <div key={name} className="flex items-center gap-2 text-sm">
                                {done ? (
                                    <CheckCircle2 className="size-3.5 shrink-0 text-success-600" aria-hidden="true" />
                                ) : (
                                    <XCircle className="size-3.5 shrink-0 text-ink-300" aria-hidden="true" />
                                )}
                                <span className={cn('truncate', done ? 'text-ink-900' : 'text-ink-500')}>
                                    {formatFieldName(name)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-surface-100 px-6 py-4">
                    <button
                        onClick={onClose}
                        className="text-sm text-ink-400 hover:text-ink-600"
                    >
                        Remind me later
                    </button>
                    <Link to="/profile/complete" onClick={onClose}>
                        <Button size="sm">
                            Complete profile
                            <ArrowRight className="size-3.5" aria-hidden="true" />
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
