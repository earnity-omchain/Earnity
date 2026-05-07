import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Loader2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const ran = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Completing Discord sign-in…");

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const handleAuth = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const errorParam = url.searchParams.get("error");
      const errorDesc = url.searchParams.get("error_description");
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hashParams.get("access_token");

      // Handle OAuth errors
      if (errorParam) {
        setError(errorDesc || `Auth error: ${errorParam}`);
        setTimeout(() => setLocation("/"), 3000);
        return;
      }

      let session = null;

      // Try PKCE flow (code in URL query params)
      if (code) {
        setStatus("Exchanging auth code…");
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          // PKCE failed — fall through to check existing session
          console.warn("PKCE exchange failed:", exchangeError.message);
        } else {
          session = data.session;
        }
      }

      // Try implicit flow (token in URL hash)
      if (!session && accessToken) {
        setStatus("Processing session…");
        const { data } = await supabase.auth.getSession();
        session = data.session;
      }

      // Last resort — check if session already exists (e.g. supabase handled it)
      if (!session) {
        setStatus("Checking session…");
        await new Promise(r => setTimeout(r, 800));
        const { data } = await supabase.auth.getSession();
        session = data.session;
      }

      if (!session) {
        setError("Sign-in failed. Please try again.");
        setTimeout(() => setLocation("/"), 3000);
        return;
      }

      // Route based on profile state
      setStatus("Loading your profile…");
      const userId = session.user.id;
      let profile: any = null;

      // Retry up to 10 times — trigger may take a moment to create profile
      for (let i = 0; i < 10; i++) {
        const { data: p } = await supabase
          .from("profiles")
          .select("id, invite_code_used, guild_id, username, wallet_address, element")
          .eq("id", userId)
          .single();

        if (p) { profile = p; break; }
        await new Promise(r => setTimeout(r, 500));
      }

      if (!profile) {
        // Profile trigger may not have fired yet — go to landing, it'll handle routing
        setLocation("/");
        return;
      }

      // New user — needs invite code
      if (!profile.invite_code_used) {
        setLocation("/");
        return;
      }

      // Has code but no element/guild chosen yet
      if (!profile.element && !profile.guild_id) {
        setLocation("/");
        return;
      }

      // Has element but needs username/wallet
      if (!profile.username || !profile.wallet_address) {
        setLocation("/connect");
        return;
      }

      // Fully onboarded — go to landing (it will redirect to dashboard/leaderboard)
      setLocation("/");
    };

    handleAuth();
  }, [setLocation]);

  if (error) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-black px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Sign-in failed</h2>
          <p className="text-sm text-white/50 mb-4">{error}</p>
          <p className="text-xs text-white/30">Redirecting home…</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-white/40" />
        <p className="text-sm text-white/50">{status}</p>
      </div>
    </div>
  );
}
