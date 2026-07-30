import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { BookOpen, CircleCheck, Clock, Lock } from 'lucide-react';
import { useCourse } from '@/features/catalogue/useCourses';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useAuth } from '@/lib/auth/AuthContext';
import { useEnrol } from '@/features/enrolment/useEnrolments';
import { useMyCourseApplications } from '@/features/courseApplications/useCourseApplications';
import { AdvisoryEnrolModal } from '@/features/catalogue/AdvisoryEnrolModal';
import { ApplicationModal } from '@/features/catalogue/ApplicationModal';
import { ApiError } from '@/lib/api/client';

const levelLabel: Record<string, string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
};

function formatPrice(price: string, currency: string): string {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(
        Number(price),
    );
}

export function CourseDetailPage() {
    const { id } = useParams();
    const courseId = Number(id);
    const { data: course, isLoading } = useCourse(courseId);
    const { user } = useAuth();
    const navigate = useNavigate();
    const enrol = useEnrol();
    const { data: myApplications } = useMyCourseApplications(user?.role === 'student');
    const [enrolError, setEnrolError] = useState<string | null>(null);
    const [enrolled, setEnrolled] = useState(false);
    const [showAdvisoryModal, setShowAdvisoryModal] = useState(false);
    const [showApplicationModal, setShowApplicationModal] = useState(false);

    if (isLoading) {
        return <Spinner />;
    }

    if (!course) {
        return <p className="mx-auto max-w-3xl px-4 py-16 text-center text-ink-600">Course not found.</p>;
    }

    const pendingApplication = myApplications?.find(
        (application) => application.course.id === course.id && application.status === 'pending',
    );

    const handleEnrol = async () => {
        if (!user) {
            navigate('/login', { state: { from: { pathname: `/courses/${course.id}` } } });
            return;
        }

        if (course.enrolment_policy === 'advisory') {
            setShowAdvisoryModal(true);
            return;
        }

        if (course.enrolment_policy === 'application') {
            setShowApplicationModal(true);
            return;
        }

        setEnrolError(null);

        try {
            await enrol.mutateAsync(course.id);
            setEnrolled(true);
        } catch (error) {
            setEnrolError(error instanceof ApiError ? error.message : 'Could not enrol. Try again.');
        }
    };

    return (
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
            <div className="flex aspect-video items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                {course.thumbnail_url ? (
                    <img src={course.thumbnail_url} alt="" className="size-full rounded-lg object-cover" />
                ) : (
                    <BookOpen className="size-12" aria-hidden="true" />
                )}
            </div>

            <div className="mt-6 flex items-center gap-2">
                <Badge label={levelLabel[course.level]} tone="progress" />
                {course.category && <span className="text-sm text-ink-600">{course.category.name}</span>}
            </div>

            <h1 className="mt-2 text-3xl">{course.title}</h1>

            {course.instructors.length > 0 && (
                <p className="mt-2 text-ink-600">Taught by {course.instructors.map((i) => i.name).join(', ')}</p>
            )}

            {course.description && <p className="mt-6 whitespace-pre-line text-ink-900">{course.description}</p>}

            {course.prerequisites_text && (
                <div className="mt-6 rounded-md bg-amber-100 p-4 text-sm text-ink-900">
                    <p className="font-medium">Recommended before you start</p>
                    <p className="mt-1">{course.prerequisites_text}</p>
                </div>
            )}

            <div className="mt-8 flex items-center justify-between rounded-lg border border-surface-100 bg-surface-0 p-5">
                <div>
                    <p className="text-sm text-ink-600">Price</p>
                    <p className="font-mono text-2xl font-medium text-ink-900">
                        {formatPrice(course.price, course.currency)}
                    </p>
                </div>

                {enrolled ? (
                    <Badge label="Enrolled" tone="success" icon={CircleCheck} />
                ) : pendingApplication ? (
                    <Badge label="Pending approval" tone="warning" icon={Clock} />
                ) : user?.role === 'student' || !user ? (
                    <Button onClick={handleEnrol} isLoading={enrol.isPending}>
                        {course.enrolment_policy === 'application' ? 'Apply to enrol' : 'Enrol now'}
                    </Button>
                ) : (
                    <Badge label="Students only" tone="neutral" icon={Lock} />
                )}
            </div>

            {!enrolled && !pendingApplication && (user?.role === 'student' || !user) && (
                <>
                    {course.enrolment_policy === 'advisory' && (
                        <p className="mt-2 text-sm text-ink-600">
                            You&apos;ll be asked to confirm you meet the prerequisites before you&apos;re enrolled.
                        </p>
                    )}
                    {course.enrolment_policy === 'application' && (
                        <p className="mt-2 text-sm text-ink-600">
                            Requires an admin to review and approve your application before you&apos;re enrolled.
                        </p>
                    )}
                </>
            )}

            {enrolError && <Alert variant="error" message={enrolError} className="mt-4" />}

            {showAdvisoryModal && (
                <AdvisoryEnrolModal
                    course={course}
                    onClose={() => setShowAdvisoryModal(false)}
                    onEnrolled={() => {
                        setShowAdvisoryModal(false);
                        setEnrolled(true);
                    }}
                />
            )}

            {showApplicationModal && (
                <ApplicationModal
                    course={course}
                    onClose={() => setShowApplicationModal(false)}
                    onSubmitted={() => setShowApplicationModal(false)}
                />
            )}
        </div>
    );
}
