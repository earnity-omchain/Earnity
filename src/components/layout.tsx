import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { api, queryKeys, supabase } from "@/lib/supabase";
import {
  LogOut, Menu, X, Trophy, Swords, LayoutDashboard,
  Home, User, Copy, Check, ExternalLink, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const ELEMENT_STYLES: Record<string, { text: string; border: string; bg: string }> = {
  fire:     { text: "text-orange-400", border: "border-orange-500/40", bg: "bg-orange-500/10" },
  water:    { text: "text-blue-400",   border: "border-blue-500/40",   bg: "bg-blue-500/10"   },
  nature:   { text: "text-green-400",  border: "border-green-500/40",  bg: "bg-green-500/10"  },
  rock:     { text: "text-stone-400",  border: "border-stone-500/40",  bg: "bg-stone-500/10"  },
  lighting: { text: "text-yellow-400", border: "border-yellow-400/40", bg: "bg-yellow-400/10" },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1 rounded hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
    >
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function ProfileDropdown({ profile, userGuild, fullProfile, onNavigate }: any) {
  const [open, setOpen] = useState(false);
  const { signOut } = useAuth();
  const [, setLocation] = useLocation();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const discordAvatar = fullProfile?.discord_avatar;
  const wallet = fullProfile?.wallet_address;
  const shortWallet = wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : null;
  const el = userGuild?.element ? ELEMENT_STYLES[userGuild.element] : null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-secondary/60 transition-colors"
      >
        {/* Avatar */}
        {discordAvatar ? (
          <img
            src={discordAvatar}
            alt={profile.username}
            className={`w-8 h-8 rounded-lg border ${el?.border || "border-border"} object-cover`}
          />
        ) : (
          <div className={`w-8 h-8 rounded-lg border ${el?.border || "border-border"} bg-secondary flex items-center justify-center`}>
            <span className="text-xs font-bold">{profile.username?.charAt(0).toUpperCase()}</span>
          </div>
        )}
        <div className="hidden md:block text-left">
          <div className="text-xs font-semibold leading-tight">{profile.username}</div>
          {userGuild && (
            <div className={`text-[10px] leading-tight ${el?.text || "text-muted-foreground"}`}>
              {userGuild.name}
            </div>
          )}
        </div>
        <ChevronDown className={`w-3 h-3 text-muted-foreground hidden md:block transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-border bg-card shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              {discordAvatar ? (
                <img src={discordAvatar} alt={profile.username} className={`w-12 h-12 rounded-xl border ${el?.border || "border-border"} object-cover`} />
              ) : (
                <div className={`w-12 h-12 rounded-xl border ${el?.border || "border-border"} bg-secondary flex items-center justify-center`}>
                  <span className="text-lg font-bold">{profile.username?.charAt(0).toUpperCase()}</span>
                </div>
              )}
              <div>
                <div className="font-semibold text-sm">{profile.username}</div>
                {userGuild && (
                  <div className={`text-xs ${el?.text || "text-muted-foreground"}`}>{userGuild.name}</div>
                )}
                <div className="text-xs text-muted-foreground mt-0.5">
                  {profile.contribution_score.toLocaleString()} pts
                </div>
              </div>
            </div>
          </div>

          {/* Wallet */}
          {shortWallet && (
            <div className="px-4 py-3 border-b border-border">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Bound Wallet</div>
              <div className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2">
                <span className="font-mono text-xs">{shortWallet}</span>
                <div className="flex items-center gap-1">
                  <CopyButton text={wallet} />
                  <a
                    href={`https://etherscan.io/address/${wallet}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 rounded hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="p-2">
            <button
              onClick={() => { setLocation("/profile"); setOpen(false); onNavigate?.(); }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
            >
              <User className="w-4 h-4" />
              View Profile
            </button>
            <button
              onClick={() => { signOut(); setOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [location] = useLocation();

  const { data: userGuild } = useQuery({
    queryKey: queryKeys.guild(profile?.guild_id ?? ""),
    queryFn: () => api.getGuild(profile!.guild_id!),
    enabled: !!profile?.guild_id,
  });

  // Full profile with avatar + wallet
  const { data: fullProfile } = useQuery({
    queryKey: ["full-profile-layout", profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("discord_avatar, wallet_address")
        .eq("id", profile!.id)
        .single();
      return data;
    },
    enabled: !!profile?.id,
  });

  const links = [
    { href: "/",           label: "Home",        icon: Home },
    { href: "/dashboard",  label: "Dashboard",   icon: LayoutDashboard, requiresAuth: true },
    { href: "/leaderboard",label: "Leaderboard", icon: Trophy },
    { href: "/guilds",     label: "Guilds",      icon: Swords },
  ];

  const closeMenu = () => setIsMobileMenuOpen(false);
  const el = userGuild?.element ? ELEMENT_STYLES[userGuild.element] : null;

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border w-60 px-4 py-5">
      <Link href="/" onClick={closeMenu}>
        <div className="flex items-center gap-2.5 mb-8 px-2 cursor-pointer">
          <div className="w-7 h-7 rounded overflow-hidden border border-border">
            <img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="Earnity" className="w-full h-full object-cover" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Earnity</span>
        </div>
      </Link>

      <nav className="flex-1 space-y-0.5">
        {links
          .filter((l) => !l.requiresAuth || !!profile)
          .map((link) => {
            const Icon = link.icon;
            const isActive = link.href === "/" ? location === "/" : location.startsWith(link.href);
            return (
              <Link key={link.href} href={link.href} onClick={closeMenu}>
                <div className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer text-sm ${
                  isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}>
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </div>
              </Link>
            );
          })}
      </nav>

      {/* Profile section at bottom of sidebar */}
      {profile ? (
        <div className="mt-auto pt-4 border-t border-sidebar-border">
          <div className={`rounded-xl border ${el?.border || "border-border"} ${el?.bg || "bg-secondary/50"} p-3`}>
            <div className="flex items-center gap-3">
              {(fullProfile as any)?.discord_avatar ? (
                <img
                  src={(fullProfile as any).discord_avatar}
                  alt={profile.username}
                  className={`w-10 h-10 rounded-lg border ${el?.border || "border-border"} object-cover flex-shrink-0`}
                />
              ) : (
                <div className={`w-10 h-10 rounded-lg border ${el?.border || "border-border"} bg-secondary flex items-center justify-center flex-shrink-0`}>
                  <span className="text-sm font-bold">{profile.username?.charAt(0).toUpperCase()}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{profile.username}</div>
                <div className={`text-xs truncate ${el?.text || "text-muted-foreground"}`}>
                  {userGuild?.name || "No guild"}
                </div>
              </div>
            </div>

            {/* Wallet preview */}
            {(fullProfile as any)?.wallet_address && (
              <div className="mt-2 pt-2 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {`${(fullProfile as any).wallet_address.slice(0, 6)}...${(fullProfile as any).wallet_address.slice(-4)}`}
                  </span>
                  <CopyButton text={(fullProfile as any).wallet_address} />
                </div>
              </div>
            )}

            {/* Score + actions */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Score</div>
                <div className="text-sm font-mono">{profile.contribution_score.toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-1">
                <Link href="/profile" onClick={closeMenu}>
                  <button className="p-1.5 rounded-md hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground">
                    <User className="w-4 h-4" />
                  </button>
                </Link>
                <button
                  onClick={signOut}
                  className="p-1.5 rounded-md hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-400"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-auto pt-4 border-t border-sidebar-border">
          <Link href="/connect" onClick={closeMenu}>
            <Button className="w-full h-9">Connect</Button>
          </Link>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background text-foreground">
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-sidebar">
        <Link href="/">
          <div className="flex items-center gap-2.5 cursor-pointer">
            <div className="w-6 h-6 rounded overflow-hidden border border-border">
              <img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="Earnity" className="w-full h-full object-cover" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Earnity</span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {/* Avatar in mobile top bar */}
          {profile && (
            <ProfileDropdown
              profile={profile}
              userGuild={userGuild}
              fullProfile={fullProfile}
              onNavigate={closeMenu}
            />
          )}
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen((v) => !v)} className="h-8 w-8">
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={closeMenu} />
          <div className="relative w-60 h-full bg-sidebar">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:block shrink-0">
        <SidebarContent />
      </aside>

      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8 md:py-12 w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
