import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ChevronDown, Copy, Check,
  Shield, Swords, Zap, Star, ShoppingBag,
  Package, Gem, Scroll,
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

const SHOP_ITEMS = [
  {
    icon: Package,
    name: "Mystery Box",
    description: "Contains random items — cards, shards, diamonds, or points.",
    color: "text-purple-400",
    border: "border-purple-500/30",
    bg: "bg-purple-500/10",
    price: "Coming soon",
  },
  {
    icon: Shield,
    name: "Shield Card",
    description: "Protect your guild and all members for 24 hours.",
    color: "text-blue-400",
    border: "border-blue-500/30",
    bg: "bg-blue-500/10",
    price: "Coming soon",
  },
  {
    icon: Gem,
    name: "Elemental Shard",
    description: "Collect all 5 shards to secure a guaranteed mint spot.",
    color: "text-yellow-400",
    border: "border-yellow-400/30",
    bg: "bg-yellow-400/10",
    price: "Coming soon",
  },
  {
    icon: Scroll,
    name: "Rug Card",
    description: "Drain 25 points from a target user.",
    color: "text-red-400",
    border: "border-red-500/30",
    bg: "bg-red-500/10",
    price: "Coming soon",
  },
  {
    icon: Zap,
    name: "Drainer Card",
    description: "Drain 50 points from an entire guild.",
    color: "text-orange-400",
    border: "border-orange-500/30",
    bg: "bg-orange-500/10",
    price: "Coming soon",
  },
  {
    icon: Swords,
    name: "Nuke Card",
    description: "Break an active Shield on any guild.",
    color: "text-slate-300",
    border: "border-slate-300/30",
    bg: "bg-slate-300/10",
    price: "Coming soon",
  },
];

export default function Merchant() {
  const [, setLocation] = useLocation();
  const { session, profile, signOut } = useAuth();

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

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-black text-white">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${ASSETS.background})` }} />
      <div className="absolute inset-0 bg-black/70" />

      {/* Top nav */}
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

        {profile && <ProfileMenu profile={profile} full={fullProfile} signOut={signOut} />}
      </nav>

      {/* Content */}
      <div className="relative z-10 max-w-2xl mx-auto px-5 py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-white/40 mb-2">Merchant</p>
          <h1 className="text-4xl font-bold tracking-tight">The Shop</h1>
          <p className="mt-3 text-white/40 text-sm">Items unlock when the protocol begins.</p>
        </motion.div>

        {/* Coming soon banner */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="mb-8 rounded-2xl border border-yellow-400/20 bg-yellow-400/5 px-5 py-4 flex items-center gap-3">
          <ShoppingBag className="w-5 h-5 text-yellow-400 flex-shrink-0" />
          <div>
            <div className="text-sm font-semibold text-yellow-400">Shop opens after guild selection</div>
            <div className="text-xs text-white/40 mt-0.5">All items will be purchasable with points and diamonds once Phase 2 begins.</div>
          </div>
        </motion.div>

        {/* Item grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SHOP_ITEMS.map(({ icon: Icon, name, description, color, border, bg, price }, i) => (
            <motion.div key={name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
              className={`rounded-2xl border ${border} ${bg} backdrop-blur-md p-5 opacity-60`}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl border ${border} bg-black/30 flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white text-sm">{name}</div>
                  <div className="text-xs text-white/40 mt-1 leading-relaxed">{description}</div>
                </div>
              </div>
              <div className={`mt-4 text-xs ${color} font-medium`}>{price}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
