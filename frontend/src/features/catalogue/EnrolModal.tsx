import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, ExternalLink, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Alert } from '@/components/ui/Alert';
import { submitCourseApplication } from '@/features/courseApplications/api';
import { useAuth } from '@/lib/auth/AuthContext';
import type { Course } from '@/lib/api/types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface EnrolModalProps {
    course: Course;
    onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EnrolModal({ course, onClose }: EnrolModalProps) {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Form state
    const [answers, setAnswers] = useState<string[]>(
        (course.application_questions ?? []).map(() => ''),
    );
    const [portfolioUrl, setPortfolioUrl] = useState('');
    const [attestation, setAttestation] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const mutation = useMutation({
        mutationFn: () =>
            submitCourseApplication({
                course_id: course.id,
                ...(course.application_questions?.length
                    ? { answers }
                    : {}),
                ...(course.application_require_portfolio_url && portfolioUrl
                    ? { portfolio_url: portfolioUrl }
                    : {}),
            }),
        onSuccess: () => setSubmitted(true),
    });

    // If the user isn't logged in, prompt them to sign up first
    if (!user) {
        return (
            <Overlay onClose={onClose}>
                <ModalShell title="Enrol in this course" onClose={onClose}>
                    <div className="space-y-4 text-center">
                        <p className="text-sm text-[#475569]">
                            You need a free ResNet Academy account to enrol.
                        </p>
                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                            <Button variant="primary" onClick={() => { onClose(); navigate('/register'); }}>
                                Create free account
                            </Button>
                            <Button variant="outline" onClick={() => { onClose(); navigate('/login'); }}>
                                Log in
                            </Button>
                        </div>
                    </div>
                </ModalShell>
            </Overlay>
        );
    }

    // ── Success state ────────────────────────────────────────────────────────
    if (submitted) {
        return (
            <Overlay onClose={onClose}>
                <ModalShell title="Application submitted!" onClose={onClose}>
                    <div className="space-y-4 text-center">
                        <CheckCircle2 className="mx-auto size-12 text-emerald-500" aria-hidden="true" />
                        <p className="text-sm leading-6 text-[#475569]">
                            Your application for <span className="font-semibold text-ink-900">{course.title}</span> has
                            been received. The ResNet team will review it and get back to you.
                        </p>
                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                            <Button variant="primary" onClick={onClose}>
                                Done
                            </Button>
                            <Button variant="outline" asChild>
                                <a href="/dashboard">View my applications</a>
                            </Button>
                        </div>
                    </div>
                </ModalShell>
            </Overlay>
        );
    }

    const isApplication = course.enrolment_policy === 'application';
    const isAdvisory = course.enrolment_policy === 'advisory';
    const questions = course.application_questions ?? [];

    const canSubmit =
        (!isAdvisory || !course.advisory_require_attestation || attestation) &&
        (!isApplication || questions.every((_, i) => answers[i]?.trim().length > 0));

    return (
        <Overlay onClose={onClose}>
            <ModalShell
                title={isApplication ? 'Apply for this course' : 'Confirm enrolment'}
                onClose={onClose}
            >
                {/* Course summary */}
                <div className="mb-5 flex items-start gap-3 rounded-xl border border-[#e8ecf1] bg-[#f8fafc] p-4">
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-ink-900">{course.title}</p>
                        {course.category && (
                            <p className="mt-0.5 text-xs text-[#94a3b8]">{course.category.name}</p>
                        )}
                    </div>
                    <span className="shrink-0 rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-medium text-white capitalize">
                        {course.enrolment_policy}
                    </span>
                </div>

                {/* Error */}
                {mutation.isError && (
                    <Alert
                        variant="error"
                        message="Something went wrong submitting your application. Please try again."
                        className="mb-4"
                    />
                )}

                <form
                    onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
                    className="space-y-5"
                >
                    {/* Open policy — just a confirm message */}
                    {course.enrolment_policy === 'open' && (
                        <p className="text-sm text-[#475569]">
                            This course is open to everyone. Click below to confirm your enrolment.
                        </p>
                    )}

                    {/* Advisory — optional attestation */}
                    {isAdvisory && course.advisory_require_attestation && (
                        <label className="flex items-start gap-3 text-sm text-[#475569]">
                            <input
                                type="checkbox"
                                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600"
                                checked={attestation}
                                onChange={(e) => setAttestation(e.target.checked)}
                                required
                            />
                            <span>
                                I confirm that I meet the prerequisites for this course
                                {course.prerequisites_text && (
                                    <span className="ml-1 text-[#94a3b8]">({course.prerequisites_text})</span>
                                )}
                            </span>
                        </label>
                    )}

                    {/* Application questions */}
                    {isApplication && questions.length > 0 && (
                        <div className="space-y-4">
                            {questions.map((q, i) => (
                                <Textarea
                                    key={i}
                                    label={q}
                                    rows={3}
                                    value={answers[i]}
                                    onChange={(e) => {
                                        const next = [...answers];
                                        next[i] = e.target.value;
                                        setAnswers(next);
                                    }}
                                    required
                                />
                            ))}
                        </div>
                    )}

                    {/* Portfolio URL */}
                    {isApplication && course.application_require_portfolio_url && (
                        <Input
                            label="Portfolio / project URL"
                            type="url"
                            placeholder="https://github.com/yourname"
                            value={portfolioUrl}
                            onChange={(e) => setPortfolioUrl(e.target.value)}
                            required
                        />
                    )}

                    {/* Alternative proof */}
                    {isApplication && course.application_allow_alternative_proof && !course.application_require_portfolio_url && (
                        <div className="flex items-center gap-1.5 text-xs text-[#94a3b8]">
                            <ExternalLink className="size-3.5" aria-hidden="true" />
                            No portfolio? Describe your experience in your answers above.
                        </div>
                    )}

                    {/* Submit */}
                    <div className="flex flex-col gap-3 pt-2 sm:flex-row-reverse">
                        <Button
                            type="submit"
                            variant="primary"
                            className="sm:flex-1"
                            disabled={!canSubmit || mutation.isPending}
                        >
                            {mutation.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                            {isApplication ? 'Submit application' : 'Confirm enrolment'}
                        </Button>
                        <Button type="button" variant="outline" onClick={onClose} className="sm:flex-1">
                            Cancel
                        </Button>
                    </div>
                </form>
            </ModalShell>
        </Overlay>
    );
}

// ─── Layout helpers ───────────────────────────────────────────────────────────

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            role="dialog"
            aria-modal="true"
        >
            {children}
        </div>
    );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div className="w-full max-w-lg rounded-2xl border border-[#e8ecf1] bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#e8ecf1] px-6 py-4">
                <h2 className="text-base font-semibold text-ink-900">{title}</h2>
                <button
                    onClick={onClose}
                    className="rounded-md p-1 text-[#94a3b8] hover:bg-[#f8fafc] hover:text-ink-900 transition"
                    aria-label="Close"
                >
                    <X className="size-5" aria-hidden="true" />
                </button>
            </div>
            {/* Body */}
            <div className="px-6 py-5">{children}</div>
        </div>
    );
}
