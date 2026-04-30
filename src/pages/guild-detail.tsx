import { useQuery } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export default function GuildDetail({ id }: { id: string }) {
  const { user } = useAuth();

  const { data: guild, isLoading } = useQuery({
    queryKey: queryKeys.guild(id),
    queryFn: () => api.getGuild(id),
    refetchInterval: 5000,
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }

  if (!guild) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">Guild not found.</div>
        <Link href="/guilds">
          <Button variant="outline">Back to guilds</Button>
        </Link>
      </div>
    );
  }

  const isMyGuild = user?.guildId === guild.id;

  return (
    <div className="space-y-10">
      <div>
        <Link
          href="/guilds"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← All guilds
        </Link>
        <div className="mt-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
              Rank #{guild.rank}
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">{guild.name}</h1>
            <p className="mt-3 text-sm text-muted-foreground max-w-2xl leading-relaxed">
              {guild.description}
            </p>
          </div>
          {isMyGuild && (
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground border border-border px-2 py-1 rounded self-start">
              Your guild
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 border border-border rounded-md divide-x divide-border">
        <Stat label="Members" value={guild.memberCount.toLocaleString()} />
        <Stat label="Total score" value={guild.totalScore.toLocaleString()} />
        <Stat label="Master" value={guild.guildMaster?.username ?? "—"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Roster ({guild.members.length})
          </h2>
          <div className="border border-border rounded-md divide-y divide-border overflow-hidden">
            {guild.members.map((member, index) => (
              <div key={member.id} className="flex items-center px-4 py-3">
                <div className="w-8 text-sm font-mono text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{member.username}</span>
                  {member.id === guild.guildMasterId && (
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground border border-border px-1.5 py-0.5 rounded">
                      Master
                    </span>
                  )}
                </div>
                <div className="font-mono text-sm tabular-nums">
                  {member.contributionScore.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Top contributors
          </h2>
          <div className="border border-border rounded-md divide-y divide-border overflow-hidden">
            {guild.topContributors.length === 0 && (
              <div className="px-4 py-6 text-sm text-muted-foreground">No contributions yet.</div>
            )}
            {guild.topContributors.map((c, i) => (
              <div key={c.id} className="flex items-center px-4 py-3">
                <div className="w-8 text-sm font-mono text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="flex-1 min-w-0 text-sm font-medium truncate">{c.username}</div>
                <div className="font-mono text-sm tabular-nums">
                  {c.contributionScore.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-2 text-xl font-semibold tracking-tight truncate">{value}</div>
    </div>
  );
}
