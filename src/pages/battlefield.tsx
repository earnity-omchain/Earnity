import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { ELEMENT_META, getGuildImage, GAME_ASSETS } from "@/lib/assets";
import { ITEM_META, GAME_ITEMS, calculateCurrentMP, MP_MAX } from "@/lib/game-config";
import {
  getGuildsWithRanking,
  getInventory,
  attackGuild,
  useDefenseItem,
  useMPPotion,
  getAttackLog,
  getGuildCooldowns,
  getUserMP,
} from "@/lib/supabase-gw";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Swords,
  Shield,
  Heart,
  Zap,
  Skull,
  Trophy,
  Clock,
  Lock,
  TrendingUp,
  Users,
  Flame,
  Droplets,
  Mountain,
  Wind,
  TreePine,
  CloudLightning,
} from "lucide-react";

const ELEMENT_ICONS: Record<string, React.ReactNode> = {
  fire: <Flame className="w-4 h-4" />,
  water: <Droplets className="w-4 h-4" />,
  nature: <TreePine className="w-4 h-4" />,
  rock: <Mountain className="w-4 h-4" />,
  lightning: <CloudLightning className="w-4 h-4" />,
  wind: <Wind className="w-4 h-4" />,
};

const ITEM_ICONS: Record<string, React.ReactNode> = {
  [GAME_ITEMS.NUKE]: <Skull className="w-5 h-5" />,
  [GAME_ITEMS.DRAIN]: <Droplets className="w-5 h-5" />,
  [GAME_ITEMS.RUG]: <Swords className="w-5 h-5" />,
  [GAME_ITEMS.SHIELD]: <Shield className="w-5 h-5" />,
  [GAME_ITEMS.HP_POTION]: <Heart className="w-5 h-5" />,
  [GAME_ITEMS.MP_POTION]: <Zap className="w-5 h-5" />,
};

export default function Battlefield() {
  const { session, profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedGuild, setSelectedGuild] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [attackResult, setAttackResult] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("battlefield");

  const userId = profile?.id;
  const myGuildId = profile?.guild_id;

  const { data: guilds, isLoading: guildsLoading } = useQuery({
    queryKey: ["guilds-ranked"],
    queryFn: getGuildsWithRanking,
    refetchInterval: 30000,
  });

  const { data: inventory } = useQuery({
    queryKey: ["inventory", userId],
    queryFn: () => getInventory(userId!),
    enabled: !!userId,
  });

  const { data: attackLog } = useQuery({
    queryKey: ["attack-log"],
    queryFn: () => getAttackLog(30),
    refetchInterval: 10000,
  });

  const { data: myGuildCooldowns } = useQuery({
    queryKey: ["guild-cooldowns", myGuildId],
    queryFn: () => getGuildCooldowns(myGuildId!),
    enabled: !!myGuildId,
  });

  const { data: currentMP } = useQuery({
    queryKey: ["user-mp", userId],
    queryFn: () => getUserMP(userId!),
    enabled: !!userId,
    refetchInterval: 30000,
  });

  const attackMutation = useMutation({
    mutationFn: ({ targetId, itemType }: { targetId: string; itemType: string }) =>
      attackGuild(userId!, targetId, itemType),
    onSuccess: (result) => {
      setAttackResult(result.message);
      queryClient.invalidateQueries({ queryKey: ["guilds-ranked"] });
      queryClient.invalidateQueries({ queryKey: ["inventory", userId] });
      queryClient.invalidateQueries({ queryKey: ["user-mp", userId] });
      queryClient.invalidateQueries({ queryKey: ["attack-log"] });
    },
  });

  const defenseMutation = useMutation({
    mutationFn: (itemType: string) => useDefenseItem(userId!, myGuildId!, itemType),
    onSuccess: (result) => {
      setAttackResult(result.message);
      queryClient.invalidateQueries({ queryKey: ["guilds-ranked"] });
      queryClient.invalidateQueries({ queryKey: ["inventory", userId] });
      queryClient.invalidateQueries({ queryKey: ["guild-cooldowns", myGuildId] });
    },
  });

  const mpPotionMutation = useMutation({
    mutationFn: () => useMPPotion(userId!),
    onSuccess: (result) => {
      setAttackResult(result.message);
      queryClient.invalidateQueries({ queryKey: ["inventory", userId] });
      queryClient.invalidateQueries({ queryKey: ["user-mp", userId] });
    },
  });

  const getItemQuantity = (itemType: string) => {
    const item = inventory?.find((i) => i.item_type === itemType);
    return item?.quantity || 0;
  };

  const isShielded = (guild: any) => {
    return guild.shield_active_until && new Date(guild.shield_active_until) > new Date();
  };

  const isOnCooldown = (itemType: string) => {
    if (!myGuildCooldowns) return false;
    const cd = myGuildCooldowns.find((c) => c.item_type === itemType);
    return cd ? new Date(cd.expires_at) > new Date() : false;
  };

  const mpPercent = currentMP ? (currentMP / MP_MAX) * 100 : 0;

  return (
    <div className="min-h-screen bg-black text-white">
      <div
        className="fixed inset-0 bg-cover bg-center opacity-20 pointer-events-none"
        style={{ backgroundImage: `url(${GAME_ASSETS.background2})` }}
      />
      <div className="fixed inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6">
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-3 mb-2"
          >
            <Swords className="w-8 h-8 text-red-500" />
            <h1 className="text-4xl font-black tracking-tighter uppercase bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent">
              Guild Wars
            </h1>
            <Swords className="w-8 h-8 text-red-500" />
          </motion.div>
          <p className="text-sm text-zinc-400 max-w-lg mx-auto">
            Choose your target. Spend your MP. Defend your guild. The battlefield
            rewards the bold — and punishes the idle.
          </p>
        </div>

        {session && profile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 backdrop-blur"
          >
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-yellow-400">MP</span>
                  </div>
                  <span className="text-xs font-mono text-zinc-400">
                    {currentMP ?? "—"} / {MP_MAX}
                  </span>
                </div>
                <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${mpPercent}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <div className="text-[10px] text-zinc-500 mt-1">Regenerates fully in 48 hours</div>
              </div>

              <div className="flex items-center gap-2">
                <img src={GAME_ASSETS.coin} alt="coin" className="w-5 h-5" />
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500">Coins</div>
                  <div className="text-sm font-mono font-bold">{(profile.coin_balance || 0).toLocaleString()}</div>
                </div>
              </div>

              {myGuildId && (
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-500" />
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500">Guild HP</div>
                    <div className="text-sm font-mono font-bold">
                      {guilds?.find((g) => g.id === myGuildId)?.hp ?? "—"}%
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full bg-zinc-900/80 border border-zinc-800 mb-6">
            <TabsTrigger value="battlefield" className="flex-1 data-[state=active]:bg-red-950/50">
              <Swords className="w-4 h-4 mr-2" /> Battlefield
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex-1 data-[state=active]:bg-zinc-800">
              <Shield className="w-4 h-4 mr-2" /> Arsenal
            </TabsTrigger>
            <TabsTrigger value="log" className="flex-1 data-[state=active]:bg-zinc-800">
              <Clock className="w-4 h-4 mr-2" /> War Log
            </TabsTrigger>
          </TabsList>

          <TabsContent value="battlefield">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
                    <Trophy className="w-4 h-4 inline mr-1" /> Rankings
                  </h2>
                  <span className="text-xs text-zinc-600">Ranked by member coins + guild score</span>
                </div>

                {guildsLoading && (
                  <div className="text-center py-12 text-zinc-500">Loading battleground…</div>
                )}

                <AnimatePresence>
                  {guilds?.map((guild, index) => {
                    const el = ELEMENT_META[guild.element] || ELEMENT_META.fire;
                    const isMyGuild = myGuildId === guild.id;
                    const shieldActive = isShielded(guild);
                    const guildImg = getGuildImage(guild.name, guild.element);

                    return (
                      <motion.div
                        key={guild.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`relative group cursor-pointer border rounded-xl overflow-hidden transition-all ${
                          isMyGuild
                            ? `${el.border} ${el.bg}`
                            : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                        }`}
                        onClick={() => setSelectedGuild(guild)}
                      >
                        <div
                          className={`absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                            index === 0
                              ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/50"
                              : index === 1
                              ? "bg-zinc-400/20 text-zinc-300 border border-zinc-400/50"
                              : index === 2
                              ? "bg-orange-700/20 text-orange-400 border border-orange-700/50"
                              : "bg-zinc-800 text-zinc-500"
                          }`}
                        >
                          {index + 1}
                        </div>

                        {shieldActive && (
                          <div className="absolute inset-0 bg-blue-500/5 pointer-events-none" />
                        )}

                        <div className="p-4 pl-12">
                          <div className="flex items-start gap-4">
                            <div
                              className={`w-12 h-12 rounded-lg border ${el.border} overflow-hidden flex-shrink-0 bg-black/40`}
                            >
                              <img
                                src={guildImg}
                                alt={guild.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = el.img;
                                }}
                              />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-bold text-sm truncate">{guild.name}</h3>
                                {isMyGuild && (
                                  <span
                                    className={`text-[10px] uppercase tracking-wider ${el.text} border ${el.border} px-1.5 py-0.5 rounded-full`}
                                  >
                                    Your Guild
                                  </span>
                                )}
                                {shieldActive && (
                                  <span className="text-[10px] uppercase tracking-wider text-blue-400 border border-blue-500/50 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                    <Shield className="w-3 h-3" /> Shielded
                                  </span>
                                )}
                              </div>

                              <div className={`flex items-center gap-1.5 mt-1 text-xs ${el.text}`}>
                                {ELEMENT_ICONS[guild.element]}
                                {el.label}
                              </div>
                            </div>

                            <div className="text-right flex-shrink-0">
                              <div className="text-[10px] uppercase tracking-wider text-zinc-500">Score</div>
                              <div className="text-sm font-mono font-bold">{guild.ranking_score.toLocaleString()}</div>
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-3 mt-3 pt-3 border-t border-zinc-800/50">
                            <div>
                              <div className="text-[10px] uppercase tracking-wider text-zinc-600">Members</div>
                              <div className="text-xs font-mono">{guild.member_count}</div>
                            </div>
                            <div>
                              <div className="text-[10px] uppercase tracking-wider text-zinc-600">HP</div>
                              <div className="flex items-center gap-1.5">
                                <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      guild.hp > 50 ? "bg-green-500" : guild.hp > 25 ? "bg-yellow-500" : "bg-red-500"
                                    }`}
                                    style={{ width: `${guild.hp}%` }}
                                  />
                                </div>
                                <span className="text-xs font-mono">{guild.hp}%</span>
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] uppercase tracking-wider text-zinc-600">Coins</div>
                              <div className="text-xs font-mono">{guild.coin_balance.toLocaleString()}</div>
                            </div>
                            <div>
                              <div className="text-[10px] uppercase tracking-wider text-zinc-600">Contrib</div>
                              <div className="text-xs font-mono">{guild.total_score.toLocaleString()}</div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              <div className="lg:col-span-1">
                <div className="sticky top-6 space-y-4">
                  <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 backdrop-blur">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
                      <Swords className="w-4 h-4" /> Attack Panel
                    </h3>

                    {!session && <div className="text-center py-6 text-zinc-500 text-sm">Sign in to attack</div>}
                    {session && !myGuildId && <div className="text-center py-6 text-zinc-500 text-sm">Join a guild first to participate in wars</div>}
                    {session && myGuildId && !selectedGuild && <div className="text-center py-6 text-zinc-500 text-sm">Select a guild from the rankings to attack</div>}

                    {selectedGuild && (
                      <div className="space-y-4">
                        <div
                          className={`p-3 rounded-lg border ${
                            ELEMENT_META[selectedGuild.element]?.border || "border-zinc-700"
                          } ${ELEMENT_META[selectedGuild.element]?.bg || "bg-zinc-800/30"}`}
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={getGuildImage(selectedGuild.name, selectedGuild.element)}
                              alt={selectedGuild.name}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                            <div>
                              <div className="font-bold text-sm">{selectedGuild.name}</div>
                              <div className="text-xs text-zinc-500">
                                HP: {selectedGuild.hp}% | Score: {selectedGuild.total_score.toLocaleString()}
                              </div>
                            </div>
                          </div>
                          {isShielded(selectedGuild) && (
                            <div className="mt-2 text-xs text-blue-400 flex items-center gap-1">
                              <Shield className="w-3 h-3" /> Shield active — cannot attack
                            </div>
                          )}
                          {selectedGuild.id === myGuildId && (
                            <div className="mt-2 text-xs text-red-400">Cannot attack your own guild</div>
                          )}
                        </div>

                        <div className="space-y-2">
                          {[GAME_ITEMS.NUKE, GAME_ITEMS.DRAIN, GAME_ITEMS.RUG].map((itemKey) => {
                            const meta = ITEM_META[itemKey];
                            const qty = getItemQuantity(itemKey);
                            const canUse =
                              qty > 0 &&
                              (currentMP || 0) >= meta.mpCost &&
                              !isShielded(selectedGuild) &&
                              selectedGuild.id !== myGuildId;

                            return (
                              <button
                                key={itemKey}
                                disabled={!canUse}
                                onClick={() => {
                                  setSelectedItem(itemKey);
                                  attackMutation.mutate(
                                    { targetId: selectedGuild.id, itemType: itemKey },
                                    { onSettled: () => setTimeout(() => setAttackResult(null), 4000) }
                                  );
                                }}
                                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                                  canUse
                                    ? "border-red-900/50 bg-red-950/20 hover:bg-red-950/40 hover:border-red-700/50"
                                    : "border-zinc-800 bg-zinc-900/30 opacity-50 cursor-not-allowed"
                                }`}
                              >
                                <div className="text-red-400">{ITEM_ICONS[itemKey]}</div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold">{meta.label}</span>
                                    <span className="text-xs text-zinc-500">x{qty}</span>
                                  </div>
                                  <div className="text-[10px] text-zinc-500">
                                    {meta.mpCost} MP • {meta.description}
                                  </div>
                                </div>
                                <div className="text-xs font-mono text-red-400">{meta.mpCost}MP</div>
                              </button>
                            );
                          })}
                        </div>

                        {attackResult && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`text-center text-xs font-bold p-2 rounded-lg ${
                              attackResult.includes("hit")
                                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                : "bg-zinc-800 text-zinc-400"
                            }`}
                          >
                            {attackResult}
                          </motion.div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="inventory">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-red-400 mb-3 flex items-center gap-2">
                  <Swords className="w-4 h-4" /> Attack Items
                </h3>
                <div className="space-y-2">
                  {[GAME_ITEMS.NUKE, GAME_ITEMS.DRAIN, GAME_ITEMS.RUG].map((itemKey) => {
                    const meta = ITEM_META[itemKey];
                    const qty = getItemQuantity(itemKey);
                    return (
                      <div key={itemKey} className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800 bg-zinc-900/50">
                        <img src={meta.image} alt={meta.label} className="w-10 h-10 object-contain" />
                        <div className="flex-1">
                          <div className="text-sm font-bold">{meta.label}</div>
                          <div className="text-[10px] text-zinc-500">{meta.description}</div>
                        </div>
                        <div className="text-lg font-mono font-bold text-zinc-300">x{qty}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Defense Items
                </h3>
                <div className="space-y-2">
                  {[GAME_ITEMS.SHIELD, GAME_ITEMS.HP_POTION].map((itemKey) => {
                    const meta = ITEM_META[itemKey];
                    const qty = getItemQuantity(itemKey);
                    const onCooldown = isOnCooldown(itemKey);
                    return (
                      <div key={itemKey} className="space-y-2">
                        <div className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800 bg-zinc-900/50">
                          <img src={meta.image} alt={meta.label} className="w-10 h-10 object-contain" />
                          <div className="flex-1">
                            <div className="text-sm font-bold">{meta.label}</div>
                            <div className="text-[10px] text-zinc-500">{meta.description}</div>
                          </div>
                          <div className="text-lg font-mono font-bold text-zinc-300">x{qty}</div>
                        </div>
                        {myGuildId && qty > 0 && !onCooldown && (
                          <Button size="sm" className="w-full" onClick={() => {
                            defenseMutation.mutate(itemKey, { onSettled: () => setTimeout(() => setAttackResult(null), 4000) });
                          }}>Use on Your Guild</Button>
                        )}
                        {onCooldown && (
                          <div className="text-xs text-zinc-500 text-center py-1">
                            <Clock className="w-3 h-3 inline mr-1" /> On cooldown
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-yellow-400 mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4" /> Utility
                </h3>
                <div className="space-y-2">
                  {[GAME_ITEMS.MP_POTION].map((itemKey) => {
                    const meta = ITEM_META[itemKey];
                    const qty = getItemQuantity(itemKey);
                    return (
                      <div key={itemKey} className="space-y-2">
                        <div className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800 bg-zinc-900/50">
                          <img src={meta.image} alt={meta.label} className="w-10 h-10 object-contain" />
                          <div className="flex-1">
                            <div className="text-sm font-bold">{meta.label}</div>
                            <div className="text-[10px] text-zinc-500">{meta.description}</div>
                          </div>
                          <div className="text-lg font-mono font-bold text-zinc-300">x{qty}</div>
                        </div>
                        {qty > 0 && (
                          <Button size="sm" className="w-full" onClick={() => {
                            mpPotionMutation.mutate(undefined, { onSettled: () => setTimeout(() => setAttackResult(null), 4000) });
                          }}>Use Now</Button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-800">
                  <h4 className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Shards & Elementals</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {["fire", "water", "nature", "rock", "lightning", "wind"].map((el) => {
                      const shardQty = inventory?.find((i) => i.item_type === `shard_${el}`)?.quantity || 0;
                      const elementalQty = inventory?.find((i) => i.item_type === `elemental_${el}`)?.quantity || 0;
                      const meta = ELEMENT_META[el];
                      return (
                        <div key={el} className={`flex items-center gap-2 p-2 rounded-lg border ${meta.border} ${meta.bg}`}>
                          <img src={meta.shard} alt={el} className="w-5 h-5 object-contain" />
                          <div className="text-xs">
                            <span className={meta.text}>{meta.label}</span>
                            <div className="text-[10px] text-zinc-400">{shardQty} shards • {elementalQty} elemental</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="log">
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 max-w-2xl mx-auto">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Recent Attacks
              </h3>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {attackLog?.length === 0 && (
                    <div className="text-center py-12 text-zinc-600 text-sm">No attacks yet. The battlefield is quiet… for now.</div>
                  )}
                  {attackLog?.map((attack) => {
                    const meta = ITEM_META[attack.item_type];
                    const isNuke = attack.item_type === GAME_ITEMS.NUKE;
                    return (
                      <motion.div
                        key={attack.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                          isNuke ? "border-red-900/30 bg-red-950/10" : "border-zinc-800 bg-zinc-900/30"
                        }`}
                      >
                        <div className={isNuke ? "text-red-400" : "text-zinc-400"}>
                          {ITEM_ICONS[attack.item_type] || <Swords className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs">
                            <span className="font-bold text-zinc-300">{attack.attacker_name}</span>
                            <span className="text-zinc-500"> used </span>
                            <span className={isNuke ? "text-red-400 font-bold" : "text-zinc-300 font-bold"}>{meta?.label || attack.item_type}</span>
                            <span className="text-zinc-500"> on </span>
                            <span className="font-bold text-zinc-300">{attack.target_name}</span>
                          </div>
                          <div className="text-[10px] text-zinc-600 mt-0.5">
                            {attack.effect_value?.toLocaleString()} {isNuke ? "HP" : "points"} damaged • {new Date(attack.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                        <div className="text-[10px] text-zinc-600 font-mono">{meta?.mpCost || 0}MP</div>
                      </motion.div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
