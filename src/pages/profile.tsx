import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useRef, useState, useEffect } from "react";
import {
  Copy, Check, ExternalLink, Users, ArrowLeft,
  ChevronDown, Star, Shield, Swords, Zap,
} from "lucide-react";

const ASSETS = {
  background: import.meta.env.BASE_URL + "background-2.png",
  logo:       import.meta.env.BASE_URL + "logo.jpg",
};

const ELEMENT_META: Record<string, { label: string; text: string; border: string; bg: string; glow: string }> = {
  fire:     { label: "Fire",      text: "text-orange-400", border: "border-orange-500/40", bg: "bg-orange-500/10", glow: "shadow-orange-500/30" },
  water:    { label: "Water",     text: "text-blue-400",   border: "border-blue-500/40",   bg: "bg-blue-500/10",   glow: "shadow-blue-500/30"   },
  nature:   { label: "Nature",    text: "text-green-400",  border: "border-green-500/40",  bg: "bg-green-500/10",  glow: "shadow-green-500/30"  },
  rock:     { label: "Rock",      text: "text-stone-400",  border: "border-stone-500/40",  bg: "bg-stone-500/10",  glow: "shadow-stone-500/30"  },
  lighting: { label: "Lightning", text: "text-yellow-400", border: "border-yellow-400/40", bg: "bg-yellow-400/10", glow: "shadow-yellow-400/30" },
  wind:     { label: "Wind",      text: "text-sky-300",    border: "border-sky-300/40",    bg: "bg-sky-300/10",    glow: "shadow-sky-300/30"    },
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
  const guild = fp?.guilds;
  const element = fp?.element;
  const el = element ? ELEMENT_META[element] : null;
  const wallet = fp?.wallet_address;
  const shortWallet = wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : null;
  const score = fp?.contribution_score ?? 0;
  const activeCodes = referralCodes?.filter(c => !c.used_by) ?? [];
  const usedCodes = referralCodes?.filter(c => c.used_by) ?? [];

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

      <div className="relative z-10 max-w-lg mx-auto px-5 py-8 space-y-5">

        {/* ── PROFILE CARD ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl border ${el?.border || "border-white/10"} bg-white/5 backdrop-blur-md overflow-hidden`}>
          {el && <div className={`absolute inset-0 ${el.bg} opacity-20 pointer-events-none rounded-2xl`} />}
          <div className="relative p-5">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                {fp?.discord_avatar
                  ? <img src={fp.discord_avatar} className={`w-20 h-20 rounded-2xl border-2 ${el?.border || "border-white/20"} object-cover shadow-lg ${el?.glow || ""}`} />
                  : <div className={`w-20 h-20 rounded-2xl border-2 ${el?.border || "border-white/20"} bg-white/10 flex items-center justify-center text-3xl font-bold`}>{profile.username?.charAt(0).toUpperCase()}</div>
                }
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-black" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold truncate text-white">{profile.username}</h1>
                {el && (
                  <div className={`flex items-center gap-1.5 mt-1 text-sm ${el.text}`}>
                    <span>{el.label} element</span>
                  </div>
                )}
                {guild && (
                  <div className="text-sm text-white/40 mt-0.5">{guild.name}</div>
                )}

                {/* Stats */}
                <div className="flex items-center gap-5 mt-3">
                  <div>
                    <div className="text-lg font-bold text-white">{score.toLocaleString()}</div>
                    <div className="text-[10px] text-white/40 uppercase tracking-wide">Points</div>
                  </div>
                  <div className="w-px h-8 bg-white/10" />
                  <div>
                    <div className="text-lg font-bold text-white">{usedCodes.length}</div>
                    <div className="text-[10px] text-white/40 uppercase tracking-wide">Referrals</div>
                  </div>
                  <div className="w-px h-8 bg-white/10" />
                  <div>
                    <div className="text-lg font-bold text-white">{usedCodes.length * 50}</div>
                    <div className="text-[10px] text-white/40 uppercase tracking-wide">Ref. pts</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── WALLET ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
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

        {/* ── INVENTORY ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
          <div className="text-[10px] uppercase tracking-wider text-white/40 mb-3">Inventory</div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: Shield, label: "Shields",  count: 0, color: "text-blue-400"   },
              { icon: Swords, label: "Rugs",     count: 0, color: "text-red-400"    },
              { icon: Zap,    label: "Drainers", count: 0, color: "text-orange-400" },
              { icon: Star,   label: "Shards",   count: 0, color: "text-yellow-400" },
            ].map(({ icon: Icon, label, count, color }) => (
              <div key={label} className="flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 p-3">
                <Icon className={`w-5 h-5 ${color}`} />
                <span className="text-lg font-bold text-white">{count}</span>
                <span className="text-[10px] text-white/30 text-center leading-tight">{label}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-white/25 text-center mt-3">Unlocks in Phase 2</p>
        </motion.div>

        {/* ── REFERRAL CODES ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-white/40" />
              <span className="text-[10px] uppercase tracking-wider text-white/40">Referral Codes</span>
            </div>
            <span className="text-[10px] text-white/30">+50 pts per referral</span>
          </div>

          {activeCodes.length > 0 ? (
            <div className="space-y-2">
              {activeCodes.map((c) => (
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
              <p className="text-xs text-white/25 mt-1">Codes are created after redeeming your invite</p>
            </div>
          )}

          {usedCodes.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-[10px] text-white/30 mb-2 uppercase tracking-wide">{usedCodes.length} used</p>
              <div className="space-y-1.5">
                {usedCodes.map((c) => (
                  <div key={c.code} className="flex items-center justify-between px-4 py-2 rounded-lg bg-white/3">
                    <span className="font-mono text-xs text-white/30 tracking-widest">{c.code}</span>
                    <span className="text-xs text-white/25">Used</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

      </div>
    </div>
  );
}
