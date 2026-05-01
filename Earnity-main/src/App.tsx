import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { Layout } from "@/components/layout";
import { PublicShell } from "@/components/public-shell";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Guilds from "@/pages/guilds";
import GuildDetail from "@/pages/guild-detail";
import Leaderboard from "@/pages/leaderboard";
import Connect from "@/pages/connect";
import AuthCallback from "@/pages/auth-callback";
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
          <div className="text-muted-foreground text-sm">Loading…</div>
        </div>
      </div>
    );
  }

  // Not logged in at all → gate
  if (!session?.user) {
    return <Redirect to="/" />;
  }

  // Logged in but profile incomplete → onboarding
  if (!profile) {
    return <Redirect to="/connect" />;
  }

  return (
    <Layout>
      <Component {...rest} />
    </Layout>
  );
}

function PublicLayout({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  if (profile) {
    return <Layout>{children}</Layout>;
  }
  return <PublicShell>{children}</PublicShell>;
}

function AppRouter() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <Switch>
      {/* Gate — no shell, full bleed background */}
      <Route path="/" component={Landing} />

      {/* Onboarding — no shell */}
      <Route path="/connect" component={Connect} />

      {/* OAuth callback — no shell */}
      <Route path="/auth/callback" component={AuthCallback} />

      {/* Public pages with shell */}
      <Route path="/leaderboard">
        <PublicLayout>
          <Leaderboard />
        </PublicLayout>
      </Route>

      <Route path="/guilds">
        <PublicLayout>
          <Guilds />
        </PublicLayout>
      </Route>

      <Route path="/guild/:id">
        {(params) => (
          <PublicLayout>
            <GuildDetail id={params.id} />
          </PublicLayout>
        )}
      </Route>

      {/* Protected */}
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />

      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppRouter />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;