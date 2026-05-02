import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, supabase, queryKeys } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowLeft, Wallet, User, Shield } from "lucide-react";

const ASSETS = {
  logo: import.meta.env.BASE_URL + "logo.jpg",
  fire:     import.meta.env.BASE_URL + "Fire.png",
  water:    import.meta.env.BASE_URL + "Water.png",
  nature:   import.meta.env.BASE_URL + "Nature.png",
  rock:     import.meta.env.BASE_URL + "Rock.png",
  lighting: import.meta.env.BASE_URL + "Lightning.png",
};

const ELEMENT_STYLES: Record<string, { text: string; border: string; bg: string; img: string }> = {
  fire:     { text: "text-orange-400", border: "border-orange-500/40", bg: "bg-orange-500/10", img: ASSETS.fire },
  water:    { text: "text-blue-400",   border: "border-blue-500/40",   bg: "bg-blue-500/10",   img: ASSETS.water },
  nature:   { text: "text-green-400",  border: "border-green-500/40",  bg: "bg-green-500/10",  img: ASSETS.nature },
  rock:     { text: "text-stone-400",  border: "border-stone-500/40",  bg: "bg-stone-500/10",  img: ASSETS.rock },
  lighting: { text: "text-yellow-400", border: "border-yellow-400/40", bg: "bg-yellow-400/10", img: ASSETS.lighting },
};

// Step order: guild first (pledge), then username, then wallet
type Step = "guild" | "profile" | "wallet";

export default function Connect() {
  const [step, setStep] = useState<Step>("guild");
  const [username, setUsername] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [selectedGuild, setSelectedGuild] = useState<string | null>(null);
  const { session, profile, refreshProfile } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Redirect if not logged in
  useEffect(() => {
    if (!session) setLocation("/");
  }, [session, setLocation]);

  // Auto-advance based on what's already done
  useEffect(() => {
    if (!profile) return;
    // If they came from Rabel (already have guild_id), skip guild step
    if (profile.guild_id && !profile.username) { setStep("profile"); return; }
    if (profile.guild_id && profile.username && !profile.wallet_address) { setStep("wallet"); return; }
    if (profile.guild_id && profile.username && profile.wallet_address) {
      setLocation("/dashboard");
    }
  }, [profile, setLocation]);

  // Fetch guilds for the pledge step
  const { data: guilds, isLoading: guildsLoading } = useQuery({
    queryKey: queryKeys.guilds(),
    queryFn: api.listGuilds,
    enabled: step === "guild",
  });

  // Join guild
  const joinGuildMutation = useMutation({
    mutationFn: async (guildId: string) => {
      if (!session?.user?.id) throw new Error("Not authenticated");
      return api.joinGuild(session.user.id, guildId);
    },
    onSuccess: async () => {
      await refreshProfile();
      setStep("profile");
    },
  });

  // Update username
  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!session?.user?.id) throw new Error("Not authenticated");
      return api.updateUsername(session.user.id, username.trim());
    },
    onSuccess: async () => {
      await refreshProfile();
      setStep("wallet");
    },
  });

  // Bind wallet
  const bindWalletMutation = useMutation({
    mutationFn: async () => {
      if (!session?.user?.id) throw new Error("Not authenticated");
      const finalWallet = walletAddress.trim() ||
        "0x" + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
      return api.bindWallet(session.user.id, finalWallet);
    },
    onSuccess: async () => {
      await refreshProfile();
      setLocation("/dashboard");
    },
  });

  const handleGuildSelect = (guildId: string) => {
    setSelectedGuild(guildId);
    joinGuildMutation.mutate(guildId);
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    updateProfileMutation.mutate();
  };

  const handleWalletSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    bindWalletMutation.mutate();
  };

  if (!session) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stepNumber = step === "guild" ? "01" : step === "profile" ? "02" : "03";
  const totalSteps = 3;

  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-7 h-7 rounded overflow-hidden border border-border">
              <img src={ASSETS.logo} alt="Earnity" className="w-full h-full object-cover" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Earnity</span>
          </Link>
          {/* Step progress dots */}
          <div className="flex items-center gap-2">
            {["guild", "profile", "wallet"].map((s, i) => (
              <div key={s} className={`w-2 h-2 rounded-full transition-all ${
                s === step ? "bg-primary scale-125" :
                ["guild", "profile", "wallet"].indexOf(step) > i ? "bg-primary/40" : "bg-border"
              }`} />
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: "spring", damping: 20 }}
            className="w-full max-w-sm"
          >

            {/* ── STEP 1: PICK A GUILD ── */}
            {step === "guild" && (
              <div>
                <div className="mb-8">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Step 01 / 03</div>
                  <h1 className="text-3xl font-semibold tracking-tight">Swear Allegiance</h1>
                  <p className="mt-2 text-sm text-muted-foreground">Choose a guild to pledge your loyalty.</p>
                </div>

                {guildsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : guilds && guilds.length > 0 ? (
                  <div className="space-y-3">
                    {guilds.map((guild) => {
                      const el = ELEMENT_STYLES[guild.element] || ELEMENT_STYLES.fire;
                      const isSelected = selectedGuild === guild.id;
                      return (
                        <button
                          key={guild.id}
                          onClick={() => handleGuildSelect(guild.id)}
                          disabled={joinGuildMutation.isPending}
                          className={`w-full text-left rounded-xl border p-4 transition-all ${
                            isSelected ? `${el.border} ${el.bg}` : "border-border bg-card hover:bg-secondary/40"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg ${el.bg} border ${el.border} flex items-center justify-center flex-shrink-0`}>
                              <img src={el.img} alt={guild.element} className="w-6 h-6 object-contain" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium">{guild.name}</div>
                              <div className={`text-xs mt-0.5 ${el.text}`}>
                                {guild.element.charAt(0).toUpperCase() + guild.element.slice(1)} · {guild.member_count} members · {guild.total_score.toLocaleString()} pts
                              </div>
                            </div>
                            {isSelected && joinGuildMutation.isPending && (
                              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground flex-shrink-0" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No guilds available yet.</p>
                    <p className="text-xs mt-1">Check back soon — guild requests are being reviewed.</p>
                  </div>
                )}

                {joinGuildMutation.isError && (
                  <p className="mt-3 text-sm text-destructive text-center">
                    {joinGuildMutation.error instanceof Error ? joinGuildMutation.error.message : "Failed to join guild"}
                  </p>
                )}
              </div>
            )}

            {/* ── STEP 2: USERNAME ── */}
            {step === "profile" && (
              <div>
                <div className="mb-8">
                  <button
                    onClick={() => setStep("guild")}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
                  >
                    <ArrowLeft className="w-3 h-3" /> Back
                  </button>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Step 02 / 03</div>
                  <h1 className="text-3xl font-semibold tracking-tight">Your Name</h1>
                  <p className="mt-2 text-sm text-muted-foreground">What should the guilds call you?</p>
                </div>

                <form onSubmit={handleProfileSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-xs uppercase tracking-wider text-muted-foreground">
                      Display Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="username"
                        placeholder="Satoshi"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="pl-9 bg-card border-border h-11"
                        required
                        autoFocus
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-11" disabled={updateProfileMutation.isPending || !username.trim()}>
                    {updateProfileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue"}
                  </Button>
                </form>
              </div>
            )}

            {/* ── STEP 3: WALLET ── */}
            {step === "wallet" && (
              <div>
                <div className="mb-8">
                  <button
                    onClick={() => setStep("profile")}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
                  >
                    <ArrowLeft className="w-3 h-3" /> Back
                  </button>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Step 03 / 03</div>
                  <h1 className="text-3xl font-semibold tracking-tight">Bind Wallet</h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Link your wallet address, or leave blank to generate one.
                  </p>
                </div>

                <form onSubmit={handleWalletSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="wallet" className="text-xs uppercase tracking-wider text-muted-foreground">
                      Wallet Address
                    </Label>
                    <div className="relative">
                      <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="wallet"
                        placeholder="0x…"
                        value={walletAddress}
                        onChange={(e) => setWalletAddress(e.target.value)}
                        className="pl-9 font-mono text-sm bg-card border-border h-11"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-11" disabled={bindWalletMutation.isPending}>
                    {bindWalletMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enter the Protocol"}
                  </Button>
                  {bindWalletMutation.isError && (
                    <p className="text-sm text-destructive">
                      {bindWalletMutation.error instanceof Error ? bindWalletMutation.error.message : "Failed to bind wallet"}
                    </p>
                  )}
                </form>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
