import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Copy, Check, ChevronDown, Wallet,
  Star, Shield, Swords, Zap, ShoppingBag, Trophy,
  LayoutDashboard, ArrowLeft, Clock,
} from "lucide-react";

const ASSETS = {
  background: import.meta.env.BASE_URL + "background-1.png",
  seal:       import.meta.env.BASE_URL + "Seal2.png",
  fire:       import.meta.env.BASE_URL + "Fire.png",
  water:      import.meta.env.BASE_URL + "Water.png",
  nature:     import.meta.env.BASE_URL + "Nature.png",
  rock:       import.meta.env.BASE_URL + "Rock.png",
  lighting:   import.meta.env.BASE_URL + "Lightning.png",
  wind:       import.meta.env.BASE_URL + "Wind.png",
};

const ELEMENT_META: Record<string, { label: string; text: string; border: string; bg: string; img: string; glow: string }> = {
  fire:     { label: "Fire",      text: "text-orange-400", border: "border-orange-500/50", bg: "bg-orange-500/15", img: ASSETS.fire,     glow: "shadow-orange-500/30" },
  water:    { label: "Water",     text: "text-blue-400",   border: "border-blue-500/50",   bg: "bg-blue-500/15",   img: ASSETS.water,    glow: "shadow-blue-500/30"   },
  nature:   { label: "Nature",    text: "text-green-400",  border: "border-green-500/50",  bg: "bg-green-500/15",  img: ASSETS.nature,   glow: "shadow-green-500/30"  },
  rock:     { label: "Rock",      text: "text-stone-400",  border: "border-stone-500/50",  bg: "bg-stone-500/15",  img: ASSETS.rock,     glow: "shadow-stone-500/30"  },
  lighting: { label: "Lightning", text: "text-yellow-400", border: "border-yellow-400/50", bg: "bg-yellow-400/15", img: ASSETS.lighting, glow: "shadow-yellow-400/30" },
  wind:     { label: "Wind",      text: "text-sky-300",    border: "border-sky-300/50",    bg: "bg-sky-300/15",    img: ASSETS.wind,     glow: "shadow-sky-300/30"    },
};

// ── Universal 6-day countdown end date ────────────────────────────────────────
// Set this once — the same deadline for everyone
// Change this to your actual launch deadline
const GUILD_SUBMISSION_DEADLINE = new Date("2026-05-10T23:59:59Z");

function useCountdown(target: Date) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const diff = target.getTime() - now;
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
        return;
      }
      setTimeLeft({
        days:    Math.floor(diff / 86400000),
        hours:   Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
        expired: false,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  return timeLeft;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1 rounded hover:bg-white/10 transition-colors text-white/40 hover:text-white">
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function ProfileDropdown({ profile, fullProfile }: any) {
  const [open, setOpen] = useState(false);
  const { signOut } = useAuth();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const el = fullProfile?.element ? ELEMENT_META[fullProfile.element] : null;
  const wallet = fullProfile?.wallet_address;
  const shortWallet = wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : null;

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 rounded-xl px-2 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
        {fullProfile?.discord_avatar ? (
          <img src={fullProfile.discord_avatar} alt={profile.username}
            className={`w-8 h-8 rounded-lg border ${el?.border || "border-white/20"} object-cover`} />
        ) : (
          <div className={`w-8 h-8 rounded-lg border ${el?.border || "border-white/20"} bg-white/10 flex items-center justify-center`}>
            <span className="text-xs font-bold text-white">{profile.username?.charAt(0).toUpperCase()}</span>
          </div>
        )}
        <span className="text-sm font-medium text-white hidden sm:block">{profile.username}</span>
        <ChevronDown className={`w-3 h-3 text-white/50 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-white/10 bg-black/80 backdrop-blur-xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                {fullProfile?.discord_avatar ? (
                  <img src={fullProfile.discord_avatar} alt={profile.username}
                    className={`w-14 h-14 rounded-xl border-2 ${el?.border || "border-white/20"} object-cover shadow-lg ${el?.glow || ""}`} />
                ) : (
                  <div className={`w-14 h-14 rounded-xl border-2 ${el?.border || "border-white/20"} bg-white/10 flex items-center justify-center`}>
                    <span className="text-xl font-bold text-white">{profile.username?.charAt(0).toUpperCase()}</span>
                  </div>
                )}
                <div>
                  <div className="font-semibold text-white">{profile.username}</div>
                  {el && (
                    <div className={`flex items-center gap-1.5 mt-1 text-xs ${el.text}`}>
                      <img src={el.img} alt={el.label} className="w-3.5 h-3.5 object-contain" />
                      {el.label} element
                    </div>
                  )}
                  <div className="text-xs text-white/40 mt-0.5">{profile.contribution_score?.toLocaleString()} pts</div>
                </div>
              </div>
            </div>

            {/* Wallet */}
            {shortWallet && (
              <div className="px-4 py-3 border-b border-white/10">
                <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">Bound Wallet</div>
                <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                  <span className="font-mono text-xs text-white/70">{shortWallet}</span>
                  <CopyButton text={wallet} />
                </div>
              </div>
            )}

            {/* Inventory preview */}
            <div className="px-4 py-3 border-b border-white/10">
              <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Inventory</div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { icon: Shield, label: "Shields", count: 0, color: "text-blue-400" },
                  { icon: Swords, label: "Rugs",    count: 0, color: "text-red-400"  },
                  { icon: Zap,    label: "Drain",   count: 0, color: "text-orange-400" },
                  { icon: Star,   label: "Shards",  count: 0, color: "text-yellow-400" },
                ].map(({ icon: Icon, label, count, color }) => (
                  <div key={label} className="flex flex-col items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-2">
                    <Icon className={`w-4 h-4 ${color}`} />
                    <span className="text-sm font-bold text-white">{count}</span>
                    <span className="text-[9px] text-white/40">{label}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-white/30 text-center mt-2">Mystery boxes unlock in Phase 2</p>
            </div>

            {/* Sign out */}
            <div className="p-2">
              <button onClick={() => { signOut(); setOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors">
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CountdownBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md flex items-center justify-center shadow-lg">
        <span className="text-2xl sm:text-3xl font-bold tabular-nums text-white">
          {String(value).padStart(2, "0")}
        </span>
      </div>
      <span className="text-[10px] uppercase tracking-widest text-white/40 mt-2">{label}</span>
    </div>
  );
}

export default function GuildWaiting() {
  const { session, profile } = useAuth();
  const [, setLocation] = useLocation();
  const countdown = useCountdown(GUILD_SUBMISSION_DEADLINE);

  const { data: fullProfile, isLoading } = useQuery({
    queryKey: ["guild-waiting-profile", session?.user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("discord_avatar, wallet_address, element, contribution_score")
        .eq("id", session!.user.id)
        .single();
      return data;
    },
    enabled: !!session?.user?.id,
  });

  if (!session || !profile) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-white/30" />
      </div>
    );
  }

  const el = (fullProfile as any)?.element ? ELEMENT_META[(fullProfile as any).element] : null;

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-black text-white">
      {/* Background */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${ASSETS.background})` }} />
      <div className="absolute inset-0 bg-black/65 backdrop-blur-[1px]" />

      {/* Top nav */}
      <div className="relative z-20">
        <div className="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-white/10 bg-black/20 backdrop-blur-md">
          {/* Left: back arrow */}
          <button onClick={() => setLocation("/")}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Center: nav links */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button onClick={() => setLocation("/dashboard")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors">
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:block">Dashboard</span>
            </button>
            <button onClick={() => setLocation("/leaderboard")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors">
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:block">Leaderboard</span>
            </button>
            <button onClick={() => setLocation("/shop")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors">
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:block">Merchant Shop</span>
            </button>
          </nav>

          {/* Right: profile dropdown */}
          {profile && (
            <ProfileDropdown profile={{ ...profile, contribution_score: (fullProfile as any)?.contribution_score ?? 0 }} fullProfile={fullProfile} />
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100dvh-73px)] px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 20 }}
          className="w-full max-w-lg text-center"
        >
          {/* Seal + element glow */}
          <div className="relative w-32 h-32 mx-auto mb-8">
            {el && (
              <div className={`absolute inset-0 rounded-full blur-2xl opacity-40 ${el.bg}`} />
            )}
            <motion.img
              src={ASSETS.seal}
              alt="Guild Seal"
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="w-full h-full object-contain relative z-10 drop-shadow-[0_0_40px_rgba(255,255,255,0.1)]"
            />
            {/* Element badge */}
            {el && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                className={`absolute -bottom-2 -right-2 w-10 h-10 rounded-full border-2 ${el.border} ${el.bg} backdrop-blur-md flex items-center justify-center z-20`}
              >
                <img src={el.img} alt={el.label} className="w-5 h-5 object-contain" />
              </motion.div>
            )}
          </div>

          {/* Title */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            {el ? (
              <>
                <div className={`text-xs uppercase tracking-widest ${el.text} mb-2`}>{el.label} element bound</div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Your path is chosen</h1>
              </>
            ) : (
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">The protocol awaits</h1>
            )}
            <p className="mt-3 text-white/50 text-sm leading-relaxed max-w-sm mx-auto">
              Guild submissions are open. Once the timer expires, the 20 guilds will be selected and the protocol begins.
            </p>
          </motion.div>

          {/* Countdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-10"
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-white/40" />
              <span className="text-xs uppercase tracking-widest text-white/40">
                {countdown.expired ? "Submissions closed" : "Guild submission closes in"}
              </span>
            </div>

            {!countdown.expired ? (
              <div className="flex items-end justify-center gap-3 sm:gap-4">
                <CountdownBlock value={countdown.days}    label="Days"    />
                <span className="text-2xl font-bold text-white/30 mb-4">:</span>
                <CountdownBlock value={countdown.hours}   label="Hours"   />
                <span className="text-2xl font-bold text-white/30 mb-4">:</span>
                <CountdownBlock value={countdown.minutes} label="Minutes" />
                <span className="text-2xl font-bold text-white/30 mb-4">:</span>
                <CountdownBlock value={countdown.seconds} label="Seconds" />
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl border border-white/10 bg-white/5 text-white/50 text-sm">
                Guild selection in progress…
              </div>
            )}
          </motion.div>

          {/* Status card */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className={`mt-8 rounded-2xl border ${el?.border || "border-white/10"} ${el?.bg || "bg-white/5"} backdrop-blur-md p-5`}
          >
            <div className="text-sm text-white/60 leading-relaxed">
              {el ? (
                <>
                  You've bound the <span className={`font-semibold ${el.text}`}>{el.label}</span> element.
                  When guilds are approved, you'll be able to join or lead a {el.label} guild.
                  Check back after the timer ends.
                </>
              ) : (
                <>
                  Your guild request has been submitted. We review all requests and select up to 20 guilds.
                  You'll be notified when your guild is approved.
                </>
              )}
            </div>
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}
