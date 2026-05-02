import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const ran = useRef(false);

  useEffect(() => {
    // Guard against double-run in React StrictMode
    if (ran.current) return;
    ran.current = true;

    const handleAuth = async () => {
      // 1. Try PKCE code exchange (if code param present)
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) console.error("PKCE exchange error:", error.message);
      }

      // 2. Poll until session is confirmed (up to 6 seconds)
      for (let i = 0; i < 30; i++) {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user?.id) {
          // 3. Wait for the DB trigger to create the profile row
          //    (Supabase triggers are async — give it up to 3s)
          let profile = null;
          for (let j = 0; j < 15; j++) {
            const { data: p } = await supabase
              .from("profiles")
              .select("id, invite_code_used, guild_id, username, wallet_address")
              .eq("id", data.session.user.id)
              .single();
            if (p) { profile = p; break; }
            await new Promise(r => setTimeout(r, 200));
          }

          // 4. Route to correct step
          if (!profile || !profile.invite_code_used) {
            // New user or hasn't entered code yet → landing will show code phase
            setLocation("/");
            return;
          }
          if (!profile.guild_id) {
            setLocation("/");
            return;
          }
          if (!profile.username || !profile.wallet_address) {
            setLocation("/connect");
            return;
          }
          setLocation("/dashboard");
          return;
        }
        await new Promise(r => setTimeout(r, 200));
      }

      // Fallback
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
