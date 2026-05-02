import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import {
  Copy, Check, Wallet, Users, Star, Gift,
  Zap, Shield, Swords, ExternalLink,
} from "lucide-react";
import { useState } from "react";

const ELEMENT_STYLES: Record<string, { text: string; border: string; bg: string; glow: string }> = {
  fire:     { text: "text-orange-400", border: "border-orange-500/30", bg: "bg-orange-500/10", glow: "shadow-orange-500/20" },
  water:    { text: "text-blue-400",   border: "border-blue-500/30",   bg: "bg-blue-500/10",   glow: "shadow-blue-500/20"   },
  nature:   { text: "text-green-400",  border: "border-green-500/30",  bg: "bg-green-500/10",  glow: "shadow-green-500/20"  },
  rock:     { text: "text-stone-400",  border: "border-stone-500/30",  bg: "bg-stone-500/10",  glow: "shadow-stone-500/20"  },
  lighting: { text: "text-yellow-400", border: "border-yellow-400/30", bg: "bg-yellow-400/10", glow: "shadow-yellow-400/20" },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="p-1.5 rounded-md hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground">
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function Profile() {
  const { session, profile } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch extended profile data
  const { data: fullProfile } = useQuery({
    queryKey: ["full-profile", session?.user?.id],
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

  // Fetch referral codes
  const { data: referralCodes } = useQuery({
    queryKey: ["referral-codes", session?.user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("invite_codes")
        .select("code, is_active, used_at, used_by")
        .eq("created_by", session!.user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
    enabled: !!session?.user?.id,
  });

  if (!session || !profile) return null;

  const guild = (fullProfile as any)?.guilds;
  const elStyle = guild?.element ? ELEMENT_STYLES[guild.element] || ELEMENT_STYLES.fire : null;
  const discordAvatar = (fullProfile as any)?.discord_avatar;
  const wallet = (fullProfile as any)?.wallet_address;
  const score = (fullProfile as any)?.contribution_score ?? 0;
  const activeCodes = referralCodes?.filter(c => c.is_active && !c.used_by) ?? [];
  const usedCodes = referralCodes?.filter(c => c.used_by) ?? [];

  const shortWallet = wallet
    ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}`
    : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      {/* ── PROFILE CARD ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl border border-border bg-card overflow-hidden"
      >
        {/* Background glow based on element */}
        {elStyle && (
          <div className={`absolute inset-0 ${elStyle.bg} opacity-30 pointer-events-none`} />
        )}

        <div className="relative p-6">
          <div className="flex items-start gap-5">
            {/* Discord avatar */}
            <div className="relative flex-shrink-0">
              {discordAvatar ? (
                <img
                  src={discordAvatar}
                  alt={profile.username}
                  className={`w-20 h-20 rounded-2xl border-2 ${elStyle?.border || "border-border"} object-cover shadow-lg ${elStyle?.glow || ""}`}
                />
              ) : (
                <div className={`w-20 h-20 rounded-2xl border-2 ${elStyle?.border || "border-border"} bg-secondary flex items-center justify-center`}>
                  <span className="text-2xl font-bold text-muted-foreground">
                    {profile.username?.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              {/* Online indicator */}
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-card" />
            </div>

            {/* Name + guild */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold tracking-tight truncate">{profile.username}</h1>
              {guild ? (
                <button
                  onClick={() => setLocation(`/guild/${guild.id}`)}
                  className={`inline-flex items-center gap-1.5 mt-1 text-sm ${elStyle?.text} hover:underline`}
                >
                  {guild.name}
                  <ExternalLink className="w-3 h-3" />
                </button>
              ) : (
                <span className="text-sm text-muted-foreground mt-1 block">No guild</span>
              )}

              {/* Stats row */}
              <div className="flex items-center gap-4 mt-3">
                <div className="text-center">
                  <div className="text-lg font-bold">{score.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Points</div>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="text-center">
                  <div className="text-lg font-bold">{usedCodes.length}</div>
                  <div className="text-xs text-muted-foreground">Referrals</div>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="text-center">
                  <div className="text-lg font-bold">{usedCodes.length * 50}</div>
                  <div className="text-xs text-muted-foreground">Ref. pts</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── WALLET ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border bg-card p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Bound Wallet</h2>
        </div>

        {wallet ? (
          <div className="flex items-center justify-between bg-secondary/50 rounded-xl px-4 py-3">
            <span className="font-mono text-sm">{shortWallet}</span>
            <div className="flex items-center gap-1">
              <CopyButton text={wallet} />
              <a
                href={`https://etherscan.io/address/${wallet}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-md hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground text-center py-3">
            No wallet bound yet.
          </div>
        )}
      </motion.div>

      {/* ── INVENTORY (placeholder for Phase 2B) ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-2xl border border-border bg-card p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Gift className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Inventory</h2>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[
            { icon: Shield, label: "Shields", count: 0, color: "text-blue-400" },
            { icon: Swords, label: "Rug Cards", count: 0, color: "text-red-400" },
            { icon: Zap, label: "Drainers", count: 0, color: "text-orange-400" },
            { icon: Star, label: "Shards", count: 0, color: "text-yellow-400" },
          ].map(({ icon: Icon, label, count, color }) => (
            <div key={label} className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-secondary/30 p-3">
              <Icon className={`w-5 h-5 ${color}`} />
              <span className="text-lg font-bold">{count}</span>
              <span className="text-[10px] text-muted-foreground text-center leading-tight">{label}</span>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Mystery boxes unlock in Phase 2 — coming soon
        </p>
      </motion.div>

      {/* ── REFERRAL CODES ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border border-border bg-card p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Referral Codes</h2>
          <span className="ml-auto text-xs text-muted-foreground">+50 pts per referral</span>
        </div>

        {activeCodes.length > 0 ? (
          <div className="space-y-2">
            {activeCodes.map((c) => (
              <div key={c.code} className="flex items-center justify-between bg-secondary/50 rounded-xl px-4 py-3">
                <span className="font-mono text-sm tracking-widest">{c.code}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-green-400">Active</span>
                  <CopyButton text={c.code} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-3">
            Your referral codes are being generated…
          </p>
        )}

        {usedCodes.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">{usedCodes.length} code{usedCodes.length > 1 ? "s" : ""} used</p>
            <div className="space-y-1.5">
              {usedCodes.map((c) => (
                <div key={c.code} className="flex items-center justify-between px-4 py-2 rounded-lg bg-secondary/20">
                  <span className="font-mono text-xs text-muted-foreground tracking-widest">{c.code}</span>
                  <span className="text-xs text-muted-foreground">Used</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

    </div>
  );
}
