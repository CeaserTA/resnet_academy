import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router';
import {
    ArrowLeft,
    ChevronDown,
    ChevronRight,
    ClipboardList,
    FileCheck2,
    ListChecks,
    Search,
    CheckCircle2,
    XCircle,
    Minus,
} from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useGradebook } from '@/features/assessment/useAssessment';
import { useCourse } from '@/features/catalogue/useCourses';
import { cn } from '@/lib/utils';
import type { GradebookRow } from '@/lib/api/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function gradeColour(pct: number | null): string {
    if (pct === null) return 'text-ink-400';
    if (pct >= 80) return 'text-emerald-600';
    if (pct >= 60) return 'text-amber-600';
    return 'text-red-600';
}

function gradeBg(pct: number | null): string {
    if (pct === null) return 'bg-surface-100 text-ink-500';
    if (pct >= 80) return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    if (pct >= 60) return 'bg-amber-50 text-amber-700 border border-amber-200';
    return 'bg-red-50 text-red-700 border border-red-200';
}

function ScoreBar({ score, max }: { score: number | null; max: number }) {
    const pct = score !== null ? Math.min((score / max) * 100, 100) : 0;
    return (
        <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-100">
                <div
                    className={cn(
                        'h-full rounded-full transition-all',
                        score === null ? 'w-0' : pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500',
                    )}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className={cn('w-16 text-right text-xs font-mono', gradeColour(score !== null ? pct : null))}>
                {score !== null ? `${score} / ${max}` : '—'}
            </span>
        </div>
    );
}

// ─── Student drill-down panel ─────────────────────────────────────────────────

function StudentDetailPanel({ row }: { row: GradebookRow }) {
    const submitted = row.assignment_scores.filter((s) => s.final_score !== null).length;
    const passed = row.evaluation_scores.filter((s) => s.passed).length;

    return (
        <div className="grid grid-cols-1 gap-4 px-6 pb-5 pt-3 sm:grid-cols-2">

            {/* Assignments */}
            <div className="rounded-xl border border-violet-100 bg-violet-50/50">
                <div className="flex items-center gap-2 border-b border-violet-100 px-4 py-2.5">
                    <FileCheck2 className="size-3.5 text-violet-500" aria-hidden="true" />
                    <span className="text-xs font-semibold text-violet-800">
                        Assignments
                    </span>
                    <span className="ml-auto text-xs text-violet-500">
                        {submitted} / {row.assignment_scores.length} graded
                    </span>
                </div>
                <div className="flex flex-col divide-y divide-violet-100">
                    {row.assignment_scores.length === 0 && (
                        <p className="px-4 py-3 text-xs text-ink-400">No assignments in this course.</p>
                    )}
                    {row.assignment_scores.map((score) => (
                        <div key={score.assignment_id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                            <div className="min-w-0">
                                <p className="truncate text-xs font-medium text-ink-800">{score.title}</p>
                                <p className="text-[10px] text-ink-400">max {score.max_score}</p>
                            </div>
                            <ScoreBar score={score.final_score} max={score.max_score} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Evaluations */}
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50">
                <div className="flex items-center gap-2 border-b border-emerald-100 px-4 py-2.5">
                    <ListChecks className="size-3.5 text-emerald-500" aria-hidden="true" />
                    <span className="text-xs font-semibold text-emerald-800">
                        Evaluations
                    </span>
                    <span className="ml-auto text-xs text-emerald-500">
                        {passed} / {row.evaluation_scores.length} passed
                    </span>
                </div>
                <div className="flex flex-col divide-y divide-emerald-100">
                    {row.evaluation_scores.length === 0 && (
                        <p className="px-4 py-3 text-xs text-ink-400">No evaluations in this course.</p>
                    )}
                    {row.evaluation_scores.map((score) => (
                        <div key={score.evaluation_id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                            <div className="min-w-0 flex items-center gap-1.5">
                                {score.best_score_percent === null ? (
                                    <Minus className="size-3 shrink-0 text-ink-300" aria-hidden="true" />
                                ) : score.passed ? (
                                    <CheckCircle2 className="size-3 shrink-0 text-emerald-500" aria-hidden="true" />
                                ) : (
                                    <XCircle className="size-3 shrink-0 text-red-400" aria-hidden="true" />
                                )}
                                <p className="truncate text-xs font-medium text-ink-800">{score.title}</p>
                            </div>
                            <span className={cn('shrink-0 text-xs font-mono', gradeColour(score.best_score_percent))}>
                                {score.best_score_percent !== null ? `${score.best_score_percent}%` : '—'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function GradebookPage() {
    const { id } = useParams();
    const courseId = Number(id);

    const { data: course } = useCourse(courseId);
    const { data: gradebook, isLoading } = useGradebook(courseId);

    const [search, setSearch] = useState('');
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const filtered = useMemo(() => {
        if (!gradebook) return [];
        const q = search.trim().toLowerCase();
        if (!q) return gradebook.students;
        return gradebook.students.filter(
            (r) =>
                r.student.name.toLowerCase().includes(q) ||
                r.student.email.toLowerCase().includes(q),
        );
    }, [gradebook, search]);

    const toggleRow = (studentId: number) =>
        setExpandedId((prev) => (prev === studentId ? null : studentId));

    if (isLoading) return <Spinner />;

    if (!gradebook || gradebook.students.length === 0) {
        return (
            <EmptyState
                icon={ClipboardList}
                title="No confirmed students yet"
                description="The gradebook fills in once students are enrolled and confirmed."
            />
        );
    }

    const totalAssignments = gradebook.assignments.length;
    const totalEvaluations = gradebook.evaluations.length;

    return (
        <div className="mx-auto max-w-5xl space-y-5">

            {/* ── Header ── */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Link
                        to={`/admin/courses/${courseId}/modules`}
                        className="flex items-center gap-1 text-sm text-ink-400 hover:text-blue-600"
                    >
                        <ArrowLeft className="size-3.5" aria-hidden="true" />
                        Modules
                    </Link>
                    <span className="text-ink-300" aria-hidden="true">/</span>
                    <h1 className="text-base font-semibold text-ink-900">
                        {course?.title ?? '…'} — Gradebook
                    </h1>
                </div>

                {/* Summary pills */}
                <div className="flex items-center gap-2 text-xs">
                    <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 font-medium text-violet-700">
                        {totalAssignments} assignment{totalAssignments !== 1 ? 's' : ''}
                    </span>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">
                        {totalEvaluations} evaluation{totalEvaluations !== 1 ? 's' : ''}
                    </span>
                    <span className="rounded-full border border-surface-200 bg-surface-50 px-2.5 py-1 font-medium text-ink-600">
                        {gradebook.students.length} student{gradebook.students.length !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>

            {/* ── Search ── */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-400" aria-hidden="true" />
                <input
                    type="search"
                    placeholder="Search students by name or email…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-lg border border-surface-200 bg-surface-0 py-2 pl-9 pr-4 text-sm text-ink-900 placeholder:text-ink-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
            </div>

            {/* ── Table ── */}
            <div className="overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm">

                {/* Column header */}
                <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-0 border-b border-surface-100 bg-surface-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
                    <span>Student</span>
                    <span className="w-28 text-center">Assignments</span>
                    <span className="w-28 text-center">Evaluations</span>
                    <span className="w-28 text-right">Final grade</span>
                    <span className="w-8" />
                </div>

                {filtered.length === 0 && (
                    <p className="py-8 text-center text-sm text-ink-400">No students match your search.</p>
                )}

                {filtered.map((row) => {
                    const isExpanded = expandedId === row.student.id;
                    const gradedCount = row.assignment_scores.filter((s) => s.final_score !== null).length;
                    const passedCount = row.evaluation_scores.filter((s) => s.passed).length;
                    const grade = row.final_grade_percent;

                    return (
                        <div key={row.student.id} className="border-b border-surface-100 last:border-0">

                            {/* Summary row — clickable */}
                            <button
                                type="button"
                                onClick={() => toggleRow(row.student.id)}
                                className="grid w-full grid-cols-[1fr_auto_auto_auto_auto] items-center gap-0 px-4 py-3 text-left transition hover:bg-surface-50"
                                aria-expanded={isExpanded}
                            >
                                {/* Student name + email */}
                                <span className="min-w-0">
                                    <span className="block truncate text-sm font-medium text-ink-900">
                                        {row.student.name}
                                    </span>
                                    <span className="block truncate text-xs text-ink-400">
                                        {row.student.email}
                                    </span>
                                </span>

                                {/* Assignments submitted */}
                                <span className="w-28 text-center">
                                    <span className={cn(
                                        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                                        gradedCount === totalAssignments && totalAssignments > 0
                                            ? 'bg-violet-50 text-violet-700'
                                            : 'bg-surface-100 text-ink-500',
                                    )}>
                                        <FileCheck2 className="size-3" aria-hidden="true" />
                                        {gradedCount}/{totalAssignments}
                                    </span>
                                </span>

                                {/* Evaluations passed */}
                                <span className="w-28 text-center">
                                    <span className={cn(
                                        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                                        passedCount === totalEvaluations && totalEvaluations > 0
                                            ? 'bg-emerald-50 text-emerald-700'
                                            : 'bg-surface-100 text-ink-500',
                                    )}>
                                        <ListChecks className="size-3" aria-hidden="true" />
                                        {passedCount}/{totalEvaluations}
                                    </span>
                                </span>

                                {/* Final grade badge */}
                                <span className="w-28 flex justify-end">
                                    <span className={cn(
                                        'rounded-full px-3 py-0.5 text-xs font-semibold font-mono',
                                        gradeBg(grade),
                                    )}>
                                        {grade !== null ? `${grade}%` : '—'}
                                    </span>
                                </span>

                                {/* Expand chevron */}
                                <span className="w-8 flex justify-end text-ink-400">
                                    {isExpanded
                                        ? <ChevronDown className="size-4" aria-hidden="true" />
                                        : <ChevronRight className="size-4" aria-hidden="true" />
                                    }
                                </span>
                            </button>

                            {/* Drill-down panel */}
                            {isExpanded && (
                                <div className="border-t border-surface-100 bg-surface-50">
                                    <StudentDetailPanel row={row} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Grade legend */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-ink-500">
                <span className="font-medium">Grade legend:</span>
                <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    ≥ 80% — Good
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    60–79% — Average
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                    &lt; 60% — Needs attention
                </span>
            </div>

        </div>
    );
}
