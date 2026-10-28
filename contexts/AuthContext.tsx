import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AppwriteException, ID, Models } from "appwrite";
import { account, client } from "@/lib/appwrite";
import { ensureProfile } from "@/services/profiles";
import type { Profile } from "@/types/profile";
import {
  PendingApprovalError,
  SignUpPendingError,
  isPendingManager,
} from "@/utils/auth-access";
import { takeInitialSnapshot } from "@/offline/sync-engine";

type AuthContextValue = {
  user: Models.User<Models.Preferences> | null;
  profile: Profile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  ping: () => Promise<string>;
  recoverPassword: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(
    null,
  );
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const current = await account.get();
      try {
        const p = await ensureProfile({
          fullName: current.name,
          email: current.email,
        });
        setUser(current);
        setProfile(p);
      } catch {
        setUser(current);
        setProfile(null);
      }
    } catch {
      setUser(null);
      setProfile(null);
    }
  }, []);

  const clearSession = useCallback(async () => {
    try {
      await account.deleteSession("current");
    } catch (err) {
      if (!(err instanceof AppwriteException) || err.code !== 401) {
        throw err;
      }
    } finally {
      setUser(null);
      setProfile(null);
    }
  }, []);

  const loadSessionProfile = useCallback(async () => {
    const current = await account.get();
    const p = await ensureProfile({
      fullName: current.name,
      email: current.email,
    });

    // Snapshot inicial após login
    try {
      await takeInitialSnapshot(current.$id);
    } catch (err) {
      console.warn('Initial snapshot failed:', err);
    }

    return { current, profile: p };
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false));
  }, [refreshUser]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      await account.createEmailPasswordSession(email, password);
      const { current, profile: p } = await loadSessionProfile();
      if (isPendingManager(p)) {
        await clearSession();
        throw new PendingApprovalError();
      }
      setUser(current);
      setProfile(p);
    },
    [loadSessionProfile, clearSession],
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      await account.create(ID.unique(), email, password, name);
      await account.createEmailPasswordSession(email, password);
      const { profile: p } = await loadSessionProfile();
      if (isPendingManager(p)) {
        await clearSession();
        throw new SignUpPendingError();
      }
      const current = await account.get();
      setUser(current);
      setProfile(p);
    },
    [loadSessionProfile, clearSession],
  );

  const signOut = useCallback(async () => {
    await clearSession();
  }, [clearSession]);

  const ping = useCallback(async () => {
    return client.ping();
  }, []);

  const recoverPassword = useCallback(async (email: string) => {
    const redirect =
      typeof window !== "undefined" && window.location?.origin
        ? `${window.location.origin}/login`
        : "https://riocred.online/login";
    await account.createRecovery(email, redirect);
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      isLoading,
      signIn,
      signUp,
      signOut,
      ping,
      recoverPassword,
    }),
    [
      user,
      profile,
      isLoading,
      signIn,
      signUp,
      signOut,
      ping,
      recoverPassword,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
