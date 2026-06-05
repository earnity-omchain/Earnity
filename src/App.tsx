import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { PublicShell } from "@/components/public-shell";
import Landing from "@/pages/landing";
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

function PublicLayout({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  if (profile) return <>{children}</>;
  return <PublicShell>{children}</PublicShell>;
}

function AppRouter() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <Switch>
      {/* Auth */}
      <Route path="/" component={Landing} />
      <Route path="/connect" component={Connect} />
      <Route path="/auth/callback" component={AuthCallback} />

      {/* Public */}
      <Route path="/leaderboard" component={Leaderboard} />

      {/* Catch-all — redirect everything else to home */}
      <Route path="/forge"><Redirect to="/" /></Route>
      <Route path="/merchant"><Redirect to="/" /></Route>
      <Route path="/socials"><Redirect to="/" /></Route>
      <Route path="/battlefield"><Redirect to="/" /></Route>
      <Route path="/guilds"><Redirect to="/" /></Route>
      <Route path="/guild/:id"><Redirect to="/" /></Route>
      <Route path="/profile"><Redirect to="/" /></Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
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
