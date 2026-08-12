import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useEnrol } from '@/features/enrolment/useEnrolments';
import { ApiError } from '@/lib/api/client';
import type { Course } from '@/lib/api/types';

/**
 * Advisory policy doesn't need admin review — "I'm Ready" calls the same `useEnrol()` endpoint
 * Open courses use directly. This modal is just a confirm-and-go detour, not a new backend flow.
 */
export function AdvisoryEnrolModal({
    course,
    onClose,
    onEnrolled,
    sectionId,
}: {
    course: Course;
    onClose: () => void;
    onEnrolled: () => void;
    sectionId?: number;
}) {
    const navigate = useNavigate();
    const enrol = useEnrol();
    const [attested, setAttested] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const canEnrol = !course.advisory_require_attestation || attested;

    const handleEnrol = async () => {
        setError(null);
        try {
            await enrol.mutateAsync({ courseId: course.id, sectionId });
            onEnrolled();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Could not enrol. Try again.');
        }
    };

    return (
        <Modal isOpen onClose={onClose} title="Before you enrol">
            <div className="flex flex-col gap-4">
                {error && <Alert variant="error" message={error} />}

                <div className="rounded-md bg-amber-100 p-4 text-sm text-ink-900">
                    <p className="font-medium">Recommended before you start</p>
                    <p className="mt-1">
                        {course.prerequisites_text ?? 'This course assumes some prior experience with the basics.'}
                    </p>
                </div>

                {course.advisory_require_attestation && (
                    <label className="flex items-start gap-2 text-sm text-ink-900">
                        <input
                            type="checkbox"
                            checked={attested}
                            onChange={(e) => setAttested(e.target.checked)}
                            className="mt-0.5"
                        />
                        I confirm I meet the prerequisites above.
                    </label>
                )}

                <div className="flex flex-col gap-2 sm:flex-row">
                    <Button onClick={handleEnrol} isLoading={enrol.isPending} disabled={!canEnrol} className="flex-1 justify-center">
                        I&apos;m Ready, Enrol Now
                    </Button>
                    <Button
                        variant="secondary"
                        className="flex-1 justify-center"
                        onClick={() => navigate('/#courses')}
                    >
                        Browse Beginner Courses
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
