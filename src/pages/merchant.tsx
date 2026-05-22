import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Coins, Plus, X, Package, ShoppingBag, Tag, Loader2,
} from "lucide-react";
import {
  GAME_ASSETS,
  ELEMENTAL_IMAGES,
  SHARD_IMAGES,
  ITEM_IMAGES,
} from "@/lib/assets";

/* ── Item metadata — keys must match DB item_type exactly ── */
const ITEM_META: Record<string, {
  name: string;
  color: string; border: string; bg: string; desc: string;
}> = {
  shield:              { name: "Shield Card",          color: "text-blue-400",   border: "border-blue-500/30",    bg: "bg-blue-500/10",    desc: "Protect your guild for 24 hours" },
  rug:                 { name: "Rug Card",              color: "text-red-400",    border: "border-red-500/30",     bg: "bg-red-500/10",     desc: "Drain 25 points from a target user" },
  drain:               { name: "Drainer Card",          color: "text-orange-400", border: "border-orange-500/30",  bg: "bg-orange-500/10",  desc: "Drain points from an entire guild" },
  nuke:                { name: "Nuke Card",             color: "text-slate-300",  border: "border-slate-300/30",   bg: "bg-slate-300/10",   desc: "Break an active Shield on any guild" },
  hp_potion:           { name: "HP Potion",             color: "text-green-400",  border: "border-green-500/30",   bg: "bg-green-500/10",   desc: "Restore health points" },
  mp_potion:           { name: "MP Potion",             color: "text-purple-400", border: "border-purple-500/30",  bg: "bg-purple-500/10",  desc: "Restore mana points" },
  shard_fire:          { name: "Fire Shard",            color: "text-orange-400", border: "border-orange-500/30",  bg: "bg-orange-500/10",  desc: "Collect 5 shards for a guaranteed mint" },
  shard_water:         { name: "Water Shard",           color: "text-blue-400",   border: "border-blue-500/30",    bg: "bg-blue-500/10",    desc: "Collect 5 shards for a guaranteed mint" },
  shard_nature:        { name: "Nature Shard",          color: "text-green-400",  border: "border-green-500/30",   bg: "bg-green-500/10",   desc: "Collect 5 shards for a guaranteed mint" },
  shard_rock:          { name: "Rock Shard",            color: "text-stone-400",  border: "border-stone-500/30",   bg: "bg-stone-500/10",   desc: "Collect 5 shards for a guaranteed mint" },
  shard_lightning:     { name: "Lightning Shard",       color: "text-yellow-400", border: "border-yellow-400/30",  bg: "bg-yellow-400/10",  desc: "Collect 5 shards for a guaranteed mint" },
  shard_wind:          { name: "Wind Shard",            color: "text-sky-300",    border: "border-sky-300/30",     bg: "bg-sky-300/10",     desc: "Collect 5 shards for a guaranteed mint" },
  elemental_fire:      { name: "Fire Elemental",        color: "text-orange-400", border: "border-orange-500/30",  bg: "bg-orange-500/10",  desc: "A powerful fire elemental ally" },
  elemental_water:     { name: "Water Elemental",       color: "text-blue-400",   border: "border-blue-500/30",    bg: "bg-blue-500/10",    desc: "A powerful water elemental ally" },
  elemental_nature:    { name: "Nature Elemental",      color: "text-green-400",  border: "border-green-500/30",   bg: "bg-green-500/10",   desc: "A powerful nature elemental ally" },
  elemental_rock:      { name: "Rock Elemental",        color: "text-stone-400",  border: "border-stone-500/30",   bg: "bg-stone-500/10",   desc: "A powerful rock elemental ally" },
  elemental_lightning: { name: "Lightning Elemental",   color: "text-yellow-400", border: "border-yellow-400/30",  bg: "bg-yellow-400/10",  desc: "A powerful lightning elemental ally" },
  elemental_wind:      { name: "Wind Elemental",        color: "text-sky-300",    border: "border-sky-300/30",     bg: "bg-sky-300/10",     desc: "A powerful wind elemental ally" },
};

function getItemMeta(itemType: string) {
  return ITEM_META[itemType] ?? {
    name: itemType,
    color: "text-white/60", border: "border-white/20", bg: "bg-white/5",
    desc: "Unknown item",
  };
}

/* ── Resolve the correct CDN image for any item type ── */
function getItemImage(itemType: string): string | null {
  // Shards → shard images
  if (itemType.startsWith("shard_")) {
    const el = itemType.replace("shard_", "") as keyof typeof SHARD_IMAGES;
    return SHARD_IMAGES[el] ?? null;
  }
  // Elementals → elemental images
  if (itemType.startsWith("elemental_")) {
    const el = itemType.replace("elemental_", "") as keyof typeof ELEMENTAL_IMAGES;
    return ELEMENTAL_IMAGES[el] ?? null;
  }
  // Game items → item images
  const itemMap: Record<string, string> = {
    shield:    ITEM_IMAGES.shield,
    nuke:      ITEM_IMAGES.nuke,
    drain:     ITEM_IMAGES.drain,
    rug:       ITEM_IMAGES.rug,
    hp_potion: ITEM_IMAGES.hpPotion,
    mp_potion: ITEM_IMAGES.mpPotion,
  };
  return itemMap[itemType] ?? null;
}

/* ── Item visual ── */
function ItemVisual({ itemType, size = "md" }: { itemType: string; size?: "sm" | "md" | "lg" }) {
  const meta = getItemMeta(itemType);
  const img = getItemImage(itemType);
  const sz = size === "lg" ? "w-16 h-16" : size === "sm" ? "w-8 h-8" : "w-11 h-11";

  return (
    <div className={`${sz} rounded-xl border ${meta.border} bg-black/40 flex items-center justify-center flex-shrink-0 overflow-hidden`}>
      {img
        ? <img src={img} alt={itemType} className="w-full h-full object-contain p-1" />
        : <Package className={`w-5 h-5 ${meta.color}`} />
      }
    </div>
  );
}

/* ── Listing card ── */
function ListingCard({ listing, isMine, coinBalance, onBuy, onCancel, isPendingBuy, isPendingCancel }: any) {
  const meta = getItemMeta(listing.item_type);
  const canAfford = coinBalance >= listing.price_coins;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`rounded-2xl border ${meta.border} bg-black/60 backdrop-blur-md p-4 flex flex-col gap-3`}
    >
      {/* Top: item visual + info */}
      <div className="flex items-start gap-3">
        <ItemVisual itemType={listing.item_type} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white text-sm truncate">{meta.name}</div>
          <div className="text-[11px] text-white/40 mt-0.5 leading-relaxed line-clamp-2">{meta.desc}</div>
        </div>
        <div className="text-xs font-mono font-bold text-white/50 bg-white/5 border border-white/10 px-2 py-1 rounded-lg flex-shrink-0">
          ×{listing.quantity}
        </div>
      </div>

      {/* Price + action */}
      <div className="flex items-center justify-between pt-2 border-t border-white/8">
        <div className="flex items-center gap-1.5">
          <Coins className="w-4 h-4 text-yellow-400" />
          <span className="text-base font-black text-white font-mono">{listing.price_coins.toLocaleString()}</span>
          <span className="text-[10px] text-white/30">coins</span>
        </div>

        {isMine ? (
          <button
            onClick={() => onCancel(listing.id)}
            disabled={isPendingCancel}
            className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs text-red-400 font-medium transition-colors disabled:opacity-40 flex items-center gap-1.5"
          >
            {isPendingCancel ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
            Cancel
          </button>
        ) : (
          <button
            onClick={() => onBuy(listing)}
            disabled={isPendingBuy || !canAfford}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors disabled:opacity-40 flex items-center gap-1.5 ${
              canAfford
                ? "bg-white/10 hover:bg-white/20 border-white/15 text-white"
                : "bg-white/5 border-white/10 text-white/30"
            }`}
          >
            {isPendingBuy ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShoppingBag className="w-3 h-3" />}
            {canAfford ? "Buy" : "Can't afford"}
          </button>
        )}
      </div>

      {/* Seller */}
      <div className="flex items-center gap-2 pt-1 border-t border-white/5">
        {listing.seller?.discord_avatar
          ? <img src={listing.seller.discord_avatar} className="w-4 h-4 rounded-full object-cover border border-white/10" alt="" />
          : <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-bold text-white/50">
              {(listing.seller?.username || "?").charAt(0).toUpperCase()}
            </div>
        }
        <span className="text-[10px] text-white/30 truncate">
          {listing.seller?.username || `${listing.seller_id?.slice(0, 6)}…`}
        </span>
        {isMine && (
          <span className="ml-auto text-[10px] text-yellow-400/60 font-mono">Your listing</span>
        )}
      </div>
    </motion.div>
  );
}

/* ── Sell modal ── */
function SellModal({ item, onClose, onSubmit, isPending }: {
  item: any; onClose: () => void;
  onSubmit: (qty: number, price: number) => void;
  isPending: boolean;
}) {
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");
  const meta = getItemMeta(item.item_type);
  const parsedQty = Math.min(Math.max(1, parseInt(qty) || 1), item.quantity);
  const parsedPrice = parseInt(price) || 0;
  const canSubmit = parsedQty > 0 && parsedPrice > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-black/95 backdrop-blur-2xl p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-white">Create Listing</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Item preview */}
        <div className={`rounded-xl border ${meta.border} ${meta.bg} p-3 mb-5 flex items-center gap-3`}>
          <ItemVisual itemType={item.item_type} size="sm" />
          <div>
            <div className="font-semibold text-white text-sm">{meta.name}</div>
            <div className="text-[11px] text-white/40">Available: {item.quantity}</div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] text-white/40 mb-1.5 uppercase tracking-wider font-mono">
              Quantity {item.quantity > 1 ? `(max ${item.quantity})` : ""}
            </label>
            <input
              type="number" min={1} max={item.quantity}
              value={qty} onChange={e => setQty(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30 transition-colors font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] text-white/40 mb-1.5 uppercase tracking-wider font-mono">
              Price (coins)
            </label>
            <div className="relative">
              <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-400/60" />
              <input
                type="number" min={1}
                value={price} onChange={e => setPrice(e.target.value)}
                placeholder="0"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30 transition-colors font-mono"
              />
            </div>
          </div>

          <button
            onClick={() => canSubmit && !isPending && onSubmit(parsedQty, parsedPrice)}
            disabled={!canSubmit || isPending}
            className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 text-sm font-bold text-white transition-colors flex items-center justify-center gap-2"
          >
            {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Listing…</> : <><Tag className="w-4 h-4" /> List for Sale</>}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Buy confirm modal ── */
function BuyModal({ listing, coinBalance, onClose, onConfirm, isPending }: {
  listing: any; coinBalance: number;
  onClose: () => void; onConfirm: () => void; isPending: boolean;
}) {
  const meta = getItemMeta(listing.item_type);
  const canAfford = coinBalance >= listing.price_coins;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-black/95 backdrop-blur-2xl p-6 shadow-2xl"
      >
        <h3 className="text-base font-bold text-white mb-1">Confirm Purchase</h3>
        <p className="text-sm text-white/50 mb-5">
          Buy <span className="text-white font-medium">{meta.name}</span> ×{listing.quantity} for{" "}
          <span className="text-yellow-400 font-bold">{listing.price_coins.toLocaleString()} coins</span>?
        </p>

        {!canAfford && (
          <div className="mb-4 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            You need {(listing.price_coins - coinBalance).toLocaleString()} more coins for this purchase.
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-white/60 transition-colors">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending || !canAfford}
            className="flex-1 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 disabled:opacity-30 text-sm font-bold text-white transition-colors flex items-center justify-center gap-2"
          >
            {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</> : "Confirm"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Main page ── */
export default function Merchant() {
  const { session, profile } = useAuth();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<"browse" | "sell" | "my-listings">("browse");
  const [sellModal, setSellModal] = useState<any>(null);
  const [confirmBuy, setConfirmBuy] = useState<any>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  /* ── Queries ── */
  const { data: coinBalance = 0 } = useQuery({
    queryKey: ["merchant-coins", profile?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles")
        .select("coin_balance").eq("id", profile!.id).single();
      return data?.coin_balance ?? 0;
    },
    enabled: !!profile?.id,
  });

  const { data: listings = [], isLoading: loadingListings } = useQuery({
    queryKey: ["market-listings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("listings")
        .select("*, seller:profiles!seller_id(username, discord_avatar)")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: inventory = [], isLoading: loadingInventory } = useQuery({
    queryKey: ["my-inventory", profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("inventories")
        .select("item_type, quantity").eq("user_id", profile!.id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!profile?.id,
  });

  const { data: myListings = [] } = useQuery({
    queryKey: ["my-listings", profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("listings")
        .select("*, seller:profiles!seller_id(username, discord_avatar)")
        .eq("seller_id", profile!.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!profile?.id,
  });

  /* ── Mutations ── */
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["market-listings"] });
    queryClient.invalidateQueries({ queryKey: ["my-listings"] });
    queryClient.invalidateQueries({ queryKey: ["my-inventory"] });
    queryClient.invalidateQueries({ queryKey: ["merchant-coins"] });
  };

  const createListingMut = useMutation({
    mutationFn: async ({ item_type, quantity, price_coins }: any) => {
      const { data, error } = await supabase.rpc("create_listing", {
        p_seller_id: profile!.id, p_item_type: item_type,
        p_quantity: quantity, p_price_coins: price_coins,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.message ?? "Failed");
      return data;
    },
    onSuccess: () => { invalidate(); setSellModal(null); showToast("Listing created!"); },
    onError: (e: any) => showToast(e.message ?? "Failed to create listing", false),
  });

  const buyListingMut = useMutation({
    mutationFn: async (listingId: string) => {
      const { data, error } = await supabase.rpc("buy_listing", {
        p_listing_id: listingId, p_buyer_id: profile!.id,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.message ?? "Failed");
      return data;
    },
    onSuccess: () => { invalidate(); setConfirmBuy(null); showToast("Purchase successful!"); },
    onError: (e: any) => { setConfirmBuy(null); showToast(e.message ?? "Purchase failed", false); },
  });

  const cancelListingMut = useMutation({
    mutationFn: async (listingId: string) => {
      const { data, error } = await supabase.rpc("cancel_listing", {
        p_listing_id: listingId, p_user_id: profile!.id,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.message ?? "Failed");
      return data;
    },
    onSuccess: () => { invalidate(); showToast("Listing cancelled"); },
    onError: (e: any) => showToast(e.message ?? "Cancel failed", false),
  });

  const userId = session?.user?.id;
  const browseListings = listings;
  const sellableItems = inventory.filter((i: any) => i.quantity > 0);

  return (
    <div className="relative min-h-[100dvh] w-full bg-black text-white overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 bg-cover bg-center opacity-20 pointer-events-none"
        style={{ backgroundImage: `url(${GAME_ASSETS.background2})` }} />
      <div className="fixed inset-0 bg-black/80 pointer-events-none" />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-xl border text-sm font-medium shadow-xl backdrop-blur-xl ${
              toast.ok
                ? "bg-green-500/15 border-green-500/30 text-green-400"
                : "bg-red-500/15 border-red-500/30 text-red-400"
            }`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-white/8" />
          <span className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em]">Merchant</span>
          <div className="h-px flex-1 bg-white/8" />
        </div>

        {/* Coin balance */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between px-4 py-3 rounded-2xl border border-yellow-400/15 bg-yellow-400/5">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-yellow-400" />
            <span className="text-sm text-white/60 font-mono uppercase tracking-wider">Your Balance</span>
          </div>
          <span className="text-xl font-black text-yellow-400 font-mono">{coinBalance.toLocaleString()}</span>
        </motion.div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl border border-white/10 bg-white/5">
          {[
            { key: "browse",      label: "Browse",      icon: ShoppingBag },
            { key: "sell",        label: "Sell Items",  icon: Tag         },
            { key: "my-listings", label: "My Listings", icon: Package     },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key as any)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                tab === key ? "bg-white/15 text-white" : "text-white/40 hover:text-white/70"
              }`}>
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{label.split(" ")[0]}</span>
            </button>
          ))}
        </div>

        {/* ── BROWSE ── */}
        {tab === "browse" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {loadingListings && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-white/30" />
              </div>
            )}
            {!loadingListings && browseListings.length === 0 && (
              <div className="text-center py-16 text-white/30 text-sm">
                No active listings yet. Be the first to sell!
              </div>
            )}
            <AnimatePresence>
              {browseListings.map((listing: any) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  isMine={listing.seller_id === userId}
                  coinBalance={coinBalance}
                  onBuy={setConfirmBuy}
                  onCancel={(id: string) => cancelListingMut.mutate(id)}
                  isPendingBuy={buyListingMut.isPending}
                  isPendingCancel={cancelListingMut.isPending}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── SELL ── */}
        {tab === "sell" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {loadingInventory && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-white/30" />
              </div>
            )}
            {!loadingInventory && sellableItems.length === 0 && (
              <div className="text-center py-16 text-white/30 text-sm">
                Your inventory is empty. Open chests or craft items to get started.
              </div>
            )}
            <AnimatePresence>
              {sellableItems.map((item: any) => {
                const meta = getItemMeta(item.item_type);
                return (
                  <motion.div key={item.item_type}
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    className={`rounded-2xl border ${meta.border} bg-black/60 backdrop-blur-md p-4 flex items-center gap-3`}
                  >
                    <ItemVisual itemType={item.item_type} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white text-sm">{meta.name}</div>
                      <div className="text-[11px] text-white/40 mt-0.5">{meta.desc}</div>
                      <div className="text-xs text-white/50 font-mono mt-1">
                        Owned: <span className="text-white font-bold">{item.quantity}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSellModal(item)}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs text-white font-medium transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> List
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── MY LISTINGS ── */}
        {tab === "my-listings" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {myListings.length === 0 && (
              <div className="text-center py-16 text-white/30 text-sm">
                You have no active listings.
              </div>
            )}
            <AnimatePresence>
              {myListings.map((listing: any) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  isMine={true}
                  coinBalance={coinBalance}
                  onBuy={() => {}}
                  onCancel={(id: string) => cancelListingMut.mutate(id)}
                  isPendingBuy={false}
                  isPendingCancel={cancelListingMut.isPending}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        <div className="h-8" />
      </div>

      {/* Modals */}
      <AnimatePresence>
        {sellModal && (
          <SellModal
            item={sellModal}
            onClose={() => setSellModal(null)}
            onSubmit={(qty, price) => createListingMut.mutate({
              item_type: sellModal.item_type, quantity: qty, price_coins: price,
            })}
            isPending={createListingMut.isPending}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmBuy && (
          <BuyModal
            listing={confirmBuy}
            coinBalance={coinBalance}
            onClose={() => setConfirmBuy(null)}
            onConfirm={() => buyListingMut.mutate(confirmBuy.id)}
            isPending={buyListingMut.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
