import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { ELEMENT_META, GUILD_IMAGES, getGuildImage } from "@/lib/assets";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
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
  const { session, profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: guilds, isLoading } = useQuery({
    queryKey: queryKeys.guilds(),
    queryFn: api.listGuilds,
  });

  const joinGuildMutation = useMutation({
    mutationFn: (guildId: string) => api.joinGuild(profile!.id, guildId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.guilds() });
    },
  });

  const hasGuild = !!profile?.guild_id;

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Guilds</div>
        <h1 className="text-3xl font-semibold tracking-tight">Choose your allegiance</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-xl">
          20 guilds. Pick one. The choice is permanent — your contributions count toward their score forever.
        </p>
      </div>

      {isLoading && (
        <div className="text-sm text-muted-foreground">Loading guilds…</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {guilds?.map((guild, i) => {
          const el = ELEMENT_META[guild.element] || ELEMENT_META.fire;
          const isMyGuild = profile?.guild_id === guild.id;
          const guildImg = getGuildImage(guild.name, guild.element);

          return (
            <motion.div
              key={guild.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, type: "spring", damping: 22 }}
              className={`border rounded-2xl bg-card overflow-hidden transition-colors ${
                isMyGuild ? `${el.border} ${el.bg}` : "border-border hover:border-border/80"
              }`}
            >
              <div className="p-5">
                <div className="flex items-start gap-4">
                  {/* Guild image */}
                  <div className={`w-14 h-14 rounded-xl border ${el.border} overflow-hidden flex-shrink-0 bg-black/30`}>
                    <img
                      src={guildImg}
                      alt={guild.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = el.img; }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-semibold tracking-tight truncate">{guild.name}</h3>
                      {isMyGuild && (
                        <span className={`text-[10px] uppercase tracking-wider ${el.text} border ${el.border} px-1.5 py-0.5 rounded-full`}>
                          Yours
                        </span>
                      )}
                    </div>
                    <div className={`flex items-center gap-1.5 mt-1 text-xs ${el.text}`}>
                      <img src={el.img} alt={el.label} className="w-3.5 h-3.5 object-contain" />
                      {el.label}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border/50">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Members</div>
                    <div className="text-base font-mono tabular-nums mt-1">{guild.member_count.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Score</div>
                    <div className="text-base font-mono tabular-nums mt-1">{guild.total_score.toLocaleString()}</div>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 border-t border-border/50 flex items-center gap-2">
                <Link href={`/guild/${guild.id}`} className="flex-1">
                  <Button variant="outline" className="w-full h-9">View</Button>
                </Link>

                {session && !hasGuild && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button className="flex-1 h-9">Join</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Join {guild.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This is permanent. You can't change guilds later. All your future contributions will count toward {guild.name}.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => joinGuildMutation.mutate(guild.id)}>
                          {joinGuildMutation.isPending ? "Joining…" : "Join"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {!session && (
                  <Link href="/" className="flex-1">
                    <Button className="w-full h-9">Sign in to join</Button>
                  </Link>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
