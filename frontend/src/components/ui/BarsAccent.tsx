import { cn } from '@/lib/utils';

// Fixed, decorative only -- not derived from any real metric. A small symmetric "peak" of 7 bars
// (heights in rem), the tallest one in the middle colored the theme's primary blue so a plain
// label/value stat card reads as designed rather than plain. Shared by StatWidget and StatCard.
const BAR_HEIGHTS = [0.25, 0.5, 0.75, 1, 0.75, 0.5, 0.25];

export function BarsAccent() {
    return (
        <div className="flex shrink-0 items-end gap-0.5" aria-hidden="true">
            {BAR_HEIGHTS.map((height, index) => (
                <span
                    key={index}
                    className={cn('w-0.5 rounded-full', index === 3 ? 'bg-blue-600' : 'bg-ink-300')}
                    style={{ height: `${height}rem` }}
                />
            ))}
        </div>
    );
}
