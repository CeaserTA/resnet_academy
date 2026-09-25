import { useEffect, useRef, useState } from 'react';

/**
 * Returns { ref, visible } — attach ref to a section element.
 * `visible` flips to true once the element scrolls into view (fires once).
 */
export function useScrollReveal(threshold = 0.1) {
    const ref = useRef<HTMLElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                    observer.disconnect();
                }
            },
            { threshold },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [threshold]);

    return { ref, visible };
}
