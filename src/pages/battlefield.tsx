import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { ELEMENT_META, getGuildImage, GAME_ASSETS } from "@/lib/assets";
import { ITEM_META, GAME_ITEMS, MP_MAX } from "@/lib/game-config";
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
import {
  Swords, Shield, Heart, Zap, Trophy, Clock,
  ArrowLeft, Flame, Droplets, Mountain, Wind, TreePine,
  CloudLightning, AlertTriangle, CheckCircle, X, ChevronRight,
  Users, Crosshair, Activity, MapPin, Sparkles, Target,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface AttackParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const ELEMENT_ICONS: Record<string, React.ReactNode> = {
  fire: <Flame className="w-3.5 h-3.5" />,
  water: <Droplets className="w-3.5 h-3.5" />,
  nature: <TreePine className="w-3.5 h-3.5" />,
  rock: <Mountain className="w-3.5 h-3.5" />,
  lightning: <CloudLightning className="w-3.5 h-3.5" />,
  lighting: <CloudLightning className="w-3.5 h-3.5" />,
  wind: <Wind className="w-3.5 h-3.5" />,
};

const ITEM_COLORS: Record<string, string> = {
  [GAME_ITEMS.NUKE]: "#ef4444",
  [GAME_ITEMS.DRAIN]: "#f97316",
  [GAME_ITEMS.RUG]: "#a855f7",
  [GAME_ITEMS.SHIELD]: "#3b82f6",
  [GAME_ITEMS.HP_POTION]: "#22c55e",
  [GAME_ITEMS.MP_POTION]: "#eab308",
};

const TABS = [
  { id: "battlefield", label: "Battlefield", icon: Crosshair },
  { id: "arsenal", label: "Arsenal", icon: Shield },
  { id: "log", label: "War Log", icon: Activity },
] as const;

// ── Attack Particles Canvas ───────────────────────────────────────────────────
function ParticleCanvas({ trigger, color }: { trigger: boolean; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<AttackParticle[]>([]);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (!trigger) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 2;
      particlesRef.current.push({
        id: Date.now() + i,
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color,
        size: Math.random() * 4 + 1,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);
      particlesRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.95;
        p.vy *= 0.95;
        p.life -= 0.025;
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      if (particlesRef.current.length > 0) {
        animRef.current = requestAnimationFrame(animate);
      }
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [trigger, color]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-30"
    />
  );
}

// ── HP Bar ────────────────────────────────────────────────────────────────────
function HPBar({ value, max = 100, animate: shouldAnimate = false, className = "" }: {
  value: number; max?: number; animate?: boolean; className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const color = pct > 60 ? "#22c55e" : pct > 30 ? "#eab308" : "#ef4444";
  const glow = pct > 60 ? "rgba(34,197,94,0.5)" : pct > 30 ? "rgba(234,179,8,0.5)" : "rgba(239,68,68,0.5)";

  return (
    <div className={`relative h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5 ${className}`}>
      <motion.div
        className="h-full rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: shouldAnimate ? 0.8 : 0.3, ease: "easeOut" }}
        style={{
          background: `linear-gradient(90deg, ${color}aa, ${color})`,
          boxShadow: `0 0 6px ${glow}`,
        }}
      />
      {pct < 30 && (
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{ opacity: [0, 0.3, 0] }}
          transition={{ duration: 1, repeat: Infinity }}
          style={{ background: `linear-gradient(90deg, transparent, ${color}44)` }}
        />
      )}
    </div>
  );
}

// ── MP / Energy Bar ────────────────────────────────────────────────────────────
function EnergyBar({ value, max = 100, color = "#a855f7", className = "" }: {
  value: number; max?: number; color?: string; className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={`relative h-1 bg-black/40 rounded-full overflow-hidden border border-white/5 ${className}`}>
      <motion.div
        className="h-full rounded-full"
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.5 }}
        style={{
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          boxShadow: `0 0 6px ${color}66`,
        }}
      />
    </div>
  );
}

// ── Confirm Attack Modal ──────────────────────────────────────────────────────
function ConfirmAttackModal({ guild, itemType, onConfirm, onCancel, isPending }: {
  guild: any; itemType: string; onConfirm: () => void; onCancel: () => void; isPending: boolean;
}) {
  const meta = ITEM_META[itemType];
  const el = ELEMENT_META[guild.element] || ELEMENT_META.fire;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: "spring", damping: 20 }}
        className="relative max-w-sm w-full rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0a0a0a, #111)",
          border: "1px solid rgba(239,68,68,0.3)",
          boxShadow: "0 0 60px rgba(239,68,68,0.15), 0 25px 50px rgba(0,0,0,0.8)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="h-1 bg-gradient-to-r from-red-600 via-red-500 to-orange-500" />
        <div className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <div className="font-black text-white text-sm uppercase tracking-wider">Confirm Attack</div>
              <div className="text-xs text-white/40">This action cannot be undone</div>
            </div>
          </div>

          <div className={`flex items-center gap-3 p-3 rounded-xl mb-4 border ${el.border} ${el.bg}`}>
            <img src={getGuildImage(guild.name, guild.element)} alt={guild.name}
              className="w-10 h-10 rounded-lg object-cover border border-white/10" />
            <div>
              <div className="font-bold text-white text-sm">{guild.name}</div>
              <div className={`text-xs flex items-center gap-1 ${el.text}`}>
                {ELEMENT_ICONS[guild.element]} {el.label} • HP: {guild.hp}%
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl mb-6 bg-white/3 border border-white/8">
            <img src={meta.image} alt={meta.label} className="w-10 h-10 object-contain" />
            <div className="flex-1">
              <div className="font-bold text-white text-sm">{meta.label}</div>
              <div className="text-xs text-white/40">{meta.description}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-black text-red-400">{meta.mpCost} MP</div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-all text-sm font-bold">
              Cancel
            </button>
            <button onClick={onConfirm} disabled={isPending}
              className="flex-1 py-2.5 rounded-xl text-white font-black text-sm transition-all relative overflow-hidden"
              style={{
                background: isPending ? "rgba(239,68,68,0.3)" : "linear-gradient(135deg, #dc2626, #ea580c)",
                boxShadow: isPending ? "none" : "0 0 20px rgba(239,68,68,0.4)",
              }}>
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                    <Zap className="w-4 h-4" />
                  </motion.div>
                  Attacking…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Crosshair className="w-4 h-4" /> Launch Attack
                </span>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Attack Result Toast ───────────────────────────────────────────────────────
function AttackToast({ message, success, onDismiss }: {
  message: string; success: boolean; onDismiss: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[400] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl"
      style={{
        background: success ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
        border: `1px solid ${success ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
        backdropFilter: "blur(20px)",
        boxShadow: success ? "0 0 40px rgba(34,197,94,0.2)" : "0 0 40px rgba(239,68,68,0.2)",
      }}
    >
      {success
        ? <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
        : <X className="w-5 h-5 text-red-400 flex-shrink-0" />
      }
      <span className="text-sm font-bold text-white">{message}</span>
    </motion.div>
  );
}

// ── Guild Building (Map Node) ─────────────────────────────────────────────────
function GuildBuilding({
  guild,
  index,
  isMyGuild,
  isSelected,
  onClick,
  attackParticle,
}: {
  guild: any; index: number; isMyGuild: boolean; isSelected: boolean;
  onClick: () => void; attackParticle: boolean;
}) {
  const el = ELEMENT_META[guild.element] || ELEMENT_META.fire;
  const shieldActive = guild.shield_active_until && new Date(guild.shield_active_until) > new Date();
  const guildImg = getGuildImage(guild.name, guild.element);
  const hp = guild.hp ?? 100;
  const power = Math.min(100, (guild.ranking_score || 0) / 100);

  // Staggered snake offset for isometric illusion
  const row = Math.floor(index / 5);
  const staggerOffset = row % 2 === 1 ? "translateX(1.5rem)" : "translateX(-0.5rem)";
  const depthOffset = `translateY(${index % 2 === 0 ? "0rem" : "1rem"})`;

  const rankColors = [
    { bg: "rgba(234,179,8,0.15)", border: "rgba(234,179,8,0.5)", text: "#fbbf24" },   // 1st
    { bg: "rgba(156,163,175,0.1)", border: "rgba(156,163,175,0.4)", text: "#9ca3af" }, // 2nd
    { bg: "rgba(180,83,9,0.1)", border: "rgba(180,83,9,0.4)", text: "#f97316" },      // 3rd
  ];
  const rankStyle = index < 3 ? rankColors[index] : { bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.08)", text: "#6b7280" };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: isSelected ? 1.05 : 1,
        filter: isSelected ? `drop-shadow(0 0 20px ${el.glow})` : `drop-shadow(0 0 8px ${el.glow}44)`,
      }}
      transition={{ delay: index * 0.03, type: "spring", damping: 18 }}
      onClick={onClick}
      className="relative cursor-pointer group select-none"
      style={{
        transform: `${staggerOffset} ${depthOffset}`,
        fontFamily: "'Space Mono', monospace",
      }}
    >
      {/* Attack particles overlay */}
      {attackParticle && (
        <div className="absolute inset-0 z-30 pointer-events-none overflow-visible">
          <ParticleCanvas trigger={attackParticle} color={ITEM_COLORS[GAME_ITEMS.NUKE]} />
        </div>
      )}

      {/* Building Card */}
      <div
        className="relative rounded-2xl overflow-hidden transition-all duration-300"
        style={{
          background: isSelected
            ? `linear-gradient(180deg, ${el.bg.replace("bg-", "").replace("/15", "")}22, rgba(5,5,5,0.95))`
            : "linear-gradient(180deg, rgba(20,20,20,0.9), rgba(5,5,5,0.95))",
          border: isSelected
            ? `1px solid ${el.border.replace("border-", "").replace("/50", "")}`
            : `1px solid ${rankStyle.border}`,
          boxShadow: isSelected
            ? `0 0 40px ${el.glow}33, inset 0 0 20px ${el.glow}11`
            : `0 4px 20px rgba(0,0,0,0.6)`,
        }}
      >
        {/* Shield shimmer overlay */}
        {shieldActive && (
          <motion.div
            className="absolute inset-0 pointer-events-none z-10"
            animate={{ opacity: [0.03, 0.12, 0.03] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.25), transparent 60%)" }}
          />
        )}

        {/* Selected pulse ring */}
        {isSelected && (
          <motion.div
            className="absolute inset-0 pointer-events-none rounded-2xl z-0"
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{ boxShadow: `inset 0 0 24px ${el.glow}` }}
          />
        )}

        {/* Rank Badge */}
        <div
          className="absolute top-2 left-2 z-20 w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0 shadow-lg"
          style={{ background: rankStyle.bg, border: `1px solid ${rankStyle.border}`, color: rankStyle.text }}
        >
          {index + 1}
        </div>

        {/* Shield Badge */}
        {shieldActive && (
          <div className="absolute top-2 right-2 z-20 px-1.5 py-0.5 rounded-md bg-blue-500/20 border border-blue-500/40 flex items-center gap-1">
            <Shield className="w-2.5 h-2.5 text-blue-400" />
            <span className="text-[8px] uppercase tracking-wider text-blue-400 font-bold">Shield</span>
          </div>
        )}

        {/* YOURS Badge */}
        {isMyGuild && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest"
            style={{ background: el.bg, border: `1px solid ${el.border}`, color: el.text }}>
            YOUR GUILD
          </div>
        )}

        {/* Building Image */}
        <div className="relative p-4 pb-2 flex flex-col items-center">
          {/* Ground shadow */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-20 h-3 bg-black/60 rounded-[100%] blur-sm" />

          <motion.div
            className="relative w-24 h-24 md:w-28 md:h-28"
            animate={isSelected ? { y: [0, -4, 0] } : {}}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <img
              src={guildImg}
              alt={guild.name}
              className="w-full h-full object-contain drop-shadow-2xl"
              style={{
                filter: `drop-shadow(0 0 12px ${el.glow}66) drop-shadow(0 4px 6px rgba(0,0,0,0.8))`,
              }}
              onError={(e) => { (e.target as HTMLImageElement).src = el.img; }}
            />
          </motion.div>

          {/* Floating HP Bar (above building) */}
          <div className="w-full mt-2 space-y-1">
            <div className="flex items-center gap-1.5">
              <Heart className="w-2.5 h-2.5 text-red-400 flex-shrink-0" />
              <HPBar value={hp} className="flex-1" />
              <span className="text-[9px] font-mono text-white/50 w-7 text-right">{hp}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-2.5 h-2.5 text-purple-400 flex-shrink-0" />
              <EnergyBar value={power} color={el.text.replace("text-", "#") || "#a855f7"} className="flex-1" />
            </div>
          </div>
        </div>

        {/* Guild Info Footer */}
        <div className="px-3 pb-3 pt-1 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-0.5">
            <span className="text-xs font-black text-white tracking-tight truncate max-w-[90%]">{guild.name}</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-[10px]">
            <span className={`flex items-center gap-1 ${el.text}`}>
              {ELEMENT_ICONS[guild.element]} {el.label}
            </span>
            <span className="text-white/20">·</span>
            <span className="flex items-center gap-1 text-white/30">
              <Users className="w-2.5 h-2.5" /> {guild.member_count || 0}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Guild Detail Panel (Slide-in / Bottom Sheet) ──────────────────────────────
function GuildDetailPanel({
  guild,
  isMyGuild,
  myGuildId,
  session,
  currentMP,
  inventory,
  myGuildCooldowns,
  attackMutation,
  defenseMutation,
  mpPotionMutation,
  onAttackItemClick,
  onClose,
}: {
  guild: any; isMyGuild: boolean; myGuildId?: string; session: any;
  currentMP: number; inventory: any[]; myGuildCooldowns: any[];
  attackMutation: any; defenseMutation: any; mpPotionMutation: any;
  onAttackItemClick: (item: string) => void;
  onClose: () => void;
}) {
  const el = ELEMENT_META[guild.element] || ELEMENT_META.fire;
  const shieldActive = guild.shield_active_until && new Date(guild.shield_active_until) > new Date();
  const guildImg = getGuildImage(guild.name, guild.element);

  const getItemQty = (type: string) =>
    inventory?.find(i => i.item_type === type)?.quantity || 0;

  const isOnCooldown = (itemType: string) => {
    if (!myGuildCooldowns) return false;
    const cd = myGuildCooldowns.find(c => c.item_type === itemType);
    return cd ? new Date((cd as any).expires_at) > new Date() : false;
  };

  const canAttack = !isMyGuild && !shieldActive && !!myGuildId;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[250] flex justify-end md:items-stretch items-end"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ x: "100%", y: 0 }}
        animate={{ x: 0, y: 0 }}
        exit={{ x: "100%", y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full md:w-[400px] h-[85vh] md:h-full bg-[#080808] border-l border-white/10 shadow-2xl overflow-y-auto"
        style={{ boxShadow: "-10px 0 40px rgba(0,0,0,0.8)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header Image */}
        <div className="relative h-40 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#080808] z-10" />
          <img src={guildImg} alt={guild.name} className="w-full h-full object-cover opacity-40" />
          <div className="absolute top-4 right-4 z-20">
            <button onClick={onClose} className="p-2 rounded-full bg-black/40 border border-white/10 text-white/60 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="absolute bottom-4 left-5 z-20">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg border ${el.border} ${el.bg}`}>
                {ELEMENT_ICONS[guild.element]}
              </div>
              <div>
                <h2 className="text-lg font-black text-white">{guild.name}</h2>
                <div className={`text-xs ${el.text} font-bold uppercase tracking-wider`}>{el.label} Guild</div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-white/3 border border-white/8">
              <div className="text-[9px] uppercase tracking-widest text-white/30 mb-1">Guild Master</div>
              <div className="text-sm font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
                {guild.guild_master || "Unknown"}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-white/3 border border-white/8">
              <div className="text-[9px] uppercase tracking-widest text-white/30 mb-1">Members</div>
              <div className="text-sm font-bold text-white flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                {guild.member_count || 0}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-white/3 border border-white/8">
              <div className="text-[9px] uppercase tracking-widest text-white/30 mb-1">Power Score</div>
              <div className="text-sm font-bold text-white tabular-nums">
                {(guild.ranking_score || 0).toLocaleString()}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-white/3 border border-white/8">
              <div className="text-[9px] uppercase tracking-widest text-white/30 mb-1">Rank</div>
              <div className="text-sm font-bold text-yellow-400 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" />
                #{guild.rank || "?"}
              </div>
            </div>
          </div>

          {/* HP & Shield Status */}
          <div className="p-4 rounded-xl space-y-3"
            style={{ background: "rgba(20,20,20,0.6)", border: `1px solid ${shieldActive ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.06)"}` }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-widest text-red-400">Fortress HP</span>
              <span className="text-xs font-mono text-white/50">{guild.hp ?? 100}%</span>
            </div>
            <HPBar value={guild.hp ?? 100} animate className="h-2" />
            {shieldActive && (
              <div className="flex items-center gap-2 text-xs text-blue-400 mt-2 p-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
                <Shield className="w-4 h-4" /> Shield Active — Attacks are being deflected
              </div>
            )}
            {isMyGuild && (
              <div className="flex items-center gap-2 text-xs text-yellow-400 mt-2 p-2 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                <AlertTriangle className="w-4 h-4" /> You cannot attack your own guild
              </div>
            )}
          </div>

          {/* Attack Section */}
          {session && myGuildId && !isMyGuild && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-red-400 mb-3 flex items-center gap-2">
                <Target className="w-3 h-3" /> Arsenal
              </div>
              <div className="space-y-2">
                {[GAME_ITEMS.NUKE, GAME_ITEMS.DRAIN, GAME_ITEMS.RUG].map(itemKey => {
                  const meta = ITEM_META[itemKey];
                  const qty = getItemQty(itemKey);
                  const hasMP = currentMP >= meta.mpCost;
                  const enabled = canAttack && hasMP && qty > 0;
                  return (
                    <button
                      key={itemKey}
                      onClick={() => enabled && onAttackItemClick(itemKey)}
                      disabled={!enabled || attackMutation.isPending}
                      className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all border"
                      style={{
                        background: enabled ? `${ITEM_COLORS[itemKey]}08` : "rgba(255,255,255,0.02)",
                        borderColor: enabled ? `${ITEM_COLORS[itemKey]}30` : "rgba(255,255,255,0.05)",
                        opacity: enabled ? 1 : 0.4,
                        cursor: enabled ? "pointer" : "not-allowed",
                      }}
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `${ITEM_COLORS[itemKey]}15`, border: `1px solid ${ITEM_COLORS[itemKey]}30` }}>
                        <img src={meta.image} alt={meta.label} className="w-7 h-7 object-contain" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-black text-white">{meta.label}</span>
                          <span className="text-xs font-mono text-white/30">×{qty}</span>
                        </div>
                        <div className="text-[10px] text-white/35 mt-0.5">{meta.description}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Zap className="w-2.5 h-2.5 text-purple-400" />
                          <span className="text-[10px] font-mono" style={{ color: hasMP ? ITEM_COLORS[itemKey] : "#ef4444" }}>
                            {meta.mpCost} MP
                          </span>
                        </div>
                      </div>
                      {enabled && <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: ITEM_COLORS[itemKey] }} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Defense Section (only if my guild) */}
          {isMyGuild && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-blue-400 mb-3 flex items-center gap-2">
                <Shield className="w-3 h-3" /> Defense Systems
              </div>
              <div className="space-y-2">
                {[GAME_ITEMS.SHIELD, GAME_ITEMS.HP_POTION, GAME_ITEMS.MP_POTION].map(itemKey => {
                  const meta = ITEM_META[itemKey];
                  const qty = getItemQty(itemKey);
                  const onCooldown = itemKey !== GAME_ITEMS.MP_POTION && isOnCooldown(itemKey);
                  const canUse = qty > 0 && !onCooldown;
                  return (
                    <div key={itemKey} className="flex items-center gap-3 p-2.5 rounded-lg"
                      style={{
                        background: canUse ? "rgba(59,130,246,0.05)" : "rgba(255,255,255,0.02)",
                        border: `1px solid ${canUse ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.05)"}`,
                        opacity: qty === 0 ? 0.4 : 1,
                      }}>
                      <img src={meta.image} alt={meta.label} className="w-8 h-8 object-contain flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-black text-white">{meta.label}</div>
                        <div className="text-[9px] text-white/30 truncate">{meta.description}</div>
                      </div>
                      <div className="text-xs font-mono text-white/30 mr-2">×{qty}</div>
                      {canUse && (
                        <button
                          onClick={() => {
                            if (itemKey === GAME_ITEMS.MP_POTION) mpPotionMutation.mutate();
                            else defenseMutation.mutate(itemKey);
                          }}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                          style={{
                            background: "rgba(59,130,246,0.2)",
                            border: "1px solid rgba(59,130,246,0.3)",
                            color: "#93c5fd",
                          }}
                        >
                          Use
                        </button>
                      )}
                      {onCooldown && (
                        <div className="flex items-center gap-1 text-[9px] text-white/25">
                          <Clock className="w-3 h-3" /> CD
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!session && (
            <div className="text-center py-6 text-white/30 text-sm border border-white/5 rounded-xl bg-white/3">
              Sign in to declare war
            </div>
          )}

          {!myGuildId && session && (
            <div className="text-center py-6 text-white/30 text-sm border border-white/5 rounded-xl bg-white/3">
              Join a guild to participate in wars
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Attack Item Button (Arsenal Tab) ───────────────────────────────────────────
function AttackItemButton({ itemKey, qty, currentMP, canAttack, isLoading, onClick }: {
  itemKey: string; qty: number; currentMP: number; canAttack: boolean;
  isLoading: boolean; onClick: () => void;
}) {
  const meta = ITEM_META[itemKey];
  const hasMP = currentMP >= meta.mpCost;
  const hasItem = qty > 0;
  const enabled = canAttack && hasMP && hasItem;
  const color = ITEM_COLORS[itemKey];

  return (
    <motion.button
      whileHover={enabled ? { scale: 1.02 } : {}}
      whileTap={enabled ? { scale: 0.97 } : {}}
      onClick={enabled ? onClick : undefined}
      disabled={!enabled || isLoading}
      className="relative w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all overflow-hidden"
      style={{
        background: enabled ? `${color}08` : "rgba(255,255,255,0.02)",
        border: `1px solid ${enabled ? `${color}33` : "rgba(255,255,255,0.05)"}`,
        opacity: enabled ? 1 : 0.45,
        cursor: enabled ? "pointer" : "not-allowed",
      }}
    >
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
        <img src={meta.image} alt={meta.label} className="w-7 h-7 object-contain" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-black text-white">{meta.label}</span>
          <span className="text-xs font-mono text-white/30">×{qty}</span>
        </div>
        <div className="text-[10px] text-white/35 mt-0.5 leading-tight">{meta.description}</div>
        <div className="flex items-center gap-2 mt-1.5">
          <div className="flex items-center gap-1">
            <Zap className="w-2.5 h-2.5 text-purple-400" />
            <span className="text-[10px] font-mono" style={{ color: hasMP ? color : "#ef4444" }}>
              {meta.mpCost} MP
            </span>
          </div>
          {!hasMP && <span className="text-[9px] text-red-400 uppercase tracking-wider">insufficient mp</span>}
          {!hasItem && <span className="text-[9px] text-white/30 uppercase tracking-wider">not owned</span>}
        </div>
      </div>
      {enabled && <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color }} />}
      {isLoading && (
        <motion.div
          className="absolute inset-0 rounded-xl"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          style={{ background: `${color}15` }}
        />
      )}
    </motion.button>
  );
}

// ── War Log Entry ─────────────────────────────────────────────────────────────
function WarLogEntry({ attack, index }: { attack: any; index: number }) {
  const meta = ITEM_META[attack.item_type];
  const color = ITEM_COLORS[attack.item_type] || "#ffffff";
  const isNuke = attack.item_type === GAME_ITEMS.NUKE;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="flex items-center gap-3 p-3 rounded-lg"
      style={{
        background: isNuke ? "rgba(239,68,68,0.05)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${isNuke ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.05)"}`,
      }}
    >
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
        <img src={meta?.image || ""} alt="" className="w-5 h-5 object-contain" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs leading-tight">
          <span className="font-bold text-white">{attack.attacker_name}</span>
          <span className="text-white/30"> → </span>
          <span className="font-bold" style={{ color }}>{meta?.label || attack.item_type}</span>
          <span className="text-white/30"> → </span>
          <span className="font-bold text-white">{attack.target_name}</span>
        </div>
        {attack.effect_value > 0 && (
          <div className="text-[10px] text-white/30 mt-0.5 font-mono">
            -{attack.effect_value} {isNuke ? "HP" : "pts"}
          </div>
        )}
      </div>
      <div className="text-[9px] text-white/20 font-mono flex-shrink-0">
        {new Date(attack.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Battlefield() {
  const { session, profile } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [selectedGuild, setSelectedGuild] = useState<any>(null);
  const [confirmItem, setConfirmItem] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; success: boolean } | null>(null);
  const [attackedGuildId, setAttackedGuildId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<<"battlefield" | "arsenal" | "log">("battlefield");

  const userId = profile?.id;
  const myGuildId = profile?.guild_id;

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: guilds, isLoading } = useQuery({
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
    queryFn: () => getAttackLog(50),
    refetchInterval: 10000,
  });

  const { data: myGuildCooldowns } = useQuery({
    queryKey: ["guild-cooldowns", myGuildId],
    queryFn: () => getGuildCooldowns(myGuildId!),
    enabled: !!myGuildId,
  });

  const { data: currentMP = 100 } = useQuery({
    queryKey: ["user-mp", userId],
    queryFn: () => getUserMP(userId!),
    enabled: !!userId,
    refetchInterval: 30000,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const attackMutation = useMutation({
    mutationFn: ({ targetId, itemType }: { targetId: string; itemType: string }) =>
      attackGuild(userId!, targetId, itemType),
    onSuccess: (result, variables) => {
      setConfirmItem(null);
      if (result.success) {
        setAttackedGuildId(variables.targetId);
        setTimeout(() => setAttackedGuildId(null), 2000);
        setToast({ message: result.message, success: true });
      } else {
        setToast({ message: result.message, success: false });
      }
      queryClient.invalidateQueries({ queryKey: ["guilds-ranked"] });
      queryClient.invalidateQueries({ queryKey: ["inventory", userId] });
      queryClient.invalidateQueries({ queryKey: ["user-mp", userId] });
      queryClient.invalidateQueries({ queryKey: ["attack-log"] });
    },
    onError: (err: any) => {
      setConfirmItem(null);
      setToast({ message: err.message || "Attack failed", success: false });
    },
  });

  const defenseMutation = useMutation({
    mutationFn: (itemType: string) => useDefenseItem(userId!, myGuildId!, itemType),
    onSuccess: (result) => {
      setToast({ message: result.message, success: result.success });
      queryClient.invalidateQueries({ queryKey: ["guilds-ranked"] });
      queryClient.invalidateQueries({ queryKey: ["inventory", userId] });
      queryClient.invalidateQueries({ queryKey: ["guild-cooldowns", myGuildId] });
    },
  });

  const mpPotionMutation = useMutation({
    mutationFn: () => useMPPotion(userId!),
    onSuccess: (result) => {
      setToast({ message: result.message, success: result.success });
      queryClient.invalidateQueries({ queryKey: ["inventory", userId] });
      queryClient.invalidateQueries({ queryKey: ["user-mp", userId] });
    },
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getItemQty = (type: string) =>
    inventory?.find(i => i.item_type === type)?.quantity || 0;

  const isShielded = (guild: any) =>
    guild.shield_active_until && new Date(guild.shield_active_until) > new Date();

  const isOnCooldown = (itemType: string) => {
    if (!myGuildCooldowns) return false;
    const cd = myGuildCooldowns.find(c => c.item_type === itemType);
    return cd ? new Date((cd as any).expires_at) > new Date() : false;
  };

  const myGuild = guilds?.find(g => g.id === myGuildId);
  const mpPercent = (currentMP / MP_MAX) * 100;

  return (
    <div className="min-h-screen text-white"
      style={{
        background: "#050505",
        fontFamily: "'Space Mono', 'Courier New', monospace",
      }}
    >
      {/* ── Background ──────────────────────────────────────────────────────── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-cover bg-center opacity-10"
          style={{ backgroundImage: `url(${GAME_ASSETS.background2})` }} />
        <div className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 20% 50%, rgba(239,68,68,0.04) 0%, transparent 60%)" }} />
        <div className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 80% 50%, rgba(168,85,247,0.03) 0%, transparent 60%)" }} />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 3px)",
            backgroundSize: "100% 3px",
          }} />
      </div>

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-5 sm:px-8 py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(20px)" }}>
        <button onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:block">Back</span>
        </button>

        <div className="flex items-center gap-3">
          <motion.div animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 2, repeat: Infinity }}>
            <Swords className="w-5 h-5 text-red-500" />
          </motion.div>
          <span className="font-black text-sm uppercase tracking-[0.2em] text-white">Guild Wars</span>
          <motion.div animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 2, repeat: Infinity, delay: 1 }}>
            <Swords className="w-5 h-5 text-red-500" />
          </motion.div>
        </div>

        <div className="flex items-center gap-2">
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-red-500"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span className="text-[10px] uppercase tracking-widest text-red-500">Live</span>
        </div>
      </nav>

      {/* ── Player Status Bar ────────────────────────────────────────────────── */}
      {session && profile && (
        <div className="relative z-10 px-5 sm:px-8 py-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: "rgba(0,0,0,0.4)" }}>
          <div className="max-w-7xl mx-auto flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-3 flex-1 min-w-[180px]">
              <Zap className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] uppercase tracking-widest text-purple-400">Mana</span>
                  <span className="text-[10px] font-mono text-white/40">{currentMP}/{MP_MAX}</span>
                </div>
                <EnergyBar value={currentMP} max={MP_MAX} className="h-2" />
              </div>
            </div>

            <div className="w-px h-8 bg-white/5" />

            {myGuild && (
              <div className="flex items-center gap-3 flex-1 min-w-[160px]">
                <Heart className="w-4 h-4 text-red-400 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] uppercase tracking-widest text-red-400">Guild HP</span>
                    <span className="text-[10px] font-mono text-white/40">{myGuild.hp ?? 100}%</span>
                  </div>
                  <HPBar value={myGuild.hp ?? 100} className="h-2" />
                </div>
              </div>
            )}

            <div className="w-px h-8 bg-white/5" />

            <div className="flex items-center gap-2">
              <img src={GAME_ASSETS.coin} alt="coin" className="w-4 h-4 object-contain" />
              <div>
                <div className="text-[9px] uppercase tracking-widest text-yellow-500">Coins</div>
                <div className="text-xs font-mono font-black text-white">
                  {((profile as any).coin_balance || 0).toLocaleString()}
                </div>
              </div>
            </div>

            {myGuild && isShielded(myGuild) && (
              <>
                <div className="w-px h-8 bg-white/5" />
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <span className="text-[10px] text-blue-400 uppercase tracking-wider">Shield Active</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="relative z-10 px-5 sm:px-8 pt-5" style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all"
              style={{
                background: activeTab === id ? "rgba(239,68,68,0.15)" : "transparent",
                border: activeTab === id ? "1px solid rgba(239,68,68,0.3)" : "1px solid transparent",
                color: activeTab === id ? "#f87171" : "rgba(255,255,255,0.35)",
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:block">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Content ────────────────────────────────────────────────────── */}
      <div className="relative z-10 px-5 sm:px-8 pb-20" style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <AnimatePresence mode="wait">

          {/* ═══════════════════════════════════════════════════════════════════
              BATTLEFIELD TAB — Isometric Staggered Map View
          ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === "battlefield" && (
            <motion.div
              key="battlefield"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative"
            >
              {/* Map Container */}
              <div className="relative rounded-2xl overflow-hidden border border-white/5"
                style={{
                  background: "linear-gradient(180deg, rgba(10,10,10,0.6), rgba(5,5,5,0.8))",
                  boxShadow: "inset 0 0 80px rgba(0,0,0,0.8)",
                }}>

                {/* Map Background Pattern */}
                <div className="absolute inset-0 opacity-[0.04]"
                  style={{
                    backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)`,
                    backgroundSize: "24px 24px",
                  }} />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 pointer-events-none" />

                {/* Staggered Guild Grid */}
                <div className="relative z-10 p-4 md:p-8">
                  {isLoading && (
                    <div className="flex items-center justify-center py-32">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                        <Swords className="w-8 h-8 text-red-500" />
                      </motion.div>
                    </div>
                  )}

                  {!isLoading && guilds && (
                    <div className="columns-2 md:columns-3 lg:columns-5 gap-4 md:gap-6 space-y-4 md:space-y-6">
                      {guilds.map((guild, index) => (
                        <div
                          key={guild.id}
                          className="break-inside-avoid"
                          style={{
                            transform: index % 2 === 0 ? "translateY(0)" : "translateY(1rem)",
                          }}
                        >
                          <GuildBuilding
                            guild={guild}
                            index={index}
                            isMyGuild={myGuildId === guild.id}
                            isSelected={selectedGuild?.id === guild.id}
                            onClick={() => {
                              if (selectedGuild?.id === guild.id) {
                                setSelectedGuild(null);
                              } else {
                                setSelectedGuild(guild);
                              }
                            }}
                            attackParticle={attackedGuildId === guild.id}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Empty State */}
              {!isLoading && (!guilds || guilds.length === 0) && (
                <div className="text-center py-24">
                  <MapPin className="w-10 h-10 text-white/15 mx-auto mb-4" />
                  <div className="text-sm text-white/25 uppercase tracking-widest">No guilds on the battlefield</div>
                </div>
              )}
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              ARSENAL TAB
          ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === "arsenal" && (
            <motion.div
              key="arsenal"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Attack */}
                <div className="rounded-xl overflow-hidden"
                  style={{ background: "rgba(10,10,10,0.8)", border: "1px solid rgba(239,68,68,0.15)" }}>
                  <div className="h-0.5 bg-gradient-to-r from-red-600 to-orange-500" />
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Swords className="w-4 h-4 text-red-400" />
                      <span className="text-xs uppercase tracking-widest text-red-400">Attack</span>
                    </div>
                    <div className="space-y-3">
                      {[GAME_ITEMS.NUKE, GAME_ITEMS.DRAIN, GAME_ITEMS.RUG].map(itemKey => {
                        const meta = ITEM_META[itemKey];
                        const qty = getItemQty(itemKey);
                        const color = ITEM_COLORS[itemKey];
                        return (
                          <div key={itemKey} className="flex items-center gap-3 p-3 rounded-lg"
                            style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
                            <img src={meta.image} alt={meta.label} className="w-10 h-10 object-contain" />
                            <div className="flex-1">
                              <div className="font-black text-white text-sm">{meta.label}</div>
                              <div className="text-[10px] text-white/35 mt-0.5">{meta.description}</div>
                              <div className="flex items-center gap-1 mt-1">
                                <Zap className="w-2.5 h-2.5 text-purple-400" />
                                <span className="text-[10px] font-mono text-purple-400">{meta.mpCost} MP</span>
                              </div>
                            </div>
                            <div className="text-2xl font-black tabular-nums" style={{ color }}>
                              ×{qty}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Defense */}
                <div className="rounded-xl overflow-hidden"
                  style={{ background: "rgba(10,10,10,0.8)", border: "1px solid rgba(59,130,246,0.15)" }}>
                  <div className="h-0.5 bg-gradient-to-r from-blue-600 to-cyan-500" />
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Shield className="w-4 h-4 text-blue-400" />
                      <span className="text-xs uppercase tracking-widest text-blue-400">Defense</span>
                    </div>
                    <div className="space-y-3">
                      {[GAME_ITEMS.SHIELD, GAME_ITEMS.HP_POTION, GAME_ITEMS.MP_POTION].map(itemKey => {
                        const meta = ITEM_META[itemKey];
                        const qty = getItemQty(itemKey);
                        const color = ITEM_COLORS[itemKey];
                        return (
                          <div key={itemKey} className="flex items-center gap-3 p-3 rounded-lg"
                            style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
                            <img src={meta.image} alt={meta.label} className="w-10 h-10 object-contain" />
                            <div className="flex-1">
                              <div className="font-black text-white text-sm">{meta.label}</div>
                              <div className="text-[10px] text-white/35 mt-0.5">{meta.description}</div>
                            </div>
                            <div className="text-2xl font-black tabular-nums" style={{ color }}>
                              ×{qty}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Shards & Elementals */}
                <div className="rounded-xl overflow-hidden"
                  style={{ background: "rgba(10,10,10,0.8)", border: "1px solid rgba(168,85,247,0.15)" }}>
                  <div className="h-0.5 bg-gradient-to-r from-purple-600 to-pink-500" />
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Zap className="w-4 h-4 text-purple-400" />
                      <span className="text-xs uppercase tracking-widest text-purple-400">Shards & Elementals</span>
                    </div>
                    <div className="space-y-2">
                      {["fire", "water", "nature", "rock", "lightning", "wind"].map(el => {
                        const meta = ELEMENT_META[el];
                        const shards = inventory?.find(i => i.item_type === `shard_${el}`)?.quantity || 0;
                        const elementals = inventory?.find(i => i.item_type === `elemental_${el}`)?.quantity || 0;
                        return (
                          <div key={el} className="flex items-center gap-2 p-2 rounded-lg"
                            style={{ background: `${meta.bg}`, border: `1px solid ${meta.border}` }}>
                            <img src={meta.shard} alt={el} className="w-6 h-6 object-contain" />
                            <div className="flex-1">
                              <span className={`text-xs font-bold ${meta.text}`}>{meta.label}</span>
                              <div className="h-1 bg-black/30 rounded-full mt-1 overflow-hidden">
                                <div className="h-full rounded-full" style={{
                                  width: `${Math.min(100, (shards / 4) * 100)}%`,
                                  background: meta.text.replace("text-", ""),
                                }} />
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] font-mono text-white/50">{shards} shards</div>
                              <div className="text-[10px] font-mono text-purple-400">{elementals} elemental</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              WAR LOG TAB
          ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === "log" && (
            <motion.div
              key="log"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-2xl"
            >
              <div className="rounded-xl overflow-hidden"
                style={{ background: "rgba(10,10,10,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="h-0.5 bg-gradient-to-r from-red-600 via-orange-500 to-red-600" />
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-red-400" />
                      <span className="text-xs uppercase tracking-widest text-red-400">War Log</span>
                    </div>
                    <motion.div
                      className="flex items-center gap-1.5"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      <span className="text-[9px] uppercase tracking-widest text-red-500">Live</span>
                    </motion.div>
                  </div>

                  <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1"
                    style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(239,68,68,0.2) transparent" }}>
                    {!attackLog?.length && (
                      <div className="text-center py-16">
                        <motion.div animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 2, repeat: Infinity }}>
                          <Swords className="w-8 h-8 text-white/15 mx-auto mb-3" />
                        </motion.div>
                        <div className="text-xs text-white/20 uppercase tracking-widest">
                          The battlefield is quiet… for now.
                        </div>
                      </div>
                    )}
                    {attackLog?.map((attack, index) => (
                      <WarLogEntry key={attack.id} attack={attack} index={index} />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── Guild Detail Panel (Overlay) ─────────────────────────────────────── */}
      <AnimatePresence>
        {selectedGuild && (
          <GuildDetailPanel
            guild={selectedGuild}
            isMyGuild={myGuildId === selectedGuild.id}
            myGuildId={myGuildId}
            session={session}
            currentMP={currentMP}
            inventory={inventory || []}
            myGuildCooldowns={myGuildCooldowns || []}
            attackMutation={attackMutation}
            defenseMutation={defenseMutation}
            mpPotionMutation={mpPotionMutation}
            onAttackItemClick={setConfirmItem}
            onClose={() => setSelectedGuild(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Confirm Attack Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {confirmItem && selectedGuild && (
          <ConfirmAttackModal
            guild={selectedGuild}
            itemType={confirmItem}
            isPending={attackMutation.isPending}
            onConfirm={() => {
              attackMutation.mutate({
                targetId: selectedGuild.id,
                itemType: confirmItem,
              });
            }}
            onCancel={() => setConfirmItem(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Toast ────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <AttackToast
            message={toast.message}
            success={toast.success}
            onDismiss={() => setToast(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
