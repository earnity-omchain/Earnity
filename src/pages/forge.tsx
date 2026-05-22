import { useLocation } from "wouter";
import { motion, useAnimationFrame } from "framer-motion";
import { ArrowLeft, Wallet, Gem } from "lucide-react";
import { useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { getInventory } from "@/lib/supabase-gw";
import { ELEMENT_META, GAME_ASSETS, LOGO } from "@/lib/assets";
import { SHARDS_PER_ELEMENTAL, ELEMENTALS_FOR_WALLET, getShardItemType } from "@/lib/game-config";

const CDN = "https://gmyplyxwxmkvptimzgid.supabase.co/storage/v1/object/public/Assets";
const ASSETS = {
  background: import.meta.env.BASE_URL + "background-2.png",
  logo: import.meta.env.BASE_URL + "logo.jpg",
  seal: `${CDN}/Game%20assets/Seal1.png`,
};

const ELEMENTS = ["fire", "water", "nature", "rock", "lightning", "wind"] as const;
type Element = typeof ELEMENTS[number];

// Element colors for glows
const ELEMENT_COLORS: Record<Element, { glow: string; ring: string; label: string }> = {
  fire:      { glow: "#f97316", ring: "rgba(249,115,22,0.8)",  label: "FIRE" },
  water:     { glow: "#3b82f6", ring: "rgba(59,130,246,0.8)",  label: "WATER" },
  nature:    { glow: "#22c55e", ring: "rgba(34,197,94,0.8)",   label: "NATURE" },
  rock:      { glow: "#a8a29e", ring: "rgba(168,162,158,0.8)", label: "ROCK" },
  lightning: { glow: "#facc15", ring: "rgba(250,204,21,0.8)",  label: "LIGHTNING" },
  wind:      { glow: "#7dd3fc", ring: "rgba(125,211,252,0.8)", label: "WIND" },
};

// Positions on the ring: fire=top, water=top-right, nature=bottom-right, rock=bottom, lightning=bottom-left, wind=top-left
const RING_POSITIONS: { angle: number; element: Element }[] = [
  { angle: -90,  element: "fire" },
  { angle: -30,  element: "water" },
  { angle: 30,   element: "nature" },
  { angle: 90,   element: "rock" },
  { angle: 150,  element: "lightning" },
  { angle: 210,  element: "wind" },
];

function ElementalRing({ ownedElements }: { ownedElements: Set<string> }) {
  const angleRef = useRef(0);
  const [rotation, setRotation] = useState(0);

  useAnimationFrame((_, delta) => {
    angleRef.current += delta * 0.012; // deg/ms → slow spin
    setRotation(angleRef.current % 360);
  });

  const radius = 115; // px from center
  const centerSize = 90;

  return (
    <div className="relative mx-auto" style={{ width: 320, height: 320 }}>
      {/* Outer ring decoration */}
      <div
        className="absolute inset-0 rounded-full border border-white/10"
        style={{ margin: 12 }}
      />
      <div
        className="absolute inset-0 rounded-full border border-white/5"
        style={{ margin: 24 }}
      />

      {/* Rotating ring wrapper */}
      <div
        className="absolute inset-0"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        {RING_POSITIONS.map(({ angle, element }) => {
          const rad = (angle * Math.PI) / 180;
          const x = 160 + radius * Math.cos(rad) - 28; // 28 = half of node size 56
          const y = 160 + radius * Math.sin(rad) - 28;
          const owned = ownedElements.has(element);
          const meta = ELEMENT_META[element];
          const colors = ELEMENT_COLORS[element];

          return (
            <div
              key={element}
              className="absolute transition-all duration-300"
              style={{
                left: x,
                top: y,
                width: 56,
                height: 56,
                transform: `rotate(${-rotation}deg)`, // counter-rotate to keep icons upright
              }}
            >
              {/* Glow ring if owned */}
              {owned && (
                <div
                  className="absolute inset-0 rounded-full animate-pulse"
                  style={{
                    boxShadow: `0 0 18px 6px ${colors.glow}55`,
                    border: `2px solid ${colors.glow}`,
                    borderRadius: "50%",
                  }}
                />
              )}
              <div
                className="w-full h-full rounded-full flex items-center justify-center border"
                style={{
                  background: owned
                    ? `radial-gradient(circle, ${colors.glow}25, black)`
                    : "rgba(20,20,20,0.9)",
                  borderColor: owned ? colors.glow : "rgba(255,255,255,0.1)",
                }}
              >
                {owned ? (
                  <img
                    src={meta.img}
                    alt={element}
                    className="w-8 h-8 object-contain drop-shadow-lg"
                    style={{ filter: `drop-shadow(0 0 6px ${colors.glow})` }}
                  />
                ) : (
                  <div className="text-white/15 text-[9px] uppercase tracking-widest font-mono">
                    {colors.label.slice(0, 2)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Center seal */}
      <div
        className="absolute flex items-center justify-center rounded-full border border-white/15"
        style={{
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: centerSize,
          height: centerSize,
          background: "radial-gradient(circle, rgba(255,255,255,0.05), black)",
          boxShadow: "0 0 30px rgba(255,255,255,0.05)",
        }}
      >
        <img
          src={ASSETS.seal}
          alt="Seal"
          className="w-16 h-16 object-contain opacity-80"
        />
      </div>

      {/* Owned count badge */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-5
          text-[10px] font-mono tracking-widest uppercase text-white/40 whitespace-nowrap text-center"
      >
        Owned elements glow • Collect all 6 to unlock transcendence
      </div>
    </div>
  );
}

function ShardTable({
  inventory,
}: {
  inventory: { item_type: string; quantity: number }[] | undefined;
}) {
  const getShardCount = (element: string) => {
    const item = inventory?.find((i) => i.item_type === getShardItemType(element));
    return item?.quantity || 0;
  };
  const getElementalCount = (element: string) => {
    const item = inventory?.find((i) => i.item_type === `elemental_${element}`);
    return item?.quantity || 0;
  };

  return (
    <div className="w-full max-w-sm mx-auto mt-12">
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-3 text-center">
        Shard Progress
      </p>
      <div className="rounded-2xl border border-white/8 overflow-hidden bg-black/30 backdrop-blur-sm">
        {/* Header */}
        <div className="grid grid-cols-4 px-4 py-2 border-b border-white/8 text-[9px] uppercase tracking-widest text-white/30">
          <span>Element</span>
          <span className="text-center">Shards</span>
          <span className="text-center">Progress</span>
          <span className="text-right">Crafted</span>
        </div>

        {ELEMENTS.map((element) => {
          const meta = ELEMENT_META[element];
          const colors = ELEMENT_COLORS[element];
          const shards = getShardCount(element);
          const elementals = getElementalCount(element);
          const pct = Math.min(100, (shards / SHARDS_PER_ELEMENTAL) * 100);
          const ready = shards >= SHARDS_PER_ELEMENTAL;

          return (
            <div
              key={element}
              className="grid grid-cols-4 items-center px-4 py-2.5 border-b border-white/5 last:border-0"
            >
              {/* Element */}
              <div className="flex items-center gap-2">
                <img
                  src={meta.img}
                  alt={element}
                  className="w-6 h-6 object-contain"
                  style={elementals > 0 ? { filter: `drop-shadow(0 0 4px ${colors.glow})` } : {}}
                />
                <span
                  className="text-[11px] font-medium capitalize"
                  style={{ color: elementals > 0 ? colors.glow : "rgba(255,255,255,0.4)" }}
                >
                  {element}
                </span>
              </div>

              {/* Shard count */}
              <div className="text-center">
                <span className={`text-xs font-mono ${ready ? "text-green-400" : "text-white/50"}`}>
                  {shards}/{SHARDS_PER_ELEMENTAL}
                </span>
              </div>

              {/* Progress bar */}
              <div className="px-2">
                <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    style={{
                      background: ready
                        ? `linear-gradient(90deg, ${colors.glow}, white)`
                        : `rgba(255,255,255,0.2)`,
                      boxShadow: ready ? `0 0 6px ${colors.glow}` : "none",
                    }}
                  />
                </div>
              </div>

              {/* Crafted */}
              <div className="text-right">
                <span className={`text-xs font-mono ${elementals > 0 ? "text-white/80" : "text-white/20"}`}>
                  {elementals > 0 ? `×${elementals}` : "—"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Forge() {
  const [, setLocation] = useLocation();
  const { profile } = useAuth();

  const { data: inventory } = useQuery({
    queryKey: ["inventory", profile?.id],
    queryFn: () => getInventory(profile!.id),
    enabled: !!profile?.id,
  });

  const getElementalCount = (element: string) =>
    inventory?.find((i) => i.item_type === `elemental_${element}`)?.quantity || 0;

  const ownedElements = new Set(
    ELEMENTS.filter((el) => getElementalCount(el) > 0)
  );

  const totalElementals = ELEMENTS.reduce((sum, el) => sum + getElementalCount(el), 0);
  const canSubmitWallet = totalElementals >= ELEMENTALS_FOR_WALLET;

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-black text-white">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${ASSETS.background})` }}
      />
      <div className="absolute inset-0 bg-black/75" />

      {/* ── NAV — matches Socials page style ── */}
      <nav className="relative z-20 flex items-center justify-between px-5 py-4 border-b border-white/8 bg-black/20 backdrop-blur-md">
        {/* Left: back arrow + EARNITY */}
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg overflow-hidden border border-white/15">
              <img src={ASSETS.logo} className="w-full h-full object-cover" />
            </div>
            <span className="text-sm font-bold tracking-tight">EARNITY</span>
          </div>
        </button>

        {/* Center: page title */}
        <span className="absolute left-1/2 -translate-x-1/2 text-sm font-semibold tracking-[0.15em] uppercase text-white/60">
          THE FORGE
        </span>

        {/* Right: spacer */}
        <div className="w-24" />
      </nav>

      {/* ── CONTENT ── */}
      <div className="relative z-10 flex flex-col items-center px-6 pt-12 pb-24">

        {/* ELEMENTAL AFFINITY SECTION */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full flex flex-col items-center"
        >
          <p className="text-[10px] uppercase tracking-[0.25em] text-white/30 mb-2">
            Elemental Affinity
          </p>

          <ElementalRing ownedElements={ownedElements} />
        </motion.div>

        {/* Progress bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-xs mt-14"
        >
          <div className="flex justify-between text-[10px] text-white/40 mb-1.5">
            <span className="uppercase tracking-widest">Elementals</span>
            <span className="font-mono">{totalElementals} / {ELEMENTALS_FOR_WALLET}</span>
          </div>
          <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-400"
              initial={{ width: 0 }}
              animate={{ width: `${(totalElementals / ELEMENTALS_FOR_WALLET) * 100}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
          <p className="text-[9px] text-white/25 mt-1.5 text-center">
            Collect all 6 elementals to unlock wallet submission for GTD
          </p>
        </motion.div>

        {/* GTD Unlock banner */}
        {canSubmitWallet && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-6 w-full max-w-xs rounded-2xl border border-green-700/40 bg-green-950/25 p-4 text-center"
          >
            <Wallet className="w-7 h-7 text-green-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-green-400 mb-3">Wallet Submission Unlocked!</p>
            <button className="w-full py-2 rounded-xl bg-green-600 hover:bg-green-500 transition-colors text-sm font-semibold">
              Submit Wallet for GTD
            </button>
          </motion.div>
        )}

        {/* Shard table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="w-full"
        >
          <ShardTable inventory={inventory} />
        </motion.div>

        {/* Coming soon notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-10 text-center"
        >
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/25 mb-1">
            Full Forge Features
          </p>
          <p className="text-xs text-white/20">
            Forge your rewards and claim exclusive loot as a chosen combatant.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
