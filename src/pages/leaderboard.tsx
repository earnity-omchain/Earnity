import { useQuery } from "@tanstack/react-query";
import { api, queryKeys, supabase } from "@/lib/supabase";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ChevronDown, Copy, Check,
  Shield, Swords, Zap, Star, Trophy, Crown,
} from "lucide-react";

const ASSETS = {
  background: import.meta.env.BASE_URL + "background-2.png",
  logo:       import.meta.env.BASE_URL + "logo.jpg",
  fire:       import.meta.env.BASE_URL + "Fire.png",
  water:      import.meta.env.BASE_URL + "Water.png",
  nature:     import.meta.env.BASE_URL + "Nature.png",
  rock:       import.meta.env.BASE_URL + "Rock.png",
  lighting:   import.meta.env.BASE_URL + "Lightning.png",
  wind:       import.meta.env.BASE_URL + "Wind.png",
};

const ELEMENT_META: Record<string, { text: string; border: string; bg: string; img: string }> = {
  fire:      { text: "text-orange-400", border: "border-orange-500/50", bg: "bg-orange-500/15", img: ASSETS.fire     },
  water:     { text: "text-blue-400",   border: "border-blue-500/50",   bg: "bg-blue-500/15",   img: ASSETS.water    },
  nature:    { text: "text-green-400",  border: "border-green-500/50",  bg: "bg-green-500/15",  img: ASSETS.nature   },
  rock:      { text: "text-stone-400",  border: "border-stone-500/50",  bg: "bg-stone-500/15",  img: ASSETS.rock     },
  lightning: { text: "text-yellow-400", border: "border-yellow-400/50", bg: "bg-yellow-400/15", img: ASSETS.lighting },
  lighting:  { text: "text-yellow-400", border: "border-yellow-400/50", bg: "bg-yellow-400/15", img: ASSETS.lighting },
  wind:      { text: "text-sky-300",    border: "border-sky-300/50",    bg: "bg-sky-300/15",    img: ASSETS.wind     },
};

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-white">
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function ProfileMenu({ profile, full, signOut }: any) {
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

  return (
    <div ref={ref} className="relative z-50">
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition-colors">
        {full?.discord_avatar
          ? <img src={full.discord_avatar} className={`w-7 h-7 rounded-lg border ${el?.border || "border-white/20"} object-cover`} />
          : <div className={`w-7 h-7 rounded-lg border ${el?.border || "border-white/20"} bg-white/10 flex items-center justify-center text-xs font-bold text-white`}>{profile?.username?.charAt(0).toUpperCase()}</div>
        }
        <span className="text-sm text-white/80 font-medium hidden sm:block">{profile?.username}</span>
        <ChevronDown className={`w-3 h-3 text-white/40 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.96 }} transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-white/10 bg-black/90 backdrop-blur-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center gap-3">
              {full?.discord_avatar
                ? <img src={full.discord_avatar} className={`w-14 h-14 rounded-xl border-2 ${el?.border || "border-white/20"} object-cover`} />
                : <div className={`w-14 h-14 rounded-xl border-2 ${el?.border || "border-white/20"} bg-white/10 flex items-center justify-center text-xl font-bold text-white`}>{profile?.username?.charAt(0).toUpperCase()}</div>
              }
              <div>
                <div className="font-semibold text-white">{profile?.username}</div>
                {el && <div className={`flex items-center gap-1.5 text-xs ${el.text} mt-0.5`}><img src={el.img} className="w-3.5 h-3.5 object-contain" />{full.element} element</div>}
                <div className="text-xs text-white/40 mt-0.5">{full?.contribution_score?.toLocaleString() ?? 0} pts</div>
              </div>
            </div>
            {short && (
              <div className="px-4 py-3 border-b border-white/10">
                <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">Bound Wallet</div>
                <div className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2">
                  <span className="font-mono text-xs text-white/60">{short}</span>
                  <CopyBtn text={wallet} />
                </div>
              </div>
            )}
            <div className="px-4 py-3 border-b border-white/10">
              <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Inventory</div>
              <div className="grid grid-cols-4 gap-2">
                {[{icon:Shield,label:"Shields",color:"text-blue-400"},{icon:Swords,label:"Rugs",color:"text-red-400"},{icon:Zap,label:"Drain",color:"text-orange-400"},{icon:Star,label:"Shards",color:"text-yellow-400"}].map(({icon:Icon,label,color})=>(
                  <div key={label} className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/5 py-2">
                    <Icon className={`w-4 h-4 ${color}`}/><span className="text-sm font-bold text-white">0</span><span className="text-[9px] text-white/30">{label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-2">
              <button onClick={() => { signOut(); setOpen(false); }} className="w-full px-3 py-2 rounded-xl text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left">Sign Out</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Leaderboard() {
  const [, setLocation] = useLocation();
  const { session, profile, signOut } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: queryKeys.overviewStats(),
    queryFn: api.getOverviewStats,
    refetchInterval: 5000,
  });

  const { data: leaderboard } = useQuery({
    queryKey: queryKeys.leaderboard(),
    queryFn: api.getGuildLeaderboard,
    refetchInterval: 3000,
  });

  const { data: topContributors, isLoading: contribLoading } = useQuery({
    queryKey: queryKeys.topContributors(50),
    queryFn: () => api.getTopContributors(50),
    refetchInterval: 5000,
  });

  const { data: fullProfile } = useQuery({
    queryKey: ["leaderboard-profile", session?.user?.id],
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

  const hasGuilds = leaderboard && leaderboard.length > 0;

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-black text-white">
      {/* Background */}
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${ASSETS.background})` }} />
      <div className="absolute inset-0 bg-black/70" />

      {/* Top nav */}
      <nav className="relative z-20 flex items-center justify-between px-5 sm:px-10 py-4 border-b border-white/8 bg-black/20 backdrop-blur-md">
        <button onClick={() => setLocation("/")}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition-colors text-white/70 hover:text-white text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg overflow-hidden border border-white/15">
            <img src={ASSETS.logo} className="w-full h-full object-cover" />
          </div>
          <span className="text-sm font-bold tracking-tight">EARNITY</span>
        </div>

        {profile && <ProfileMenu profile={profile} full={fullProfile} signOut={signOut} />}
      </nav>

      {/* Content */}
      <div className="relative z-10 max-w-3xl mx-auto px-5 py-10 space-y-10">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs uppercase tracking-[0.2em] text-white/40 mb-2">Rankings</p>
          <h1 className="text-4xl font-bold tracking-tight">Live standings</h1>

          {/* Stats row */}
          <div className="flex flex-wrap items-center gap-6 mt-5">
            {[
              { label: "Total points", value: statsLoading ? "—" : (stats?.total_points ?? 0).toLocaleString() },
              { label: "Members",      value: statsLoading ? "—" : (stats?.total_users ?? 0).toLocaleString() },
              { label: "Contributions",value: statsLoading ? "—" : (stats?.total_contributions ?? 0).toLocaleString() },
            ].map(({ label, value }) => (
              <div key={label}>
                <span className="text-xl font-bold tabular-nums">{value}</span>
                <span className="text-white/40 text-sm ml-2">{label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── GUILD RANKING ── */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <h2 className="text-sm font-semibold uppercase tracking-widest text-white/60">Guild Ranking</h2>
          </div>

          {!hasGuilds ? (
            <div className="rounded-2xl border border-white/10 bg-white/3 backdrop-blur-md overflow-hidden">
              <div className="p-10 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center">
                  <Crown className="w-8 h-8 text-white/20" />
                </div>
                <h3 className="text-lg font-semibold text-white/60">Guild ranking under construction</h3>
                <p className="text-sm text-white/30 mt-2 max-w-xs mx-auto">
                  Guilds are being reviewed. Once approved, rankings will appear here.
                </p>
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 text-xs text-white/40">
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                  Submissions open — timer running
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/3 backdrop-blur-md overflow-hidden divide-y divide-white/8">
              {leaderboard.map((item, i) => (
                <div key={item.guild.id} className="flex items-center px-5 py-4 hover:bg-white/5 transition-colors">
                  <div className="w-10 text-sm font-mono text-white/30 tabular-nums">{String(item.rank).padStart(2, "0")}</div>
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="text-sm font-semibold truncate">{item.guild.name}</div>
                    <div className="text-xs text-white/40 mt-0.5">{item.guild.member_count} members</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm tabular-nums text-white">{item.guild.total_score.toLocaleString()}</div>
                    <div className="text-[10px] text-white/30 uppercase tracking-widest mt-0.5">pts</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.section>

        {/* ── USER RANKING ── */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold uppercase tracking-widest text-white/60">User Ranking</h2>
            <span className="ml-auto text-xs text-white/30">Top 2000 survive</span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/3 backdrop-blur-md overflow-hidden">
            {/* Column headers */}
            <div className="flex items-center gap-3 px-5 py-2.5 border-b border-white/10 text-[10px] uppercase tracking-wider text-white/30">
              <div className="w-8 text-center">#</div>
              <div className="w-9" />
              <div className="flex-1">User</div>
              <div className="w-14 text-center hidden sm:block">Refs</div>
              <div className="w-12 text-center hidden sm:block">Shards</div>
              <div className="w-28 text-right">Points</div>
            </div>

            <div className="divide-y divide-white/8">
              {contribLoading && (
                <div className="px-5 py-8 text-sm text-white/40 text-center">Loading rankings…</div>
              )}
              {!contribLoading && (!topContributors || topContributors.length === 0) && (
                <div className="px-5 py-8 text-sm text-white/40 text-center">No contributors yet — be the first.</div>
              )}
              {topContributors?.map((c) => {
                const isMe = c.user.id === profile?.id;
                const el = (c.user as any).element ? ELEMENT_META[(c.user as any).element] : null;
                const top2000 = c.rank <= 2000;
                return (
                  <div key={c.user.id} className={`flex items-center gap-3 px-5 py-3 transition-colors ${isMe ? "bg-white/8" : "hover:bg-white/4"}`}>
                    {/* Rank */}
                    <div className="w-8 text-center shrink-0">
                      {c.rank <= 3 ? (
                        <span className="text-lg">{c.rank === 1 ? "🥇" : c.rank === 2 ? "🥈" : "🥉"}</span>
                      ) : (
                        <span className="text-sm font-mono text-white/30 tabular-nums">{String(c.rank).padStart(2, "0")}</span>
                      )}
                    </div>

                    {/* Avatar */}
                    <div className="w-9 shrink-0">
                      {(c.user as any).discord_avatar ? (
                        <img
                          src={(c.user as any).discord_avatar}
                          alt=""
                          className="w-8 h-8 rounded-lg object-cover border border-white/10"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-xs font-bold text-white/60">
                          {c.user.username?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Username + Element */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium truncate ${isMe ? "text-white" : "text-white/80"}`}>
                          {c.user.username}
                        </span>
                        {isMe && (
                          <span className="text-[10px] text-white/40 border border-white/20 px-1.5 py-0.5 rounded-full shrink-0">
                            You
                          </span>
                        )}
                      </div>
                      {el && (
                        <div className={`inline-flex items-center gap-1 mt-0.5 text-[10px] ${el.text}`}>
                          <img src={el.img} className="w-3 h-3 object-contain" alt="" />
                          <span className="capitalize">{(c.user as any).element}</span>
                        </div>
                      )}
                    </div>

                    {/* Referrals */}
                    <div className="w-14 text-center shrink-0 hidden sm:block">
                      <div className="text-sm font-mono text-white/70">{(c.user as any).referral_count ?? 0}</div>
                    </div>

                    {/* Shards */}
                    <div className="w-12 text-center shrink-0 hidden sm:block">
                      <div className="text-sm font-mono text-white/70">{(c.user as any).shards ?? 0}</div>
                    </div>

                    {/* Points + Safe badge */}
                    <div className="w-28 text-right shrink-0">
                      <div className="flex items-center justify-end gap-2">
                        {top2000 && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-[10px] text-green-400">
                            ✓ Safe
                          </span>
                        )}
                        <span className="font-mono text-sm tabular-nums text-white">
                          {c.user.contribution_score.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.section>

      </div>
    </div>
  );
}
