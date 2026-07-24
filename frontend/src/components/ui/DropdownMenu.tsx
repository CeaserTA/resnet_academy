import { useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DropdownMenuItem {
    label: string;
    icon?: LucideIcon;
    onClick: () => void;
    variant?: 'default' | 'danger';
}

interface DropdownMenuProps {
    /** Receives a `toggle` callback to wire onto whatever trigger element is rendered. */
    trigger: (toggle: () => void) => ReactNode;
    items: DropdownMenuItem[];
    align?: 'left' | 'right';
    className?: string;
}

/**
 * Generalizes the toggle-state + absolute-panel "..." menu pattern already used inline in
 * `ProfileMenu`/`NotificationBell`/`ForumPostCard` — one reusable primitive instead of
 * reimplementing it per page.
 */
export function DropdownMenu({ trigger, items, align = 'right', className }: DropdownMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const toggle = () => setIsOpen((prev) => !prev);

    return (
        <div className={cn('relative', className)}>
            {trigger(toggle)}

            {isOpen && (
                <div
                    className={cn(
                        'absolute top-full z-20 mt-1 w-48 rounded-md border border-surface-100 bg-surface-0 py-1 text-sm shadow-lg',
                        align === 'right' ? 'right-0' : 'left-0',
                    )}
                >
                    {items.map((item) => (
                        <button
                            key={item.label}
                            onClick={() => {
                                item.onClick();
                                setIsOpen(false);
                            }}
                            className={cn(
                                'flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-surface-50',
                                item.variant === 'danger' ? 'text-danger-600' : 'text-ink-900',
                            )}
                        >
                            {item.icon && <item.icon className="size-3.5" aria-hidden="true" />}
                            {item.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
