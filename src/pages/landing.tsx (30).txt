import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence, useAnimationFrame } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import WaitingPhase from "@/components/WaitingPhase";
import { Loader2 } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { auth, supabase } from "@/lib/supabase";

// ── Asset base (Supabase CDN) ─────────────────────────────────────────────────
const BASE = "https://gmyplyxwxmkvptimzgid.supabase.co/storage/v1/object/public/Assets/Game%20assets";
const ASSETS = {
  background:  `${BASE}/background-1.png`,
  background2: `${BASE}/background-2.png`,
  logo:        "/logo.jpg",
  seal:        `${BASE}/Seal2.png`,
  coin:        `${BASE}/coin.png`,
};

type Phase = "loading" | "waiting";

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Landing() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);


  // Daily check-in status
  const { data: checkInStatus, refetch: refetchCheckIn } = useQuery({
    queryKey: ["checkin-status", session?.user?.id],
    queryFn: async () => {
      const uid = session?.user?.id;
      if (!uid) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .rpc("get_checkin_status", { p_user_id: uid });
      if (error) throw error;
      return data as { can_check_in: boolean; current_streak: number; next_day: number; last_checkin: string | null };
    },
    enabled: !!session?.user?.id && phase === "waiting",
    refetchInterval: 60_000,
  });

  // Auto-popup check-in
  useEffect(() => {
    if (phase !== "waiting" || !checkInStatus?.can_check_in || checkInOpen) return;
    const t = setTimeout(() => setCheckInOpen(true), 1200);
    return () => clearTimeout(t);
  }, [phase, checkInStatus?.can_check_in]);

  const handleSignOut = async () => {
    await auth.signOut();
    setSession(null);
  };

  // ── Anonymous sign-in on mount ────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        await supabase.auth.signInAnonymously();
      }
      setSessionReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setSessionReady(true);
      if (s?.user?.id) queryClient.invalidateQueries({ queryKey: ["landing-profile", s.user.id] });
      if (event === "SIGNED_OUT") setSession(null);
    });

    return () => listener.subscription.unsubscribe();
  }, [queryClient]);

  // Profile query
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["landing-profile", session?.user?.id],
    queryFn: async () => {
      const uid = session?.user?.id;
      if (!uid) throw new Error("Not authenticated");
      const { data } = await supabase
        .from("profiles")
        .select(
          "id, guild_id, invite_code_used, username, wallet_address, element, " +
          "coin_balance, contribution_score, stronghold_rank, last_chest_opened"
        )
        .eq("id", uid)
        .single();
      return data;
    },
    enabled: !!session?.user?.id,
    retry: 5,
    retryDelay: 800,
    staleTime: 0,
  });

  // ── Routing: skip straight to waiting ────────────────────────────────────
  useEffect(() => {
    if (!sessionReady) return;
    if (!session?.user) { setPhase("loading"); return; }
    setPhase("waiting");
  }, [session, sessionReady]);

  // ── Loading screen ────────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div className="relative min-h-[100dvh] w-full overflow-hidden bg-black">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${ASSETS.background})` }} />
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 min-h-[100dvh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-white/40" />
        </div>
      </div>
    );
  }

  // ── Waiting (main screen) ─────────────────────────────────────────────────
  return (
    <WaitingPhase
      session={session!}
      profile={profile}
      checkInStatus={checkInStatus}
      checkInOpen={checkInOpen}
      setCheckInOpen={setCheckInOpen}
      handleSignOut={handleSignOut}
      refetchCheckIn={refetchCheckIn}
    />
  );
}
