import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  admin: any | null;
  token: string | null;
  setAuth: (admin: any, token: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      admin: null,
      token: null,
      setAuth: (admin, token) => set({ admin, token }),
      logout: () => set({ admin: null, token: null }),
    }),
    {
      name: "saas-admin-auth-storage",
    }
  )
);
