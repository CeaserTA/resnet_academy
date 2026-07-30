const RADIUS = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function CircularProgress({
    percent,
    size = 56,
    showLabel = true,
}: {
    percent: number;
    size?: number;
    /** Off when the percentage is already shown as text next to the ring (e.g. the course player's Overall Progress card) — avoids showing the same number twice. */
    showLabel?: boolean;
}) {
    const clamped = Math.min(100, Math.max(0, percent));
    const offset = CIRCUMFERENCE * (1 - clamped / 100);

    return (
        <div className="relative shrink-0" style={{ width: size, height: size }}>
            <svg viewBox="0 0 48 48" className="-rotate-90" width={size} height={size}>
                <circle cx="24" cy="24" r={RADIUS} fill="none" strokeWidth="4" className="stroke-surface-100" />
                <circle
                    cx="24"
                    cy="24"
                    r={RADIUS}
                    fill="none"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={offset}
                    className="stroke-blue-600 transition-[stroke-dashoffset]"
                />
            </svg>
            {showLabel && (
                <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-ink-900">
                    {Math.round(clamped)}%
                </span>
            )}
        </div>
    );
}
