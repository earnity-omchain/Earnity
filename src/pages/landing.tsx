import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Shield, Swords, CheckCircle2, AlertCircle, Sparkles, ArrowLeft, LogIn } from "lucide-react";
import { api, supabase } from "@/lib/supabase";

const ASSETS = {
  background: import.meta.env.BASE_URL + "background-1.png",
  seal: import.meta.env.BASE_URL + "Seal2.png",
  fire: import.meta.env.BASE_URL + "Fire.png",
  water: import.meta.env.BASE_URL + "Water.png",
  nature: import.meta.env.BASE_URL + "Nature.png",
  rock: import.meta.env.BASE_URL + "Rock.png",
  lighting: import.meta.env.BASE_URL + "Lightning.png",
};

type Phase = "gate" | "auth" | "code" | "validating" | "choice" | "rabel" | "pledge";

const ELEMENTS = [
  { id: "fire", name: "Fire", img: ASSETS.fire, text: "text-orange-400", border: "border-orange-500/40", bg: "bg-orange-500/10", ring: "ring-orange-500/30" },
  { id: "water", name: "Water", img: ASSETS.water, text: "text-blue-400", border: "border-blue-500/40", bg: "bg-blue-500/10", ring: "ring-blue-500/30" },
  { id: "nature", name: "Nature", img: ASSETS.nature, text: "text-green-400", border: "border-green-500/40", bg: "bg-green-500/10", ring: "ring-green-500/30" },
  { id: "rock", name: "Rock", img: ASSETS.rock, text: "text-stone-400", border: "border-stone-500/40", bg: "bg-stone-500/10", ring: "ring-stone-500/30" },
  { id: "lighting", name: "Lightning", img: ASSETS.lighting, text: "text-yellow-400", border: "border-yellow-400/40", bg: "bg-yellow-400/10", ring: "ring-yellow-400/30" },
];

export default function Landing() {
  const [phase, setPhase] = useState<Phase>("gate");
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [guildName, setGuildName] = useState("");
  const [, setLocation] = useLocation();

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["landing-session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { data: accessStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["access-status", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      const { data } = await supabase
        .from("profiles")
        .select("guild_id, invite_code_used, discord_id")
        .eq("id", session.user.id)
        .single();
      return data;
    },
    enabled: !!session?.user?.id,
  });

  useEffect(() => {
    if (sessionLoading || statusLoading) return;
    if (!session) { setPhase("gate"); return; }
    if (!accessStatus) { setPhase("auth"); return; }
    if (!accessStatus.invite_code_used) { setPhase("code"); return; }
    if (accessStatus.guild_id) { setLocation("/dashboard"); return; }
    setPhase("choice");
  }, [session, accessStatus, sessionLoading, statusLoading, setLocation]);

  const handleDiscordLogin = async () => {
    const { data, error } = await api.auth.signInWithDiscord();
    if (error) { console.error("Discord OAuth error:", error); return; }
    if (data?.url) { window.location.href = data.url; }
  };

  const validateMutation = useMutation({
    mutationFn: async (accessCode: string) => {
      if (!session?.user?.id) throw new Error("Not authenticated");
      const result = await api.redeemInviteCode(accessCode);
      if (!result.success) throw new Error(result.error || "Failed to redeem code");
      return result;
    },
    onSuccess: () => {
      setPhase("validating");
      setTimeout(() => setPhase("choice"), 1800);
    },
    onError: (err: Error) => { setCodeError(err.message || "Invalid access code"); },
  });

  const createGuildMutation = useMutation({
    mutationFn: api.createGuild,
    onSuccess: () => { setTimeout(() => setLocation("/dashboard"), 800); },
  });

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError("");
    if (!code.trim()) return;
    validateMutation.mutate(code.trim());
  };

  const handleElementSelect = (id: string) => { setSelectedElement(id); };

  const handleGuildSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedElement || !guildName.trim()) return;
    createGuildMutation.mutate({ name: guildName.trim(), element: selectedElement });
  };

  useEffect(() => {
    if (phase === "pledge") setLocation("/connect");
  }, [phase, setLocation]);

  const selectedEl = ELEMENTS.find((e) => e.id === selectedElement);

  if (sessionLoading || statusLoading) {
    return (
      <div className="relative min-h-[100dvh] w-full overflow-hidden bg-black">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url(" + ASSETS.background + ")" }} />
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 min-h-[100dvh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-black text-foreground">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url(" + ASSETS.background + ")" }} />
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
      <div className="relative z-10 min-h-[100dvh] flex flex-col">
        <AnimatePresence mode="wait">
          {phase === "gate" && (
            <motion.div key="gate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.5 }} className="flex-1 flex items-center justify-center p-6">
              <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", damping: 20, delay: 0.1 }} className="w-full max-w-sm">
                <div className="text-center mb-8">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }} className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
                    <Shield className="w-8 h-8 text-primary-foreground" />
                  </motion.div>
                  <h1 className="text-3xl font-bold tracking-tight">Earnity</h1>
                  <p className="mt-2 text-sm text-muted-foreground">Private beta access</p>
                </div>
                <Button onClick={handleDiscordLogin} className="w-full h-12 gap-2 text-sm font-semibold">
                  <LogIn className="w-4 h-4" />
                  Sign in with Discord
                </Button>
                <p className="mt-6 text-center text-xs text-muted-foreground/60">50 access codes only. Discord required.</p>
              </motion.div>
            </motion.div>
          )}

          {phase === "auth" && (
            <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Creating your profile...</p>
              </div>
            </motion.div>
          )}

          {phase === "code" && (
            <motion.div key="code" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.5 }} className="flex-1 flex items-center justify-center p-6">
              <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", damping: 20, delay: 0.1 }} className="w-full max-w-sm">
                <div className="text-center mb-8">
                  <h1 className="text-2xl font-bold tracking-tight">Welcome</h1>
                  <p className="mt-2 text-sm text-muted-foreground">Enter your access code to continue</p>
                </div>
                <form onSubmit={handleCodeSubmit} className="space-y-4">
                  <div>
                    <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} placeholder="ACCESS CODE" maxLength={8} className="h-14 text-center text-lg font-mono tracking-[0.25em] uppercase bg-black/50 border-border/60 backdrop-blur-md focus:ring-2 focus:ring-primary/30" disabled={validateMutation.isPending} autoFocus />
                  </div>
                  <AnimatePresence>
                    {codeError && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-center justify-center gap-2 text-sm text-destructive">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {codeError}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <Button type="submit" className="w-full h-12 text-sm font-semibold tracking-wide" disabled={validateMutation.isPending || code.length < 4}>
                    {validateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Redeem Code"}
                  </Button>
                </form>
              </motion.div>
            </motion.div>
          )}

          {phase === "validating" && (
            <motion.div key="validating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", delay: 0.2 }} className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-green-400" />
                </motion.div>
                <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-2xl font-semibold tracking-tight">Code valid</motion.h2>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-3 text-sm text-muted-foreground">Initialising...</motion.p>
              </div>
            </motion.div>
          )}

          {phase === "choice" && (
            <motion.div key="choice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex items-center justify-center p-6">
              <div className="w-full max-w-3xl">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Choose your path</h2>
                  <p className="mt-3 text-muted-foreground">How do you wish to enter the protocol?</p>
                </motion.div>
                <div className="grid md:grid-cols-2 gap-5">
                  <motion.button initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, type: "spring" }} whileHover={{ scale: 1.02, y: -4 }} whileTap={{ scale: 0.98 }} onClick={() => setPhase("pledge")} className="group relative text-left rounded-2xl border border-border/50 bg-black/40 backdrop-blur-md p-8 hover:bg-black/60 hover:border-indigo-500/40 transition-colors">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow">
                      <Shield className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-2xl font-semibold mb-2">Pledge</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">Join an existing guild. Swear allegiance and fight under their banner.</p>
                    <div className="mt-6 flex items-center text-sm font-semibold text-indigo-400 group-hover:text-indigo-300">Enter as member <span className="ml-2 group-hover:translate-x-1 transition-transform">-&gt;</span></div>
                  </motion.button>
                  <motion.button initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, type: "spring" }} whileHover={{ scale: 1.02, y: -4 }} whileTap={{ scale: 0.98 }} onClick={() => setPhase("rabel")} className="group relative text-left rounded-2xl border border-border/50 bg-black/40 backdrop-blur-md p-8 hover:bg-black/60 hover:border-orange-500/40 transition-colors">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mb-6 shadow-lg shadow-orange-500/20 group-hover:shadow-orange-500/40 transition-shadow">
                      <Swords className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-2xl font-semibold mb-2">Rabel</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">Forge your own guild. Choose your element, declare your name, and establish a new faction.</p>
                    <div className="mt-6 flex items-center text-sm font-semibold text-orange-400 group-hover:text-orange-300">Create guild <span className="ml-2 group-hover:translate-x-1 transition-transform">-&gt;</span></div>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {phase === "rabel" && (
            <motion.div key="rabel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center p-6">
              <div className="w-full max-w-xl">
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
                  <button onClick={() => { setPhase("choice"); setSelectedElement(null); setGuildName(""); }} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4">
                    <ArrowLeft className="w-3 h-3" /> Back
                  </button>
                  <h2 className="text-2xl font-bold tracking-tight">Choose your element</h2>
                  <p className="mt-1 text-sm text-muted-foreground">The force that binds your guild</p>
                </motion.div>
                <div className="relative w-full max-w-[380px] aspect-square mx-auto mb-8">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: "linear" }} className="absolute inset-4 rounded-full border border-dashed border-border/20" />
                  <motion.div animate={{ rotate: -360 }} transition={{ duration: 45, repeat: Infinity, ease: "linear" }} className="absolute inset-10 rounded-full border border-border/10" />
                  <motion.div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10" animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
                    <div className="relative w-28 h-28 md:w-36 md:h-36">
                      <img src={ASSETS.seal} alt="Guild Seal" className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.15)]" />
                      {selectedElement && <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="absolute -inset-6 rounded-full bg-primary/10 blur-2xl" />}
                    </div>
                  </motion.div>
                  {ELEMENTS.map((el, i) => {
                    const angle = (i * 72 - 90) * (Math.PI / 180);
                    const radius = 125;
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;
                    const isSelected = selectedElement === el.id;
                    return (
                      <motion.button key={el.id} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: selectedElement && !isSelected ? 0.35 : 1, scale: isSelected ? 1.15 : 1, x, y }} transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.4 + i * 0.08 }} onClick={() => handleElementSelect(el.id)} className={"absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[72px] h-[72px] md:w-20 md:h-20 rounded-full border-2 " + (isSelected ? el.border : "border-border/30") + " " + (isSelected ? el.bg : "bg-black/50") + " backdrop-blur-md flex flex-col items-center justify-center gap-1 transition-shadow " + (isSelected ? "shadow-lg " + el.ring + " ring-2" : "hover:border-border/60")}>
                        <img src={el.img} alt={el.name} className="w-7 h-7 md:w-8 md:h-8 object-contain pointer-events-none" />
                        <span className={"text-[10px] font-semibold " + el.text}>{el.name}</span>
                      </motion.button>
                    );
                  })}
                </div>
                <AnimatePresence>
                  {selectedElement && (
                    <motion.div initial={{ opacity: 0, y: 20, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: 20, height: 0 }} className="overflow-hidden">
                      <form onSubmit={handleGuildSubmit} className="max-w-sm mx-auto">
                        <div className={"rounded-xl border " + (selectedEl?.border || "border-border") + " bg-black/50 backdrop-blur-md p-5 space-y-4"}>
                          <div className="flex items-center gap-2">
                            <Sparkles className={"w-4 h-4 " + selectedEl?.text} />
                            <span className="text-sm font-medium">{selectedEl?.name} bond selected</span>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="guild" className="text-xs uppercase tracking-wider text-muted-foreground">Guild Name</Label>
                            <Input id="guild" value={guildName} onChange={(e) => setGuildName(e.target.value)} placeholder="e.g. Emberborn" className="bg-black/40 border-border/60 h-11" disabled={createGuildMutation.isPending} maxLength={30} autoFocus />
                          </div>
                          <Button type="submit" className="w-full h-11 font-semibold" disabled={createGuildMutation.isPending || guildName.trim().length < 2}>
                            {createGuildMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Guild"}
                          </Button>
                          {createGuildMutation.isError && (
                            <p className="text-sm text-destructive text-center">{createGuildMutation.error instanceof Error ? createGuildMutation.error.message : "Failed to create guild"}</p>
                          )}
                        </div>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
