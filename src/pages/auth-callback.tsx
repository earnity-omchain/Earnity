import { useEffect } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const handleAuth = async () => {
      await new Promise((r) => setTimeout(r, 500));
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        setLocation("/");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("invite_code_used, guild_id")
        .eq("id", session.user.id)
        .single();
      if (!profile?.invite_code_used) {
        setLocation("/");
      } else if (!profile?.guild_id) {
        setLocation("/");
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
        <p className="text-sm text-muted-foreground">Authenticating...</p>
      </div>
    </div>
  );
}
