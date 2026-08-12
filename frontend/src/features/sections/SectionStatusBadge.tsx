import { Badge } from '@/components/ui/Badge';
import { CourseSectionStatus } from './types';

interface SectionStatusBadgeProps {
    status: CourseSectionStatus;
}

const statusConfig = {
    [CourseSectionStatus.Draft]: { label: 'Draft', tone: 'neutral' as const },
    [CourseSectionStatus.Open]: { label: 'Open', tone: 'success' as const },
    [CourseSectionStatus.InProgress]: { label: 'In Progress', tone: 'progress' as const },
    [CourseSectionStatus.Completed]: { label: 'Completed', tone: 'info' as const },
    [CourseSectionStatus.Closed]: { label: 'Closed', tone: 'warning' as const },
};

export function SectionStatusBadge({ status }: SectionStatusBadgeProps) {
    const config = statusConfig[status];
    return <Badge label={config.label} tone={config.tone} />;
}
