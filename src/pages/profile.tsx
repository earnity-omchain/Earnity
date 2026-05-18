import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useState } from "react";
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

const ELEMENT_ICONS: Record<string, React.ReactNode> = {
  fire:      <Flame className="w-4 h-4" />,
  water:     <Droplets className="w-4 h-4" />,
  nature:    <TreePine className="w-4 h-4" />,
  rock:      <Mountain className="w-4 h-4" />,
  lightning: <CloudLightning className="w-4 h-4" />,
  wind:      <Wind className="w-4 h-4" />,
  ice:       <Sparkles className="w-4 h-4" />,
};

/* ────────────────────────────────────────────
   Canvas helpers
──────────────────────────────────────────── */
function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function loadImage(src: string, cors = false): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (cors) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function rr(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* ────────────────────────────────────────────
   Canvas card renderer  — 900 × 500 @ 2×
──────────────────────────────────────────── */
async function renderGuildCard(opts: {
  username: string;
  guildName: string;
  element: string;
  rank: GuildRank;
  score: number;
  stats: ReturnType<typeof getGuildStats>;
  avatarUrl: string | null;
  buildingUrl: string;
  userId: string;
  rankColor: string;
  rankGlow: string;
}): Promise<string> {
  const { username, guildName, element, rank, score, stats,
          avatarUrl, buildingUrl, userId, rankColor } = opts;

  const SCALE = 2;
  const W = 900, H = 500;

  const canvas = document.createElement("canvas");
  canvas.width  = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(SCALE, SCALE);

  const rc  = hexToRgb(rankColor);
  const elMeta  = ELEMENT_META[element];
  const elColor = elMeta?.color ?? rankColor;
  const ec  = hexToRgb(elColor);
  const rgba  = (c: {r:number;g:number;b:number}, a: number) =>
    `rgba(${c.r},${c.g},${c.b},${a})`;

  /* 1 ── card base */
  rr(ctx, 0, 0, W, H, 22);
  ctx.fillStyle = "#070709";
  ctx.fill();
  ctx.save(); ctx.clip();   // clip everything inside rounded rect

  /* 2 ── rank glow top-right */
  const g1 = ctx.createRadialGradient(W, 0, 0, W, 0, 440);
  g1.addColorStop(0, rgba(rc, 0.25));
  g1.addColorStop(0.55, rgba(rc, 0.07));
  g1.addColorStop(1, rgba(rc, 0));
  ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);

  /* 3 ── element glow bottom-left */
  const g2 = ctx.createRadialGradient(0, H, 0, 0, H, 380);
  g2.addColorStop(0, rgba(ec, 0.20));
  g2.addColorStop(0.5, rgba(ec, 0.05));
  g2.addColorStop(1, rgba(ec, 0));
  ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);

  /* 4 ── subtle noise grain */
  const grainC = document.createElement("canvas");
  grainC.width = W; grainC.height = H;
  const gc = grainC.getContext("2d")!;
  const id = gc.createImageData(W, H);
  for (let i = 0; i < id.data.length; i += 4) {
    const v = Math.random() * 255;
    id.data[i] = id.data[i+1] = id.data[i+2] = v;
    id.data[i+3] = 6;
  }
  gc.putImageData(id, 0, 0);
  ctx.drawImage(grainC, 0, 0);

  /* 5 ── left dark panel */
  const LEFT = 272;
  const lp = ctx.createLinearGradient(0, 0, LEFT + 50, 0);
  lp.addColorStop(0,   "rgba(0,0,0,0.62)");
  lp.addColorStop(0.7, "rgba(0,0,0,0.28)");
  lp.addColorStop(1,   "rgba(0,0,0,0)");
  ctx.fillStyle = lp; ctx.fillRect(0, 0, LEFT + 60, H);

  /* 6 ── diagonal separator */
  ctx.beginPath();
  ctx.moveTo(LEFT, 0);
  ctx.lineTo(LEFT + 44, H);
  const sep = ctx.createLinearGradient(LEFT, 0, LEFT + 44, H);
  sep.addColorStop(0,   rgba(rc, 0.7));
  sep.addColorStop(0.5, rgba(rc, 0.25));
  sep.addColorStop(1,   rgba(ec, 0.55));
  ctx.strokeStyle = sep;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  /* 7 ── avatar */
  const AX = 42, AY = 52, AR = 58;
  const ACX = AX + AR, ACY = AY + AR;

  // glow ring
  ctx.save();
  ctx.beginPath();
  ctx.arc(ACX, ACY, AR + 7, 0, Math.PI * 2);
  ctx.strokeStyle = rankColor;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = rankColor;
  ctx.shadowBlur = 22;
  ctx.stroke();
  ctx.restore();

  // avatar image or initials
  ctx.save();
  ctx.beginPath();
  ctx.arc(ACX, ACY, AR, 0, Math.PI * 2);
  ctx.clip();
  let drew = false;
  if (avatarUrl) {
    try {
      const av = await loadImage(avatarUrl, true);
      ctx.drawImage(av, AX, AY, AR * 2, AR * 2);
      drew = true;
    } catch { /* fall through */ }
  }
  if (!drew) {
    const fb = ctx.createLinearGradient(AX, AY, AX + AR*2, AY + AR*2);
    fb.addColorStop(0, rgba(rc, 0.45));
    fb.addColorStop(1, rgba(rc, 0.15));
    ctx.fillStyle = fb;
    ctx.fillRect(AX, AY, AR * 2, AR * 2);
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.font = `bold 42px Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(username.charAt(0).toUpperCase(), ACX, ACY + 2);
  }
  ctx.restore();

  /* 8 ── username */
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold 24px Georgia, serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  let uname = username;
  while (ctx.measureText(uname).width > LEFT - 20 && uname.length > 3)
    uname = uname.slice(0, -1);
  if (uname !== username) uname += "…";
  ctx.fillText(uname, AX, AY + AR * 2 + 30);

  /* 9 ── guild name */
  ctx.fillStyle = rgba({r:255,g:255,b:255}, 0.36);
  ctx.font = `12px Georgia, serif`;
  let gn = guildName || "No Guild";
  while (ctx.measureText(gn).width > LEFT - 20 && gn.length > 3)
    gn = gn.slice(0, -1);
  if (gn !== (guildName || "No Guild")) gn += "…";
  ctx.fillText(gn, AX, AY + AR * 2 + 49);

  /* 10 ── element chip */
  const chipLabel = (elMeta?.label ?? element ?? "Unknown").toUpperCase();
  ctx.font = `bold 10px "Courier New", monospace`;
  const chipW = Math.max(80, ctx.measureText(chipLabel).width + 28);
  const chipY = AY + AR * 2 + 64;
  rr(ctx, AX, chipY, chipW, 24, 12);
  ctx.fillStyle = rgba(ec, 0.14); ctx.fill();
  ctx.strokeStyle = rgba(ec, 0.42); ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = elColor;
  ctx.textAlign = "center";
  ctx.fillText(chipLabel, AX + chipW / 2, chipY + 16);

  /* 11 ── power score */
  ctx.textAlign = "left";
  ctx.fillStyle = rgba({r:255,g:255,b:255}, 0.22);
  ctx.font = `9px "Courier New", monospace`;
  ctx.fillText("POWER", AX, chipY + 48);
  ctx.fillStyle = rankColor;
  ctx.font = `bold 18px "Courier New", monospace`;
  ctx.fillText(score.toLocaleString(), AX, chipY + 66);

  /* 12 ── serial */
  const serial = `#GW-${userId.slice(0, 8).toUpperCase()}`;
  ctx.fillStyle = rgba({r:255,g:255,b:255}, 0.13);
  ctx.font = `8px "Courier New", monospace`;
  ctx.textAlign = "left";
  ctx.fillText(serial, AX, H - 26);

  /* 13 ── EARNITY wordmark */
  ctx.fillStyle = rgba({r:255,g:255,b:255}, 0.5);
  ctx.font = `bold 10px "Courier New", monospace`;
  ctx.fillText("EARNITY", AX, 26);

  /* 14 ── building image — center column */
  const centerL = LEFT + 48;
  const centerR = W - 228;
  const midX    = centerL + (centerR - centerL) / 2;

  try {
    const bld = await loadImage(buildingUrl, true);
    const BS  = 198;
    ctx.save();
    ctx.shadowColor = rankColor;
    ctx.shadowBlur  = 55;
    ctx.drawImage(bld, midX - BS / 2, H / 2 - BS / 2 - 8, BS, BS);
    ctx.restore();
  } catch { /* skip */ }

  /* 15 ── rank badge above building */
  const badgeLabel = `${rank} RANK`;
  ctx.font = `bold 10px "Courier New", monospace`;
  ctx.textAlign = "center";
  const bW = ctx.measureText(badgeLabel).width + 22;
  const bX = midX - bW / 2, bY = 24;
  rr(ctx, bX, bY, bW, 22, 11);
  ctx.fillStyle = rgba(rc, 0.17); ctx.fill();
  ctx.strokeStyle = rgba(rc, 0.52); ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = rankColor;
  ctx.fillText(badgeLabel, midX, bY + 15);

  /* 16 ── rank progress under building */
  const { progress, nextRank: nR } = getRankFromScore(score);
  const progW = 120;
  const progX = midX - progW / 2;
  const progY = H / 2 + 116;
  ctx.fillStyle = rgba({r:255,g:255,b:255}, 0.16);
  ctx.font = `8px "Courier New", monospace`;
  ctx.textAlign = "left";
  ctx.fillText("RANK PROGRESS", progX, progY - 4);
  ctx.textAlign = "right";
  ctx.fillText(`${Math.floor(progress * 100)}%`, progX + progW, progY - 4);
  // track
  rr(ctx, progX, progY, progW, 5, 2.5);
  ctx.fillStyle = rgba({r:255,g:255,b:255}, 0.07); ctx.fill();
  // fill
  if (progress > 0) {
    ctx.save();
    const pf = ctx.createLinearGradient(progX, 0, progX + progW, 0);
    pf.addColorStop(0, rgba(rc, 0.6));
    pf.addColorStop(1, rankColor);
    rr(ctx, progX, progY, progW * progress, 5, 2.5);
    ctx.fillStyle = pf;
    ctx.shadowColor = rankColor; ctx.shadowBlur = 6;
    ctx.fill();
    ctx.restore();
  }

  /* 17 ── stats panel — right column */
  const SX = W - 222, SY = 40, SW = 202;
  const statRows = [
    { label: "ATK", value: stats.attack,  color: "#ef4444", max: 110 },
    { label: "DEF", value: stats.defense, color: "#3b82f6", max: 90 },
    { label: "MAG", value: stats.magic,   color: "#a855f7", max: 120 },
    { label: "HP",  value: stats.hp,      color: "#22c55e", max: 650 },
    { label: "SPD", value: stats.speed,   color: "#06b6d4", max: 35 },
  ];

  statRows.forEach((st, i) => {
    const sy = SY + i * 51;
    const sc = hexToRgb(st.color);
    const pct = Math.min(1, st.value / st.max);

    rr(ctx, SX, sy, SW, 42, 8);
    ctx.fillStyle = rgba({r:255,g:255,b:255}, 0.03); ctx.fill();
    ctx.strokeStyle = rgba({r:255,g:255,b:255}, 0.06); ctx.lineWidth = 1; ctx.stroke();

    // label
    ctx.fillStyle = rgba({r:255,g:255,b:255}, 0.28);
    ctx.font = `bold 9px "Courier New", monospace`;
    ctx.textAlign = "left";
    ctx.fillText(st.label, SX + 10, sy + 15);

    // value
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 14px "Courier New", monospace`;
    ctx.textAlign = "right";
    ctx.fillText(String(st.value), SX + SW - 10, sy + 16);

    // bar track
    const bx = SX + 10, by = sy + 27, bw = SW - 20, bh = 4;
    rr(ctx, bx, by, bw, bh, 2);
    ctx.fillStyle = rgba({r:255,g:255,b:255}, 0.07); ctx.fill();

    if (pct > 0) {
      ctx.save();
      const bf = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      bf.addColorStop(0, rgba(sc, 0.65));
      bf.addColorStop(1, st.color);
      rr(ctx, bx, by, bw * pct, bh, 2);
      ctx.fillStyle = bf;
      ctx.shadowColor = st.color; ctx.shadowBlur = 5;
      ctx.fill();
      ctx.restore();
    }
  });

  /* 18 ── bottom strip */
  const stripY = H - 42;
  const strip = ctx.createLinearGradient(0, stripY, W, stripY);
  strip.addColorStop(0,   rgba(rc, 0.13));
  strip.addColorStop(0.5, rgba(rc, 0.05));
  strip.addColorStop(1,   rgba(ec, 0.13));
  ctx.fillStyle = strip;
  ctx.fillRect(0, stripY, W, 42);

  ctx.beginPath();
  ctx.moveTo(0, stripY); ctx.lineTo(W, stripY);
  ctx.strokeStyle = rgba(rc, 0.22); ctx.lineWidth = 1; ctx.stroke();

  const sText = `EARNITY GUILD WARS  •  ${rank.toUpperCase()} RANK  •  ${(elMeta?.label ?? "").toUpperCase()} ELEMENT  •  ${score.toLocaleString()} PWR`;
  ctx.fillStyle = rgba({r:255,g:255,b:255}, 0.24);
  ctx.font = `9px "Courier New", monospace`;
  ctx.textAlign = "center";
  ctx.fillText(sText, W / 2, stripY + 26);

  ctx.restore(); // end clip

  /* 19 ── outer border (drawn outside clip) */
  ctx.save();
  rr(ctx, 1, 1, W - 2, H - 2, 22);
  ctx.strokeStyle = rgba(rc, 0.52);
  ctx.lineWidth = 2;
  ctx.shadowColor = rankColor; ctx.shadowBlur = 18;
  ctx.stroke();
  ctx.restore();

  // inner element inset
  ctx.save();
  rr(ctx, 4, 4, W - 8, H - 8, 19);
  ctx.strokeStyle = rgba(ec, 0.18);
  ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();

  /* 20 ── corner L-accents */
  const AL = 22, AO = 11;
  [[0,0],[W,0],[0,H],[W,H]].forEach(([cx, cy], qi) => {
    const sx = (qi === 1 || qi === 3) ? -1 : 1;
    const sy = (qi === 2 || qi === 3) ? -1 : 1;
    ctx.save();
    ctx.strokeStyle = rankColor;
    ctx.lineWidth = 2;
    ctx.shadowColor = rankColor; ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(cx + sx * AO,        cy + sy * AO);
    ctx.lineTo(cx + sx * (AO + AL), cy + sy * AO);
    ctx.moveTo(cx + sx * AO,        cy + sy * AO);
    ctx.lineTo(cx + sx * AO,        cy + sy * (AO + AL));
    ctx.stroke();
    ctx.restore();
  });

  return canvas.toDataURL("image/png");
}

/* ────────────────────────────────────────────
   Small helpers
──────────────────────────────────────────── */
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

/* ────────────────────────────────────────────
   Elemental Circle
──────────────────────────────────────────── */
function ElementalCircle({ ownedElements, currentElement }: {
  ownedElements: ElementId[];
  currentElement?: string;
}) {
  const radius = 110, center = 130, total = ALL_ELEMENTS.length;
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
        const angle = (i / total) * Math.PI * 2 - Math.PI / 2;
        const x = center + radius * Math.cos(angle);
        const y = center + radius * Math.sin(angle);
        const isOwned = ownedElements.includes(el.id);
        return (
          <motion.div key={el.id}
            className="absolute w-10 h-10 -ml-5 -mt-5 rounded-full border-2 flex items-center justify-center"
            style={{
              left: x, top: y,
              borderColor: isOwned ? el.color : "rgba(255,255,255,0.12)",
              background: isOwned ? `${el.color}20` : "rgba(0,0,0,0.5)",
              boxShadow: isOwned ? `0 0 20px ${el.glow}, inset 0 0 10px ${el.glow}` : "none",
              filter: isOwned ? "none" : "grayscale(100%) brightness(0.35)",
            }}
            animate={isOwned ? { boxShadow: [`0 0 15px ${el.glow}`, `0 0 30px ${el.glow}`, `0 0 15px ${el.glow}`] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div style={{ color: isOwned ? el.color : "rgba(255,255,255,0.18)" }}>
              {ELEMENT_ICONS[el.id]}
            </div>
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-wider whitespace-nowrap"
              style={{ color: isOwned ? el.color : "rgba(255,255,255,0.18)" }}>
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

/* ────────────────────────────────────────────
   DOM Card Preview — mirrors the canvas layout
──────────────────────────────────────────── */
function ProfileCardPreview({ fp, rank, stats, score }: {
  fp: any; rank: GuildRank; stats: ReturnType<typeof getGuildStats>; score: number;
}) {
  const rankColor = RANK_COLORS[rank];
  const buildingImg = getBuildingImage(rank);
  const elId  = fp?.element ?? fp?.guilds?.element;
  const elMeta = elId ? ELEMENT_META[elId] : null;
  const rc = hexToRgb(rankColor);

  return (
    <div className="relative rounded-[22px] border-2 overflow-hidden w-full select-none"
      style={{ aspectRatio: "900/500", borderColor: `rgba(${rc.r},${rc.g},${rc.b},0.5)`,
        background: "#070709", boxShadow: `0 0 40px rgba(${rc.r},${rc.g},${rc.b},0.15)` }}>

      {/* Corner L accents */}
      {[
        "top-3 left-3 border-t-2 border-l-2 rounded-tl-md",
        "top-3 right-3 border-t-2 border-r-2 rounded-tr-md",
        "bottom-3 left-3 border-b-2 border-l-2 rounded-bl-md",
        "bottom-3 right-3 border-b-2 border-r-2 rounded-br-md",
      ].map((cls, i) => (
        <div key={i} className={`absolute w-5 h-5 ${cls}`}
          style={{ borderColor: rankColor }} />
      ))}

      {/* Rank glow top-right */}
      <div className="absolute -top-10 -right-10 w-80 h-80 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: rankColor }} />
      {/* Element glow bottom-left */}
      {elMeta && (
        <div className="absolute -bottom-10 -left-10 w-64 h-64 rounded-full opacity-15 blur-3xl pointer-events-none"
          style={{ background: elMeta.color }} />
      )}
      {/* Inner inset ring */}
      <div className="absolute inset-1 rounded-[18px] border border-white/5 pointer-events-none" />

      <div className="relative h-full flex">
        {/* ── LEFT PANEL ── */}
        <div className="w-[31%] flex flex-col justify-between py-5 px-4 border-r"
          style={{ background: "linear-gradient(180deg,rgba(0,0,0,0.55) 0%,rgba(0,0,0,0.2) 100%)",
            borderColor: "rgba(255,255,255,0.07)" }}>

          <div className="text-[9px] font-mono font-bold text-white/45 tracking-[0.18em]">EARNITY</div>

          {/* Avatar + meta */}
          <div className="flex flex-col gap-2">
            <div className="relative w-[17%] aspect-square min-w-[52px]">
              <div className="absolute inset-0 rounded-full blur-md opacity-60"
                style={{ background: rankColor }} />
              {fp?.discord_avatar ? (
                <img src={fp.discord_avatar}
                  className="relative rounded-full border-[2px] object-cover w-full h-full z-10"
                  style={{ borderColor: rankColor }} />
              ) : (
                <div className="relative rounded-full border-[2px] bg-white/10 flex items-center justify-center font-bold text-white z-10 w-full h-full"
                  style={{ borderColor: rankColor, fontSize: "clamp(14px,3vw,22px)" }}>
                  {fp?.username?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="font-bold text-white truncate leading-tight"
                style={{ fontSize: "clamp(11px,1.8vw,18px)" }}>
                {fp?.username}
              </div>
              <div className="text-white/35 truncate" style={{ fontSize: "clamp(8px,1.1vw,12px)" }}>
                {fp?.guilds?.name ?? "No Guild"}
              </div>
            </div>

            {elMeta && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border w-fit"
                style={{ borderColor: `${elMeta.color}45`, background: `${elMeta.color}12`, color: elMeta.color,
                  fontSize: "clamp(7px,1vw,10px)" }}>
                {ELEMENT_ICONS[elId]}
                <span className="font-mono font-bold">{elMeta.label.toUpperCase()}</span>
              </div>
            )}
          </div>

          {/* Power */}
          <div>
            <div className="text-white/22 font-mono uppercase tracking-widest mb-0.5"
              style={{ fontSize: "clamp(6px,0.9vw,9px)" }}>Power</div>
            <div className="font-mono font-bold" style={{ color: rankColor, fontSize: "clamp(10px,1.6vw,16px)" }}>
              {score.toLocaleString()}
            </div>
          </div>
        </div>

        {/* ── CENTER ── */}
        <div className="flex-1 flex flex-col items-center justify-center gap-2 pb-8">
          {/* Rank badge */}
          <div className="px-3 py-0.5 rounded-full border font-mono font-black uppercase tracking-widest"
            style={{ color: rankColor, borderColor: `rgba(${rc.r},${rc.g},${rc.b},0.4)`,
              background: `rgba(${rc.r},${rc.g},${rc.b},0.1)`, fontSize: "clamp(7px,1vw,10px)" }}>
            {rank} Rank
          </div>
          <motion.img src={buildingImg} alt=""
            className="object-contain"
            style={{ width: "clamp(80px,16%,160px)", height: "clamp(80px,16%,160px)",
              filter: `drop-shadow(0 0 20px ${rankColor}55)` }}
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Progress */}
          <div style={{ width: "clamp(60px,12%,110px)" }}>
            <div className="h-[3px] bg-white/10 rounded-full overflow-hidden">
              <motion.div className="h-full rounded-full"
                style={{ background: rankColor }}
                initial={{ width: 0 }}
                animate={{ width: `${getRankFromScore(score).progress * 100}%` }}
                transition={{ duration: 1 }} />
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL — stats ── */}
        <div className="w-[26%] flex flex-col justify-center gap-1.5 px-3 border-l py-4"
          style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          {[
            { label: "ATK", value: stats.attack,  color: "#ef4444", max: 110 },
            { label: "DEF", value: stats.defense, color: "#3b82f6", max: 90 },
            { label: "MAG", value: stats.magic,   color: "#a855f7", max: 120 },
            { label: "HP",  value: stats.hp,      color: "#22c55e", max: 650 },
            { label: "SPD", value: stats.speed,   color: "#06b6d4", max: 35 },
          ].map(({ label, value, color, max }) => (
            <div key={label} className="space-y-0.5">
              <div className="flex justify-between items-center">
                <span className="font-mono text-white/28 uppercase" style={{ fontSize: "clamp(6px,0.85vw,9px)" }}>{label}</span>
                <span className="font-mono font-bold text-white" style={{ fontSize: "clamp(8px,1.05vw,11px)" }}>{value}</span>
              </div>
              <div className="bg-white/8 rounded-full overflow-hidden" style={{ height: 3 }}>
                <motion.div className="h-full rounded-full"
                  style={{ background: color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (value / max) * 100)}%` }}
                  transition={{ duration: 0.8 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom strip */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center border-t py-1.5"
        style={{ borderColor: "rgba(255,255,255,0.07)",
          background: `linear-gradient(90deg,rgba(${rc.r},${rc.g},${rc.b},0.09),transparent,rgba(${rc.r},${rc.g},${rc.b},0.09))` }}>
        <span className="font-mono text-white/22 tracking-[0.18em] uppercase"
          style={{ fontSize: "clamp(5px,0.8vw,9px)" }}>
          EARNITY GUILD WARS • {rank} RANK • {(elMeta?.label ?? "").toUpperCase()} ELEMENT
        </span>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   Page
──────────────────────────────────────────── */
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
      const { data } = await supabase.from("inventory").select("*").eq("user_id", session!.user.id);
      return data ?? [];
    },
    enabled: !!session?.user?.id,
  });

  const { data: elementals } = useQuery({
    queryKey: ["user-elementals", session?.user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_elementals").select("element_type").eq("user_id", session!.user.id);
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

  const fp        = fullProfile as any;
  const score     = fp?.stronghold_score ?? fp?.ranking_score ?? fp?.contribution_score ?? 0;
  const { rank }  = getRankFromScore(score);
  const stats     = getGuildStats(score);
  const element   = fp?.element ?? fp?.guilds?.element;
  const wallet    = fp?.wallet_address;
  const shortWallet = wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : null;
  const activeCodes = referralCodes?.filter((c: any) => !c.used_by) ?? [];
  const usedCodes   = referralCodes?.filter((c: any) => c.used_by) ?? [];
  const shardCount  = (inventory?.filter((i: any) => i.item_type === "shard") ?? [])
    .reduce((a: number, s: any) => a + (s.quantity || 0), 0);
  const rankColor = RANK_COLORS[rank];
  const rc = hexToRgb(rankColor);

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const url = await renderGuildCard({
        username: fp?.username ?? "Warrior",
        guildName: fp?.guilds?.name ?? "",
        element: element ?? "",
        rank, score, stats,
        avatarUrl: fp?.discord_avatar ?? null,
        buildingUrl: getBuildingImage(rank),
        userId: session.user.id,
        rankColor, rankGlow: RANK_GLOW[rank],
      });
      const a = document.createElement("a");
      a.download = `${fp?.username ?? "earnity"}-guild-passport.png`;
      a.href = url;
      a.click();
    } catch (e) {
      console.error("Card render error:", e);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-black text-white">
      <div className="absolute inset-0 bg-cover bg-center opacity-25"
        style={{ backgroundImage: `url(${ASSETS.background})` }} />
      <div className="absolute inset-0 bg-black/82" />

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

      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-5">

        {/* Section divider */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-white/8" />
          <span className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em]">Guild Passport</span>
          <div className="h-px flex-1 bg-white/8" />
        </div>

        {/* ── Card preview ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <ProfileCardPreview fp={fp} rank={rank} stats={stats} score={score} />
        </motion.div>

        {/* ── Download button ── */}
        <motion.button
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }}
          onClick={handleDownload}
          disabled={downloading}
          className="w-full py-3.5 rounded-xl border flex items-center justify-center gap-2.5 text-sm font-bold font-mono tracking-widest transition-all disabled:opacity-60 uppercase"
          style={{ borderColor: `rgba(${rc.r},${rc.g},${rc.b},0.38)`,
            background: `rgba(${rc.r},${rc.g},${rc.b},0.08)`, color: rankColor }}
        >
          {downloading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Rendering…</>
            : <><Download className="w-4 h-4" /> Download Guild Passport</>
          }
        </motion.button>

        {/* ── Elemental circle ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-6"
        >
          <div className="text-[10px] uppercase tracking-wider text-white/30 mb-5 text-center font-mono">
            Elemental Affinity
          </div>
          <ElementalCircle
            ownedElements={elementals ?? ([element].filter(Boolean) as ElementId[])}
            currentElement={element}
          />
          <p className="text-[10px] text-white/15 text-center mt-6 font-mono">
            Owned elements glow • Collect all 7 to unlock transcendence
          </p>
        </motion.div>

        {/* ── Inventory ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-5"
        >
          <div className="text-[10px] uppercase tracking-wider text-white/30 mb-4 font-mono">Inventory</div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { icon: Sparkles, label: "Shards",    color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/20",   val: shardCount },
              { icon: Star,     label: "Elementals", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20", val: elementals?.length ?? 0 },
            ].map(({ icon: Icon, label, color, bg, border, val }) => (
              <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                <div className={`w-10 h-10 rounded-lg ${bg} border ${border} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white font-mono">{val}</div>
                  <div className="text-[10px] text-white/30 uppercase">{label}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {[
              { icon: Shield, label: "Shields",    color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/20",   type: "shields" },
              { icon: Swords, label: "Rugs",       color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/20",    type: "rugs" },
              { icon: Zap,    label: "Drainers",   color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", type: "drainers" },
              { icon: Heart,  label: "HP Potions", color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/20",  type: "hp_potions" },
            ].map(({ icon: Icon, label, color, bg, border, type }) => {
              const count = inventory?.find((i: any) => i.item_type === type)?.quantity ?? 0;
              return (
                <div key={type} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.03] border border-white/5">
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
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-5"
        >
          <div className="text-[10px] uppercase tracking-wider text-white/30 mb-3 font-mono">Bound Wallet</div>
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

        {/* ── Referral codes ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-white/30" />
              <span className="text-[10px] uppercase tracking-wider text-white/30 font-mono">Referral Codes</span>
            </div>
            <span className="text-[10px] text-white/20">+50 pts per referral</span>
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
            <p className="text-sm text-white/30 text-center py-4">Generating your referral codes…</p>
          )}
          {usedCodes.length > 0 && (
            <p className="text-[10px] text-white/15 text-center mt-3 font-mono">
              {usedCodes.length} code{usedCodes.length !== 1 ? "s" : ""} already redeemed
            </p>
          )}
        </motion.div>

        <div className="h-8" />
      </div>
    </div>
  );
}
