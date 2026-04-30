import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-background p-6">
      <div className="text-center max-w-sm">
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
          404
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link href="/">
            <Button variant="outline">Home</Button>
          </Link>
          <Link href="/leaderboard">
            <Button>Leaderboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
