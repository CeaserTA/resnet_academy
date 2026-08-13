import { Button } from '@/components/ui/Button';
import { Pencil, Trash2 } from 'lucide-react';
import { SectionStatusBadge } from './SectionStatusBadge';
import type { CourseSection } from './types';

interface SectionRowProps {
    section: CourseSection;
    onEdit: () => void;
    onDelete: () => void;
}

export function SectionRow({ section, onEdit, onDelete }: SectionRowProps) {
    const hasHistory = (section.enrolled_count ?? 0) > 0 || (section.waitlisted_count ?? 0) > 0 || (section.applications_pending_count ?? 0) > 0;

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const capacityDisplay = () => {
        if (section.capacity === null || section.capacity === undefined) {
            return `${section.seats_taken} / Unlimited`;
        }

        if ((section.waitlisted_count ?? 0) > 0) {
            return `${section.seats_taken} / ${section.capacity} (${section.waitlisted_count} waitlisted)`;
        }

        return `${section.seats_taken} / ${section.capacity}`;
    };

    return (
        <tr className="border-b border-surface-100 hover:bg-surface-50">
            <td className="px-4 py-3 text-sm text-ink-900">{section.name}</td>
            <td className="px-4 py-3">
                <SectionStatusBadge status={section.status} />
            </td>
            <td className="px-4 py-3 text-sm text-ink-700">
                {formatDate(section.start_date)} - {formatDate(section.end_date)}
            </td>
            <td className="px-4 py-3 text-sm text-ink-700">{capacityDisplay()}</td>
            <td className="px-4 py-3 text-sm text-ink-700">
                {(section.applications_pending_count ?? 0) > 0 ? `${section.applications_pending_count} pending` : '—'}
            </td>
            <td className="px-4 py-3 text-sm text-ink-700">{section.primary_instructor?.name || '—'}</td>
            <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" className="px-2 py-1" onClick={onEdit} aria-label={`Edit ${section.name}`}>
                        <Pencil className="size-4" aria-hidden="true" />
                    </Button>
                    <Button
                        variant="ghost"
                        className="px-2 py-1"
                        onClick={onDelete}
                        disabled={hasHistory}
                        aria-label={
                            hasHistory
                                ? `Cannot delete ${section.name} - section has history`
                                : `Delete ${section.name}`
                        }
                        title={
                            hasHistory
                                ? "Cannot delete section with enrollment/application history. Mark as 'Closed' instead."
                                : undefined
                        }
                    >
                        <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                </div>
            </td>
        </tr>
    );
}
