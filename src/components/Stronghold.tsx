import { useState } from "react";
import { motion } from "framer-motion";
import {
  getRankFromScore,
  getBuildingImage,
  getGuildStats,
  RANK_COLORS,
  RANK_GLOW,
} from "@/lib/guild-leveling";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Swords, Shield, Zap, Heart, Wind, TrendingUp, Star,
} from "lucide-react";

/* ── Stat Row ── */
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

/* ── Stronghold Component ── */
export default function Stronghold({
  userId,
  profile,
}: {
  userId: string;
  profile: any;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const score =
    profile?.stronghold_score ??
    profile?.ranking_score ??
    profile?.contribution_score ??
    0;

  const { rank, progress, nextThreshold, nextRank, label } = getRankFromScore(score);
  const stats = getGuildStats(score);
  const rankColor = RANK_COLORS[rank];
  const glow = RANK_GLOW[rank];
  const buildingImg = getBuildingImage(rank);

  return (
    <>
      {/* ── Floating Trigger (replaces old floating chest) ── */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 flex items-center justify-center overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0a0a0a, #1a1a1a)",
          borderColor: `${rankColor}40`,
          boxShadow: `0 0 30px ${glow}`,
        }}
      >
        <motion.img
          src={buildingImg}
          alt="stronghold"
          className="w-12 h-12 sm:w-14 sm:h-14 object-contain drop-shadow-xl relative z-10"
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Rank color ambient fill */}
        <div
          className="absolute inset-0 opacity-20 z-0"
          style={{
            background: `radial-gradient(circle at 50% 80%, ${rankColor}, transparent 70%)`,
          }}
        />

        {/* Rank badge */}
        <div
          className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase border backdrop-blur-sm z-20"
          style={{
            background: `${rankColor}20`,
            borderColor: `${rankColor}60`,
            color: rankColor,
          }}
        >
          {rank}
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

            {/* Rank label */}
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

            {/* Progress bar */}
            {nextThreshold ? (
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
                    style={{
                      background: `linear-gradient(90deg, ${rankColor}88, ${rankColor})`,
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress * 100}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                  </motion.div>
                </div>
              </div>
            ) : (
              <div
                className="w-full mb-6 p-3 rounded-xl border text-center"
                style={{
                  borderColor: `${rankColor}30`,
                  background: `${rankColor}08`,
                }}
              >
                <Star className="w-4 h-4 mx-auto mb-1" style={{ color: rankColor }} />
                <div className="text-xs font-bold text-white">Maximum Rank Achieved</div>
              </div>
            )}

            {/* Stats grid */}
            <div className="w-full grid grid-cols-2 gap-2">
              <StatRow
                icon={<Swords className="w-3.5 h-3.5 text-red-400" />}
                label="Attack"
                value={stats.attack}
                color="#ef4444"
                max={110}
                delay={0}
              />
              <StatRow
                icon={<Shield className="w-3.5 h-3.5 text-blue-400" />}
                label="Defense"
                value={stats.defense}
                color="#3b82f6"
                max={90}
                delay={0.05}
              />
              <StatRow
                icon={<Zap className="w-3.5 h-3.5 text-purple-400" />}
                label="Magic"
                value={stats.magic}
                color="#a855f7"
                max={120}
                delay={0.1}
              />
              <StatRow
                icon={<Heart className="w-3.5 h-3.5 text-green-400" />}
                label="HP Pool"
                value={stats.hp}
                color="#22c55e"
                max={650}
                delay={0.15}
              />
              <StatRow
                icon={<Wind className="w-3.5 h-3.5 text-cyan-400" />}
                label="Speed"
                value={stats.speed}
                color="#06b6d4"
                max={35}
                delay={0.2}
              />
              <StatRow
                icon={<TrendingUp className="w-3.5 h-3.5 text-yellow-400" />}
                label="Power"
                value={score}
                color="#eab308"
                max={1000000}
                delay={0.25}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
