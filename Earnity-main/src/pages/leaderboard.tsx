import { useQuery } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/supabase";
import { Link } from "wouter";

export default function Leaderboard() {
  const { data: stats } = useQuery({
    queryKey: queryKeys.overviewStats(),
    queryFn: api.getOverviewStats,
    refetchInterval: 5000,
  });

  const { data: leaderboard } = useQuery({
    queryKey: queryKeys.leaderboard(),
    queryFn: api.getGuildLeaderboard,
    refetchInterval: 3000,
  });

  const { data: topContributors } = useQuery({
    queryKey: queryKeys.topContributors(10),
    queryFn: () => api.getTopContributors(10),
    refetchInterval: 5000,
  });

  return (
    <div className="space-y-12">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
          Leaderboard
        </div>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">Live standings</h1>
        <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
          <div>
            <span className="font-mono tabular-nums text-foreground">
              {(stats?.total_points ?? 0).toLocaleString()}
            </span>{" "}points
          </div>
          <div>
            <span className="font-mono tabular-nums text-foreground">
              {(stats?.total_contributions ?? 0).toLocaleString()}
            </span>{" "}actions
          </div>
          <div>
            <span className="font-mono tabular-nums text-foreground">
              {(stats?.total_users ?? 0).toLocaleString()}
            </span>{" "}members
          </div>
        </div>
      </div>

      <section>
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground mb-4">
          Guilds
        </h2>
        <div className="border border-border rounded-md divide-y divide-border overflow-hidden">
          {leaderboard?.map((item) => (
            <Link key={item.guild.id} href={`/guild/${item.guild.id}`}>
              <div className="flex items-center px-5 py-4 hover:bg-secondary/40 transition-colors cursor-pointer">
                <div className="w-10 text-base font-mono text-muted-foreground tabular-nums">
                  {String(item.rank).padStart(2, "0")}
                </div>
                <div className="flex-1 min-w-0 pr-4">
                  <div className="text-base font-medium truncate">{item.guild.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {item.guild.member_count} members
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-base tabular-nums">
                    {item.guild.total_score.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
                    points
                  </div>
                </div>
              </div>
            </Link>
          ))}
          {!leaderboard && (
            <div className="px-5 py-6 text-sm text-muted-foreground">Loading…</div>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground mb-4">
          Top contributors
        </h2>
        <div className="border border-border rounded-md divide-y divide-border overflow-hidden">
          {topContributors?.map((c) => (
            <div key={c.user.id} className="flex items-center px-5 py-3">
              <div className="w-10 text-sm font-mono text-muted-foreground tabular-nums">
                {String(c.rank).padStart(2, "0")}
              </div>
              <div className="flex-1 min-w-0 flex items-center gap-3">
                <span className="text-sm font-medium truncate">{c.user.username}</span>
                {c.guild && (
                  <Link href={`/guild/${c.guild.id}`} className="text-xs text-muted-foreground hover:text-foreground transition-colors truncate">
                    {c.guild.name}
                  </Link>
                )}
              </div>
              <div className="font-mono text-sm tabular-nums">
                {c.user.contribution_score.toLocaleString()}
              </div>
            </div>
          ))}
          {!topContributors && (
            <div className="px-5 py-6 text-sm text-muted-foreground">Loading…</div>
          )}
        </div>
      </section>
    </div>
  );
}
