import { useMemo, useState } from 'react';
import { Download, Search, Users } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
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
        if (!term) {
            return roster;
        }
        return roster.filter(
            (row) => row.student.name.toLowerCase().includes(term) || row.student.email.toLowerCase().includes(term),
        );
    }, [roster, filter]);

    return (
        <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg text-ink-900">Student Enrollment</h2>

                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-600" aria-hidden="true" />
                        <input
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            placeholder="Filter students…"
                            className="rounded-md border border-surface-100 bg-surface-0 py-1.5 pl-8 pr-3 text-sm text-ink-900"
                        />
                    </div>
                    <Button variant="secondary" onClick={() => downloadCsv(filtered)} disabled={filtered.length === 0}>
                        <Download className="size-4" aria-hidden="true" />
                        Export CSV
                    </Button>
                </div>
            </div>

            {filtered.length === 0 ? (
                <EmptyState icon={Users} title="No students" description="Nothing matches this filter." className="mt-4" />
            ) : (
                <div className="mt-4 overflow-x-auto rounded-lg border border-surface-100">
                    <table className="w-full text-sm">
                        <thead className="bg-surface-100 text-left">
                            <tr>
                                <th className="px-4 py-2 font-medium text-ink-600">Student Details</th>
                                <th className="px-4 py-2 font-medium text-ink-600">Enrollment Date</th>
                                <th className="px-4 py-2 font-medium text-ink-600">Progress</th>
                                <th className="px-4 py-2 font-medium text-ink-600">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((row, index) => (
                                <tr key={row.student.id} className={index % 2 === 1 ? 'bg-surface-50' : undefined}>
                                    <td className="px-4 py-3">
                                        <p className="font-medium text-ink-900">{row.student.name}</p>
                                        <p className="text-xs text-ink-600">{row.student.email}</p>
                                    </td>
                                    <td className="px-4 py-3 text-ink-600">{new Date(row.enrolled_at).toLocaleDateString()}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <ProgressBar percent={row.percent_complete} className="w-24" />
                                            <span className="font-mono text-xs text-ink-600">{row.percent_complete}%</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {row.status === 'graduated' ? (
                                            <Badge label="Graduated" tone="progress" />
                                        ) : (
                                            <Badge label="Active" tone="success" />
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Card>
    );
}
