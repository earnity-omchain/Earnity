import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

interface Profile {
  id: string;
  username: string;
  discord_id: string | null;
  discord_avatar: string | null;
  wallet_address: string | null;
  guild_id: string | null;
  contribution_score: number;
  coin_balance: number;
  element: string | null;
  mp: number;
  last_chest_opened: string | null;
  guild_joined_at: string | null;
  // allow any extra DB columns without breaking
  [key: string]: any;
}

interface AuthContextType {
  session: Session | null;
  profile: Profile | null;
  isInitializing: boolean;
  signInWithDiscord: () => void;
  signOut: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const queryClient = useQueryClient();

  const loadProfile = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) setProfile(data);
  };

  const refreshProfile = async () => {
    if (session?.user?.id) await loadProfile(session.user.id);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user?.id) {
        loadProfile(data.session.user.id).finally(() => setIsInitializing(false));
      } else {
        setIsInitializing(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user?.id) loadProfile(s.user.id);
      else { setProfile(null); queryClient.clear(); }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signInWithDiscord = () =>
    supabase.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    queryClient.clear();
  };

  return (
    <AuthContext.Provider value={{ session, profile, isInitializing, signInWithDiscord, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
