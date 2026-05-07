import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Loader2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const ran = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const handleAuth = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const errorParam = url.searchParams.get("error");
      const errorDesc = url.searchParams.get("error_description");

      // Handle OAuth errors from Discord
      if (errorParam) {
        console.error("Discord OAuth error:", errorParam, errorDesc);
        setError(errorDesc || `Discord error: ${errorParam}`);
        setTimeout(() => setLocation("/"), 4000);
        return;
      }

      // No code = not an OAuth callback, just redirect
      if (!code) {
        setLocation("/");
        return;
      }

      // CRITICAL: Only exchange the code, do NOT call getSession or detectSessionInUrl
      // They race with each other and cause silent failures
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error("Code exchange failed:", exchangeError.message, exchangeError);
        setError("Sign-in failed. Please try again.");
        setTimeout(() => setLocation("/"), 4000);
        return;
      }

      if (!data.session) {
        setError("No session created. Please try again.");
        setTimeout(() => setLocation("/"), 4000);
        return;
      }

      // Wait a moment for the session to propagate to auth-context
      await new Promise(r => setTimeout(r, 300));

      // Now check profile and route accordingly
      const userId = data.session.user.id;
      let profile: any = null;

      for (let i = 0; i < 15; i++) {
        const { data: p, error: profileError } = await supabase
          .from("profiles")
          .select("id, invite_code_used, guild_id, username, wallet_address, element")
          .eq("id", userId)
          .single();

        if (p && !profileError) {
          profile = p;
          break;
        }
        await new Promise(r => setTimeout(r, 400));
      }

      if (!profile || !profile.invite_code_used) {
        setLocation("/");
        return;
      }
      if (!profile.element && !profile.guild_id) {
        setLocation("/");
        return;
      }
      if (!profile.username || !profile.wallet_address) {
        setLocation("/connect");
        return;
      }

      // Fully onboarded
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
        <p className="text-sm text-white/50">Completing Discord sign-in…</p>
      </div>
    </div>
  );
}
