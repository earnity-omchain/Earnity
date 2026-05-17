export const RANK_THRESHOLDS = [
  { rank: "E" as const,   min: 100,   max: 299,    tier: 0, label: "Novice" },
  { rank: "D" as const,   min: 300,   max: 599,    tier: 1, label: "Apprentice" },
  { rank: "C" as const,   min: 600,   max: 999,    tier: 2, label: "Adept" },
  { rank: "B" as const,   min: 1000,  max: 1999,   tier: 3, label: "Elite" },
  { rank: "A" as const,   min: 2000,  max: 3499,   tier: 4, label: "Veteran" },
  { rank: "S" as const,   min: 3500,  max: 6999,   tier: 5, label: "Master" },
  { rank: "SS" as const,  min: 7000,  max: 9999,   tier: 6, label: "Legend" },
  { rank: "SSS" as const, min: 10000, max: 1000000, tier: 7, label: "Mythic" },
] as const;

export type GuildRank = typeof RANK_THRESHOLDS[number]["rank"];

export function getRankFromScore(score: number = 0) {
  if (score < 100) {
    return {
      rank: "E" as GuildRank, tier: 0, progress: Math.max(0, score) / 100,
      currentMin: 0, currentMax: 100, nextThreshold: 100,
      nextRank: "E" as GuildRank, label: "Novice",
    };
  }
  for (let i = 0; i < RANK_THRESHOLDS.length; i++) {
    const t = RANK_THRESHOLDS[i];
    if (score >= t.min && score <= t.max) {
      const next = RANK_THRESHOLDS[i + 1];
      return {
        rank: t.rank, tier: t.tier,
        progress: (score - t.min) / (t.max - t.min),
        currentMin: t.min, currentMax: t.max,
        nextThreshold: next?.min ?? null,
        nextRank: next?.rank ?? null,
        label: t.label,
      };
    }
  }
  return {
    rank: "SSS" as GuildRank, tier: 7, progress: 1,
    currentMin: 10000, currentMax: 1000000,
    nextThreshold: null, nextRank: null, label: "Mythic",
  };
}

export const RANK_COLORS: Record<<GuildRank, string> = {
  E: "#6b7280", D: "#22c55e", C: "#3b82f6", B: "#8b5cf6",
  A: "#f59e0b", S: "#ef4444", SS: "#f97316", SSS: "#fbbf24",
};

export const RANK_GLOW: Record<GuildRank, string> = {
  E: "rgba(107,114,128,0.4)", D: "rgba(34,197,94,0.4)",
  C: "rgba(59,130,246,0.4)",  B: "rgba(139,92,246,0.4)",
  A: "rgba(245,158,11,0.4)",  S: "rgba(239,68,68,0.4)",
  SS: "rgba(249,115,22,0.4)", SSS: "rgba(251,191,36,0.5)",
};

export const RANK_BUILDING_LEVEL: Record<GuildRank, number> = {
  E: 1, D: 1, C: 2, B: 2, A: 3, S: 3, SS: 4, SSS: 4,
};

export function getBuildingImage(rank: GuildRank): string {
  const lvl = RANK_BUILDING_LEVEL[rank];
  return `https://gmyplyxwxmkvptimzgid.supabase.co/storage/v1/object/public/Assets/Guild%20Leveling/Atoll-Hut-level${lvl}.png`;
}

export interface GuildStats {
  attack: number; defense: number; magic: number; hp: number; speed: number;
}

export function getGuildStats(score: number = 0): GuildStats {
  const { tier } = getRankFromScore(score);
  return {
    attack:  15 + tier * 12,
    defense: 12 + tier * 10,
    magic:   10 + tier * 14,
    hp:      100 + tier * 75,
    speed:    8 + tier * 3,
  };
}
