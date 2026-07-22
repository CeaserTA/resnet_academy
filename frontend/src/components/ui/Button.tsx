import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    isLoading?: boolean;
}

const variantClasses: Record<Variant, string> = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-600/50',
    secondary: 'border border-blue-600 text-blue-600 hover:bg-blue-50 disabled:opacity-50',
    ghost: 'text-ink-600 hover:bg-surface-100 disabled:opacity-50',
    destructive: 'bg-danger-600 text-white hover:bg-danger-600/90 disabled:bg-danger-600/50',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', isLoading, disabled, children, ...props }, ref) => {
        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={cn(
                    'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600',
                    variantClasses[variant],
                    className,
                )}
                {...props}
            >
                {isLoading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {children}
            </button>
        );
    },
);

Button.displayName = 'Button';
