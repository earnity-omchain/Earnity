import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  Copy, Check, ExternalLink, Users,
  Star, Shield, Swords, Zap, Heart,
  Wind, Flame, Droplets, Mountain, TreePine, CloudLightning,
  Sparkles, Download, Loader2, Crown, User,
} from "lucide-react";
import {
  getRankFromScore,
  getBuildingImage,
  getGuildStats,
  RANK_COLORS,
  RANK_GLOW,
  type GuildRank,
} from "@/lib/guild-leveling";
import { ELEMENT_META } from "@/lib/assets";

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
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* ── Canvas card renderer (1080×1080) ── */
async function renderGuildCard(opts: {
  username: string; guildName: string; element: string;
  rank: GuildRank; score: number;
  avatarUrl: string | null;
  userId: string; rankColor: string; rankGlow: string;
  isGuildMaster: boolean;
}): Promise<string> {
  const { username, guildName, element, rank, score,
          avatarUrl, userId, rankColor, isGuildMaster } = opts;

  const S = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = S; canvas.height = S;
  const ctx = canvas.getContext("2d")!;

  const rc = hexToRgb(rankColor);
  const elMeta = ELEMENT_META[element];
  const elColor = (elMeta as any)?.color ?? rankColor;
  const ec = hexToRgb(elColor);
  const rgba = (c: {r:number;g:number;b:number}, a: number) => `rgba(${c.r},${c.g},${c.b},${a})`;

  // ── Background
  rr(ctx, 0, 0, S, S, 32); ctx.fillStyle = "#08080a"; ctx.fill();
  ctx.save(); ctx.clip();

  // Element tint — top right
  const g1 = ctx.createRadialGradient(S, 0, 0, S, 0, 600);
  g1.addColorStop(0, rgba(ec, 0.18)); g1.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g1; ctx.fillRect(0, 0, S, S);

  // Rank tint — bottom left
  const g2 = ctx.createRadialGradient(0, S, 0, 0, S, 500);
  g2.addColorStop(0, rgba(rc, 0.14)); g2.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g2; ctx.fillRect(0, 0, S, S);

  // Subtle grain
  const grainC = document.createElement("canvas");
  grainC.width = S; grainC.height = S;
  const gc = grainC.getContext("2d")!;
  const gid = gc.createImageData(S, S);
  for (let i = 0; i < gid.data.length; i += 4) {
    const v = Math.random() * 255;
    gid.data[i] = gid.data[i+1] = gid.data[i+2] = v; gid.data[i+3] = 5;
  }
  gc.putImageData(gid, 0, 0);
  ctx.drawImage(grainC, 0, 0);

  // ── Outer border (element color)
  rr(ctx, 4, 4, S-8, S-8, 30);
  ctx.strokeStyle = rgba(ec, 0.55); ctx.lineWidth = 2; ctx.stroke();

  // ── Inner border
  rr(ctx, 10, 10, S-20, S-20, 26);
  ctx.strokeStyle = rgba(ec, 0.12); ctx.lineWidth = 1; ctx.stroke();

  // ── Corner brackets
  const bSize = 36, bOff = 20;
  [[bOff, bOff, 1, 1], [S-bOff, bOff, -1, 1], [bOff, S-bOff, 1, -1], [S-bOff, S-bOff, -1, -1]].forEach(([cx, cy, sx, sy]) => {
    ctx.beginPath();
    ctx.moveTo(cx + sx*bSize, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + sy*bSize);
    ctx.strokeStyle = elColor; ctx.lineWidth = 2.5; ctx.stroke();
  });

  // ── TOP BAR: Logo left, "GUILD PASSPORT" center, rank badge right
  const PAD = 52;

  // Logo
  try {
    const logo = await loadImage(ASSETS.logo, true);
    ctx.save(); rr(ctx, PAD, PAD, 52, 52, 10); ctx.clip();
    ctx.drawImage(logo, PAD, PAD, 52, 52); ctx.restore();
    ctx.strokeStyle = rgba(ec, 0.4); ctx.lineWidth = 1.5;
    rr(ctx, PAD, PAD, 52, 52, 10); ctx.stroke();
  } catch {
    ctx.fillStyle = rgba(ec, 0.2); rr(ctx, PAD, PAD, 52, 52, 10); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "bold 18px monospace"; ctx.textAlign = "center";
    ctx.fillText("E", PAD+26, PAD+34);
  }

  // "EARNITY" under logo
  ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "bold 13px 'Courier New', monospace";
  ctx.textAlign = "left"; ctx.fillText("EARNITY", PAD, PAD + 76);

  // "GUILD PASSPORT" center
  ctx.fillStyle = rgba({r:255,g:255,b:255}, 0.2); ctx.font = "11px 'Courier New', monospace";
  ctx.textAlign = "center"; ctx.fillText("GUILD PASSPORT", S/2, PAD + 30);

  // Rank badge top right
  const badgeLabel = `${rank} RANK`;
  ctx.font = "bold 12px 'Courier New', monospace"; ctx.textAlign = "center";
  const bW = ctx.measureText(badgeLabel).width + 28;
  const bX = S - PAD - bW, bY = PAD + 6;
  rr(ctx, bX, bY, bW, 26, 13);
  ctx.fillStyle = rgba(rc, 0.18); ctx.fill();
  ctx.strokeStyle = rgba(rc, 0.6); ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = rankColor; ctx.fillText(badgeLabel, bX + bW/2, bY + 18);

  // ── DIVIDER LINE after top bar
  const divY = PAD + 88;
  ctx.beginPath(); ctx.moveTo(PAD, divY); ctx.lineTo(S-PAD, divY);
  const divG = ctx.createLinearGradient(PAD, 0, S-PAD, 0);
  divG.addColorStop(0, "rgba(255,255,255,0)");
  divG.addColorStop(0.3, rgba(ec, 0.4));
  divG.addColorStop(0.7, rgba(ec, 0.4));
  divG.addColorStop(1, "rgba(255,255,255,0)");
  ctx.strokeStyle = divG; ctx.lineWidth = 1; ctx.stroke();

  // ── LEFT SECTION: Avatar + name + guild
  const contentY = divY + 40;
  const AVS = 200; // avatar size (square)
  const AX = PAD, AY = contentY;

  // Avatar square with rounded corners
  ctx.save();
  rr(ctx, AX, AY, AVS, AVS, 16); ctx.clip();
  let drewAvatar = false;
  if (avatarUrl) {
    try {
      const av = await loadImage(avatarUrl, true);
      ctx.drawImage(av, AX, AY, AVS, AVS); drewAvatar = true;
    } catch {
      try {
        const av = await loadImage(avatarUrl, false);
        ctx.drawImage(av, AX, AY, AVS, AVS); drewAvatar = true;
      } catch {}
    }
  }
  if (!drewAvatar) {
    const fb = ctx.createLinearGradient(AX, AY, AX+AVS, AY+AVS);
    fb.addColorStop(0, rgba(ec, 0.3)); fb.addColorStop(1, rgba(ec, 0.08));
    ctx.fillStyle = fb; ctx.fillRect(AX, AY, AVS, AVS);
    ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.font = `bold 72px Georgia, serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(username.charAt(0).toUpperCase(), AX+AVS/2, AY+AVS/2+4);
    ctx.textBaseline = "alphabetic";
  }
  ctx.restore();

  // Avatar border
  rr(ctx, AX, AY, AVS, AVS, 16);
  ctx.strokeStyle = rgba(ec, 0.6); ctx.lineWidth = 2; ctx.stroke();

  // Username
  ctx.fillStyle = "#ffffff"; ctx.font = `bold 38px Georgia, serif`;
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  let uname = username;
  while (ctx.measureText(uname).width > AVS + 40 && uname.length > 3) uname = uname.slice(0,-1);
  if (uname !== username) uname += "…";
  ctx.fillText(uname, AX, AY + AVS + 44);

  // Guild name
  ctx.fillStyle = rgba({r:255,g:255,b:255}, 0.38); ctx.font = `16px 'Courier New', monospace`;
  let gn = guildName || "No Guild";
  while (ctx.measureText(gn).width > AVS + 40 && gn.length > 3) gn = gn.slice(0,-1);
  if (gn !== (guildName || "No Guild")) gn += "…";
  ctx.fillText(gn, AX, AY + AVS + 68);

  // Element chip
  if (elMeta) {
    const chipLabel = ((elMeta as any).label ?? element).toUpperCase();
    ctx.font = `bold 11px 'Courier New', monospace`;
    const chipW = ctx.measureText(chipLabel).width + 24;
    const chipY2 = AY + AVS + 86;
    rr(ctx, AX, chipY2, chipW, 22, 11);
    ctx.fillStyle = rgba(ec, 0.16); ctx.fill();
    ctx.strokeStyle = rgba(ec, 0.5); ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = elColor; ctx.textAlign = "center";
    ctx.fillText(chipLabel, AX + chipW/2, chipY2 + 15);
  }

  // ── CENTER/RIGHT SECTION: 3 stat boxes + power + progress
  const rightX = PAD + AVS + 52;
  const rightW = S - rightX - PAD;
  const boxY = contentY;

  // 3 info boxes: GUILD / RANK / STATUS
  const boxW = (rightW - 24) / 3;
  const boxes = [
    { label: "GUILD",  value: guildName || "None" },
    { label: "RANK",   value: rank },
    { label: "STATUS", value: isGuildMaster ? "Master" : "Member" },
  ];
  boxes.forEach((box, i) => {
    const bx = rightX + i*(boxW+12), by = boxY;
    rr(ctx, bx, by, boxW, 90, 10);
    ctx.fillStyle = "rgba(255,255,255,0.03)"; ctx.fill();
    ctx.strokeStyle = rgba(ec, 0.2); ctx.lineWidth = 1; ctx.stroke();

    ctx.fillStyle = rgba({r:255,g:255,b:255}, 0.25); ctx.font = `10px 'Courier New', monospace`;
    ctx.textAlign = "center"; ctx.fillText(box.label, bx+boxW/2, by+20);

    // value — truncate if needed
    ctx.font = `bold 17px 'Courier New', monospace`;
    ctx.fillStyle = i === 2 && isGuildMaster ? rankColor : "#ffffff";
    let val = box.value;
    while (ctx.measureText(val).width > boxW - 16 && val.length > 3) val = val.slice(0,-1);
    if (val !== box.value) val += "…";
    ctx.fillText(val, bx+boxW/2, by+58);
  });

  // Element image (large, center-right area)
  const elImgY = boxY + 110;
  const elImgSize = 180;
  const elImgX = rightX + (rightW - elImgSize) / 2;
  if (elMeta) {
    try {
      const elImg = await loadImage((elMeta as any).img, true);
      ctx.drawImage(elImg, elImgX, elImgY, elImgSize, elImgSize);
    } catch {}
  }

  // POWER label + value
  const powerY = elImgY + elImgSize + 28;
  ctx.fillStyle = rgba({r:255,g:255,b:255}, 0.25); ctx.font = `11px 'Courier New', monospace`;
  ctx.textAlign = "left"; ctx.fillText("POWER", rightX, powerY);
  ctx.fillStyle = rankColor; ctx.font = `bold 28px 'Courier New', monospace`;
  ctx.fillText(score.toLocaleString(), rightX, powerY + 32);

  // Progress bar — full right width
  const { progress } = getRankFromScore(score);
  const progY = powerY + 48;
  ctx.fillStyle = rgba({r:255,g:255,b:255}, 0.12); ctx.font = `9px 'Courier New', monospace`;
  ctx.textAlign = "left"; ctx.fillText("RANK PROGRESS", rightX, progY);
  ctx.textAlign = "right"; ctx.fillText(`${Math.floor(progress * 100)}%`, rightX + rightW, progY);

  rr(ctx, rightX, progY + 8, rightW, 6, 3);
  ctx.fillStyle = rgba({r:255,g:255,b:255}, 0.07); ctx.fill();
  if (progress > 0) {
    rr(ctx, rightX, progY + 8, rightW * progress, 6, 3);
    const pf = ctx.createLinearGradient(rightX, 0, rightX + rightW, 0);
    pf.addColorStop(0, rgba(rc, 0.6)); pf.addColorStop(1, rankColor);
    ctx.fillStyle = pf; ctx.fill();
  }

  // ── BOTTOM STRIP
  const stripY = S - 64;
  ctx.beginPath(); ctx.moveTo(PAD, stripY); ctx.lineTo(S-PAD, stripY);
  ctx.strokeStyle = rgba(ec, 0.2); ctx.lineWidth = 1; ctx.stroke();

  ctx.fillStyle = rgba({r:255,g:255,b:255}, 0.18); ctx.font = `10px 'Courier New', monospace`;
  ctx.textAlign = "center";
  ctx.fillText(
    `EARNITY GUILD WARS  •  ${rank} RANK  •  ${((elMeta as any)?.label ?? element ?? "").toUpperCase()} ELEMENT  •  #GW-${userId.slice(0,8).toUpperCase()}`,
    S/2, stripY + 28
  );

  ctx.restore();
  return canvas.toDataURL("image/png");
}

/* ── CopyBtn ── */
function CopyBtn({ text, dark = false }: { text: string; dark?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className={`p-1.5 rounded-lg transition-colors ${dark ? "hover:bg-white/10 text-white/40 hover:text-white" : "hover:bg-black/10 text-black/30 hover:text-black"}`}>
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

/* ── Elemental Circle ── */
function ElementalCircle({ ownedElements, currentElement }: {
  ownedElements: string[]; currentElement?: string;
}) {
  const radius = 110, center = 130, total = ELEMENTS.length;
  return (
    <div className="relative w-[260px] h-[260px] mx-auto">
      <div className="absolute inset-0 rounded-full border-2 border-white/10" />
      <div className="absolute inset-4 rounded-full border border-white/5" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 rounded-full border-2 border-white/20 bg-black/40 backdrop-blur-sm flex items-center justify-center">
          {currentElement && ELEMENT_META[currentElement]
            ? <img src={ELEMENT_META[currentElement].img} className="w-10 h-10 object-contain" alt="" />
            : <div className="w-3 h-3 rounded-full bg-white/20" />}
        </div>
      </div>
      {ELEMENTS.map((elId, i) => {
        const meta = ELEMENT_META[elId];
        if (!meta) return null;
        const angle = (i / total) * Math.PI * 2 - Math.PI / 2;
        const x = center + radius * Math.cos(angle);
        const y = center + radius * Math.sin(angle);
        const isOwned = ownedElements.includes(elId);
        const elColor = (meta as any).color ?? "#ffffff";
        const elGlow  = (meta as any).glow  ?? elColor;
        return (
          <motion.div key={elId}
            className="absolute w-10 h-10 -ml-5 -mt-5 rounded-full border-2 flex items-center justify-center"
            style={{
              left: x, top: y,
              borderColor: isOwned ? elColor : "rgba(255,255,255,0.12)",
              background: isOwned ? `${elColor}20` : "rgba(0,0,0,0.5)",
              boxShadow: isOwned ? `0 0 20px ${elGlow}, inset 0 0 10px ${elGlow}` : "none",
              filter: isOwned ? "none" : "grayscale(100%) brightness(0.35)",
            }}
            animate={isOwned ? { boxShadow: [`0 0 15px ${elGlow}`, `0 0 30px ${elGlow}`, `0 0 15px ${elGlow}`] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div style={{ color: isOwned ? elColor : "rgba(255,255,255,0.18)" }}>
              {ELEMENT_ICONS[elId]}
            </div>
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-wider whitespace-nowrap"
              style={{ color: isOwned ? elColor : "rgba(255,255,255,0.18)" }}>
              {(meta as any).label ?? elId}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ── DOM Card Preview ── */
function ProfileCardPreview({ username, guildName, element, rank, score, avatarUrl, isGuildMaster }: {
  username: string; guildName: string; element: string;
  rank: GuildRank; score: number; avatarUrl: string | null;
  isGuildMaster: boolean;
}) {
  const rankColor = RANK_COLORS[rank];
  const elMeta = element ? ELEMENT_META[element] : null;
  const elColor = (elMeta as any)?.color ?? rankColor;
  const rc = hexToRgb(rankColor);
  const { progress } = getRankFromScore(score);

  return (
    <div
      className="relative rounded-2xl border overflow-hidden w-full select-none"
      style={{
        aspectRatio: "1 / 1",
        borderColor: `${elColor}55`,
        background: "#08080a",
      }}
    >
      {/* Background tints */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full opacity-15 blur-3xl"
          style={{ background: elColor }} />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full opacity-10 blur-3xl"
          style={{ background: rankColor }} />
      </div>

      {/* Corner brackets */}
      {[
        "top-3 left-3 border-t-2 border-l-2 rounded-tl",
        "top-3 right-3 border-t-2 border-r-2 rounded-tr",
        "bottom-3 left-3 border-b-2 border-l-2 rounded-bl",
        "bottom-3 right-3 border-b-2 border-r-2 rounded-br",
      ].map((cls, i) => (
        <div key={i} className={`absolute w-4 h-4 ${cls}`} style={{ borderColor: `${elColor}80` }} />
      ))}

      <div className="relative h-full flex flex-col p-[5%] gap-[3%]">

        {/* TOP BAR */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg overflow-hidden border"
              style={{ borderColor: `${elColor}40` }}>
              <img src={ASSETS.logo} className="w-full h-full object-cover" alt="Earnity" />
            </div>
            <span className="font-mono text-white/50 uppercase tracking-widest"
              style={{ fontSize: "clamp(7px, 1.2vw, 11px)" }}>EARNITY</span>
          </div>
          <div className="px-2.5 py-0.5 rounded-full border font-mono font-black uppercase tracking-wider"
            style={{
              color: rankColor,
              borderColor: `${rankColor}50`,
              background: `${rankColor}12`,
              fontSize: "clamp(7px, 1.1vw, 10px)",
            }}>
            {rank} RANK
          </div>
        </div>

        {/* MAIN BODY */}
        <div className="flex-1 flex gap-[4%] min-h-0">

          {/* LEFT — Avatar + name + guild + element */}
          <div className="flex flex-col gap-[5%] w-[40%]">

            {/* Avatar square */}
            <div className="relative rounded-xl overflow-hidden border"
              style={{
                aspectRatio: "1/1",
                width: "100%",
                borderColor: `${elColor}50`,
              }}>
              {avatarUrl ? (
                <img src={avatarUrl} className="w-full h-full object-cover" alt={username} />
              ) : (
                <div className="w-full h-full flex items-center justify-center"
                  style={{ background: `${elColor}18` }}>
                  <span className="font-bold text-white"
                    style={{ fontSize: "clamp(24px, 8vw, 52px)" }}>
                    {username?.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Name */}
            <div className="min-w-0">
              <div className="font-black text-white truncate leading-tight"
                style={{ fontSize: "clamp(11px, 2.2vw, 19px)" }}>
                {username}
              </div>
              <div className="text-white/35 truncate mt-0.5"
                style={{ fontSize: "clamp(8px, 1.3vw, 12px)" }}>
                {guildName || "No Guild"}
              </div>
            </div>

            {/* Element chip */}
            {elMeta && (
              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border w-fit"
                style={{
                  borderColor: `${elColor}45`,
                  background: `${elColor}12`,
                  color: elColor,
                  fontSize: "clamp(7px, 1vw, 10px)",
                }}>
                {ELEMENT_ICONS[element]}
                <span className="font-mono font-bold">
                  {((elMeta as any).label ?? element).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* RIGHT — Stat boxes + element image + power + progress */}
          <div className="flex-1 flex flex-col gap-[4%] min-w-0">

            {/* 3 info box
