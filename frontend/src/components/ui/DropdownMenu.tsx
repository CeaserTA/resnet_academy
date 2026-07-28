import type { ReactNode } from 'react';
import * as RadixDropdownMenu from '@radix-ui/react-dropdown-menu';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DropdownMenuItem {
    label: string;
    icon?: LucideIcon;
    onClick: () => void;
    variant?: 'default' | 'danger';
}

interface DropdownMenuProps {
    /**
     * Receives a `toggle` callback for the trigger's onClick. Radix's Trigger (below) already
     * drives open/close on click via its own composed handler, so this is a no-op kept for
     * backward API compatibility with existing call sites that wire it to onClick.
     */
    trigger: (toggle: () => void) => ReactNode;
    items: DropdownMenuItem[];
    align?: 'left' | 'right';
    className?: string;
}

const noop = () => {};

/**
 * Built on Radix's DropdownMenu for correct menu ARIA roles, arrow-key navigation, and
 * type-ahead — the hand-rolled toggle-panel version this replaced had none of that. Kept
 * uncontrolled (Radix owns open state internally) so its own click handling on the trigger never
 * fights a parallel state toggle. Keeps the same `trigger`/`items`/`align` render-prop API used by
 * `ProfileMenu`/`CourseListPage`, so no call site needs to change shape.
 */
export function DropdownMenu({ trigger, items, align = 'right', className }: DropdownMenuProps) {
    return (
        <RadixDropdownMenu.Root>
            <RadixDropdownMenu.Trigger asChild className={className}>
                {trigger(noop)}
            </RadixDropdownMenu.Trigger>

            <RadixDropdownMenu.Portal>
                <RadixDropdownMenu.Content
                    align={align === 'right' ? 'end' : 'start'}
                    sideOffset={4}
                    className="z-20 w-48 rounded-md border border-border bg-popover py-1 text-sm shadow-lg"
                >
                    {items.map((item) => (
                        <RadixDropdownMenu.Item
                            key={item.label}
                            onSelect={item.onClick}
                            className={cn(
                                'flex cursor-pointer items-center gap-2 px-3 py-1.5 outline-none hover:bg-accent focus:bg-accent',
                                item.variant === 'danger' ? 'text-destructive' : 'text-popover-foreground',
                            )}
                        >
                            {item.icon && <item.icon className="size-3.5" aria-hidden="true" />}
                            {item.label}
                        </RadixDropdownMenu.Item>
                    ))}
                </RadixDropdownMenu.Content>
            </RadixDropdownMenu.Portal>
        </RadixDropdownMenu.Root>
    );
}
