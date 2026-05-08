import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Loader2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

async function routeUser(userId: string, setLocation: (path: string) => void) {
  let profile: any = null;
  for (let i = 0; i < 15; i++) {
    const { data } = await supabase
      .from("profiles")
      .select("invite_code_used, guild_id, username, wallet_address, element")
      .eq("id", userId)
      .single();
    if (data) { profile = data; break; }
    await new Promise(r => setTimeout(r, 400));
  }

  if (!profile || !profile.invite_code_used) { setLocation("/"); return; }
  if (!profile.element && !profile.guild_id) { setLocation("/"); return; }
  if (!profile.username || !profile.wallet_address) { setLocation("/connect"); return; }
  setLocation("/");
}

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const ran = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Completing sign-in…");

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    // Check for OAuth errors in URL
    const url = new URL(window.location.href);
    const errorParam = url.searchParams.get("error");
    if (errorParam) {
      setError(url.searchParams.get("error_description") || "Auth error");
      setTimeout(() => setLocation("/"), 3000);
      return;
    }

    const run = async () => {
      // First: check if session already exists (implicit flow may have already set it)
      setStatus("Checking session…");
      const { data: existing } = await supabase.auth.getSession();
      if (existing.session) {
        setStatus("Loading profile…");
        await routeUser(existing.session.user.id, setLocation);
        return;
      }

      // Second: wait and poll — Supabase processes the hash asynchronously
      setStatus("Processing auth…");
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 500));
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setStatus("Loading profile…");
          await routeUser(data.session.user.id, setLocation);
          return;
        }
      }

      // Third: listen for auth state change as last resort
      setStatus("Waiting for Discord…");
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          unsub();
          resolve();
        }, 8000);

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === "SIGNED_IN" && session) {
            clearTimeout(timeout);
            unsub();
            setStatus("Loading profile…");
            await routeUser(session.user.id, setLocation);
            resolve();
          }
        });

        const unsub = () => subscription.unsubscribe();
      });

      // If we get here, nothing worked
      setError("Sign-in timed out. Please try again.");
      setTimeout(() => setLocation("/"), 3000);
    };

    run();
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
