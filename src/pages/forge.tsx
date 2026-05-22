import { useLocation } from "wouter";
import { motion, AnimatePresence, useAnimationFrame } from "framer-motion";
import { ArrowLeft, Wallet, Package, CheckCircle2, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getInventory, openItemBox } from "@/lib/supabase-gw";
import { ELEMENT_META } from "@/lib/assets";
import { SHARDS_PER_ELEMENTAL, ELEMENTALS_FOR_WALLET, getShardItemType } from "@/lib/game-config";

const CDN = "https://gmyplyxwxmkvptimzgid.supabase.co/storage/v1/object/public/Assets";
const ASSETS = {
  background: import.meta.env.BASE_URL + "background-2.png",
  logo:       import.meta.env.BASE_URL + "logo.jpg",
  seal:       `${CDN}/Game%20assets/Seal2.png`,
  itembox:    `${CDN}/Game%20assets/itembox-closed.png`,
  itemboxOpen:`${CDN}/Game%20assets/itembox-opened.png`,
};

const ELEMENTS = ["fire", "water", "nature", "rock", "lightning", "wind"] as const;
type Element = typeof ELEMENTS[number];

const ELEMENT_COLORS: Record<Element, { glow: string; label: string }> = {
  fire:      { glow: "#f97316", label: "FIRE" },
  water:     { glow: "#3b82f6", label: "WATER" },
  nature:    { glow: "#22c55e", label: "NATURE" },
  rock:      { glow: "#a8a29e", label: "ROCK" },
  lightning: { glow: "#facc15", label: "LIGHTNING" },
  wind:      { glow: "#7dd3fc", label: "WIND" },
};

const RING_POSITIONS: { angle: number; element: Element }[] = [
  { angle: -90,  element: "fire" },
  { angle: -30,  element: "water" },
  { angle: 30,   element: "nature" },
  { angle: 90,   element: "rock" },
  { angle: 150,  element: "lightning" },
  { angle: 210,  element: "wind" },
];

// ── Elemental Ring ────────────────────────────────────────────────────────────
function ElementalRing({ ownedElements }: { ownedElements: Set<string> }) {
  const angleRef = useRef(0);
  const [rotation, setRotation] = useState(0);

  useAnimationFrame((_, delta) => {
    angleRef.current += delta * 0.012;
    setRotation(angleRef.current % 360);
  });

  const radius = 115;
  const centerSize = 90;

  return (
    <div className="relative mx-auto" style={{ width: 320, height: 320 }}>
      <div className="absolute inset-0 rounded-full border border-white/10" style={{ margin: 12 }} />
      <div className="absolute inset-0 rounded-full border border-white/5"  style={{ margin: 24 }} />

      <div className="absolute inset-0" style={{ transform: `rotate(${rotation}deg)` }}>
        {RING_POSITIONS.map(({ angle, element }) => {
          const rad = (angle * Math.PI) / 180;
          const x = 160 + radius * Math.cos(rad) - 28;
          const y = 160 + radius * Math.sin(rad) - 28;
          const owned  = ownedElements.has(element);
          const meta   = ELEMENT_META[element];
          const colors = ELEMENT_COLORS[element];

          return (
            <div key={element} className="absolute transition-all duration-300"
              style={{ left: x, top: y, width: 56, height: 56, transform: `rotate(${-rotation}deg)` }}>
              {owned && (
                <div className="absolute inset-0 rounded-full animate-pulse"
                  style={{ boxShadow: `0 0 18px 6px ${colors.glow}55`, border: `2px solid ${colors.glow}`, borderRadius: "50%" }} />
              )}
              <div className="w-full h-full rounded-full flex items-center justify-center border"
                style={{
                  background: owned ? `radial-gradient(circle, ${colors.glow}25, black)` : "rgba(20,20,20,0.9)",
                  borderColor: owned ? colors.glow : "rgba(255,255,255,0.1)",
                }}>
                {owned ? (
                  <img src={meta.img} alt={element} className="w-8 h-8 object-contain"
                    style={{ filter: `drop-shadow(0 0 6px ${colors.glow})` }} />
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

      <div className="absolute flex items-center justify-center rounded-full border border-white/15"
        style={{
          left: "50%", top: "50%", transform: "translate(-50%, -50%)",
          width: centerSize, height: centerSize,
          background: "radial-gradient(circle, rgba(255,255,255,0.05), black)",
          boxShadow: "0 0 30px rgba(255,255,255,0.05)",
        }}>
        <img src={ASSETS.seal} alt="Seal" className="w-16 h-16 object-contain opacity-80" />
      </div>

      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-5
        text-[10px] font-mono tracking-widest uppercase text-white/40 whitespace-nowrap text-center">
        Owned elements glow • Collect all 6 to unlock transcendence
      </div>
    </div>
  );
}

// ── Reward reveal overlay ─────────────────────────────────────────────────────
type BoxReward = { type: "shard" | "elemental"; subtype: string; quantity: number };

function RewardReveal({ reward, onClose }: { reward: BoxReward; onClose: () => void }) {
  const meta   = ELEMENT_META[reward.subtype];
  const colors = ELEMENT_COLORS[reward.subtype as Element];
  const img    = reward.type === "shard" ? meta?.shard : meta?.img;
  const label  = reward.type === "shard"
    ? `${reward.subtype.charAt(0).toUpperCase() + reward.subtype.slice(1)} Shard`
    : `${reward.subtype.charAt(0).toUpperCase() + reward.subtype.slice(1)} Elemental`;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-6"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.8, y: 30 }} animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 18 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xs rounded-3xl border bg-[#0d0d0d] p-8 text-center"
        style={{ borderColor: `${colors?.glow}40` }}>

        {/* Box opening animation */}
        <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 0.6 }}
          className="w-20 h-20 mx-auto mb-5">
          <img src={ASSETS.itemboxOpen} alt="opened" className="w-full h-full object-contain
            drop-shadow-[0_0_20px_rgba(168,85,247,0.5)]" />
        </motion.div>

        <div className="flex items-center justify-center gap-1.5 mb-2">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span className="text-green-400 text-sm font-semibold">Box Opened!</span>
        </div>

        {/* Reward */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="mt-4 flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-2xl border flex items-center justify-center"
            style={{ borderColor: `${colors?.glow}50`, background: `${colors?.glow}15`,
              boxShadow: `0 0 24px ${colors?.glow}30` }}>
            <img src={img} alt={label} className="w-12 h-12 object-contain"
              style={{ filter: `drop-shadow(0 0 8px ${colors?.glow})` }} />
          </div>
          <p className="text-lg font-bold" style={{ color: colors?.glow }}>{label}</p>
          <p className="text-xs text-white/35 capitalize">{reward.type} • ×{reward.quantity}</p>
        </motion.div>

        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          onClick={onClose}
          className="mt-6 w-full py-2.5 rounded-xl bg-white/8 hover:bg-white/15 border border-white/10
            text-sm font-medium text-white/70 hover:text-white transition-colors">
          Nice!
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

// ── Item Box Section ──────────────────────────────────────────────────────────
function ItemBoxSection({
  boxCount,
  onOpenOne,
  onOpenMax,
  isOpening,
}: {
  boxCount: number;
  onOpenOne: () => void;
  onOpenMax: () => void;
  isOpening: boolean;
}) {
  const hasBoxes = boxCount > 0;

  return (
    <div className="w-full max-w-sm mx-auto mt-12">
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-3 text-center">
        Item Box
      </p>

      <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
        <div className="flex items-center gap-4 mb-5">
          {/* Box image */}
          <motion.div animate={hasBoxes ? { scale: [1, 1.04, 1] } : {}}
            transition={{ duration: 2.5, repeat: Infinity }}
            className="w-16 h-16 flex-shrink-0">
            <img src={ASSETS.itembox} alt="Item Box"
              className={`w-full h-full object-contain ${!hasBoxes ? "opacity-25 grayscale" : "drop-shadow-[0_0_12px_rgba(168,85,247,0.4)]"}`} />
          </motion.div>

          <div className="flex-1">
            <p className="text-sm font-bold text-white/80">Item Box</p>
            <p className="text-xs text-white/35 mt-0.5 leading-relaxed">
              Contains a random shard or elemental
            </p>
            {/* Drop rates */}
            <div className="flex gap-3 mt-2">
              <span className="text-[10px] text-white/30">⬡ Shard <span className="text-white/50">70%</span></span>
              <span className="text-[10px] text-white/30">✦ Elemental <span className="text-purple-400">30%</span></span>
            </div>
          </div>

          {/* Count badge */}
          <div className="flex-shrink-0 flex flex-col items-center">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold text-lg
              ${hasBoxes ? "border-purple-500/40 bg-purple-500/15 text-purple-300" : "border-white/8 bg-white/5 text-white/20"}`}>
              {boxCount}
            </div>
            <span className="text-[9px] text-white/25 mt-1">owned</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button onClick={onOpenOne} disabled={!hasBoxes || isOpening}
            className={`flex-1 h-10 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all
              ${hasBoxes && !isOpening
                ? "bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_16px_rgba(168,85,247,0.3)]"
                : "bg-white/5 text-white/20 cursor-not-allowed border border-white/8"}`}>
            {isOpening
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <><Package className="w-3.5 h-3.5" /> Open</>}
          </button>

          <button onClick={onOpenMax} disabled={!hasBoxes || isOpening || boxCount < 2}
            className={`flex-1 h-10 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all
              ${hasBoxes && !isOpening && boxCount >= 2
                ? "bg-white/8 hover:bg-white/15 text-white/70 hover:text-white border border-white/10"
                : "bg-white/3 text-white/15 cursor-not-allowed border border-white/5"}`}>
            <Package className="w-3.5 h-3.5" /> Open All ({boxCount})
          </button>
        </div>

        {!hasBoxes && (
          <p className="text-center text-[10px] text-white/20 mt-3">
            No item boxes — earn one from the daily check-in on Day 6
          </p>
        )}
      </div>
    </div>
  );
}

// ── Shard Cards ───────────────────────────────────────────────────────────────
function ShardCards({ inventory }: { inventory: { item_type: string; quantity: number }[] | undefined }) {
  const getShardCount    = (el: string) => inventory?.find((i) => i.item_type === getShardItemType(el))?.quantity || 0;
  const getElementalCount = (el: string) => inventory?.find((i) => i.item_type === `elemental_${el}`)?.quantity || 0;

  return (
    <div className="w-full max-w-sm mx-auto mt-12">
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-3 text-center">
        Shard Progress
      </p>
      <div className="grid grid-cols-2 gap-3">
        {ELEMENTS.map((element) => {
          const meta      = ELEMENT_META[element];
          const colors    = ELEMENT_COLORS[element];
          const shards    = getShardCount(element);
          const elementals = getElementalCount(element);
          const pct       = Math.min(100, (shards / SHARDS_PER_ELEMENTAL) * 100);
          const ready     = shards >= SHARDS_PER_ELEMENTAL;

          return (
            <div key={element} className="relative rounded-2xl border p-3"
              style={{
                borderColor: ready ? `${colors.glow}50` : "rgba(255,255,255,0.08)",
                background:  ready ? `${colors.glow}12` : "rgba(255,255,255,0.03)",
              }}>
              <div className="flex items-center gap-2 mb-2">
                <img src={meta.img} alt={element} className="w-8 h-8 object-contain"
                  style={elementals > 0 ? { filter: `drop-shadow(0 0 5px ${colors.glow})` } : { opacity: 0.5 }} />
                <div>
                  <div className="text-sm font-bold capitalize"
                    style={{ color: elementals > 0 ? colors.glow : "rgba(255,255,255,0.5)" }}>
                    {meta.label}
                  </div>
                  <div className="text-[10px] text-white/30">{elementals} crafted</div>
                </div>
              </div>

              <div className="flex items-center gap-1 text-[10px] text-white/40 mb-1.5">
                <img src={meta.shard} className="w-3 h-3 object-contain" />
                <span className={ready ? "text-green-400 font-semibold" : ""}>
                  {shards} / {SHARDS_PER_ELEMENTAL} shards
                </span>
              </div>

              <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  style={{
                    background: ready ? colors.glow : "rgba(255,255,255,0.25)",
                    boxShadow:  ready ? `0 0 6px ${colors.glow}` : "none",
                  }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Forge() {
  const [, setLocation] = useLocation();
  const { profile }     = useAuth();
  const queryClient     = useQueryClient();

  const [reward, setReward]   = useState<BoxReward | null>(null);
  const [openingMax, setOpeningMax] = useState(false);

  const { data: inventory } = useQuery({
    queryKey: ["inventory", profile?.id],
    queryFn:  () => getInventory(profile!.id),
    enabled:  !!profile?.id,
  });

  const getCount = (type: string) => inventory?.find((i) => i.item_type === type)?.quantity || 0;
  const getElementalCount = (el: string) => getCount(`elemental_${el}`);

  const boxCount      = getCount("item_box");
  const ownedElements = new Set(ELEMENTS.filter((el) => getElementalCount(el) > 0));
  const totalElementals = ELEMENTS.reduce((sum, el) => sum + getElementalCount(el), 0);
  const canSubmitWallet = totalElementals >= ELEMENTALS_FOR_WALLET;

  const openMutation = useMutation({
    mutationFn: () => openItemBox(profile!.id),
    onSuccess: (data) => {
      if (data.success && data.reward) setReward(data.reward as BoxReward);
      queryClient.invalidateQueries({ queryKey: ["inventory", profile?.id] });
    },
  });

  // Open all boxes sequentially, show last reward
  const handleOpenMax = async () => {
    if (boxCount < 1) return;
    setOpeningMax(true);
    let lastReward: BoxReward | null = null;
    for (let i = 0; i < boxCount; i++) {
      try {
        const data = await openItemBox(profile!.id);
        if (data.success && data.reward) lastReward = data.reward as BoxReward;
      } catch {}
    }
    await queryClient.invalidateQueries({ queryKey: ["inventory", profile?.id] });
    if (lastReward) setReward(lastReward);
    setOpeningMax(false);
  };

  const isOpening = openMutation.isPending || openingMax;

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-black text-white">
      <div className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${ASSETS.background})` }} />
      <div className="absolute inset-0 bg-black/75" />

      {/* Nav */}
      <nav className="relative z-20 flex items-center justify-between px-5 py-4 border-b border-white/8 bg-black/20 backdrop-blur-md">
        <button onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg overflow-hidden border border-white/15">
              <img src={ASSETS.logo} className="w-full h-full object-cover" />
            </div>
            <span className="text-sm font-bold tracking-tight">EARNITY</span>
          </div>
        </button>
        <span className="absolute left-1/2 -translate-x-1/2 text-sm font-semibold tracking-[0.15em] uppercase text-white/60">
          THE FORGE
        </span>
        <div className="w-24" />
      </nav>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-6 pt-12 pb-24">

        {/* 1. Elemental Affinity */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="w-full flex flex-col items-center">
          <p className="text-[10px] uppercase tracking-[0.25em] text-white/30 mb-2">Elemental Affinity</p>
          <ElementalRing ownedElements={ownedElements} />
        </motion.div>

        {/* Elementals progress bar */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="w-full max-w-xs mt-14">
          <div className="flex justify-between text-[10px] text-white/40 mb-1.5">
            <span className="uppercase tracking-widest">Elementals</span>
            <span className="font-mono">{totalElementals} / {ELEMENTALS_FOR_WALLET}</span>
          </div>
          <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-400"
              initial={{ width: 0 }}
              animate={{ width: `${(totalElementals / ELEMENTALS_FOR_WALLET) * 100}%` }}
              transition={{ duration: 1, ease: "easeOut" }} />
          </div>
          <p className="text-[9px] text-white/25 mt-1.5 text-center">
            Collect all 6 elementals to unlock wallet submission for GTD
          </p>
        </motion.div>

        {/* GTD unlock */}
        {canSubmitWallet && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="mt-6 w-full max-w-xs rounded-2xl border border-green-700/40 bg-green-950/25 p-4 text-center">
            <Wallet className="w-7 h-7 text-green-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-green-400 mb-3">Wallet Submission Unlocked!</p>
            <button className="w-full py-2 rounded-xl bg-green-600 hover:bg-green-500 transition-colors text-sm font-semibold">
              Submit Wallet for GTD
            </button>
          </motion.div>
        )}

        {/* 2. Item Box */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="w-full">
          <ItemBoxSection
            boxCount={boxCount}
            onOpenOne={() => openMutation.mutate()}
            onOpenMax={handleOpenMax}
            isOpening={isOpening}
          />
        </motion.div>

        {/* 3. Shard Progress */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="w-full">
          <ShardCards inventory={inventory} />
        </motion.div>

      </div>

      {/* Reward reveal modal */}
      <AnimatePresence>
        {reward && <RewardReveal reward={reward} onClose={() => setReward(null)} />}
      </AnimatePresence>
    </div>
  );
}
