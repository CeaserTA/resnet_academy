import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    {
        variants: {
            variant: {
                primary: 'bg-primary text-primary-foreground hover:bg-blue-700 disabled:bg-primary/50',
                secondary: 'border border-primary text-primary hover:bg-blue-50 disabled:opacity-50',
                ghost: 'text-muted-foreground hover:bg-accent disabled:opacity-50',
                destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:bg-destructive/50',
            },
        },
        defaultVariants: {
            variant: 'primary',
        },
    },
);

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
    isLoading?: boolean;
    /** Renders as its child (via Radix Slot) instead of a <button> — e.g. wrapping a <Link>. */
    asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, asChild = false, isLoading, disabled, children, ...props }, ref) => {
        const Comp = asChild ? Slot : 'button';

        return (
            <Comp
                ref={ref}
                disabled={disabled || isLoading}
                className={cn(buttonVariants({ variant }), className)}
                {...props}
            >
                {isLoading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {children}
            </Comp>
        );
    },
);

Button.displayName = 'Button';
