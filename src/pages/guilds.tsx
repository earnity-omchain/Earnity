import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Guilds() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: guilds, isLoading } = useQuery({
    queryKey: queryKeys.guilds(),
    queryFn: api.listGuilds,
  });

  const { data: currentUserData } = useQuery({
    queryKey: queryKeys.user(user?.id ?? ""),
    queryFn: () => api.getUser(user!.id),
    enabled: !!user?.id,
  });

  const joinGuildMutation = useMutation({
    mutationFn: ({ guildId }: { guildId: string }) =>
      api.joinGuild(user!.id, guildId),
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.user(user.id) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.guilds() });
    },
  });

  const displayUser = currentUserData ?? user;
  const hasGuild = !!displayUser?.guildId;

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Guilds</div>
        <h1 className="text-3xl font-semibold tracking-tight">Choose your allegiance</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-xl">
          Five guilds. Pick one. The choice is permanent — your contributions count toward
          their score forever.
        </p>
      </div>

      {isLoading && (
        <div className="text-sm text-muted-foreground">Loading guilds…</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {guilds?.map((guild) => {
          const isMyGuild = displayUser?.guildId === guild.id;
          return (
            <div
              key={guild.id}
              className={`border rounded-md bg-card transition-colors ${
                isMyGuild ? "border-foreground/40" : "border-border hover:border-border/80"
              }`}
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold tracking-tight truncate">
                        {guild.name}
                      </h3>
                      {isMyGuild && (
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground border border-border px-1.5 py-0.5 rounded">
                          Yours
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                      {guild.description}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-border">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      Members
                    </div>
                    <div className="text-base font-mono tabular-nums mt-1">
                      {guild.memberCount.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      Score
                    </div>
                    <div className="text-base font-mono tabular-nums mt-1">
                      {guild.totalScore.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 border-t border-border flex items-center gap-2">
                <Link href={`/guild/${guild.id}`} className="flex-1">
                  <Button variant="outline" className="w-full h-9">
                    View
                  </Button>
                </Link>

                {user && !hasGuild && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button className="flex-1 h-9">Join</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Join {guild.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This is permanent. You can't change guilds later. All your future
                          contributions will count toward {guild.name}.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => joinGuildMutation.mutate({ guildId: guild.id })}
                        >
                          Join
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {!user && (
                  <Link href="/connect" className="flex-1">
                    <Button className="w-full h-9">Connect to join</Button>
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
