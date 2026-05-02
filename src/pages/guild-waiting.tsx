import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Copy, Check, ChevronDown,
  Wallet, Star, Shield, Swords, Zap, Clock,
} from "lucide-react";

const ASSETS = {
  background: import.meta.env.BASE_URL + "background-2.png",
  seal:       import.meta.env.BASE_URL + "Seal2.png",
  logo:       import.meta.env.BASE_URL + "logo.jpg",
  fire:       import.meta.env.BASE_URL + "Fire.png",
  water:      import.meta.env.BASE_URL + "Water.png",
  nature:     import.meta.env.BASE_URL + "Nature.png",
  rock:       import.meta.env.BASE_URL + "Rock.png",
  lighting:   import.meta.env.BASE_URL + "Lightning.png",
  wind:       import.meta.env.BASE_URL + "Wind.png",
};

const ELEMENT_META: Record<string, { label: string; text: string; border: string; bg: string; img: string }> = {
  fire:     { label: "Fire",      text: "text-orange-400", border: "border-orange-500/50", bg: "bg-orange-500/15", img: ASSETS.fire     },
  water:    { label: "Water",     text: "text-blue-400",   border: "border-blue-500/50",   bg: "bg-blue-500/15",   img: ASSETS.water    },
  nature:   { label: "Nature",    text: "text-green-400",  border: "border-green-500/50",  bg: "bg-green-500/15",  img: ASSETS.nature   },
  rock:     { label: "Rock",      text: "text-stone-400",  border: "border-stone-500/50",  bg: "bg-stone-500/15",  img: ASSETS.rock     },
  lighting: { label: "Lightning", text: "text-yellow-400", border: "border-yellow-400/50", bg: "bg-yellow-400/15", img: ASSETS.lighting },
  wind:     { label: "Wind",      text: "text-sky-300",    border: "border-sky-300/50",    bg: "bg-sky-300/15",    img: ASSETS.wind     },
};

// ── Universal deadline — change this to your actual date ──────────────────────
const DEADLINE = new Date("2026-05-10T23:59:59Z");

function useCountdown(target: Date) {
  const calc = () => {
    const diff = target.getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
    return {
      days:    Math.floor(diff / 86400000),
      hours:   Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
      expired: false,
    };
  };
  const [t, setT] = useState(calc);
  useEffect(() => { const id = setInterval(() => setT(calc()), 1000); return () => clearInterval(id); }, []);
  return t;
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-white">
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function Pad({ v }: { v: number }) {
  return <span className="tabular-nums">{String(v).padStart(2, "0")}</span>;
}

function ProfileMenu({ profile, full }: any) {
  const [open, setOpen] = useState(false);
  const { signOut } = useAuth();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const el = full?.element ? ELEMENT_META[full.element] : null;
  const wallet = full?.wallet_address;
  const short = wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : null;

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition-colors">
        {full?.discord_avatar
          ? <img src={full.discord_avatar} className={`w-7 h-7 rounded-lg border ${el?.border || "border-white/20"} object-cover`} />
          : <div className={`w-7 h-7 rounded-lg border ${el?.border || "border-white/20"} bg-white/10 flex items-center justify-center text-xs font-bold`}>{profile?.username?.charAt(0).toUpperCase()}</div>
        }
        <span className="text-sm text-white/80 font-medium hidden sm:block">{profile?.username}</span>
        <ChevronDown className={`w-3 h-3 text-white/40 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.96 }} transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-white/10 bg-black/85 backdrop-blur-2xl shadow-2xl z-50 overflow-hidden">

            {/* Avatar + name */}
            <div className="p-4 border-b border-white/10 flex items-center gap-3">
              {full?.discord_avatar
                ? <img src={full.discord_avatar} className={`w-14 h-14 rounded-xl border-2 ${el?.border || "border-white/20"} object-cover`} />
                : <div className={`w-14 h-14 rounded-xl border-2 ${el?.border || "border-white/20"} bg-white/10 flex items-center justify-center text-xl font-bold`}>{profile?.username?.charAt(0).toUpperCase()}</div>
              }
              <div>
                <div className="font-semibold text-white">{profile?.username}</div>
                {el && (
                  <div className={`flex items-center gap-1.5 text-xs ${el.text} mt-0.5`}>
                    <img src={el.img} className="w-3.5 h-3.5 object-contain" />
                    {el.label} element
                  </div>
                )}
                <div className="text-xs text-white/40 mt-0.5">{full?.contribution_score?.toLocaleString() ?? 0} pts</div>
              </div>
            </div>

            {/* Wallet */}
            {short && (
              <div className="px-4 py-3 border-b border-white/10">
                <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">Bound Wallet</div>
                <div className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2">
                  <span className="font-mono text-xs text-white/60">{short}</span>
                  <CopyBtn text={wallet} />
                </div>
              </div>
            )}

            {/* Inventory */}
            <div className="px-4 py-3 border-b border-white/10">
              <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Inventory</div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { icon: Shield, label: "Shields", color: "text-blue-400" },
                  { icon: Swords, label: "Rugs",    color: "text-red-400"  },
                  { icon: Zap,    label: "Drain",   color: "text-orange-400" },
                  { icon: Star,   label: "Shards",  color: "text-yellow-400" },
                ].map(({ icon: Icon, label, color }) => (
                  <div key={label} className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/5 py-2">
                    <Icon className={`w-4 h-4 ${color}`} />
                    <span className="text-sm font-bold text-white">0</span>
                    <span className="text-[9px] text-white/30">{label}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-white/25 text-center mt-2">Mystery boxes unlock in Phase 2</p>
            </div>

            <div className="p-2">
              <button onClick={() => { signOut(); setOpen(false); }}
                className="w-full px-3 py-2 rounded-xl text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left">
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function GuildWaiting() {
  const { session, profile } = useAuth();
  const [, setLocation] = useLocation();
  const cd = useCountdown(DEADLINE);

  const { data: full } = useQuery({
    queryKey: ["gw-profile", session?.user?.id],
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
    return <div className="min-h-[100dvh] flex items-center justify-center bg-black"><Loader2 className="w-8 h-8 animate-spin text-white/30" /></div>;
  }

  const el = (full as any)?.element ? ELEMENT_META[(full as any).element] : null;

  const NAV_ITEMS = [
    { label: "Leaderboard",    onClick: () => setLocation("/leaderboard") },
    { label: "Daily Drop",     onClick: () => {},                          soon: false },
    { label: "Merchant",       onClick: () => setLocation("/shop"),        soon: true  },
    { label: "Stake",          onClick: () => {},                          soon: true  },
  ];

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-black text-white select-none">

      {/* Background */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${ASSETS.background})` }} />
      {/* Dark overlay — slightly heavier */}
      <div className="absolute inset-0 bg-black/70" />

      {/* ── TOP NAV ── */}
      <nav className="relative z-20 flex items-center justify-between px-5 sm:px-10 py-4 border-b border-white/8">

        {/* Logo */}
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setLocation("/")}>
          <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/15">
            <img src={ASSETS.logo} className="w-full h-full object-cover" />
          </div>
          <span className="text-sm font-bold tracking-tight hidden sm:block">EARNITY</span>
        </div>

        {/* Nav links */}
        <div className="flex items-center gap-1 sm:gap-2">
          {NAV_ITEMS.map(({ label, onClick, soon }) => (
            <button key={label} onClick={onClick}
              className={`relative px-3 sm:px-4 py-1.5 rounded-lg text-sm transition-colors ${soon ? "text-white/30 cursor-not-allowed" : "text-white/60 hover:text-white hover:bg-white/8"}`}
              disabled={soon}
            >
              {label}
              {soon && (
                <span className="absolute -top-1.5 -right-1 text-[8px] uppercase tracking-wider bg-white/10 text-white/40 px-1 rounded-full">soon</span>
              )}
            </button>
          ))}
        </div>

        {/* Profile */}
        <ProfileMenu profile={profile} full={full} />
      </nav>

      {/* ── MAIN CONTENT ── */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100dvh-65px)] px-6 py-16 text-center">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", damping: 22 }} className="w-full max-w-md">

          {/* Seal */}
          <div className="relative w-36 h-36 mx-auto mb-10">
            {el && <div className={`absolute inset-0 rounded-full blur-3xl opacity-50 ${el.bg}`} />}
            <motion.img src={ASSETS.seal} animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="w-full h-full object-contain relative z-10 drop-shadow-[0_0_50px_rgba(255,255,255,0.08)]" />
            {el && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5, type: "spring" }}
                className={`absolute -bottom-1 -right-1 w-11 h-11 rounded-full border-2 ${el.border} ${el.bg} backdrop-blur-md flex items-center justify-center z-20`}>
                <img src={el.img} className="w-6 h-6 object-contain" />
              </motion.div>
            )}
          </div>

          {/* Heading */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
            {el
              ? <p className={`text-xs uppercase tracking-[0.2em] ${el.text} mb-3`}>{el.label} element bound</p>
              : <p className="text-xs uppercase tracking-[0.2em] text-white/40 mb-3">awaiting the protocol</p>
            }
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
              {el ? "Your path\nis chosen" : "The protocol\nawaits"}
            </h1>
            <p className="mt-4 text-white/45 text-sm leading-relaxed max-w-xs mx-auto">
              Guild submissions are open. Once the timer expires,<br />the 20 guilds will be selected and the protocol begins.
            </p>
          </motion.div>

          {/* Countdown */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-12">
            <div className="flex items-center justify-center gap-2 mb-5">
              <Clock className="w-3.5 h-3.5 text-white/30" />
              <span className="text-[11px] uppercase tracking-[0.18em] text-white/30">
                {cd.expired ? "Submissions closed" : "Guild submission closes in"}
              </span>
            </div>

            {!cd.expired ? (
              <div className="flex items-center justify-center gap-3 sm:gap-4">
                {[
                  { v: cd.days,    l: "Days"    },
                  { v: cd.hours,   l: "Hours"   },
                  { v: cd.minutes, l: "Min"     },
                  { v: cd.seconds, l: "Sec"     },
                ].map(({ v, l }, i) => (
                  <div key={l} className="flex items-center gap-3 sm:gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md flex items-center justify-center shadow-lg">
                        <span className="text-2xl sm:text-3xl font-bold"><Pad v={v} /></span>
                      </div>
                      <span className="text-[10px] uppercase tracking-widest text-white/30 mt-2">{l}</span>
                    </div>
                    {i < 3 && <span className="text-2xl font-light text-white/20 mb-5">:</span>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl border border-white/10 bg-white/5 text-white/40 text-sm">
                Guild selection in progress…
              </div>
            )}
          </motion.div>

          {/* Status pill */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className={`mt-8 inline-flex items-center gap-2 px-5 py-2.5 rounded-full border ${el?.border || "border-white/10"} ${el?.bg || "bg-white/5"} backdrop-blur-md text-sm`}>
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className={el?.text || "text-white/50"}>
              {el ? `${el.label} soul bound` : "Request submitted — pending review"}
            </span>
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}
