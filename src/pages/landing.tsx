import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

const ASSETS = {
  background: `${import.meta.env.BASE_URL}background-1.png`,
  seal: `${import.meta.env.BASE_URL}Seal2.png`,
};

type Phase = "gate" | "signing_in" | "code" | "done";

export default function Landing() {
  const { session, profile, isInitializing, refreshProfile } = useAuth();
  const [, setLocation] = useLocation();
  const [phase, setPhase] = useState<Phase>("gate");
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);

  // Redirect if already fully set up
  useEffect(() => {
    if (isInitializing) return;
    if (!session) { setPhase("gate"); return; }
    if (!profile?.invite_code_used) {
      // Logged in but no code yet — show code entry
      setPhase("code");
    } else {
      // Fully set up
      setLocation("/connect");
    }
  }, [session, profile, isInitializing, setLocation]);

  const handleDiscordLogin = () => {
    setPhase("signing_in");
    supabase.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id || !code.trim()) return;
    setCodeError("");
    setCodeLoading(true);

    const { data, error } = await supabase.rpc("redeem_invite_code", {
      p_user_id: session.user.id,
      p_code: code.trim().toUpperCase(),
    });

    setCodeLoading(false);

    if (error || !data?.success) {
      setCodeError(data?.error || error?.message || "Invalid or already used code");
      return;
    }

    await refreshProfile();
    setLocation("/connect");
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
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative z-10 min-h-[100dvh] flex flex-col items-center justify-center p-6">
        <AnimatePresence mode="wait">

          {/* ── GATE: Enter access code ── */}
          {(phase === "gate" || phase === "signing_in") && (
            <motion.div
              key="gate"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-sm text-center"
            >
              {/* Seal */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: "spring" }}
                className="w-20 h-20 mx-auto mb-6"
              >
                <img
                  src={ASSETS.seal}
                  alt="Earnity"
                  className="w-full h-full object-contain drop-shadow-2xl"
                  onError={(e) => {
                    // fallback shield if image missing
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </motion.div>

              <h1 className="text-4xl font-bold tracking-tight mb-2">Earnity</h1>
              <p className="text-sm text-white/50 mb-8">Enter your access code to enter the protocol</p>

              <form onSubmit={(e) => { e.preventDefault(); handleDiscordLogin(); }} className="space-y-3">
                <Input
                  readOnly
                  value=""
                  placeholder="ACCESS CODE"
                  onClick={handleDiscordLogin}
                  className="h-14 text-center text-lg font-mono tracking-[0.2em] uppercase bg-black/50 border-white/20 text-white placeholder:text-white/30 cursor-pointer"
                />
                <Button
                  type="button"
                  onClick={handleDiscordLogin}
                  disabled={phase === "signing_in"}
                  className="w-full h-12 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold backdrop-blur-md"
                >
                  {phase === "signing_in" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Sign in with Discord"
                  )}
                </Button>
              </form>

              <p className="mt-5 text-xs text-white/30">
                Private beta — 50 access codes only
              </p>
            </motion.div>
          )}

          {/* ── CODE ENTRY: After Discord login ── */}
          {phase === "code" && (
            <motion.div
              key="code"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-sm text-center"
            >
              <motion.div
                className="w-20 h-20 mx-auto mb-6"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: "spring" }}
              >
                <img
                  src={ASSETS.seal}
                  alt="Earnity"
                  className="w-full h-full object-contain drop-shadow-2xl"
                />
              </motion.div>

              <h1 className="text-4xl font-bold tracking-tight mb-2">Earnity</h1>
              <p className="text-sm text-white/50 mb-8">Enter your access code to enter the protocol</p>

              <form onSubmit={handleCodeSubmit} className="space-y-3">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                  placeholder="ACCESS CODE"
                  maxLength={8}
                  className="h-14 text-center text-lg font-mono tracking-[0.2em] uppercase bg-black/50 border-white/20 text-white placeholder:text-white/30"
                  disabled={codeLoading}
                  autoFocus
                />
                {codeError && (
                  <p className="text-sm text-red-400">{codeError}</p>
                )}
                <Button
                  type="submit"
                  disabled={codeLoading || code.length < 6}
                  className="w-full h-12 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold backdrop-blur-md"
                >
                  {codeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enter"}
                </Button>
              </form>

              <p className="mt-5 text-xs text-white/30">
                Private beta — 50 access codes only
              </p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
