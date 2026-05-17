import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import {
  getRankFromScore,
  getBuildingImage,
  getGuildStats,
  RANK_COLORS,
  RANK_GLOW,
  type GuildRank,
} from "@/lib/guild-leveling";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Swords, Shield, Zap, Heart, Wind, TrendingUp,
  Star, Sparkles, Clock, Skull, Droplets,
} from "lucide-react";
import {
  canOpenChest,
  getChestCooldownRemaining,
  GAME_ASSETS,
  ELEMENT_META,
  ITEM_META,
  GAME_ITEMS,
} from "@/lib/game-config";
import { openChest } from "@/lib/supabase-gw";

function useCountdown(target: Date) {
  const calc = () => {
    const diff = target.getTime() - Date.now();
    if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0, expired: true };
    return {
      hours: Math.floor(diff / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
      expired: false,
    };
  };
  const [t, setT] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
  }, [target.getTime()]);
  return t;
}

function StatRow({
  icon,
  label,
  value,
  color,
  max,
  delay = 0,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  max: number;
  delay?: number;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
      <div className="p-1.5 rounded-lg" style={{ background: `${color}15` }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase tracking-wider text-white/30">{label}</span>
          <span className="text-xs font-black text-white tabular-nums">{value}</span>
        </div>
        <div className="h-1 bg-black/40 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: color }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, delay }}
          />
        </div>
      </div>
    </div>
  );
}

export default function Stronghold({
  userId,
  profile,
}: {
  userId: string;
  profile: any;
}) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const score = profile?.stronghold_score ?? profile?.ranking_score ?? profile?.contribution_score ?? 0;
  const { rank, tier, progress, nextThreshold, nextRank, label } = getRankFromScore(score);
  const stats = getGuildStats(score);
  const rankColor = RANK_COLORS[rank];
  const glow = RANK_GLOW[rank];
  const buildingImg = getBuildingImage(rank);

  /* ── Chest state ── */
  const [lastOpened, setLastOpened] = useState(profile?.last_chest_opened);
  useEffect(() => setLastOpened(profile?.last_chest_opened), [profile?.last_chest_opened]);

  const canOpen = canOpenChest(lastOpened);
  const cooldownRemaining = getChestCooldownRemaining(lastOpened);
  const cooldownMs = cooldownRemaining * 60 * 60 * 1000;
  const targetDate = useMemo(() => new Date(Date.now() + Math.max(0, cooldownMs)), [cooldownMs]);
  const countdown = useCountdown(targetDate);

  const [reward, setReward] = useState<any>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [showReward, setShowReward] = useState(false);

  const openMutation = useMutation({
    mutationFn: () => openChest(userId),
    onSuccess: (result) => {
      setReward(result.reward);
      setIsOpening(false);
      setShowReward(true);
      setLastOpened(new Date().toISOString());
      queryClient.invalidateQueries({ queryKey: ["inventory", userId] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setTimeout(() => setShowReward(false), 4000);
    },
    onError: (err: any) => {
      setIsOpening(false);
      setReward({ type: "error", message: err.message });
      setShowReward(true);
      setTimeout(() => setShowReward(false), 3000);
    },
  });

  const handleOpenChest = () => {
    if (!canOpen || isOpening) return;
    setIsOpening(true);
    setReward(null);
    setShowReward(false);
    openMutation.mutate();
  };

  const getRewardIcon = () => {
    if (!reward || reward.type === "error") return <Sparkles className="w-8 h-8 text-yellow-400" />;
    switch (reward.type) {
      case "coin": return <img src={GAME_ASSETS.coin} className="w-8 h-8 object-contain" alt="" />;
      case "shard": return <img src={ELEMENT_META[reward.subtype]?.shard || GAME_ASSETS.coin} className="w-8 h-8 object-contain" alt="" />;
      case "elemental": return <img src={ELEMENT_META[reward.subtype]?.img || GAME_ASSETS.coin} className="w-8 h-8 object-contain" alt="" />;
      case "item": return <img src={ITEM_META[reward.subtype]?.image || GAME_ASSETS.coin} className="w-8 h-8 object-contain" alt="" />;
      default: return <Sparkles className="w-8 h-8 text-yellow-400" />;
    }
  };

  const getRewardLabel = () => {
    if (!reward) return "Opening…";
    if (reward.type === "error") return reward.message;
    switch (reward.type) {
      case "coin": return `${reward.quantity.toLocaleString()} Coins`;
      case "shard": return `${reward.quantity}x ${ELEMENT_META[reward.subtype]?.label || reward.subtype} Shard`;
      case "elemental": return `${reward.quantity}x ${ELEMENT_META[reward.subtype]?.label || reward.subtype} Elemental`;
      case "item": return `${reward.quantity}x ${ITEM_META[reward.subtype]?.label || reward.subtype}`;
      default: return "Mystery Reward";
    }
  };

  const getRewardColor = () => {
    switch (reward?.type) {
      case "coin": return "text-yellow-400";
      case "shard": return "text-blue-400";
      case "elemental": return "text-purple-400";
      case "item": return "text-red-400";
      default: return "text-white";
    }
  };

  return (
    <>
      {/* ── Trigger: Bigger building box ── */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl border-2 flex flex-col items-center justify-center overflow-hidden group"
        style={{
          background: "linear-gradient(135deg, #0a0a0a, #1a1a1a)",
          borderColor: `${rankColor}40`,
          boxShadow: `0 0 30px ${glow}`,
        }}
      >
        <motion.img
          src={buildingImg}
          alt="stronghold"
          className="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-xl relative z-10"
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        <div
          className="absolute inset-0 opacity-20 z-0"
          style={{ background: `radial-gradient(circle at 50% 80%, ${rankColor}, transparent 70%)` }}
        />

        {/* Rank badge */}
        <div
          className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase border backdrop-blur-sm z-20"
          style={{
            background: `${rankColor}20`,
            borderColor: `${rankColor}60`,
            color: rankColor,
          }}
        >
          {rank}
        </div>

        {/* Score */}
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] font-mono text-white/40 z-20 whitespace-nowrap">
          {score.toLocaleString()} pts
        </div>
      </motion.button>

      {/* ── Dialog ── */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 max-w-md overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-black uppercase tracking-[0.15em]">
              Your Stronghold
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center py-4">
            {/* Building */}
            <motion.div
              className="relative mb-6"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <div
                className="absolute inset-0 blur-2xl opacity-40 rounded-full"
                style={{ background: glow }}
              />
              <img
                src={buildingImg}
                alt="stronghold"
                className="relative w-40 h-40 object-contain drop-shadow-2xl"
              />
            </motion.div>

            {/* Rank */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 12 }}
              className="mb-1 px-4 py-1 rounded-full border text-sm font-black uppercase tracking-widest"
              style={{
                color: rankColor,
                borderColor: `${rankColor}40`,
                background: `${rankColor}10`,
                textShadow: `0 0 12px ${glow}`,
              }}
            >
              {rank} Rank — {label}
            </motion.div>

            <div className="text-xs text-white/30 font-mono mb-4">
              {score.toLocaleString()} Power
            </div>

            {/* Progress */}
            {nextThreshold && (
              <div className="w-full mb-6 px-1">
                <div className="flex justify-between text-[10px] text-white/40 uppercase tracking-wider mb-1.5">
                  <span>Rank Progress</span>
                  <span>
                    {Math.floor(progress * 100)}% · {(nextThreshold - score).toLocaleString()} pts to {nextRank}
                  </span>
                </div>
                <div className="h-2.5 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                  <motion.div
                    className="h-full rounded-full relative"
                    style={{ background: `linear-gradient(90deg, ${rankColor}88, ${rankColor})` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress * 100}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                  </motion.div>
                </div>
              </div>
            )}

            {!nextThreshold && (
              <div className="w-full mb-6 p-3 rounded-xl border text-center"
                style={{ borderColor: `${rankColor}30`, background: `${rankColor}08` }}>
                <Star className="w-4 h-4 mx-auto mb-1" style={{ color: rankColor }} />
                <div className="text-xs font-bold text-white">Maximum Rank Achieved</div>
              </div>
            )}

            {/* Stats */}
            <div className="w-full grid grid-cols-2 gap-2 mb-6">
              <StatRow icon={<Swords className="w-3.5 h-3.5 text-red-400" />} label="Attack" value={stats.attack} color="#ef4444" max={110} delay={0} />
              <StatRow icon={<Shield className="w-3.5 h-3.5 text-blue-400" />} label="Defense" value={stats.defense} color="#3b82f6" max={90} delay={0.05} />
              <StatRow icon={<Zap className="w-3.5 h-3.5 text-purple-400" />} label="Magic" value={stats.magic} color="#a855f7" max={120} delay={0.1} />
              <StatRow icon={<Heart className="w-3.5 h-3.5 text-green-400" />} label="HP Pool" value={stats.hp} color="#22c55e" max={650} delay={0.15} />
              <StatRow icon={<Wind className="w-3.5 h-3.5 text-cyan-400" />} label="Speed" value={stats.speed} color="#06b6d4" max={35} delay={0.2} />
              <StatRow icon={<TrendingUp className="w-3.5 h-3.5 text-yellow-400" />} label="Power" value={score} color="#eab308" max={1000000} delay={0.25} />
            </div>

            {/* ── Mystery Chest (prominent timer) ── */}
            <div className="w-full p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <img src={GAME_ASSETS.mysteryboxClosed} className="w-6 h-6 object-contain" alt="" />
                  <span className="text-xs font-bold uppercase tracking-wider text-yellow-400">Mystery Chest</span>
                </div>
                <div className={`text-xs font-mono font-bold ${canOpen ? "text-green-400" : "text-yellow-400/60"}`}>
                  {canOpen ? "READY" : `${countdown.hours}h ${countdown.minutes}m ${countdown.seconds}s`}
                </div>
              </div>

              {/* Big Timer Bar */}
              {!canOpen && (
                <div className="mb-3">
                  <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-yellow-600 to-orange-500 rounded-full"
                      initial={{ width: "100%" }}
                      animate={{ width: `${(countdown.minutes / 120) * 100}%` }}
                      transition={{ duration: 1 }}
                    />
                  </div>
                </div>
              )}

              <motion.button
                whileHover={canOpen && !isOpening ? { scale: 1.02 } : {}}
                whileTap={canOpen && !isOpening ? { scale: 0.98 } : {}}
                onClick={handleOpenChest}
                disabled={!canOpen || isOpening}
                className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  canOpen && !isOpening
                    ? "bg-gradient-to-r from-yellow-600 to-orange-600 text-white shadow-lg shadow-yellow-900/30 hover:shadow-yellow-900/50"
                    : "bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-800"
                }`}
              >
                {isOpening ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin" /> Opening…
                  </>
                ) : canOpen ? (
                  <>
                    <Sparkles className="w-4 h-4" /> Open Chest
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4" /> On Cooldown
                  </>
                )}
              </motion.button>

              <AnimatePresence>
                {showReward && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 flex flex-col items-center gap-1.5"
                  >
                    <div>{getRewardIcon()}</div>
                    <div className={`text-sm font-bold ${getRewardColor()}`}>{getRewardLabel()}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
