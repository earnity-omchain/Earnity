// Local API client — replaces @workspace/api-client-react
// Adjust BASE_URL to match your backend

const BASE_URL = import.meta.env.VITE_API_URL ?? "";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  walletAddress: string;
  guildId: string | null;
  contributionScore: number;
}

export interface Guild {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  totalScore: number;
  rank: number;
  guildMasterId: string | null;
  guildMaster?: { username: string } | null;
  members: Array<{ id: string; username: string; contributionScore: number }>;
  topContributors: Array<{ id: string; username: string; contributionScore: number }>;
}

export interface LeaderboardEntry {
  rank: number;
  guild: Pick<Guild, "id" | "name" | "memberCount" | "totalScore">;
}

export interface OverviewStats {
  totalPoints: number;
  totalContributions: number;
  totalUsers: number;
}

export interface Contribution {
  id: string;
  username: string;
  guildName: string;
  action: string;
  points: number;
  createdAt: string;
}

export interface TopContributor {
  rank: number;
  user: Pick<User, "id" | "username" | "contributionScore">;
  guild: Pick<Guild, "id" | "name"> | null;
}

// ── Query keys ───────────────────────────────────────────────────────────────

export const queryKeys = {
  user: (id: string) => ["user", id] as const,
  guilds: () => ["guilds"] as const,
  guild: (id: string) => ["guild", id] as const,
  leaderboard: () => ["leaderboard"] as const,
  overviewStats: () => ["overviewStats"] as const,
  recentContributions: (limit: number) => ["recentContributions", limit] as const,
  topContributors: (limit: number) => ["topContributors", limit] as const,
};

// ── API calls ────────────────────────────────────────────────────────────────

export const api = {
  connectWallet: (body: { walletAddress: string; username: string | null }) =>
    apiFetch<User>("/api/auth/connect", { method: "POST", body: JSON.stringify(body) }),

  getUser: (id: string) =>
    apiFetch<User>(`/api/users/${id}`),

  listGuilds: () =>
    apiFetch<Guild[]>("/api/guilds"),

  getGuild: (id: string) =>
    apiFetch<Guild>(`/api/guilds/${id}`),

  joinGuild: (userId: string, guildId: string) =>
    apiFetch<User>(`/api/users/${userId}/guild`, {
      method: "POST",
      body: JSON.stringify({ guildId }),
    }),

  createContribution: (userId: string) =>
    apiFetch<Contribution>("/api/contributions", {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),

  getGuildLeaderboard: () =>
    apiFetch<LeaderboardEntry[]>("/api/leaderboard"),

  getOverviewStats: () =>
    apiFetch<OverviewStats>("/api/stats"),

  listRecentContributions: (limit: number) =>
    apiFetch<Contribution[]>(`/api/contributions/recent?limit=${limit}`),

  getTopContributors: (limit: number) =>
    apiFetch<TopContributor[]>(`/api/contributors/top?limit=${limit}`),

  updateUsername: (userId: string, username: string) =>
    apiFetch<User>(`/api/users/${userId}/username`, {
      method: "PATCH",
      body: JSON.stringify({ username }),
    }),
}; 