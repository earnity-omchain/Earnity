import { useLocation } from "wouter";
import { motion, AnimatePresence, useAnimationFrame } from "framer-motion";
import { ArrowLeft, Wallet, Package, CheckCircle2, Loader2, X } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getInventory, openItemBox } from "@/lib/supabase-gw";
import { supabase } from "@/lib/supabase";
import { ELEMENT_META, GAME_ASSETS, LOGO } from "@/lib/assets";
import { SHARDS_PER_ELEMENTAL, ELEMENTALS_FOR_WALLET, getShardItemType } from "@/lib/game-config";

// ── Offset config ─────────────────────────────────────────────────────────────
const YOUR_CURRENT_DB_COUNT = 3732;
const GTD_COUNT_OFFSET = 2374 - YOUR_CURRENT_DB_COUNT;

const CDN = "https://gmyplyxwxmkvptimzgid.supabase.co/storage/v1/object/public/Assets";
const ASSETS = {
  seal:        `${CDN}/Game%20assets/Seal2.png`,
  itembox:     `${CDN}/Game%20assets/itembox-closed.png`,
  itemboxOpen: `${CDN}/Game%20assets/itembox-opened.png`,
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

function isValidEVMAddress(addr: string) {
  return /^0x[0-9a-fA-F]{40}$/.test(addr.trim());
}

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
      <div className="absolute inset-0 rounded-full border border-white/20" style={{ margin: 12 }} />
      <div className="absolute inset-0 rounded-full border border-white/10" style={{ margin: 24 }} />

      <div className="absolute inset-0" style={{ transform: `rotate(${rotation}deg)` }}>
        {RING_POSITIONS.map(({ angle, element }) => {
          const rad    = (angle * Math.PI) / 180;
          const x      = 160 + radius * Math.cos(rad) - 28;
          const y      = 160 + radius * Math.sin(rad) - 28;
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
                  background:  owned ? `radial-gradient(circle, ${colors.glow}30, rgba(10,10,10,0.95))` : "rgba(15,15,15,0.92)",
                  borderColor: owned ? colors.glow : "rgba(255,255,255,0.2)",
                }}>
                {owned ? (
                  <img src={meta.img} alt={element} className="w-8 h-8 object-contain"
                    style={{ filter: `drop-shadow(0 0 6px ${colors.glow})` }} />
                ) : (
                  <div className="text-white/40 text-[9px] uppercase tracking-widest font-mono">
                    {colors.label.slice(0, 2)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="absolute flex items-center justify-center rounded-full border border-white/20"
        style={{
          left: "50%", top: "50%", transform: "translate(-50%, -50%)",
          width: centerSize, height: centerSize,
          background: "radial-gradient(circle, rgba(255,255,255,0.08), rgba(0,0,0,0.9))",
          boxShadow: "0 0 30px rgba(255,255,255,0.08)",
        }}>
        <img src={ASSETS.seal} alt="Seal" className="w-16 h-16 object-contain opacity-90" />
      </div>

      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-5
        text-[10px] font-mono tracking-widest uppercase text-white/60 whitespace-nowrap text-center">
        Owned elements glow • Collect all 6 to unlock transcendence
      </div>
    </div>
  );
}

// ── Reward reveal ─────────────────────────────────────────────────────────────
type BoxReward = { type: "shard" | "elemental"; subtype: string; quantity: number };

function RewardReveal({ reward, onClose }: { reward: BoxReward; onClose: () => void }) {
  const meta   = ELEMENT_META[reward.subtype];
  const colors = ELEMENT_COLORS[reward.subtype as Element];
  const img    = reward.type === "shard" ? meta?.shard : meta?.img;
  const label  = `${reward.subtype.charAt(0).toUpperCase() + reward.subtype.slice(1)} ${reward.type === "shard" ? "Shard" : "Elemental"}`;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm px-6"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.8, y: 30 }} animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 18 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xs rounded-3xl border bg-zinc-950 p-8 text-center shadow-2xl"
        style={{ borderColor: `${colors?.glow}50` }}>
        <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 0.6 }} className="w-20 h-20 mx-auto mb-5">
          <img src={ASSETS.itemboxOpen} alt="opened" className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(168,85,247,0.5)]" />
        </motion.div>
        <div className="flex items-center justify-center gap-1.5 mb-2">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span className="text-green-400 text-sm font-semibold">Box Opened!</span>
        </div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="mt-4 flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-2xl border flex items-center justify-center"
            style={{ borderColor: `${colors?.glow}50`, background: `${colors?.glow}15`, boxShadow: `0 0 24px ${colors?.glow}30` }}>
            <img src={img} alt={label} className="w-12 h-12 object-contain"
              style={{ filter: `drop-shadow(0 0 8px ${colors?.glow})` }} />
          </div>
          <p className="text-lg font-bold" style={{ color: colors?.glow }}>{label}</p>
          <p className="text-xs text-white/50 capitalize">{reward.type} • ×{reward.quantity}</p>
        </motion.div>
        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          onClick={onClose}
          className="mt-6 w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-sm font-medium text-white/80 hover:text-white transition-colors">
          Nice!
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

// ── Wallet Submit Modal ───────────────────────────────────────────────────────
function WalletModal({ onClose, onSubmit, isPending }: {
  onClose: () => void;
  onSubmit: (wallet: string) => void;
  isPending: boolean;
}) {
  const [wallet, setWallet] = useState("");
  const valid = isValidEVMAddress(wallet);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-green-600/30 bg-zinc-950 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-green-400" />
            <h3 className="text-base font-bold text-white">Submit Wallet</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-white/50 mb-5 leading-relaxed">
          Enter your EVM wallet address to secure your GTD spot. Make sure this is correct — it will be used for reward distribution.
        </p>

        <div className="mb-4">
          <label className="block text-[10px] text-white/50 mb-1.5 uppercase tracking-wider font-mono">EVM Wallet Address</label>
          <input
            type="text"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            placeholder="0x..."
            className={`w-full bg-white/8 border rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none transition-colors
              ${wallet.length > 0
                ? valid ? "border-green-500/50 focus:border-green-400" : "border-red-500/50 focus:border-red-400"
                : "border-white/15 focus:border-white/40"}`}
          />
          {wallet.length > 0 && !valid && (
            <p className="text-[10px] text-red-400 mt-1.5">Invalid EVM address. Must start with 0x and be 42 characters.</p>
          )}
        </div>

        <button
          onClick={() => valid && !isPending && onSubmit(wallet.trim())}
          disabled={!valid || isPending}
          className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-30 text-sm font-bold text-white transition-colors flex items-center justify-center gap-2">
          {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : <><Wallet className="w-4 h-4" /> Submit Wallet</>}
        </button>
      </motion.div>
    </motion.div>
  );
}

// ── Item Box Section ──────────────────────────────────────────────────────────
function ItemBoxSection({ boxCount, onOpenOne, onOpenMax, isOpening }: {
  boxCount: number; onOpenOne: () => void; onOpenMax: () => void; isOpening: boolean;
}) {
  const hasBoxes = boxCount > 0;
  return (
    <div className="w-full max-w-sm mx-auto mt-12">
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/50 mb-3 text-center font-mono">Item Box</p>
      <div className="rounded-2xl border border-white/15 bg-black/70 backdrop-blur-md p-5">
        <div className="flex items-center gap-4 mb-5">
          <motion.div animate={hasBoxes ? { scale: [1, 1.04, 1] } : {}}
            transition={{ duration: 2.5, repeat: Infinity }} className="w-16 h-16 flex-shrink-0">
            <img src={ASSETS.itembox} alt="Item Box"
              className={`w-full h-full object-contain ${!hasBoxes ? "opacity-30 grayscale" : "drop-shadow-[0_0_12px_rgba(168,85,247,0.4)]"}`} />
          </motion.div>
          <div className="flex-1">
            <p className="text-sm font-bold text-white">Item Box</p>
            <p className="text-xs text-white/50 mt-0.5 leading-relaxed">Contains a random shard or elemental</p>
            <div className="flex gap-3 mt-2">
              <span className="text-[10px] text-white/50">⬡ Shard <span className="text-white/70">70%</span></span>
              <span className="text-[10px] text-white/50">✦ Elemental <span className="text-purple-400">30%</span></span>
            </div>
          </div>
          <div className="flex-shrink-0 flex flex-col items-center">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold text-lg
              ${hasBoxes ? "border-purple-500/60 bg-purple-500/20 text-purple-200" : "border-white/15 bg-white/8 text-white/40"}`}>
              {boxCount}
            </div>
            <span className="text-[9px] text-white/40 mt-1">owned</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onOpenOne} disabled={!hasBoxes || isOpening}
            className={`flex-1 h-10 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all
              ${hasBoxes && !isOpening
                ? "bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_16px_rgba(168,85,247,0.3)]"
                : "bg-white/8 text-white/30 cursor-not-allowed border border-white/10"}`}>
            {isOpening ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Package className="w-3.5 h-3.5" /> Open</>}
          </button>
          <button onClick={onOpenMax} disabled={!hasBoxes || isOpening || boxCount < 2}
            className={`flex-1 h-10 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all
              ${hasBoxes && !isOpening && boxCount >= 2
                ? "bg-white/12 hover:bg-white/20 text-white/80 hover:text-white border border-white/15"
                : "bg-white/5 text-white/25 cursor-not-allowed border border-white/8"}`}>
            <Package className="w-3.5 h-3.5" /> Open All ({boxCount})
          </button>
        </div>
        {!hasBoxes && (
          <p className="text-center text-[10px] text-white/40 mt-3">
            No item boxes — earn one from the daily check-in on Day 6
          </p>
        )}
      </div>
    </div>
  );
}

// ── Shard Cards ───────────────────────────────────────────────────────────────
function ShardCards({ inventory, onForge, isForging }: {
  inventory: { item_type: string; quantity: number }[] | undefined;
  onForge: (el: Element) => void;
  isForging: boolean;
}) {
  const getShardCount     = (el: string) => inventory?.find((i) => i.item_type === getShardItemType(el))?.quantity || 0;
  const getElementalCount = (el: string) => inventory?.find((i) => i.item_type === `elemental_${el}`)?.quantity || 0;

  return (
    <div className="w-full max-w-sm mx-auto mt-12">
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/50 mb-3 text-center font-mono">Shard Progress</p>
      <div className="grid grid-cols-2 gap-3">
        {ELEMENTS.map((element) => {
          const meta       = ELEMENT_META[element];
          const colors     = ELEMENT_COLORS[element];
          const shards     = getShardCount(element);
          const elementals = getElementalCount(element);
          const pct        = Math.min(100, (shards / SHARDS_PER_ELEMENTAL) * 100);
          const ready      = shards >= SHARDS_PER_ELEMENTAL;

          return (
            <div key={element} className="relative rounded-2xl border p-3 backdrop-blur-sm"
              style={{
                borderColor: ready ? `${colors.glow}60` : "rgba(255,255,255,0.12)",
                background:  ready ? `${colors.glow}15` : "rgba(0,0,0,0.65)",
              }}>
              <div className="flex items-center gap-2 mb-2">
                <img src={meta.img} alt={element} className="w-8 h-8 object-contain"
                  style={elementals > 0 ? { filter: `drop-shadow(0 0 5px ${colors.glow})` } : { opacity: 0.6 }} />
                <div>
                  <div className="text-sm font-bold capitalize"
                    style={{ color: elementals > 0 ? colors.glow : "rgba(255,255,255,0.7)" }}>
                    {meta.label}
                  </div>
                  <div className="text-[10px] text-white/50">{elementals} crafted</div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-white/60 mb-1.5">
                <img src={meta.shard} className="w-3 h-3 object-contain" alt="" />
                <span className={ready ? "text-green-400 font-semibold" : "text-white/60"}>
                  {shards} / {SHARDS_PER_ELEMENTAL} shards
                </span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  style={{
                    background: ready ? colors.glow : "rgba(255,255,255,0.35)",
                    boxShadow:  ready ? `0 0 6px ${colors.glow}` : "none",
                  }} />
              </div>
              {ready && (
                <button onClick={() => onForge(element)} disabled={isForging}
                  className="mt-3 w-full py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border
                    bg-zinc-900 hover:bg-zinc-800 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ borderColor: `${colors.glow}60`, boxShadow: `0 0 10px ${colors.glow}20` }}>
                  {isForging ? "Forging..." : `Forge ${meta.label}`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── GTD Live Feed ─────────────────────────────────────────────────────────────
function GTDLiveFeed({ count, recent }: {
  count: number;
  recent: { wallet: string; submitted_at: string }[];
}) {
  const [prevCount, setPrevCount] = useState(count);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (count > prevCount) {
      setFlash(true);
      setTimeout(() => setFlash(false), 800);
      setPrevCount(count);
    }
  }, [count, prevCount]);

  return (
    <div className="w-full max-w-sm mx-auto mt-12">
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/50 mb-3 text-center font-mono">
        Live GTD Board
      </p>
      <div className="rounded-2xl border border-white/15 bg-black/70 backdrop-blur-md p-5">

        {/* Counter */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono mb-0.5">Spots Claimed</p>
            <motion.p
              key={count}
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-4xl font-black tabular-nums"
              style={{ color: flash ? "#86efac" : "white" }}>
              {count.toLocaleString()}
            </motion.p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] text-green-400 font-mono uppercase tracking-wider">Live</span>
            </div>
            <p className="text-[9px] text-white/30 font-mono">updates in real-time</p>
          </div>
        </div>

        {/* Recent submissions */}
        {recent.length > 0 && (
          <div className="border-t border-white/10 pt-3 space-y-2">
            <p className="text-[9px] uppercase tracking-widest text-white/35 font-mono mb-2">Recent</p>
            {recent.map((s, i) => (
              <motion.div
                key={s.wallet + s.submitted_at}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-green-400/70 flex-shrink-0" />
                  <span className="text-[11px] font-mono text-white/60">
                    {s.wallet.slice(0, 6)}…{s.wallet.slice(-4)}
                  </span>
                </div>
                <span className="text-[9px] text-white/30 font-mono">
                  {new Date(s.submitted_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </motion.div>
            ))}
          </div>
        )}

        {recent.length === 0 && (
          <p className="text-center text-[10px] text-white/30 pt-1">
            No submissions yet — be the first to forge all 6
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Forge() {
  const [, setLocation]     = useLocation();
  const { profile }         = useAuth();
  const queryClient         = useQueryClient();

  const [reward, setReward]           = useState<<BoxReward | null>(null);
  const [openingMax, setOpeningMax]   = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletToast, setWalletToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setWalletToast({ msg, ok });
    setTimeout(() => setWalletToast(null), 3500);
  };

  // Fetch bound wallet from profile
  const { data: profileData } = useQuery({
    queryKey: ["profile-wallet", profile?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles")
        .select("wallet_address").eq("id", profile!.id).single();
      return data;
    },
    enabled: !!profile?.id,
  });

  // Check if already submitted to GTD (this is fine with RLS — user_id = auth.uid())
  const { data: gtdData } = useQuery({
    queryKey: ["gtd-submission", profile?.id],
    queryFn: async () => {
      const { data } = await supabase.from("gtd_submissions")
        .select("wallet, submitted_at").eq("user_id", profile!.id).maybeSingle();
      return data;
    },
    enabled: !!profile?.id,
  });

  // Live GTD count + recent submissions — SINGLE RPC, bypasses RLS
  const { data: gtdStats } = useQuery({
    queryKey: ["gtd-count"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_gtd_stats");
      if (error) throw error;
      return {
        count: data?.count ?? 0,
        recent: data?.recent ?? [],
      };
    },
    refetchInterval: 15_000,
  });

  // Realtime: invalidate count on new submission
  useEffect(() => {
    const channel = supabase
      .channel("gtd-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "gtd_submissions" }, () => {
        queryClient.invalidateQueries({ queryKey: ["gtd-count"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const { data: inventory } = useQuery({
    queryKey: ["inventory", profile?.id],
    queryFn:  () => getInventory(profile!.id),
    enabled:  !!profile?.id,
  });

  const getCount          = (type: string) => inventory?.find((i) => i.item_type === type)?.quantity || 0;
  const getElementalCount = (el: string)   => getCount(`elemental_${el}`);

  const boxCount        = getCount("item_box");
  const ownedElements   = new Set(ELEMENTS.filter((el) => getElementalCount(el) > 0));
  const boundWallet     = profileData?.wallet_address;
  const alreadySubmittedGTD = !!gtdData?.wallet;
  const canSubmitWallet = alreadySubmittedGTD || ownedElements.size >= ELEMENTALS_FOR_WALLET;

  // Apply display offset — starts at 2374, increments with real new submissions
  const displayCount = gtdStats ? Math.max(0, gtdStats.count + GTD_COUNT_OFFSET) : null;

  // GTD submit mutation
  const walletMutation = useMutation({
    mutationFn: async (walletAddress: string) => {
      const { data, error } = await supabase.rpc("submit_gtd_and_burn", {
        p_user_id: profile!.id,
        p_wallet:  walletAddress,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.message ?? "Submission failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gtd-submission", profile?.id] });
      queryClient.invalidateQueries({ queryKey: ["inventory", profile?.id] });
      queryClient.invalidateQueries({ queryKey: ["gtd-count"] });
      setShowWalletModal(false);
      showToast("GTD submission successful!");
    },
    onError: (e: any) => {
      setShowWalletModal(false);
      showToast(e.message ?? "Submission failed", false);
    },
  });

  const handleWalletButton = () => {
    if (alreadySubmittedGTD) {
      showToast(`Already submitted: ${gtdData!.wallet.slice(0, 6)}…${gtdData!.wallet.slice(-4)}`);
      return;
    }
    if (boundWallet) {
      walletMutation.mutate(boundWallet);
    } else {
      setShowWalletModal(true);
    }
  };

  const openMutation = useMutation({
    mutationFn: () => openItemBox(profile!.id),
    onSuccess: (data) => {
      if (data.success && data.reward) setReward(data.reward as BoxReward);
      queryClient.invalidateQueries({ queryKey: ["inventory", profile?.id] });
    },
  });

  const forgeMutation = useMutation({
    mutationFn: (element: Element) =>
      supabase.rpc("forge_elemental", { p_user_id: profile!.id, p_element_type: element }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory", profile?.id] });
    },
  });

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
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-zinc-950 text-white">

      {/* Background */}
      <div className="absolute inset-0 bg-cover bg-center opacity-10 pointer-events-none"
        style={{ backgroundImage: `url(${GAME_ASSETS.background2})` }} />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.88) 0%, rgba(5,5,10,0.92) 50%, rgba(0,0,0,0.95) 100%)" }} />

      {/* Nav */}
      <nav className="relative z-20 flex items-center justify-between px-5 py-4 border-b border-white/10 bg-black/40 backdrop-blur-md">
        <button onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg overflow-hidden border border-white/20">
              <img src={LOGO} className="w-full h-full object-cover" alt="logo" />
            </div>
            <span className="text-sm font-bold tracking-tight">EARNITY</span>
          </div>
        </button>
        <span className="absolute left-1/2 -translate-x-1/2 text-sm font-semibold tracking-[0.15em] uppercase text-white/80">
          THE FORGE
        </span>
        <div className="w-24" />
      </nav>

      {/* Toast */}
      <AnimatePresence>
        {walletToast && (
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-xl border text-sm font-medium shadow-xl backdrop-blur-xl ${
              walletToast.ok
                ? "bg-green-500/15 border-green-500/30 text-green-400"
                : "bg-red-500/15 border-red-500/30 text-red-400"}`}>
            {walletToast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-6 pt-12 pb-24">

        {/* 1. Elemental Affinity */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="w-full flex flex-col items-center">
          <p className="text-[10px] uppercase tracking-[0.25em] text-white/50 mb-2 font-mono">Elemental Affinity</p>
          <ElementalRing ownedElements={ownedElements} />
        </motion.div>

        {/* Elementals progress bar */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="w-full max-w-xs mt-14">
          <div className="flex justify-between text-[10px] text-white/60 mb-1.5">
            <span className="uppercase tracking-widest font-mono">Elementals</span>
            <span className="font-mono text-white/80">{ownedElements.size} / {ELEMENTALS_FOR_WALLET}</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-400"
              initial={{ width: 0 }}
              animate={{ width: `${(ownedElements.size / ELEMENTALS_FOR_WALLET) * 100}%` }}
              transition={{ duration: 1, ease: "easeOut" }} />
          </div>
          <p className="text-[9px] text-white/45 mt-1.5 text-center">
            Collect all 6 elementals to unlock wallet submission for GTD
          </p>
        </motion.div>

        {/* GTD Live Feed */}
        {displayCount !== null && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
            className="w-full">
            <GTDLiveFeed count={displayCount} recent={gtdStats!.recent} />
          </motion.div>
        )}

        {/* GTD unlock */}
        {canSubmitWallet && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className={`mt-6 w-full max-w-xs rounded-2xl border backdrop-blur-sm p-4 text-center ${
              alreadySubmittedGTD
                ? "border-green-600/50 bg-green-950/40"
                : "border-indigo-600/50 bg-indigo-950/40"
            }`}>
            <Wallet className={`w-7 h-7 mx-auto mb-2 ${alreadySubmittedGTD ? "text-green-400" : "text-indigo-400"}`} />
            <p className={`text-sm font-bold mb-1 ${alreadySubmittedGTD ? "text-green-300" : "text-indigo-300"}`}>
              {alreadySubmittedGTD ? "GTD Spot Secured!" : "Wallet Submission Unlocked!"}
            </p>
            {alreadySubmittedGTD ? (
              <p className="text-[10px] text-green-400/70 font-mono mb-3">
                {gtdData!.wallet.slice(0, 6)}…{gtdData!.wallet.slice(-4)}
              </p>
            ) : boundWallet ? (
              <p className="text-[10px] text-white/40 font-mono mb-3">
                Will use bound wallet: {boundWallet.slice(0, 6)}…{boundWallet.slice(-4)}
              </p>
            ) : (
              <p className="text-[10px] text-white/40 mb-3">No wallet bound yet — you'll enter one now</p>
            )}
            <button
              onClick={handleWalletButton}
              disabled={walletMutation.isPending}
              className={`w-full py-2 rounded-xl text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2 ${
                alreadySubmittedGTD
                  ? "bg-green-800/60 cursor-default"
                  : "bg-indigo-600 hover:bg-indigo-500"
              }`}>
              {walletMutation.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                : alreadySubmittedGTD
                  ? "✓ Submitted"
                  : boundWallet
                    ? "Submit Wallet for GTD"
                    : "Enter & Submit Wallet"}
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
          <ShardCards
            inventory={inventory}
            onForge={(el) => forgeMutation.mutate(el)}
            isForging={forgeMutation.isPending}
          />
        </motion.div>

      </div>

      {/* Modals */}
      <AnimatePresence>
        {reward && <RewardReveal reward={reward} onClose={() => setReward(null)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showWalletModal && (
          <WalletModal
            onClose={() => setShowWalletModal(false)}
            onSubmit={(w) => walletMutation.mutate(w)}
            isPending={walletMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
