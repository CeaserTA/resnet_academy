import { useMemo, useState } from 'react';
import { Download, Search, Users } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import type { RosterEntry } from '@/lib/api/types';

function downloadCsv(rows: RosterEntry[]): void {
    const header = ['Name', 'Email', 'Enrollment Date', 'Progress %', 'Status'];
    const lines = rows.map((row) =>
        [row.student.name, row.student.email, row.enrolled_at, row.percent_complete, row.status]
            .map((value) => `"${String(value).replaceAll('"', '""')}"`)
            .join(','),
    );
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'enrollment.csv';
    link.click();
    URL.revokeObjectURL(url);
}

export function EnrollmentTable({ roster }: { roster: RosterEntry[] }) {
    const [filter, setFilter] = useState('');

    const filtered = useMemo(() => {
        const term = filter.trim().toLowerCase();
        if (!term) return roster;
        return roster.filter(
            (row) =>
                row.student.name.toLowerCase().includes(term) ||
                row.student.email.toLowerCase().includes(term),
        );
    }, [roster, filter]);

    return (
        <div className="overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-100 bg-surface-50 px-4 py-3">
                <div>
                    <h2 className="text-sm font-semibold text-ink-900">Student enrollment</h2>
                    <p className="text-xs text-ink-400">{roster.length} student{roster.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-400" aria-hidden="true" />
                        <input
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            placeholder="Filter students…"
                            className="rounded-lg border border-surface-100 bg-surface-0 py-1.5 pl-8 pr-3 text-sm text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
                        />
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => downloadCsv(filtered)} disabled={filtered.length === 0}>
                        <Download className="size-3.5" aria-hidden="true" />
                        Export CSV
                    </Button>
                </div>
            </div>

            {filtered.length === 0 ? (
                <EmptyState icon={Users} title="No students" description="Nothing matches this filter." className="py-8" />
            ) : (
                <>
                    {/* Column headers */}
                    <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 border-b border-surface-100 bg-surface-50 px-4 py-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-ink-600">Student</span>
                        <span className="text-xs font-medium uppercase tracking-wide text-ink-600">Enrolled</span>
                        <span className="text-xs font-medium uppercase tracking-wide text-ink-600">Progress</span>
                        <span className="text-xs font-medium uppercase tracking-wide text-ink-600">Status</span>
                    </div>
                    <ul className="divide-y divide-surface-100">
                        {filtered.map((row) => (
                            <li key={row.student.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-4 py-3 hover:bg-surface-50">
                                {/* Student */}
                                <div className="flex min-w-0 items-center gap-2.5">
                                    <Avatar name={row.student.name} size="sm" className="size-7 shrink-0 text-xs" />
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-ink-900">{row.student.name}</p>
                                        <p className="truncate text-xs text-ink-400">{row.student.email}</p>
                                    </div>
                                </div>
                                {/* Enrolled date */}
                                <span className="shrink-0 text-xs text-ink-600">
                                    {new Date(row.enrolled_at).toLocaleDateString()}
                                </span>
                                {/* Progress */}
                                <div className="flex items-center gap-2">
                                    <ProgressBar percent={row.percent_complete} className="w-20" />
                                    <span className="w-8 text-right font-mono text-xs text-ink-600">
                                        {row.percent_complete}%
                                    </span>
                                </div>
                                {/* Status */}
                                {row.status === 'graduated' ? (
                                    <Badge label="Graduated" tone="progress" />
                                ) : (
                                    <Badge label="Active" tone="success" />
                                )}
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
}
