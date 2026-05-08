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
  const params = new URLSearchParams(window.location.search);
  const errorParam = params.get("error");
  const errorDesc = params.get("error_description");
  if (errorParam) {
    setError(errorDesc || `Auth error: ${errorParam}`);
    setTimeout(() => setLocation("/"), 4000);
    return;
  }

  // With implicit flow, Supabase auto-processes the #hash — just poll for session
  let session = null;
  for (let i = 0; i < 50; i++) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user?.id) { session = data.session; break; }
    await new Promise(r => setTimeout(r, 200));
  }

  if (!session) {
    setError("Session not established. Please try again.");
    setTimeout(() => setLocation("/"), 4000);
    return;
  }

      // Poll for profile (DB trigger may be slow)
      let profile: any = null;
      for (let i = 0; i < 20; i++) {
        const { data: p } = await supabase
          .from("profiles")
          .select("id, invite_code_used, guild_id, username, wallet_address, element")
          .eq("id", session.user.id)
          .single();
        if (p) { profile = p; break; }
        await new Promise(r => setTimeout(r, 300));
      }

      // Route based on profile state — landing handles all phases
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
