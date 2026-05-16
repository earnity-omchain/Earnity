const CDN = "https://gmyplyxwxmkvptimzgid.supabase.co/storage/v1/object/public/Assets";
const GAME = `${CDN}/Game%20assets`;
const GUILDS = `${CDN}/Guilds`;
const ITEMS = `${CDN}/Items`;
const SHARDS = `${CDN}/Shards`;

// ── Game assets ───────────────────────────────────────────────────────────────
export const GAME_ASSETS = {
  // Backgrounds
  background1: `${GAME}/background-1.png`,
  background2: `${GAME}/background-2.png`,

  // Seals
  seal1: `${GAME}/Seal1.png`,
  seal2: `${GAME}/Seal2.png`,

  // Elementals
  fire:      `${GAME}/Fire.png`,
  water:     `${GAME}/Water.png`,
  nature:    `${GAME}/Nature.png`,
  rock:      `${GAME}/Rock.png`,
  lightning: `${GAME}/Lightning.png`,
  wind:      `${GAME}/Wind.png`,

  // Elemental shards
  shardFire:      `${SHARDS}/fire-shard.png`,
  shardWater:     `${SHARDS}/water-shard.png`,
  shardNature:    `${SHARDS}/nature-shard.png`,
  shardRock:      `${SHARDS}/rock-shard.png`,
  shardLightning: `${SHARDS}/lightning-shard.png`,
  shardWind:      `${SHARDS}/wind-shard.png`,
  shardIce:       `${SHARDS}/ice-shard.png`,

  // Items
  nuke:     `${ITEMS}/Nuke.png`,
  drain:    `${ITEMS}/Drain.png`,
  rug:      `${ITEMS}/RUG.png`,
  shield:   `${ITEMS}/Shield.png`,
  hpPotion: `${ITEMS}/HP.png`,
  mpPotion: `${ITEMS}/MP.png`,

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

// ── Guild images ──────────────────────────────────────────────────────────────
export const GUILD_IMAGES: Record<string, string> = {
  "Emberborn":    `${GUILDS}/Emberborn.png`,
  "Junsun工会":   `${GUILDS}/Junsun.png`,
  "The Matrix":   `${GUILDS}/The%20Matrix.png`,
  "Salvatrucha":  `${GUILDS}/Salvatrucha.png`,
  "致富web3":     `${GUILDS}/Web3.png`,
  "Firethernity": `${GUILDS}/Firethernity.png`,
  "Dajjal":       `${GUILDS}/Dajjal.png`,
  "V.A.N.E":      `${GUILDS}/V.A.N.E.png`,
  "闪电":         `${GUILDS}/Lightning_.png`,
  "jhembut":      `${GUILDS}/jhembut.png`,
  "趋势":         `${GUILDS}/Trend.png`,
  "SeaWay":       `${GUILDS}/SeaWay.png`,
  "meigui":       `${GUILDS}/meigui.png`,
  "Insiders":     `${GUILDS}/Insiders.png`,
  "bao":          `${GUILDS}/bao.png`,
  "Enel":         `${GUILDS}/Enel.png`,
  "Hubchainify":  `${GUILDS}/Hubchainify.png`,
  "Hunters":      `${GUILDS}/Hunters.png`,
  "Adorable":     `${GUILDS}/Adorable.png`,
  "Nomads":       `${GUILDS}/Nomads.png`,
  "Bestas Feras": `${GUILDS}/Bestas%20Feras.png`,
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
    img: GAME_ASSETS.fire,
    shard: GAME_ASSETS.shardFire,
  },
  water: {
    label: "Water",
    text: "text-blue-400",
    border: "border-blue-500/50",
    bg: "bg-blue-500/15",
    glow: "rgba(59,130,246,0.3)",
    img: GAME_ASSETS.water,
    shard: GAME_ASSETS.shardWater,
  },
  nature: {
    label: "Nature",
    text: "text-green-400",
    border: "border-green-500/50",
    bg: "bg-green-500/15",
    glow: "rgba(34,197,94,0.3)",
    img: GAME_ASSETS.nature,
    shard: GAME_ASSETS.shardNature,
  },
  rock: {
    label: "Rock",
    text: "text-stone-400",
    border: "border-stone-500/50",
    bg: "bg-stone-500/15",
    glow: "rgba(120,113,108,0.3)",
    img: GAME_ASSETS.rock,
    shard: GAME_ASSETS.shardRock,
  },
  lighting: {
    label: "Lightning",
    text: "text-yellow-400",
    border: "border-yellow-400/50",
    bg: "bg-yellow-400/15",
    glow: "rgba(250,204,21,0.3)",
    img: GAME_ASSETS.lightning,
    shard: GAME_ASSETS.shardLightning,
  },
  lightning: {
    label: "Lightning",
    text: "text-yellow-400",
    border: "border-yellow-400/50",
    bg: "bg-yellow-400/15",
    glow: "rgba(250,204,21,0.3)",
    img: GAME_ASSETS.lightning,
    shard: GAME_ASSETS.shardLightning,
  },
  wind: {
    label: "Wind",
    text: "text-sky-300",
    border: "border-sky-300/50",
    bg: "bg-sky-300/15",
    glow: "rgba(125,211,252,0.3)",
    img: GAME_ASSETS.wind,
    shard: GAME_ASSETS.shardWind,
  },
  ice: {
    label: "Ice",
    text: "text-blue-200",
    border: "border-blue-300/50",
    bg: "bg-blue-300/15",
    glow: "rgba(186,230,253,0.3)",
    img: GAME_ASSETS.water,
    shard: GAME_ASSETS.shardIce,
  },
};

// ── Logo (served from Cloudflare Pages public/) ───────────────────────────────
export const LOGO = import.meta.env.BASE_URL + "logo.jpg";

// ── Helper: get guild image with fallback to element image ────────────────────
export function getGuildImage(guildName: string, element?: string): string {
  if (GUILD_IMAGES[guildName]) return GUILD_IMAGES[guildName];
  if (element && ELEMENT_META[element]) return ELEMENT_META[element].img;
  return GAME_ASSETS.seal2;
}
