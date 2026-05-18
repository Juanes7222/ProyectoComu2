import { createContext, useContext, useState, ReactNode } from 'react';

interface AuthContextType {
  user: { username: string; pass: string } | null;
  loginUser: (username: string, pass: string) => void;
  logoutUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ username: string; pass: string } | null>(null);

  const loginUser = (username: string, pass: string) => {
    setUser({ username, pass });
  };

  const logoutUser = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loginUser, logoutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
