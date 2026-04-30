import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import { LogOut, Menu, X, Trophy, Swords, LayoutDashboard, Settings, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, login } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newUsername, setNewUsername] = useState(user?.username || "");
  const [location] = useLocation();
  const queryClient = useQueryClient();

  const { data: userGuild } = useQuery({
    queryKey: queryKeys.guild(user?.guildId ?? ""),
    queryFn: () => api.getGuild(user!.guildId!),
    enabled: !!user?.guildId,
  });

  const updateUsernameMutation = useMutation({
    mutationFn: ({ username }: { username: string }) =>
      api.updateUsername(user!.id, username),
    onSuccess: (updatedUser) => {
      login(updatedUser);
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.user(user.id) });
      }
      setIsSettingsOpen(false);
      toast({ title: "Updated", description: "Display name saved." });
    },
  });

  const handleUpdateUsername = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !newUsername.trim()) return;
    updateUsernameMutation.mutate({ username: newUsername.trim() });
  };

  const links = [
    { href: "/", label: "Home", icon: Home },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, requiresAuth: true },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { href: "/guilds", label: "Guilds", icon: Swords },
  ];

  const closeMenu = () => setIsMobileMenuOpen(false);

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border w-60 px-4 py-5">
      <Link href="/" onClick={closeMenu}>
        <div className="flex items-center gap-2.5 mb-8 px-2 cursor-pointer">
          <div className="w-7 h-7 rounded overflow-hidden border border-border">
            <img
              src={`${import.meta.env.BASE_URL}logo.jpg`}
              alt="Earnity"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-sm font-semibold tracking-tight">Earnity</span>
        </div>
      </Link>

      <nav className="flex-1 space-y-0.5">
        {links
          .filter((l) => !l.requiresAuth || !!user)
          .map((link) => {
            const Icon = link.icon;
            const isActive =
              link.href === "/" ? location === "/" : location.startsWith(link.href);
            return (
              <Link key={link.href} href={link.href} onClick={closeMenu}>
                <div
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer text-sm ${
                    isActive
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </div>
              </Link>
            );
          })}
      </nav>

      {user ? (
        <div className="mt-auto pt-4 border-t border-sidebar-border space-y-3">
          <div className="px-3 py-2 rounded-md bg-secondary/50">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{user.username}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {userGuild ? userGuild.name : "No guild"}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Score
                </div>
                <div className="text-sm font-mono tabular-nums">
                  {user.contributionScore.toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                      <DialogTitle>Profile</DialogTitle>
                      <DialogDescription>Update your display name.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdateUsername} className="space-y-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="settings-username"
                          className="text-xs uppercase tracking-wider text-muted-foreground"
                        >
                          Display name
                        </Label>
                        <Input
                          id="settings-username"
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                        />
                      </div>
                      <DialogFooter>
                        <Button
                          type="submit"
                          disabled={
                            updateUsernameMutation.isPending ||
                            !newUsername.trim() ||
                            newUsername === user.username
                          }
                        >
                          {updateUsernameMutation.isPending ? "Saving…" : "Save"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={logout}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
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
              <img
                src={`${import.meta.env.BASE_URL}logo.jpg`}
                alt="Earnity"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-sm font-semibold tracking-tight">Earnity</span>
          </div>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileMenuOpen((v) => !v)}
          className="h-8 w-8"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Mobile drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={closeMenu}
          />
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
