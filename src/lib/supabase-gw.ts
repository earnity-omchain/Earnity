import { supabase } from "./supabase";

// ── Guild queries ──────────────────────────────────────────

export async function getGuildsWithRanking() {
  const { data, error } = await supabase.rpc("get_guilds_with_ranking");
  if (error) {
    console.error("getGuildsWithRanking RPC error:", error);
    throw error;
  }
  return data || [];
}

export async function getGuildMembers(guildId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, discord_avatar, element, contribution_score, coin_balance")
    .eq("guild_id", guildId)
    .order("contribution_score", { ascending: false });
  if (error) throw error;
  return data || [];
}

// ── Inventory ──────────────────────────────────────────────

export async function getInventory(userId: string) {
  const { data, error } = await supabase
    .from("inventories")
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;
  return data || [];
}

// ── Attack log ─────────────────────────────────────────────

export async function getAttackLog(limit = 50) {
  const { data, error } = await supabase
    .from("guild_attacks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

// ── Cooldowns ──────────────────────────────────────────────

export async function getGuildCooldowns(guildId: string) {
  const { data, error } = await supabase
    .from("guild_item_cooldowns")
    .select("*")
    .eq("guild_id", guildId);
  if (error) throw error;
  return data || [];
}

// ── MP ─────────────────────────────────────────────────────

export async function getUserMP(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("mp")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data?.mp ?? 100;
}

// ── Actions ────────────────────────────────────────────────

export async function attackGuild(userId: string, targetId: string, itemType: string) {
  const { data, error } = await supabase.rpc("attack_guild", {
    p_user_id: userId,
    p_target_id: targetId,
    p_item_type: itemType,
  });
  if (error) throw error;
  return data as { success: boolean; message: string };
}

export async function useDefenseItem(userId: string, guildId: string, itemType: string) {
  const { data, error } = await supabase.rpc("use_defense_item", {
    p_user_id: userId,
    p_guild_id: guildId,
    p_item_type: itemType,
  });
  if (error) throw error;
  return data as { success: boolean; message: string };
}

export async function useMPPotion(userId: string) {
  const { data, error } = await supabase.rpc("use_mp_potion", {
    p_user_id: userId,
  });
  if (error) throw error;
  return data as { success: boolean; message: string };
}

// ── Chest ─────────────────────────────────────────────────

export async function openChest(userId: string) {
  const { data, error } = await supabase.rpc("open_chest", {
    p_user_id: userId,
  });
  if (error) throw error;
  return data as { 
    reward: { 
      type: string; 
      quantity: number; 
      subtype?: string;
      message?: string;
    } 
  };
}

// ── Crafting ───────────────────────────────────────────────

export async function craftElemental(userId: string, element: string) {
  const { data, error } = await supabase.rpc("craft_elemental", {
    p_user_id: userId,
    p_element: element,
  });
  if (error) throw error;
  return data as { success: boolean; message: string; reward?: any };
}
