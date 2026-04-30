import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function Landing() {
  const { user } = useAuth();

  const { data: leaderboard } = useQuery({
    queryKey: queryKeys.leaderboard(),
    queryFn: api.getGuildLeaderboard,
  });

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded overflow-hidden border border-border">
              <img
                src={`${import.meta.env.BASE_URL}logo.jpg`}
                alt="Earnity"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-sm font-semibold tracking-tight">Earnity</span>
          </div>
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
        <section className="max-w-5xl mx-auto px-6 pt-24 pb-20">
          <div className="max-w-2xl">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-6">
              v0.1 — beta
            </div>
            <h1 className="text-5xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
              Five guilds.
              <br />
              One leaderboard.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
              Pledge your allegiance, contribute, and push your guild to the top.
              No fluff, no dashboards full of vanity charts. Just rank.
            </p>
            <div className="mt-10 flex items-center gap-3">
              <Link
                href={user ? "/dashboard" : "/connect"}
                className="px-5 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                {user ? "Open dashboard" : "Pledge your allegiance"}
              </Link>
              <Link
                href="/leaderboard"
                className="px-5 py-2.5 rounded-md border border-border text-sm font-medium hover:bg-secondary transition-colors"
              >
                View leaderboard
              </Link>
            </div>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="max-w-5xl mx-auto px-6 py-16">
            <div className="flex items-end justify-between mb-8">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                  Live standings
                </div>
                <h2 className="text-2xl font-semibold tracking-tight">Top guilds</h2>
              </div>
              <Link
                href="/leaderboard"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Full leaderboard →
              </Link>
            </div>

            <div className="border border-border rounded-md divide-y divide-border overflow-hidden">
              {leaderboard?.slice(0, 5).map((item) => (
                <Link key={item.guild.id} href={`/guild/${item.guild.id}`}>
                  <div className="flex items-center px-5 py-4 hover:bg-secondary/40 transition-colors cursor-pointer">
                    <div className="w-8 text-sm font-mono text-muted-foreground">
                      {String(item.rank).padStart(2, "0")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{item.guild.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {item.guild.memberCount} members
                      </div>
                    </div>
                    <div className="font-mono text-sm tabular-nums">
                      {item.guild.totalScore.toLocaleString()}
                    </div>
                  </div>
                </Link>
              ))}
              {!leaderboard && (
                <div className="px-5 py-6 text-sm text-muted-foreground">Loading…</div>
              )}
            </div>
          </div>
        </section>
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
