import { useEffect } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // Extract the OAuth code from the URL query params
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");

        if (code) {
          // Explicitly exchange the authorization code for a session.
          // This is required for the PKCE flow to complete.
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error("Code exchange failed:", error.message);
          }
        }

        // Brief pause to let the session propagate through listeners
        await new Promise((r) => setTimeout(r, 600));
      } catch (err) {
        console.error("Auth callback error:", err);
      } finally {
        // Always redirect to landing — it handles all routing logic
        // based on whether the user has entered an access code / joined a guild.
        setLocation("/");
      }
    };

    handleAuth();
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
