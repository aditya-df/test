import { getAuthSession } from "@/utils/auth-utils-server";
import { SessionProvider } from "next-auth/react";

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = async ({ children }) => {
  const session = await getAuthSession();
  return  <SessionProvider session={session} refetchOnWindowFocus={false}>{children}</SessionProvider>;
};
