import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlertProps {
    variant: 'error' | 'success';
    message: string;
    className?: string;
    onDismiss?: () => void;
}

export function Alert({ variant, message, className, onDismiss }: AlertProps) {
    const Icon = variant === 'error' ? AlertCircle : CheckCircle2;

    return (
        <div
            role="alert"
            className={cn(
                'flex items-start gap-2 rounded-lg border px-3 py-2 text-sm',
                variant === 'error'
                    ? 'border-destructive/30 bg-destructive/10 text-destructive'
                    : 'border-success-600/30 bg-success-600/10 text-success-600',
                className,
            )}
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
