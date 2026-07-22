import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

interface PageHeader {
    title: string;
    subtitle?: string;
}

interface PageHeaderContextValue {
    header: PageHeader | null;
    setHeader: (header: PageHeader | null) => void;
}

const PageHeaderContext = createContext<PageHeaderContextValue | null>(null);

export function PageHeaderProvider({ children }: { children: ReactNode }) {
    const [header, setHeader] = useState<PageHeader | null>(null);
    const value = useMemo(() => ({ header, setHeader }), [header]);

    return <PageHeaderContext.Provider value={value}>{children}</PageHeaderContext.Provider>;
}

/**
 * A page calls this to put its title/subtitle in the top bar instead of rendering its own
 * in-body heading. Clears itself on unmount so navigating away doesn't leave a stale title.
 */
export function usePageHeader(title: string, subtitle?: string): void {
    const context = useContext(PageHeaderContext);

    if (!context) {
        throw new Error('usePageHeader must be used within a PageHeaderProvider');
    }

    const { setHeader } = context;

    useEffect(() => {
        setHeader({ title, subtitle });
        return () => setHeader(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- setHeader is stable (useState setter)
    }, [title, subtitle]);
}

export function usePageHeaderValue(): PageHeader | null {
    const context = useContext(PageHeaderContext);

    if (!context) {
        throw new Error('usePageHeaderValue must be used within a PageHeaderProvider');
    }

    return context.header;
}
