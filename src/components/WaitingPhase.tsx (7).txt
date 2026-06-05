import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Trophy, Crown, Flame, Droplets,
  Mountain, Wind, TreePine, CloudLightning,
} from "lucide-react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { ELEMENT_META, getGuildImage, GAME_ASSETS } from "@/lib/assets";

// ── Constants ─────────────────────────────────────────────────────────────────
const FORGER_COUNT = 2706;

const ELEMENT_ICONS: Record<string, React.ReactNode> = {
  fire:      <Flame          className="w-3.5 h-3.5" />,
  water:     <Droplets       className="w-3.5 h-3.5" />,
  nature:    <TreePine       className="w-3.5 h-3.5" />,
  rock:      <Mountain       className="w-3.5 h-3.5" />,
  lightning: <CloudLightning className="w-3.5 h-3.5" />,
  wind:      <Wind           className="w-3.5 h-3.5" />,
};

const RANK_MEDAL = (i: number) =>
  i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;

// ── Animated Counter ──────────────────────────────────────────────────────────
function AnimatedCounter({ target }: { target: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const duration = 2200;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [target]);

  return (
    <span className="tabular-nums font-black"
      style={{ fontVariantNumeric: "tabular-nums" }}>
      {count.toLocaleString()}
    </span>
  );
}

// ── Particle field (pure CSS, no canvas needed) ───────────────────────────────
function Particles() {
  const dots = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 1 + Math.random() * 2,
    dur: 4 + Math.random() * 8,
    delay: Math.random() * 6,
    opacity: 0.1 + Math.random() * 0.25,
  }));
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {dots.map((d) => (
        <motion.div key={d.id}
          className="absolute rounded-full bg-green-400"
          style={{ left: `${d.x}%`, top: `${d.y}%`, width: d.size, height: d.size, opacity: d.opacity }}
          animate={{ y: [0, -30, 0], opacity: [d.opacity, d.opacity * 2.5, d.opacity] }}
          transition={{ duration: d.dur, delay: d.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// ── Guild House Button ────────────────────────────────────────────────────────
function GuildHouseButton() {
  const [showToast, setShowToast] = useState(false);

  const handleClick = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2800);
  };

  return (
    <div className="relative inline-flex flex-col items-center">
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap px-4 py-2 rounded-lg border border-green-500/30 bg-black/90 backdrop-blur-md text-xs font-mono text-green-400 uppercase tracking-widest"
            style={{ boxShadow: "0 0 20px rgba(34,197,94,0.15)" }}
          >
            🏰 Coming Soon
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={handleClick}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="relative overflow-hidden px-10 py-4 rounded-xl border border-green-500/30 bg-green-500/10 text-green-300 font-bold text-sm uppercase tracking-[0.25em] transition-colors hover:bg-green-500/15 hover:border-green-500/50"
        style={{ boxShadow: "0 0 30px rgba(34,197,94,0.08)" }}
      >
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "linear", repeatDelay: 3 }}
          style={{ background: "linear-gradient(90deg, transparent, rgba(34,197,94,0.1), transparent)" }}
        />
        🏰 Guild House
      </motion.button>
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function WaitingPhase({
  session,
  profile,
  handleSignOut,
}: {
  session: Session;
  profile: any;
  referralCodes?: any[];
  checkInStatus?: any;
  checkInOpen?: boolean;
  setCheckInOpen?: (v: boolean) => void;
  handleSignOut: () => void;
  refetchCheckIn?: () => void;
}) {
  const [, setLocation] = useLocation();
  const userId = session?.user?.id;

  // ── Top 5 guilds ────────────────────────────────────────────────────────────
  const { data: guildsRaw } = useQuery({
    queryKey: ["end-guilds"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_guilds_with_ranking");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: guildCoinTotals } = useQuery({
    queryKey: ["end-guild-coins"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("guild_id, coin_balance")
        .not("guild_id", "is", null);
      if (error) throw error;
      const totals: Record<string, number> = {};
      (data ?? []).forEach((p: any) => {
        if (p.guild_id) totals[p.guild_id] = (totals[p.guild_id] ?? 0) + (p.coin_balance ?? 0);
      });
      return totals;
    },
  });

  const topGuilds = (guildsRaw ?? [])
    .map((g: any) => ({ ...g, total_coins: guildCoinTotals?.[g.id] ?? 0 }))
    .sort((a: any, b: any) => b.total_coins - a.total_coins)
    .slice(0, 5);

  // ── Top 10 users ─────────────────────────────────────────────────────────────
  const { data: topUsers } = useQuery({
    queryKey: ["end-top-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, discord_avatar, element, contribution_score, guild_id")
        .order("contribution_score", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="relative min-h-screen text-white overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${GAME_ASSETS.background2})` }}
        />
        <div className="absolute inset-0 bg-black/75" />
        {/* green vignette glow at top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[120px] opacity-20"
          style={{ background: "radial-gradient(ellipse, #22c55e 0%, transparent 70%)" }} />
      </div>

      <Particles />

      {/* Nav */}
      <nav className="relative z-20 flex items-center justify-between px-5 sm:px-10 py-4 border-b border-white/8 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/15">
            <img src="/logo.jpg" alt="Earnity" className="w-full h-full object-cover" />
          </div>
          <span className="text-sm font-bold tracking-tight hidden sm:block">EARNITY</span>
        </div>
        <button
          onClick={handleSignOut}
          className="px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/70 hover:bg-white/8 transition-colors font-mono uppercase tracking-widest"
        >
          Sign Out
        </button>
      </nav>

      {/* ── HERO ── */}
      <div className="relative z-10 flex flex-col items-center pt-16 pb-8 px-5 text-center">

        {/* Event-over banner */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="mb-8 px-5 py-2 rounded-full border border-green-500/30 bg-green-500/10 backdrop-blur-md"
        >
          <span className="text-xs font-mono uppercase tracking-[0.25em] text-green-400">
            ✦ Earnity Portal — Officially Concluded ✦
          </span>
        </motion.div>

        {/* Main logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", damping: 18 }}
          className="relative w-32 h-32 mb-8"
        >
          <div className="absolute inset-0 rounded-full blur-3xl opacity-40"
            style={{ background: "radial-gradient(ellipse, #22c55e, transparent)" }} />
          <img src={GAME_ASSETS.seal2} alt="Earnity"
            className="w-full h-full object-contain relative z-10 drop-shadow-[0_0_40px_rgba(34,197,94,0.4)]" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="text-4xl sm:text-5xl font-black uppercase tracking-tight leading-tight mb-3"
        >
          The Portal Has Closed
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-white/45 text-sm leading-relaxed max-w-xs"
        >
          The Earnity portal is officially concluded. The forge has cooled. Those who made it through are immortalised below.
        </motion.p>
      </div>

      {/* ── FORGER COUNT ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, type: "spring", damping: 22 }}
        className="relative z-10 mx-5 sm:mx-auto sm:max-w-md mb-12"
      >
        <div
          className="rounded-2xl border border-green-500/25 bg-black/60 backdrop-blur-md p-8 text-center overflow-hidden"
          style={{ boxShadow: "0 0 60px rgba(34,197,94,0.08), inset 0 0 40px rgba(34,197,94,0.03)" }}
        >
          {/* Animated sweep */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear", repeatDelay: 4 }}
            style={{ background: "linear-gradient(90deg, transparent, rgba(34,197,94,0.07), transparent)" }}
          />
          <div className="relative z-10">
            <div className="text-[10px] text-green-500/50 uppercase tracking-[0.4em] font-mono mb-4">
              Wallets Successfully Forged
            </div>
            <div
              className="text-7xl sm:text-8xl leading-none mb-3"
              style={{ color: "#22c55e", textShadow: "0 0 60px rgba(34,197,94,0.5)" }}
            >
              <AnimatedCounter target={FORGER_COUNT} />
            </div>
            <div className="text-xs text-white/30 font-mono uppercase tracking-widest">
              Pioneers secured their GTD spot
            </div>
            <div className="mt-6 pt-5 border-t border-white/8">
              <p className="text-[11px] text-white/25 font-mono leading-relaxed">
                The remaining participants did not complete all 6 elementals before the portal closed.
                <br />See you in the Guild House.
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── TOP 5 GUILDS ── */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="relative z-10 px-5 sm:px-0 sm:max-w-2xl sm:mx-auto mb-12"
      >
        <div className="flex items-center gap-2 mb-5">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-white/60">Top 5 Guilds</h2>
          <div className="flex-1 h-px bg-white/8 ml-2" />
          <span className="text-[10px] text-white/25 font-mono">Final Standings</span>
        </div>

        <div className="space-y-3">
          {topGuilds.length === 0 && (
            <div className="text-center py-8 text-white/20 text-sm font-mono">Loading…</div>
          )}
          {topGuilds.map((guild: any, i: number) => {
            const el = ELEMENT_META[guild.element] || ELEMENT_META.fire;
            const medal = RANK_MEDAL(i);
            const isFirst = i === 0;
            return (
              <motion.div
                key={guild.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.65 + i * 0.08 }}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                  isFirst
                    ? "border-yellow-400/30 bg-yellow-500/6"
                    : `${el.border} bg-white/3`
                }`}
                style={isFirst ? { boxShadow: "0 0 30px rgba(250,204,21,0.08)" } : {}}
              >
                {/* Rank */}
                <div className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-lg font-black"
                  style={{
                    background: i === 0 ? "rgba(250,204,21,0.15)" : i === 1 ? "rgba(156,163,175,0.15)" : i === 2 ? "rgba(180,83,9,0.15)" : "rgba(255,255,255,0.05)",
                    border: i === 0 ? "1px solid rgba(250,204,21,0.3)" : i === 1 ? "1px solid rgba(156,163,175,0.3)" : i === 2 ? "1px solid rgba(180,83,9,0.3)" : "1px solid rgba(255,255,255,0.08)",
                  }}>
                  {medal ?? <span className="text-sm text-white/30 font-mono">{i + 1}</span>}
                </div>

                {/* Guild image */}
                <img
                  src={getGuildImage(guild.name, guild.element)}
                  alt={guild.name}
                  className="w-11 h-11 rounded-xl object-cover border border-white/10 shrink-0"
                />

                {/* Name + element */}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-bold truncate ${isFirst ? "text-yellow-300" : "text-white"}`}>
                    {guild.name}
                  </div>
                  <div className={`flex items-center gap-1 text-[10px] mt-0.5 ${el.text}`}>
                    {ELEMENT_ICONS[guild.element]}
                    <span className="capitalize">{el.label}</span>
                    <span className="text-white/20 mx-1">·</span>
                    <span className="text-white/30">{guild.member_count} members</span>
                  </div>
                </div>

                {/* Score */}
                <div className="text-right shrink-0">
                  <div className={`text-base font-mono font-black tabular-nums ${isFirst ? "text-yellow-300" : "text-white"}`}>
                    {(guild.total_coins ?? guild.ranking_score ?? 0).toLocaleString()}
                  </div>
                  <div className="text-[9px] text-white/25 uppercase tracking-widest mt-0.5">coins</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      {/* ── TOP 10 USERS — HONORARY MENTIONS ── */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.75 }}
        className="relative z-10 px-5 sm:px-0 sm:max-w-2xl sm:mx-auto mb-20"
      >
        <div className="flex items-center gap-2 mb-5">
          <Crown className="w-4 h-4 text-purple-400" />
          <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-white/60">
            Honorary Mentions
          </h2>
          <div className="flex-1 h-px bg-white/8 ml-2" />
          <span className="text-[10px] text-white/25 font-mono">Top 10 Players</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/3 backdrop-blur-md overflow-hidden">
          <div className="px-5 py-3 border-b border-white/8 flex items-center gap-3 text-[10px] uppercase tracking-wider text-white/25">
            <div className="w-8 text-center">#</div>
            <div className="w-9" />
            <div className="flex-1">Player</div>
            <div className="w-20 text-right">Points</div>
          </div>

          <div className="divide-y divide-white/6">
            {!topUsers && (
              <div className="py-8 text-center text-white/25 text-sm font-mono">Loading…</div>
            )}
            {topUsers?.map((user: any, i: number) => {
              const elMeta = user.element ? ELEMENT_META[user.element] : null;
              const medal = RANK_MEDAL(i);
              const isMe = user.id === profile?.id;
              const isTop3 = i < 3;

              return (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 + i * 0.04 }}
                  className={`flex items-center gap-3 px-5 py-3.5 transition-colors ${
                    isMe ? "bg-purple-500/8" : isTop3 ? "bg-white/3" : "hover:bg-white/3"
                  }`}
                >
                  {/* Rank */}
                  <div className="w-8 text-center shrink-0">
                    {medal ? (
                      <span className="text-lg leading-none">{medal}</span>
                    ) : (
                      <span className="text-xs font-mono text-white/25 tabular-nums">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="w-9 shrink-0">
                    {user.discord_avatar ? (
                      <img src={user.discord_avatar} alt=""
                        className="w-8 h-8 rounded-lg object-cover border border-white/10" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-xs font-bold text-white/50">
                        {user.username?.charAt(0)?.toUpperCase() ?? "?"}
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-sm font-semibold truncate ${isMe ? "text-purple-300" : "text-white/85"}`}>
                        {user.username}
                      </span>
                      {isMe && (
                        <span className="text-[9px] text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded-full shrink-0 bg-purple-500/10">
                          You
                        </span>
                      )}
                    </div>
                    {elMeta && (
                      <div className="flex items-center gap-1 mt-0.5 text-[10px]"
                        style={{ color: elMeta.color ?? undefined }}>
                        <img src={elMeta.img} className="w-3 h-3 object-contain" alt="" />
                        <span className="capitalize">{user.element}</span>
                      </div>
                    )}
                  </div>

                  {/* Points */}
                  <div className="w-20 text-right shrink-0">
                    <span className={`font-mono text-sm font-bold tabular-nums ${isTop3 ? "text-white" : "text-white/60"}`}>
                      {(user.contribution_score ?? 0).toLocaleString()}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
          className="mt-10 text-center"
        >
          <GuildHouseButton />
        </motion.div>
      </motion.section>
    </div>
  );
}
