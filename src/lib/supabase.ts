import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  username: string;
  discord_id: string | null;
  discord_avatar: string | null;
  wallet_address: string | null;
  guild_id: string | null;
  contribution_score: number;
  created_at: string;
}

export interface Guild {
  id: string;
  name: string;
  description: string;
  element: string;
  guild_master_id: string | null;
  created_at: string;
}

export interface GuildWithStats extends Guild {
  member_count: number;
  total_score: number;
  rank: number;
}

export interface GuildDetail extends Guild {
  member_count: number;
  total_score: number;
  rank: number;
  guild_master: { username: string } | null;
  members: Array<{ id: string; username: string; contribution_score: number }>;
  top_contributors: Array<{ id: string; username: string; contribution_score: number }>;
}

export interface LeaderboardEntry {
  rank: number;
  guild: Pick<GuildWithStats, "id" | "name" | "member_count" | "total_score">;
}

export interface OverviewStats {
  total_points: number;
  total_contributions: number;
  total_users: number;
}

export interface RecentContribution {
  id: string;
  action: string;
  points: number;
  created_at: string;
  username: string;
  guild_name: string;
}

export interface TopContributor {
  rank: number;
  user: Pick<Profile, "id" | "username" | "contribution_score">;
  guild: { id: string; name: string } | null;
}

export interface InviteCode {
  code: string;
  created_by: string | null;
  used_by: string | null;
  used_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface GuildRequest {
  id: string;
  user_id: string;
  guild_name: string;
  element: string;
  x_username: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

// ── Query keys ────────────────────────────────────────────────────────────────

export const queryKeys = {
  profile: (id: string) => ["profile", id] as const,
  guilds: () => ["guilds"] as const,
  guild: (id: string) => ["guild", id] as const,
  leaderboard: () => ["leaderboard"] as const,
  overviewStats: () => ["overviewStats"] as const,
  recentContributions: (limit: number) => ["recentContributions", limit] as const,
  topContributors: (limit: number) => ["topContributors", limit] as const,
};

// ── Auth ──────────────────────────────────────────────────────────────────────

export const auth = {
  signInWithDiscord: () =>
    supabase.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    }),

  signOut: () => supabase.auth.signOut(),

  getSession: () => supabase.auth.getSession(),

  onAuthStateChange: (callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]) =>
    supabase.auth.onAuthStateChange(callback),
};

// ── API ───────────────────────────────────────────────────────────────────────

export const api = {
  getProfile: async (userId: string): Promise<Profile> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error) throw error;
    return data;
  },

  updateUsername: async (userId: string, username: string): Promise<Profile> => {
    const { data, error } = await supabase
      .from("profiles")
      .update({ username })
      .eq("id", userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  bindWallet: async (userId: string, walletAddress: string): Promise<Profile> => {
    const { data, error } = await supabase
      .from("profiles")
      .update({ wallet_address: walletAddress })
      .eq("id", userId)
      .is("wallet_address", null)
      .select()
      .single();
    if (error) throw error;
    if (!data) throw new Error("Wallet already bound or user not found");
    return data;
  },

  // ── Invite Codes ────────────────────────────────────────────────────────────

  validateInviteCode: async (code: string): Promise<InviteCode> => {
    const { data, error } = await supabase
      .from("invite_codes")
      .select("code, used_by, is_active")
      .eq("code", code.toUpperCase().trim())
      .eq("is_active", true)
      .is("used_by", null)
      .single();
    if (error || !data) throw new Error("Invalid or already used code");
    return data;
  },

  redeemInviteCode: async (code: string): Promise<{ success: boolean; error?: string; code?: string }> => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error("Not authenticated");

    const { data, error } = await supabase.rpc("redeem_invite_code", {
      p_user_id: userData.user.id,
      p_code: code,
    });
    if (error) throw error;
    return data;
  },

  // ── Guilds ──────────────────────────────────────────────────────────────────

  listGuilds: async (): Promise<GuildWithStats[]> => {
    const { data, error } = await supabase
      .from("guild_leaderboard")
      .select("*")
      .order("rank", { ascending: true });
    if (error) throw error;
    return data;
  },

  getGuild: async (id: string): Promise<GuildDetail> => {
    const [leaderboardRes, membersRes] = await Promise.all([
      supabase.from("guild_leaderboard").select("*").eq("id", id).single(),
      supabase.from("profiles").select("id, username, contribution_score").eq("guild_id", id).order("contribution_score", { ascending: false }),
    ]);
    if (leaderboardRes.error) throw leaderboardRes.error;
    if (membersRes.error) throw membersRes.error;

    const guild = leaderboardRes.data;
    const members = membersRes.data ?? [];
    let guildMaster = null;
    if (guild.guild_master_id) {
      const masterMember = members.find((m) => m.id === guild.guild_master_id);
      if (masterMember) guildMaster = { username: masterMember.username };
    }
    return { ...guild, guild_master: guildMaster, members, top_contributors: members.slice(0, 5) };
  },

  // Direct guild creation (admin use only)
  createGuild: async ({ name, element }: { name: string; element: string }): Promise<Guild> => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("guilds")
      .insert({
        name: name.trim(),
        element,
        guild_master_id: userData.user.id,
        description: `${name} — a ${element} guild`,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Submit a guild request (pending your approval, capped at 20 guilds)
  submitGuildRequest: async ({ name, element, xUsername }: {
    name: string;
    element: string;
    xUsername: string;
  }): Promise<void> => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error("Not authenticated");

    const { error } = await supabase
      .from("guild_requests")
      .insert({
        user_id: userData.user.id,
        guild_name: name.trim(),
        element,
        x_username: xUsername.replace(/^@/, "").trim(),
        status: "pending",
      });

    if (error) throw error;
  },

  joinGuild: async (userId: string, guildId: string): Promise<Profile> => {
    const { data, error } = await supabase
      .from("profiles")
      .update({ guild_id: guildId })
      .eq("id", userId)
      .is("guild_id", null)
      .select()
      .single();
    if (error) throw error;
    if (!data) throw new Error("Already in a guild");
    return data;
  },

  // ── Contributions ────────────────────────────────────────────────────────────

  createContribution: async (userId: string): Promise<RecentContribution> => {
    const { data, error } = await supabase.rpc("contribute", {
      p_user_id: userId,
      p_points: 1,
    });
    if (error) throw error;
    return data;
  },

  listRecentContributions: async (limit: number): Promise<RecentContribution[]> => {
    const { data, error } = await supabase
      .from("recent_contributions")
      .select("*")
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  // ── Leaderboard ──────────────────────────────────────────────────────────────

  getGuildLeaderboard: async (): Promise<LeaderboardEntry[]> => {
    const { data, error } = await supabase
      .from("guild_leaderboard")
      .select("*")
      .order("rank", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((g) => ({
      rank: g.rank,
      guild: { id: g.id, name: g.name, member_count: g.member_count, total_score: g.total_score },
    }));
  },

  getOverviewStats: async (): Promise<OverviewStats> => {
    const [pointsRes, contributionsRes, usersRes] = await Promise.all([
      supabase.from("profiles").select("contribution_score"),
      supabase.from("contributions").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
    ]);
    const totalPoints = (pointsRes.data ?? []).reduce((sum, p) => sum + (p.contribution_score ?? 0), 0);
    return {
      total_points: totalPoints,
      total_contributions: contributionsRes.count ?? 0,
      total_users: usersRes.count ?? 0,
    };
  },

  getTopContributors: async (limit: number): Promise<TopContributor[]> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, contribution_score, guild_id, element, discord_avatar, discord_id")
      .order("contribution_score", { ascending: false })
      .limit(limit);
    if (error) throw error;
    if (!data || data.length === 0) return [];

    const ids = data.map(p => p.id);

    // Fetch guild names separately to avoid RLS join issues
    const guildIds = [...new Set(data.map(p => p.guild_id).filter(Boolean))];
    let guildMap: Record<string, { id: string; name: string }> = {};
    if (guildIds.length > 0) {
      const { data: guildsData } = await supabase
        .from("guilds")
        .select("id, name")
        .in("id", guildIds as string[]);
      (guildsData ?? []).forEach((g: any) => { guildMap[g.id] = g; });
    }

    const { data: refData } = await supabase
      .from("invite_codes")
      .select("created_by")
      .in("created_by", ids)
      .not("used_by", "is", null);
    const refCounts: Record<string, number> = {};
    (refData ?? []).forEach((r: any) => { refCounts[r.created_by] = (refCounts[r.created_by] || 0) + 1; });

    return data.map((p, i) => ({
      rank: i + 1,
      user: {
        id: p.id, username: p.username, contribution_score: p.contribution_score ?? 0,
        discord_avatar: p.discord_avatar, discord_id: p.discord_id,
        element: p.element, referral_count: refCounts[p.id] || 0, shards: 0,
      },
      guild: p.guild_id && guildMap[p.guild_id] ? guildMap[p.guild_id] : null,
    }));
  },
};
colors text-white/40 hover:text-white"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-white/40 text-center py-3 bg-white/5 rounded-xl border border-white/10">
                        No wallet bound yet.
                      </div>
                    )}
                  </div>

                  {/* ── Inventory ── */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Gift className="w-4 h-4 text-white/40" />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">Inventory</h3>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { icon: Shield, label: "Shields", count: 0, color: "text-blue-400" },
                        { icon: Swords, label: "Rug Cards", count: 0, color: "text-red-400" },
                        { icon: Zap, label: "Drainers", count: 0, color: "text-orange-400" },
                        { icon: Star, label: "Shards", count: 0, color: "text-yellow-400" },
                      ].map(({ icon: Icon, label, count, color }) => (
                        <div key={label} className="flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 p-3">
                          <Icon className={`w-5 h-5 ${color}`} />
                          <span className="text-lg font-bold text-white">{count}</span>
                          <span className="text-[10px] text-white/40 text-center leading-tight">{label}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-white/25 text-center mt-3">
                      Mystery boxes unlock in Phase 2 — coming soon
                    </p>
                  </div>

                  {/* ── Referral Codes ── */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="w-4 h-4 text-white/40" />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">Referral Codes</h3>
                      <span className="ml-auto text-xs text-white/30">+50 pts per referral</span>
                    </div>

                    {activeCodes.length > 0 ? (
                      <div className="space-y-2">
                        {activeCodes.map((c: any) => (
                          <div key={c.code} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 border border-white/10">
                            <span className="font-mono text-sm tracking-widest text-white/80">{c.code}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-green-400">Active</span>
                              <CopyBtn text={c.code} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-white/40 text-center py-3 bg-white/5 rounded-xl border border-white/10">
                        {codesLoading ? "Loading codes…" : "Your referral codes are being generated…"}
                      </p>
                    )}

                    {usedCodes.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <p className="text-xs text-white/30 mb-2">{usedCodes.length} code{usedCodes.length > 1 ? "s" : ""} used</p>
                        <div className="space-y-1.5">
                          {usedCodes.map((c: any) => (
                            <div key={c.code} className="flex items-center justify-between px-4 py-2 rounded-lg bg-white/5 border border-white/5">
                              <span className="font-mono text-xs text-white/40 tracking-widest">{c.code}</span>
                              <span className="text-xs text-white/30">Used</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => { signOut(); onClose(); }}
                    className="w-full py-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm font-medium"
                  >
                    Sign Out
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
 refData } = await supabase
      .from("invite_codes")
      .select("created_by")
      .in("created_by", ids)
      .not("used_by", "is", null);
    const refCounts: Record<string, number> = {};
    (refData ?? []).forEach((r: any) => { refCounts[r.created_by] = (refCounts[r.created_by] || 0) + 1; });

    return (data ?? []).map((p, i) => ({
      rank: i + 1,
      user: {
        id: p.id, username: p.username, contribution_score: p.contribution_score,
        discord_avatar: p.discord_avatar, discord_id: p.discord_id,
        element: p.element, referral_count: refCounts[p.id] || 0, shards: 0,
      },
      guild: p.guilds ? { id: (p.guilds as any).id, name: (p.guilds as any).name } : null,
    }));
  },
};
