import { AlertCircle, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlertProps {
    /** 'warning' is for "this worked, but check something" — neither a failure nor a clean success. */
    variant: 'error' | 'success' | 'warning';
    message: string;
    className?: string;
    onDismiss?: () => void;
}

const VARIANT_STYLES: Record<AlertProps['variant'], string> = {
    error: 'border-destructive/30 bg-destructive/10 text-destructive',
    success: 'border-success-600/30 bg-success-600/10 text-success-600',
    warning: 'border-amber-500/40 bg-amber-500/10 text-amber-700',
};

const VARIANT_ICONS = {
    error: AlertCircle,
    success: CheckCircle2,
    warning: AlertTriangle,
} as const;

export function Alert({ variant, message, className, onDismiss }: AlertProps) {
    const Icon = VARIANT_ICONS[variant];

    return (
        <div
            role="alert"
            className={cn('flex items-start gap-2 rounded-lg border px-3 py-2 text-sm', VARIANT_STYLES[variant], className)}
        >
            <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span className="flex-1">{message}</span>
            {onDismiss && (
                <button
                    type="button"
                    onClick={onDismiss}
                    aria-label="Dismiss"
                    className="ml-2 rounded p-0.5 hover:bg-black/5"
                >
                    <X className="size-4" aria-hidden="true" />
                </button>
            )}
        </div>
    );
}
