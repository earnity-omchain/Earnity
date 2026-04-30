import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys, type User } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  walletAddress: string | null;
  login: (user: User) => void;
  logout: () => void;
  isInitializing: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(() => {
    return localStorage.getItem("earnity_wallet") || null;
  });
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const queryClient = useQueryClient();

  const { data: fetchedUser, isLoading, error } = useQuery({
    queryKey: queryKeys.currentUser(walletAddress ?? ""),
    queryFn: () => api.getCurrentUser(walletAddress!),
    enabled: !!walletAddress,
    retry: false,
  });

  useEffect(() => {
    if (walletAddress) {
      if (!isLoading) {
        if (fetchedUser) {
          setUser(fetchedUser);
        } else if (error) {
          localStorage.removeItem("earnity_wallet");
          setWalletAddress(null);
          setUser(null);
        }
        setIsInitializing(false);
      }
    } else {
      setIsInitializing(false);
    }
  }, [walletAddress, fetchedUser, isLoading, error]);

  const login = (newUser: User) => {
    localStorage.setItem("earnity_wallet", newUser.walletAddress);
    setWalletAddress(newUser.walletAddress);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem("earnity_wallet");
    setWalletAddress(null);
    setUser(null);
    queryClient.clear();
  };

  return (
    <AuthContext.Provider value={{ user, walletAddress, login, logout, isInitializing }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
