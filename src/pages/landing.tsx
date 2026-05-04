import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence, useAnimationFrame } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2, Shield, Swords, CheckCircle2, AlertCircle,
  Sparkles, ArrowLeft, LogIn, Copy, Check, ChevronDown,
  Star, Zap, Clock, Users,
} from "lucide-react";
import { Session } from "@supabase/supabase-js";
import { auth, api, supabase } from "@/lib/supabase";
import { DailyCheckIn } from "@/components/daily-checkin";

// ── Asset base (Supabase CDN) ─────────────────────────────────────────────────
const BASE = "https://gmyplyxwxmkvptimzgid.supabase.co/storage/v1/object/public/Assets/Game%20assets";
const ASSETS = {
  background:  `${BASE}/background-1.png`,
  background2: `${BASE}/background-2.png`,
  logo:        import.meta.env.BASE_URL + "logo.jpg",
  seal:        `${BASE}/Seal2.png`,
  fire:        `${BASE}/Fire.png`,
  water:       `${BASE}/Water.png`,
  nature:      `${BASE}/Nature.png`,
  rock:        `${BASE}/Rock.png`,
  lightning:   `${BASE}/Lightning.png`,
  wind:        `${BASE}/Wind.png`,
  coin:        `${BASE}/coin.png`,
};

type Phase = "loading" | "gate" | "code" | "validating" | "choice" | "rabel" | "pledge" | "waiting";

const ELEMENTS = [
  { id: "fire",      name: "Fire",      img: ASSETS.fire,      text: "text-orange-400", border: "border-orange-500/40", bg: "bg-orange-500/10", ring: "ring-orange-500/30",  glow: "rgba(249,115,22,0.4)"  },
  { id: "water",     name: "Water",     img: ASSETS.water,     text: "text-blue-400",   border: "border-blue-500/40",   bg: "bg-blue-500/10",   ring: "ring-blue-500/30",    glow: "rgba(59,130,246,0.4)"  },
  { id: "nature",    name: "Nature",    img: ASSETS.nature,    text: "text-green-400",  border: "border-green-500/40",  bg: "bg-green-500/10",  ring: "ring-green-500/30",   glow: "rgba(34,197,94,0.4)"   },
  { id: "rock",      name: "Rock",      img: ASSETS.rock,      text: "text-stone-400",  border: "border-stone-500/40",  bg: "bg-stone-500/10",  ring: "ring-stone-500/30",   glow: "rgba(168,162,158,0.4)" },
  { id: "lightning", name: "Lightning", img: ASSETS.lightning, text: "text-yellow-400", border: "border-yellow-400/40", bg: "bg-yellow-400/10", ring: "ring-yellow-400/30",  glow: "rgba(250,204,21,0.4)"  },
  { id: "wind",      name: "Wind",      img: ASSETS.wind,      text: "text-sky-300",    border: "border-sky-300/40",    bg: "bg-sky-300/10",    ring: "ring-sky-300/30",     glow: "rgba(125,211,252,0.4)" },
];

const DEADLINE = new Date("2026-05-10T23:59:59Z");

// ── Hooks ─────────────────────────────────────────────────────────────────────
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

// ── Helpers ───────────────────────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-white"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ── Orbiting element selector ─────────────────────────────────────────────────
function OrbitingElements({ selectedElement, onSelect }: { selectedElement: string | null; onSelect: (id: string) => void }) {
  const angleRef = useRef(0);
  const [angles, setAngles] = useState(() => ELEMENTS.map((_, i) => (i * 60 * Math.PI) / 180));
  useAnimationFrame((_, delta) => {
    angleRef.current += (delta / 1000) * 0.25;
    setAngles(ELEMENTS.map((_, i) => angleRef.current + (i * 60 * Math.PI) / 180));
  });
  const RADIUS = 130;
  return (
    <div className="relative w-[320px] h-[320px] mx-auto">
      <div className="absolute inset-0 rounded-full border border-dashed border-white/10" />
      <div className="absolute inset-8 rounded-full border border-white/5" />
      <motion.div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-28 h-28"
        animate={{ scale: [1, 1.03, 1] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
        <img src={ASSETS.seal} alt="Seal" className="w-full h-full object-contain drop-shadow-[0_0_24px_rgba(255,255,255,0.12)]" />
        {selectedElement && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute -inset-6 rounded-full blur-2xl"
            style={{ background: `radial-gradient(circle, ${ELEMENTS.find(e => e.id === selectedElement)?.glow ?? "transparent"} 0%, transparent 70%)` }} />
        )}
      </motion.div>
      {ELEMENTS.map((el, i) => {
        const x = Math.cos(angles[i]) * RADIUS;
        const y = Math.sin(angles[i]) * RADIUS;
        const isSelected = selectedElement === el.id;
        const isDimmed = selectedElement !== null && !isSelected;
        return (
          <motion.button key={el.id} onClick={() => onSelect(el.id)}
            animate={{ x, y, scale: isSelected ? 1.2 : 1, opacity: isDimmed ? 0.35 : 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[68px] h-[68px] rounded-full border-2 backdrop-blur-md flex flex-col items-center justify-center gap-1 transition-shadow cursor-pointer ${isSelected ? `${el.border} ${el.bg} shadow-lg ring-2 ${el.ring}` : "border-white/20 bg-black/50 hover:border-white/40"}`}
            style={{ boxShadow: isSelected ? `0 0 20px ${el.glow}` : undefined }}>
            <img src={el.img} alt={el.name} className="w-7 h-7 object-contain pointer-events-none"
              style={{ filter: isSelected ? "drop-shadow(0 0 6px currentColor)" : undefined }} />
            <span className={`text-[9px] font-bold tracking-wide ${isSelected ? el.text : "text-white/60"}`}>{el.name.toUpperCase()}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

// ── Inline Profile Dropdown ───────────────────────────────────────────────────
function ProfileMenu({ full, profile, referralCodes, checkInStatus, signOut }: {
  full: any;
  profile: any;
  referralCodes: any[];
  checkInStatus: any;
  signOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const el         = full?.element ? ELEMENTS.find(e => e.id === full.element) : null;
  const wallet     = full?.wallet_address;
  const short      = wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : null;
  const username   = full?.username ?? profile?.username ?? "?";
  const score      = full?.contribution_score ?? 0;
  const coins      = full?.coins ?? 0;
  const canCheckIn = checkInStatus?.can_check_in ?? false;
  const streak     = checkInStatus?.current_streak ?? 0;
  const activeCodes = (referralCodes ?? []).filter((c: any) => c.is_active && !c.used_by);
  const usedCodes   = (referralCodes ?? []).filter((c: any) => !!c.used_by);

  return (
    <div ref={ref} className="relative">
      {/* Avatar button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="relative flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition-colors"
      >
        {/* Yellow dot when check-in available */}
        {canCheckIn && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-yellow-400 border-2 border-black animate-pulse z-10" />
        )}
        {full?.discord_avatar ? (
          <img src={full.discord_avatar} className={`w-7 h-7 rounded-lg border ${el?.border ?? "border-white/20"} object-cover`} />
        ) : (
          <div className={`w-7 h-7 rounded-lg border ${el?.border ?? "border-white/20"} bg-white/10 flex items-center justify-center text-xs font-bold text-white`}>
            {username.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-sm text-white/80 font-medium hidden sm:block">{username}</span>
        <ChevronDown className={`w-3 h-3 text-white/40 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-white/10 bg-black/90 backdrop-blur-2xl shadow-2xl z-50 overflow-hidden"
          >
            {/* ── Header ── */}
            <div className="p-4 border-b border-white/10 flex items-center gap-3">
              {full?.discord_avatar ? (
                <img src={full.discord_avatar} className={`w-14 h-14 rounded-xl border-2 ${el?.border ?? "border-white/20"} object-cover`} />
              ) : (
                <div className={`w-14 h-14 rounded-xl border-2 ${el?.border ?? "border-white/20"} bg-white/10 flex items-center justify-center text-xl font-bold text-white`}>
                  {username.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="font-semibold text-white truncate">{username}</div>
                {el && (
                  <div className={`flex items-center gap-1.5 text-xs ${el.text} mt-0.5`}>
                    <img src={el.img} className="w-3.5 h-3.5 object-contain" alt="" />{el.name} element
                  </div>
                )}
              </div>
            </div>

            {/* ── Points + Coins ── */}
            <div className="grid grid-cols-2 divide-x divide-white/8 border-b border-white/10">
              <div className="py-3 text-center">
                <div className="text-base font-bold text-white tabular-nums">{score.toLocaleString()}</div>
                <div className="text-[10px] text-white/35 uppercase tracking-wider mt-0.5">Points</div>
              </div>
              <div className="py-3 text-center">
                <div className="flex items-center justify-center gap-1">
                  <img src={ASSETS.coin} className="w-4 h-4 object-contain" alt="" />
                  <span className="text-base font-bold text-yellow-400 tabular-nums">{coins.toLocaleString()}</span>
                </div>
                <div className="text-[10px] text-white/35 uppercase tracking-wider mt-0.5">Coins</div>
              </div>
            </div>

            {/* ── Streak badge (check-in is auto-popup on load) ── */}
            {streak > 0 && (
              <div className="px-4 py-3 border-b border-white/10">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-500/8 border border-orange-500/15">
                  <span className="text-base">🔥</span>
                  <div>
                    <span className="text-sm font-semibold text-orange-300">{streak} day streak</span>
                    <p className="text-[10px] text-white/30 mt-0.5">{checkInStatus?.can_check_in ? "Check-in available now" : "Come back tomorrow"}</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Wallet ── */}
            {short && (
              <div className="px-4 py-3 border-b border-white/10">
                <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">Bound Wallet</div>
                <div className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2">
                  <span className="font-mono text-xs text-white/60">{short}</span>
                  <CopyBtn text={wallet} />
                </div>
              </div>
            )}

            {/* ── Inventory ── */}
            <div className="px-4 py-3 border-b border-white/10">
              <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Inventory</div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { icon: Shield, label: "Shields",  color: "text-blue-400"   },
                  { icon: Swords, label: "Rugs",     color: "text-red-400"    },
                  { icon: Zap,    label: "Drain",    color: "text-orange-400" },
                  { icon: Star,   label: "Shards",   color: "text-yellow-400" },
                ].map(({ icon: Icon, label, color }) => (
                  <div key={label} className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/5 py-2">
                    <Icon className={`w-4 h-4 ${color}`} />
                    <span className="text-sm font-bold text-white">0</span>
                    <span className="text-[9px] text-white/30 text-center">{label}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-white/25 text-center mt-2">Mystery boxes unlock in Phase 2</p>
            </div>

            {/* ── Referral Codes ── */}
            <div className="px-4 py-3 border-b border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-white/30" />
                  <span className="text-[10px] uppercase tracking-wider text-white/40">Referral Codes</span>
                </div>
                <span className="text-[10px] text-white/25">+50 pts each</span>
              </div>
              {activeCodes.length > 0 ? (
                <div className="space-y-1.5">
                  {activeCodes.slice(0, 3).map((c: any) => (
                    <div key={c.code} className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2 border border-white/10">
                      <span className="font-mono text-xs tracking-widest text-white/80">{c.code}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-green-400">Active</span>
                        <CopyBtn text={c.code} />
                      </div>
                    </div>
                  ))}
                  {activeCodes.length > 3 && (
                    <p className="text-[10px] text-white/25 text-center">+{activeCodes.length - 3} more codes</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-white/30 text-center py-2 bg-white/5 rounded-xl border border-white/8">
                  Codes being generated…
                </p>
              )}
              {usedCodes.length > 0 && (
                <p className="text-[10px] text-white/30 mt-2 text-center">
                  {usedCodes.length} referral{usedCodes.length !== 1 ? "s" : ""} · {usedCodes.length * 50} pts earned
                </p>
              )}
            </div>

            {/* ── Sign out ── */}
            <div className="p-2">
              <button
                onClick={() => { signOut(); setOpen(false); }}
                className="w-full px-3 py-2 rounded-xl text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left"
              >
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Landing() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [guildName, setGuildName] = useState("");
  const [xUsername, setXUsername] = useState("");
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const cd = useCountdown(DEADLINE);

  // Full profile — flat select, no join to avoid RLS issues
  const { data: fullProfile } = useQuery({
    queryKey: ["landing-full-profile", session?.user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, discord_avatar, wallet_address, element, contribution_score, guild_id, coins")
        .eq("id", session!.user.id)
        .single();
      return data;
    },
    enabled: !!session?.user?.id,
    refetchInterval: 60_000,
  });

  // Referral codes — only fetch in waiting phase
  const { data: referralCodes } = useQuery({
    queryKey: ["landing-referral-codes", session?.user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("invite_codes")
        .select("code, is_active, used_at, used_by")
        .eq("created_by", session!.user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: !!session?.user?.id && phase === "waiting",
    staleTime: 60_000,
  });

  // Daily check-in status
  const { data: checkInStatus, refetch: refetchCheckIn } = useQuery({
    queryKey: ["checkin-status", session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_checkin_status", { p_user_id: session!.user.id });
      if (error) throw error;
      return data as { can_check_in: boolean; current_streak: number; next_day: number; last_checkin: string | null };
    },
    enabled: !!session?.user?.id && phase === "waiting",
    refetchInterval: 60_000,
  });

  // Auto-popup: show check-in modal 1.2s after landing if reward is waiting
  useEffect(() => {
    if (phase !== "waiting" || !checkInStatus?.can_check_in || checkInOpen) return;
    const t = setTimeout(() => setCheckInOpen(true), 1200);
    return () => clearTimeout(t);
  }, [phase, checkInStatus?.can_check_in]);

  const handleSignOut = async () => {
    await auth.signOut();
    setPhase("gate");
    setSession(null);
  };

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setSessionReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, s) => {
      if (!mounted) return;
      if (event === "SIGNED_IN") {
        setSession(s);
        setSessionReady(true);
        if (s?.user?.id) queryClient.invalidateQueries({ queryKey: ["landing-profile", s.user.id] });
      }
      if (event === "SIGNED_OUT") { setSession(null); setSessionReady(true); setPhase("gate"); }
      if (event === "INITIAL_SESSION") { setSession(s); setSessionReady(true); }
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, [queryClient]);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["landing-profile", session?.user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("guild_id, invite_code_used, username, wallet_address, element")
        .eq("id", session!.user.id)
        .single();
      return data;
    },
    enabled: !!session?.user?.id,
    retry: 5,
    retryDelay: 800,
    staleTime: 0,
  });

  useEffect(() => {
    if (!sessionReady) return;
    if (!session) { setPhase("gate"); return; }
    if (profileLoading) { setPhase("loading"); return; }
    if (!profile?.invite_code_used) { setPhase("code"); return; }
    if ((profile as any)?.element) { setPhase("waiting"); return; }
    if (!profile?.guild_id) { setPhase("choice"); return; }
    if (!profile.username || !profile.wallet_address) {
      setLocation("/connect");
    } else {
      setPhase("waiting");
    }
  }, [session, profile, sessionReady, profileLoading, setLocation]);

  const handleDiscordLogin = () => auth.signInWithDiscord();

  const validateMutation = useMutation({
    mutationFn: async (accessCode: string) => {
      if (!session?.user?.id) throw new Error("Not authenticated");
      const result = await api.redeemInviteCode(accessCode);
      if (!result.success) throw new Error(result.error || "Invalid or already used code");
      return result;
    },
    onSuccess: () => {
      setPhase("validating");
      queryClient.invalidateQueries({ queryKey: ["landing-profile", session?.user?.id] });
      setTimeout(() => setPhase("choice"), 1800);
    },
    onError: (err: Error) => { setCodeError(err.message || "Invalid access code"); },
  });

  const createGuildMutation = useMutation({
    mutationFn: ({ name, element, xUsername }: { name: string; element: string; xUsername: string }) =>
      api.submitGuildRequest({ name, element, xUsername }),
    onSuccess: () => { setPhase("waiting"); },
  });

  const savePledgeElementMutation = useMutation({
    mutationFn: async (element: string) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");
      const { error } = await supabase.from("profiles").update({ element }).eq("id", userData.user.id);
      if (error) throw error;
    },
    onSuccess: () => { setPhase("waiting"); },
  });

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError("");
    if (!code.trim()) return;
    validateMutation.mutate(code.trim());
  };

  const handleGuildSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedElement || !guildName.trim() || !xUsername.trim()) return;
    createGuildMutation.mutate({ name: guildName.trim(), element: selectedElement, xUsername: xUsername.trim() });
  };

  const selectedEl = ELEMENTS.find((e) => e.id === selectedElement);

  // ── Loading screen ──────────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div className="relative min-h-[100dvh] w-full overflow-hidden bg-black">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${ASSETS.background})` }} />
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 min-h-[100dvh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-white/40" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-black text-foreground">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${ASSETS.background})` }} />
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />

      <div className="relative z-10 min-h-[100dvh] flex flex-col">
        <AnimatePresence mode="wait">

          {/* ── GATE ─────────────────────────────────────────────────────────── */}
          {phase === "gate" && (
            <motion.div key="gate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5 }} className="flex-1 flex items-center justify-center p-6">
              <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", damping: 20, delay: 0.1 }} className="w-full max-w-sm text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }} className="w-20 h-20 mx-auto mb-6">
                  <img src={ASSETS.seal} alt="Earnity" className="w-full h-full object-contain drop-shadow-2xl" />
                </motion.div>
                <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Earnity</h1>
                <p className="text-sm text-white/50 mb-10">Private beta — invite only</p>
                <Button onClick={handleDiscordLogin}
                  className="w-full h-13 gap-2 text-sm font-semibold bg-white/10 hover:bg-white/20 border border-white/20 text-white backdrop-blur-md">
                  <LogIn className="w-4 h-4" />Sign in with Discord
                </Button>
                <p className="mt-5 text-xs text-white/30">50 access codes only. Discord required.</p>
              </motion.div>
            </motion.div>
          )}

          {/* ── CODE ─────────────────────────────────────────────────────────── */}
          {phase === "code" && (
            <motion.div key="code" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5 }} className="flex-1 flex items-center justify-center p-6">
              <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", damping: 20, delay: 0.1 }} className="w-full max-w-sm">
                <div className="text-center mb-8">
                  <h1 className="text-2xl font-bold tracking-tight text-white">Enter Access Code</h1>
                  <p className="mt-2 text-sm text-white/50">Redeem your invite to unlock the protocol.</p>
                </div>
                <form onSubmit={handleCodeSubmit} className="space-y-4">
                  <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                    placeholder="ACCESS CODE" maxLength={8}
                    className="h-14 text-center text-lg font-mono tracking-[0.25em] uppercase bg-black/50 border-white/20 text-white placeholder:text-white/30 backdrop-blur-md"
                    disabled={validateMutation.isPending} autoFocus />
                  <AnimatePresence>
                    {codeError && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }} className="flex items-center justify-center gap-2 text-sm text-red-400">
                        <AlertCircle className="w-4 h-4 shrink-0" />{codeError}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <Button type="submit"
                    className="w-full h-12 text-sm font-semibold bg-white/10 hover:bg-white/20 border border-white/20 text-white backdrop-blur-md"
                    disabled={validateMutation.isPending || code.length < 4}>
                    {validateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Redeem Code"}
                  </Button>
                </form>
              </motion.div>
            </motion.div>
          )}

          {/* ── VALIDATING ───────────────────────────────────────────────────── */}
          {phase === "validating" && (
            <motion.div key="validating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-green-400" />
                </motion.div>
                <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                  className="text-2xl font-semibold tracking-tight text-white">Code accepted</motion.h2>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
                  className="mt-3 text-sm text-white/50">Unlocking the protocol…</motion.p>
              </div>
            </motion.div>
          )}

          {/* ── CHOICE ───────────────────────────────────────────────────────── */}
          {phase === "choice" && (
            <motion.div key="choice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex items-center justify-center p-6">
              <div className="w-full max-w-3xl">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Choose your path</h2>
                  <p className="mt-3 text-white/50">How do you wish to enter the protocol?</p>
                </motion.div>
                <div className="grid md:grid-cols-2 gap-5">
                  <motion.button initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, type: "spring" }}
                    whileHover={{ scale: 1.02, y: -4 }} whileTap={{ scale: 0.98 }} onClick={() => setPhase("pledge")}
                    className="group relative text-left rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-8 hover:bg-black/60 hover:border-indigo-500/40 transition-colors">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow">
                      <Shield className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-2xl font-semibold mb-2 text-white">Pledge</h3>
                    <p className="text-sm text-white/50 leading-relaxed">Join an existing guild. Swear allegiance and fight under their banner.</p>
                    <div className="mt-6 flex items-center text-sm font-semibold text-indigo-400 group-hover:text-indigo-300">
                      Enter as member <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </motion.button>
                  <motion.button initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, type: "spring" }}
                    whileHover={{ scale: 1.02, y: -4 }} whileTap={{ scale: 0.98 }} onClick={() => setPhase("rabel")}
                    className="group relative text-left rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-8 hover:bg-black/60 hover:border-orange-500/40 transition-colors">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mb-6 shadow-lg shadow-orange-500/20 group-hover:shadow-orange-500/40 transition-shadow">
                      <Swords className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-2xl font-semibold mb-2 text-white">Rabel</h3>
                    <p className="text-sm text-white/50 leading-relaxed">Forge your own guild. Choose your element, declare your name, and establish a new faction.</p>
                    <div className="mt-6 flex items-center text-sm font-semibold text-orange-400 group-hover:text-orange-300">
                      Create guild <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── RABEL ────────────────────────────────────────────────────────── */}
          {phase === "rabel" && (
            <motion.div key="rabel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center p-6">
              <div className="w-full max-w-xl">
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
                  <button onClick={() => { setPhase("choice"); setSelectedElement(null); setGuildName(""); setXUsername(""); }}
                    className="inline-flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors mb-4">
                    <ArrowLeft className="w-3 h-3" /> Back
                  </button>
                  <h2 className="text-2xl font-bold tracking-tight text-white">Choose your element</h2>
                  <p className="mt-1 text-sm text-white/50">The force that binds your guild</p>
                </motion.div>
                <OrbitingElements selectedElement={selectedElement} onSelect={setSelectedElement} />
                <AnimatePresence>
                  {selectedElement && (
                    <motion.div initial={{ opacity: 0, y: 20, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: 20, height: 0 }} className="overflow-hidden mt-6">
                      <form onSubmit={handleGuildSubmit} className="max-w-sm mx-auto">
                        <div className={`rounded-xl border ${selectedEl?.border ?? "border-white/10"} bg-black/50 backdrop-blur-md p-5 space-y-4`}>
                          <div className="flex items-center gap-2">
                            <Sparkles className={`w-4 h-4 ${selectedEl?.text}`} />
                            <span className="text-sm font-medium text-white">{selectedEl?.name} bond selected</span>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="guild" className="text-xs uppercase tracking-wider text-white/40">Guild Name</Label>
                            <Input id="guild" value={guildName} onChange={(e) => setGuildName(e.target.value)}
                              placeholder="e.g. Emberborn"
                              className="bg-black/40 border-white/20 text-white placeholder:text-white/30 h-11"
                              disabled={createGuildMutation.isPending} maxLength={30} autoFocus />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="xusername" className="text-xs uppercase tracking-wider text-white/40">X (Twitter) Username</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">@</span>
                              <Input id="xusername" value={xUsername} onChange={(e) => setXUsername(e.target.value.replace(/^@/, ""))}
                                placeholder="yourhandle"
                                className="bg-black/40 border-white/20 text-white placeholder:text-white/30 h-11 pl-7"
                                disabled={createGuildMutation.isPending} maxLength={50} />
                            </div>
                          </div>
                          <Button type="submit" className="w-full h-11 font-semibold"
                            disabled={createGuildMutation.isPending || guildName.trim().length < 2 || !xUsername.trim()}>
                            {createGuildMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Request"}
                          </Button>
                          {createGuildMutation.isError && (
                            <p className="text-sm text-red-400 text-center">
                              {createGuildMutation.error instanceof Error ? createGuildMutation.error.message : "Failed to submit"}
                            </p>
                          )}
                        </div>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* ── PLEDGE ───────────────────────────────────────────────────────── */}
          {phase === "pledge" && (
            <motion.div key="pledge" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center p-6">
              <div className="w-full max-w-xl">
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
                  <button onClick={() => { setPhase("choice"); setSelectedElement(null); }}
                    className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-white transition-colors mb-4">
                    <ArrowLeft className="w-3 h-3" /> Back
                  </button>
                  <h2 className="text-2xl font-bold tracking-tight text-white">Choose your element</h2>
                  <p className="mt-1 text-sm text-white/50">This binds to your soul — it cannot be changed</p>
                </motion.div>
                <div className="relative w-full max-w-[380px] aspect-square mx-auto mb-8">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-4 rounded-full border border-dashed border-white/10" />
                  <motion.div animate={{ rotate: -360 }} transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-10 rounded-full border border-white/5" />
                  <motion.div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
                    animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 3, repeat: Infinity }}>
                    <div className="w-28 h-28 md:w-36 md:h-36">
                      <img src={ASSETS.seal} alt="Seal" className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.15)]" />
                    </div>
                  </motion.div>
                  {ELEMENTS.map((el, i) => {
                    const angle = (i * (360 / ELEMENTS.length) - 90) * (Math.PI / 180);
                    const radius = 125;
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;
                    const isSelected = selectedElement === el.id;
                    return (
                      <motion.button key={el.id}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: selectedElement && !isSelected ? 0.35 : 1, scale: isSelected ? 1.15 : 1, x, y }}
                        transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.3 + i * 0.08 }}
                        onClick={() => setSelectedElement(el.id)}
                        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[72px] h-[72px] rounded-full border-2 ${isSelected ? el.border : "border-white/20"} ${isSelected ? el.bg : "bg-black/50"} backdrop-blur-md flex flex-col items-center justify-center gap-1 transition-shadow ${isSelected ? `shadow-lg ${el.ring} ring-2` : "hover:border-white/40"}`}>
                        <img src={el.img} alt={el.name} className="w-7 h-7 object-contain pointer-events-none" />
                        <span className={`text-[10px] font-semibold ${el.text}`}>{el.name}</span>
                      </motion.button>
                    );
                  })}
                </div>
                <AnimatePresence>
                  {selectedElement && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-sm mx-auto">
                      <Button onClick={() => savePledgeElementMutation.mutate(selectedElement!)}
                        disabled={savePledgeElementMutation.isPending} className="w-full h-12 font-semibold">
                        {savePledgeElementMutation.isPending
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : `Pledge as ${ELEMENTS.find(e => e.id === selectedElement)?.name}`}
                      </Button>
                      {savePledgeElementMutation.isError && (
                        <p className="text-sm text-red-400 text-center mt-2">Failed to save element. Try again.</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* ── WAITING ──────────────────────────────────────────────────────── */}
          {phase === "waiting" && (
            <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex flex-col text-white"
              style={{ backgroundImage: `url(${ASSETS.background2})`, backgroundSize: "cover", backgroundPosition: "center" }}>
              <div className="absolute inset-0 bg-black/70" />

              {/* Nav */}
              <nav className="relative z-10 flex items-center justify-between px-5 sm:px-10 py-4 border-b border-white/8 bg-black/20 backdrop-blur-md flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/15">
                    <img src={ASSETS.logo} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-sm font-bold tracking-tight hidden sm:block">EARNITY</span>
                </div>

                <div className="flex items-center gap-1 sm:gap-2">
                  {[
                    { label: "Rank",     soon: false, onClick: () => setLocation("/leaderboard") },
                    { label: "Forge",    soon: false, onClick: () => setLocation("/drops") },
                    { label: "Merchant", soon: false, onClick: () => setLocation("/merchant") },
                    { label: "Socials",  soon: false, onClick: () => setLocation("/socials") },
                  ].map(({ label, soon, onClick }) => (
                    <button key={label} onClick={onClick} disabled={soon}
                      className={`relative px-3 sm:px-4 py-1.5 rounded-lg text-sm transition-colors ${soon ? "text-white/25 cursor-not-allowed" : "text-white/60 hover:text-white hover:bg-white/8"}`}>
                      {label}
                      {soon && <span className="absolute -top-1.5 -right-1 text-[8px] uppercase bg-white/10 text-white/35 px-1 rounded-full">soon</span>}
                    </button>
                  ))}
                </div>

                {session && (
                  <ProfileMenu
                    full={fullProfile}
                    profile={profile}
                    referralCodes={referralCodes ?? []}
                    checkInStatus={checkInStatus}
                    signOut={handleSignOut}
                  />
                )}
              </nav>

              {/* Hero content */}
              <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
                {(() => {
                  const el = fullProfile?.element ? ELEMENTS.find(e => e.id === fullProfile.element) : null;
                  return (
                    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ type: "spring", damping: 22 }} className="w-full max-w-md">
                      {/* Seal */}
                      <div className="relative w-36 h-36 mx-auto mb-10">
                        {el && <div className={`absolute inset-0 rounded-full blur-3xl opacity-50 ${el.bg}`} />}
                        <motion.img src={ASSETS.seal} animate={{ scale: [1, 1.04, 1] }}
                          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                          className="w-full h-full object-contain relative z-10 drop-shadow-[0_0_50px_rgba(255,255,255,0.08)]" />
                        {el && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4, type: "spring" }}
                            className={`absolute -bottom-1 -right-1 w-11 h-11 rounded-full border-2 ${el.border} ${el.bg} backdrop-blur-md flex items-center justify-center z-20`}>
                            <img src={el.img} className="w-6 h-6 object-contain" />
                          </motion.div>
                        )}
                      </div>

                      {el ? (
                        <p className={`text-xs uppercase tracking-[0.2em] ${el.text} mb-3`}>{el.name} element bound</p>
                      ) : (
                        <p className="text-xs uppercase tracking-[0.2em] text-white/40 mb-3">Ready Combatant</p>
                      )}
                      <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
                        {el ? "Your path is chosen" : "Welcome to the arena"}
                      </h1>
                      <p className="mt-4 text-white/45 text-sm leading-relaxed max-w-xs mx-auto">
                        Guild submissions are open. Once the timer expires, the 20 guilds will be selected and the protocol begins.
                      </p>

                      {/* Countdown */}
                      <div className="mt-10">
                        <div className="flex items-center justify-center gap-2 mb-5">
                          <Clock className="w-3.5 h-3.5 text-white/30" />
                          <span className="text-[11px] uppercase tracking-[0.18em] text-white/30">
                            {cd.expired ? "Submissions closed" : "Guild submission closes in"}
                          </span>
                        </div>
                        {!cd.expired ? (
                          <div className="flex items-center justify-center gap-3">
                            {[{v:cd.days,l:"Days"},{v:cd.hours,l:"Hours"},{v:cd.minutes,l:"Min"},{v:cd.seconds,l:"Sec"}].map(({v,l},i) => (
                              <div key={l} className="flex items-center gap-3">
                                <div className="flex flex-col items-center">
                                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md flex items-center justify-center">
                                    <span className="text-2xl sm:text-3xl font-bold tabular-nums">{String(v).padStart(2,"0")}</span>
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
                      </div>

                      {/* Status pill */}
                      <div className={`mt-8 inline-flex items-center gap-2 px-5 py-2.5 rounded-full border ${el?.border ?? "border-white/10"} ${el?.bg ?? "bg-white/5"} backdrop-blur-md text-sm`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        <span className={el?.text ?? "text-white/50"}>
                          {el ? `${el.name} soul bound` : "Request submitted — pending review"}
                        </span>
                      </div>
                    </motion.div>
                  );
                })()}
              </div>

              {/* Daily check-in modal */}
              {checkInOpen && session && (
                <DailyCheckIn
                  userId={session.user.id}
                  onClose={() => setCheckInOpen(false)}
                  onClaimed={() => {
                    queryClient.invalidateQueries({ queryKey: ["landing-full-profile", session.user.id] });
                    queryClient.invalidateQueries({ queryKey: ["checkin-status", session.user.id] });
                    refetchCheckIn();
                  }}
                />
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
