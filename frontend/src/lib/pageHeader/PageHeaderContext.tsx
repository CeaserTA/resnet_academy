import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

interface PageSearch {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

interface PageHeader {
    title: string;
    subtitle?: string;
}

interface PageHeaderContextValue {
    header: PageHeader | null;
    setHeader: (header: PageHeader | null) => void;
    search: PageSearch | null;
    setSearch: (search: PageSearch | null) => void;
}

const PageHeaderContext = createContext<PageHeaderContextValue | null>(null);

export function PageHeaderProvider({ children }: { children: ReactNode }) {
    const [header, setHeader] = useState<PageHeader | null>(null);
    const [search, setSearch] = useState<PageSearch | null>(null);
    const value = useMemo(() => ({ header, setHeader, search, setSearch }), [header, search]);

    return <PageHeaderContext.Provider value={value}>{children}</PageHeaderContext.Provider>;
}

function usePageHeaderContext(): PageHeaderContextValue {
    const context = useContext(PageHeaderContext);

    if (!context) {
        throw new Error('This hook must be used within a PageHeaderProvider');
    }

    return context;
}

/**
 * A page calls this to put its title/subtitle in the top bar instead of rendering its own
 * in-body heading. Clears itself on unmount so navigating away doesn't leave a stale title.
 */
export function usePageHeader(title: string, subtitle?: string): void {
    const { setHeader } = usePageHeaderContext();

    useEffect(() => {
        setHeader({ title, subtitle });
        return () => setHeader(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- setHeader is stable (useState setter)
    }, [title, subtitle]);
}

export function usePageHeaderValue(): PageHeader | null {
    return usePageHeaderContext().header;
}

/**
 * A shared top-bar search slot any admin list page can plug into — not tied to courses
 * specifically. Only one page's search is ever shown at a time (whichever is currently mounted);
 * clears itself on unmount so navigating away doesn't leave a stale/dead search box behind.
 */
export function usePageSearch(value: string, onChange: (value: string) => void, placeholder?: string): void {
    const { setSearch } = usePageHeaderContext();

    useEffect(() => {
        setSearch({ value, onChange, placeholder });
        return () => setSearch(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- setSearch is stable (useState setter)
    }, [value, onChange, placeholder]);
}

export function usePageSearchValue(): PageSearch | null {
    return usePageHeaderContext().search;
}
