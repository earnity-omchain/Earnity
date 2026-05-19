import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield, Swords, Clock, Users, Sparkles,
  Zap, Heart, Skull, Gem, ChevronDown,
  Flame, Droplets, Mountain, Wind, TreePine, CloudLightning,
  Copy, Check, Trophy, Scroll, ChevronRight, User,
  Star, Gift, Package, Coins,
} from "lucide-react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { ELEMENT_META, getGuildImage, GAME_ASSETS } from "@/lib/assets";
import { ITEM_META, GAME_ITEMS, MP_MAX, canOpenChest, getChestCooldownRemaining } from "@/lib/game-config";
import {
  getGuildsWithRanking,
  getInventory,
  getUserMP,
  openChest,
  getAttackLog,
} from "@/lib/supabase-gw";
import { DailyCheckIn } from "@/components/daily-checkin";
import Stronghold from "@/components/Stronghold";

const LOGO_URL = "https://gmyplyxwxmkvptimzgid.supabase.co/storage/v1/object/public/Assets/Logo/logo.jpg";

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

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-white"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function useCountdown(target: Date) {
  const calc = () => {
    const diff = target.getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
      expired: false,
    };
  };
  const [t, setT] = useState(calc);
  useEffect(() => {
    setT(calc());
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
  }, [target.getTime()]);
  return t;
}

/* ── Full Daily Check-In Panel (replaces inventory in menu) ── */
function DailyCheckInPanel({
  userId,
  checkInStatus,
  onClaim,
}: {
  userId: string;
  checkInStatus: any;
  onClaim: () => void;
}) {
  const queryClient = useQueryClient();
  const [claimed, setClaimed] = useState(false);
  const [imgError, setImgError] = useState(false);

  const canCheckIn = checkInStatus?.can_check_in ?? false;
  const streak = checkInStatus?.current_streak ?? 0;
  const nextDay = checkInStatus?.next_day ?? 1;

  const claimMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("perform_daily_checkin", { p_user_id: userId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setClaimed(true);
      onClaim();
      queryClient.invalidateQueries({ queryKey: ["checkin-status", userId] });
      queryClient.invalidateQueries({ queryKey: ["landing-full-profile", userId] });
      queryClient.invalidateQueries({ queryKey: ["landing-profile", userId] });
    },
  });

  useEffect(() => {
    if (canCheckIn) setClaimed(false);
  }, [canCheckIn]);

  const rewards = [
    { day: 1, type: "points", amount: 50, icon: <Star className="w-3.5 h-3.5 text-yellow-400" />, label: "50 PTS" },
    { day: 2, type: "points", amount: 100, icon: <Star className="w-3.5 h-3.5 text-yellow-400" />, label: "100 PTS" },
    { day: 3, type: "coins", amount: 100, icon: <img src={GAME_ASSETS.coin} className="w-3.5 h-3.5 object-contain" alt="" />, label: "100" },
    { day: 4, type: "points", amount: 150, icon: <Star className="w-3.5 h-3.5 text-yellow-400" />, label: "150 PTS" },
    { day: 5, type: "coins", amount: 500, icon: <img src={GAME_ASSETS.coin} className="w-3.5 h-3.5 object-contain" alt="" />, label: "500" },
    { day: 6, type: "item", amount: 1, icon: <Package className="w-3.5 h-3.5 text-blue-400" />, label: "ITEM" },
    { day: 7, type: "mystery", amount: 1, icon: <Gift className="w-3.5 h-3.5 text-purple-400" />, label: "BOX +1k" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <CalendarIcon />
          <span className="text-[10px] uppercase tracking-wider text-white/40">Daily Rewards</span>
        </div>
        <span className="text-[10px] text-white/25">{streak} day streak</span>
      </div>

      {/* 7-day grid */}
      <div className="grid grid-cols-7 gap-1">
        {rewards.map((r) => {
          const isPast = r.day < nextDay;
          const isToday = r.day === nextDay && canCheckIn;
          const isCurrent = r.day === nextDay;
          const isClaimed = r.day < nextDay || (isCurrent && claimed);

          return (
            <div
              key={r.day}
              className={`flex flex-col items-center gap-1 rounded-lg border p-1.5 transition-all ${
                isClaimed
                  ? "border-green-500/30 bg-green-500/10"
                  : isToday
                  ? "border-yellow-500/50 bg-yellow-500/10 shadow-[0_0_12px_rgba(234,179,8,0.15)]"
                  : "border-white/5 bg-white/5"
              }`}
            >
              <span className={`text-[9px] font-bold ${isCurrent ? "text-yellow-400" : "text-white/30"}`}>
                {r.day}
              </span>
              <div className="w-5 h-5 flex items-center justify-center">
                {isClaimed ? (
                  <Check className="w-3.5 h-3.5 text-green-400" />
                ) : (
                  r.icon
                )}
              </div>
              <span className={`text-[8px] font-bold ${isCurrent ? "text-white/80" : "text-white/30"}`}>
                {r.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Claim button */}
      {canCheckIn ? (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => claimMutation.mutate()}
          disabled={claimMutation.isPending || claimed}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
            claimed
              ? "bg-green-500/10 border-green-500/30 text-green-400"
              : "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/40 text-yellow-400 hover:from-yellow-500/30 hover:to-orange-500/30"
          }`}
        >
          {claimed ? (
            <><Check className="w-4 h-4" /><span className="text-sm font-bold">Claimed!</span></>
          ) : claimMutation.isPending ? (
            <><Sparkles className="w-4 h-4 animate-spin" /><span className="text-sm font-bold">Claiming…</span></>
          ) : (
            <><Gift className="w-4 h-4" /><span className="text-sm font-bold">Claim Day {nextDay} Reward</span></>
          )}
        </motion.button>
      ) : (
        <div className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/30 text-xs">
          <Clock className="w-3.5 h-3.5" />
          Come back tomorrow for Day {nextDay}
        </div>
      )}
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

/* ── Inline Chest — SERVER TRUTH, ALWAYS VISIBLE TIMER ── */
function InlineChest({ userId, profile }: { userId: string; profile: any }) {
  const queryClient = useQueryClient();
  const [reward, setReward] = useState<any>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [showReward, setShowReward] = useState(false);

  const lastOpened = profile?.last_chest_opened;
  const canOpen = canOpenChest(lastOpened);
  const cooldownRemaining = getChestCooldownRemaining(lastOpened);
  const cooldownMs = cooldownRemaining * 60 * 60 * 1000;
  const targetDate = useMemo(() => new Date(Date.now() + Math.max(0, cooldownMs)), [cooldownMs]);
  const countdown = useCountdown(targetDate);

  const openMutation = useMutation({
    mutationFn: () => openChest(userId),
    onSuccess: (result) => {
      setReward(result.reward);
      setIsOpening(false);
      setShowReward(true);
      queryClient.invalidateQueries({ queryKey: ["landing-full-profile", userId] });
      queryClient.invalidateQueries({ queryKey: ["landing-profile", userId] });
      queryClient.invalidateQueries({ queryKey: ["inventory", userId] });
      setTimeout(() => setShowReward(false), 4000);
    },
    onError: (err: any) => {
      setIsOpening(false);
      setReward({ type: "error", message: err.message });
      setShowReward(true);
      setTimeout(() => setShowReward(false), 3000);
    },
  });

  const handleOpen = () => {
    if (!canOpen || isOpening) return;
    setIsOpening(true);
    setReward(null);
    setShowReward(false);
    openMutation.mutate();
  };

  const getRewardIcon = () => {
    if (!reward || reward.type === "error") return <Sparkles className="w-10 h-10 text-yellow-400" />;
    
    switch (reward.type) {
      case "coin": 
        return <img src={GAME_ASSETS.coin} className="w-10 h-10 object-contain" alt="" />;
      case "shard": {
        const src = ELEMENT_META[reward.subtype]?.shard || ELEMENT_META[reward.subtype]?.img;
        return src ? <img src={src} className="w-10 h-10 object-contain" alt="" /> : <Gem className="w-10 h-10 text-blue-400" />;
      }
      case "elemental": {
        const src = ELEMENT_META[reward.subtype]?.img;
        return src ? <img src={src} className="w-10 h-10 object-contain" alt="" /> : <Star className="w-10 h-10 text-purple-400" />;
      }
      case "item": {
        const src = ITEM_META[reward.subtype]?.image;
        return src ? <img src={src} className="w-10 h-10 object-contain" alt="" /> : <Package className="w-10 h-10 text-red-400" />;
      }
      default: 
        return <Sparkles className="w-10 h-10 text-yellow-400" />;
    }
  };

  const getRewardLabel = () => {
    if (!reward) return "Opening…";
    if (reward.type === "error") return reward.message;
    switch (reward.type) {
      case "coin": return `${reward.quantity?.toLocaleString?.() ?? reward.quantity} Coins`;
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
    <div className="flex flex-col items-center gap-4">
      <motion.div
        whileHover={canOpen && !isOpening ? { scale: 1.08, y: -4 } : {}}
        whileTap={canOpen && !isOpening ? { scale: 0.95 } : {}}
        onClick={handleOpen}
        className={`relative w-36 h-36 rounded-3xl border-2 flex items-center justify-center overflow-hidden transition-all ${
          canOpen && !isOpening
            ? "border-yellow-400/50 bg-gradient-to-br from-yellow-500/20 via-orange-500/10 to-yellow-600/20 cursor-pointer hover:border-yellow-300/70 hover:shadow-[0_0_40px_rgba(234,179,8,0.25)]"
            : "border-zinc-700/50 bg-zinc-900/40 cursor-not-allowed"
        }`}
      >
        {canOpen && !isOpening && (
          <motion.div
            className="absolute inset-0 rounded-3xl"
            animate={{ boxShadow: ["0 0 0px rgba(234,179,8,0)", "0 0 30px rgba(234,179,8,0.2)", "0 0 0px rgba(234,179,8,0)"] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}

        {canOpen && !isOpening && (
          <>
            <motion.div className="absolute w-1 h-1 rounded-full bg-yellow-400/60" animate={{ y: [-20,-60], x: [-10,10], opacity: [0,1,0] }} transition={{ duration: 2, repeat: Infinity, delay: 0 }} />
            <motion.div className="absolute w-1.5 h-1.5 rounded-full bg-orange-400/40" animate={{ y: [-10,-50], x: [10,-10], opacity: [0,1,0] }} transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }} />
            <motion.div className="absolute w-1 h-1 rounded-full bg-yellow-300/50" animate={{ y: [-15,-55], x: [5,15], opacity: [0,1,0] }} transition={{ duration: 2.2, repeat: Infinity, delay: 1 }} />
          </>
        )}

        <motion.img
          src={isOpening ? GAME_ASSETS.mysteryboxOpened : GAME_ASSETS.mysteryboxClosed}
          alt="chest"
          className="w-24 h-24 object-contain relative z-10"
          animate={isOpening ? { rotate: [0,-12,12,-12,12,0], scale: [1,1.15,1] } : canOpen ? { y: [0,-3,0] } : {}}
          transition={isOpening ? { duration: 0.4, repeat: Infinity } : { duration: 2, repeat: Infinity }}
        />

        {!canOpen && !isOpening && !showReward && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center rounded-3xl z-20">
            <Clock className="w-8 h-8 text-zinc-400 mb-2" />
            <div className="text-xs font-mono font-bold text-zinc-300 tabular-nums">
              {String(countdown.hours).padStart(2, "0")}:{String(countdown.minutes).padStart(2, "0")}:{String(countdown.seconds).padStart(2, "0")}
            </div>
          </div>
        )}

        <AnimatePresence>
          {showReward && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/95 backdrop-blur-md p-3 rounded-3xl z-30"
            >
              <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", damping: 12 }}>
                {getRewardIcon()}
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={`text-sm font-bold text-center mt-2 ${getRewardColor()}`}>
                {getRewardLabel()}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="flex flex-col items-center gap-1">
        {canOpen ? (
          <motion.div className="flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/30" animate={{ opacity: [1,0.7,1] }} transition={{ duration: 2, repeat: Infinity }}>
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-bold text-yellow-400">Ready to Open!</span>
          </motion.div>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/80 border border-zinc-700">
            <Clock className="w-4 h-4 text-zinc-500" />
            <span className="text-sm font-mono font-bold text-zinc-300 tabular-nums">
              {String(countdown.hours).padStart(2, "0")}:{String(countdown.minutes).padStart(2, "0")}:{String(countdown.seconds).padStart(2, "0")}
            </span>
          </div>
        )}
        <span className="text-[10px] text-zinc-600 uppercase tracking-widest">Mystery Chest</span>
      </div>
    </div>
  );
}

/* ── Profile Menu — FULL DAILY CHECK-IN, AVATAR FIX, ELEMENTAL VISIBLE ── */
function ProfileMenu({
  full, profile, referralCodes, checkInStatus, signOut, currentMP, userId, onCheckInClaim,
}: {
  full: any; profile: any; referralCodes: any[]; checkInStatus: any;
  signOut: () => void; currentMP?: number; userId: string; onCheckInClaim: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [, setLocation] = useLocation();
  
  const el = full?.element ? ELEMENT_META[full.element] : null;
  const wallet = full?.wallet_address;
  const short = wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : null;
  const username = full?.username ?? profile?.username ?? "Player";
  const score = full?.contribution_score ?? 0;
  const coins = full?.coin_balance ?? full?.coins;
  const activeCodes = (referralCodes ?? []).filter((c: any) => c.is_active && !c.used_by);

  const hasAvatar = full?.discord_avatar && !avatarError;

  return (
    <div className="relative">
      {/* TRIGGER — always shows avatar + elemental badge */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition-colors"
      >
        {hasAvatar ? (
          <img
            src={full.discord_avatar}
            onError={() => setAvatarError(true)}
            className={`w-7 h-7 rounded-lg border ${el?.border ?? "border-white/20"} object-cover`}
            alt=""
          />
        ) : (
          <div className={`w-7 h-7 rounded-lg border ${el?.border ?? "border-white/20"} bg-white/10 flex items-center justify-center text-xs font-bold text-white`}>
            {username.charAt(0).toUpperCase()}
          </div>
        )}
        
        <span className="text-sm text-white/80 font-medium hidden sm:block">{username}</span>
        
        {el && (
          <div className={`hidden sm:flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md border border-white/10 bg-white/5 ${el.text}`}>
            {ELEMENT_ICONS[full.element]}
            <span className="capitalize">{el.label}</span>
          </div>
        )}
        
        <ChevronDown className={`w-3 h-3 text-white/40 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-white/10 bg-black/90 backdrop-blur-2xl shadow-2xl z-[100] overflow-hidden"
          >
            {/* HEADER — big avatar + name + elemental */}
            <div className="p-4 border-b border-white/10 flex items-center gap-3">
              {hasAvatar ? (
                <img
                  src={full.discord_avatar}
                  onError={() => setAvatarError(true)}
                  className={`w-14 h-14 rounded-xl border-2 ${el?.border ?? "border-white/20"} object-cover`}
                  alt=""
                />
              ) : (
                <div className={`w-14 h-14 rounded-xl border-2 ${el?.border ?? "border-white/20"} bg-white/10 flex items-center justify-center text-xl font-bold text-white`}>
                  {username.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="font-semibold text-white truncate">{username}</div>
                {el ? (
                  <div className={`flex items-center gap-1.5 text-xs ${el.text} mt-0.5`}>
                    {ELEMENT_ICONS[full.element]}
                    <span className="font-medium">{el.label} element bound</span>
                  </div>
                ) : (
                  <div className="text-[10px] text-white/30 mt-0.5">No element selected</div>
                )}
              </div>
            </div>

            {/* MP bar */}
            <div className="px-4 py-3 border-b border-white/10">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase tracking-wider text-yellow-400 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> MP
                </span>
                <span className="text-xs font-mono text-white/60">
                  {currentMP ?? "—"} / {MP_MAX}
                </span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 rounded-full" style={{ width: `${((currentMP || 0) / MP_MAX) * 100}%` }} />
              </div>
            </div>

            {/* Points + Coins */}
            <div className="grid grid-cols-2 divide-x divide-white/8 border-b border-white/10">
              <div className="py-3 text-center">
                <div className="text-base font-bold text-white tabular-nums">{score.toLocaleString()}</div>
                <div className="text-[10px] text-white/35 uppercase tracking-wider">Points</div>
              </div>
              <div className="py-3 text-center">
                <div className="flex items-center justify-center gap-1">
                  <img src={GAME_ASSETS.coin} className="w-4 h-4 object-contain" alt="" />
                  <span className="text-base font-bold text-yellow-400 tabular-nums">
                    {coins != null ? coins.toLocaleString() : "—"}
                  </span>
                </div>
                <div className="text-[10px] text-white/35 uppercase tracking-wider">Coins</div>
              </div>
            </div>

            {/* FULL DAILY CHECK-IN PANEL (replaces inventory) */}
            <div className="px-4 py-3 border-b border-white/10">
              <DailyCheckInPanel
                userId={userId}
                checkInStatus={checkInStatus}
                onClaim={onCheckInClaim}
              />
            </div>

            {/* Wallet */}
            {short && (
              <div className="px-4 py-3 border-b border-white/10">
                <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">Bound Wallet</div>
                <div className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2">
                  <span className="font-mono text-xs text-white/60">{short}</span>
                  <CopyBtn text={wallet} />
                </div>
              </div>
            )}

            {/* Referral codes */}
            <div className="px-4 py-3 border-b border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-white/30" />
                  <span className="text-[10px] uppercase tracking-wider text-white/40">Referral Codes</span>
                </div>
                <span className="text-[10px] text-white/25">+50 pts each</span>
              </div>
              {activeCodes.length > 0 ? (
                activeCodes.slice(0, 3).map((c: any) => (
                  <div key={c.code} className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2 border border-white/10 mb-1">
                    <span className="font-mono text-xs tracking-widest text-white/80">{c.code}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-green-400">Active</span>
                      <CopyBtn text={c.code} />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-white/30 text-center py-2 bg-white/5 rounded-xl">Codes being generated…</p>
              )}
            </div>

            {/* Actions */}
            <div className="p-2 space-y-0.5">
              <button
                onClick={() => { setLocation("/profile"); setOpen(false); }}
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/8 transition-colors text-left flex items-center gap-2"
              >
                <User className="w-3.5 h-3.5 text-white/40" />
                <span>View Full Profile</span>
                <ChevronRight className="w-3.5 h-3.5 text-white/30 ml-auto" />
              </button>
              <button
                onClick={() => { signOut(); setOpen(false); }}
                className="w-full px-3 py-2 rounded-xl text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left"
              >
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Attack Log ── */
function AttackLogMini() {
  const { data: attackLog } = useQuery({
    queryKey: ["attack-log"],
    queryFn: () => getAttackLog(10),
    refetchInterval: 15000,
  });

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-2">
        <Scroll className="w-3.5 h-3.5" /> Recent War Activity
      </h3>
      <div className="space-y-2 max-h-[200px] overflow-y-auto">
        {attackLog?.length === 0 && (
          <div className="text-center py-4 text-zinc-600 text-xs">The battlefield is quiet… for now.</div>
        )}
        {attackLog?.map((attack) => {
          const meta = ITEM_META[attack.item_type];
          const isNuke = attack.item_type === GAME_ITEMS.NUKE;
          return (
            <div key={attack.id} className={`flex items-center gap-2 p-2 rounded-lg border ${isNuke ? "border-red-900/20 bg-red-950/5" : "border-zinc-800/50 bg-zinc-900/20"}`}>
              <div className={isNuke ? "text-red-400" : "text-zinc-500"}>
                {ITEM_ICONS[attack.item_type] || <Swords className="w-3 h-3" />}
              </div>
              <div className="flex-1 min-w-0 text-xs">
                <span className="text-zinc-300 font-medium truncate">{attack.attacker_name}</span>
                <span className="text-zinc-600"> used </span>
                <span className={isNuke ? "text-red-400 font-bold" : "text-zinc-400 font-bold"}>{meta?.label}</span>
                <span className="text-zinc-600"> on </span>
                <span className="text-zinc-300">{attack.target_name}</span>
              </div>
              <div className="text-[10px] text-zinc-600 font-mono">{meta?.mpCost || 0}MP</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Guild Rankings ── */
function GuildRankingsMini({ myGuildId }: { myGuildId?: string }) {
  const { data: guilds, isLoading } = useQuery({
    queryKey: ["guilds-ranked"],
    queryFn: getGuildsWithRanking,
    refetchInterval: 30000,
  });

  if (isLoading) return <div className="text-center py-8 text-zinc-600 text-sm">Loading rankings…</div>;

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-2">
        <Trophy className="w-3.5 h-3.5" /> Guild Rankings
      </h3>
      <div className="space-y-2">
        {guilds?.slice(0, 5).map((guild, index) => {
          const el = ELEMENT_META[guild.element] || ELEMENT_META.fire;
          const isMyGuild = myGuildId === guild.id;
          return (
            <div key={guild.id} className={`flex items-center gap-3 p-2.5 rounded-lg border ${isMyGuild ? el.border : "border-zinc-800"} ${isMyGuild ? el.bg : "bg-zinc-900/20"}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                index === 0 ? "bg-yellow-500/20 text-yellow-400" : index === 1 ? "bg-zinc-400/20 text-zinc-300" : index === 2 ? "bg-orange-700/20 text-orange-400" : "bg-zinc-800 text-zinc-600"
              }`}>
                {index + 1}
              </div>
              <img src={getGuildImage(guild.name, guild.element)} alt={guild.name} className="w-8 h-8 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold truncate">{guild.name}</div>
                <div className={`text-[10px] flex items-center gap-1 ${el.text}`}>
                  {ELEMENT_ICONS[guild.element]}
                  {el.label}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-mono font-bold">{guild.ranking_score.toLocaleString()}</div>
                <div className="text-[10px] text-zinc-600">{guild.member_count} members</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-center mt-3">
        <span className="text-[10px] text-zinc-600">Ranked by member coins + guild score</span>
      </div>
    </div>
  );
}

/* ── Guide Section ── */
function GuideSection() {
  const guides = [
    { icon: Swords, title: "Attack", desc: "Use Nuke (100MP), Drain (25MP), or Rug (50MP) to weaken enemy guilds. Items come from mystery chests.", color: "text-red-400", border: "border-red-500/20", bg: "bg-red-950/10" },
    { icon: Shield, title: "Defend", desc: "Activate Shield to block all attacks for 24h. Use HP Potions to restore 10% guild HP. 5h cooldown per item type.", color: "text-blue-400", border: "border-blue-500/20", bg: "bg-blue-950/10" },
    { icon: Zap, title: "MP System", desc: "MP starts at 100 and regenerates fully over 48 hours. MP Potions restore instantly. Plan your attacks wisely.", color: "text-yellow-400", border: "border-yellow-500/20", bg: "bg-yellow-950/10" },
    { icon: Gem, title: "Crafting", desc: "Collect 4 identical shards to craft 1 elemental. Gather 6 elementals to unlock wallet submission for GTD.", color: "text-purple-400", border: "border-purple-500/20", bg: "bg-purple-950/10" },
    { icon: Trophy, title: "Ranking", desc: "Guilds are ranked by total member coins + guild score. Daily check-ins add to your guild's score. Contribute to climb.", color: "text-green-400", border: "border-green-500/20", bg: "bg-green-950/10" },
    { icon: Sparkles, title: "Mystery Chest", desc: "Open every 2 hours for free. Drops: Coins (50%), Shards (25%), Items (20%), Elementals (5%).", color: "text-orange-400", border: "border-orange-500/20", bg: "bg-orange-950/10" },
  ];

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 md:p-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-black uppercase tracking-wider text-white mb-2">How Guild Wars Work</h2>
        <p className="text-sm text-zinc-500">Master the battlefield. Every action shapes your guild's fate.</p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {guides.map(({ icon: Icon, title, desc, color, border, bg }) => (
          <div key={title} className={`p-4 rounded-xl border ${border} ${bg}`}>
            <div className={`flex items-center gap-2 mb-2 ${color}`}>
              <Icon className="w-5 h-5" />
              <span className="font-bold text-sm">{title}</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Export ── */
export default function WaitingPhase({
  session,
  fullProfile,
  profile,
  referralCodes,
  checkInStatus,
  checkInOpen,
  setCheckInOpen,
  handleSignOut,
  refetchCheckIn,
  queryClient,
}: {
  session: Session;
  fullProfile: any;
  profile: any;
  referralCodes: any[];
  checkInStatus: any;
  checkInOpen: boolean;
  setCheckInOpen: (v: boolean) => void;
  handleSignOut: () => void;
  refetchCheckIn: () => void;
  queryClient: any;
}) {
  const [, setLocation] = useLocation();
  const userId = session.user.id;
  const myGuildId = fullProfile?.guild_id;
  const el = fullProfile?.element ? ELEMENT_META[fullProfile.element] : null;

  const { data: currentMP } = useQuery({
    queryKey: ["user-mp", userId],
    queryFn: () => getUserMP(userId),
    refetchInterval: 30000,
  });

  const { data: inventory } = useQuery({
    queryKey: ["inventory", userId],
    queryFn: () => getInventory(userId),
  });

  const mpPercent = currentMP ? (currentMP / MP_MAX) * 100 : 0;
  const coinDisplay = fullProfile?.coin_balance ?? fullProfile?.coins;

  const handleCheckInClaim = () => {
    refetchCheckIn();
    queryClient.invalidateQueries({ queryKey: ["landing-full-profile", userId] });
  };

  return (
    <div className="relative min-h-screen text-white">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${GAME_ASSETS.background2})` }} />
        <div className="absolute inset-0 bg-black/60" />
      </div>

      <div className="relative z-10">
        {/* Nav */}
        <nav className="sticky top-0 z-50 flex items-center justify-between px-5 sm:px-10 py-4 border-b border-white/8 bg-black/40 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/15">
              <img src={LOGO_URL} className="w-full h-full object-cover" alt="Logo" />
            </div>
            <span className="text-sm font-bold tracking-tight hidden sm:block">EARNITY</span>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {[
              { label: "Rank", path: "/leaderboard" },
              { label: "Forge", path: "/forge" },
              { label: "Merchant", path: "/merchant" },
              { label: "Socials", path: "/socials" },
            ].map(({ label, path }) => (
              <button key={label} onClick={() => setLocation(path)} className="px-3 sm:px-4 py-1.5 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/8 transition-colors">
                {label}
              </button>
            ))}
          </div>

          <ProfileMenu
            full={fullProfile}
            profile={profile}
            referralCodes={referralCodes}
            checkInStatus={checkInStatus}
            signOut={handleSignOut}
            currentMP={currentMP}
            userId={userId}
            onCheckInClaim={handleCheckInClaim}
          />
        </nav>

        {/* Hero */}
        <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 py-16 text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", damping: 22 }} className="w-full max-w-md">
            <div className="relative w-36 h-36 mx-auto mb-10">
              {el && <div className={`absolute inset-0 rounded-full blur-3xl opacity-50 ${el.bg}`} />}
              <motion.img
                src={GAME_ASSETS.seal2}
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="w-full h-full object-contain relative z-10 drop-shadow-[0_0_50px_rgba(255,255,255,0.08)]"
              />
              {el && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4, type: "spring" }}
                  className={`absolute -bottom-1 -right-1 w-11 h-11 rounded-full border-2 ${el.border} ${el.bg} backdrop-blur-md flex items-center justify-center z-20`}
                >
                  <img src={el.img} className="w-6 h-6 object-contain" />
                </motion.div>
              )}
            </div>

            {el ? (
              <p className={`text-xs uppercase tracking-[0.2em] ${el.text} mb-3`}>{el.label} element bound</p>
            ) : (
              <p className="text-xs uppercase tracking-[0.2em] text-white/40 mb-3">Ready Combatant</p>
            )}

            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
              {el ? "Your path is chosen" : "Welcome to the arena"}
            </h1>
            <p className="mt-4 text-white/45 text-sm leading-relaxed max-w-xs mx-auto">
              The 20 guilds have been selected. The protocol has begun. Fight for your guild, climb the rankings, and claim glory.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-6">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setLocation("/battlefield")}
                className="px-8 py-3.5 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800 text-white font-bold text-sm transition-all"
              >
                Guild Wars
              </motion.button>
              <InlineChest userId={userId} profile={fullProfile} />
            </div>

            <div className={`mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full border ${el?.border ?? "border-white/10"} ${el?.bg ?? "bg-white/5"} backdrop-blur-md text-sm`}>
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className={el?.text ?? "text-white/50"}>
                {el ? `${el.label} element bound` : "Guild member active"}
              </span>
            </div>
          </motion.div>
        </div>

        {/* Rankings + Attack Log */}
        <div className="px-4 sm:px-8 py-12 max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2"><GuildRankingsMini myGuildId={myGuildId} /></div>
            <div className="lg:col-span-1"><AttackLogMini /></div>
          </div>

          {/* Stats Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {[
              { label: "Your MP", value: `${currentMP ?? "—"}/${MP_MAX}`, icon: Zap, color: "text-yellow-400", bar: true, pct: mpPercent },
              { label: "Your Coins", value: coinDisplay != null ? coinDisplay.toLocaleString() : "—", icon: () => <img src={GAME_ASSETS.coin} className="w-4 h-4" />, color: "text-yellow-400" },
              { label: "Guild HP", value: `${fullProfile?.guild_hp ?? "—"}%`, icon: Heart, color: "text-red-400" },
              { label: "Check-in Streak", value: `${checkInStatus?.current_streak ?? 0} days`, icon: Flame, color: "text-orange-400" },
            ].map(({ label, value, icon: Icon, color, bar, pct }) => (
              <div key={label} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</span>
                </div>
                <div className="text-lg font-mono font-bold text-white">{value}</div>
                {bar && <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-2"><div className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 rounded-full" style={{ width: `${pct}%` }} /></div>}
              </div>
            ))}
          </div>
        </div>

        {/* Guide */}
        <div className="px-4 sm:px-8 py-12 max-w-6xl mx-auto">
          <GuideSection />
        </div>

        <div className="h-20" />
        <Stronghold userId={userId} profile={fullProfile} />
      </div>

      {/* NO MORE DAILY CHECK-IN MODAL POPUP — everything is in the menu now */}
    </div>
  );
}
