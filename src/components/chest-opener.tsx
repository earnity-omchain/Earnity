import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { GAME_ASSETS, ELEMENT_META } from "@/lib/assets";
import { ITEM_META, canOpenChest, getChestCooldownRemaining } from "@/lib/game-config";
import { openChest, getInventory } from "@/lib/supabase-gw";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sparkles, Clock } from "lucide-react";

export default function ChestOpener() {
  const { session, profile } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [reward, setReward] = useState<any>(null);
  const [isOpening, setIsOpening] = useState(false);

  const canOpen = canOpenChest(profile?.last_chest_opened);
  const cooldownRemaining = getChestCooldownRemaining(profile?.last_chest_opened);
  const cooldownMinutes = Math.ceil(cooldownRemaining * 60);

  const openMutation = useMutation({
    mutationFn: () => openChest(profile!.id),
    onSuccess: (result) => {
      setReward(result.reward);
      setIsOpening(false);
      queryClient.invalidateQueries({ queryKey: ["inventory", profile?.id] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (err: any) => {
      setIsOpening(false);
      setReward({ type: "error", message: err.message });
    },
  });

  const handleOpen = () => {
    if (!canOpen) return;
    setIsOpening(true);
    setReward(null);
    openMutation.mutate();
  };

  const getRewardIcon = () => {
    if (!reward || reward.type === "error") return <Sparkles className="w-12 h-12 text-yellow-400" />;
    switch (reward.type) {
      case "coin": return <img src={GAME_ASSETS.coin} className="w-12 h-12 object-contain" alt="coin" />;
      case "shard": return <img src={ELEMENT_META[reward.subtype]?.shard || GAME_ASSETS.coin} className="w-12 h-12 object-contain" alt="shard" />;
      case "elemental": return <img src={ELEMENT_META[reward.subtype]?.img || GAME_ASSETS.coin} className="w-12 h-12 object-contain" alt="elemental" />;
      case "item": return <img src={ITEM_META[reward.subtype]?.image || GAME_ASSETS.coin} className="w-12 h-12 object-contain" alt="item" />;
      default: return <Sparkles className="w-12 h-12 text-yellow-400" />;
    }
  };

  const getRewardLabel = () => {
    if (!reward) return "Opening…";
    if (reward.type === "error") return reward.message;
    switch (reward.type) {
      case "coin": return `${reward.quantity.toLocaleString()} Coins`;
      case "shard": return `${reward.quantity}x ${ELEMENT_META[reward.subtype]?.label || reward.subtype} Shard`;
      case "elemental": return `${reward.quantity}x ${ELEMENT_META[reward.subtype]?.label || reward.subtype} Elemental`;
      case "item": return `${reward.quantity}x ${ITEM_META[reward.subtype]?.label || reward.subtype}`;
      default: return "Mystery Reward";
    }
  };

  const getRewardColor = () => {
    switch (reward?.type) {
      case "coin": return "text-yellow-400";
      case "shard": return "text-blue-400";
      case "elemental": return "text-purple-400";
      case "item": return "text-red-400";
      default: return "text-white";
    }
  };

  if (!session) return null;

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-gradient-to-br from-yellow-600 to-orange-600 border-2 border-yellow-400/50 shadow-lg shadow-yellow-900/50 flex items-center justify-center group"
      >
        <img
          src={canOpen ? GAME_ASSETS.mysteryboxClosed : GAME_ASSETS.mysteryboxOpened}
          alt="chest"
          className="w-10 h-10 object-contain group-hover:animate-bounce"
        />
        {canOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-black animate-pulse" />
        )}
      </motion.button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-black uppercase tracking-wider">
              Mystery Chest
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center py-6">
            <motion.div
              animate={isOpening ? { rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.5, repeat: isOpening ? Infinity : 0 }}
              className="mb-6"
            >
              <img
                src={isOpening ? GAME_ASSETS.mysteryboxOpened : GAME_ASSETS.mysteryboxClosed}
                alt="chest"
                className="w-32 h-32 object-contain"
              />
            </motion.div>

            <AnimatePresence mode="wait">
              {reward && (
                <motion.div
                  key="reward"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center mb-4"
                >
                  <div className="mb-2">{getRewardIcon()}</div>
                  <div className={`text-xl font-black ${getRewardColor()}`}>
                    {getRewardLabel()}
                  </div>
                  {reward.type !== "error" && (
                    <div className="text-xs text-zinc-500 mt-1">Added to your inventory</div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {!reward && (
              <Button
                size="lg"
                className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-bold"
                disabled={!canOpen || isOpening}
                onClick={handleOpen}
              >
                {isOpening ? (
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 animate-spin" /> Opening…
                  </span>
                ) : canOpen ? (
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Open Chest
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4" /> {cooldownMinutes}m cooldown
                  </span>
                )}
              </Button>
            )}

            <div className="mt-6 w-full space-y-1.5">
              <div I got cut off. Let me continue with the remaining files in the same format.

---

## `src/components/chest-opener.tsx` (continued)

```tsx
              <div className="text-[10px] uppercase tracking-wider text-zinc-600 text-center mb-2">
                Drop Rates
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-yellow-400">Coins</span>
                <span className="text-zinc-500">50%</span>
              </div>
              <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-500/40 rounded-full" style={{ width: "50%" }} />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-blue-400">Shards</span>
                <span className="text-zinc-500">25%</span>
              </div>
              <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500/40 rounded-full" style={{ width: "25%" }} />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-red-400">Items</span>
                <span className="text-zinc-500">20%</span>
              </div>
              <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-red-500/40 rounded-full" style={{ width: "20%" }} />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-purple-400">Elementals</span>
                <span className="text-zinc-500">5%</span>
              </div>
              <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500/40 rounded-full" style={{ width: "5%" }} />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
