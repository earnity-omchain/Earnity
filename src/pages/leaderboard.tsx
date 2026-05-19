import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { motion } from "framer-motion";
import { ArrowLeft, Star, Trophy, Crown } from "lucide-react";
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
  const { profile } = useAuth();

  /* ── Real member count (no limit) ── */
  const { data: memberCount } = useQuery({
    queryKey: ["member-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 60000,
  });

  /* ── Overview stats ── */
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
      };
    },
    refetchInterval: 30000,
  });

  /* ── Guild ranking ── */
  const { data: guildsRaw } = useQuery({
    queryKey: ["leaderboard-guilds"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_guilds_with_ranking");
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 15000,
  });

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

  const guilds = (guildsRaw ?? [])
    .map((g: any) => ({ ...g, total_coins: guildCoinTotals?.[g.id] ?? 0 }))
    .sort((a: any, b: any) => b.total_coins - a.total_coins)
    .map((g: any, i: number) => ({ ...g, _rank: i + 1 }));

  /* ── User ranking ── */
  const { data: topUsers, isLoading: usersLoading } = useQuery({
    queryKey: ["leaderboard-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, discord_avatar, element, contribution_score, guild_id")
        .order("contribution_score", { ascending: false })
        .limit(100);
      if (error) throw error;
      const users = data ?? [];
      const ids = users.map((u: any) => u.id);
      if (ids.length === 0) return [];

      const { data: refData } = await supabase
        .from("invite_codes")
        .select("created_by")
        .in("created_by", ids)
        .not("used_by", "is", null);

      const refCounts: Record<string, number> = {};
      (refData ?? []).forEach((r: any) => {
        refCounts[r.created_by] = (refCounts[r.created_by] ?? 0) + 1;
      });

      return users.map((u: any) => ({
        ...u,
        referral_count: refCounts[u.id] ?? 0,
      }));
    },
    refetchInterval: 15000,
  });

  /* ── My full stats — fresh DB fetch, NOT stale auth context ── */
  const { data: myStats } = useQuery({
    queryKey: ["my-leaderboard-stats", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;

      // Fresh row — auth context contribution_score can lag
      const { data: me, error: meErr } = await supabase
        .from("profiles")
        .select("id, username, discord_avatar, element, contribution_score")
        .eq("id", profile.id)
        .single();
      if (meErr || !me) throw meErr ?? new Error("no profile");

      // Real rank: count users strictly ahead
      const { count: higherCount, error: rankErr } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gt("contribution_score", me.contribution_score ?? 0);
      if (rankErr) throw rankErr;

      // Referral count
      const { count: refCount, error: refErr } = await supabase
        .from("invite_codes")
        .select("id", { count: "exact", head: true })
        .eq("created_by", profile.id)
        .not("used_by", "is", null);
      if (refErr) throw refErr;

      return {
        ...me,
        rank: (higherCount ?? 0) + 1,
        referral_count: refCount ?? 0,
      };
    },
    enabled: !!profile?.id,
    refetchInterval: 15000,
  });

  const isSafe = myStats ? myStats.rank <= 2000 : false;

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
              { label: "Total coins",  value: (stats?.total_coins  ?? 0).toLocaleString() },
              { label: "Members",      value: (memberCount         ?? 0).toLocaleString() },
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
                const elColor  = ELEMENT_COLORS[guild.element] ?? "#6b7280";
                const elMeta   = ELEMENT_META[guild.element];
                const guildImg = getGuildImage(guild.name, guild.element);
                const isMyGuild = profile?.guild_id === guild.id;

                return (
                  <div key={guild.id}
                    className={`flex items-center gap-4 px-4 py-3.5 transition-colors ${isMyGuild ? "bg-white/8" : "hover:bg-white/4"}`}>
                    <div className="w-8 text-center shrink-0">
                      {guild._rank <= 3 ? (
                        <span className="text-lg">{guild._rank === 1 ? "🥇" : guild._rank === 2 ? "🥈" : "🥉"}</span>
                      ) : (
                        <span className="text-sm font-mono text-white/30">{String(guild._rank).padStart(2, "0")}</span>
                      )}
                    </div>
                    <div className="relative shrink-0">
                      <img src={guildImg} alt={guild.name}
                        className="w-11 h-11 rounded-xl object-cover border border-white/10"
                        onError={(e) => { (e.target as HTMLImageElement).src = elMeta?.img ?? GAME_ASSETS.seal2; }}
                      />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-black flex items-center justify-center"
                        style={{ background: elColor }}>
                        {elMeta && <img src={elMeta.img} className="w-2.5 h-2.5 object-contain" alt="" />}
                      </div>
                    </div>
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
                          <><span>·</span>
                          <span style={{ color: elColor }}>{elMeta?.label ?? guild.element}</span></>
                        )}
                      </div>
                    </div>
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

          {/* ── STICKY YOUR-RANK CARD ──────────────────────────────────
              Key fixes vs previous version:
              1. top-[64px] sticks below nav, not behind it
              2. Uses myStats (fresh DB) not profile (stale auth context)
              3. Refs + Points labels always rendered — no hidden sm:block
              4. Points shows myStats.contribution_score, not profile's
          ──────────────────────────────────────────────────────────── */}
          {profile && (
            <div className="sticky top-[64px] z-30 mb-4">
              <div className="rounded-xl border border-blue-500/30 bg-blue-950/70 backdrop-blur-xl px-4 py-3 shadow-xl shadow-blue-950/50">
                <div className="flex items-center gap-3">

                  {/* Rank */}
                  <div className="w-8 text-center shrink-0">
                    {myStats && myStats.rank <= 3 ? (
                      <span className="text-lg">
                        {myStats.rank === 1 ? "🥇" : myStats.rank === 2 ? "🥈" : "🥉"}
                      </span>
                    ) : (
                      <span className="text-sm font-mono text-white/60 tabular-nums">
                        {myStats ? String(myStats.rank).padStart(2, "0") : "—"}
                      </span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="shrink-0">
                    {profile.discord_avatar ? (
                      <img src={profile.discord_avatar} alt=""
                        className="w-8 h-8 rounded-lg object-cover border border-white/20" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-300">
                        {profile.username?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Name + element */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold truncate text-white">{profile.username}</span>
                      <span className="text-[10px] text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded-full shrink-0 bg-blue-500/10">
                        You
                      </span>
                    </div>
                    {profile.element && ELEMENT_META[profile.element] && (
                      <div className="inline-flex items-center gap-1 mt-0.5 text-[10px]"
                        style={{ color: ELEMENT_COLORS[profile.element] }}>
                        <img src={ELEMENT_META[profile.element].img} className="w-3 h-3 object-contain" alt="" />
                        <span className="capitalize">{profile.element}</span>
                      </div>
                    )}
                  </div>

                  {/* Refs — always visible, labelled */}
                  <div className="text-center shrink-0">
                    <div className="text-[9px] text-white/30 uppercase tracking-wider">Refs</div>
                    <div className="text-sm font-mono text-white/80 tabular-nums">
                      {myStats ? (myStats.referral_count > 0 ? myStats.referral_count : "—") : "—"}
                    </div>
                  </div>

                  {/* Points — always visible, labelled, from fresh fetch */}
                  <div className="text-right shrink-0">
                    <div className="text-[9px] text-white/30 uppercase tracking-wider">Points</div>
                    <div className="flex items-center justify-end gap-1.5 mt-0.5">
                      {isSafe && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-[10px] text-green-400 whitespace-nowrap">
                          ✓ Safe
                        </span>
                      )}
                      <span className="font-mono text-sm tabular-nums text-white font-bold">
                        {myStats
                          ? (myStats.contribution_score ?? 0).toLocaleString()
                          : (profile.contribution_score ?? 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* List */}
          <div className="rounded-2xl border border-white/10 bg-white/3 backdrop-blur-md overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-2.5 border-b border-white/10 text-[10px] uppercase tracking-wider text-white/30">
              <div className="w-8 text-center">#</div>
              <div className="w-9" />
              <div className="flex-1">User</div>
              <div className="w-16 text-center hidden sm:block">Refs</div>
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
                const rank    = i + 1;
                const isMe    = user.id === profile?.id;
                const elMeta  = user.element ? ELEMENT_META[user.element] : null;
                const elColor = user.element ? ELEMENT_COLORS[user.element] : null;
                const top2000 = rank <= 2000;

                return (
                  <div key={user.id}
                    className={`flex items-center gap-3 px-5 py-3 transition-colors ${isMe ? "bg-white/8" : "hover:bg-white/4"}`}>
                    <div className="w-8 text-center shrink-0">
                      {rank <= 3 ? (
                        <span className="text-lg">{rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}</span>
                      ) : (
                        <span className="text-sm font-mono text-white/30 tabular-nums">{String(rank).padStart(2, "0")}</span>
                      )}
                    </div>
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
                        <div className="inline-flex items-center gap-1 mt-0.5 text-[10px]"
                          style={{ color: elColor ?? undefined }}>
                          <img src={elMeta.img} className="w-3 h-3 object-contain" alt="" />
                          <span className="capitalize">{user.element}</span>
                        </div>
                      )}
                    </div>
                    <div className="w-16 text-center shrink-0 hidden sm:block">
                      <span className="text-sm font-mono text-white/60">
                        {user.referral_count > 0 ? user.referral_count : "—"}
                      </span>
                    </div>
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
