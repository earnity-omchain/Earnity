import { useAuth } from "@/lib/auth-context";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

export default function Dashboard() {
  const { profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: queryKeys.overviewStats(),
    queryFn: api.getOverviewStats,
    refetchInterval: 5000,
  });

  const { data: leaderboard } = useQuery({
    queryKey: queryKeys.leaderboard(),
    queryFn: api.getGuildLeaderboard,
    refetchInterval: 5000,
  });

  const { data: recentEvents } = useQuery({
    queryKey: queryKeys.recentContributions(8),
    queryFn: () => api.listRecentContributions(8),
    refetchInterval: 3000,
  });

  const contributeMutation = useMutation({
    mutationFn: () => api.createContribution(profile!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard() });
      queryClient.invalidateQueries({ queryKey: queryKeys.overviewStats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.recentContributions(8) });
      refreshProfile();
    },
  });

  const userGuildRank = leaderboard?.find((g) => g.guild.id === profile?.guild_id);

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
            Dashboard
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Welcome, {profile?.username}
          </h1>
        </div>

        {profile?.guild_id ? (
          <Button
            onClick={() => contributeMutation.mutate()}
            disabled={contributeMutation.isPending}
            className="h-11 px-6"
          >
            {contributeMutation.isPending ? "Contributing…" : "Contribute"}
          </Button>
        ) : (
          <Link href="/guilds">
            <Button variant="outline" className="h-11 px-6">
              Pledge your allegiance
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 border border-border rounded-md divide-x divide-border">
        <Stat label="Your score" value={(profile?.contribution_score ?? 0).toLocaleString()} />
        <Stat
          label="Your guild"
          value={userGuildRank ? userGuildRank.guild.name : "—"}
          sub={userGuildRank ? `Rank #${userGuildRank.rank}` : "Unaligned"}
        />
        <Stat label="Total points" value={(stats?.total_points ?? 0).toLocaleString()} />
        <Stat label="Members" value={(stats?.total_users ?? 0).toLocaleString()} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              Top guilds
            </h2>
            <Link href="/leaderboard" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              View all →
            </Link>
          </div>
          <div className="border border-border rounded-md divide-y divide-border overflow-hidden">
            {leaderboard?.slice(0, 5).map((item) => {
              const isMine = item.guild.id === profile?.guild_id;
              return (
                <Link key={item.guild.id} href={`/guild/${item.guild.id}`}>
                  <div className="flex items-center px-4 py-3 hover:bg-secondary/40 transition-colors cursor-pointer">
                    <div className="w-8 text-sm font-mono text-muted-foreground">
                      {String(item.rank).padStart(2, "0")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium flex items-center gap-2">
                        {item.guild.name}
                        {isMine && (
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground border border-border px-1.5 py-0.5 rounded">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {item.guild.member_count} members
                      </div>
                    </div>
                    <div className="font-mono text-sm tabular-nums">
                      {item.guild.total_score.toLocaleString()}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Activity
          </h2>
          <div className="border border-border rounded-md divide-y divide-border overflow-hidden">
            {recentEvents?.length === 0 && (
              <div className="px-4 py-6 text-sm text-muted-foreground">No recent activity.</div>
            )}
            {recentEvents?.map((event) => (
              <div key={event.id} className="px-4 py-3 text-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="min-w-0 flex-1 truncate">
                    <span className="font-medium">{event.username}</span>{" "}
                    <span className="text-muted-foreground">+{event.points}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground truncate mt-0.5">
                  {event.action} · {event.guild_name}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="px-4 py-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-2 text-xl font-semibold tracking-tight truncate">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}
