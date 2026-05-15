import { supabase } from "./supabase";
import {
  GAME_ITEMS,
  ITEM_META,
  rollMysteryBox,
  calculateCurrentMP,
  getShardItemType,
  getElementalItemType,
  SHARDS_PER_ELEMENTAL,
  CHEST_COOLDOWN_HOURS,
} from "./game-config";

export interface InventoryItem {
  id: string;
  user_id: string;
  item_type: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface GuildAttack {
  id: string;
  attacker_id: string;
  attacker_guild_id: string | null;
  target_guild_id: string;
  item_type: string;
  mp_cost: number;
  effect_value: number | null;
  created_at: string;
}

export interface GuildCooldown {
  id: string;
  guild_id: string;
  item_type: string;
  used_by: string;
  used_at: string;
  expires_at: string;
}

export async function getUserMP(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from("profiles")
    .select("mp, mp_updated_at")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return calculateCurrentMP(data.mp, data.mp_updated_at);
}

export async function useUserMP(userId: string, cost: number): Promise<boolean> {
  const { data, error } = await supabase.rpc("use_mp", {
    user_uuid: userId,
    cost,
  });
  if (error) throw error;
  return data;
}

export async function getInventory(userId: string): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from("inventories")
    .select("*")
    .eq("user_id", userId)
    .order("item_type");
  if (error) throw error;
  return data || [];
}

export async function addToInventory(
  userId: string,
  itemType: string,
  quantity: number
): Promise<void> {
  const { error } = await supabase
    .from("inventories")
    .upsert(
      { user_id: userId, item_type: itemType, quantity },
      { onConflict: "user_id,item_type" }
    );
  if (error) throw error;
}

export async function openChest(userId: string): Promise<{
  reward: { type: string; subtype?: string; quantity: number };
  nextAvailable: Date;
}> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("last_chest_opened, coin_balance")
    .eq("id", userId)
    .single();
  if (profileError) throw profileError;

  const lastOpened = profile.last_chest_opened
    ? new Date(profile.last_chest_opened).getTime()
    : 0;
  const hoursSince = (Date.now() - lastOpened) / (1000 * 60 * 60);
  if (hoursSince < CHEST_COOLDOWN_HOURS) {
    throw new Error(
      `Chest on cooldown. Available in ${Math.ceil(CHEST_COOLDOWN_HOURS - hoursSince)} hours.`
    );
  }

  const reward = rollMysteryBox();

  if (reward.type === "coin") {
    const { error } = await supabase
      .from("profiles")
      .update({
        coin_balance: (profile.coin_balance || 0) + reward.quantity,
        last_chest_opened: new Date().toISOString(),
      })
      .eq("id", userId);
    if (error) throw error;
  } else if (reward.type === "shard" || reward.type === "elemental") {
    const itemType =
      reward.type === "shard"
        ? getShardItemType(reward.subtype!)
        : getElementalItemType(reward.subtype!);
    await addToInventory(userId, itemType, reward.quantity);
    const { error } = await supabase
      .from("profiles")
      .update({ last_chest_opened: new Date().toISOString() })
      .eq("id", userId);
    if (error) throw error;
  } else if (reward.type === "item") {
    await addToInventory(userId, reward.subtype!, reward.quantity);
    const { error } = await supabase
      .from("profiles")
      .update({ last_chest_opened: new Date().toISOString() })
      .eq("id", userId);
    if (error) throw error;
  }

  await supabase.from("chest_openings").insert({
    user_id: userId,
    reward_type: reward.type,
    reward_subtype: reward.subtype,
    quantity: reward.quantity,
  });

  return {
    reward,
    nextAvailable: new Date(Date.now() + CHEST_COOLDOWN_HOURS * 60 * 60 * 1000),
  };
}

export async function attackGuild(
  attackerId: string,
  targetGuildId: string,
  itemType: string
): Promise<{
  success: boolean;
  effectValue: number;
  message: string;
}> {
  const meta = ITEM_META[itemType];
  if (!meta) throw new Error("Invalid item type");

  const { data: attacker, error: attackerError } = await supabase
    .from("profiles")
    .select("id, guild_id, mp, mp_updated_at, coin_balance")
    .eq("id", attackerId)
    .single();
  if (attackerError) throw attackerError;

  const currentMP = calculateCurrentMP(attacker.mp, attacker.mp_updated_at);
  if (currentMP < meta.mpCost) {
    return { success: false, effectValue: 0, message: "Not enough MP" };
  }

  const { data: invItem } = await supabase
    .from("inventories")
    .select("quantity")
    .eq("user_id", attackerId)
    .eq("item_type", itemType)
    .single();
  if (!invItem || invItem.quantity < 1) {
    return { success: false, effectValue: 0, message: "You don't own this item" };
  }

  const { data: targetGuild, error: targetError } = await supabase
    .from("guilds")
    .select("id, hp, total_score, shield_active_until")
    .eq("id", targetGuildId)
    .single();
  if (targetError) throw targetError;

  if (targetGuild.shield_active_until && new Date(targetGuild.shield_active_until) > new Date()) {
    return { success: false, effectValue: 0, message: "Target guild is shielded" };
  }

  if (attacker.guild_id === targetGuildId) {
    return { success: false, effectValue: 0, message: "Cannot attack your own guild" };
  }

  let effectValue = 0;
  let newHp = targetGuild.hp;
  let newScore = targetGuild.total_score;
  let newAttackerCoins = attacker.coin_balance || 0;

  if (itemType === GAME_ITEMS.NUKE) {
    effectValue = Math.floor((targetGuild.hp * meta.effectPercent!) / 100);
    newHp = Math.max(0, targetGuild.hp - effectValue);
  } else if (itemType === GAME_ITEMS.DRAIN) {
    effectValue = Math.floor((targetGuild.total_score * meta.effectPercent!) / 100);
    newScore = Math.max(0, targetGuild.total_score - effectValue);
  } else if (itemType === GAME_ITEMS.RUG) {
    effectValue = Math.floor((targetGuild.total_score * meta.effectPercent!) / 100);
    newScore = Math.max(0, targetGuild.total_score - effectValue);
    newAttackerCoins += effectValue;
  }

  const mpSuccess = await useUserMP(attackerId, meta.mpCost);
  if (!mpSuccess) {
    return { success: false, effectValue: 0, message: "MP deduction failed" };
  }

  const { error: invError } = await supabase
    .from("inventories")
    .update({ quantity: invItem.quantity - 1 })
    .eq("user_id", attackerId)
    .eq("item_type", itemType);
  if (invError) throw invError;

  const { error: guildError } = await supabase
    .from("guilds")
    .update({ hp: newHp, total_score: newScore })
    .eq("id", targetGuildId);
  if (guildError) throw guildError;

  if (itemType === GAME_ITEMS.RUG) {
    const { error: coinError } = await supabase
      .from("profiles")
      .update({ coin_balance: newAttackerCoins })
      .eq("id", attackerId);
    if (coinError) throw coinError;
  }

  const { error: logError } = await supabase.from("guild_attacks").insert({
    attacker_id: attackerId,
    attacker_guild_id: attacker.guild_id,
    target_guild_id: targetGuildId,
    item_type: itemType,
    mp_cost: meta.mpCost,
    effect_value: effectValue,
  });
  if (logError) throw logError;

  return {
    success: true,
    effectValue,
    message: `${meta.label} hit for ${effectValue} ${itemType === GAME_ITEMS.NUKE ? "HP" : "points"}!`,
  };
}

export async function useDefenseItem(
  userId: string,
  guildId: string,
  itemType: string
): Promise<{
  success: boolean;
  message: string;
  expiresAt?: Date;
}> {
  const meta = ITEM_META[itemType];
  if (!meta) throw new Error("Invalid item type");
  if (meta.category !== "defense") throw new Error("Not a defense item");

  const { data: invItem } = await supabase
    .from("inventories")
    .select("quantity")
    .eq("user_id", userId)
    .eq("item_type", itemType)
    .single();
  if (!invItem || invItem.quantity < 1) {
    return { success: false, message: "You don't own this item" };
  }

  const { data: cooldown } = await supabase
    .from("guild_item_cooldowns")
    .select("expires_at")
    .eq("guild_id", guildId)
    .eq("item_type", itemType)
    .single();

  if (cooldown && new Date(cooldown.expires_at) > new Date()) {
    const minsLeft = Math.ceil(
      (new Date(cooldown.expires_at).getTime() - Date.now()) / (1000 * 60)
    );
    return { success: false, message: `On cooldown for ${minsLeft} more minutes` };
  }

  const { data: guild, error } = await supabase
    .from("guilds")
    .select("hp")
    .eq("id", guildId)
    .single();
  if (error) throw error;

  let update: Record<string, any> = {};
  let expiresAt: Date | undefined;

  if (itemType === GAME_ITEMS.SHIELD) {
    update = { shield_active_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() };
    expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  } else if (itemType === GAME_ITEMS.HP_POTION) {
    const restore = Math.floor((guild.hp * (meta.effectPercent || 10)) / 100);
    update = { hp: Math.min(100, guild.hp + restore) };
  }

  const { error: guildUpdateError } = await supabase
    .from("guilds")
    .update(update)
    .eq("id", guildId);
  if (guildUpdateError) throw guildUpdateError;

  const { error: invError } = await supabase
    .from("inventories")
    .update({ quantity: invItem.quantity - 1 })
    .eq("user_id", userId)
    .eq("item_type", itemType);
  if (invError) throw invError;

  if (meta.cooldownHours) {
    await supabase.rpc("set_guild_cooldown", {
      guild_uuid: guildId,
      item: itemType,
      user_uuid: userId,
      hours: meta.cooldownHours,
    });
  }

  return { success: true, message: `${meta.label} activated!`, expiresAt };
}

export async function useMPPotion(userId: string): Promise<{
  success: boolean;
  message: string;
}> {
  const { data: invItem } = await supabase
    .from("inventories")
    .select("quantity")
    .eq("user_id", userId)
    .eq("item_type", GAME_ITEMS.MP_POTION)
    .single();

  if (!invItem || invItem.quantity < 1) {
    return { success: false, message: "You don't own an MP Potion" };
  }

  const { error: mpError } = await supabase
    .from("profiles")
    .update({ mp: 100, mp_updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (mpError) throw mpError;

  const { error: invError } = await supabase
    .from("inventories")
    .update({ quantity: invItem.quantity - 1 })
    .eq("user_id", userId)
    .eq("item_type", GAME_ITEMS.MP_POTION);
  if (invError) throw invError;

  return { success: true, message: "MP fully restored!" };
}

export async function craftElemental(
  userId: string,
  element: string
): Promise<{
  success: boolean;
  message: string;
}> {
  const shardType = getShardItemType(element);

  const { data: shardInv } = await supabase
    .from("inventories")
    .select("quantity")
    .eq("user_id", userId)
    .eq("item_type", shardType)
    .single();

  if (!shardInv || shardInv.quantity < SHARDS_PER_ELEMENTAL) {
    return {
      success: false,
      message: `Need ${SHARDS_PER_ELEMENTAL} ${element} shards. You have ${shardInv?.quantity || 0}.`,
    };
  }

  const { error: deductError } = await supabase
    .from("inventories")
    .update({ quantity: shardInv.quantity - SHARDS_PER_ELEMENTAL })
    .eq("user_id", userId)
    .eq("item_type", shardType);
  if (deductError) throw deductError;

  const elementalType = getElementalItemType(element);
  await addToInventory(userId, elementalType, 1);

  await supabase.from("elemental_crafts").insert({
    user_id: userId,
    element,
  });

  return { success: true, message: `Crafted 1 ${element} elemental!` };
}

export async function getGuildsWithRanking(): Promise<
  Array<{
    id: string;
    name: string;
    element: string;
    member_count: number;
    total_score: number;
    hp: number;
    shield_active_until: string | null;
    coin_balance: number;
    ranking_score: number;
  }>
> {
  const { data, error } = await supabase.rpc("get_guilds_ranked");
  if (error) {
    const { data: guilds, error: guildsError } = await supabase
      .from("guilds")
      .select("id, name, element, member_count, total_score, hp, shield_active_until, coin_balance");
    if (guildsError) throw guildsError;

    const result = [];
    for (const g of guilds || []) {
      const { data: memberCoins } = await supabase
        .from("profiles")
        .select("coin_balance")
        .eq("guild_id", g.id);
      const totalMemberCoins = (memberCoins || []).reduce((s, m) => s + (m.coin_balance || 0), 0);
      result.push({
        ...g,
        ranking_score: totalMemberCoins + (g.total_score || 0),
      });
    }
    return result.sort((a, b) => b.ranking_score - a.ranking_score);
  }
  return data || [];
}

export async function getAttackLog(limit = 50): Promise<
  Array<GuildAttack & { attacker_name: string; target_name: string }>
> {
  const { data, error } = await supabase
    .from("guild_attacks")
    .select(`
      *,
      attacker:attacker_id(username),
      target:target_guild_id(name)
    `)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map((a: any) => ({
    ...a,
    attacker_name: a.attacker?.username || "Unknown",
    target_name: a.target?.name || "Unknown",
  }));
}

export async function getGuildCooldowns(guildId: string): Promise<GuildCooldown[]> {
  const { data, error } = await supabase
    .from("guild_item_cooldowns")
    .select("*")
    .eq("guild_id", guildId);
  if (error) throw error;
  return data || [];
}
