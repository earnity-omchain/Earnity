import { useQuery } from "@tanstack/react-query";
import { api, queryKeys, supabase } from "@/lib/supabase";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { motion } from "framer-motion";
import {
  ArrowLeft, Star, Trophy, Crown,
} from "lucide-react";
import { ELEMENT_META, getGuildImage, GAME_ASSETS } from "@/lib/assets";

const ASSETS = {
  background: import.meta.env.BASE_URL + "background-2.png",
  logo:       import.meta.env.BASE_URL + "logo.jpg",
};

const ELEMENT_COLORS: Record<string, string> = {
  fire: "#f97316", water: "#38bdf8", nature: "#4ade80",
  rock: "#a8a29e", lightning: "#facc15", lighting: "#facc15", wind: "#7dd3fc",
};

export default function Leaderboard() {
  const [, setLocation] = useLocation();
  const { session, profile } = useAuth();

  /* ── Guild ranking — from RPC, sorted by member coin_balance sum ── */
  const { data: guildsRaw } = useQuery({
    queryKey: ["leaderboard-guilds"],
    queryFn: async () => {
      // RPC returns ranking_score=0, so we calculate rank by member_count
      // and display coin totals pulled from profiles
      const { data, error } = await supabase.rpc("get_guilds_with_ranking");
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 15000,
  });

  /* For each guild, sum member coin_balance to get true ranking score */
  const { data: guildCoinTotals } = useQuery({
    queryKey: ["guild-coin-totals"],
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
    refetchInterval: 15000,
  });

  /* Merge and sort by total coins */
  const guilds = (guildsRaw ?? [])
    .map((g: any) => ({
      ...g,
      total_coins: guildCoinTotals?.[g.id] ?? 0,
    }))
    .sort((a: any, b: any) => b.total_coins - a.total_coins)
    .map((g: any, i: number) => ({ ...g, _rank: i + 1 }));

  /* ── User ranking — contribution_score ── */
  const { data: topUsers, isLoading: usersLoading } = useQuery({
    queryKey: ["leaderboard-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, discord_avatar, element, contribution_score, coin_balance, guild_id")
        .order("contribution_score", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 15000,
  });

  /* ── Overview stats — from profiles directly ── */
  const { data: stats } = useQuery({
    queryKey: ["leaderboard-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("contribution_score, coin_balance");
      if (error) throw error;
      const rows = data ?? [];
      return {
        total_points: rows.reduce((s: number, p: any) => s + (p.contribution_score ?? 0), 0),
        total_coins:  rows.reduce((s: number, p: any) => s + (p.coin_balance ?? 0), 0),
        total_users:  rows.length,
      };
    },
    refetchInterval: 30000,
  });

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-black text-white">
      <div className="absolute inset-0 bg-cover bg-center opacity-40"
        style={{ backgroundImage: `url(${ASSETS.background})` }} />
      <div className="absolute inset-0 bg-black/70" />

      {/* Nav */}
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
        <div className="w-24" />
      </nav>

      <div className="relative z-10 max-w-3xl mx-auto px-5 py-10 space-y-10">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs uppercase tracking-[0.2em] text-white/40 mb-2">Rankings</p>
          <h1 className="text-4xl font-bold tracking-tight">Live standings</h1>
          <div className="flex flex-wrap items-center gap-6 mt-5">
            {[
              { label: "Total points", value: (stats?.total_points ?? 0).toLocaleString() },
              { label: "Total coins",  value: (stats?.total_coins ?? 0).toLocaleString() },
              { label: "Members",      value: (stats?.total_users ?? 0).toLocaleString() },
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
            <span className="ml-auto text-xs text-white/30">Ranked by member coins</span>
          </div>

          {guilds.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/3 backdrop-blur-md p-10 text-center">
              <Crown className="w-8 h-8 text-white/20 mx-auto mb-3" />
              <p className="text-sm text-white/40">Guild rankings loading…</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/3 backdrop-blur-md overflow-hidden divide-y divide-white/8">
              {guilds.map((guild: any) => {
                const elColor = ELEMENT_COLORS[guild.element] ?? "#6b7280";
                const elMeta = ELEMENT_META[guild.element];
                const guildImg = getGuildImage(guild.name, guild.element);
                const isMyGuild = profile?.guild_id === guild.id;

                return (
                  <div key={guild.id}
                    className={`flex items-center gap-4 px-4 py-3.5 transition-colors ${isMyGuild ? "bg-white/8" : "hover:bg-white/4"}`}>

                    {/* Rank number */}
                    <div className="w-8 text-center shrink-0">
                      {guild._rank <= 3 ? (
                        <span className="text-lg">{guild._rank === 1 ? "🥇" : guild._rank === 2 ? "🥈" : "🥉"}</span>
                      ) : (
                        <span className="text-sm font-mono text-white/30">{String(guild._rank).padStart(2, "0")}</span>
                      )}
                    </div>

                    {/* Guild image */}
                    <div className="relative shrink-0">
                      <img src={guildImg} alt={guild.name}
                        className="w-11 h-11 rounded-xl object-cover border border-white/10"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = elMeta?.img ?? GAME_ASSETS.seal2;
                        }}
                      />
                      {/* Element dot */}
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-black flex items-center justify-center"
                        style={{ background: elColor }}>
                        {elMeta && (
                          <img src={elMeta.img} className="w-2.5 h-2.5 object-contain" alt="" />
                        )}
                      </div>
                    </div>

                    {/* Name + meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate text-white">{guild.name}</span>
                        {isMyGuild && (
                          <span className="text-[10px] text-white/40 border border-white/20 px-1.5 py-0.5 rounded-full shrink-0">
                            Your guild
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-white/35">
                        <span>{guild.member_count} members</span>
                        {guild.element && (
                          <>
                            <span>·</span>
                            <span style={{ color: elColor }}>{elMeta?.label ?? guild.element}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Score */}
                    <div className="text-right shrink-0">
                      <div className="font-mono text-sm tabular-nums text-white">
                        {guild.total_coins.toLocaleString()}
                      </div>
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        <img src={GAME_ASSETS.coin} className="w-3 h-3 object-contain" alt="" />
                        <span className="text-[10px] text-white/30 uppercase tracking-widest">coins</span>
                      </div>
                    </div>
                  </div>
                );
              })}
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
            {/* Headers */}
            <div className="flex items-center gap-3 px-5 py-2.5 border-b border-white/10 text-[10px] uppercase tracking-wider text-white/30">
              <div className="w-8 text-center">#</div>
              <div className="w-9" />
              <div className="flex-1">User</div>
              <div className="w-24 text-right hidden sm:block">Coins</div>
              <div className="w-24 text-right">Points</div>
            </div>

            <div className="divide-y divide-white/8">
              {usersLoading && (
                <div className="px-5 py-8 text-sm text-white/40 text-center">Loading rankings…</div>
              )}
              {!usersLoading && (!topUsers || topUsers.length === 0) && (
                <div className="px-5 py-8 text-sm text-white/40 text-center">No contributors yet.</div>
              )}
              {topUsers?.map((user: any, i: number) => {
                const rank = i + 1;
                const isMe = user.id === profile?.id;
                const elMeta = user.element ? ELEMENT_META[user.element] : null;
                const elColor = user.element ? ELEMENT_COLORS[user.element] : null;
                const top2000 = rank <= 2000;

                return (
                  <div key={user.id}
                    className={`flex items-center gap-3 px-5 py-3 transition-colors ${isMe ? "bg-white/8" : "hover:bg-white/4"}`}>

                    {/* Rank */}
                    <div className="w-8 text-center shrink-0">
                      {rank <= 3 ? (
                        <span className="text-lg">{rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}</span>
                      ) : (
                        <span className="text-sm font-mono text-white/30 tabular-nums">{String(rank).padStart(2, "0")}</span>
                      )}
                    </div>

                    {/* Avatar */}
                    <div className="w-9 shrink-0">
                      {user.discord_avatar ? (
                        <img src={user.discord_avatar} alt=""
                          className="w-8 h-8 rounded-lg object-cover border border-white/10" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-xs font-bold text-white/60">
                          {user.username?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Name + element */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium truncate ${isMe ? "text-white" : "text-white/80"}`}>
                          {user.username}
                        </span>
                        {isMe && (
                          <span className="text-[10px] text-white/40 border border-white/20 px-1.5 py-0.5 rounded-full shrink-0">
                            You
                          </span>
                        )}
                      </div>
                      {elMeta && (
                        <div className="inline-flex items-center gap-1 mt-0.5 text-[10px]" style={{ color: elColor ?? undefined }}>
                          <img src={elMeta.img} className="w-3 h-3 object-contain" alt="" />
                          <span className="capitalize">{user.element}</span>
                        </div>
                      )}
                    </div>

                    {/* Coins */}
                    <div className="w-24 text-right shrink-0 hidden sm:block">
                      <div className="flex items-center justify-end gap-1">
                        <img src={GAME_ASSETS.coin} className="w-3 h-3 object-contain" alt="" />
                        <span className="text-sm font-mono text-yellow-400 tabular-nums">
                          {(user.coin_balance ?? 0).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Points + safe badge */}
                    <div className="w-24 text-right shrink-0">
                      <div className="flex items-center justify-end gap-2">
                        {top2000 && (
                          <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-[10px] text-green-400">
                            ✓ Safe
                          </span>
                        )}
                        <span className="font-mono text-sm tabular-nums text-white">
                          {(user.contribution_score ?? 0).toLocaleString()}
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
