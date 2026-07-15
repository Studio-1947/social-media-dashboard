import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { fetchMe, login as apiLogin, clearSession, type AuthUser } from '../services/authApi';
import { getToken, registerUnauthorizedHandler } from '../lib/session';

export type LoginResult = { ok: true } | { ok: false; message: string };

interface AuthContextType {
    isAuthenticated: boolean;
    /** True only while restoring a session on first load — lets the router avoid
     * flashing the Login page for someone who's actually still signed in. */
    isLoading: boolean;
    user: AuthUser | null;
    login: (email: string, password: string) => Promise<LoginResult>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Any request anywhere in the app that comes back 401 calls this — token
    // expired, or an admin just revoked/deleted this account mid-session.
    useEffect(() => {
        registerUnauthorizedHandler(() => setUser(null));
    }, []);

    useEffect(() => {
        const token = getToken();
        if (!token) {
            setIsLoading(false);
            return;
        }

        // A stored token is a claim, not a fact — /me is what actually confirms
        // the account is still active and reports its CURRENT role (a revoked or
        // demoted account since the token was issued must not resurrect as
        // logged-in just because localStorage still has a token in it).
        fetchMe()
            .then(setUser)
            .catch(() => setUser(null))
            .finally(() => setIsLoading(false));
    }, []);

    const login = async (email: string, password: string): Promise<LoginResult> => {
        try {
            const loggedInUser = await apiLogin(email, password);
            setUser(loggedInUser);
            return { ok: true };
        } catch (err: any) {
            const message =
                err?.response?.data?.error || 'Could not sign in. Please try again.';
            return { ok: false, message };
        }
    };

    const logout = () => {
        clearSession();
        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{ isAuthenticated: Boolean(user), isLoading, user, login, logout }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
