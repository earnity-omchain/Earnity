import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
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
import {
  Swords, Shield, Heart, Zap, Skull, Trophy, Clock,
  ArrowLeft, Flame, Droplets, Mountain, Wind, TreePine,
  CloudLightning, AlertTriangle, CheckCircle, X, ChevronRight,
  Users, Crosshair, Activity,
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

    // Spawn particles from center
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
      className="absolute inset-0 w-full h-full pointer-events-none z-20"
    />
  );
}

// ── HP Bar ────────────────────────────────────────────────────────────────────
function HPBar({ value, max = 100, animate: shouldAnimate = false }: {
  value: number; max?: number; animate?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const color = pct > 60 ? "#22c55e" : pct > 30 ? "#eab308" : "#ef4444";
  const glow = pct > 60 ? "rgba(34,197,94,0.5)" : pct > 30 ? "rgba(234,179,8,0.5)" : "rgba(239,68,68,0.5)";

  return (
    <div className="relative h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
      <motion.div
        className="h-full rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: shouldAnimate ? 0.8 : 0.3, ease: "easeOut" }}
        style={{
          background: `linear-gradient(90deg, ${color}aa, ${color})`,
          boxShadow: `0 0 8px ${glow}`,
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

// ── MP Bar ────────────────────────────────────────────────────────────────────
function MPBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="relative h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
      <motion.div
        className="h-full rounded-full"
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.5 }}
        style={{
          background: "linear-gradient(90deg, #a855f788, #a855f7)",
          boxShadow: "0 0 8px rgba(168,85,247,0.5)",
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
        {/* Red top accent */}
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

          {/* Target */}
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

          {/* Item */}
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

// ── Guild Card ────────────────────────────────────────────────────────────────
function GuildCard({ guild, index, isMyGuild, isSelected, onClick, attackParticle }: {
  guild: any; index: number; isMyGuild: boolean; isSelected: boolean;
  onClick: () => void; attackParticle: boolean;
}) {
  const el = ELEMENT_META[guild.element] || ELEMENT_META.fire;
  const shieldActive = guild.shield_active_until && new Date(guild.shield_active_until) > new Date();
  const guildImg = getGuildImage(guild.name, guild.element);

  const rankColor = index === 0
    ? { bg: "rgba(234,179,8,0.15)", border: "rgba(234,179,8,0.5)", text: "#fbbf24" }
    : index === 1
    ? { bg: "rgba(156,163,175,0.1)", border: "rgba(156,163,175,0.4)", text: "#9ca3af" }
    : index === 2
    ? { bg: "rgba(180,83,9,0.1)", border: "rgba(180,83,9,0.4)", text: "#f97316" }
    : { bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.08)", text: "#6b7280" };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, type: "spring", damping: 20 }}
      onClick={onClick}
      className="relative cursor-pointer group"
      style={{ fontFamily: "'Space Mono', monospace" }}
    >
      {/* Particle effect overlay */}
      {attackParticle && (
        <ParticleCanvas trigger={attackParticle} color={ITEM_COLORS[GAME_ITEMS.NUKE]} />
      )}

      <div
        className="relative overflow-hidden rounded-xl transition-all duration-200"
        style={{
          background: isSelected
            ? `linear-gradient(135deg, ${el.bg.replace("bg-", "").replace("/15", "")}, rgba(0,0,0,0.8))`
            : "rgba(10,10,10,0.8)",
          border: isSelected
            ? `1px solid ${el.border.replace("border-", "").replace("/50", "")}`
            : `1px solid ${rankColor.border}`,
          boxShadow: isSelected
            ? `0 0 30px ${el.glow}, inset 0 0 30px rgba(0,0,0,0.5)`
            : "none",
        }}
      >
        {/* Shield shimmer */}
        {shieldActive && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{ opacity: [0.05, 0.15, 0.05] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.2), transparent)" }}
          />
        )}

        {/* Selected glow border */}
        {isSelected && (
          <motion.div
            className="absolute inset-0 pointer-events-none rounded-xl"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{ boxShadow: `inset 0 0 20px ${el.glow}` }}
          />
        )}

        <div className="p-4">
          <div className="flex items-center gap-3">
            {/* Rank badge */}
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
              style={{ background: rankColor.bg, border: `1px solid ${rankColor.border}`, color: rankColor.text }}
            >
              {index + 1}
            </div>

            {/* Guild image */}
            <div className="relative flex-shrink-0">
              <div
                className="w-11 h-11 rounded-lg overflow-hidden"
                style={{ border: `1px solid ${isSelected ? el.border : "rgba(255,255,255,0.1)"}` }}
              >
                <img src={guildImg} alt={guild.name}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = el.img; }} />
              </div>
              {shieldActive && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-black flex items-center justify-center">
                  <Shield className="w-2 h-2 text-white" />
                </div>
              )}
            </div>

            {/* Name & element */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-sm text-white truncate tracking-tight">{guild.name}</span>
                {isMyGuild && (
                  <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-full font-bold"
                    style={{ background: el.bg, border: `1px solid ${el.border}`, color: el.text }}>
                    YOURS
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 mt-0.5" style={{ color: el.text }}>
                {ELEMENT_ICONS[guild.element]}
                <span className="text-[10px] uppercase tracking-wider font-bold">{el.label}</span>
                <span className="text-white/20 mx-1">·</span>
                <Users className="w-3 h-3 text-white/30" />
                <span className="text-[10px] text-white/30">{guild.member_count}</span>
              </div>
            </div>

            {/* Score */}
            <div className="text-right flex-shrink-0">
              <div className="text-sm font-black text-white tabular-nums">
                {(guild.ranking_score || 0).toLocaleString()}
              </div>
              <div className="text-[9px] uppercase tracking-wider text-white/30">power</div>
            </div>
          </div>

          {/* HP bar */}
          <div className="mt-3 flex items-center gap-2">
            <Heart className="w-3 h-3 text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <HPBar value={guild.hp ?? 100} animate={attackParticle} />
            </div>
            <span className="text-[10px] font-mono text-white/40 w-8 text-right">{guild.hp ?? 100}%</span>
            {shieldActive && (
              <span className="text-[9px] text-blue-400 uppercase tracking-wider">SHIELDED</span>
            )}
          </div>
        </div>

        {/* Hover/selected indicator */}
        <div
          className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full transition-all duration-200"
          style={{
            background: isSelected ? el.text : "transparent",
            boxShadow: isSelected ? `0 0 8px ${el.glow}` : "none",
          }}
        />
      </div>
    </motion.div>
  );
}

// ── Attack Item Button ────────────────────────────────────────────────────────
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
        background: enabled ? `rgba(${color === "#ef4444" ? "239,68,68" : color === "#f97316" ? "249,115,22" : "168,85,247"},0.08)` : "rgba(255,255,255,0.02)",
        border: `1px solid ${enabled ? `${color}33` : "rgba(255,255,255,0.05)"}`,
        opacity: enabled ? 1 : 0.45,
        cursor: enabled ? "pointer" : "not-allowed",
      }}
    >
      {enabled && (
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100"
          animate={{ opacity: [0, 0.05, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ background: `radial-gradient(circle at 50% 50%, ${color}22, transparent)` }}
        />
      )}

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

      {enabled && (
        <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color }} />
      )}

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
  const [activeTab, setActiveTab] = useState<"battlefield" | "arsenal" | "log">("battlefield");

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

  const canAttackSelected = selectedGuild &&
    selectedGuild.id !== myGuildId &&
    !isShielded(selectedGuild);

  const mpPercent = (currentMP / MP_MAX) * 100;
  const myGuild = guilds?.find(g => g.id === myGuildId);

  const TABS = [
    { id: "battlefield", label: "Battlefield", icon: Crosshair },
    { id: "arsenal", label: "Arsenal", icon: Shield },
    { id: "log", label: "War Log", icon: Activity },
  ] as const;

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
        {/* Scanlines */}
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
          <motion.div
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Swords className="w-5 h-5 text-red-500" />
          </motion.div>
          <span className="font-black text-sm uppercase tracking-[0.2em] text-white">
            Guild Wars
          </span>
          <motion.div
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity, delay: 1 }}
          >
            <Swords className="w-5 h-5 text-red-500" />
          </motion.div>
        </div>

        {/* Live indicator */}
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
            {/* MP */}
            <div className="flex items-center gap-3 flex-1 min-w-[180px]">
              <Zap className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] uppercase tracking-widest text-purple-400">Mana</span>
                  <span className="text-[10px] font-mono text-white/40">{currentMP}/{MP_MAX}</span>
                </div>
                <MPBar value={currentMP} />
              </div>
            </div>

            <div className="w-px h-8 bg-white/5" />

            {/* Guild HP */}
            {myGuild && (
              <div className="flex items-center gap-3 flex-1 min-w-[160px]">
                <Heart className="w-4 h-4 text-red-400 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] uppercase tracking-widest text-red-400">Guild HP</span>
                    <span className="text-[10px] font-mono text-white/40">{myGuild.hp ?? 100}%</span>
                  </div>
                  <HPBar value={myGuild.hp ?? 100} />
                </div>
              </div>
            )}

            <div className="w-px h-8 bg-white/5" />

            {/* Coins */}
            <div className="flex items-center gap-2">
              <img src={GAME_ASSETS.coin} alt="coin" className="w-4 h-4 object-contain" />
              <div>
                <div className="text-[9px] uppercase tracking-widest text-yellow-500">Coins</div>
                <div className="text-xs font-mono font-black text-white">
                  {((profile as any).coin_balance || 0).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Shield status on my guild */}
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
      <div className="relative z-10 px-5 sm:px-8 pt-5"
        style={{ maxWidth: "1400px", margin: "0 auto" }}>
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
      <div className="relative z-10 px-5 sm:px-8 pb-20"
        style={{ maxWidth: "1400px", margin: "0 auto" }}>

        <AnimatePresence mode="wait">

          {/* ── BATTLEFIELD TAB ─────────────────────────────────────────────── */}
          {activeTab === "battlefield" && (
            <motion.div
              key="battlefield"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 lg:grid-cols-5 gap-6"
            >
              {/* Guild Rankings */}
              <div className="lg:col-span-3 space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    <span className="text-xs uppercase tracking-widest text-white/40">Rankings</span>
                  </div>
                  <span className="text-[10px] text-white/20">Click to select target</span>
                </div>

                {isLoading && (
                  <div className="flex items-center justify-center py-20">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Swords className="w-6 h-6 text-red-500" />
                    </motion.div>
                  </div>
                )}

                {guilds?.map((guild, index) => (
                  <GuildCard
                    key={guild.id}
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
                ))}
              </div>

              {/* Attack Panel */}
              <div className="lg:col-span-2">
                <div className="sticky top-6 space-y-4">

                  {/* Selected guild info */}
                  <AnimatePresence mode="wait">
                    {selectedGuild ? (
                      <motion.div
                        key={selectedGuild.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="rounded-xl overflow-hidden"
                        style={{
                          background: "rgba(10,10,10,0.9)",
                          border: "1px solid rgba(239,68,68,0.2)",
                          boxShadow: "0 0 40px rgba(239,68,68,0.08)",
                        }}
                      >
                        <div className="h-0.5 bg-gradient-to-r from-red-600 to-orange-500" />
                        <div className="p-4">
                          <div className="text-[10px] uppercase tracking-widest text-red-400 mb-3 flex items-center gap-2">
                            <Crosshair className="w-3 h-3" /> Target Acquired
                          </div>

                          {/* Target header */}
                          {(() => {
                            const el = ELEMENT_META[selectedGuild.element] || ELEMENT_META.fire;
                            return (
                              <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0"
                                  style={{ border: `1px solid ${el.border}` }}>
                                  <img src={getGuildImage(selectedGuild.name, selectedGuild.element)}
                                    alt={selectedGuild.name} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                  <div className="font-black text-white">{selectedGuild.name}</div>
                                  <div className={`text-xs flex items-center gap-1 ${el.text}`}>
                                    {ELEMENT_ICONS[selectedGuild.element]} {el.label}
                                  </div>
                                  <div className="flex items-center gap-3 mt-1">
                                    <span className="text-[10px] text-white/30 font-mono">HP: {selectedGuild.hp ?? 100}%</span>
                                    <span className="text-[10px] text-white/30 font-mono">
                                      Score: {(selectedGuild.total_score || 0).toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* HP bar for target */}
                          <div className="mb-4">
                            <HPBar value={selectedGuild.hp ?? 100} />
                          </div>

                          {/* Status warnings */}
                          {isShielded(selectedGuild) && (
                            <motion.div
                              className="flex items-center gap-2 p-2.5 rounded-lg mb-3 text-xs text-blue-300"
                              style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}
                              animate={{ opacity: [0.7, 1, 0.7] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            >
                              <Shield className="w-4 h-4 text-blue-400" />
                              Shield active — attacks blocked
                            </motion.div>
                          )}

                          {selectedGuild.id === myGuildId && (
                            <div className="flex items-center gap-2 p-2.5 rounded-lg mb-3 text-xs text-yellow-400"
                              style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.2)" }}>
                              <AlertTriangle className="w-4 h-4" />
                              Cannot attack your own guild
                            </div>
                          )}

                          {/* Attack items */}
                          {!session && (
                            <div className="text-center py-6 text-white/30 text-sm">Sign in to attack</div>
                          )}

                          {session && !myGuildId && (
                            <div className="text-center py-6 text-white/30 text-sm">Join a guild to participate</div>
                          )}

                          {session && myGuildId && (
                            <div className="space-y-2">
                              <div className="text-[10px] uppercase tracking-widest text-white/25 mb-2">Select Weapon</div>
                              {[GAME_ITEMS.NUKE, GAME_ITEMS.DRAIN, GAME_ITEMS.RUG].map(itemKey => (
                                <AttackItemButton
                                  key={itemKey}
                                  itemKey={itemKey}
                                  qty={getItemQty(itemKey)}
                                  currentMP={currentMP}
                                  canAttack={!!canAttackSelected}
                                  isLoading={attackMutation.isPending && confirmItem === itemKey}
                                  onClick={() => setConfirmItem(itemKey)}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="no-target"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="rounded-xl p-6 text-center"
                        style={{
                          background: "rgba(10,10,10,0.6)",
                          border: "1px solid rgba(255,255,255,0.05)",
                        }}
                      >
                        <motion.div
                          animate={{ opacity: [0.3, 0.6, 0.3] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <Crosshair className="w-8 h-8 text-white/20 mx-auto mb-3" />
                        </motion.div>
                        <div className="text-sm text-white/25 uppercase tracking-wider">
                          Select a target from the rankings
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Defense panel */}
                  {session && myGuildId && (
                    <div className="rounded-xl overflow-hidden"
                      style={{
                        background: "rgba(10,10,10,0.9)",
                        border: "1px solid rgba(59,130,246,0.15)",
                      }}>
                      <div className="h-0.5 bg-gradient-to-r from-blue-600 to-cyan-500" />
                      <div className="p-4">
                        <div className="text-[10px] uppercase tracking-widest text-blue-400 mb-3 flex items-center gap-2">
                          <Shield className="w-3 h-3" /> Defense
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
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── ARSENAL TAB ──────────────────────────────────────────────────── */}
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

          {/* ── WAR LOG TAB ──────────────────────────────────────────────────── */}
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
