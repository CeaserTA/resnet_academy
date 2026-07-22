import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlertProps {
    variant: 'error' | 'success';
    message: string;
    className?: string;
}

export function Alert({ variant, message, className }: AlertProps) {
    const Icon = variant === 'error' ? AlertCircle : CheckCircle2;

    return (
        <div
            role="alert"
            className={cn(
                'flex items-start gap-2 rounded-md px-3 py-2 text-sm',
                variant === 'error' ? 'bg-danger-600/10 text-danger-600' : 'bg-success-600/10 text-success-600',
                className,
            )}
        >
            <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{message}</span>
        </div>
    );
}
