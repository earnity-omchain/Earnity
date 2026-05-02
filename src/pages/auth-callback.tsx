import { useEffect } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    let cancelled = false;

    const handleAuth = async () => {
      // 1. Extract the OAuth code from URL
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        // 2. Explicitly exchange the code for a session (PKCE flow)
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error("Code exchange failed:", error.message);
        }
      }

      // 3. Poll for session — Supabase needs a moment to persist it
      // Try every 200ms for up to 4 seconds
      for (let i = 0; i < 20; i++) {
        if (cancelled) return;

        const { data } = await supabase.auth.getSession();
        if (data.session) {
          // Session confirmed — safe to redirect
          setLocation("/");
          return;
        }
        await new Promise((r) => setTimeout(r, 200));
      }

      // 4. Fallback: redirect anyway so landing can retry
      if (!cancelled) {
        setLocation("/");
      }
    };

    handleAuth();

    return () => {
      cancelled = true;
    };
  }, [setLocation]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}
