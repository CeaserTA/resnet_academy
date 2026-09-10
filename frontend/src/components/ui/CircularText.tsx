interface CircularTextProps {
    text: string;
    /** Diameter of the circle in px */
    radius?: number;
    /** Animation duration in seconds */
    duration?: number;
    /** Spin direction */
    direction?: 'clockwise' | 'counter-clockwise';
    className?: string;
}

export function CircularText({
    text,
    radius = 60,
    duration = 10,
    direction = 'clockwise',
    className,
}: CircularTextProps) {
    const chars = text.split('');
    const angleStep = 360 / chars.length;
    const size = radius * 2;

    return (
        <div
            className={`relative select-none ${className ?? ''}`}
            style={{ width: size, height: size }}
            aria-label={text}
            role="img"
        >
            <div
                className="absolute inset-0"
                style={{
                    animation: `circular-spin ${duration}s linear infinite`,
                    animationDirection: direction === 'counter-clockwise' ? 'reverse' : 'normal',
                }}
            >
                {chars.map((char, i) => (
                    <span
                        key={i}
                        aria-hidden="true"
                        className="absolute left-1/2 top-0 origin-[0_50%] text-xs font-semibold uppercase tracking-widest text-primary"
                        style={{
                            transform: `rotate(${i * angleStep}deg) translateX(-50%)`,
                            transformOrigin: `50% ${radius}px`,
                            height: `${radius}px`,
                            display: 'block',
                        }}
                    >
                        {char === ' ' ? '\u00A0' : char}
                    </span>
                ))}
            </div>
        </div>
    );
}
