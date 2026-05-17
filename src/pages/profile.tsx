import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import {
  Copy, Check, ExternalLink, Users, ArrowLeft,
  ChevronRight, Star, Shield, Swords, Zap, Heart,
  Wind, Flame, Droplets, Mountain, TreePine, CloudLightning, Sparkles,
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
  fire:     <Flame className="w-5 h-5" />,
  water:    <Droplets className="w-5 h-5" />,
  nature:   <TreePine className="w-5 h-5" />,
  rock:     <Mountain className="w-5 h-5" />,
  lightning:<CloudLightning className="w-5 h-5" />,
  wind:     <Wind className="w-5 h-5" />,
  ice:      <Sparkles className="w-5 h-5" />,
};

function CopyBtn({ text, dark = false }: { text: string; dark?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className={`p-1.5 rounded-lg transition-colors ${dark ? "hover:bg-white/10 text-white/40 hover:text-white" : "hover:bg-black/10 text-black/30 hover:text-black"}`}>
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

/* ── Elemental Circle Component ── */
function ElementalCircle({ ownedElements, currentElement }: {
  ownedElements: ElementId[];
  currentElement?: string;
}) {
  const radius = 110;
  const center = 130;
  const total = ALL_ELEMENTS.length;
  
  return (
    <div className="relative w-[260px] h-[260px] mx-auto">
      {/* Background circle - B&W */}
      <div className="absolute inset-0 rounded-full border-2 border-white/10" />
      <div className="absolute inset-4 rounded-full border border-white/5" />
      
      {/* Center - current element or empty */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 rounded-full border-2 border-white/20 bg-black/40 backdrop-blur-sm flex items-center justify-center">
          {currentElement && ELEMENT_META[currentElement] ? (
            <img src={ELEMENT_META[currentElement].img} className="w-10 h-10 object-contain" alt="" />
          ) : (
            <div className="w-3 h-3 rounded-full bg-white/20" />
          )}
        </div>
      </div>

      {/* Element nodes */}
      {ALL_ELEMENTS.map((el, i) => {
        const angle = (i / total) * Math.PI * 2 - Math.PI / 2;
        const x = center + radius * Math.cos(angle);
        const y = center + radius * Math.sin(angle);
        const isOwned = ownedElements.includes(el.id);
        const isCurrent = currentElement === el.id;

        return (
          <motion.div
            key={el.id}
            className="absolute w-10 h-10 -ml-5 -mt-5 rounded-full border-2 flex items-center justify-center"
            style={{
              left: x,
              top: y,
              borderColor: isOwned ? el.color : "rgba(255,255,255,0.15)",
              background: isOwned ? `${el.color}20` : "rgba(0,0,0,0.5)",
              boxShadow: isOwned ? `0 0 20px ${el.glow}, inset 0 0 10px ${el.glow}` : "none",
              filter: isOwned ? "none" : "grayscale(100%) brightness(0.4)",
            }}
            animate={isOwned ? {
              boxShadow: [
                `0 0 15px ${el.glow}`,
                `0 0 30px ${el.glow}`,
                `0 0 15px ${el.glow}`,
              ],
            } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div style={{ color: isOwned ? el.color : "rgba(255,255,255,0.2)" }}>
              {ELEMENT_ICONS[el.id]}
            </div>
            
            {/* Label */}
            <div 
              className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-wider whitespace-nowrap"
              style={{ color: isOwned ? el.color : "rgba(255,255,255,0.2)" }}
            >
              {el.label}
            </div>

            {/* Connection line to center */}
            {isOwned && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: "visible" }}>
                <line
                  x1="20" y1="20"
                  x2={130 - x + 20} y2={130 - y + 20}
                  stroke={el.color}
                  strokeWidth="1"
                  strokeOpacity="0.3"
                  strokeDasharray="4 4"
                />
              </svg>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

/* ── Profile Card Component ── */
function ProfileCard({ fp, rank, stats, score }: {
  fp: any; rank: GuildRank; stats: ReturnType<<typeof getGuildStats>; score: number;
}) {
  const rankColor = RANK_COLORS[rank];
  const buildingImg = getBuildingImage(rank);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl border overflow-hidden"
      style={{ borderColor: `${rankColor}30`, background: "linear-gradient(180deg, rgba(20,20,20,0.9), rgba(5,5,5,0.95))" }}
    >
      {/* Rank glow */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-20 blur-3xl" style={{ background: rankColor }} />

      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="relative">
            {fp?.discord_avatar ? (
              <img
                src={fp.discord_avatar}
                className="w-20 h-20 rounded-2xl border-2 object-cover"
                style={{ borderColor: `${rankColor}50` }}
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl border-2 bg-white/10 flex items-center justify-center text-3xl font-bold"
                style={{ borderColor: `${rankColor}50` }}>
                {fp?.username?.charAt(0).toUpperCase()}
              </div>
            )}
            <div
              className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-md text-[10px] font-black uppercase border"
              style={{
                background: `${rankColor}20`,
                borderColor: `${rankColor}40`,
                color: rankColor,
              }}
            >
              {rank}
            </div>
          </div>

          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">{fp?.username}</h1>
            {fp?.guilds && (
              <div className="text-sm text-white/40 mt-0.5">{fp.guilds.name}</div>
            )}
            <div className="flex items-center gap-3 mt-2">
              <div className="text-xs text-white/30">
                <span className="text-white/60 font-mono">{score.toLocaleString()}</span> pts
              </div>
              <div className="w-px h-3 bg-white/10" />
              <div className="text-xs text-white/30">
                <span className="text-white/60 font-mono">{stats.attack}</span> ATK
              </div>
            </div>
          </div>
        </div>

        {/* Building */}
        <div className="flex justify-center mb-4">
          <motion.img
            src={buildingImg}
            alt="stronghold"
            className="w-24 h-24 object-contain"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            style={{ filter: `drop-shadow(0 0 20px ${rankColor}44)` }}
          />
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-[10px] text-white/40 uppercase tracking-wider mb-1">
            <span>Rank Progress</span>
            <span>{Math.floor(getRankFromScore(score).progress * 100)}%</span>
          </div>
          <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
            <motion.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${rankColor}88, ${rankColor})` }}
              initial={{ width: 0 }}
              animate={{ width: `${getRankFromScore(score).progress * 100}%` }}
              transition={{ duration: 1.2 }}
            />
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: <Swords className="w-3.5 h-3.5 text-red-400" />, label: "ATK", value: stats.attack },
            { icon: <Shield className="w-3.5 h-3.5 text-blue-400" />, label: "DEF", value: stats.defense },
            { icon: <Zap className="w-3.5 h-3.5 text-purple-400" />, label: "MAG", value: stats.magic },
            { icon: <Heart className="w-3.5 h-3.5 text-green-400" />, label: "HP", value: stats.hp },
            { icon: <Wind className="w-3.5 h-3.5 text-cyan-400" />, label: "SPD", value: stats.speed },
            { icon: <Star className="w-3.5 h-3.5 text-yellow-400" />, label: "PWR", value: score },
          ].map(({ icon, label, value }) => (
            <div key={label} className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/5">
              {icon}
              <div>
                <div className="text-[10px] text-white/30 uppercase">{label}</div>
                <div className="text-sm font-bold text-white font-mono">{value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default function Profile() {
  const { session, profile, signOut } = useAuth();
  const [, setLocation] = useLocation();

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

  const fp = fullProfile as any;
  const score = fp?.stronghold_score ?? fp?.ranking_score ?? fp?.contribution_score ?? 0;
  const { rank } = getRankFromScore(score);
  const stats = getGuildStats(score);
  const guild = fp?.guilds;
  const element = fp?.element;
  const wallet = fp?.wallet_address;
  const shortWallet = wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : null;
  const activeCodes = referralCodes?.filter((c: any) => !c.used_by) ?? [];
  const usedCodes = referralCodes?.filter((c: any) => c.used_by) ?? [];

  // Calculate shards from inventory
  const shards = inventory?.filter((i: any) => i.item_type === "shard") ?? [];
  const shardCount = shards.reduce((acc: number, s: any) => acc + (s.quantity || 0), 0);

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-black text-white">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${ASSETS.background})` }} />
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
        <button onClick={signOut} className="text-sm text-red-400 hover:text-red-300 transition-colors px-3 py-1.5 rounded-xl border border-red-500/20 hover:bg-red-500/10">
          Sign Out
        </button>
      </nav>

      <div className="relative z-10 max-w-lg mx-auto px-5 py-8 space-y-6">

        {/* ── PROFILE CARD ── */}
        <ProfileCard fp={fp} rank={rank} stats={stats} score={score} />

        {/* ── ELEMENTAL CIRCLE ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6"
        >
          <div className="text-[10px] uppercase tracking-wider text-white/40 mb-4 text-center">
            Elemental Affinity
          </div>
          <ElementalCircle
            ownedElements={elementals ?? [element].filter(Boolean)}
            currentElement={element}
          />
          <p className="text-[10px] text-white/20 text-center mt-6">
            Owned elements glow • Collect all 7 to unlock transcendence
          </p>
        </motion.div>

        {/* ── SHARDS & ITEMS ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
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

          {/* Item breakdown */}
          <div className="space-y-2">
            {[
              { icon: Shield, label: "Shields", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
              { icon: Swords, label: "Rugs", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
              { icon: Zap, label: "Drainers", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
              { icon: Heart, label: "HP Potions", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
            ].map(({ icon: Icon, label, color, bg, border }) => {
              const count = inventory?.find((i: any) => i.item_type === label.toLowerCase().replace(" ", "_"))?.quantity ?? 0;
              return (
                <div key={label} className="flex items-center justify-between p-2 rounded-lg bg-white/3 border border-white/5">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg ${bg} ${border} flex items-center justify-center`}>
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

        {/* ── WALLET ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
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

        {/* ── REFERRAL CODES ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
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
        </motion.div>

      </div>
    </div>
  );
}
