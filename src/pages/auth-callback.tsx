import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const handleAuth = async () => {
      // ── 1. PKCE: exchange code from query string ───────────────────────
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) console.error("PKCE exchange error:", error.message);
      }

      // ── 2. Implicit: tokens in hash — Supabase JS handles automatically
      // Just give it a moment to process
      if (window.location.hash?.includes("access_token")) {
        await new Promise(r => setTimeout(r, 800));
      }

      // ── 3. Poll for session up to 8 seconds ───────────────────────────
      let session = null;
      for (let i = 0; i < 40; i++) {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user?.id) { session = data.session; break; }
        await new Promise(r => setTimeout(r, 200));
      }

      if (!session) { setLocation("/"); return; }

      // ── 4. Poll for profile row (trigger may be slow) ─────────────────
      let profile: any = null;
      for (let j = 0; j < 20; j++) {
        const { data: p } = await supabase
          .from("profiles")
          .select("id, invite_code_used, guild_id, username, wallet_address, element")
          .eq("id", session.user.id)
          .single();
        if (p) { profile = p; break; }
        await new Promise(r => setTimeout(r, 300));
      }

      // ── 5. Route to correct step ──────────────────────────────────────
      // No profile or no invite code → show code entry on landing
      if (!profile || !profile.invite_code_used) { setLocation("/"); return; }
      // Has code but no element/guild → show choice on landing
      if (!profile.element && !profile.guild_id) { setLocation("/"); return; }
      // Needs username/wallet → connect flow
      if (!profile.username || !profile.wallet_address) { setLocation("/connect"); return; }
      // Fully onboarded → landing will show waiting phase
      setLocation("/");
    };

    handleAuth();
  }, [setLocation]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">Completing sign in…</p>
      </div>
    </div>
  );
}
