import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { useState, useRef, forwardRef } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  Copy, Check, ExternalLink, Users,
  Star, Shield, Swords, Zap, Heart,
  Wind, Flame, Droplets, Mountain, TreePine, CloudLightning,
  Sparkles, Download, Loader2, Crown, ArrowLeft,
} from "lucide-react";
import {
  getRankFromScore,
  getBuildingImage,
  RANK_COLORS,
  RANK_GLOW,
  type GuildRank,
} from "@/lib/guild-leveling";
import { ELEMENT_META } from "@/lib/assets";
import { getShardItemType } from "@/lib/game-config";

const ELEMENTS = ["fire", "water", "nature", "rock", "lightning", "wind"] as const;

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

/* ── Canvas helpers ── */
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
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src     = src;
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

/* ────────────────────────────────────────────────────────────────
   Canvas card renderer — matches the DOM preview layout exactly
   1080 × 1080 px
──────────────────────────────────────────────────────────────── */
async function renderGuildCard(opts: {
  username: string; guildName: string; element: string;
  rank: GuildRank; score: number;
  avatarUrl: string | null;
  userId: string; rankColor: string; rankGlow: string;
  isGuildMaster: boolean;
}): Promise<string> {
  const {
    username, guildName, element, rank, score,
    avatarUrl, userId, rankColor, isGuildMaster,
  } = opts;

  const S   = 1080;
  const PAD = 54;
  const canvas = document.createElement("canvas");
  canvas.width  = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d")!;

  const rc     = hexToRgb(rankColor);
  const elMeta = ELEMENT_META[element];
  const elColor = (elMeta as any)?.color ?? rankColor;
  const ec      = hexToRgb(elColor);
  const rgba    = (c: { r: number; g: number; b: number }, a: number) =>
    `rgba(${c.r},${c.g},${c.b},${a})`;

  /* ── Background ── */
  rr(ctx, 0, 0, S, S, 32);
  ctx.fillStyle = "#08080a";
  ctx.fill();
  ctx.save();
  ctx.clip();

  // element tint top-right
  const g1 = ctx.createRadialGradient(S, 0, 0, S, 0, 620);
  g1.addColorStop(0, rgba(ec, 0.20));
  g1.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, S, S);

  // rank tint bottom-left
  const g2 = ctx.createRadialGradient(0, S, 0, 0, S, 520);
  g2.addColorStop(0, rgba(rc, 0.14));
  g2.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, S, S);

  /* ── Outer border ── */
  rr(ctx, 4, 4, S - 8, S - 8, 30);
  ctx.strokeStyle = rgba(ec, 0.55);
  ctx.lineWidth   = 2;
  ctx.stroke();

  /* ── Inner border ── */
  rr(ctx, 10, 10, S - 20, S - 20, 26);
  ctx.strokeStyle = rgba(ec, 0.12);
  ctx.lineWidth   = 1;
  ctx.stroke();

  /* ── Corner brackets ── */
  const bSize = 36, bOff = 20;
  [
    [bOff,     bOff,      1,  1],
    [S - bOff, bOff,     -1,  1],
    [bOff,     S - bOff,  1, -1],
    [S - bOff, S - bOff, -1, -1],
  ].forEach(([cx, cy, sx, sy]) => {
    ctx.beginPath();
    ctx.moveTo(cx + sx * bSize, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy + sy * bSize);
    ctx.strokeStyle = elColor;
    ctx.lineWidth   = 2.5;
    ctx.stroke();
  });

  /* ── TOP BAR ── */
  // Logo
  try {
    const logo = await loadImage(ASSETS.logo, true);
    ctx.save();
    rr(ctx, PAD, PAD, 52, 52, 10);
    ctx.clip();
    ctx.drawImage(logo, PAD, PAD, 52, 52);
    ctx.restore();
    ctx.strokeStyle = rgba(ec, 0.4);
    ctx.lineWidth   = 1.5;
    rr(ctx, PAD, PAD, 52, 52, 10);
    ctx.stroke();
  } catch {
    ctx.fillStyle = rgba(ec, 0.2);
    rr(ctx, PAD, PAD, 52, 52, 10);
    ctx.fill();
  }

  ctx.fillStyle  = "rgba(255,255,255,0.5)";
  ctx.font       = "bold 13px 'Courier New', monospace";
  ctx.textAlign  = "left";
  ctx.fillText("EARNITY", PAD, PAD + 76);

  ctx.fillStyle = rgba({ r: 255, g: 255, b: 255 }, 0.2);
  ctx.font      = "11px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText("GUILD PASSPORT", S / 2, PAD + 30);

  // Rank badge top-right
  const badgeLabel = `${rank} RANK`;
  ctx.font = "bold 12px 'Courier New', monospace";
  const bW = ctx.measureText(badgeLabel).width + 28;
  const bX = S - PAD - bW, bY = PAD + 6;
  rr(ctx, bX, bY, bW, 26, 13);
  ctx.fillStyle   = rgba(rc, 0.18);
  ctx.fill();
  ctx.strokeStyle = rgba(rc, 0.6);
  ctx.lineWidth   = 1.5;
  ctx.stroke();
  ctx.fillStyle = rankColor;
  ctx.textAlign = "center";
  ctx.fillText(badgeLabel, bX + bW / 2, bY + 18);

  /* ── DIVIDER ── */
  const divY = PAD + 90;
  ctx.beginPath();
  ctx.moveTo(PAD, divY);
  ctx.lineTo(S - PAD, divY);
  const divG = ctx.createLinearGradient(PAD, 0, S - PAD, 0);
  divG.addColorStop(0,   "rgba(255,255,255,0)");
  divG.addColorStop(0.3, rgba(ec, 0.4));
  divG.addColorStop(0.7, rgba(ec, 0.4));
  divG.addColorStop(1,   "rgba(255,255,255,0)");
  ctx.strokeStyle = divG;
  ctx.lineWidth   = 1;
  ctx.stroke();

  /* ── MAIN CONTENT ── */
  const contentY = divY + 40;            // top of main body
  const bottomStripY = S - 70;          // where footer starts
  const contentH = bottomStripY - contentY - 20; // available height

  // LEFT COLUMN
  const leftW  = 280;
  const AX     = PAD;
  const AVS    = Math.min(leftW, 240);   // avatar size (square)
  const AY     = contentY;

  // Avatar
  ctx.save();
  rr(ctx, AX, AY, AVS, AVS, 16);
  ctx.clip();
  let drewAvatar = false;
  if (avatarUrl) {
    for (const cors of [true, false]) {
      try {
        const av = await loadImage(avatarUrl, cors);
        ctx.drawImage(av, AX, AY, AVS, AVS);
        drewAvatar = true;
        break;
      } catch {}
    }
  }
  if (!drewAvatar) {
    const fb = ctx.createLinearGradient(AX, AY, AX + AVS, AY + AVS);
    fb.addColorStop(0, rgba(ec, 0.3));
    fb.addColorStop(1, rgba(ec, 0.08));
    ctx.fillStyle = fb;
    ctx.fillRect(AX, AY, AVS, AVS);
    ctx.fillStyle      = "rgba(255,255,255,0.7)";
    ctx.font           = `bold 88px Georgia, serif`;
    ctx.textAlign      = "center";
    ctx.textBaseline   = "middle";
    ctx.fillText(username.charAt(0).toUpperCase(), AX + AVS / 2, AY + AVS / 2 + 4);
    ctx.textBaseline   = "alphabetic";
  }
  ctx.restore();
  rr(ctx, AX, AY, AVS, AVS, 16);
  ctx.strokeStyle = rgba(ec, 0.6);
  ctx.lineWidth   = 2;
  ctx.stroke();

  // Username
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle    = "#ffffff";
  ctx.font         = "bold 40px Georgia, serif";
  ctx.textAlign    = "left";
  let uname = username;
  while (ctx.measureText(uname).width > leftW + 40 && uname.length > 3)
    uname = uname.slice(0, -1);
  if (uname !== username) uname += "…";
  ctx.fillText(uname, AX, AY + AVS + 50);

  // Guild under name
  ctx.fillStyle = rgba({ r: 255, g: 255, b: 255 }, 0.38);
  ctx.font      = "16px 'Courier New', monospace";
  let gn = guildName || "No Guild";
  while (ctx.measureText(gn).width > leftW + 40 && gn.length > 3)
    gn = gn.slice(0, -1);
  if (gn !== (guildName || "No Guild")) gn += "…";
  ctx.fillText(gn, AX, AY + AVS + 76);

  // Element chip
  if (elMeta) {
    const chipLabel = ((elMeta as any).label ?? element).toUpperCase();
    ctx.font = "bold 11px 'Courier New', monospace";
    const chipW  = ctx.measureText(chipLabel).width + 28;
    const chipY2 = AY + AVS + 96;
    rr(ctx, AX, chipY2, chipW, 24, 12);
    ctx.fillStyle   = rgba(ec, 0.16);
    ctx.fill();
    ctx.strokeStyle = rgba(ec, 0.5);
    ctx.lineWidth   = 1;
    ctx.stroke();
    ctx.fillStyle = elColor;
    ctx.textAlign = "center";
    ctx.fillText(chipLabel, AX + chipW / 2, chipY2 + 16);
  }

  /* ── RIGHT COLUMN ── */
  const rightX = PAD + leftW + 52;
  const rightW = S - rightX - PAD;

  // 3 info boxes
  const boxW = (rightW - 24) / 3;
  const boxes = [
    { label: "GUILD",  value: guildName || "None" },
    { label: "RANK",   value: rank },
    { label: "STATUS", value: isGuildMaster ? "Master" : "Member" },
  ];
  boxes.forEach((box, i) => {
    const bx = rightX + i * (boxW + 12), by = contentY;
    rr(ctx, bx, by, boxW, 90, 10);
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.fill();
    ctx.strokeStyle = rgba(ec, 0.2);
    ctx.lineWidth   = 1;
    ctx.stroke();

    ctx.fillStyle = rgba({ r: 255, g: 255, b: 255 }, 0.25);
    ctx.font      = "10px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillText(box.label, bx + boxW / 2, by + 22);

    ctx.font      = "bold 17px 'Courier New', monospace";
    ctx.fillStyle = i === 2 && isGuildMaster ? rankColor : "#ffffff";
    let val = box.value;
    while (ctx.measureText(val).width > boxW - 16 && val.length > 3)
      val = val.slice(0, -1);
    if (val !== box.value) val += "…";
    ctx.fillText(val, bx + boxW / 2, by + 60);
  });

  // Building image — center of remaining right space
  const bldY    = contentY + 110;
  const bldMaxH = bottomStripY - bldY - 120; // leave room for power+progress
  const bldSize = Math.min(220, bldMaxH);
  const bldX    = rightX + (rightW - bldSize) / 2;
  try {
    const bldImg = await loadImage(getBuildingImage(rank), true);
    ctx.drawImage(bldImg, bldX, bldY, bldSize, bldSize);
  } catch {
    try {
      const bldImg = await loadImage(getBuildingImage(rank), false);
      ctx.drawImage(bldImg, bldX, bldY, bldSize, bldSize);
    } catch {}
  }

  // POWER
  const powerY = bldY + bldSize + 20;
  ctx.fillStyle = rgba({ r: 255, g: 255, b: 255 }, 0.25);
  ctx.font      = "11px 'Courier New', monospace";
  ctx.textAlign = "left";
  ctx.fillText("POWER", rightX, powerY);
  ctx.fillStyle = rankColor;
  ctx.font      = "bold 30px 'Courier New', monospace";
  ctx.fillText(score.toLocaleString(), rightX, powerY + 34);

  // Progress bar
  const { progress } = getRankFromScore(score);
  const progY = powerY + 52;
  ctx.fillStyle = rgba({ r: 255, g: 255, b: 255 }, 0.12);
  ctx.font      = "9px 'Courier New', monospace";
  ctx.textAlign = "left";
  ctx.fillText("RANK PROGRESS", rightX, progY);
  ctx.textAlign = "right";
  ctx.fillText(`${Math.floor(progress * 100)}%`, rightX + rightW, progY);

  // bar track
  rr(ctx, rightX, progY + 8, rightW, 6, 3);
  ctx.fillStyle = rgba({ r: 255, g: 255, b: 255 }, 0.07);
  ctx.fill();
  // bar fill
  if (progress > 0) {
    rr(ctx, rightX, progY + 8, rightW * progress, 6, 3);
    const pf = ctx.createLinearGradient(rightX, 0, rightX + rightW, 0);
    pf.addColorStop(0, rgba(rc, 0.6));
    pf.addColorStop(1, rankColor);
    ctx.fillStyle = pf;
    ctx.fill();
  }

  /* ── FOOTER STRIP ── */
  ctx.beginPath();
  ctx.moveTo(PAD, bottomStripY);
  ctx.lineTo(S - PAD, bottomStripY);
  ctx.strokeStyle = rgba(ec, 0.2);
  ctx.lineWidth   = 1;
  ctx.stroke();

  ctx.fillStyle = rgba({ r: 255, g: 255, b: 255 }, 0.18);
  ctx.font      = "10px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText(
    `EARNITY GUILD WARS  •  ${rank} RANK  •  ${
      ((elMeta as any)?.label ?? element ?? "").toUpperCase()
    } ELEMENT  •  #GW-${userId.slice(0, 8).toUpperCase()}`,
    S / 2,
    bottomStripY + 28,
  );

  ctx.restore();
  return canvas.toDataURL("image/png");
}

/* ── CopyBtn ── */
function CopyBtn({ text, dark = false }: { text: string; dark?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className={`p-1.5 rounded-lg transition-colors ${
        dark
          ? "hover:bg-white/10 text-white/40 hover:text-white"
          : "hover:bg-black/10 text-black/30 hover:text-black"
      }`}
    >
      {copied
        ? <Check className="w-3.5 h-3.5 text-green-400" />
        : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

/* ── Elemental Circle ── */
function ElementalCircle({
  ownedElements,
  currentElement,
}: {
  ownedElements: string[];
  currentElement?: string;
}) {
  const radius = 110, center = 130, total = ELEMENTS.length;
  return (
    <div className="relative w-[260px] h-[260px] mx-auto">
      <div className="absolute inset-0 rounded-full border-2 border-white/10" />
      <div className="absolute inset-4 rounded-full border border-white/5" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 rounded-full border-2 border-white/20 bg-black/40 backdrop-blur-sm flex items-center justify-center">
          {currentElement && ELEMENT_META[currentElement] ? (
            <img
              src={ELEMENT_META[currentElement].img}
              className="w-10 h-10 object-contain"
              alt=""
            />
          ) : (
            <div className="w-3 h-3 rounded-full bg-white/20" />
          )}
        </div>
      </div>
      {ELEMENTS.map((elId, i) => {
        const meta    = ELEMENT_META[elId];
        if (!meta) return null;
        const angle   = (i / total) * Math.PI * 2 - Math.PI / 2;
        const x       = center + radius * Math.cos(angle);
        const y       = center + radius * Math.sin(angle);
        const isOwned = ownedElements.includes(elId);
        const elColor = (meta as any).color ?? "#ffffff";
        const elGlow  = (meta as any).glow  ?? elColor;
        return (
          <motion.div
            key={elId}
            className="absolute w-10 h-10 -ml-5 -mt-5 rounded-full border-2 flex items-center justify-center"
            style={{
              left: x, top: y,
              borderColor: isOwned ? elColor : "rgba(255,255,255,0.12)",
              background:  isOwned ? `${elColor}20` : "rgba(0,0,0,0.5)",
              boxShadow:   isOwned
                ? `0 0 20px ${elGlow}, inset 0 0 10px ${elGlow}`
                : "none",
              filter: isOwned ? "none" : "grayscale(100%) brightness(0.35)",
            }}
            animate={
              isOwned
                ? { boxShadow: [`0 0 15px ${elGlow}`, `0 0 30px ${elGlow}`, `0 0 15px ${elGlow}`] }
                : {}
            }
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div style={{ color: isOwned ? elColor : "rgba(255,255,255,0.18)" }}>
              {ELEMENT_ICONS[elId]}
            </div>
            <div
              className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-wider whitespace-nowrap"
              style={{ color: isOwned ? elColor : "rgba(255,255,255,0.18)" }}
            >
              {(meta as any).label ?? elId}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ── DOM Card Preview ── */
const ProfileCardPreview = forwardRef<
  HTMLDivElement,
  {
    username: string; guildName: string; element: string;
    rank: GuildRank; score: number; avatarUrl: string | null;
    isGuildMaster: boolean;
  }
>(({ username, guildName, element, rank, score, avatarUrl, isGuildMaster }, ref) => {
  const rankColor = RANK_COLORS[rank];
  const elMeta    = element ? ELEMENT_META[element] : null;
  const elColor   = (elMeta as any)?.color ?? rankColor;
  const { progress } = getRankFromScore(score);

  return (
    <div
      ref={ref}
      className="relative rounded-2xl border overflow-hidden w-full select-none"
      style={{ aspectRatio: "1 / 1", borderColor: `${elColor}55`, background: "#08080a" }}
    >
      {/* Background tints */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id={`tint-el-${rank}`} cx="100%" cy="0%" r="60%">
            <stop offset="0%" stopColor={elColor} stopOpacity="0.22" />
            <stop offset="100%" stopColor={elColor} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`tint-rank-${rank}`} cx="0%" cy="100%" r="55%">
            <stop offset="0%" stopColor={rankColor} stopOpacity="0.16" />
            <stop offset="100%" stopColor={rankColor} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill={`url(#tint-el-${rank})`} />
        <rect width="100%" height="100%" fill={`url(#tint-rank-${rank})`} />
      </svg>

      {/* Corner brackets */}
      {[
        "top-3 left-3 border-t-2 border-l-2 rounded-tl",
        "top-3 right-3 border-t-2 border-r-2 rounded-tr",
        "bottom-3 left-3 border-b-2 border-l-2 rounded-bl",
        "bottom-3 right-3 border-b-2 border-r-2 rounded-br",
      ].map((cls, i) => (
        <div
          key={i}
          className={`absolute w-4 h-4 ${cls}`}
          style={{ borderColor: `${elColor}80` }}
        />
      ))}

      <div className="relative h-full flex flex-col p-[5%] gap-[3%]">
        {/* TOP BAR */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg overflow-hidden border"
              style={{ borderColor: `${elColor}40` }}
            >
              <img src={ASSETS.logo} className="w-full h-full object-cover" alt="Earnity" />
            </div>
            <span
              className="font-mono text-white/50 uppercase tracking-widest"
              style={{ fontSize: "clamp(7px, 1.2vw, 11px)" }}
            >
              EARNITY
            </span>
          </div>
          <div
            className="px-2.5 py-0.5 rounded-full border font-mono font-black uppercase tracking-wider"
            style={{
              color:       rankColor,
              borderColor: `${rankColor}50`,
              background:  `${rankColor}12`,
              fontSize:    "clamp(7px, 1.1vw, 10px)",
            }}
          >
            {rank} RANK
          </div>
        </div>

        {/* MAIN BODY */}
        <div className="flex-1 flex gap-[4%] min-h-0">
          {/* LEFT */}
          <div className="flex flex-col gap-[5%] w-[40%]">
            {/* Avatar */}
            <div
              className="relative rounded-xl overflow-hidden border"
              style={{ aspectRatio: "1/1", width: "100%", borderColor: `${elColor}50` }}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  className="w-full h-full object-cover"
                  alt={username}
                  crossOrigin="anonymous"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ background: `${elColor}18` }}
                >
                  <span
                    className="font-bold text-white"
                    style={{ fontSize: "clamp(24px, 8vw, 52px)" }}
                  >
                    {username?.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Name */}
            <div className="min-w-0">
              <div
                className="font-black text-white truncate leading-tight"
                style={{ fontSize: "clamp(11px, 2.2vw, 19px)" }}
              >
                {username}
              </div>
              <div
                className="text-white/35 truncate mt-0.5"
                style={{ fontSize: "clamp(8px, 1.3vw, 12px)" }}
              >
                {guildName || "No Guild"}
              </div>
            </div>

            {/* Element chip */}
            {elMeta && (
              <div
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border w-fit"
                style={{
                  borderColor: `${elColor}45`,
                  background:  `${elColor}12`,
                  color:       elColor,
                  fontSize:    "clamp(7px, 1vw, 10px)",
                }}
              >
                <img
                  src={(elMeta as any).img}
                  alt={element}
                  className="w-3.5 h-3.5 object-contain"
                />
                <span className="font-mono font-bold">
                  {((elMeta as any).label ?? element).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div className="flex-1 flex flex-col gap-[4%] min-w-0">
            {/* 3 info boxes */}
            <div className="grid grid-cols-3 gap-[4%]">
              {[
                { label: "GUILD",  value: guildName || "None" },
                { label: "RANK",   value: rank },
                {
                  label: "STATUS",
                  value: isGuildMaster ? "Master" : "Member",
                  valueColor: isGuildMaster ? rankColor : undefined,
                },
              ].map(({ label, value, valueColor }) => (
                <div
                  key={label}
                  className="flex flex-col items-center justify-center rounded-lg border py-[8%]"
                  style={{
                    borderColor: `${elColor}22`,
                    background:  "rgba(255,255,255,0.025)",
                  }}
                >
                  <span
                    className="font-mono text-white/30 uppercase tracking-wider truncate w-full text-center"
                    style={{ fontSize: "clamp(6px, 0.9vw, 8px)" }}
                  >
                    {label}
                  </span>
                  <span
                    className="font-black text-white truncate w-full text-center mt-1"
                    style={{
                      fontSize: "clamp(8px, 1.4vw, 13px)",
                      color: valueColor ?? "#fff",
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {/* Stronghold building — static img, no motion so html2canvas works */}
            <div className="flex-1 flex items-center justify-center min-h-0">
              <img
                src={getBuildingImage(rank)}
                alt="stronghold"
                className="object-contain drop-shadow-xl"
                style={{ maxHeight: "100%", maxWidth: "100%" }}
                crossOrigin="anonymous"
              />
            </div>

            {/* Power */}
            <div>
              <span
                className="font-mono text-white/25 uppercase tracking-widest"
                style={{ fontSize: "clamp(6px, 0.9vw, 9px)" }}
              >
                POWER
              </span>
              <div
                className="font-black font-mono"
                style={{ color: rankColor, fontSize: "clamp(12px, 2vw, 18px)" }}
              >
                {score.toLocaleString()}
              </div>
            </div>

            {/* Progress bar — static width for html2canvas */}
            <div>
              <div className="flex justify-between mb-1">
                <span
                  className="font-mono text-white/25 uppercase tracking-wider"
                  style={{ fontSize: "clamp(5px, 0.8vw, 8px)" }}
                >
                  RANK PROGRESS
                </span>
                <span
                  className="font-mono text-white/25"
                  style={{ fontSize: "clamp(5px, 0.8vw, 8px)" }}
                >
                  {Math.floor(progress * 100)}%
                </span>
              </div>
              <div
                className="w-full rounded-full overflow-hidden"
                style={{
                  height: "clamp(3px, 0.5vw, 5px)",
                  background: "rgba(255,255,255,0.07)",
                }}
              >
                {/* Static div instead of motion.div so html2canvas captures it */}
                <div
                  className="h-full rounded-full"
                  style={{
                    width:      `${progress * 100}%`,
                    background: `linear-gradient(90deg, ${rankColor}80, ${rankColor})`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="border-t pt-[2%]" style={{ borderColor: `${elColor}20` }}>
          <span
            className="font-mono text-white/18 uppercase tracking-[0.15em]"
            style={{ fontSize: "clamp(5px, 0.75vw, 8px)" }}
          >
            EARNITY GUILD WARS  •  {rank} RANK  •{" "}
            {((elMeta as any)?.label ?? element ?? "").toUpperCase()} ELEMENT
          </span>
        </div>
      </div>
    </div>
  );
});
ProfileCardPreview.displayName = "ProfileCardPreview";

/* ── Bind Wallet Button ── */
function BindWalletButton({ userId }: { userId: string }) {
  const [walletInput, setWalletInput] = useState("");
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [success,     setSuccess]     = useState(false);
  const [showInput,   setShowInput]   = useState(false);

  const handleBind = async () => {
    const trimmed = walletInput.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
      setError("Please enter a valid EVM wallet address (0x…)");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ wallet_address: trimmed })
        .eq("id", userId);
      if (dbErr) throw dbErr;
      setSuccess(true);
      setTimeout(() => window.location.reload(), 1200);
    } catch (e: any) {
      setError(e.message ?? "Failed to bind wallet.");
    } finally {
      setSaving(false);
    }
  };

  if (!showInput) {
    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setShowInput(true)}
        className="w-full py-2.5 rounded-xl border border-dashed border-white/20 text-sm font-mono text-white/50 hover:text-white hover:border-white/40 transition-all flex items-center justify-center gap-2"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        Bind a Wallet
      </motion.button>
    );
  }

  return (
    <div className="w-full space-y-2">
      <input
        type="text"
        value={walletInput}
        onChange={(e) => { setWalletInput(e.target.value); setError(null); }}
        placeholder="0x…"
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder-white/20 outline-none focus:border-white/30 transition-colors"
      />
      {error   && <p className="text-xs text-red-400 font-mono">{error}</p>}
      {success && <p className="text-xs text-green-400 font-mono">Wallet bound! Refreshing…</p>}
      <div className="flex gap-2">
        <button
          onClick={() => { setShowInput(false); setWalletInput(""); setError(null); }}
          className="flex-1 py-2 rounded-xl border border-white/10 text-sm text-white/40 hover:text-white hover:border-white/20 transition-all font-mono"
        >
          Cancel
        </button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleBind}
          disabled={saving || success}
          className="flex-1 py-2 rounded-xl border border-white/20 bg-white/5 text-sm text-white font-mono font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {saving
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Check className="w-3.5 h-3.5" />}
          {saving ? "Saving…" : "Confirm"}
        </motion.button>
      </div>
    </div>
  );
}
