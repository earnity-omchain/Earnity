import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, supabase, queryKeys } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, Wallet, User } from "lucide-react";

const ASSETS = {
  logo: import.meta.env.BASE_URL + "logo.jpg",
};

type Step = "profile" | "wallet" | "guild";

export default function Connect() {
  const [step, setStep] = useState<Step>("profile");
  const [username, setUsername] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [selectedGuild, setSelectedGuild] = useState<string | null>(null);
  const { session, profile } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!session) { setLocation("/"); }
  }, [session, setLocation]);

  const { data: guilds, isLoading: guildsLoading } = useQuery({
    queryKey: queryKeys.guilds(),
    queryFn: api.listGuilds,
    enabled: step === "guild",
  });

  useEffect(() => {
    if (!profile) { setStep("profile"); return; }
    if (!profile.wallet_address) { setStep("wallet"); return; }
    if (!profile.guild_id) { setStep("guild"); return; }
    setLocation("/dashboard");
  }, [profile, setLocation]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!session?.user?.id) throw new Error("Not authenticated");
      return api.updateUsername(session.user.id, username.trim());
    },
    onSuccess: () => { setStep("wallet"); },
  });

  const bindWalletMutation = useMutation({
    mutationFn: async () => {
      if (!session?.user?.id) throw new Error("Not authenticated");
      const finalWallet = walletAddress.trim() || "0x" + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
      return api.bindWallet(session.user.id, finalWallet);
    },
    onSuccess: () => { setStep("guild"); },
  });

  const joinGuildMutation = useMutation({
    mutationFn: async (guildId: string) => {
      if (!session?.user?.id) throw new Error("Not authenticated");
      return api.joinGuild(session.user.id, guildId);
    },
    onSuccess: () => { setLocation("/dashboard"); },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    updateProfileMutation.mutate();
  };

  const handleWalletSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    bindWalletMutation.mutate();
  };

  const handleGuildSelect = (guildId: string) => {
    setSelectedGuild(guildId);
    joinGuildMutation.mutate(guildId);
  };

  if (!session) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-background">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-7 h-7 rounded overflow-hidden border border-border">
              <img src={ASSETS.logo} alt="Earnity" className="w-full h-full object-cover" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Earnity</span>
          </Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Back</Link>
        </div>
      </header>
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", damping: 20 }} className="w-full max-w-sm">
          {step === "profile" && (
            <div>
              <div className="mb-8">
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Step 01</div>
                <h1 className="text-3xl font-semibold tracking-tight">Your Name</h1>
                <p className="mt-2 text-sm text-muted-foreground">What should the guilds call you?</p>
              </div>
              <form onSubmit={handleProfileSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-xs uppercase tracking-wider text-muted-foreground">Display Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="username" placeholder="Satoshi" value={username} onChange={(e) => setUsername(e.target.value)} className="pl-9 bg-card border-border h-11" required autoFocus />
                  </div>
                </div>
                <Button type="submit" className="w-full h-11" disabled={updateProfileMutation.isPending || !username.trim()}>
                  {updateProfileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue"}
                </Button>
              </form>
            </div>
          )}
          {step === "wallet" && (
            <div>
              <div className="mb-8">
                <button onClick={() => setStep("profile")} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3">
                  <ArrowLeft className="w-3 h-3" /> Back
                </button>
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Step 02</div>
                <h1 className="text-3xl font-semibold tracking-tight">Bind Wallet</h1>
                <p className="mt-2 text-sm text-muted-foreground">Link your wallet address, or leave blank to generate one.</p>
              </div>
              <form onSubmit={handleWalletSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="wallet" className="text-xs uppercase tracking-wider text-muted-foreground">Wallet Address</Label>
                  <div className="relative">
                    <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="wallet" placeholder="0x..." value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} className="pl-9 font-mono text-sm bg-card border-border h-11" />
                  </div>
                </div>
                <Button type="submit" className="w-full h-11" disabled={bindWalletMutation.isPending}>
                  {bindWalletMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue"}
                </Button>
                {bindWalletMutation.isError && (
                  <p className="text-sm text-destructive">{bindWalletMutation.error instanceof Error ? bindWalletMutation.error.message : "Failed to bind wallet"}</p>
                )}
              </form>
            </div>
          )}
          {step === "guild" && (
            <div>
              <div className="mb-8">
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Step 03</div>
                <h1 className="text-3xl font-semibold tracking-tight">Swear Allegiance</h1>
                <p className="mt-2 text-sm text-muted-foreground">Choose a guild to pledge your loyalty.</p>
              </div>
              {guildsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-3">
                  {guilds?.map((guild) => (
                    <button key={guild.id} onClick={() => handleGuildSelect(guild.id)} disabled={joinGuildMutation.isPending && selectedGuild === guild.id} className={"w-full text-left rounded-xl border p-4 transition-all " + (selectedGuild === guild.id ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-secondary/40")}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{guild.name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{guild.member_count} members - {guild.total_score.toLocaleString()} pts</div>
                        </div>
                        {selectedGuild === guild.id && joinGuildMutation.isPending && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
