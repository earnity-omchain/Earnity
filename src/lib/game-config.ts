const CDN = "https://gmyplyxwxmkvptimzgid.supabase.co/storage/v1/object/public/Assets";

export const GAME_ITEMS = {
  NUKE: "nuke",
  DRAIN: "drain",
  RUG: "rug",
  SHIELD: "shield",
  HP_POTION: "hp_potion",
  MP_POTION: "mp_potion",
} as const;

export const SHARD_ELEMENTS = [
  "fire", "water", "nature", "rock", "lightning", "wind"
] as const;

export const ELEMENTAL_ELEMENTS = [
  "fire", "water", "nature", "rock", "lightning", "wind"
] as const;

export type ItemType = typeof GAME_ITEMS[keyof typeof GAME_ITEMS];
export type ShardElement = typeof SHARD_ELEMENTS[number];
export type ElementalElement = typeof ELEMENTAL_ELEMENTS[number];

export interface ItemMeta {
  label: string;
  mpCost: number;
  description: string;
  image: string;
  category: "attack" | "defense" | "utility";
  cooldownHours?: number;
  effectPercent?: number;
}

export const ITEM_META: Record<string, ItemMeta> = {
  [GAME_ITEMS.NUKE]: {
    label: "Nuke",
    mpCost: 100,
    description: "Obliterates 25% of target guild's HP",
    image: `${CDN}/Items/Nuke.png`,
    category: "attack",
    effectPercent: 25,
  },
  [GAME_ITEMS.DRAIN]: {
    label: "Drain",
    mpCost: 25,
    description: "Siphons 25% of target guild's score",
    image: `${CDN}/Items/Drain.png`,
    category: "attack",
    effectPercent: 25,
  },
  [GAME_ITEMS.RUG]: {
    label: "Rug",
    mpCost: 50,
    description: "Steals 25% of target guild's score into your coins",
    image: `${CDN}/Items/RUG.png`,
    category: "attack",
    effectPercent: 25,
  },
  [GAME_ITEMS.SHIELD]: {
    label: "Shield",
    mpCost: 0,
    description: "Blocks all attacks on your guild for 24 hours",
    image: `${CDN}/Items/Shield.png`,
    category: "defense",
    cooldownHours: 5,
  },
  [GAME_ITEMS.HP_POTION]: {
    label: "HP Potion",
    mpCost: 0,
    description: "Restores 10% of your guild's HP",
    image: `${CDN}/Items/HP.png`,
    category: "defense",
    cooldownHours: 5,
    effectPercent: 10,
  },
  [GAME_ITEMS.MP_POTION]: {
    label: "MP Potion",
    mpCost: 0,
    description: "Instantly restores your MP to full",
    image: `${CDN}/Items/MP.png`,
    category: "utility",
  },
};

export interface DropEntry {
  type: "coin" | "shard" | "item" | "elemental";
  weight: number;
  minQty?: number;
  maxQty?: number;
  subtypes?: string[];
  fixedQty?: number;
}

export const ITEM_BOX_DROPS: DropEntry[] = [
  { type: "shard",     weight: 70, subtypes: [...SHARD_ELEMENTS],    fixedQty: 1 },
  { type: "elemental", weight: 30, subtypes: [...ELEMENTAL_ELEMENTS], fixedQty: 1 },
];
export const MYSTERY_BOX_DROPS: DropEntry[] = [
  { type: "coin", weight: 50, minQty: 50, maxQty: 500 },
  { type: "shard", weight: 25, subtypes: [...SHARD_ELEMENTS], fixedQty: 1 },
  { type: "item", weight: 20, subtypes: Object.values(GAME_ITEMS), fixedQty: 1 },
  { type: "elemental", weight: 5, subtypes: [...ELEMENTAL_ELEMENTS], fixedQty: 1 },
];

export function rollMysteryBox(): {
  type: string;
  subtype?: string;
  quantity: number;
} {
  const roll = Math.random() * 100;
  let cumulative = 0;
  for (const drop of MYSTERY_BOX_DROPS) {
    cumulative += drop.weight;
    if (roll < cumulative) {
      const qty = drop.fixedQty ?? Math.floor(Math.random() * ((drop.maxQty! - drop.minQty!) + 1)) + drop.minQty!;
      const subtype = drop.subtypes?.[Math.floor(Math.random() * drop.subtypes.length)];
      return { type: drop.type, subtype, quantity: qty };
    }
  }
  return { type: "coin", quantity: 100 };
}

export const MP_MAX = 100;
export const MP_REGEN_HOURS = 48;
export const MP_REGEN_PER_HOUR = MP_MAX / MP_REGEN_HOURS;

export function calculateCurrentMP(
  storedMp: number,
  lastUpdate: string | Date
): number {
  const hoursElapsed =
    (Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60);
  const regenerated = hoursElapsed * MP_REGEN_PER_HOUR;
  return Math.min(MP_MAX, Math.floor(storedMp + regenerated));
}

export const SHARDS_PER_ELEMENTAL = 4;
export const ELEMENTALS_FOR_WALLET = 6;

export function getShardItemType(element: string): string {
  return `shard_${element}`;
}

export function rollItemBox(): {
  type: string;
  subtype: string;
  quantity: number;
} {
  const elements = [...SHARD_ELEMENTS];
  const subtype  = elements[Math.floor(Math.random() * elements.length)];
  const type     = Math.random() < 0.70 ? "shard" : "elemental";
  return { type, subtype, quantity: 1 };
}

export function getElementalItemType(element: string): string {
  return `elemental_${element}`;
}

export function parseShardElement(itemType: string): string | null {
  if (itemType.startsWith("shard_")) return itemType.replace("shard_", "");
  return null;
}

export function parseElementalElement(itemType: string): string | null {
  if (itemType.startsWith("elemental_")) return itemType.replace("elemental_", "");
  return null;
}

export const CHEST_COOLDOWN_HOURS = 2;

export function canOpenChest(lastOpened: string | Date | null | undefined): boolean {
  if (!lastOpened) return true;
  const hoursSince = (Date.now() - new Date(lastOpened).getTime()) / (1000 * 60 * 60);
  return hoursSince >= CHEST_COOLDOWN_HOURS;
}

export function getChestCooldownRemaining(lastOpened: string | Date | null | undefined): number {
  if (!lastOpened) return 0;
  const hoursSince = (Date.now() - new Date(lastOpened).getTime()) / (1000 * 60 * 60);
  return Math.max(0, CHEST_COOLDOWN_HOURS - hoursSince);
}
    
