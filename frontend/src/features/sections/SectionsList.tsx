import { SectionRow } from './SectionRow';
import type { CourseSection } from './types';

interface SectionsListProps {
    sections: CourseSection[];
    onEdit: (section: CourseSection) => void;
    onDelete: (section: CourseSection) => void;
}

export function SectionsList({ sections, onEdit, onDelete }: SectionsListProps) {
    return (
        <div className="overflow-x-auto rounded-lg border border-surface-100">
            <table className="w-full text-sm">
                <thead className="bg-surface-100 text-left">
                    <tr>
                        <th className="px-4 py-2 font-medium text-ink-600">Name</th>
                        <th className="px-4 py-2 font-medium text-ink-600">Status</th>
                        <th className="px-4 py-2 font-medium text-ink-600">Dates</th>
                        <th className="px-4 py-2 font-medium text-ink-600">Capacity</th>
                        <th className="px-4 py-2 font-medium text-ink-600">Applications</th>
                        <th className="px-4 py-2 font-medium text-ink-600">Instructor</th>
                        <th className="px-4 py-2 text-right font-medium text-ink-600">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {sections.map((section) => (
                        <SectionRow key={section.id} section={section} onEdit={() => onEdit(section)} onDelete={() => onDelete(section)} />
                    ))}
                </tbody>
            </table>
        </div>
    );
}
