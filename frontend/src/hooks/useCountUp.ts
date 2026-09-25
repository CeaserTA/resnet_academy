import { useEffect, useRef, useState } from 'react';

/**
 * Counts from 0 to `target` over `duration` ms when the returned `ref`
 * element scrolls into view. Only triggers once.
 */
export function useCountUp(target: number, duration = 1200) {
    const ref = useRef<HTMLElement>(null);
    const [count, setCount] = useState(0);
    const started = useRef(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting || started.current) return;
                started.current = true;
                observer.disconnect();

                const startTime = performance.now();

                const tick = (now: number) => {
                    const elapsed = now - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    // ease-out quad
                    const eased = 1 - (1 - progress) * (1 - progress);
                    setCount(Math.round(eased * target));
                    if (progress < 1) requestAnimationFrame(tick);
                };

                requestAnimationFrame(tick);
            },
            { threshold: 0.3 },
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [target, duration]);

    return { ref, count };
}
