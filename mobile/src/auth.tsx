import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as AppleAuthentication from 'expo-apple-authentication';
import { api, type AuthUser } from './api';

const TOKEN_KEY = 'ra_session_token';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithApple: () => Promise<void>;
  // Google's request/response lives in the screen (it's a hook); this persists
  // the session once the id_token comes back.
  signInWithGoogleToken: (idToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  // Re-fetch the current user (e.g. to pick up a paid entitlement after the
  // parent completes checkout on the web). Safe no-op when signed out.
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore a saved session on cold start and confirm it's still valid.
  useEffect(() => {
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(TOKEN_KEY);
        if (saved) {
          const { user: me } = await api.me(saved);
          setToken(saved);
          setUser(me);
        }
      } catch {
        // Token missing/expired/rejected — start signed out.
        await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function persist(nextToken: string, nextUser: AuthUser) {
    await SecureStore.setItemAsync(TOKEN_KEY, nextToken);
    setToken(nextToken);
    setUser(nextUser);
  }

  const signIn = async (email: string, password: string) => {
    const res = await api.login(email, password);
    await persist(res.token, res.user);
  };

  const signUp = async (email: string, password: string) => {
    const res = await api.signup(email, password);
    await persist(res.token, res.user);
  };

  const signInWithApple = async () => {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!credential.identityToken) {
      throw new Error('Apple did not return an identity token');
    }
    const res = await api.appleNative(credential.identityToken);
    await persist(res.token, res.user);
  };

  const signInWithGoogleToken = async (idToken: string) => {
    const res = await api.googleNative(idToken);
    await persist(res.token, res.user);
  };

  const signOut = async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const { user: me } = await api.me(token);
      setUser(me);
    } catch {
      // A transient failure just leaves the current user in place; the caller
      // can retry. An expired token is handled on the next protected call.
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        signIn,
        signUp,
        signInWithApple,
        signInWithGoogleToken,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
