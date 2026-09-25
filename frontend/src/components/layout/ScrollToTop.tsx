import { useEffect } from 'react';
import { useLocation } from 'react-router';

/**
 * Scrolls the window to the top on every route change.
 * Handles both full navigation and browser refresh correctly.
 * Place this inside <BrowserRouter> so useLocation works.
 */
export function ScrollToTop() {
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, [pathname]);

    return null;
}
