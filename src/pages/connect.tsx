import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Connect() {
  const [walletAddress, setWalletAddress] = useState("");
  const [username, setUsername] = useState("");
  const { login } = useAuth();
  const [, setLocation] = useLocation();

  const connectMutation = useMutation({
    mutationFn: ({ walletAddress, username }: { walletAddress: string; username: string | null }) =>
      api.connectWallet({ walletAddress, username }),
    onSuccess: (user) => {
      login(user);
      setLocation("/dashboard");
    },
  });

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    const finalWallet =
      walletAddress.trim() ||
      `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;

    connectMutation.mutate({ walletAddress: finalWallet, username: username || null });
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-background">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-7 h-7 rounded overflow-hidden border border-border">
              <img
                src={`${import.meta.env.BASE_URL}logo.jpg`}
                alt="Earnity"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-sm font-semibold tracking-tight">Earnity</span>
          </Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Back
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
              Step 01
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">Connect</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Use any wallet address, or leave it blank to generate one.
            </p>
          </div>

          <form onSubmit={handleConnect} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="wallet" className="text-xs uppercase tracking-wider text-muted-foreground">
                Wallet address
              </Label>
              <Input
                id="wallet"
                placeholder="0x…"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                className="font-mono text-sm bg-card border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username" className="text-xs uppercase tracking-wider text-muted-foreground">
                Display name
              </Label>
              <Input
                id="username"
                placeholder="Satoshi"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-card border-border"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full h-10"
              disabled={connectMutation.isPending || !username.trim()}
            >
              {connectMutation.isPending ? "Connecting…" : "Continue"}
            </Button>
          </form>

          {connectMutation.isError && (
            <p className="mt-4 text-sm text-destructive">
              Failed to connect. Try again.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
