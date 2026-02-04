import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const TOKEN_KEY = "hercules_token";
const USER_KEY = "hercules_user";

type User = {
  id: string;
  email: string;
  rolle: string;
  navn: string;
};

type AuthState = {
  token: string | null;
  user: User | null;
  loading: boolean;
};

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, navn?: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const getApiUrl = () => {
  if (import.meta.env.DEV) return import.meta.env.VITE_API_URL || "";
  return ""; // same origin in prod (nginx proxy)
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null
  );
  const [user, setUserState] = useState<User | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(!!token);

  const setUser = useCallback((u: User | null) => {
    setUserState(u);
    if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
    else localStorage.removeItem(USER_KEY);
  }, []);

  const fetchMe = useCallback(async (t: string) => {
    const base = getApiUrl();
    const res = await fetch(`${base}/api/me`, {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (!res.ok) throw new Error("Session invalid");
    const data = await res.json();
    setUser({
      id: data.id,
      email: data.email,
      rolle: data.rolle,
      navn: data.navn,
    });
  }, [setUser]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetchMe(token).catch(() => {
      setToken(null);
      setUser(null);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }).finally(() => setLoading(false));
  }, [token, fetchMe]);

  const login = useCallback(
    async (email: string, password: string) => {
      const base = getApiUrl();
      const res = await fetch(`${base}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Innlogging feilet");
      }
      const data = await res.json();
      const t = data.access_token;
      const u = data.user;
      setToken(t);
      setUser(u);
      localStorage.setItem(TOKEN_KEY, t);
      localStorage.setItem(USER_KEY, JSON.stringify(u));
    },
    []
  );

  const signup = useCallback(
    async (email: string, password: string, navn?: string) => {
      const base = getApiUrl();
      const res = await fetch(`${base}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, navn: navn || "" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Registrering feilet");
      }
      const data = await res.json();
      const t = data.access_token;
      const u = data.user;
      setToken(t);
      setUser(u);
      localStorage.setItem(TOKEN_KEY, t);
      localStorage.setItem(USER_KEY, JSON.stringify(u));
    },
    []
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ token, user, loading, login, signup, logout, setUser }),
    [token, user, loading, login, signup, logout, setUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
