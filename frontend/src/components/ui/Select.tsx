import {
    Children,
    forwardRef,
    isValidElement,
    useId,
    useMemo,
    useState,
    type ChangeEvent,
    type ChangeEventHandler,
    type ComponentPropsWithoutRef,
    type ReactNode,
    type SelectHTMLAttributes,
} from 'react';
import * as RadixSelect from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectOption {
    label: string;
    value: string;
    disabled?: boolean;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children' | 'defaultValue' | 'value' | 'onChange'> {
    label: string;
    /** Visually hides the label (e.g. `sr-only`) while keeping it in the accessibility tree — for compact layouts where a visible label would be redundant. */
    labelClassName?: string;
    options?: SelectOption[];
    children?: ReactNode;
    value?: string | number;
    defaultValue?: string | number;
    onChange?: ChangeEventHandler<HTMLSelectElement>;
    placeholder?: string;
}

function createSyntheticEvent(value: string, name?: string, id?: string): ChangeEvent<HTMLSelectElement> {
    return {
        target: { value, name: name ?? '', id: id ?? '' },
        currentTarget: { value, name: name ?? '', id: id ?? '' },
    } as ChangeEvent<HTMLSelectElement>;
}

export const Select = forwardRef<HTMLInputElement, SelectProps>(
    (
        {
            className,
            label,
            labelClassName,
            id,
            children,
            options,
            value,
            defaultValue,
            onChange,
            onBlur,
            onFocus,
            placeholder,
            disabled,
            name,
            required,
            ...props
        },
        ref,
    ) => {
        const generatedId = useId();
        const selectId = id ?? generatedId;
        const triggerId = `${selectId}-trigger`;
        const inputId = `${selectId}-input`;
        const labelId = `${selectId}-label`;
        const [internalValue, setInternalValue] = useState<string | undefined>(
            defaultValue !== undefined ? String(defaultValue) : value !== undefined ? String(value) : undefined,
        );

        const resolvedValue = value !== undefined ? String(value) : internalValue;

        const normalizedOptions = useMemo(() => {
            if (options?.length) {
                return options.map((option) => ({ ...option, value: String(option.value) }));
            }

            const parsedChildren = Children.toArray(children)
                .flatMap((child) => {
                    if (!isValidElement(child)) {
                        return [];
                    }

                    if (child.type === 'option') {
                        const optionProps = child.props as ComponentPropsWithoutRef<'option'>;
                        return [
                            {
                                label: String(optionProps.children ?? optionProps.value ?? ''),
                                value: String(optionProps.value ?? ''),
                                disabled: optionProps.disabled,
                            },
                        ];
                    }

                    return [];
                })
                .filter((option) => option.value !== undefined);

            return parsedChildren;
        }, [children, options]);

        const handleValueChange = (nextValue: string) => {
            if (value === undefined) {
                setInternalValue(nextValue);
            }

            const event = createSyntheticEvent(nextValue, name, selectId);
            onChange?.(event);
        };

        return (
            <div className="flex flex-col gap-1.5">
                <label id={labelId} htmlFor={triggerId} className={cn('text-sm font-medium text-ink-900', labelClassName)}>
                    {label}
                </label>

                <input
                    ref={ref}
                    type="hidden"
                    id={inputId}
                    name={name}
                    value={resolvedValue ?? ''}
                    required={required}
                    disabled={disabled}
                    aria-hidden="true"
                />

                <RadixSelect.Root value={resolvedValue} onValueChange={handleValueChange} disabled={disabled}>
                    <RadixSelect.Trigger
                        id={triggerId}
                        aria-labelledby={labelId}
                        className={cn(
                            'flex h-10 w-full items-center justify-between rounded-md border border-surface-100 bg-surface-0 px-3 py-2 text-sm text-ink-900 shadow-sm',
                            'focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2',
                            className,
                        )}
                        aria-label={props['aria-label'] ?? label}
                        onBlur={(event) => onBlur?.(event as unknown as React.FocusEvent<HTMLSelectElement>)}
                        onFocus={(event) => onFocus?.(event as unknown as React.FocusEvent<HTMLSelectElement>)}
                    >
                        <RadixSelect.Value placeholder={placeholder ?? label} />
                        <RadixSelect.Icon asChild>
                            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                        </RadixSelect.Icon>
                    </RadixSelect.Trigger>

                    <RadixSelect.Portal>
                        <RadixSelect.Content
                            position="popper"
                            sideOffset={6}
                            className="z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-surface-100 bg-surface-0 text-ink-900 shadow-md"
                        >
                            <RadixSelect.Viewport className="p-1">
                                {normalizedOptions.length > 0
                                    ? normalizedOptions.map((option) => (
                                          <RadixSelect.Item
                                              key={option.value}
                                              value={option.value}
                                              disabled={option.disabled}
                                              className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-surface-100 data-[state=checked]:bg-surface-100"
                                          >
                                              <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                                              <RadixSelect.ItemIndicator className="ml-auto">
                                                  <Check className="h-4 w-4" />
                                              </RadixSelect.ItemIndicator>
                                          </RadixSelect.Item>
                                      ))
                                    : children}
                            </RadixSelect.Viewport>
                        </RadixSelect.Content>
                    </RadixSelect.Portal>
                </RadixSelect.Root>
            </div>
        );
    },
);

Select.displayName = 'Select';
