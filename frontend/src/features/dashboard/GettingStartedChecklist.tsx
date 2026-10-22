import { Link } from 'react-router';
import { ArrowRight, CheckCircle2, Circle } from 'lucide-react';
import { DashboardPanel } from '@/components/dashboard/DashboardPanel';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { cn } from '@/lib/utils';

export interface ChecklistStep {
    label: string;
    /** Shown under the label, e.g. "60% done" or "Awaiting confirmation". */
    hint?: string;
    done: boolean;
    /** Where the step's button goes — a link, or a callback (e.g. opening the payment window). */
    action?: { label: string; to?: string; onClick?: () => void };
}

/**
 * New-student checklist: the journey from sign-up to first lesson, in order. Only the first
 * unfinished step gets a button, so there is always exactly one obvious next thing to do.
 * Renders nothing once every step is done.
 */
export function GettingStartedChecklist({ steps }: { steps: ChecklistStep[] }) {
    const doneCount = steps.filter((s) => s.done).length;
    if (doneCount === steps.length) return null;
    const currentIndex = steps.findIndex((s) => !s.done);

    return (
        <DashboardPanel
            title="Getting started"
            action={<span className="text-xs font-medium tabular-nums text-ink-600">{doneCount} of {steps.length} done</span>}
        >
            <ProgressBar percent={(doneCount / steps.length) * 100} className="h-1 rounded-none" />
            <ol className="divide-y divide-surface-100">
                {steps.map((step, i) => {
                    const current = i === currentIndex;
                    return (
                        <li key={step.label} className={cn('flex items-center gap-3 px-4 py-3', current && 'bg-blue-50/60')}>
                            {step.done ? (
                                <CheckCircle2 className="size-5 shrink-0 text-success-600" aria-hidden="true" />
                            ) : (
                                <Circle className={cn('size-5 shrink-0', current ? 'text-blue-600' : 'text-ink-300')} aria-hidden="true" />
                            )}
                            <div className="min-w-0 flex-1">
                                <p className={cn('text-sm font-medium', step.done ? 'text-ink-600 line-through' : 'text-ink-900')}>
                                    {step.label}
                                    <span className="sr-only">{step.done ? ' (done)' : ''}</span>
                                </p>
                                {step.hint && !step.done && <p className="text-xs text-ink-600">{step.hint}</p>}
                            </div>
                            {current && step.action && (
                                step.action.to ? (
                                    <Button size="sm" asChild className="shrink-0">
                                        <Link to={step.action.to}>
                                            {step.action.label}
                                            <ArrowRight className="size-3.5" aria-hidden="true" />
                                        </Link>
                                    </Button>
                                ) : (
                                    <Button size="sm" onClick={step.action.onClick} className="shrink-0">
                                        {step.action.label}
                                        <ArrowRight className="size-3.5" aria-hidden="true" />
                                    </Button>
                                )
                            )}
                        </li>
                    );
                })}
            </ol>
        </DashboardPanel>
    );
}
