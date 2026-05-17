import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useState, useCallback } from "react";
import {
  Copy, Check, ExternalLink, Users, ArrowLeft,
  Star, Shield, Swords, Zap, Heart,
  Wind, Flame, Droplets, Mountain, TreePine, CloudLightning,
  Sparkles, Download, Loader2,
} from "lucide-react";
import {
  getRankFromScore,
  getBuildingImage,
  getGuildStats,
  RANK_COLORS,
  RANK_GLOW,
  ALL_ELEMENTS,
  type GuildRank,
  type ElementId,
} from "@/lib/guild-leveling";
import { GAME_ASSETS, ELEMENT_META } from "@/lib/assets";

const ASSETS = {
  background: import.meta.env.BASE_URL + "background-2.png",
  logo:       import.meta.env.BASE_URL + "logo.jpg",
};

// Card canvas dimensions
const CW = 800;
const CH = 420;

/* ─────────────────────────────────────────────
   Canvas Utilities
───────────────────────────────────────────── */
function hexToRgb(hex: string) {
  const clean = hex.startsWith("#") ? hex : "#888888";
  const r = parseInt(clean.slice(1, 3), 16) || 0;
  const g = parseInt(clean.slice(3, 5), 16) || 0;
  const b = parseInt(clean.slice(5, 7), 16) || 0;
  return { r, g, b };
}

function loadImage(src: string, crossOrigin = false): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y,     x + w, y + r,     r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x,     y + h, x,     y + h - r, r);
  ctx.lineTo(x,     y + r);
  ctx.arcTo(x,     y,     x + r, y,         r);
  ctx.closePath();
}

function drawStat(
  ctx: CanvasRenderingContext2D,
  label: string,
  value: number,
  max: number,
  color: string,
  x: number,
  y: number,
  w: number,
) {
  const pct = Math.min(1, value / max);
  const rgb = hexToRgb(color);

  ctx.font = "bold 10px monospace";
  ctx.fillStyle = "rgba(255,255,255,0.32)";
  ctx.textAlign = "left";
  ctx.fillText(label, x, y);

  ctx.font = "bold 12px monospace";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "right";
  ctx.fillText(String(value), x + w, y);

  const barY = y + 5;
  const barH = 5;
  roundRect(ctx, x, barY, w, barH, 2);
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  ctx.fill();

  if (pct > 0) {
    const g = ctx.createLinearGradient(x, 0, x + w * pct, 0);
    g.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.55)`);
    g.addColorStop(1, color);
    ctx.fillStyle = g;
    roundRect(ctx, x, barY, w * pct, barH, 2);
    ctx.fill();
  }
}

function drawCornerMarks(
  ctx: CanvasRenderingContext2D,
  color: string,
  pad = 18,
  len = 22,
  t = 1.5,
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = t;
  const corners = [
    [pad, pad, 1, 1],
    [CW - pad, pad, -1, 1],
    [pad, CH - pad, 1, -1],
    [CW - pad, CH - pad, -1, -1],
  ] as const;
  corners.forEach(([cx, cy, dx, dy]) => {
    ctx.beginPath();
    ctx.moveTo(cx + dx * len, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy + dy * len);
    ctx.stroke();
  });
}

function drawGrain(ctx: CanvasRenderingContext2D) {
  const d = ctx.createImageData(CW, CH);
  for (let i = 0; i < d.data.length; i += 4) {
    const v = Math.random() * 255;
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
    d.data[i + 3] = Math.random() * 16;
  }
  ctx.putImageData(d, 0, 0);
}

/* ─────────────────────────────────────────────
   MAIN CARD RENDERER
───────────────────────────────────────────── */
async function renderCard(opts: {
  username: string;
  guildName?: string;
  element?: string;
  rank: GuildRank;
  score: number;
  stats: ReturnType<typeof getGuildStats>;
  avatarUrl?: string;
  buildingUrl: string;
  progress: number;
  nextRank?: string;
}): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = CW;
  canvas.height = CH;
  const ctx = canvas.getContext("2d")!;

  const rankColor = RANK_COLORS[opts.rank];
  const elMeta   = opts.element ? ELEMENT_META[opts.element] : null;
  const elColor  = (elMeta as any)?.color ?? rankColor;
  const rc = hexToRgb(rankColor);
  const ec = hexToRgb(elColor.startsWith("#") ? elColor : rankColor);

  /* ── Background ──────────────────────────── */
  // Base dark gradient
  const bg = ctx.createLinearGradient(0, 0, CW, CH);
  bg.addColorStop(0, "#0c0c0c");
  bg.addColorStop(1, "#070707");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CW, CH);

  // Rank radial sweep — top left
  const rg1 = ctx.createRadialGradient(60, 60, 0, 60, 60, 360);
  rg1.addColorStop(0, `rgba(${rc.r},${rc.g},${rc.b},0.25)`);
  rg1.addColorStop(1, "transparent");
  ctx.fillStyle = rg1;
  ctx.fillRect(0, 0, CW, CH);

  // Element radial bleed — bottom right
  const rg2 = ctx.createRadialGradient(CW - 60, CH - 60, 0, CW - 60, CH - 60, 300);
  rg2.addColorStop(0, `rgba(${ec.r},${ec.g},${ec.b},0.18)`);
  rg2.addColorStop(1, "transparent");
  ctx.fillStyle = rg2;
  ctx.fillRect(0, 0, CW, CH);

  // Center ambient glow — subtle
  const rg3 = ctx.createRadialGradient(CW / 2, CH / 2, 0, CW / 2, CH / 2, 280);
  rg3.addColorStop(0, `rgba(${rc.r},${rc.g},${rc.b},0.04)`);
  rg3.addColorStop(1, "transparent");
  ctx.fillStyle = rg3;
  ctx.fillRect(0, 0, CW, CH);

  // Grain
  drawGrain(ctx);

  // Scan lines
  for (let y = 0; y < CH; y += 3) {
    ctx.fillStyle = "rgba(0,0,0,0.045)";
    ctx.fillRect(0, y, CW, 1);
  }

  /* ── Outer border ────────────────────────── */
  roundRect(ctx, 1, 1, CW - 2, CH - 2, 16);
  ctx.strokeStyle = `rgba(${rc.r},${rc.g},${rc.b},0.4)`;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  roundRect(ctx, 3, 3, CW - 6, CH - 6, 14);
  ctx.strokeStyle = `rgba(${rc.r},${rc.g},${rc.b},0.07)`;
  ctx.lineWidth = 1;
  ctx.stroke();

  drawCornerMarks(ctx, `rgba(${rc.r},${rc.g},${rc.b},0.75)`);

  /* ── Column dividers ─────────────────────── */
  const L = 210; // left divider x
  const R = 530; // right divider x

  const makeDivGrad = (x: number, r: number, g: number, b: number, a: number) => {
    const gr = ctx.createLinearGradient(x, 30, x, CH - 30);
    gr.addColorStop(0,   "transparent");
    gr.addColorStop(0.2, `rgba(${r},${g},${b},${a})`);
    gr.addColorStop(0.8, `rgba(${r},${g},${b},${a})`);
    gr.addColorStop(1,   "transparent");
    return gr;
  };

  ctx.strokeStyle = makeDivGrad(L, rc.r, rc.g, rc.b, 0.28);
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(L, 30); ctx.lineTo(L, CH - 30); ctx.stroke();

  ctx.strokeStyle = makeDivGrad(R, ec.r, ec.g, ec.b, 0.22);
  ctx.beginPath(); ctx.moveTo(R, 30); ctx.lineTo(R, CH - 30); ctx.stroke();

  /* ════════════════════════════════════════
     LEFT — Avatar + Building + Rank pill
  ════════════════════════════════════════ */
  const LCX = 105;

  // Building
  try {
    const bImg = await loadImage(opts.buildingUrl, true);
    // glow
    const bg2 = ctx.createRadialGradient(LCX, 90, 0, LCX, 90, 55);
    bg2.addColorStop(0, `rgba(${rc.r},${rc.g},${rc.b},0.28)`);
    bg2.addColorStop(1, "transparent");
    ctx.fillStyle = bg2;
    ctx.fillRect(LCX - 55, 35, 110, 110);
    ctx.drawImage(bImg, LCX - 44, 36, 88, 88);
  } catch {
    ctx.fillStyle = `rgba(${rc.r},${rc.g},${rc.b},0.5)`;
    ctx.fillRect(LCX - 18, 50, 36, 64);
  }

  // Avatar
  const AY = 158;
  const AR = 42;
  let gotAvatar = false;

  if (opts.avatarUrl) {
    try {
      const av = await loadImage(opts.avatarUrl, true);
      ctx.save();
      ctx.beginPath();
      ctx.arc(LCX, AY, AR, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(av, LCX - AR, AY - AR, AR * 2, AR * 2);
      ctx.restore();
      gotAvatar = true;
    } catch { /* initials fallback */ }
  }

  if (!gotAvatar) {
    const ig = ctx.createRadialGradient(LCX, AY, 0, LCX, AY, AR);
    ig.addColorStop(0, `rgba(${rc.r},${rc.g},${rc.b},0.45)`);
    ig.addColorStop(1, `rgba(${rc.r},${rc.g},${rc.b},0.1)`);
    ctx.beginPath();
    ctx.arc(LCX, AY, AR, 0, Math.PI * 2);
    ctx.fillStyle = ig;
    ctx.fill();
    ctx.font = "bold 30px system-ui";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(opts.username.charAt(0).toUpperCase(), LCX, AY);
    ctx.textBaseline = "alphabetic";
  }

  // Avatar ring
  ctx.beginPath();
  ctx.arc(LCX, AY, AR + 2, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(${rc.r},${rc.g},${rc.b},0.75)`;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Rank pill
  const rk = opts.rank.toUpperCase();
  ctx.font = "bold 9px system-ui";
  ctx.textAlign = "center";
  const pw = ctx.measureText(rk).width + 18;
  const px = LCX - pw / 2;
  const py = AY + AR + 10;
  roundRect(ctx, px, py, pw, 19, 5);
  ctx.fillStyle = `rgba(${rc.r},${rc.g},${rc.b},0.18)`;
  ctx.fill();
  roundRect(ctx, px, py, pw, 19, 5);
  ctx.strokeStyle = `rgba(${rc.r},${rc.g},${rc.b},0.55)`;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = rankColor;
  ctx.textBaseline = "middle";
  ctx.fillText(rk, LCX, py + 9.5);
  ctx.textBaseline = "alphabetic";

  // Bottom watermark
  ctx.font = "700 8px system-ui";
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.textAlign = "center";
  ctx.letterSpacing = "3px";
  ctx.fillText("EARNITY", LCX, CH - 20);
  ctx.letterSpacing = "0px";

  /* ════════════════════════════════════════
     MIDDLE — Identity + Score + Progress
  ════════════════════════════════════════ */
  const MX  = L + 22;
  const MW  = R - L - 44;

  // Section label
  ctx.font = "700 8px system-ui";
  ctx.fillStyle = `rgba(${rc.r},${rc.g},${rc.b},0.65)`;
  ctx.textAlign = "left";
  ctx.letterSpacing = "3px";
  ctx.fillText("MEMBER PROFILE", MX, 50);
  ctx.letterSpacing = "0px";

  ctx.fillStyle = `rgba(${rc.r},${rc.g},${rc.b},0.2)`;
  ctx.fillRect(MX, 56, MW, 1);

  // Username
  ctx.font = "700 30px system-ui";
  ctx.fillStyle = "#ffffff";
  let uname = opts.username;
  while (ctx.measureText(uname).width > MW && uname.length > 2) uname = uname.slice(0, -1);
  if (uname !== opts.username) uname += "…";
  ctx.fillText(uname, MX, 92);

  // Guild
  if (opts.guildName) {
    ctx.font = "400 13px system-ui";
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillText(opts.guildName, MX, 112);
  }

  // Element pill
  if (elMeta) {
    const elLabel = ((elMeta as any).label ?? opts.element ?? "").toUpperCase();
    ctx.font = "700 9px system-ui";
    const epw = ctx.measureText(elLabel).width + 22;
    roundRect(ctx, MX, 122, epw, 19, 9);
    ctx.fillStyle = `rgba(${ec.r},${ec.g},${ec.b},0.14)`;
    ctx.fill();
    roundRect(ctx, MX, 122, epw, 19, 9);
    ctx.strokeStyle = `rgba(${ec.r},${ec.g},${ec.b},0.38)`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = elColor;
    ctx.textBaseline = "middle";
    ctx.fillText(elLabel, MX + 11, 131.5);
    ctx.textBaseline = "alphabetic";
  }

  // Divider
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.fillRect(MX, 153, MW, 1);

  // Power score
  ctx.font = "700 9px system-ui";
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.textAlign = "left";
  ctx.letterSpacing = "2px";
  ctx.fillText("POWER SCORE", MX, 172);
  ctx.letterSpacing = "0px";

  ctx.font = "700 34px monospace";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(opts.score.toLocaleString(), MX, 208);

  // Divider
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.fillRect(MX, 222, MW, 1);

  // Rank progress
  ctx.font = "700 8px system-ui";
  ctx.fillStyle = "rgba(255,255,255,0.26)";
  ctx.textAlign = "left";
  ctx.letterSpacing = "2px";
  ctx.fillText("RANK PROGRESS", MX, 241);
  ctx.letterSpacing = "0px";

  if (opts.nextRank) {
    ctx.font = "700 8px system-ui";
    ctx.fillStyle = `rgba(${rc.r},${rc.g},${rc.b},0.65)`;
    ctx.textAlign = "right";
    ctx.fillText(`→ ${opts.nextRank.toUpperCase()}`, MX + MW, 241);
  }

  // Progress bar
  const PBY = 248;
  roundRect(ctx, MX, PBY, MW, 8, 4);
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fill();
  if (opts.progress > 0) {
    const pg = ctx.createLinearGradient(MX, 0, MX + MW, 0);
    pg.addColorStop(0, `rgba(${rc.r},${rc.g},${rc.b},0.55)`);
    pg.addColorStop(1, rankColor);
    ctx.fillStyle = pg;
    roundRect(ctx, MX, PBY, MW * opts.progress, 8, 4);
    ctx.fill();
  }

  ctx.font = "700 10px monospace";
  ctx.fillStyle = rankColor;
  ctx.textAlign = "left";
  ctx.fillText(`${Math.floor(opts.progress * 100)}%`, MX, 272);

  // Divider + rank label
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.fillRect(MX, 284, MW, 1);

  ctx.font = "700 10px system-ui";
  ctx.fillStyle = `rgba(${rc.r},${rc.g},${rc.b},0.75)`;
  ctx.textAlign = "left";
  ctx.letterSpacing = "1px";
  ctx.fillText(`${opts.rank} RANK`, MX, 304);
  ctx.letterSpacing = "0px";

  // Bottom url
  ctx.font = "400 8px system-ui";
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.textAlign = "left";
  ctx.letterSpacing = "2px";
  ctx.fillText("earnity.fun", MX, CH - 20);
  ctx.letterSpacing = "0px";

  /* ════════════════════════════════════════
     RIGHT — Combat Stats
  ════════════════════════════════════════ */
  const SX = R + 22;
  const SW = CW - SX - 28;

  ctx.font = "700 8px system-ui";
  ctx.fillStyle = `rgba(${ec.r},${ec.g},${ec.b},0.65)`;
  ctx.textAlign = "left";
  ctx.letterSpacing = "3px";
  ctx.fillText("COMBAT STATS", SX, 50);
  ctx.letterSpacing = "0px";

  ctx.fillStyle = `rgba(${ec.r},${ec.g},${ec.b},0.18)`;
  ctx.fillRect(SX, 56, SW, 1);

  const statsRows = [
    { label: "ATK", value: opts.stats.attack,  max: 110,     color: "#ef4444" },
    { label: "DEF", value: opts.stats.defense, max: 90,      color: "#3b82f6" },
    { label: "MAG", value: opts.stats.magic,   max: 120,     color: "#a855f7" },
    { label: "HP",  value: opts.stats.hp,      max: 650,     color: "#22c55e" },
    { label: "SPD", value: opts.stats.speed,   max: 35,      color: "#06b6d4" },
    { label: "PWR", value: opts.score,         max: 1000000, color: "#eab308" },
  ];

  statsRows.forEach((s, i) => {
    drawStat(ctx, s.label, s.value, s.max, s.color, SX, 80 + i * 46, SW);
  });

  return canvas.toDataURL("image/png");
}

/* ─────────────────────────────────────────────
   UI Components
───────────────────────────────────────────── */
function CopyBtn({ text, dark = false }: { text: string; dark?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className={`p-1.5 rounded-lg transition-colors ${dark ? "hover:bg-white/10 text-white/40 hover:text-white" : "hover:bg-black/10 text-black/30 hover:text-black"}`}
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

const ELEMENT_ICONS: Record<string, React.ReactNode> = {
  fire:      <Flame className="w-5 h-5" />,
  water:     <Droplets className="w-5 h-5" />,
  nature:    <TreePine className="w-5 h-5" />,
  rock:      <Mountain className="w-5 h-5" />,
  lightning: <CloudLightning className="w-5 h-5" />,
  wind:      <Wind className="w-5 h-5" />,
  ice:       <Sparkles className="w-5 h-5" />,
};

function ElementalCircle({ ownedElements, currentElement }: {
  ownedElements: ElementId[];
  currentElement?: string;
}) {
  const radius = 110;
  const center = 130;
  const total  = ALL_ELEMENTS.length;

  return (
    <div className="relative w-[260px] h-[260px] mx-auto">
      <div className="absolute inset-0 rounded-full border-2 border-white/10" />
      <div className="absolute inset-4 rounded-full border border-white/5" />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 rounded-full border-2 border-white/20 bg-black/40 backdrop-blur-sm flex items-center justify-center">
          {currentElement && ELEMENT_META[currentElement]
            ? <img src={ELEMENT_META[currentElement].img} className="w-10 h-10 object-contain" alt="" />
            : <div className="w-3 h-3 rounded-full bg-white/20" />
          }
        </div>
      </div>

      {ALL_ELEMENTS.map((el, i) => {
        const angle  = (i / total) * Math.PI * 2 - Math.PI / 2;
        const x      = center + radius * Math.cos(angle);
        const y      = center + radius * Math.sin(angle);
        const isOwned = ownedElements.includes(el.id);

        return (
          <motion.div
            key={el.id}
            className="absolute w-10 h-10 -ml-5 -mt-5 rounded-full border-2 flex items-center justify-center"
            style={{
              left: x, top: y,
              borderColor: isOwned ? el.color : "rgba(255,255,255,0.12)",
              background:  isOwned ? `${el.color}20` : "rgba(0,0,0,0.5)",
              boxShadow:   isOwned ? `0 0 20px ${el.glow}, inset 0 0 10px ${el.glow}` : "none",
              filter:      isOwned ? "none" : "grayscale(100%) brightness(0.35)",
            }}
            animate={isOwned ? { boxShadow: [`0 0 15px ${el.glow}`, `0 0 30px ${el.glow}`, `0 0 15px ${el.glow}`] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div style={{ color: isOwned ? el.color : "rgba(255,255,255,0.18)" }}>
              {ELEMENT_ICONS[el.id]}
            </div>
            <div
              className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-wider whitespace-nowrap"
              style={{ color: isOwned ? el.color : "rgba(255,255,255,0.18)" }}
            >
              {el.label}
            </div>
            {isOwned && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: "visible" }}>
                <line x1="20" y1="20" x2={130 - x + 20} y2={130 - y + 20}
                  stroke={el.color} strokeWidth="1" strokeOpacity="0.3" strokeDasharray="4 4" />
              </svg>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Profile Card Preview (DOM — matches canvas design)
───────────────────────────────────────────── */
function ProfileCardPreview({ fp, rank, stats, score }: {
  fp: any; rank: GuildRank; stats: ReturnType<typeof getGuildStats>; score: number;
}) {
  const rankColor  = RANK_COLORS[rank];
  const buildingImg = getBuildingImage(rank);
  const elId    = fp?.guilds?.element ?? fp?.element;
  const elMeta  = elId ? ELEMENT_META[elId] : null;
  const elColor = (elMeta as any)?.color ?? rankColor;
  const { progress, nextRank } = getRankFromScore(score);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl border overflow-hidden"
      style={{ borderColor: `${rankColor}30`, background: "linear-gradient(160deg, #0c0c0c, #070707)" }}
    >
      {/* Rank glow top-left */}
      <div className="absolute top-0 left-0 w-56 h-56 opacity-20 blur-3xl pointer-events-none"
        style={{ background: rankColor }} />
      {/* Element glow bottom-right */}
      {elMeta && (
        <div className="absolute bottom-0 right-0 w-48 h-48 opacity-15 blur-3xl pointer-events-none"
          style={{ background: elColor }} />
      )}

      {/* Horizontal 3-col layout */}
      <div className="relative flex gap-0">

        {/* LEFT — avatar + building */}
        <div className="flex flex-col items-center justify-center gap-3 px-5 py-5 w-[130px] flex-shrink-0 border-r"
          style={{ borderColor: `${rankColor}20` }}>
          <motion.img src={buildingImg} alt="stronghold" className="w-16 h-16 object-contain"
            animate={{ y: [0, -3, 0] }} transition={{ duration: 3, repeat: Infinity }}
            style={{ filter: `drop-shadow(0 0 12px ${rankColor}66)` }} />

          <div className="relative">
            {fp?.discord_avatar ? (
              <img src={fp.discord_avatar} className="w-14 h-14 rounded-xl border-2 object-cover"
                style={{ borderColor: `${rankColor}55` }} />
            ) : (
              <div className="w-14 h-14 rounded-xl border-2 bg-white/10 flex items-center justify-center text-2xl font-bold text-white"
                style={{ borderColor: `${rankColor}55` }}>
                {fp?.username?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase border text-center"
            style={{ background: `${rankColor}18`, borderColor: `${rankColor}45`, color: rankColor }}>
            {rank}
          </div>

          <span className="text-[8px] text-white/10 tracking-[3px] uppercase">EARNITY</span>
        </div>

        {/* MIDDLE — identity + score + progress */}
        <div className="flex-1 py-5 px-4 border-r" style={{ borderColor: `${elColor}18` }}>
          <div className="text-[8px] uppercase tracking-[3px] mb-2" style={{ color: `${rankColor}aa` }}>
            MEMBER PROFILE
          </div>
          <h2 className="text-xl font-bold text-white truncate leading-tight">{fp?.username}</h2>
          {fp?.guilds && <p className="text-xs text-white/35 mt-0.5 truncate">{fp.guilds.name}</p>}

          {elMeta && (
            <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full border text-[10px] font-semibold"
              style={{ color: elColor, borderColor: `${elColor}35`, background: `${elColor}10` }}>
              <img src={elMeta.img} className="w-3 h-3 object-contain" alt="" />
              {elMeta.label}
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-white/5">
            <div className="text-[8px] text-white/25 uppercase tracking-widest mb-0.5">Power Score</div>
            <div className="text-2xl font-bold text-white font-mono leading-none">
              {score.toLocaleString()}
            </div>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-[8px] text-white/25 uppercase tracking-wider mb-1.5">
              <span>Rank Progress</span>
              {nextRank && <span className="text-white/40">→ {nextRank}</span>}
            </div>
            <div className="h-1.5 bg-white/6 rounded-full overflow-hidden">
              <motion.div className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${rankColor}77, ${rankColor})` }}
                initial={{ width: 0 }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 1.2 }} />
            </div>
            <div className="text-[9px] font-mono mt-1" style={{ color: rankColor }}>
              {Math.floor(progress * 100)}%
            </div>
          </div>
        </div>

        {/* RIGHT — stats */}
        <div className="w-[170px] flex-shrink-0 py-5 px-4">
          <div className="text-[8px] uppercase tracking-[3px] mb-2" style={{ color: `${elColor}aa` }}>
            COMBAT STATS
          </div>
          <div className="space-y-2.5">
            {[
              { label: "ATK", value: stats.attack,  max: 110,     color: "#ef4444" },
              { label: "DEF", value: stats.defense, max: 90,      color: "#3b82f6" },
              { label: "MAG", value: stats.magic,   max: 120,     color: "#a855f7" },
              { label: "HP",  value: stats.hp,      max: 650,     color: "#22c55e" },
              { label: "SPD", value: stats.speed,   max: 35,      color: "#06b6d4" },
              { label: "PWR", value: score,         max: 1000000, color: "#eab308" },
            ].map(({ label, value, max, color }) => (
              <div key={label}>
                <div className="flex justify-between text-[9px] mb-0.5">
                  <span className="text-white/30 uppercase">{label}</span>
                  <span className="text-white font-mono font-bold">{value}</span>
                </div>
                <div className="h-1 bg-white/6 rounded-full overflow-hidden">
                  <motion.div className="h-full rounded-full"
                    style={{ background: color, width: `${Math.min(100, (value / max) * 100)}%` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (value / max) * 100)}%` }}
                    transition={{ duration: 0.8 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */
export default function Profile() {
  const { session, profile, signOut } = useAuth();
  const [, setLocation] = useLocation();
  const [downloading, setDownloading] = useState(false);

  const { data: fullProfile } = useQuery({
    queryKey: ["profile-full", session?.user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*, guilds(id, name, element)")
        .eq("id", session!.user.id)
        .single();
      return data;
    },
    enabled: !!session?.user?.id,
  });

  const { data: inventory } = useQuery({
    queryKey: ["inventory", session?.user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("inventory")
        .select("*")
        .eq("user_id", session!.user.id);
      return data ?? [];
    },
    enabled: !!session?.user?.id,
  });

  const { data: elementals } = useQuery({
    queryKey: ["user-elementals", session?.user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_elementals")
        .select("element_type")
        .eq("user_id", session!.user.id);
      return (data ?? []).map((e: any) => e.element_type as ElementId);
    },
    enabled: !!session?.user?.id,
  });

  const { data: referralCodes } = useQuery({
    queryKey: ["profile-referral-codes", session?.user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("invite_codes")
        .select("code, is_active, used_at, used_by")
        .eq("created_by", session!.user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!session?.user?.id,
  });

  if (!session || !profile) return null;

  const fp         = fullProfile as any;
  const score      = fp?.stronghold_score ?? fp?.ranking_score ?? fp?.contribution_score ?? 0;
  const { rank, progress, nextRank } = getRankFromScore(score);
  const stats      = getGuildStats(score);
  const wallet     = fp?.wallet_address;
  const shortWallet = wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : null;
  const activeCodes = referralCodes?.filter((c: any) => !c.used_by) ?? [];
  const usedCodes   = referralCodes?.filter((c: any) => c.used_by) ?? [];
  const shards      = inventory?.filter((i: any) => i.item_type === "shard") ?? [];
  const shardCount  = shards.reduce((acc: number, s: any) => acc + (s.quantity || 0), 0);
  const rankColor   = RANK_COLORS[rank];

  const handleDownload = useCallback(async () => {
    if (downloading || !fp) return;
    setDownloading(true);
    try {
      const url = await renderCard({
        username:    fp.username ?? "Unknown",
        guildName:   fp.guilds?.name,
        element:     fp.element,
        rank,
        score,
        stats,
        avatarUrl:   fp.discord_avatar,
        buildingUrl: getBuildingImage(rank),
        progress,
        nextRank,
      });
      const a = document.createElement("a");
      a.download = `${fp.username ?? "player"}-earnity.png`;
      a.href = url;
      a.click();
    } catch (e) {
      console.error("Card render error:", e);
    } finally {
      setDownloading(false);
    }
  }, [fp, rank, score, stats, progress, nextRank, downloading]);

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-black text-white">
      <div className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${ASSETS.background})` }} />
      <div className="absolute inset-0 bg-black/75" />

      {/* Nav */}
      <nav className="relative z-20 flex items-center justify-between px-5 sm:px-10 py-4 border-b border-white/8 bg-black/20 backdrop-blur-md">
        <button onClick={() => setLocation("/")}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition-colors text-white/70 hover:text-white text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg overflow-hidden border border-white/15">
            <img src={ASSETS.logo} className="w-full h-full object-cover" />
          </div>
          <span className="text-sm font-bold tracking-tight">EARNITY</span>
        </div>
        <button onClick={signOut}
          className="text-sm text-red-400 hover:text-red-300 transition-colors px-3 py-1.5 rounded-xl border border-red-500/20 hover:bg-red-500/10">
          Sign Out
        </button>
      </nav>

      <div className="relative z-10 max-w-lg mx-auto px-5 py-8 space-y-6">

        {/* ── Card Preview ── */}
        <ProfileCardPreview fp={fp} rank={rank} stats={stats} score={score} />

        {/* ── Download ── */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: downloading ? 1 : 1.02 }}
          whileTap={{ scale: downloading ? 1 : 0.97 }}
          onClick={handleDownload}
          disabled={downloading}
          className="w-full py-3.5 rounded-xl border flex items-center justify-center gap-2.5 text-sm font-semibold transition-all disabled:opacity-60"
          style={{ borderColor: `${rankColor}35`, background: `${rankColor}0a`, color: rankColor }}
        >
          {downloading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Rendering…</>
            : <><Download className="w-4 h-4" /> Download Profile Card</>}
        </motion.button>
        <p className="text-[10px] text-white/18 text-center -mt-3">
          Horizontal 800×420 PNG · rank &amp; element colors · no external tools
        </p>

        {/* ── Elemental Circle ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6"
        >
          <div className="text-[10px] uppercase tracking-wider text-white/40 mb-4 text-center">
            Elemental Affinity
          </div>
          <ElementalCircle
            ownedElements={elementals ?? ([fp?.element].filter(Boolean) as ElementId[])}
            currentElement={fp?.element}
          />
          <p className="text-[10px] text-white/20 text-center mt-6">
            Owned elements glow · Collect all 7 to unlock transcendence
          </p>
        </motion.div>

        {/* ── Inventory ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5"
        >
          <div className="text-[10px] uppercase tracking-wider text-white/40 mb-4">Inventory</div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white font-mono">{shardCount}</div>
                <div className="text-[10px] text-white/30 uppercase">Shards</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <Star className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white font-mono">{elementals?.length ?? 0}</div>
                <div className="text-[10px] text-white/30 uppercase">Elementals</div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {[
              { icon: Shield, label: "Shields",    color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/20",   key: "shields" },
              { icon: Swords, label: "Rugs",       color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/20",    key: "rugs" },
              { icon: Zap,    label: "Drainers",   color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", key: "drainers" },
              { icon: Heart,  label: "HP Potions", color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/20",  key: "hp_potions" },
            ].map(({ icon: Icon, label, color, bg, border, key }) => {
              const count = inventory?.find(
                (i: any) => i.item_type === label.toLowerCase().replace(" ", "_")
              )?.quantity ?? 0;
              return (
                <div key={key} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] border border-white/5">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg ${bg} border ${border} flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                    <span className="text-sm text-white/60">{label}</span>
                  </div>
                  <span className="text-sm font-bold text-white font-mono">{count}</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* ── Wallet ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5"
        >
          <div className="text-[10px] uppercase tracking-wider text-white/40 mb-3">Bound Wallet</div>
          {wallet ? (
            <div className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
              <span className="font-mono text-sm text-white/80">{shortWallet}</span>
              <div className="flex items-center gap-1">
                <CopyBtn text={wallet} dark />
                <a href={`https://etherscan.io/address/${wallet}`} target="_blank" rel="noopener noreferrer"
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-white">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ) : (
            <div className="text-sm text-white/40 text-center py-2">No wallet bound yet.</div>
          )}
        </motion.div>

        {/* ── Referral Codes ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-white/40" />
              <span className="text-[10px] uppercase tracking-wider text-white/40">Referral Codes</span>
            </div>
            <span className="text-[10px] text-white/30">+50 pts per referral</span>
          </div>
          {activeCodes.length > 0 ? (
            <div className="space-y-2">
              {activeCodes.map((c: any) => (
                <div key={c.code} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                  <span className="font-mono text-sm tracking-[0.15em] text-white">{c.code}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-green-400">Active</span>
                    <CopyBtn text={c.code} dark />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-white/40">Generating your referral codes…</p>
            </div>
          )}
          {usedCodes.length > 0 && (
            <p className="text-[10px] text-white/20 text-center mt-3">
              {usedCodes.length} code{usedCodes.length !== 1 ? "s" : ""} already redeemed
            </p>
          )}
        </motion.div>

      </div>
    </div>
  );
}
