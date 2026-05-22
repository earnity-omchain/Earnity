const CDN = "https://gmyplyxwxmkvptimzgid.supabase.co/storage/v1/object/public/Assets";

const GAME          = `${CDN}/Game%20assets`;
const ELEMENTALS    = `${CDN}/Elementals`;
const GUILD_LEVELING = `${CDN}/Guild%20Leveling`;
const GUILDS        = `${CDN}/Guilds`;
const ITEMS         = `${CDN}/Items`;
const LOGO_FOLDER   = `${CDN}/Logo`;
const SHARDS        = `${CDN}/Shards`;

// ── Logo ──────────────────────────────────────────────────────────────────────
export const LOGO = `${LOGO_FOLDER}/logo.jpg`;

// ── Game assets ───────────────────────────────────────────────────────────────
export const GAME_ASSETS = {
  // Backgrounds
  background1: `${GAME}/background-1.png`,
  background2: `${GAME}/background-2.png`,

  // Seals
  seal1: `${GAME}/Seal1.png`,
  seal2: `${GAME}/Seal2.png`,

  // Mystery & item boxes
  mysteryboxClosed: `${GAME}/mysterybox-closed.png`,
  mysteryboxOpened: `${GAME}/mysterybox-opened.png`,
  itemboxClosed:    `${GAME}/itembox-closed.png`,
  itemboxOpened:    `${GAME}/itembox-opened.png`,

  // Coins
  coin:      `${GAME}/coin.png`,
  coins200:  `${GAME}/200-coins.png`,
  coins1000: `${GAME}/1000-coins.png`,
} as const;

// ── Elemental images ──────────────────────────────────────────────────────────
export const ELEMENTAL_IMAGES = {
  fire:      `${ELEMENTALS}/Fire.png`,
  water:     `${ELEMENTALS}/Water.png`,
  nature:    `${ELEMENTALS}/Nature.png`,
  rock:      `${ELEMENTALS}/Rock.png`,
  lightning: `${ELEMENTALS}/Lightning.png`,
  wind:      `${ELEMENTALS}/Wind.png`,
} as const;

// ── Elemental shards ──────────────────────────────────────────────────────────
export const SHARD_IMAGES = {
  fire:      `${SHARDS}/fire-shard.png`,
  water:     `${SHARDS}/water-shard.png`,
  nature:    `${SHARDS}/nature-shard.png`,
  rock:      `${SHARDS}/rock-shard.png`,
  lightning: `${SHARDS}/lightning-shard.png`,
  wind:      `${SHARDS}/wind-shard.png`,
  ice:       `${SHARDS}/ice-shard.png`,
} as const;

// ── Items ─────────────────────────────────────────────────────────────────────
export const ITEM_IMAGES = {
  nuke:     `${ITEMS}/Nuke.png`,
  drain:    `${ITEMS}/Drain.png`,
  rug:      `${ITEMS}/RUG.png`,
  shield:   `${ITEMS}/Shield.png`,
  hpPotion: `${ITEMS}/HP.png`,
  mpPotion: `${ITEMS}/MP.png`,
} as const;

// ── Guild Leveling ────────────────────────────────────────────────────────────
export const GUILD_LEVEL_IMAGES = {
  1: `${GUILD_LEVELING}/Atoll-Hut-level1.png`,
  2: `${GUILD_LEVELING}/Atoll-Hut-level2.png`,
  3: `${GUILD_LEVELING}/Atoll-Hut-level3.png`,
  4: `${GUILD_LEVELING}/Atoll-Hut-level4.png`,
  5: `${GUILD_LEVELING}/Atoll-Hut-level5.png`,
  6: `${GUILD_LEVELING}/Atoll-Hut-level6.png`,
  7: `${GUILD_LEVELING}/Atoll-Hut-level7.png`,
  8: `${GUILD_LEVELING}/Atoll-Hut-level8.png`,
} as const;

// ── Guild images ──────────────────────────────────────────────────────────────
export const GUILD_IMAGES: Record<string, string> = {
  "Adorable":     `${GUILDS}/Adorable.png`,
  "bao":          `${GUILDS}/bao.png`,
  "Dajjal":       `${GUILDS}/Dajjal.png`,
  "e.g.jhembut":  `${GUILDS}/e.g.jhembut.png`,
  "Enel":         `${GUILDS}/Enel.png`,
  "Firethernity": `${GUILDS}/Firethernity.png`,
  "Guga":         `${GUILDS}/Guga.png`,
  "Hubchainify":  `${GUILDS}/Hubchainify.png`,
  "Hunters":      `${GUILDS}/Hunters.png`,
  "INSIDERS":     `${GUILDS}/INSIDERS.png`,
  "Junsun工会":   `${GUILDS}/Junsun.png`,
  "meigui":       `${GUILDS}/meigui.png`,
  "Nomads":       `${GUILDS}/Nomads.png`,
  "Salvatrucha":  `${GUILDS}/Salvatrucha.png`,
  "SeaWay":       `${GUILDS}/SeaWay.png`,
  "The Matrix":   `${GUILDS}/The%20Matrix.png`,
  "V.A.N.E":      `${GUILDS}/V.A.N.E.png`,
  "致富web3":     `${GUILDS}/Web3.png`,
  "趋势":         `${GUILDS}/Trend.png`,
  "闪电":         `${GUILDS}/Lightning_.png`,
};

// ── Element metadata ──────────────────────────────────────────────────────────
export const ELEMENT_META: Record<string, {
  label: string;
  text: string;
  border: string;
  bg: string;
  glow: string;
  img: string;
  shard: string;
}> = {
  fire: {
    label: "Fire",
    text: "text-orange-400",
    border: "border-orange-500/50",
    bg: "bg-orange-500/15",
    glow: "rgba(249,115,22,0.3)",
    img: ELEMENTAL_IMAGES.fire,
    shard: SHARD_IMAGES.fire,
  },
  water: {
    label: "Water",
    text: "text-blue-400",
    border: "border-blue-500/50",
    bg: "bg-blue-500/15",
    glow: "rgba(59,130,246,0.3)",
    img: ELEMENTAL_IMAGES.water,
    shard: SHARD_IMAGES.water,
  },
  nature: {
    label: "Nature",
    text: "text-green-400",
    border: "border-green-500/50",
    bg: "bg-green-500/15",
    glow: "rgba(34,197,94,0.3)",
    img: ELEMENTAL_IMAGES.nature,
    shard: SHARD_IMAGES.nature,
  },
  rock: {
    label: "Rock",
    text: "text-stone-400",
    border: "border-stone-500/50",
    bg: "bg-stone-500/15",
    glow: "rgba(120,113,108,0.3)",
    img: ELEMENTAL_IMAGES.rock,
    shard: SHARD_IMAGES.rock,
  },
  lightning: {
    label: "Lightning",
    text: "text-yellow-400",
    border: "border-yellow-400/50",
    bg: "bg-yellow-400/15",
    glow: "rgba(250,204,21,0.3)",
    img: ELEMENTAL_IMAGES.lightning,
    shard: SHARD_IMAGES.lightning,
  },
  wind: {
    label: "Wind",
    text: "text-sky-300",
    border: "border-sky-300/50",
    bg: "bg-sky-300/15",
    glow: "rgba(125,211,252,0.3)",
    img: ELEMENTAL_IMAGES.wind,
    shard: SHARD_IMAGES.wind,
  },
  ice: {
    label: "Ice",
    text: "text-blue-200",
    border: "border-blue-300/50",
    bg: "bg-blue-300/15",
    glow: "rgba(186,230,253,0.3)",
    img: ELEMENTAL_IMAGES.water,   // no Ice.png in bucket — fallback to Water
    shard: SHARD_IMAGES.ice,
  },
};

// ── Helper: get guild image with fallback to element image ────────────────────
export function getGuildImage(guildName: string, element?: string): string {
  if (GUILD_IMAGES[guildName]) return GUILD_IMAGES[guildName];
  if (element && ELEMENT_META[element]) return ELEMENT_META[element].img;
  return GAME_ASSETS.seal2;
}

// ── Helper: get guild level image (defaults to level 1) ───────────────────────
export function getGuildLevelImage(level: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 = 1): string {
  return GUILD_LEVEL_IMAGES[level];
}
