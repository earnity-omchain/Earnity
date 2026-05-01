import { useEffect } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const handleAuth = async () => {
      // Supabase OAuth with implicit flow stores tokens in URL hash
      // The client library auto-handles this, but we need to wait for session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        // Wait a moment for Supabase to process the hash
        await new Promise(r => setTimeout(r, 500));
        const { data: { session: retrySession } } = await supabase.auth.getSession();
        
        if (!retrySession) {
          setLocation("/connect");
          return;
        }
      }

      const userId = session?.user?.id || (await supabase.auth.getSession()).data.session?.user.id;
      if (!userId) {
        setLocation("/connect");
        return;
      }

      // Check profile completion state
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, wallet_address, guild_id")
        .eq("id", userId)
        .single();

      if (!profile?.username) {
        setLocation("/connect");
      } else if (!profile?.wallet_address) {
        setLocation("/connect");
      } else if (!profile?.guild_id) {
        setLocation("/connect");
      } else {
        setLocation("/dashboard");
      }
    };

    handleAuth();
  }, [setLocation]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">Authenticating…</p>
      </div>
    </div>
  );
}
