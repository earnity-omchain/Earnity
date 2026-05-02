import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, supabase, queryKeys } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowLeft, Shield, Swords, Sparkles, CheckCircle } from "lucide-react";

const ELEMENTS = [
  { id: "fire",      name: "Fire",      emoji: "🔥", color: "text-orange-400", border: "border-orange-500/40", bg: "bg-orange-500/10" },
  { id: "water",     name: "Water",     emoji: "💧", color: "text-blue-400",   border: "border-blue-500/40",   bg: "bg-blue-500/10"   },
  { id: "nature",    name: "Nature",    emoji: "🌿", color: "text-green-400",  border: "border-green-500/40",  bg: "bg-green-500/10"  },
  { id: "rock",      name: "Rock",      emoji: "🪨", color: "text-stone-400",  border: "border-stone-500/40",  bg: "bg-stone-500/10"  },
  { id: "lightning", name: "Lightning", emoji: "⚡", color: "text-yellow-400", border: "border-yellow-400/40", bg: "bg-yellow-400/10" },
] as const;

type Step = "code" | "choice" | "rebel" | "pledge" | "done";

export default function Connect() {
  const { session, profile, isInitializing, refreshProfile } = useAuth();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>("code");
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [guildName, setGuildName] = useState("");
  const [element, setElement] = useState<string | null>(null);
  const [xUsername, setXUsername] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!isInitializing && !session) setLocation("/");
  }, [session, isInitializing, setLocation]);

  // Redirect if already fully set up
  useEffect(() => {
    if (!profile) return;
    if (profile.invite_code_used && profile.guild_id) {
      setLocation("/dashboard");
    } else if (profile.invite_code_used) {
      setStep("choice");
    }
  }, [profile, setLocation]);

  // Fetch guilds for pledge step
  const { data: guilds, isLoading: guildsLoading } = useQuery({
    queryKey: queryKeys.guilds(),
    queryFn: api.listGuilds,
    enabled: step === "pledge",
  });

  // Redeem invite code
  const redeemMutation = useMutation({
    mutationFn: async () => {
      if (!session?.user?.id) throw new Error("Not authenticated");
      const result = await supabase.rpc("redeem_invite_code", {
        p_user_id: session.user.id,
        p_code: code.trim().toUpperCase(),
      });
      if (result.error) throw result.error;
      if (!result.data?.success) throw new Error(result.data?.error || "Invalid code");
      return result.data;
    },
    onSuccess: async () => {
      await refreshProfile();
      setStep("choice");
    },
    onError: (err: Error) => {
      setCodeError(err.message || "Invalid or already used code");
    },
  });

  // Submit guild request (rebel path)
  const guildRequestMutation = useMutation({
    mutationFn: async () => {
      if (!session?.user?.id) throw new Error("Not authenticated");
      const { error } = await supabase.from("guild_requests").insert({
        user_id: session.user.id,
        guild_name: guildName.trim(),
        element,
        x_username: xUsername.trim().replace(/^@/, ""),
      });
      if (error) throw error;
    },
    onSuccess: () => setSubmitted(true),
  });

  // Join guild (pledge path)
  const joinGuildMutation = useMutation({
    mutationFn: async (guildId: string) => {
      if (!session?.user?.id) throw new Error("Not authenticated");
      return api.joinGuild(session.user.id, guildId);
    },
    onSuccess: async () => {
      await refreshProfile();
      setLocation("/dashboard");
    },
  });

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError("");
    redeemMutation.mutate();
  };

  const handleGuildRequest = (e: React.FormEvent) => {
    e.preventDefault();
    guildRequestMutation.mutate();
  };

  if (isInitializing || !session) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-background">
      <div className="flex-1 flex items-center justify-center p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ type: "spring", damping: 22 }}
            className="w-full max-w-sm"
          >

            {/* ── STEP 1: INVITE CODE ── */}
            {step === "code" && (
              <div>
                <div className="mb-8">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Step 01</div>
                  <h1 className="text-3xl font-semibold tracking-tight">Enter your code</h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Earnity is invite-only. Each code is single-use and bound to your Discord.
                  </p>
                </div>
                <form onSubmit={handleCodeSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                      Invite code
                    </Label>
                    <Input
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                      placeholder="XXXXXXXX"
                      className="font-mono text-lg tracking-[0.2em] text-center h-14 bg-card border-border uppercase"
                      maxLength={8}
                      disabled={redeemMutation.isPending}
                      autoFocus
                    />
                  </div>
                  {codeError && (
                    <p className="text-sm text-destructive">{codeError}</p>
                  )}
                  <Button
                    type="submit"
                    className="w-full h-11"
                    disabled={redeemMutation.isPending || code.length < 6}
                  >
                    {redeemMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify code"}
                  </Button>
                </form>
              </div>
            )}

            {/* ── STEP 2: CHOICE ── */}
            {step === "choice" && (
              <div>
                <div className="mb-8">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Step 02</div>
                  <h1 className="text-3xl font-semibold tracking-tight">Choose your path</h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    This defines who you are. Choose carefully.
                  </p>
                </div>
                <div className="space-y-4">
                  <button
                    onClick={() => setStep("pledge")}
                    className="group w-full border border-border rounded-xl p-5 text-left hover:border-foreground/30 hover:bg-secondary/30 transition-all"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div className="font-semibold">Pledge Allegiance</div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Join an existing guild. Fight alongside your brothers and sisters. Rise together.
                    </p>
                  </button>

                  <button
                    onClick={() => setStep("rebel")}
                    className="group w-full border border-border rounded-xl p-5 text-left hover:border-foreground/30 hover:bg-secondary/30 transition-all"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                        <Swords className="w-4 h-4" />
                      </div>
                      <div className="font-semibold">Rebel</div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Create your own guild. Lead from the front. Only 20 guilds will ever exist — first come, first served.
                    </p>
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 3A: REBEL (Guild Request) ── */}
            {step === "rebel" && !submitted && (
              <div>
                <button
                  onClick={() => { setStep("choice"); setElement(null); setGuildName(""); }}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6"
                >
                  <ArrowLeft className="w-3 h-3" /> Back
                </button>
                <div className="mb-6">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Guild Request</div>
                  <h1 className="text-3xl font-semibold tracking-tight">Create a Guild</h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    We'll review and set up your guild. You'll be assigned Guild Master.
                  </p>
                </div>

                <form onSubmit={handleGuildRequest} className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Guild name</Label>
                    <Input
                      value={guildName}
                      onChange={(e) => setGuildName(e.target.value)}
                      placeholder="e.g. Emberborn"
                      maxLength={32}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Element</Label>
                    <div className="grid grid-cols-5 gap-2">
                      {ELEMENTS.map((el) => (
                        <button
                          key={el.id}
                          type="button"
                          onClick={() => setElement(el.id)}
                          className={`border rounded-lg py-3 flex flex-col items-center gap-1 transition-all text-xs font-medium ${
                            element === el.id
                              ? `${el.border} ${el.bg} ${el.color}`
                              : "border-border text-muted-foreground hover:bg-secondary/40"
                          }`}
                        >
                          <span className="text-base">{el.emoji}</span>
                          <span>{el.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">X (Twitter) username</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                      <Input
                        value={xUsername}
                        onChange={(e) => setXUsername(e.target.value.replace(/^@/, ""))}
                        placeholder="yourhandle"
                        className="pl-7"
                        required
                      />
                    </div>
                  </div>

                  {guildRequestMutation.isError && (
                    <p className="text-sm text-destructive">
                      {guildRequestMutation.error instanceof Error ? guildRequestMutation.error.message : "Failed to submit"}
                    </p>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-11"
                    disabled={guildRequestMutation.isPending || !guildName.trim() || !element || !xUsername.trim()}
                  >
                    {guildRequestMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit request"}
                  </Button>
                </form>
              </div>
            )}

            {/* ── REBEL SUCCESS ── */}
            {step === "rebel" && submitted && (
              <div className="text-center space-y-5">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
                <div>
                  <h2 className="text-2xl font-semibold">Request sent</h2>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    Your guild request is in. We'll review it and set you up as Guild Master before the countdown ends.
                  </p>
                </div>
                <Button className="w-full" onClick={() => setLocation("/leaderboard")}>
                  View leaderboard
                </Button>
              </div>
            )}

            {/* ── STEP 3B: PLEDGE (Join Guild) ── */}
            {step === "pledge" && (
              <div>
                <button
                  onClick={() => setStep("choice")}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6"
                >
                  <ArrowLeft className="w-3 h-3" /> Back
                </button>
                <div className="mb-6">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Step 03</div>
                  <h1 className="text-3xl font-semibold tracking-tight">Swear Allegiance</h1>
                  <p className="mt-2 text-sm text-muted-foreground">Choose your guild. This cannot be changed.</p>
                </div>

                {guildsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : guilds?.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No guilds available yet. Check back after the countdown.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {guilds?.map((guild) => (
                      <button
                        key={guild.id}
                        onClick={() => joinGuildMutation.mutate(guild.id)}
                        disabled={joinGuildMutation.isPending}
                        className="w-full text-left rounded-xl border border-border bg-card hover:bg-secondary/40 p-4 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{guild.name}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {guild.member_count} members · {guild.total_score.toLocaleString()} pts
                            </div>
                          </div>
                          {joinGuildMutation.isPending && (
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
