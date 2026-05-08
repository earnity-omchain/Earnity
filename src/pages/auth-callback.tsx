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

    // Check for OAuth errors in query params
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get("error");
    const errorDesc = params.get("error_description");
    if (errorParam) {
      setError(errorDesc || `Auth error: ${errorParam}`);
      setTimeout(() => setLocation("/"), 4000);
      return;
    }

    // With implicit flow, Supabase fires SIGNED_IN once it processes the #hash
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user?.id) {
        listener.subscription.unsubscribe();

        // Poll for profile (DB trigger may be slow)
        for (let i = 0; i < 20; i++) {
          const { data: p } = await supabase
            .from("profiles")
            .select("id, invite_code_used, guild_id, username, wallet_address, element")
            .eq("id", session.user.id)
            .single();
          if (p) break;
          await new Promise(r => setTimeout(r, 300));
        }

        setLocation("/");
      }
    });

    // Timeout fallback — if SIGNED_IN never fires after 15s
    const timeout = setTimeout(() => {
      listener.subscription.unsubscribe();
      setError("Session not established. Please try again.");
      setTimeout(() => setLocation("/"), 4000);
    }, 15000);

    return () => {
      clearTimeout(timeout);
      listener.subscription.unsubscribe();
    };
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
