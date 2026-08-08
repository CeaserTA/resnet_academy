import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
    value: number;
    onChange?: (value: number) => void;
    readOnly?: boolean;
    size?: 'sm' | 'md';
}

const SIZE_CLASSES = { sm: 'size-4', md: 'size-6' };

export function StarRating({ value, onChange, readOnly = false, size = 'md' }: StarRatingProps) {
    const interactive = !readOnly && !!onChange;
    const starClass = SIZE_CLASSES[size];

    if (!interactive) {
        return (
            <div className="flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        className={cn(starClass, star <= value ? 'fill-amber-500 text-amber-500' : 'text-surface-100')}
                        aria-hidden="true"
                    />
                ))}
            </div>
        );
    }

    return (
        <div role="radiogroup" aria-label="Rating" className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    role="radio"
                    aria-checked={star === value}
                    aria-label={`${star} star${star === 1 ? '' : 's'}`}
                    onClick={() => onChange?.(star)}
                    className="rounded-sm p-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                    <Star
                        className={cn(starClass, star <= value ? 'fill-amber-500 text-amber-500' : 'text-surface-100')}
                        aria-hidden="true"
                    />
                </button>
            ))}
        </div>
    );
}
