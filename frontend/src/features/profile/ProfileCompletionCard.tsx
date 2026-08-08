import { Link } from 'react-router';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';

interface ProfileCompletionCardProps {
    percentage: number;
    missingFields: string[];
    completedFields: string[];
}

/**
 * Dashboard widget showing profile completion status.
 * Only renders when profile is incomplete (percentage < 100).
 * Displays progress bar, checklist of required fields, and "Complete Profile" CTA button.
 *
 * **Validates Requirements: 3.1, 3.2, 3.3, 3.4, 3.6**
 */
export function ProfileCompletionCard({ percentage, missingFields, completedFields }: ProfileCompletionCardProps) {
    // Requirement 3.1: Only render when percentage < 100
    if (percentage >= 100) {
        return null;
    }

    // Combine and sort fields for checklist display
    const allFields = [
        ...completedFields.map((field) => ({ name: field, completed: true })),
        ...missingFields.map((field) => ({ name: field, completed: false })),
    ].sort((a, b) => a.name.localeCompare(b.name));

    return (
        <Card className="border-l-4 border-l-blue-600 bg-blue-50/50">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                        <AlertCircle className="size-6" aria-hidden="true" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-lg font-semibold text-ink-900">Complete your profile</h2>
                        <p className="mt-1 text-sm text-ink-600">
                            Fill in the required information to apply for courses
                        </p>
                    </div>
                </div>

                {/* Requirement 3.4: "Complete Profile" button navigating to /profile/complete */}
                <Link to="/profile/complete">
                    <Button>Complete Profile</Button>
                </Link>
            </div>

            {/* Requirement 3.2: Display the Profile_Completion_Percentage as a numeric value */}
            <div className="mt-4">
                <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-ink-900">Profile completion</span>
                    <span className="font-mono text-ink-600">{percentage}%</span>
                </div>
                <ProgressBar percent={percentage} className="mt-2" />
            </div>

            {/* Requirement 3.3: Display checklist showing completed/missing fields */}
            <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-ink-900">Required fields</p>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {allFields.map((field) => (
                        <div key={field.name} className="flex items-center gap-2 text-sm">
                            {field.completed ? (
                                <CheckCircle2 className="size-4 shrink-0 text-success-600" aria-hidden="true" />
                            ) : (
                                <XCircle className="size-4 shrink-0 text-ink-400" aria-hidden="true" />
                            )}
                            <span className={field.completed ? 'text-ink-900' : 'text-ink-600'}>
                                {formatFieldName(field.name)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    );
}

/**
 * Convert field names from snake_case or camelCase to human-readable format
 * e.g., "phone" → "Phone", "highest_qualification" → "Highest Qualification"
 */
function formatFieldName(fieldName: string): string {
    return fieldName
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}
