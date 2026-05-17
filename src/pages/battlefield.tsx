import { useState, useEffect, useRef } from "react";
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
  getGuildMembers,
} from "@/lib/supabase-gw";
import { api } from "@/lib/supabase";
import {
  Swords, Shield, Heart, Zap, Trophy, Clock,
  ArrowLeft, Flame, Droplets, Mountain, Wind, TreePine,
  CloudLightning, AlertTriangle, CheckCircle, X, ChevronRight,
  Users, Crosshair, Activity, MapPin, Sparkles, Target, LogIn, LogOut,
  Crown, Medal, Award,
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
  ice: <Sparkles className="w-3.5 h-3.5" />,
};

const ITEM_COLORS: Record<string, string> = {
  [GAME_ITEMS.NUKE]: "#ef4444",
  [GAME_ITEMS.DRAIN]: "#f97316",
  [GAME_ITEMS.RUG]: "#a855f7",
  [GAME_ITEMS.SHIELD]: "#3b82f6",
  [GAME_ITEMS.HP_POTION]: "#22c55e",
  [GAME_ITEMS.MP_POTION]: "#eab308",
};

const ELEMENT_COLORS: Record<string, string> = {
  fire: "#f97316",
  water: "#38bdf8",
  nature: "#4ade80",
  rock: "#a8a29e",
  lightning: "#facc15",
  lighting: "#facc15",
  wind: "#7dd3fc",
  ice: "#bae6fd",
};

const TABS = [
  { id: "battlefield", label: "Battlefield", icon: Crosshair },
  { id: "arsenal", label: "Arsenal", icon: Shield },
  { id: "log", label: "War Log", icon: Activity },
] as const;

type TabId = "battlefield" | "arsenal" | "log";

// ── Helpers ───────────────────────────────────────────────────────────────────
function daysInGuild(joinedAt: string | null | undefined): number {
  if (!joinedAt) return 0;
  return Math.floor((Date.now() - new Date(joinedAt).getTime()) / (1000 * 60 * 60 * 24));
}

function canLeaveGuild(joinedAt: string | null | undefined): boolean {
  return daysInGuild(joinedAt) >= 7;
}

function daysUntilLeave(joinedAt: string | null | undefined): number {
  return Math.max(0, 7 - daysInGuild(joinedAt));
}

// ── Flame Overlay ─────────────────────────────────────────────────────────────
function FlameOverlay() {
  return (
    <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden rounded-2xl">
      {/* Base red glow */}
      <motion.div
        className="absolute inset-0 rounded-2xl"
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 0.8, repeat: Infinity }}
        style={{ background: "radial-gradient(ellipse at 50% 100%, rgba(239,68,68,0.6) 0%, rgba(251,146,60,0.3) 40%, transparent 70%)" }}
      />

      {/* Flame tongues */}
      {[
        { left: "30%", height: "70%", delay: 0,    duration: 1.2, color: "#ef4444" },
        { left: "50%", height: "85%", delay: 0.15, duration: 1.0, color: "#f97316" },
        { left: "70%", height: "60%", delay: 0.3,  duration: 1.3, color: "#ef4444" },
        { left: "20%", height: "45%", delay: 0.45, duration: 0.9, color: "#fbbf24" },
        { left: "80%", height: "50%", delay: 0.6,  duration: 1.1, color: "#f97316" },
        { left: "45%", height: "55%", delay: 0.2,  duration: 1.4, color: "#fbbf24" },
      ].map((flame, i) => (
        <motion.div
          key={i}
          className="absolute bottom-0 w-3"
          style={{ left: flame.left, transform: "translateX(-50%)" }}
          animate={{
            height: [flame.height, `${parseInt(flame.height) * 0.7}%`, flame.height],
            scaleX: [1, 0.7, 1],
            opacity: [0.9, 0.6, 0.9],
          }}
          transition={{ duration: flame.duration, delay: flame.delay, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg viewBox="0 0 12 40" className="w-full h-full" style={{ filter: `drop-shadow(0 0 6px ${flame.color})` }}>
            <path
              d="M6 40 C2 30 0 20 3 12 C4 8 5 4 6 0 C7 4 8 8 9 12 C12 20 10 30 6 40Z"
              fill={flame.color}
              fillOpacity="0.85"
            />
            <path
              d="M6 35 C4 28 3 20 5 14 C5.5 10 6 6 6 2 C6 6 6.5 10 7 14 C9 20 8 28 6 35Z"
              fill="#fde68a"
              fillOpacity="0.6"
            />
          </svg>
        </motion.div>
      ))}

      {/* Spark particles */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={`spark-${i}`}
          className="absolute w-1 h-1 rounded-full"
          style={{
            left: `${20 + Math.random() * 60}%`,
            bottom: "10%",
            background: i % 2 === 0 ? "#fbbf24" : "#ef4444",
            boxShadow: `0 0 4px ${i % 2 === 0 ? "#fbbf24" : "#ef4444"}`,
          }}
          animate={{
            y: [0, -(40 + i * 12)],
            x: [0, (i % 2 === 0 ? 1 : -1) * (5 + i * 3)],
            opacity: [1, 0],
            scale: [1, 0.3],
          }}
          transition={{ duration: 0.8 + i * 0.15, delay: i * 0.2, repeat: Infinity, ease: "easeOut" }}
        />
      ))}

      {/* "NUKED" badge */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 px-2 py-0.5 rounded-full"
        style={{ background: "rgba(239,68,68,0.25)", border: "1px solid rgba(239,68,68,0.5)", backdropFilter: "blur(4px)" }}>
        <Flame className="w-2.5 h-2.5 text-orange-400" />
        <span className="text-[8px] font-black uppercase tracking-wider text-orange-400">Nuked</span>
      </div>
    </div>
  );
}

// ── Shield Aura ───────────────────────────────────────────────────────────────
function ShieldAura() {
  return (
    <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden rounded-2xl">
      {/* Base green/blue glow */}
      <motion.div
        className="absolute inset-0 rounded-2xl"
        animate={{ opacity: [0.15, 0.35, 0.15] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(34,197,94,0.4) 0%, rgba(59,130,246,0.2) 50%, transparent 70%)" }}
      />

      {/* Rising light pillars */}
      {[15, 35, 50, 65, 85].map((left, i) => (
        <motion.div
          key={`pillar-${i}`}
          className="absolute bottom-0 w-0.5 rounded-full"
          style={{
            left: `${left}%`,
            background: "linear-gradient(to top, rgba(34,197,94,0.8), transparent)",
            boxShadow: "0 0 8px rgba(34,197,94,0.6)",
          }}
          animate={{ height: ["0%", "80%", "0%"], opacity: [0, 0.8, 0] }}
          transition={{ duration: 1.5, delay: i * 0.25, repeat: Infinity, ease: "easeOut" }}
        />
      ))}

      {/* Floating green cross symbols */}
      {[
        { left: "20%", size: 14, delay: 0 },
        { left: "50%", size: 18, delay: 0.5 },
        { left: "75%", size: 12, delay: 1.0 },
        { left: "35%", size: 10, delay: 1.5 },
        { left: "65%", size: 16, delay: 0.75 },
      ].map((cross, i) => (
        <motion.div
          key={`cross-${i}`}
          className="absolute"
          style={{ left: cross.left, bottom: "10%" }}
          animate={{ y: [0, -60, -80], opacity: [0, 1, 0], scale: [0.5, 1, 0.8] }}
          transition={{ duration: 2, delay: cross.delay, repeat: Infinity, ease: "easeOut" }}
        >
          <svg width={cross.size} height={cross.size} viewBox="0 0 24 24"
            style={{ filter: "drop-shadow(0 0 6px rgba(34,197,94,0.9))" }}>
            <rect x="8" y="0" width="8" height="24" rx="2" fill="#22c55e" opacity="0.9" />
            <rect x="0" y="8" width="24" height="8" rx="2" fill="#22c55e" opacity="0.9" />
            <rect x="9" y="1" width="6" height="22" rx="1" fill="#86efac" opacity="0.5" />
            <rect x="1" y="9" width="22" height="6" rx="1" fill="#86efac" opacity="0.5" />
          </svg>
        </motion.div>
      ))}

      {/* Orbiting shield ring */}
      <motion.div
        className="absolute inset-2 rounded-2xl border-2"
        style={{ borderColor: "rgba(34,197,94,0.4)", boxShadow: "inset 0 0 20px rgba(34,197,94,0.15), 0 0 20px rgba(34,197,94,0.1)" }}
        animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.02, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      />

      {/* Shield badge */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 px-2 py-0.5 rounded-full"
        style={{ background: "rgba(34,197,94,0.2)", border: "1px solid rgba(34,197,94,0.5)", backdropFilter: "blur(4px)" }}>
        <Shield className="w-2.5 h-2.5 text-green-400" />
        <span className="text-[8px] font-black uppercase tracking-wider text-green-400">Shielded</span>
      </div>
    </div>
  );
}

// ── Attack Particle Canvas ────────────────────────────────────────────────────
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
    for (let i = 0; i < 100; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 2;
      particlesRef.current.push({
        id: Date.now() + i,
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color,
        size: Math.random() * 5 + 1,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);
      particlesRef.current.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.95; p.vy *= 0.95;
        p.life -= 0.006;
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
      if (particlesRef.current.length > 0) animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [trigger, color]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-30" />;
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
        style={{ background: `linear-gradient(90deg, ${color}aa, ${color})`, boxShadow: `0 0 6px ${glow}` }}
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

// ── Energy Bar ────────────────────────────────────────────────────────────────
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
        style={{ background: `linear-gradient(90deg, ${color}88, ${color})`, boxShadow: `0 0 6px ${color}66` }}
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
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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

          <div className="flex items-center gap-3 p-3 rounded-xl mb-4 border border-white/10 bg-white/3">
            <img src={getGuildImage(guild.name, guild.element)} alt={guild.name}
              className="w-10 h-10 rounded-lg object-cover border border-white/10" />
            <div>
              <div className="font-bold text-white text-sm">{guild.name}</div>
              <div className="text-xs flex items-center gap-1 text-white/50">
                {ELEMENT_ICONS[guild.element]} {el.label} • HP: {guild.hp ?? 100}%
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl mb-6 bg-white/3 border border-white/8">
            <img src={meta.image} alt={meta.label} className="w-10 h-10 object-contain" />
            <div className="flex-1">
              <div className="font-bold text-white text-sm">{meta.label}</div>
              <div className="text-xs text-white/40">{meta.description}</div>
            </div>
            <div className="text-sm font-black text-red-400">{meta.mpCost} MP</div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-all text-sm font-bold"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isPending}
              className="flex-1 py-2.5 rounded-xl text-white font-black text-sm transition-all"
              style={{
                background: isPending ? "rgba(239,68,68,0.3)" : "linear-gradient(135deg, #dc2626, #ea580c)",
                boxShadow: isPending ? "none" : "0 0 20px rgba(239,68,68,0.4)",
              }}
            >
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

// ── Attack Toast ──────────────────────────────────────────────────────────────
function AttackToast({ message, success, onDismiss }: {
  message: string; success: boolean; onDismiss: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

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

// ── Guild Building ────────────────────────────────────────────────────────────
function GuildBuilding({ guild, index, isMyGuild, isSelected, onClick, attackParticle, isOnFire }: {
  guild: any; index: number; isMyGuild: boolean; isSelected: boolean;
  onClick: () => void; attackParticle: boolean; isOnFire: boolean;
}) {
  const el = ELEMENT_META[guild.element] || ELEMENT_META.fire;
  const elColor = ELEMENT_COLORS[guild.element] || "#f97316";
  const shieldActive = guild.shield_active_until && new Date(guild.shield_active_until) > new Date();
  const hp = guild.hp ?? 100;

  const rankColors = [
    { bg: "rgba(234,179,8,0.15)", border: "rgba(234,179,8,0.5)", text: "#fbbf24" },
    { bg: "rgba(156,163,175,0.1)", border: "rgba(156,163,175,0.4)", text: "#9ca3af" },
    { bg: "rgba(180,83,9,0.1)", border: "rgba(180,83,9,0.4)", text: "#f97316" },
  ];
  const rankStyle = index < 3
    ? rankColors[index]
    : { bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.08)", text: "#6b7280" };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{
        opacity: 1, y: 0,
        scale: isSelected ? 1.05 : 1,
        filter: isSelected ? `drop-shadow(0 0 20px ${elColor})` : `drop-shadow(0 0 8px ${elColor}44)`,
      }}
      transition={{ delay: index * 0.03, type: "spring", damping: 18 }}
      onClick={onClick}
      className="relative cursor-pointer select-none"
      style={{ fontFamily: "'Space Mono', monospace" }}
    >
      {/* Particle burst on attack */}
      {attackParticle && (
        <div className="absolute inset-0 z-30 pointer-events-none overflow-visible">
          <ParticleCanvas trigger={attackParticle} color={ITEM_COLORS[GAME_ITEMS.NUKE]} />
        </div>
      )}

      <div
        className="relative rounded-2xl overflow-hidden transition-all duration-300"
        style={{
          background: isSelected
            ? `linear-gradient(180deg, ${elColor}18, rgba(5,5,5,0.95))`
            : "linear-gradient(180deg, rgba(20,20,20,0.9), rgba(5,5,5,0.95))",
          border: isSelected ? `1px solid ${elColor}66` : `1px solid ${rankStyle.border}`,
          boxShadow: isOnFire
            ? "0 0 30px rgba(239,68,68,0.5), inset 0 0 20px rgba(239,68,68,0.1)"
            : isSelected
            ? `0 0 40px ${elColor}33, inset 0 0 20px ${elColor}11`
            : "0 4px 20px rgba(0,0,0,0.6)",
        }}
      >
        {/* 🔥 Flame effect — persistent when nuked */}
        {isOnFire && <FlameOverlay />}

        {/* 🛡 Shield aura — shows when shielded and not on fire */}
        {shieldActive && !isOnFire && <ShieldAura />}

        {/* Subtle shield shimmer fallback */}
        {shieldActive && !isOnFire && (
          <motion.div
            className="absolute inset-0 pointer-events-none z-10"
            animate={{ opacity: [0.03, 0.12, 0.03] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.25), transparent 60%)" }}
          />
        )}

        {/* Selected pulse */}
        {isSelected && (
          <motion.div
            className="absolute inset-0 pointer-events-none rounded-2xl z-0"
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{ boxShadow: `inset 0 0 24px ${elColor}` }}
          />
        )}

        {/* Rank badge */}
        <div
          className="absolute top-2 left-2 z-20 w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black shadow-lg"
          style={{ background: rankStyle.bg, border: `1px solid ${rankStyle.border}`, color: rankStyle.text }}
        >
          {index + 1}
        </div>

        {/* My guild badge */}
        {isMyGuild && (
          <div
            className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap"
            style={{ background: `${elColor}22`, border: `1px solid ${elColor}55`, color: elColor }}
          >
            YOUR GUILD
          </div>
        )}

        {/* Building image */}
        <div className="relative p-4 pb-2 flex flex-col items-center">
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-20 h-3 bg-black/60 rounded-[100%] blur-sm" />
          <motion.div
            className="relative w-24 h-24 md:w-28 md:h-28"
            animate={isSelected ? { y: [0, -4, 0] } : {}}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <img
              src={getGuildImage(guild.name, guild.element)}
              alt={guild.name}
              className="w-full h-full object-contain drop-shadow-2xl"
              style={{ filter: `drop-shadow(0 0 12px ${elColor}66) drop-shadow(0 4px 6px rgba(0,0,0,0.8))` }}
              onError={(e) => { (e.target as HTMLImageElement).src = el.img; }}
            />
          </motion.div>

          <div className="w-full mt-2 space-y-1">
            <div className="flex items-center gap-1.5">
              <Heart className="w-2.5 h-2.5 text-red-400 flex-shrink-0" />
              <HPBar value={hp} className="flex-1" />
              <span className="text-[9px] font-mono text-white/50 w-7 text-right">{hp}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-2.5 h-2.5 text-purple-400 flex-shrink-0" />
              <EnergyBar value={Math.min(100, (guild.ranking_score || 0) / 100)} color={elColor} className="flex-1" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-3 pb-3 pt-1 text-center">
          <span className="text-xs font-black text-white tracking-tight truncate block max-w-[90%] mx-auto">
            {guild.name}
          </span>
          <div className="flex items-center justify-center gap-2 text-[10px] mt-0.5">
            <span className="flex items-center gap-1" style={{ color: elColor }}>
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

// ── Guild Member Row ──────────────────────────────────────────────────────────
function GuildMemberRow({ member, index, isMaster }: { member: any; index: number; isMaster: boolean }) {
  const el = member.element ? ELEMENT_META[member.element] : null;
  const elColor = member.element ? ELEMENT_COLORS[member.element] : "#6b7280";

  const rankIcon = index === 0 ? <Crown className="w-3.5 h-3.5 text-yellow-400" /> :
    index === 1 ? <Medal className="w-3.5 h-3.5 text-gray-400" /> :
    index === 2 ? <Award className="w-3.5 h-3.5 text-orange-400" /> :
    <span className="text-[10px] font-mono text-white/30 w-3.5 text-center">{index + 1}</span>;

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors">
      <div className="w-5 flex justify-center flex-shrink-0">{rankIcon}</div>

      {/* Avatar with optional master crown badge */}
      <div className="relative flex-shrink-0">
        {member.discord_avatar ? (
          <img
            src={member.discord_avatar}
            alt={member.username}
            className="w-7 h-7 rounded-full border border-white/10 object-cover"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-[10px] font-bold text-white/50">
            {member.username?.[0]?.toUpperCase() || "?"}
          </div>
        )}
        {isMaster && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full border border-black flex items-center justify-center">
            <Crown className="w-2 h-2 text-black" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-white truncate">{member.username || "Unknown"}</span>
          {el && (
            <span style={{ color: elColor }} className="text-[10px]">
              {ELEMENT_ICONS[member.element]}
            </span>
          )}
        </div>
        <div className="text-[9px] text-white/30">
          {member.contribution_score || 0} pts · {(member.coin_balance || 0).toLocaleString()} coins
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <div className="text-xs font-mono font-bold text-white/60">
          {(member.contribution_score || 0).toLocaleString()}
        </div>
      </div>
    </div>
  );
}

// ── Guild Detail Panel ────────────────────────────────────────────────────────
function GuildDetailPanel({
  guild, isMyGuild, myGuildId, session, profile,
  currentMP, inventory, myGuildCooldowns,
  attackMutation, defenseMutation, mpPotionMutation,
  joinMutation, leaveMutation,
  onAttackItemClick, onClose,
}: {
  guild: any; isMyGuild: boolean; myGuildId?: string; session: any; profile: any;
  currentMP: number; inventory: any[]; myGuildCooldowns: any[];
  attackMutation: any; defenseMutation: any; mpPotionMutation: any;
  joinMutation: any; leaveMutation: any;
  onAttackItemClick: (item: string) => void;
  onClose: () => void;
}) {
  const el = ELEMENT_META[guild.element] || ELEMENT_META.fire;
  const elColor = ELEMENT_COLORS[guild.element] || "#f97316";
  const shieldActive = guild.shield_active_until && new Date(guild.shield_active_until) > new Date();
  const guildImg = getGuildImage(guild.name, guild.element);

  const getItemQty = (type: string) =>
    inventory?.find((i: any) => i.item_type === type)?.quantity || 0;

  const isOnCooldown = (itemType: string) => {
    if (!myGuildCooldowns) return false;
    const cd = myGuildCooldowns.find((c: any) => c.item_type === itemType);
    return cd ? new Date(cd.expires_at) > new Date() : false;
  };

  const canAttack = !isMyGuild && !shieldActive && !!myGuildId;
  const isInAnyGuild = !!myGuildId;
  const isInThisGuild = myGuildId === guild.id;
  const joinedAt = profile?.guild_joined_at;
  const canLeave = canLeaveGuild(joinedAt);
  const daysLeft = daysUntilLeave(joinedAt);

  const { data: guildMembers } = useQuery({
    queryKey: ["guild-members", guild.id],
    queryFn: () => getGuildMembers(guild.id),
    enabled: !!guild.id,
  });

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[250] flex md:justify-end md:items-stretch items-end justify-center"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ x: 0, y: "100%" }}
        animate={{ x: 0, y: 0 }}
        exit={{ x: 0, y: "100%" }}
        className="w-full md:w-[420px] h-[85vh] md:h-full bg-[#080808] md:border-l md:border-t-0 border-t border-white/10 shadow-2xl overflow-y-auto rounded-t-3xl md:rounded-none"
        style={{ boxShadow: "0 -10px 40px rgba(0,0,0,0.8)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Hero banner */}
        <div className="relative h-40 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#080808] z-10" />
          <img src={guildImg} alt={guild.name} className="w-full h-full object-cover opacity-40" />
          <div className="absolute top-4 right-4 z-20">
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-black/40 border border-white/10 text-white/60 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="absolute bottom-4 left-5 z-20 flex items-center gap-2">
            <div className="p-1.5 rounded-lg" style={{ border: `1px solid ${elColor}55`, background: `${elColor}22` }}>
              {ELEMENT_ICONS[guild.element]}
            </div>
            <div>
              <h2 className="text-lg font-black text-white">{guild.name}</h2>
              <div className="text-xs font-bold uppercase tracking-wider" style={{ color: elColor }}>
                {el.label} Guild
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Guild Master — with avatar */}
            <div className="p-3 rounded-xl bg-white/3 border border-white/8 col-span-2">
              <div className="text-[9px] uppercase tracking-widest text-white/30 mb-2">Guild Master</div>
              <div className="flex items-center gap-3">
                {guild.guild_master_avatar ? (
                  <img
                    src={guild.guild_master_avatar}
                    alt={guild.guild_master_username || "Guild Master"}
                    className="w-10 h-10 rounded-full border border-yellow-500/30 object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                    <Crown className="w-5 h-5 text-yellow-500" />
                  </div>
                )}
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    {guild.guild_master_username || guild.guild_master_id?.slice(0, 8) || "Unknown"}
                    {guild.guild_master_element && (
                      <span style={{ color: ELEMENT_COLORS[guild.guild_master_element] || "#fff" }}>
                        {ELEMENT_ICONS[guild.guild_master_element]}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-white/30 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-yellow-500" /> Guild Master
                  </div>
                </div>
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
                <Trophy className="w-3.5 h-3.5" />#{guild._rank ?? "?"}
              </div>
            </div>
          </div>

          {/* Fortress HP */}
          <div
            className="p-4 rounded-xl space-y-3"
            style={{
              background: "rgba(20,20,20,0.6)",
              border: `1px solid ${shieldActive ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.06)"}`,
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-widest text-red-400">Fortress HP</span>
              <span className="text-xs font-mono text-white/50">{guild.hp ?? 100}%</span>
            </div>
            <HPBar value={guild.hp ?? 100} animate className="h-2" />
            {shieldActive && (
              <div className="flex items-center gap-2 text-xs text-green-400 mt-2 p-2 rounded-lg bg-green-500/5 border border-green-500/20">
                <Shield className="w-4 h-4" /> Shield Active — All attacks blocked
              </div>
            )}
          </div>

          {/* Join */}
          {session && !isInAnyGuild && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-green-400 mb-3 flex items-center gap-2">
                <LogIn className="w-3 h-3" /> Join Guild
              </div>
              <button
                onClick={() => joinMutation.mutate(guild.id)}
                disabled={joinMutation.isPending}
                className="w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all"
                style={{
                  background: joinMutation.isPending
                    ? "rgba(34,197,94,0.2)"
                    : "linear-gradient(135deg, #16a34a, #15803d)",
                  boxShadow: joinMutation.isPending ? "none" : "0 0 20px rgba(34,197,94,0.3)",
                  color: "white",
                }}
              >
                {joinMutation.isPending ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                    <Zap className="w-4 h-4" />
                  </motion.div>
                ) : (
                  <><LogIn className="w-4 h-4" /> Join {guild.name}</>
                )}
              </button>
              <p className="text-[10px] text-white/25 text-center mt-2">
                You cannot leave for 7 days after joining
              </p>
            </div>
          )}

          {/* Leave */}
          {session && isInThisGuild && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-red-400 mb-3 flex items-center gap-2">
                <LogOut className="w-3 h-3" /> Leave Guild
              </div>
              {canLeave ? (
                <button
                  onClick={() => leaveMutation.mutate()}
                  disabled={leaveMutation.isPending}
                  className="w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all border border-red-500/30"
                  style={{ background: "rgba(239,68,68,0.08)", color: "#f87171" }}
                >
                  {leaveMutation.isPending ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                      <Zap className="w-4 h-4" />
                    </motion.div>
                  ) : (
                    <><LogOut className="w-4 h-4" /> Leave Guild</>
                  )}
                </button>
              ) : (
                <div
                  className="w-full py-3 rounded-xl text-sm flex items-center justify-center gap-2 border border-white/5"
                  style={{ background: "rgba(255,255,255,0.02)", color: "rgba(255,255,255,0.25)" }}
                >
                  <Clock className="w-4 h-4" />
                  Can leave in {daysLeft} day{daysLeft !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          )}

          {/* In different guild notice */}
          {session && isInAnyGuild && !isInThisGuild && !isMyGuild && (
            <div className="text-center py-3 text-white/25 text-xs border border-white/5 rounded-xl bg-white/2">
              Leave your current guild first to join another
            </div>
          )}

          {/* Guild Members list — with avatars */}
          {guildMembers && guildMembers.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-purple-400 mb-3 flex items-center gap-2">
                <Users className="w-3 h-3" /> Guild Members ({guildMembers.length})
              </div>
              <div
                className="space-y-1 max-h-[300px] overflow-y-auto pr-1"
                style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(168,85,247,0.2) transparent" }}
              >
                {guildMembers.map((member: any, idx: number) => (
                  <GuildMemberRow
                    key={member.id}
                    member={member}
                    index={idx}
                    isMaster={member.id === guild.guild_master_id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Attack arsenal (enemy guild) */}
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
                  const color = ITEM_COLORS[itemKey];
                  return (
                    <button
                      key={itemKey}
                      onClick={() => enabled && onAttackItemClick(itemKey)}
                      disabled={!enabled || attackMutation.isPending}
                      className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all border"
                      style={{
                        background: enabled ? `${color}08` : "rgba(255,255,255,0.02)",
                        borderColor: enabled ? `${color}30` : "rgba(255,255,255,0.05)",
                        opacity: enabled ? 1 : 0.4,
                        cursor: enabled ? "pointer" : "not-allowed",
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `${color}15`, border: `1px solid ${color}30` }}
                      >
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
                          <span className="text-[10px] font-mono" style={{ color: hasMP ? color : "#ef4444" }}>
                            {meta.mpCost} MP
                          </span>
                        </div>
                      </div>
                      {enabled && <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color }} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Defense systems (own guild) */}
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
                    <div
                      key={itemKey}
                      className="flex items-center gap-3 p-2.5 rounded-lg"
                      style={{
                        background: canUse ? "rgba(59,130,246,0.05)" : "rgba(255,255,255,0.02)",
                        border: `1px solid ${canUse ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.05)"}`,
                        opacity: qty === 0 ? 0.4 : 1,
                      }}
                    >
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
                          className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider"
                          style={{ background: "rgba(59,130,246,0.2)", border: "1px solid rgba(59,130,246,0.3)", color: "#93c5fd" }}
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
              Sign in to join or attack guilds
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
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
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}15`, border: `1px solid ${color}30` }}
      >
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
  const [activeTab, setActiveTab] = useState<TabId>("battlefield");

  // Track which guilds are "on fire" after a nuke — stores expiry timestamp
  const [onFireGuilds, setOnFireGuilds] = useState<Record<string, number>>({});

  const userId = profile?.id;
  const myGuildId = profile?.guild_id;

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: guilds, isLoading, error: guildsError } = useQuery({
    queryKey: ["guilds-ranked"],
    queryFn: getGuildsWithRanking,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (guildsError) console.error("Guilds query error:", guildsError);
    if (guilds) console.log("Guilds loaded:", guilds.length, guilds);
  }, [guilds, guildsError]);

  const rankedGuilds = guilds?.map((g: any, i: number) => ({ ...g, _rank: i + 1 }));

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

  // Clean up expired fire states every 5s
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setOnFireGuilds(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(id => { if (next[id] < now) delete next[id]; });
        return next;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const attackMutation = useMutation({
    mutationFn: ({ targetId, itemType }: { targetId: string; itemType: string }) =>
      attackGuild(userId!, targetId, itemType),
    onSuccess: (result, variables) => {
      setConfirmItem(null);
      if (result.success) {
        setAttackedGuildId(variables.targetId);
        setTimeout(() => setAttackedGuildId(null), 2500);
        setToast({ message: result.message, success: true });

        // Set the guild on fire for 60 seconds if it was a nuke
        if (variables.itemType === GAME_ITEMS.NUKE) {
          const expiry = Date.now() + 60000;
          setOnFireGuilds(prev => ({ ...prev, [variables.targetId]: expiry }));
          setTimeout(() => {
            setOnFireGuilds(prev => {
              const next = { ...prev };
              delete next[variables.targetId];
              return next;
            });
          }, 60000);
        }
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

  const joinMutation = useMutation({
    mutationFn: (guildId: string) => api.joinGuild(userId!, guildId),
    onSuccess: () => {
      setToast({ message: "You joined the guild!", success: true });
      queryClient.invalidateQueries({ queryKey: ["guilds-ranked"] });
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      setSelectedGuild(null);
    },
    onError: (err: any) => {
      setToast({ message: err.message || "Failed to join guild", success: false });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Not authenticated");
      if (!canLeaveGuild((profile as any)?.guild_joined_at)) {
        throw new Error(`Must wait ${daysUntilLeave((profile as any)?.guild_joined_at)} more days`);
      }
      const { error } = await (await import("@/lib/supabase")).supabase
        .from("profiles")
        .update({ guild_id: null, guild_joined_at: null })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      setToast({ message: "You left the guild.", success: true });
      queryClient.invalidateQueries({ queryKey: ["guilds-ranked"] });
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      setSelectedGuild(null);
    },
    onError: (err: any) => {
      setToast({ message: err.message || "Failed to leave guild", success: false });
    },
  });

  const getItemQty = (type: string) =>
    inventory?.find((i: any) => i.item_type === type)?.quantity || 0;

  const isShielded = (guild: any) =>
    guild.shield_active_until && new Date(guild.shield_active_until) > new Date();

  const myGuild = rankedGuilds?.find((g: any) => g.id === myGuildId);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen text-white"
      style={{ background: "#050505", fontFamily: "'Space Mono', 'Courier New', monospace" }}>

      {/* Fixed background */}
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

      {/* Nav */}
      <nav
        className="relative z-10 flex items-center justify-between px-5 sm:px-8 py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(20px)" }}
      >
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm"
        >
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

      {/* Player status bar */}
      {session && profile && (
        <div
          className="relative z-10 px-5 sm:px-8 py-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: "rgba(0,0,0,0.4)" }}
        >
          <div className="max-w-7xl mx-auto flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-3 flex-1 min-w-[180px]">
              <Zap className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] uppercase tracking-widest text-purple-400">Mana</span>
                  <span className="text-[10px] font-mono text-white/40">{currentMP}/{MP_MAX}</span>
                </div>
                <EnergyBar value={currentMP} max={MP_MAX} color="#a855f7" className="h-2" />
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
                  <Shield className="w-4 h-4 text-green-400" />
                  <span className="text-[10px] text-green-400 uppercase tracking-wider">Shield Active</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="relative z-10 px-5 sm:px-8 pt-5" style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <div
          className="flex gap-1 mb-6 p-1 rounded-xl w-fit"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
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

      {/* Tab content */}
      <div className="relative z-10 px-5 sm:px-8 pb-20" style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <AnimatePresence mode="wait">

          {/* BATTLEFIELD */}
          {activeTab === "battlefield" && (
            <motion.div key="battlefield" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div
                className="relative rounded-2xl overflow-hidden border border-white/5"
                style={{ background: "linear-gradient(180deg, rgba(10,10,10,0.6), rgba(5,5,5,0.8))", boxShadow: "inset 0 0 80px rgba(0,0,0,0.8)" }}
              >
                <div className="absolute inset-0 opacity-[0.04]"
                  style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 pointer-events-none" />

                <div className="relative z-10 p-4 md:p-8">
                  {isLoading && (
                    <div className="flex items-center justify-center py-32">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                        <Swords className="w-8 h-8 text-red-500" />
                      </motion.div>
                    </div>
                  )}
                  {!isLoading && rankedGuilds && rankedGuilds.length > 0 && (
                    <div className="columns-2 md:columns-3 lg:columns-5 gap-4 md:gap-6 space-y-4 md:space-y-6">
                      {rankedGuilds.map((guild: any, index: number) => (
                        <div key={guild.id} className="break-inside-avoid"
                          style={{ transform: index % 2 === 0 ? "translateY(0)" : "translateY(1rem)" }}>
                          <GuildBuilding
                            guild={guild}
                            index={index}
                            isMyGuild={myGuildId === guild.id}
                            isSelected={selectedGuild?.id === guild.id}
                            onClick={() => setSelectedGuild(selectedGuild?.id === guild.id ? null : guild)}
                            attackParticle={attackedGuildId === guild.id}
                            isOnFire={!!(onFireGuilds[guild.id] && onFireGuilds[guild.id] > Date.now())}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  {!isLoading && (!rankedGuilds || rankedGuilds.length === 0) && (
                    <div className="text-center py-24">
                      <MapPin className="w-10 h-10 text-white/15 mx-auto mb-4" />
                      <div className="text-sm text-white/25 uppercase tracking-widest">No guilds on the battlefield</div>
                      {guildsError && (
                        <div className="text-xs text-red-400 mt-2 font-mono">{(guildsError as any).message}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ARSENAL — attack & defense items only */}
          {activeTab === "arsenal" && (
            <motion.div key="arsenal" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">

                {/* Attack items */}
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
                          <div
                            key={itemKey}
                            className="flex items-center gap-3 p-3 rounded-lg"
                            style={{ background: `${color}08`, border: `1px solid ${color}20` }}
                          >
                            <img src={meta.image} alt={meta.label} className="w-10 h-10 object-contain" />
                            <div className="flex-1">
                              <div className="font-black text-white text-sm">{meta.label}</div>
                              <div className="text-[10px] text-white/35 mt-0.5">{meta.description}</div>
                              <div className="flex items-center gap-1 mt-1">
                                <Zap className="w-2.5 h-2.5 text-purple-400" />
                                <span className="text-[10px] font-mono text-purple-400">{meta.mpCost} MP</span>
                              </div>
                            </div>
                            <div className="text-2xl font-black tabular-nums" style={{ color }}>×{qty}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Defense items */}
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
                          <div
                            key={itemKey}
                            className="flex items-center gap-3 p-3 rounded-lg"
                            style={{ background: `${color}08`, border: `1px solid ${color}20` }}
                          >
                            <img src={meta.image} alt={meta.label} className="w-10 h-10 object-contain" />
                            <div className="flex-1">
                              <div className="font-black text-white text-sm">{meta.label}</div>
                              <div className="text-[10px] text-white/35 mt-0.5">{meta.description}</div>
                            </div>
                            <div className="text-2xl font-black tabular-nums" style={{ color }}>×{qty}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* WAR LOG */}
          {activeTab === "log" && (
            <motion.div key="log" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-2xl">
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
                  <div
                    className="space-y-2 max-h-[600px] overflow-y-auto pr-1"
                    style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(239,68,68,0.2) transparent" }}
                  >
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
                    {attackLog?.map((attack: any, index: number) => (
                      <WarLogEntry key={attack.id} attack={attack} index={index} />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Guild detail panel */}
      <AnimatePresence>
        {selectedGuild && (
          <GuildDetailPanel
            guild={selectedGuild}
            isMyGuild={myGuildId === selectedGuild.id}
            myGuildId={myGuildId}
            session={session}
            profile={profile}
            currentMP={currentMP}
            inventory={inventory || []}
            myGuildCooldowns={myGuildCooldowns || []}
            attackMutation={attackMutation}
            defenseMutation={defenseMutation}
            mpPotionMutation={mpPotionMutation}
            joinMutation={joinMutation}
            leaveMutation={leaveMutation}
            onAttackItemClick={setConfirmItem}
            onClose={() => setSelectedGuild(null)}
          />
        )}
      </AnimatePresence>

      {/* Confirm attack modal */}
      <AnimatePresence>
        {confirmItem && selectedGuild && (
          <ConfirmAttackModal
            guild={selectedGuild}
            itemType={confirmItem}
            isPending={attackMutation.isPending}
            onConfirm={() => attackMutation.mutate({ targetId: selectedGuild.id, itemType: confirmItem })}
            onCancel={() => setConfirmItem(null)}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <AttackToast message={toast.message} success={toast.success} onDismiss={() => setToast(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
