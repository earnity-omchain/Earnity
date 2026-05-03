import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import {
  Copy, Check, Wallet, Users, Gift, Star, Zap, Shield, Swords, ExternalLink, Loader2, X
} from "lucide-react";

const ELEMENTS = [
  { id: "fire",      name: "Fire",      img: import.meta.env.BASE_URL + "Fire.png",      text: "text-orange-400", border: "border-orange-500/40", bg: "bg-orange-500/10", glow: "rgba(249,115,22,0.4)"  },
  { id: "water",     name: "Water",     img: import.meta.env.BASE_URL + "Water.png",     text: "text-blue-400",   border: "border-blue-500/40",   bg: "bg-blue-500/10",   glow: "rgba(59,130,246,0.4)"  },
  { id: "nature",    name: "Nature",    img: import.meta.env.BASE_URL + "Nature.png",    text: "text-green-400",  border: "border-green-500/40",  bg: "bg-green-500/10",  glow: "rgba(34,197,94,0.4)"   },
  { id: "rock",      name: "Rock",      img: import.meta.env.BASE_URL + "Rock.png",      text: "text-stone-400",  border: "border-stone-500/40",  bg: "bg-stone-500/10",  glow: "rgba(168,162,158,0.4)" },
  { id: "lightning", name: "Lightning", img: import.meta.env.BASE_URL + "Lightning.png", text: "text-yellow-400", border: "border-yellow-400/40", bg: "bg-yellow-400/10", glow: "rgba(250,204,21,0.4)"  },
  { id: "wind",      name: "Wind",      img: import.meta.env.BASE_URL + "Wind.png",      text: "text-sky-300",    border: "border-sky-300/40",    bg: "bg-sky-300/10",    glow: "rgba(125,211,252,0.4)" },
];

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-white"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

interface ProfilePanelProps {
  open: boolean;
  onClose: () => void;
  session: Session | null;
  profile: any;
  signOut: () => void;
}

export function ProfilePanel({ open, onClose, session, profile, signOut }: ProfilePanelProps) {
  const { data: fullProfile, isLoading: profileLoading, isError: profileError } = useQuery({
    queryKey: ["profile-panel", session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*, guilds(id, name, element)")
        .eq("id", session!.user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id && open,
    retry: 2,
    staleTime: 30_000,
  });

  const { data: referralCodes, isLoading: codesLoading } = useQuery({
    queryKey: ["profile-panel-codes", session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invite_codes")
        .select("code, is_active, used_at, used_by")
        .eq("created_by", session!.user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!session?.user?.id && open,
  });

  const guild = (fullProfile as any)?.guilds;
  const elementId = fullProfile?.element || guild?.element || (profile as any)?.element;
  const elStyle = elementId ? ELEMENTS.find(e => e.id === elementId) : null;
  const discordAvatar = fullProfile?.discord_avatar || (profile as any)?.discord_avatar;
  const wallet = fullProfile?.wallet_address || (profile as any)?.wallet_address;
  const score = fullProfile?.contribution_score ?? 0;
  const activeCodes = referralCodes?.filter((c: any) => c.is_active && !c.used_by) ?? [];
  const usedCodes = referralCodes?.filter((c: any) => c.used_by) ?? [];
  const shortWallet = wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : null;

  // Show spinner only when actively loading with no data yet; never block on error
  const isLoading = (profileLoading && !fullProfile && !profileError) || (codesLoading && !referralCodes);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-black/95 backdrop-blur-2xl border-l border-white/10 z-50 overflow-y-auto"
          >
            <div className="sticky top-0 bg-black/50 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Profile</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-8">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin text-white/40" />
                </div>
              ) : (
                <>
                  {/* ── Profile Hero ── */}
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      {discordAvatar ? (
                        <img
                          src={discordAvatar}
                          alt={profile?.username}
                          className={`w-20 h-20 rounded-2xl border-2 object-cover ${elStyle?.border || "border-white/20"}`}
                          style={{ boxShadow: elStyle ? `0 0 20px ${elStyle.glow}` : undefined }}
                        />
                      ) : (
                        <div className={`w-20 h-20 rounded-2xl border-2 ${elStyle?.border || "border-white/20"} bg-white/10 flex items-center justify-center`}>
                          <span className="text-2xl font-bold text-white/60">
                            {profile?.username?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-black" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xl font-bold text-white truncate">{profile?.username}</h3>
                      {guild ? (
                        <div className="text-sm text-white/60 mt-0.5">{guild.name}</div>
                      ) : (
                        <div className="text-sm text-white/40 mt-0.5">No guild</div>
                      )}
                      {elStyle ? (
                        <div className={`inline-flex items-center gap-1.5 mt-1.5 text-xs ${elStyle.text} px-2 py-1 rounded-full border ${elStyle.border} ${elStyle.bg}`}>
                          <img src={elStyle.img} className="w-3.5 h-3.5 object-contain" alt="" />
                          {elStyle.name} element
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 mt-1.5 text-xs text-white/40 px-2 py-1 rounded-full border border-white/10 bg-white/5">
                          No element bound
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Stats ── */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-xl font-bold text-white">{score.toLocaleString()}</div>
                      <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Points</div>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-xl font-bold text-white">{usedCodes.length}</div>
                      <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Referrals</div>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-xl font-bold text-white">{usedCodes.length * 50}</div>
                      <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Ref. Pts</div>
                    </div>
                  </div>

                  {/* ── Wallet ── */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Wallet className="w-4 h-4 text-white/40" />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">Bound Wallet</h3>
                    </div>
                    {wallet ? (
                      <div className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 border border-white/10">
                        <span className="font-mono text-sm text-white/80">{shortWallet}</span>
                        <div className="flex items-center gap-1">
                          <CopyBtn text={wallet} />
                          <a
                            href={`https://etherscan.io/address/${wallet}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-md hover:bg-white/10 transition-colors text-white/40 hover:text-white"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-white/40 text-center py-3 bg-white/5 rounded-xl border border-white/10">
                        No wallet bound yet.
                      </div>
                    )}
                  </div>

                  {/* ── Inventory ── */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Gift className="w-4 h-4 text-white/40" />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">Inventory</h3>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { icon: Shield, label: "Shields", count: 0, color: "text-blue-400" },
                        { icon: Swords, label: "Rug Cards", count: 0, color: "text-red-400" },
                        { icon: Zap, label: "Drainers", count: 0, color: "text-orange-400" },
                        { icon: Star, label: "Shards", count: 0, color: "text-yellow-400" },
                      ].map(({ icon: Icon, label, count, color }) => (
                        <div key={label} className="flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 p-3">
                          <Icon className={`w-5 h-5 ${color}`} />
                          <span className="text-lg font-bold text-white">{count}</span>
                          <span className="text-[10px] text-white/40 text-center leading-tight">{label}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-white/25 text-center mt-3">
                      Mystery boxes unlock in Phase 2 — coming soon
                    </p>
                  </div>

                  {/* ── Referral Codes ── */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="w-4 h-4 text-white/40" />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">Referral Codes</h3>
                      <span className="ml-auto text-xs text-white/30">+50 pts per referral</span>
                    </div>

                    {activeCodes.length > 0 ? (
                      <div className="space-y-2">
                        {activeCodes.map((c: any) => (
                          <div key={c.code} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 border border-white/10">
                            <span className="font-mono text-sm tracking-widest text-white/80">{c.code}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-green-400">Active</span>
                              <CopyBtn text={c.code} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-white/40 text-center py-3 bg-white/5 rounded-xl border border-white/10">
                        {codesLoading ? "Loading codes…" : "Your referral codes are being generated…"}
                      </p>
                    )}

                    {usedCodes.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <p className="text-xs text-white/30 mb-2">{usedCodes.length} code{usedCodes.length > 1 ? "s" : ""} used</p>
                        <div className="space-y-1.5">
                          {usedCodes.map((c: any) => (
                            <div key={c.code} className="flex items-center justify-between px-4 py-2 rounded-lg bg-white/5 border border-white/5">
                              <span className="font-mono text-xs text-white/40 tracking-widest">{c.code}</span>
                              <span className="text-xs text-white/30">Used</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => { signOut(); onClose(); }}
                    className="w-full py-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm font-medium"
                  >
                    Sign Out
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
 refData } = await supabase
      .from("invite_codes")
      .select("created_by")
      .in("created_by", ids)
      .not("used_by", "is", null);
    const refCounts: Record<string, number> = {};
    (refData ?? []).forEach((r: any) => { refCounts[r.created_by] = (refCounts[r.created_by] || 0) + 1; });

    return (data ?? []).map((p, i) => ({
      rank: i + 1,
      user: {
        id: p.id, username: p.username, contribution_score: p.contribution_score,
        discord_avatar: p.discord_avatar, discord_id: p.discord_id,
        element: p.element, referral_count: refCounts[p.id] || 0, shards: 0,
      },
      guild: p.guilds ? { id: (p.guilds as any).id, name: (p.guilds as any).name } : null,
    }));
  },
};
