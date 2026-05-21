import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ChevronDown, Copy, Check,
  Shield, Swords, Zap, Star, ShoppingBag,
  Package, Gem, Coins, Heart, Flame,
  FlaskConical, Plus, X
} from "lucide-react";

const ASSETS = {
  background: import.meta.env.BASE_URL + "background-2.png",
  logo:       import.meta.env.BASE_URL + "logo.jpg",
  fire:       import.meta.env.BASE_URL + "Fire.png",
  water:      import.meta.env.BASE_URL + "Water.png",
  nature:     import.meta.env.BASE_URL + "Nature.png",
  rock:       import.meta.env.BASE_URL + "Rock.png",
  lighting:   import.meta.env.BASE_URL + "Lightning.png",
  wind:       import.meta.env.BASE_URL + "Wind.png",
};

const ELEMENT_META: Record<string, { text: string; border: string; bg: string; img: string }> = {
  fire:     { text: "text-orange-400", border: "border-orange-500/50", bg: "bg-orange-500/15", img: ASSETS.fire     },
  water:    { text: "text-blue-400",   border: "border-blue-500/50",   bg: "bg-blue-500/15",   img: ASSETS.water    },
  nature:   { text: "text-green-400",  border: "border-green-500/50",  bg: "bg-green-500/15",  img: ASSETS.nature   },
  rock:     { text: "text-stone-400",  border: "border-stone-500/50",  bg: "bg-stone-500/15",  img: ASSETS.rock     },
  lighting: { text: "text-yellow-400", border: "border-yellow-400/50", bg: "bg-yellow-400/15", img: ASSETS.lighting },
  wind:     { text: "text-sky-300",    border: "border-sky-300/50",    bg: "bg-sky-300/15",    img: ASSETS.wind     },
};

const ITEM_META: Record<string, { name: string; icon: any; color: string; border: string; bg: string; desc: string }> = {
  shield:        { name: "Shield Card",     icon: Shield,       color: "text-blue-400",   border: "border-blue-500/30",   bg: "bg-blue-500/10",   desc: "Protect your guild for 24 hours" },
  rug:           { name: "Rug Card",        icon: Swords,       color: "text-red-400",    border: "border-red-500/30",    bg: "bg-red-500/10",    desc: "Drain 25 points from a target user" },
  drainer:       { name: "Drainer Card",    icon: Zap,          color: "text-orange-400", border: "border-orange-500/30", bg: "bg-orange-500/10", desc: "Drain 50 points from an entire guild" },
  nuke:          { name: "Nuke Card",       icon: Flame,        color: "text-slate-300",  border: "border-slate-300/30",  bg: "bg-slate-300/10",  desc: "Break an active Shield on any guild" },
  hp_potion:     { name: "HP Potion",       icon: Heart,        color: "text-green-400",  border: "border-green-500/30",  bg: "bg-green-500/10",  desc: "Restore health points" },
  mp_potion:     { name: "MP Potion",       icon: FlaskConical, color: "text-purple-400", border: "border-purple-500/30", bg: "bg-purple-500/10", desc: "Restore mana points" },
  shard_fire:    { name: "Fire Shard",      icon: Gem,          color: "text-orange-400", border: "border-orange-500/30", bg: "bg-orange-500/10", desc: "Collect all 5 shards for a guaranteed mint" },
  shard_water:   { name: "Water Shard",     icon: Gem,          color: "text-blue-400",   border: "border-blue-500/30",   bg: "bg-blue-500/10",   desc: "Collect all 5 shards for a guaranteed mint" },
  shard_nature:  { name: "Nature Shard",    icon: Gem,          color: "text-green-400",  border: "border-green-500/30",  bg: "bg-green-500/10",  desc: "Collect all 5 shards for a guaranteed mint" },
  shard_rock:    { name: "Rock Shard",      icon: Gem,          color: "text-stone-400",  border: "border-stone-500/30",  bg: "bg-stone-500/10",  desc: "Collect all 5 shards for a guaranteed mint" },
  shard_lightning:{ name: "Lightning Shard",icon: Gem,          color: "text-yellow-400", border: "border-yellow-400/30", bg: "bg-yellow-400/10", desc: "Collect all 5 shards for a guaranteed mint" },
  shard_wind:    { name: "Wind Shard",      icon: Gem,          color: "text-sky-300",    border: "border-sky-300/30",    bg: "bg-sky-300/10",    desc: "Collect all 5 shards for a guaranteed mint" },
};

function getItemMeta(itemType: string) {
  if (ITEM_META[itemType]) return ITEM_META[itemType];
  if (itemType.startsWith('elemental_')) {
    const el = itemType.replace('elemental_', '');
    const em = ELEMENT_META[el];
    if (em) {
      return {
        name: `${el.charAt(0).toUpperCase() + el.slice(1)} Elemental`,
        icon: Star,
        color: em.text,
        border: em.border,
        bg: em.bg,
        desc: "A powerful elemental ally"
      };
    }
  }
  return {
    name: itemType,
    icon: Package,
    color: "text-white",
    border: "border-white/20",
    bg: "bg-white/5",
    desc: "Unknown item"
  };
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-white">
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function ProfileMenu({ profile, full, signOut }: any) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const el = full?.element ? ELEMENT_META[full.element] : null;
  const wallet = full?.wallet_address;
  const short = wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : null;

  return (
    <div ref={ref} className="relative z-50">
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition-colors">
        {full?.discord_avatar
          ? <img src={full.discord_avatar} className={`w-7 h-7 rounded-lg border ${el?.border || "border-white/20"} object-cover`} />
          : <div className={`w-7 h-7 rounded-lg border ${el?.border || "border-white/20"} bg-white/10 flex items-center justify-center text-xs font-bold text-white`}>{profile?.username?.charAt(0).toUpperCase()}</div>
        }
        <span className="text-sm text-white/80 font-medium hidden sm:block">{profile?.username}</span>
        <ChevronDown className={`w-3 h-3 text-white/40 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.96 }} transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-white/10 bg-black/90 backdrop-blur-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center gap-3">
              {full?.discord_avatar
                ? <img src={full.discord_avatar} className={`w-14 h-14 rounded-xl border-2 ${el?.border || "border-white/20"} object-cover`} />
                : <div className={`w-14 h-14 rounded-xl border-2 ${el?.border || "border-white/20"} bg-white/10 flex items-center justify-center text-xl font-bold text-white`}>{profile?.username?.charAt(0).toUpperCase()}</div>
              }
              <div>
                <div className="font-semibold text-white">{profile?.username}</div>
                {el && <div className={`flex items-center gap-1.5 text-xs ${el.text} mt-0.5`}><img src={el.img} className="w-3.5 h-3.5 object-contain" />{full.element} element</div>}
                <div className="text-xs text-white/40 mt-0.5">{full?.contribution_score?.toLocaleString() ?? 0} pts</div>
              </div>
            </div>
            {short && (
              <div className="px-4 py-3 border-b border-white/10">
                <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">Bound Wallet</div>
                <div className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2">
                  <span className="font-mono text-xs text-white/60">{short}</span>
                  <CopyBtn text={wallet} />
                </div>
              </div>
            )}
            <div className="px-4 py-3 border-b border-white/10">
              <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Inventory</div>
              <div className="grid grid-cols-4 gap-2">
                {[{icon:Shield,label:"Shields",color:"text-blue-400"},{icon:Swords,label:"Rugs",color:"text-red-400"},{icon:Zap,label:"Drain",color:"text-orange-400"},{icon:Star,label:"Shards",color:"text-yellow-400"}].map(({icon:Icon,label,color})=>(
                  <div key={label} className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/5 py-2">
                    <Icon className={`w-4 h-4 ${color}`}/><span className="text-sm font-bold text-white">0</span><span className="text-[9px] text-white/30">{label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-2">
              <button onClick={() => { signOut(); setOpen(false); }} className="w-full px-3 py-2 rounded-xl text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left">Sign Out</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Merchant() {
  const [, setLocation] = useLocation();
  const { session, profile, signOut } = useAuth();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<'browse' | 'sell' | 'my-listings'>('browse');
  const [sellModal, setSellModal] = useState<any>(null);
  const [sellQty, setSellQty] = useState('1');
  const [sellPrice, setSellPrice] = useState('');
  const [confirmBuy, setConfirmBuy] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (sellModal) { setSellQty('1'); setSellPrice(''); }
  }, [sellModal]);

  const { data: fullProfile } = useQuery({
    queryKey: ["merchant-profile", session?.user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("discord_avatar, wallet_address, element, contribution_score")
        .eq("id", session!.user.id)
        .single();
      return data;
    },
    enabled: !!session?.user?.id,
  });

  const { data: coinBalance } = useQuery({
    queryKey: ['coin-balance', session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('coin_balance')
        .eq('id', session!.user.id)
        .single();
      if (error) throw error;
      return data?.coin_balance ?? 0;
    },
    enabled: !!session?.user?.id,
  });

  const { data: listings } = useQuery({
    queryKey: ['market-listings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('*, seller:profiles!seller_id(username, discord_avatar)')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: inventory } = useQuery({
    queryKey: ['my-inventory', session?.user?.id],
    queryFn: async () => {
      const uid = session!.user.id;
      const [itemsRes, elemsRes] = await Promise.all([
        supabase.from('inventories').select('item_type, quantity').eq('user_id', uid),
        supabase.from('user_elementals').select('element_type').eq('user_id', uid)
      ]);
      if (itemsRes.error) throw itemsRes.error;
      if (elemsRes.error) throw elemsRes.error;

      const items = (itemsRes.data || []).map((i: any) => ({ ...i, kind: 'item' as const }));
      const elementals = (elemsRes.data || []).map((e: any) => ({
        item_type: `elemental_${e.element_type}`,
        quantity: 1,
        kind: 'elemental' as const
      }));
      return [...items, ...elementals];
    },
    enabled: !!session?.user?.id,
  });

  const { data: myListings } = useQuery({
    queryKey: ['my-listings', session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('seller_id', session!.user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!session?.user?.id,
  });

  const createListingMut = useMutation({
    mutationFn: async (vars: { item_type: string; quantity: number; price_coins: number }) => {
      const { data, error } = await supabase.rpc('create_listing', {
        p_seller_id: session!.user.id,
        p_item_type: vars.item_type,
        p_quantity: vars.quantity,
        p_price_coins: vars.price_coins
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.message || 'Failed to create listing');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-listings'] });
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      queryClient.invalidateQueries({ queryKey: ['my-inventory'] });
      setSellModal(null);
    },
    onError: (err: any) => setErrorMsg(err.message || 'Failed to create listing'),
  });

  const buyListingMut = useMutation({
    mutationFn: async (listingId: string) => {
      const { data, error } = await supabase.rpc('buy_listing', {
        p_listing_id: listingId,
        p_buyer_id: session!.user.id
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.message || 'Purchase failed');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-listings'] });
      queryClient.invalidateQueries({ queryKey: ['my-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['coin-balance'] });
      setConfirmBuy(null);
    },
    onError: (err: any) => setErrorMsg(err.message || 'Purchase failed'),
  });

  const cancelListingMut = useMutation({
    mutationFn: async (listingId: string) => {
      const { data, error } = await supabase.rpc('cancel_listing', {
        p_listing_id: listingId,
        p_user_id: session!.user.id
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.message || 'Cancel failed');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-listings'] });
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      queryClient.invalidateQueries({ queryKey: ['my-inventory'] });
    },
    onError: (err: any) => setErrorMsg(err.message || 'Cancel failed'),
  });

  const canSubmitListing = sellModal &&
    parseInt(sellQty) > 0 &&
    parseInt(sellQty) <= sellModal.quantity &&
    parseInt(sellPrice) > 0;

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-black text-white">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${ASSETS.background})` }} />
      <div className="absolute inset-0 bg-black/70" />

      {/* Top nav */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-5 sm:px-10 py-4 border-b border-white/8 bg-black/70 backdrop-blur-xl">
        <button onClick={() => setLocation("/")} className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="font-bold tracking-tight">EARNITY</span>
        </button>
        <span className="text-sm text-white/30 font-medium uppercase tracking-widest">Merchant</span>
        {profile ? <ProfileMenu profile={profile} full={fullProfile} signOut={signOut} /> : <div className="w-24" />}
      </nav>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-5 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-white/40 mb-2">Merchant</p>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">The Marketplace</h1>
              <p className="mt-2 text-white/40 text-sm">Buy and sell items with gold coins.</p>
            </div>
            {session && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-yellow-400/20 bg-yellow-400/10 w-fit">
                <Coins className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-bold text-white">{coinBalance?.toLocaleString() ?? 0}</span>
                <span className="text-xs text-white/40">coins</span>
              </div>
            )}
          </div>
        </motion.div>

        {errorMsg && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-center justify-between">
            {errorMsg}
            <button onClick={() => setErrorMsg(null)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-8 p-1 rounded-xl border border-white/10 bg-white/5 w-fit">
          {[
            { key: 'browse', label: 'Browse' },
            { key: 'sell', label: 'Sell Items' },
            { key: 'my-listings', label: 'My Listings' }
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.key ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* BROWSE */}
        {tab === 'browse' && (
          <>
            {listings?.length === 0 && (
              <div className="text-center py-20 text-white/30 text-sm">No active listings yet. Be the first to sell!</div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {listings?.map((listing: any) => {
                  const meta = getItemMeta(listing.item_type);
                  const Icon = meta.icon;
                  const isOwn = listing.seller_id === session?.user?.id;
                  return (
                    <motion.div
                      key={listing.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`rounded-2xl border ${meta.border} ${meta.bg} backdrop-blur-md p-5`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl border ${meta.border} bg-black/30 flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-5 h-5 ${meta.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-white text-sm truncate">{meta.name}</div>
                          <div className="text-xs text-white/40 mt-1 leading-relaxed">{meta.desc}</div>
                        </div>
                        <div className="text-xs font-medium text-white/60 bg-black/20 px-2 py-1 rounded-lg">×{listing.quantity}</div>
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Coins className="w-4 h-4 text-yellow-400" />
                          <span className="text-lg font-bold text-white">{listing.price_coins.toLocaleString()}</span>
                          <span className="text-xs text-white/30">coins</span>
                        </div>
                        {isOwn ? (
                          <span className="text-xs text-white/30 font-medium">Your listing</span>
                        ) : (
                          <button
                            onClick={() => setConfirmBuy(listing)}
                            disabled={!session || buyListingMut.isPending}
                            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 text-sm text-white font-medium transition-colors"
                          >
                            Buy
                          </button>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2">
                        {listing.seller?.discord_avatar ? (
                          <img src={listing.seller.discord_avatar} className="w-5 h-5 rounded-full object-cover border border-white/10" alt="" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-white/60 font-bold">
                            {(listing.seller?.username || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-xs text-white/40 truncate">
                          {listing.seller?.username || `${listing.seller_id?.slice(0, 6)}...${listing.seller_id?.slice(-4)}`}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </>
        )}

        {/* SELL */}
        {tab === 'sell' && (
          <>
            {!session && <div className="text-center py-20 text-white/30">Sign in to list your items.</div>}
            {session && inventory?.length === 0 && (
              <div className="text-center py-20 text-white/30 text-sm">Your inventory is empty. Open chests or craft items to get started.</div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {inventory?.map((item: any) => {
                const meta = getItemMeta(item.item_type);
                const Icon = meta.icon;
                return (
                  <motion.div
                    key={item.item_type}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-2xl border ${meta.border} ${meta.bg} backdrop-blur-md p-5`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl border ${meta.border} bg-black/30 flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${meta.color}`} />
                      </div>
                      <div>
                        <div className="font-semibold text-white text-sm">{meta.name}</div>
                        <div className="text-xs text-white/40 mt-1">{meta.desc}</div>
                        <div className="text-xs text-white/60 mt-2 font-medium">Owned: {item.quantity}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setSellModal(item)}
                      className="mt-4 w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm text-white font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> List for Sale
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}

        {/* MY LISTINGS */}
        {tab === 'my-listings' && (
          <>
            {!session && <div className="text-center py-20 text-white/30">Sign in to view your listings.</div>}
            {session && myListings?.length === 0 && (
              <div className="text-center py-20 text-white/30 text-sm">You have no active listings.</div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myListings?.map((listing: any) => {
                const meta = getItemMeta(listing.item_type);
                const Icon = meta.icon;
                return (
                  <motion.div
                    key={listing.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-2xl border ${meta.border} ${meta.bg} backdrop-blur-md p-5 opacity-80`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl border ${meta.border} bg-black/30 flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${meta.color}`} />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-white text-sm">{meta.name}</div>
                        <div className="text-xs text-white/40 mt-1">{meta.desc}</div>
                      </div>
                      <div className="text-xs font-medium text-white/60 bg-black/20 px-2 py-1 rounded-lg">×{listing.quantity}</div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-yellow-400" />
                        <span className="text-lg font-bold text-white">{listing.price_coins.toLocaleString()}</span>
                      </div>
                      <button
                        onClick={() => cancelListingMut.mutate(listing.id)}
                        disabled={cancelListingMut.isPending}
                        className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-sm text-red-400 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Create Listing Modal */}
      <AnimatePresence>
        {sellModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setSellModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-white/10 bg-black/90 backdrop-blur-2xl p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white">Create Listing</h3>
                <button onClick={() => setSellModal(null)} className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {(() => {
                const meta = getItemMeta(sellModal.item_type);
                const Icon = meta.icon;
                return (
                  <div className={`rounded-xl border ${meta.border} ${meta.bg} p-4 mb-6 flex items-center gap-3`}>
                    <div className={`w-10 h-10 rounded-xl border ${meta.border} bg-black/30 flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${meta.color}`} />
                    </div>
                    <div>
                      <div className="font-semibold text-white text-sm">{meta.name}</div>
                      <div className="text-xs text-white/40">Available: {sellModal.quantity}</div>
                    </div>
                  </div>
                );
              })()}

              <form
                onSubmit={e => {
                  e.preventDefault();
                  const qty = Math.min(Math.max(1, parseInt(sellQty) || 1), sellModal.quantity);
                  const price = Math.max(1, parseInt(sellPrice) || 0);
                  createListingMut.mutate({ item_type: sellModal.item_type, quantity: qty, price_coins: price });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    max={sellModal.quantity}
                    value={sellQty}
                    onChange={e => setSellQty(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider">Total Price (coins)</label>
                  <input
                    type="number"
                    min={1}
                    value={sellPrice}
                    onChange={e => setSellPrice(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!canSubmitListing || createListingMut.isPending}
                  className="w-full py-3 rounded-xl bg-white/15 hover:bg-white/25 disabled:opacity-30 text-sm font-semibold text-white transition-colors"
                >
                  {createListingMut.isPending ? 'Creating...' : 'List Item'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Buy Confirmation Modal */}
      <AnimatePresence>
        {confirmBuy && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setConfirmBuy(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-white/10 bg-black/90 backdrop-blur-2xl p-6 shadow-2xl"
            >
              {(() => {
                const meta = getItemMeta(confirmBuy.item_type);
                return (
                  <>
                    <h3 className="text-lg font-bold text-white mb-2">Confirm Purchase</h3>
                    <p className="text-sm text-white/60 mb-6">
                      Buy <span className="text-white font-medium">{meta.name}</span> ×{confirmBuy.quantity} for{' '}
                      <span className="text-yellow-400 font-medium">{confirmBuy.price_coins.toLocaleString()} coins</span>?
                    </p>
                  </>
                );
              })()}
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmBuy(null)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-white/70 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => buyListingMut.mutate(confirmBuy.id)}
                  disabled={buyListingMut.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-sm font-semibold text-white transition-colors"
                >
                  {buyListingMut.isPending ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

