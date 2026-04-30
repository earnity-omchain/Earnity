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
import NotFound from "@/pages/not-found";
import { useEffect } from "react";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { user, isInitializing } = useAuth();

  if (isInitializing) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/connect" />;
  }

  return (
    <Layout>
      <Component {...rest} />
    </Layout>
  );
}

function PublicLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user) {
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
      <Route path="/" component={Landing} />
      <Route path="/connect" component={Connect} />
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
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
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
      
