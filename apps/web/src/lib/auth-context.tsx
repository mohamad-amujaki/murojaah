import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { CreateChildPayload, LoginPayload, PublicUser, RegisterPayload, UpdateProfilePayload } from "@murojaah/shared";
import {
  createChild as createChildApi, getMe, login as loginApi, logout as logoutApi,
  register as registerApi, switchProfile as switchProfileApi, updateProfile as updateProfileApi,
} from "./api";

interface AuthState {
  user: PublicUser | null;
  loginUser: PublicUser | null;
  children: PublicUser[];
  isActingAsChild: boolean;
  loading: boolean;
}

interface AuthValue extends AuthState {
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  createChild: (payload: CreateChildPayload) => Promise<void>;
  switchProfile: (userId: number) => Promise<void>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loginUser: null, children: [], isActingAsChild: false, loading: true });

  const refresh = useCallback(async () => {
    try {
      const me = await getMe();
      setState({ user: me.user, loginUser: me.loginUser, children: me.children, isActingAsChild: me.isActingAsChild, loading: false });
    } catch {
      setState({ user: null, loginUser: null, children: [], isActingAsChild: false, loading: false });
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const value: AuthValue = {
    ...state,
    login: async (payload) => { await loginApi(payload); await refresh(); },
    register: async (payload) => { await registerApi(payload); await refresh(); },
    logout: async () => { await logoutApi(); await refresh(); },
    createChild: async (payload) => { await createChildApi(payload); await refresh(); },
    switchProfile: async (userId) => { await switchProfileApi(userId); await refresh(); },
    updateProfile: async (payload) => { await updateProfileApi(payload); await refresh(); },
    refresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam AuthProvider");
  return ctx;
}
