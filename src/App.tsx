import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { Layout } from "@/components/layout";
import { PublicShell } from "@/components/public-shell";
import Landing from "@/pages/landing";
import Merchant from "@/pages/merchant";
import Socials from "@/pages/socials";
import Guilds from "@/pages/guilds";
import GuildDetail from "@/pages/guild-detail";
import Leaderboard from "@/pages/leaderboard";
import Drops from "@/pages/drops";
import Connect from "@/pages/connect";
import AuthCallback from "@/pages/auth-callback";
import Profile from "@/pages/profile";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { session, profile, isInitializing } = useAuth();

  if (isInitializing) {
    return (
      <div className="min-h-[100dvh] w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <div className="text-muted-foreground text-sm">Loading...</div>
        </div>
      </div>
    );
  }

  if (!session?.user) return <Redirect to="/" />;
  if (!profile) return <Redirect to="/connect" />;

  return (
    <Layout>
      <Component {...rest} />
    </Layout>
  );
}

function PublicLayout({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  if (profile) return <Layout>{children}</Layout>;
  return <PublicShell>{children}</PublicShell>;
}

// Strip base path for wouter to work correctly with /auth/callback
function useBasePath() {
  const [location] = useLocation();
  const base = import.meta.env.BASE_URL || "/";
  // If we're at root with no base, return empty string
  if (base === "/" || base === "./") return "";
  // Remove trailing slash
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

function AppRouter() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const base = useBasePath();

  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/connect" component={Connect} />
      <Route path="/auth/callback" component={AuthCallback} />

      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/drops" component={Drops} />

      <Route path="/guilds">
        <PublicLayout><Guilds /></PublicLayout>
      </Route>

      <Route path="/guild/:id">
        {(params) => (
          <PublicLayout><GuildDetail id={params.id} /></PublicLayout>
        )}
      </Route>

      {/* Protected routes */}
      <Route path="/merchant" component={Merchant} />
      <Route path="/socials" component={Socials} />
      <Route path="/profile" component={() => <ProtectedRoute component={Profile} />} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Don't use base prop on WouterRouter — it breaks query param handling on callbacks
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter>
            <AppRouter />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
