import { useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import { SiDiscord } from "react-icons/si";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

const ASSETS = {
  background: `${import.meta.env.BASE_URL}background-1.png`,
};

export default function Landing() {
  const { session, profile, isInitializing } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect if already authenticated
  useEffect(() => {
    if (isInitializing) return;
    if (!session) return;
    if (!profile?.invite_code_used) {
      setLocation("/connect");
    } else if (!profile?.guild_id) {
      setLocation("/connect");
    } else {
      setLocation("/dashboard");
    }
  }, [session, profile, isInitializing, setLocation]);

  const handleDiscordLogin = () => {
    supabase.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  if (isInitializing) {
    return (
      <div className="min-h-[100dvh] bg-black flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-black text-white">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${ASSETS.background})` }}
      />
      <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px]" />

      {/* Content */}
      <div className="relative z-10 min-h-[100dvh] flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 20, delay: 0.1 }}
          className="w-full max-w-sm text-center"
        >
          {/* Logo */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center shadow-2xl"
          >
            <Shield className="w-10 h-10 text-white" />
          </motion.div>

          <h1 className="text-4xl font-bold tracking-tight mb-2">Earnity</h1>
          <p className="text-sm text-white/50 mb-10">Private beta — invite only</p>

          {/* Discord Login */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            onClick={handleDiscordLogin}
            className="w-full h-14 flex items-center justify-center gap-3 rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 transition-colors shadow-lg"
          >
            <SiDiscord className="w-5 h-5 text-[#5865F2]" />
            Sign in with Discord
          </motion.button>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-5 text-xs text-white/30"
          >
            50 access codes only. Discord required.
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
