import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { AuthModal, type AuthMode } from '@/components/landing/AuthModal';

interface AuthModalContextValue {
    /**
     * Open the site-wide auth modal. `redirectTo` controls the post-success destination:
     * defaults to `/dashboard`; pass `null` to keep the user on the current page.
     */
    openAuth: (mode?: AuthMode, redirectTo?: string | null) => void;
    closeAuth: () => void;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

/**
 * There are no dedicated /login or /register pages — sign-in and sign-up happen exclusively in
 * this modal, mounted once at the app root. Redirect flows (protected routes, password reset,
 * legacy URLs) reach it via the `?auth=login|signup` query param handled below.
 */
export function AuthModalProvider({ children }: { children: ReactNode }) {
    const [mode, setMode] = useState<AuthMode | null>(null);
    const [redirectTo, setRedirectTo] = useState<string | null>('/dashboard');
    const [searchParams, setSearchParams] = useSearchParams();

    const openAuth = useCallback((nextMode: AuthMode = 'login', nextRedirectTo: string | null = '/dashboard') => {
        setRedirectTo(nextRedirectTo);
        setMode(nextMode);
    }, []);

    const closeAuth = useCallback(() => setMode(null), []);

    // Deep-link support: /?auth=login|signup opens the modal, then strips the one-shot param.
    useEffect(() => {
        const requested = searchParams.get('auth');
        if (requested !== 'login' && requested !== 'signup') return;

        setRedirectTo('/dashboard');
        setMode(requested);
        searchParams.delete('auth');
        setSearchParams(searchParams, { replace: true });
    }, [searchParams, setSearchParams]);

    return (
        <AuthModalContext.Provider value={{ openAuth, closeAuth }}>
            {children}
            <AuthModal
                open={mode !== null}
                mode={mode ?? 'login'}
                onModeChange={setMode}
                onClose={closeAuth}
                redirectTo={redirectTo}
            />
        </AuthModalContext.Provider>
    );
}

export function useAuthModal(): AuthModalContextValue {
    const context = useContext(AuthModalContext);

    if (!context) {
        throw new Error('useAuthModal must be used within an AuthModalProvider');
    }

    return context;
}
