import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import {
  Copy, Check, Wallet, Users, Gift, Star, Zap, Shield, Swords,
  ExternalLink, Loader2, X, AlertCircle,
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
  profile?: any;
  signOut: () => void;
}

export function ProfilePanel({ open, onClose, session, profile, signOut }: ProfilePanelProps) {
  const uid = session?.user?.id;

  const {
    data: fp,
    isLoading: fpLoading,
    isError: fpError,
    refetch: fpRefetch,
  } = useQuery({
    queryKey: ["panel-profile", uid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, discord_avatar, wallet_address, element, contribution_score, guild_id")
        .eq("id", uid!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!uid && open,
    staleTime: 30_000,
    retry: 2,
  });

  const { data: guild } = useQuery({
    queryKey: ["panel-guild", fp?.guild_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("guilds")
        .select("id, name, element")
        .eq("id", fp!.guild_id!)
        .single();
      return data ?? null;
    },
    enabled: !!fp?.guild_id,
    staleTime: 60_000,
  });

  const { data: referralCodes, isLoading: codesLoading } = useQuery({
    queryKey: ["panel-codes", uid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invite_codes")
        .select("code, is_active, used_at, used_by")
        .eq("created_by", uid!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!uid && open,
    staleTime: 30_000,
  });

  const elementId  = fp?.element ?? (profile as any)?.element;
  const elStyle    = elementId ? ELEMENTS.find(e => e.id === elementId) ?? null : null;
  const avatar     = fp?.discord_avatar ?? (profile as any)?.discord_avatar;
  const username   = fp?.username ?? profile?.username ?? session?.user?.email ?? "—";
  const wallet     = fp?.wallet_address ?? (profile as any)?.wallet_address;
  const score      = fp?.contribution_score ?? 0;
  const shortWallet = wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : null;
  const activeCodes = (referralCodes ?? []).filter((c: any) => c.is_active && !c.used_by);
  const usedCodes   = (referralCodes ?? []).filter((c: any) => !!c.used_by);

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
            transition={{ type: "spring", damping: 26, stiffness: 220 }}
            className="fixed inset-y-0 right-0 w-full max-w-sm bg-[#0a0a0a] border-l border-white/10 z-50 flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
              <h2 className="text-base font-semibold text-white">Profile</h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {fpLoading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="w-5 h-5 animate-spin text-white/30" />
                </div>
              ) : fpError ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3 px-6 text-center">
                  <AlertCircle className="w-8 h-8 text-white/20" />
                  <p className="text-sm text-white/40">Couldn't load profile</p>
                  <button
                    onClick={() => fpRefetch()}
                    className="text-xs text-white/50 hover:text-white underline underline-offset-2"
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <div className="p-5 space-y-6">

                  {/* ── Hero card ── */}
                  <div
                    className={`rounded-2xl border ${elStyle?.border ?? "border-white/10"} bg-white/5 p-4`}
                    style={{ boxShadow: elStyle ? `0 0 40px ${elStyle.glow}18` : undefined }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        {avatar ? (
                          <img
                            src={avatar}
                            alt={username}
                            className={`w-16 h-16 rounded-xl border-2 object-cover ${elStyle?.border ?? "border-white/20"}`}
                          />
                        ) : (
                          <div className={`w-16 h-16 rounded-xl border-2 ${elStyle?.border ?? "border-white/20"} bg-white/10 flex items-center justify-center`}>
                            <span className="text-xl font-bold text-white/60">
                              {username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#0a0a0a]" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-base font-bold text-white truncate">{username}</p>
                        {guild?.name && (
                          <p className="text-xs text-white/40 mt-0.5 truncate">{guild.name}</p>
                        )}
                        {elStyle ? (
                          <div className={`inline-flex items-center gap-1 mt-1.5 text-[11px] font-medium ${elStyle.text} px-2 py-0.5 rounded-full border ${elStyle.border} ${elStyle.bg}`}>
                            <img src={elStyle.img} className="w-3 h-3 object-contain" alt="" />
                            {elStyle.name}
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 mt-1.5 text-[11px] text-white/30 px-2 py-0.5 rounded-full border border-white/10 bg-white/5">
                            No element
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-4">
                      {[
                        { label: "Points",    value: score.toLocaleString() },
                        { label: "Referrals", value: usedCodes.length.toString() },
                        { label: "Ref. Pts",  value: (usedCodes.length * 50).toLocaleString() },
                      ].map(({ label, value }) => (
                        <div key={label} className="text-center p-2.5 rounded-xl bg-white/5 border border-white/8">
                          <div className="text-base font-bold text-white tabular-nums">{value}</div>
                          <div className="text-[9px] text-white/35 uppercase tracking-wider mt-0.5">{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── Wallet ── */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Wallet className="w-3.5 h-3.5 text-white/30" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Bound Wallet</span>
                    </div>
                    {wallet ? (
                      <div className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 border border-white/10">
                        <span className="font-mono text-sm text-white/70">{shortWallet}</span>
                        <div className="flex items-center gap-1">
                          <CopyBtn text={wallet} />
                          <a
                            href={`https://etherscan.io/address/${wallet}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/30 hover:text-white"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-white/30 text-center py-3 bg-white/5 rounded-xl border border-white/10">
                        No wallet bound yet
                      </div>
                    )}
                  </div>

                  {/* ── Inventory ── */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Gift className="w-3.5 h-3.5 text-white/30" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Inventory</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { icon: Shield, label: "Shields",  count: 0, color: "text-blue-400"   },
                        { icon: Swords, label: "Rugs",     count: 0, color: "text-red-400"    },
                        { icon: Zap,    label: "Drain",    count: 0, color: "text-orange-400" },
                        { icon: Star,   label: "Shards",   count: 0, color: "text-yellow-400" },
                      ].map(({ icon: Icon, label, count, color }) => (
                        <div key={label} className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/5 py-3">
                          <Icon className={`w-4 h-4 ${color}`} />
                          <span className="text-base font-bold text-white">{count}</span>
                          <span className="text-[9px] text-white/35 text-center leading-tight">{label}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-white/20 text-center mt-2">
                      Mystery boxes unlock in Phase 2
                    </p>
                  </div>

                  {/* ── Referral Codes ── */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Users className="w-3.5 h-3.5 text-white/30" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Referral Codes</span>
                      <span className="ml-auto text-[10px] text-white/25">+50 pts each</span>
                    </div>

                    {codesLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="w-4 h-4 animate-spin text-white/20" />
                      </div>
                    ) : activeCodes.length > 0 ? (
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
                      <p className="text-sm text-white/35 text-center py-3 bg-white/5 rounded-xl border border-white/10">
                        Codes being generated…
                      </p>
                    )}

                    {usedCodes.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <p className="text-[10px] text-white/25 mb-2 uppercase tracking-wide">
                          {usedCodes.length} code{usedCodes.length !== 1 ? "s" : ""} used
                        </p>
                        <div className="space-y-1.5">
                          {usedCodes.map((c: any) => (
                            <div key={c.code} className="flex items-center justify-between px-4 py-2 rounded-lg bg-white/5 border border-white/5">
                              <span className="font-mono text-xs text-white/35 tracking-widest">{c.code}</span>
                              <span className="text-[10px] text-white/25">Used</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Sign out ── */}
                  <button
                    onClick={() => { signOut(); onClose(); }}
                    className="w-full py-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm font-medium border border-red-500/10"
                  >
                    Sign Out
                  </button>

                  <div className="h-4" />
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
