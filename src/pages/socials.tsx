import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import {
  ArrowLeft, Twitter, MessageCircle, ExternalLink,
  ChevronDown, Copy, Check, Shield, Swords, Zap, Star, Users,
  CheckCircle2, Timer, Loader2,
} from "lucide-react";

const BASE = "https://gmyplyxwxmkvptimzgid.supabase.co/storage/v1/object/public/Assets/Game%20assets";
const ASSETS = {
  background: `${BASE}/background-2.png`,
  logo: import.meta.env.BASE_URL + "logo.jpg",
  fire:     `${BASE}/Fire.png`,
  water:    `${BASE}/Water.png`,
  nature:   `${BASE}/Nature.png`,
  rock:     `${BASE}/Rock.png`,
  lighting: `${BASE}/Lightning.png`,
  wind:     `${BASE}/Wind.png`,
};

const ELEMENT_META: Record<string, { text: string; border: string; bg: string; img: string }> = {
  fire:     { text: "text-orange-400", border: "border-orange-500/50", bg: "bg-orange-500/15", img: ASSETS.fire     },
  water:    { text: "text-blue-400",   border: "border-blue-500/50",   bg: "bg-blue-500/15",   img: ASSETS.water    },
  nature:   { text: "text-green-400",  border: "border-green-500/50",  bg: "bg-green-500/15",  img: ASSETS.nature   },
  rock:     { text: "text-stone-400",  border: "border-stone-500/50",  bg: "bg-stone-500/15",  img: ASSETS.rock     },
  lighting: { text: "text-yellow-400", border: "border-yellow-400/50", bg: "bg-yellow-400/15", img: ASSETS.lighting },
  wind:     { text: "text-sky-300",    border: "border-sky-300/50",    bg: "bg-sky-300/15",    img: ASSETS.wind     },
};

const FOLLOW_QUESTS = [
  { id: "follow-x",     platform: "X / Twitter", icon: Twitter,        color: "text-sky-400",    border: "border-sky-500/30",    bg: "bg-sky-500/8",    points: 100, url: "https://x.com/earnity_",          handle: "@earnity_",          desc: "Follow Earnity on X for announcements, alpha leaks, and guild war coverage." },
  { id: "join-discord", platform: "Discord",      icon: MessageCircle, color: "text-indigo-400", border: "border-indigo-500/30", bg: "bg-indigo-500/8", points: 100, url: "https://discord.gg/fSvUqwYVSy",    handle: "Earnity Community",  desc: "Join the Discord for strategy channels, guild recruitment, and live drops." },
];

const TWEET_QUESTS = [
  { id: "tweet-1", tweetId: "2049489255022375413", url: "https://x.com/i/status/2049489255022375413", actions: [{ id: "t1-like", label: "Like", points: 25 }, { id: "t1-comment", label: "Comment", points: 50 }, { id: "t1-retweet", label: "Retweet", points: 25 }] },
  { id: "tweet-2", tweetId: "2048723259009462774", url: "https://x.com/i/status/2048723259009462774", actions: [{ id: "t2-like", label: "Like", points: 25 }, { id: "t2-comment", label: "Comment", points: 50 }, { id: "t2-retweet", label: "Retweet", points: 25 }] },
  { id: "tweet-3", tweetId: "2046358679272706428", url: "https://x.com/i/status/2046358679272706428", actions: [{ id: "t3-like", label: "Like", points: 25 }, { id: "t3-comment", label: "Comment", points: 50 }, { id: "t3-retweet", label: "Retweet", points: 25 }] },
];

const CD_SECS = 60;

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-white">
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ── Twitter Embed Component ──────────────────────────────────────────────────
function TweetEmbed({ tweetId }: { tweetId: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // @ts-ignore
    if (window.twttr && window.twttr.widgets) {
      // @ts-ignore
      window.twttr.widgets.load(ref.current);
    }
  }, [tweetId]);

  return (
    <div ref={ref} className="min-h-[200px] flex items-center justify-center bg-black/20 rounded-xl border border-white/5 overflow-hidden">
      <blockquote className="twitter-tweet" data-theme="dark" data-align="center">
        <a href={`https://twitter.com/x/status/${tweetId}`} />
      </blockquote>
    </div>
  );
}

// ── Reusable countdown action ─────────────────────────────────────────────────
function CountdownAction({ actionId, label, points, openUrl, userId, onAwarded, layout = "column" }: {
  actionId: string; label: string; points: number; openUrl: string;
  userId?: string; onAwarded: (p: number) => void; layout?: "column" | "row";
}) {
  const key = `eq_${userId}_${actionId}`;
  const [state, setState] = useState<"idle" | "counting" | "done">(() =>
    typeof window !== "undefined" && localStorage.getItem(key) ? "done" : "idle"
  );
  const [secs, setSecs] = useState(CD_SECS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queryClient = useQueryClient();

  const award = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Not authenticated");
      // Use the correct RPC name from your supabase setup
      const { data, error } = await supabase.rpc("increment_score", {
        p_user_id: userId,
        p_points: points,
      });
      if (error) {
        console.error("RPC error:", error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      localStorage.setItem(key, "1");
      setState("done");
      onAwarded(points);
      queryClient.invalidateQueries({ queryKey: ["socials-profile", userId] });
      queryClient.invalidateQueries({ queryKey: ["landing-full-profile", userId] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard-profile", userId] });
    },
    onError: (err) => {
      console.error("Award failed:", err);
      // Still mark as done so user doesn't get stuck, but log it
      localStorage.setItem(key, "1");
      setState("done");
    },
  });

  const start = () => {
    if (state !== "idle" || !userId) return;
    window.open(openUrl, "_blank");
    setState("counting");
    setSecs(CD_SECS);
    timerRef.current = setInterval(() => {
      setSecs(s => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          award.mutate();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  if (layout === "row") {
    if (state === "done") return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-semibold flex-shrink-0">
        <CheckCircle2 className="w-4 h-4" /> Completed
      </div>
    );
    if (state === "counting") return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-sm font-semibold flex-shrink-0 min-w-[90px] justify-center">
        <Timer className="w-4 h-4 animate-pulse" /> {secs}s
      </div>
    );
    return (
      <button onClick={start} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/8 hover:bg-white/15 border border-white/10 text-white text-sm font-semibold transition-colors flex-shrink-0">
        Go → +{points}
      </button>
    );
  }

  // column layout (tweet actions grid)
  if (state === "done") return (
    <div className="flex flex-col items-center gap-1 py-3 bg-green-500/5">
      <CheckCircle2 className="w-4 h-4 text-green-400" />
      <span className="text-xs font-semibold text-green-400">+{points}</span>
      <span className="text-[9px] text-white/25 uppercase tracking-wide">Completed</span>
    </div>
  );
  if (state === "counting") return (
    <div className="flex flex-col items-center gap-1 py-3 bg-yellow-400/5">
      <Timer className="w-4 h-4 text-yellow-400 animate-pulse" />
      <span className="text-sm font-bold text-yellow-400 tabular-nums">{secs}s</span>
      <span className="text-[9px] text-white/30 uppercase tracking-wide">Verifying…</span>
    </div>
  );
  return (
    <button onClick={start} className="flex flex-col items-center gap-1 py-3 hover:bg-white/5 transition-colors w-full group">
      <span className="text-xs font-medium text-white/60 group-hover:text-white transition-colors">{label}</span>
      <span className="text-sm font-bold text-white">+{points}</span>
      <span className="text-[9px] text-white/25 uppercase tracking-wide">pts</span>
    </button>
  );
}

// ── Profile menu ──────────────────────────────────────────────────────────────
function ProfileMenu({ full, profile, referralCodes, signOut }: any) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const el = full?.element ? ELEMENT_META[full.element] : null;
  const wallet = full?.wallet_address;
  const short = wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : null;
  const username = full?.username ?? profile?.username ?? "?";
  const score = full?.contribution_score ?? 0;
  const activeCodes = (referralCodes ?? []).filter((c: any) => c.is_active && !c.used_by);
  const usedCodes = (referralCodes ?? []).filter((c: any) => !!c.used_by);
  return (
    <div ref={ref} className="relative z-[100]">
      <button onClick={() => setOpen(v => !v)} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition-colors">
        {full?.discord_avatar ? <img src={full.discord_avatar} className={`w-7 h-7 rounded-lg border ${el?.border || "border-white/20"} object-cover`} /> : <div className={`w-7 h-7 rounded-lg border ${el?.border || "border-white/20"} bg-white/10 flex items-center justify-center text-xs font-bold text-white`}>{username.charAt(0).toUpperCase()}</div>}
        <span className="text-sm text-white/80 font-medium hidden sm:block">{username}</span>
        <ChevronDown className={`w-3 h-3 text-white/40 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.96 }} transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-white/10 bg-black/90 backdrop-blur-2xl shadow-2xl z-[200] overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center gap-3">
              {full?.discord_avatar ? <img src={full.discord_avatar} className={`w-14 h-14 rounded-xl border-2 ${el?.border || "border-white/20"} object-cover`} /> : <div className={`w-14 h-14 rounded-xl border-2 ${el?.border || "border-white/20"} bg-white/10 flex items-center justify-center text-xl font-bold text-white`}>{username.charAt(0).toUpperCase()}</div>}
              <div className="min-w-0">
                <div className="font-semibold text-white truncate">{username}</div>
                {el && <div className={`flex items-center gap-1.5 text-xs ${el.text} mt-0.5`}><img src={el.img} className="w-3.5 h-3.5 object-contain" />{full.element} element</div>}
                <div className="text-xs text-white/40 mt-0.5">{score.toLocaleString()} pts</div>
              </div>
            </div>
            {short && <div className="px-4 py-3 border-b border-white/10"><div className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">Bound Wallet</div><div className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2"><span className="font-mono text-xs text-white/60">{short}</span><CopyBtn text={wallet} /></div></div>}
            <div className="px-4 py-3 border-b border-white/10">
              <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Inventory</div>
              <div className="grid grid-cols-4 gap-2">
                {[{icon:Shield,label:"Shields",color:"text-blue-400"},{icon:Swords,label:"Rugs",color:"text-red-400"},{icon:Zap,label:"Drain",color:"text-orange-400"},{icon:Star,label:"Shards",color:"text-yellow-400"}].map(({icon:Icon,label,color})=>(
                  <div key={label} className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/5 py-2"><Icon className={`w-4 h-4 ${color}`}/><span className="text-sm font-bold text-white">0</span><span className="text-[9px] text-white/30">{label}</span></div>
                ))}
              </div>
            </div>
            <div className="px-4 py-3 border-b border-white/10">
              <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-white/30" /><span className="text-[10px] uppercase tracking-wider text-white/40">Referral Codes</span></div><span className="text-[10px] text-white/25">+50 pts each</span></div>
              {activeCodes.length > 0 ? <div className="space-y-1.5">{activeCodes.slice(0, 3).map((c: any) => (<div key={c.code} className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2 border border-white/10"><span className="font-mono text-xs tracking-widest text-white/80">{c.code}</span><div className="flex items-center gap-1.5"><span className="text-[10px] text-green-400">Active</span><CopyBtn text={c.code} /></div></div>))}</div> : <p className="text-xs text-white/30 text-center py-2 bg-white/5 rounded-xl border border-white/8">Codes being generated…</p>}
              {usedCodes.length > 0 && <p className="text-[10px] text-white/30 mt-2 text-center">{usedCodes.length} referral{usedCodes.length !== 1 ? "s" : ""} · {usedCodes.length * 50} pts earned</p>}
            </div>
            <div className="p-2"><button onClick={() => { signOut(); setOpen(false); }} className="w-full px-3 py-2 rounded-xl text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left">Sign Out</button></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Socials() {
  const [, setLocation] = useLocation();
  const { session, profile, signOut } = useAuth();
  const [totalAwarded, setTotalAwarded] = useState(0);

  const { data: fullProfile, refetch: refetchProfile } = useQuery({
    queryKey: ["socials-profile", session?.user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles")
        .select("discord_avatar, wallet_address, element, contribution_score, username")
        .eq("id", session!.user.id).single();
      return data;
    },
    enabled: !!session?.user?.id,
  });

  const { data: referralCodes } = useQuery({
    queryKey: ["socials-referral-codes", session?.user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("invite_codes")
        .select("code, is_active, used_at, used_by")
        .eq("created_by", session!.user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!session?.user?.id,
  });

  const handleAwarded = (pts: number) => {
    setTotalAwarded(p => p + pts);
    setTimeout(() => refetchProfile(), 1500);
  };

  // Load Twitter widget script once
  useEffect(() => {
    if (!document.getElementById("twitter-widget-script")) {
      const script = document.createElement("script");
      script.id = "twitter-widget-script";
      script.src = "https://platform.twitter.com/widgets.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  return (
    <div className="min-h-[100dvh] bg-black text-white">
      {/* Dark background — no image */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.06)_0%,_transparent_60%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(249,115,22,0.04)_0%,_transparent_50%)] pointer-events-none" />

      <nav className="sticky top-0 z-40 flex items-center justify-between px-5 sm:px-10 py-4 border-b border-white/8 bg-black/70 backdrop-blur-xl">
        <button onClick={() => setLocation("/")} className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <img src={BASE + "/Seal2.png"} className="w-6 h-6 object-contain" alt="" />
          <span className="font-bold tracking-tight">EARNITY</span>
        </button>
        <span className="text-sm text-white/30 font-medium uppercase tracking-widest">Socials</span>
        {profile ? <ProfileMenu full={fullProfile} profile={profile} referralCodes={referralCodes} signOut={signOut} /> : <div className="w-24" />}
      </nav>

      <main className="relative z-10 max-w-2xl mx-auto px-5 py-12">

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs uppercase tracking-[0.2em] text-white/40 mb-2">Earn Points</p>
          <h1 className="text-4xl font-bold tracking-tight">Social Quests</h1>
          <p className="mt-3 text-white/40 text-sm leading-relaxed max-w-sm">
            Click an action → X opens → wait 60 seconds → points awarded automatically.
          </p>
          <AnimatePresence>
            {totalAwarded > 0 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/15 border border-green-500/30 text-green-400 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" /> +{totalAwarded} pts earned this session
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Follow & Join */}
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <p className="text-xs uppercase tracking-widest text-white/40 mb-4">Follow & Join</p>
          <div className="space-y-3">
            {FOLLOW_QUESTS.map((q, i) => (
              <motion.div key={q.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.07, type: "spring", damping: 22 }}
                className={`flex items-center gap-4 p-4 rounded-2xl border ${q.border} ${q.bg}`}>
                <div className={`w-11 h-11 rounded-xl border ${q.border} bg-black/40 flex items-center justify-center flex-shrink-0`}>
                  <q.icon className={`w-5 h-5 ${q.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-sm">{q.platform}</span>
                    <span className={`text-xs ${q.color}`}>{q.handle}</span>
                  </div>
                  <p className="text-xs text-white/40 mt-0.5 leading-relaxed">{q.desc}</p>
                </div>
                <CountdownAction actionId={q.id} label="Go" points={q.points} openUrl={q.url} userId={session?.user?.id} onAwarded={handleAwarded} layout="row" />
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Tweet Engagement */}
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <p className="text-xs uppercase tracking-widest text-white/40 mb-4">Tweet Engagement</p>
          <div className="space-y-6">
            {TWEET_QUESTS.map((tweet, i) => (
              <motion.div key={tweet.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.08, type: "spring", damping: 22 }}
                className="rounded-2xl border border-white/10 bg-white/4 backdrop-blur-md overflow-hidden">
                
                {/* Tweet Preview */}
                <div className="p-4 border-b border-white/8">
                  <div className="flex items-center gap-2 mb-3">
                    <Twitter className="w-4 h-4 text-sky-400" />
                    <span className="text-xs text-white/40 font-mono">Post #{tweet.tweetId}</span>
                    <a href={tweet.url} target="_blank" rel="noopener noreferrer"
                      className="ml-auto flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 transition-colors">
                      <ExternalLink className="w-3 h-3" /> Open on X
                    </a>
                  </div>
                  <TweetEmbed tweetId={tweet.tweetId} />
                </div>

                {/* Actions */}
                <div className="grid grid-cols-3 divide-x divide-white/8">
                  {tweet.actions.map(({ id: aId, label, points }) => (
                    <CountdownAction key={aId} actionId={aId} label={label} points={points} openUrl={tweet.url} userId={session?.user?.id} onAwarded={handleAwarded} layout="column" />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
          <p className="text-xs text-white/25 text-center mt-4">Each action is one-time only and persists across sessions.</p>
        </motion.section>

      </main>
    </div>
  );
}
