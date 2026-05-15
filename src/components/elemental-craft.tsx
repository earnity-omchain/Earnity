import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { ELEMENT_META, GAME_ASSETS } from "@/lib/assets";
import { SHARDS_PER_ELEMENTAL, ELEMENTALS_FOR_WALLET, getShardItemType } from "@/lib/game-config";
import { craftElemental, getInventory } from "@/lib/supabase-gw";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Gem, Check, Wallet } from "lucide-react";

const ELEMENTS = ["fire", "water", "nature", "rock", "lightning", "wind"] as const;

export default function ElementalCraft() {
  const { session, profile } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [craftResult, setCraftResult] = useState<string | null>(null);

  const { data: inventory } = useQuery({
    queryKey: ["inventory", profile?.id],
    queryFn: () => getInventory(profile!.id),
    enabled: !!profile?.id,
  });

  const craftMutation = useMutation({
    mutationFn: (element: string) => craftElemental(profile!.id, element),
    onSuccess: (result) => {
      setCraftResult(result.message);
      queryClient.invalidateQueries({ queryKey: ["inventory", profile?.id] });
      setTimeout(() => setCraftResult(null), 3000);
    },
  });

  const getShardCount = (element: string) => {
    const item = inventory?.find((i) => i.item_type === getShardItemType(element));
    return item?.quantity || 0;
  };

  const getElementalCount = (element: string) => {
    const item = inventory?.find((i) => i.item_type === `elemental_${element}`);
    return item?.quantity || 0;
  };

  const totalElementals = ELEMENTS.reduce(
    (sum, el) => sum + getElementalCount(el),
    0
  );

  const canSubmitWallet = totalElementals >= ELEMENTALS_FOR_WALLET;

  if (!session) return null;

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 border-2 border-purple-400/50 shadow-lg shadow-purple-900/50 flex items-center justify-center"
      >
        <Gem className="w-6 h-6 text-white" />
        {canSubmitWallet && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-black animate-pulse" />
        )}
      </motion.button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-black uppercase tracking-wider flex items-center justify-center gap-2">
              <Gem className="w-5 h-5 text-purple-400" />
              Elemental Forge
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-wider text-zinc-500">
                  Elementals Collected
                </span>
                <span className="text-sm font-mono font-bold text-purple-400">
                  {totalElementals} / {ELEMENTALS_FOR_WALLET}
                </span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${(totalElementals / ELEMENTALS_FOR_WALLET) * 100}%` }}
                />
              </div>
              <div className="text-[10px] text-zinc-600 mt-1.5">
                Collect {ELEMENTALS_FOR_WALLET} elementals to unlock wallet submission for GTD
              </div>
            </div>

            {canSubmitWallet && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-950/30 border border-green-800/50 rounded-xl p-4 mb-4 text-center"
              >
                <Wallet className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <div className="text-sm font-bold text-green-400 mb-2">
                  Wallet Submission Unlocked!
                </div>
                <Button size="sm" className="bg-green-600 hover:bg-green-500">
                  Submit Wallet for GTD
                </Button>
              </motion.div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {ELEMENTS.map((element) => {
                const meta = ELEMENT_META[element];
                const shards = getShardCount(element);
                const elementals = getElementalCount(element);
                const canCraft = shards >= SHARDS_PER_ELEMENTAL;

                return (
                  <motion.div
                    key={element}
                    whileHover={{ scale: 1.02 }}
                    className={`relative border rounded-xl p-3 ${
                      canCraft ? meta.border : "border-zinc-800"
                    } ${canCraft ? meta.bg : "bg-zinc-900/30"}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <img src={meta.img} alt={meta.label} className="w-8 h-8 object-contain" />
                      <div>
                        <div className={`text-sm font-bold ${meta.text}`}>{meta.label}</div>
                        <div className="text-[10px] text-zinc-500">{elementals} crafted</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                          <img src={meta.shard} className="w-3 h-3 object-contain" />
                          {shards} / {SHARDS_PER_ELEMENTAL} shards
                        </div>
                        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden mt-1">
                          <div
                            className={`h-full rounded-full ${
                              canCraft ? "bg-green-500" : "bg-zinc-600"
                            }`}
                            style={{ width: `${Math.min(100, (shards / SHARDS_PER_ELEMENTAL) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      className="w-full"
                      disabled={!canCraft}
                      onClick={() => {
                        setSelectedElement(element);
                        craftMutation.mutate(element);
                      }}
                    >
                      {craftMutation.isPending && selectedElement === element ? (
                        "Crafting…"
                      ) : (
                        <span className="flex items-center gap-1">
                          <Gem className="w-3 h-3" /> Craft
                        </span>
                      )}
                    </Button>
                  </motion.div>
                );
              })}
            </div>

            {craftResult && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 text-center text-sm font-bold text-green-400"
              >
                <Check className="w-4 h-4 inline mr-1" />
                {craftResult}
              </motion.div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
