// At the top, add:
import WaitingPhase from "@/components/WaitingPhase";

// In the component, replace the entire `phase === "waiting"` block with:
if (phase === "waiting" && session) {
  return (
    <WaitingPhase
      session={session}
      fullProfile={fullProfile}
      profile={profile}
      referralCodes={referralCodes ?? []}
      checkInStatus={checkInStatus}
      checkInOpen={checkInOpen}
      setCheckInOpen={setCheckInOpen}
      handleSignOut={handleSignOut}
      refetchCheckIn={refetchCheckIn}
      queryClient={queryClient}
    />
  );
}
