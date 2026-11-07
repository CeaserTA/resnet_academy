import { createContext, useContext, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    fetchCurrentUser,
    login as loginRequest,
    logout as logoutRequest,
    register as registerRequest,
} from '@/features/auth/api';
import type { User } from '@/lib/api/types';

interface AuthContextValue {
    user: User | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string, passwordConfirmation: string) => Promise<void>;
    logout: () => Promise<void>;
    refetch: () => Promise<unknown>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const CURRENT_USER_QUERY_KEY = ['auth', 'me'];

export function AuthProvider({ children }: { children: ReactNode }) {
    const queryClient = useQueryClient();

    const {
        data: user,
        isLoading,
        refetch,
    } = useQuery({
        queryKey: CURRENT_USER_QUERY_KEY,
        queryFn: fetchCurrentUser,
        staleTime: 5 * 60 * 1000,
        retry: false,
    });

    // Everything cached belongs to whoever was signed in. Data fetched as one user (e.g. an
    // instructor's modules, where every lesson's is_complete is null) must never be shown to the
    // next one — that made a student's finished lessons look undone and hid unlocked modules.
    const forgetPreviousUser = () => {
        queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== CURRENT_USER_QUERY_KEY[0] });
    };

    const login = async (email: string, password: string) => {
        await loginRequest(email, password);
        forgetPreviousUser();
        await refetch();
    };

    const register = async (name: string, email: string, password: string, passwordConfirmation: string) => {
        await registerRequest(name, email, password, passwordConfirmation);
        forgetPreviousUser();
        await refetch();
    };

    const logout = async () => {
        await logoutRequest();
        // Clear per-session UI state so the profile completion modal re-appears on next login
        sessionStorage.removeItem('profile_completion_modal_dismissed');
        // Not queryClient.clear(): that also removes the current-user query this provider is
        // subscribed to, so setting it to null afterwards created a new query nobody watched and
        // the app stayed "signed in" until a refresh. Drop everything else, then sign out.
        forgetPreviousUser();
        queryClient.setQueryData(CURRENT_USER_QUERY_KEY, null);
    };

    return (
        <AuthContext.Provider value={{ user: user ?? null, isLoading, login, register, logout, refetch }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
}
