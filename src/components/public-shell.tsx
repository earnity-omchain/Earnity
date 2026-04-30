import { Link } from "wouter";
import { useAuth } from "@/lib/auth-context";

export function PublicShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col">
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
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/leaderboard" className="text-muted-foreground hover:text-foreground transition-colors">
              Leaderboard
            </Link>
            <Link href="/guilds" className="text-muted-foreground hover:text-foreground transition-colors">
              Guilds
            </Link>
            {user ? (
              <Link
                href="/dashboard"
                className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/connect"
                className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Connect
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-10">{children}</div>
      </main>
      <footer className="border-t border-border">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between text-xs text-muted-foreground">
          <span>© Earnity</span>
          <span className="font-mono">guild.protocol.v0</span>
        </div>
      </footer>
    </div>
  );
}
