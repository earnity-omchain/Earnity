import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { CheckCircle2, X, Loader2, Gift, Star } from "lucide-react";

const BASE = "https://gmyplyxwxmkvptimzgid.supabase.co/storage/v1/object/public/Assets/Game%20assets";

// ── Reward definitions ────────────────────────────────────────────────────────
const REWARDS: {
  day: number;
  label: string;
  subLabel: string;
  img: string;
  color: string;
  glow: string;
}[] = [
  { day: 1, label: "50 Points",              subLabel: "Day 1",  img: `${BASE}/Seal1.png`,            color: "text-white/70",    glow: "rgba(255,255,255,0.15)" },
  { day: 2, label: "100 Points",             subLabel: "Day 2",  img: `${BASE}/Seal1.png`,            color: "text-white/70",    glow: "rgba(255,255,255,0.15)" },
  { day: 3, label: "100 Coins",              subLabel: "Day 3",  img: `${BASE}/200-coins.png`,        color: "text-yellow-400",  glow: "rgba(250,204,21,0.3)"  },
  { day: 4, label: "150 Points",             subLabel: "Day 4",  img: `${BASE}/Seal1.png`,            color: "text-white/70",    glow: "rgba(255,255,255,0.15)" },
  { day: 5, label: "500 Coins",              subLabel: "Day 5",  img: `${BASE}/1000-coins.png`,       color: "text-yellow-400",  glow: "rgba(250,204,21,0.3)"  },
  { day: 6, label: "Item Box",               subLabel: "Day 6",  img: `${BASE}/itembox-closed.png`,   color: "text-purple-400",  glow: "rgba(168,85,247,0.3)"  },
  { day: 7, label: "Mystery Box + 1000 Coins", subLabel: "Day 7", img: `${BASE}/mysterybox-closed.png`, color: "text-amber-400", glow: "rgba(251,191,36,0.4)"  },
];

// ── Claimed celebration overlay ───────────────────────────────────────────────
function ClaimedOverlay({ reward, onClose }: { reward: typeof REWARDS[0]; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm rounded-2xl z-10"
    >
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", damping: 14, delay: 0.1 }}
        className="w-28 h-28 mb-5"
      >
        <img src={reward.img} alt={reward.label} className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]" />
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="text-center px-4">
        <div className="flex items-center justify-center gap-2 mb-1">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <span className="text-green-400 font-semibold text-sm">Claimed!</span>
        </div>
        <p className={`text-2xl font-bold ${reward.color} mt-1`}>{reward.label}</p>
        <p className="text-white/40 text-xs mt-1">Come back tomorrow for your next reward</p>
      </motion.div>
      <motion.button
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
        onClick={onClose}
        className="mt-6 px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors border border-white/10"
      >
        Let's go! 🔥
      </motion.button>
    </motion.div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
interface DailyCheckInProps {
  userId: string;
  onClose: () => void;
  onClaimed: () => void;
}

export function DailyCheckIn({ userId, onClose, onClaimed }: DailyCheckInProps) {
  const [claimed, setClaimed] = useState(false);
  const [claimedReward, setClaimedReward] = useState<typeof REWARDS[0] | null>(null);

  // Fetch current check-in status
  const { data: status, isLoading } = useQuery({
    queryKey: ["checkin-modal-status", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_checkin_status", { p_user_id: userId });
      if (error) throw error;
      return data as {
        can_check_in: boolean;
        current_streak: number;
        next_day: number;           // 1–7, which day reward to show next
        last_checkin: string | null;
      };
    },
    staleTime: 0,
  });

  // Perform claim
  const claimMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .rpc("perform_daily_checkin", { p_user_id: userId });
      if (error) throw error;
      return data as { success: boolean; day: number; reward_type: string; reward_amount: number };
    },
    onSuccess: (data) => {
      const dayIndex = (data.day - 1) % 7;
      setClaimedReward(REWARDS[dayIndex]);
      setClaimed(true);
      onClaimed();
    },
  });

  const nextDay   = status?.next_day ?? 1;
  const dayIndex  = (nextDay - 1) % 7;           // 0-based index
  const todayReward = REWARDS[dayIndex];
  const streak    = status?.current_streak ?? 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 22 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-sm bg-[#0d0d0d] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
        >
          {/* Claimed overlay */}
          <AnimatePresence>
            {claimed && claimedReward && (
              <ClaimedOverlay reward={claimedReward} onClose={() => { setClaimed(false); onClose(); }} />
            )}
          </AnimatePresence>

          {/* Header */}
          <div className="relative px-5 pt-5 pb-4 border-b border-white/8">
            <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-white">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center">
                <Star className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Daily Check-In</h2>
                <p className="text-xs text-white/40">Resets every 24 hours</p>
              </div>
            </div>
            {streak > 0 && (
              <div className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-full border border-orange-500/20 bg-orange-500/8 w-fit">
                <span className="text-base">🔥</span>
                <span className="text-xs font-semibold text-orange-400">{streak} day streak</span>
              </div>
            )}
          </div>

          {/* 7-day reward grid */}
          <div className="p-5">
            <div className="grid grid-cols-7 gap-1.5 mb-5">
              {REWARDS.map((r, i) => {
                const dayNum    = i + 1;
                // streak = how many consecutive days claimed. Day <= streak means claimed.
                const isClaimed = dayNum <= streak;
                // next_day is the day to claim today
                const isToday   = dayNum === nextDay && !isClaimed;
                const isFuture  = !isClaimed && !isToday;

                return (
                  <div
                    key={r.day}
                    className={`relative flex flex-col items-center gap-1 rounded-xl border p-1.5 transition-all ${
                      isClaimed ? "border-green-500/30 bg-green-500/8" :
                      isToday   ? "border-yellow-400/40 bg-yellow-400/10 shadow-[0_0_12px_rgba(250,204,21,0.15)]" :
                                  "border-white/8 bg-white/3 opacity-50"
                    }`}
                  >
                    <span className="text-[8px] text-white/40 font-medium">D{dayNum}</span>
                    <div className="w-6 h-6 relative">
                      {isClaimed ? (
                        <div className="w-full h-full rounded-full bg-green-500/20 flex items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                        </div>
                      ) : (
                        <img src={r.img} alt={r.label} className={`w-full h-full object-contain ${isFuture ? "grayscale opacity-40" : ""}`} />
                      )}
                    </div>
                    {isToday && (
                      <span className="absolute -top-1 left-1/2 -translate-x-1/2 text-[7px] bg-yellow-400 text-black font-bold px-1 rounded-full">
                        TODAY
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Today's big reward card */}
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-white/30" />
              </div>
            ) : status?.can_check_in ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center mb-4"
                style={{ boxShadow: `0 0 30px ${todayReward.glow}` }}>
                <p className="text-[10px] uppercase tracking-widest text-white/35 mb-3">Today's Reward</p>
                <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2.5, repeat: Infinity }}
                  className="w-20 h-20 mx-auto mb-3">
                  <img src={todayReward.img} alt={todayReward.label}
                    className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]" />
                </motion.div>
                <p className={`text-xl font-bold ${todayReward.color}`}>{todayReward.label}</p>
                <p className="text-xs text-white/35 mt-1">{todayReward.subLabel}</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/8 bg-white/3 p-5 text-center mb-4">
                <Gift className="w-10 h-10 text-white/15 mx-auto mb-2" />
                <p className="text-sm font-medium text-white/40">Already claimed today</p>
                <p className="text-xs text-white/25 mt-1">Come back in 24 hours</p>
              </div>
            )}

            {/* Claim button */}
            <button
              onClick={() => claimMutation.mutate()}
              disabled={!status?.can_check_in || claimMutation.isPending}
              className={`w-full h-12 rounded-xl font-semibold text-sm transition-all ${
                status?.can_check_in
                  ? "bg-yellow-400 hover:bg-yellow-300 text-black shadow-[0_0_20px_rgba(250,204,21,0.3)] hover:shadow-[0_0_30px_rgba(250,204,21,0.5)]"
                  : "bg-white/5 text-white/25 cursor-not-allowed border border-white/8"
              }`}
            >
              {claimMutation.isPending
                ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                : status?.can_check_in
                  ? "Claim Reward"
                  : "Already Claimed"}
            </button>

            {claimMutation.isError && (
              <p className="text-xs text-red-400 text-center mt-2">
                {claimMutation.error instanceof Error ? claimMutation.error.message : "Something went wrong"}
              </p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
