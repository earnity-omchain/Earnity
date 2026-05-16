// ── Base URLs ─────────────────────────────────────────────────────────────────
const GAME = import.meta.env.VITE_SUPABASE_URL + "/storage/v1/object/public/Assets/Game%20assets";
const GUILDS = import.meta.env.VITE_SUPABASE_URL + "/storage/v1/object/public/Assets/Guilds";
const ITEMS = import.meta.env.VITE_SUPABASE_URL + "/storage/v1/object/public/Assets/Items";
const SHARDS = import.meta.env.VITE_SUPABASE_URL + "/storage/v1/object/public/Assets/Shards";

// ── Game Assets ───────────────────────────────────────────────────────────────
export const GAME_ASSETS = {
  background1: `${GAME}/bg1.png`,
  background2: `${GAME}/bg2.png`,
  coin: `${GAME}/coin.png`,
  chest: `${GAME}/chest.png`,
  coins100: `${GAME}/100-coins.png`,
  coins1000: `${GAME}/1000-coins.png`,
  nuke: `${ITEMS}/Nuke.png`,
  drain: `${ITEMS}/Drain.png`,
  rug: `${ITEMS}/RUG.png`,
  shield: `${ITEMS}/Shield.png`,
  hpPotion: `${ITEMS}/HP.png`,
  mpPotion: `${ITEMS}/MP.png`,
  guilds: GUILDS,
  items: ITEMS,
  shards: SHARDS,
} as const;

// ── Guild Image Filename Map ──────────────────────────────────────────────────
// Maps guild display names → actual PNG filenames in Supabase storage
const GUILD_IMAGE_MAP: Record<string, string> = {
  "Emberborn": "Emberborn",
  "Junsun工会": "Junsun",
  "The Matrix": "The%20Matrix",
  "Salvatrucha": "Salvatrucha",
  "致富web3": "Web3",
  "Firethernity": "Firethernity",
  "Dajjal": "Dajjal",
  "V.A.N.E": "V.A.N.E",
  "闪电": "Lightning_",
  "e.g.jhembut": "jhembut",
  "趋势": "Trend",
  "SeaWay": "SeaWay",
  "meigui": "meigui",
  "Insiders": "Insiders",
  "bao": "bao",
  "Enel": "Enel",
  "Hubchainify": "Hubchainify",
  "Hunters": "Hunters",
  "Adorable": "Adorable",
  "Nomads": "Nomads",
};

export function getGuildImage(name: string, _element: string): string {
  // Use mapped filename if available, otherwise URL-encode the name
  const filename = GUILD_IMAGE_MAP[name] || encodeURIComponent(name);
  return `${GAME_ASSETS.guilds}/${filename}.png`;
}

// ── Element Metadata ──────────────────────────────────────────────────────────
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
    glow: "rgba(249,115,22,0.5)",
    img: `${GUILDS}/Firethernity.png`,
    shard: `${SHARDS}/fire-shard.png`,
  },
  water: {
    label: "Water",
    text: "text-cyan-400",
    border: "border-cyan-500/50",
    bg: "bg-cyan-500/15",
    glow: "rgba(34,211,238,0.5)",
    img: `${GUILDS}/SeaWay.png`,
    shard: `${SHARDS}/water-shard.png`,
  },
  nature: {
    label: "Nature",
    text: "text-green-400",
    border: "border-green-500/50",
    bg: "bg-green-500/15",
    glow: "rgba(74,222,128,0.5)",
    img: `${GUILDS}/meigui.png`,
    shard: `${SHARDS}/nature-shard.png`,
  },
  rock: {
    label: "Rock",
    text: "text-stone-400",
    border: "border-stone-500/50",
    bg: "bg-stone-500/15",
    glow: "rgba(168,162,158,0.5)",
    img: `${GUILDS}/jhembut.png`,
    shard: `${SHARDS}/rock-shard.png`,
  },
  lightning: {
    label: "Lightning",
    text: "text-yellow-400",
    border: "border-yellow-500/50",
    bg: "bg-yellow-500/15",
    glow: "rgba(250,204,21,0.5)",
    img: `${GUILDS}/Lightning_.png`,
    shard: `${SHARDS}/lightning-shard.png`,
  },
  lighting: { // alias for backward compat
    label: "Lightning",
    text: "text-yellow-400",
    border: "border-yellow-500/50",
    bg: "bg-yellow-500/15",
    glow: "rgba(250,204,21,0.5)",
    img: `${GUILDS}/Lightning_.png`,
    shard: `${SHARDS}/lightning-shard.png`,
  },
  wind: {
    label: "Wind",
    text: "text-sky-400",
    border: "border-sky-500/50",
    bg: "bg-sky-500/15",
    glow: "rgba(125,211,252,0.5)",
    img: `${GUILDS}/Nomads.png`,
    shard: `${SHARDS}/wind-shard.png`,
  },
  ice: {
    label: "Ice",
    text: "text-blue-200",
    border: "border-blue-300/50",
    bg: "bg-blue-300/15",
    glow: "rgba(186,230,253,0.5)",
    img: `${GUILDS}/SeaWay.png`,
    shard: `${SHARDS}/ice-shard.png`,
  },
};
