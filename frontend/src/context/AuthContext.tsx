import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";

import { api, Child, TOKEN_KEY } from "@/src/api/client";
import { storage } from "@/src/utils/storage";

const ONBOARDED_KEY = "neurokid_onboarded";
const EMERGENT_AUTH_URL = "https://auth.emergentagent.com/";

WebBrowser.maybeCompleteAuthSession();

type Parent = { id: string; name: string; email: string; picture?: string | null; provider?: string };

type AuthValue = {
  ready: boolean;
  parent: Parent | null;
  onboarded: boolean;
  children: Child[];
  activeChild: Child | null;
  googleBusy: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  setActiveChildId: (id: string) => void;
  refreshChildren: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

type TokenResponse = { access_token: string; parent: Parent };
type SessionResponse = { session_token: string; parent: Parent };

const extractSessionId = (url?: string | null): string | null => {
  if (!url) return null;
  const match = url.match(/[?#&]session_id=([^&#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

const redirectUrl = (): string =>
  Platform.OS === "web" ? `${window.location.origin}/` : Linking.createURL("");

export function AuthProvider({ children: node }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [parent, setParent] = useState<Parent | null>(null);
  const [onboarded, setOnboarded] = useState(false);
  const [kids, setKids] = useState<Child[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);
  const spent = useRef<Set<string>>(new Set());

  const loadChildren = useCallback(async () => {
    const list = await api.get<Child[]>("/children");
    setKids(list);
    setActiveId((prev) => (prev && list.some((c) => c.id === prev) ? prev : list[0]?.id ?? null));
  }, []);

  // One-time exchange of an Emergent session_id for a 7-day session token.
  const exchangeSessionId = useCallback(
    async (sessionId: string) => {
      if (spent.current.has(sessionId)) return;
      spent.current.add(sessionId);
      const res = await api.post<SessionResponse>("/auth/session", { session_id: sessionId });
      await storage.secureSet(TOKEN_KEY, res.session_token);
      setParent(res.parent);
      await storage.setItem(ONBOARDED_KEY, true);
      setOnboarded(true);
      await loadChildren();
      if (Platform.OS === "web") {
        const url = new URL(window.location.href);
        url.hash = "";
        url.searchParams.delete("session_id");
        window.history.replaceState(window.history.state, "", url.toString());
      }
    },
    [loadChildren],
  );

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      const seen = await storage.getItem<boolean>(ONBOARDED_KEY, false);
      if (!cancelled) setOnboarded(Boolean(seen));

      // A session_id on the URL always wins over a stored token.
      const callbackUrl =
        Platform.OS === "web"
          ? window.location.href
          : await Linking.getInitialURL().catch(() => null);
      const sessionId = extractSessionId(callbackUrl);
      if (sessionId) {
        try {
          await exchangeSessionId(sessionId);
          if (!cancelled) setReady(true);
          return;
        } catch {
          // fall through to the stored token path
        }
      }

      const token = await storage.secureGet<string>(TOKEN_KEY, "");
      if (token) {
        try {
          const meRes = await api.get<Parent>("/auth/me");
          if (!cancelled) setParent(meRes);
          await loadChildren();
        } catch {
          await storage.secureRemove(TOKEN_KEY);
        }
      }
      if (!cancelled) setReady(true);
    };

    boot();

    const sub = Linking.addEventListener("url", (event) => {
      const id = extractSessionId(event.url);
      if (id) exchangeSessionId(id).catch(() => undefined);
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [exchangeSessionId, loadChildren]);

  const finishAuth = useCallback(
    async (res: TokenResponse) => {
      await storage.secureSet(TOKEN_KEY, res.access_token);
      setParent(res.parent);
      await loadChildren();
    },
    [loadChildren],
  );

  const signInWithGoogle = useCallback(async () => {
    const redirect = redirectUrl();
    const authUrl = `${EMERGENT_AUTH_URL}?redirect=${encodeURIComponent(redirect)}`;

    if (Platform.OS === "web") {
      window.location.href = authUrl;
      return;
    }

    setGoogleBusy(true);
    let captured: string | null = null;
    const sub = Linking.addEventListener("url", (event) => {
      captured = event.url;
    });
    try {
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirect);
      const resultUrl = result.type === "success" ? result.url : null;
      const fallback = captured ?? (await Linking.getInitialURL().catch(() => null));
      const sessionId = extractSessionId(resultUrl) ?? extractSessionId(fallback);
      if (sessionId) await exchangeSessionId(sessionId);
    } finally {
      sub.remove();
      setGoogleBusy(false);
    }
  }, [exchangeSessionId]);

  const value = useMemo<AuthValue>(
    () => ({
      ready,
      parent,
      onboarded,
      children: kids,
      activeChild: kids.find((c) => c.id === activeId) ?? null,
      googleBusy,
      signIn: async (email, password) => {
        const res = await api.post<TokenResponse>("/auth/login", { email, password });
        await finishAuth(res);
      },
      signUp: async (name, email, password) => {
        const res = await api.post<TokenResponse>("/auth/register", { name, email, password });
        await finishAuth(res);
      },
      signInWithGoogle,
      signOut: async () => {
        await api.post("/auth/logout").catch(() => undefined);
        await storage.secureRemove(TOKEN_KEY);
        setParent(null);
        setKids([]);
        setActiveId(null);
      },
      completeOnboarding: async () => {
        await storage.setItem(ONBOARDED_KEY, true);
        setOnboarded(true);
      },
      setActiveChildId: setActiveId,
      refreshChildren: loadChildren,
    }),
    [ready, parent, onboarded, kids, activeId, googleBusy, finishAuth, loadChildren, signInWithGoogle],
  );

  return <AuthContext.Provider value={value}>{node}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
