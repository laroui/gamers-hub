import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import api, { tokenStore } from "../api/client.ts";
import type { User } from "@gamers-hub/types";

// ── Types ─────────────────────────────────────────────────────
interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // On mount: try to restore session via refresh token cookie
  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      const { data } = await api.post<{ accessToken: string; user: User }>("/auth/refresh");
      tokenStore.set(data.accessToken);
      setState({ user: data.user, isLoading: false, isAuthenticated: true });
    } catch {
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  };

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<{ accessToken: string; user: User }>("/auth/login", {
      email,
      password,
    });
    tokenStore.set(data.accessToken);
    setState({ user: data.user, isLoading: false, isAuthenticated: true });
  }, []);

  const register = useCallback(async (email: string, username: string, password: string) => {
    const { data } = await api.post<{ accessToken: string; user: User }>("/auth/register", {
      email,
      username,
      password,
    });
    tokenStore.set(data.accessToken);
    setState({ user: data.user, isLoading: false, isAuthenticated: true });
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      tokenStore.clear();
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get<User>("/auth/me");
      setState((prev) => ({ ...prev, user: data }));
    } catch { /* silent */ }
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
