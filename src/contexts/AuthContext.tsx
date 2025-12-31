import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "../lib/supabase";

interface AuthContextType {
  isLoggedIn: boolean;
  userRole: string | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<{ error: string | null }>;
  signUp: (username: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  verifyEmailCode: (email: string, code: string) => Promise<{ error: string | null }>;
  resendVerificationCode: (email: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Backend API URL
const API_URL = "https://my-website-backend-3yoe.onrender.com";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true";
    const role = localStorage.getItem("userRole");
    setIsLoggedIn(loggedIn);
    setUserRole(role);
    setLoading(false);
  }, []);

  const signIn = async (username: string, password: string) => {
    try {
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, email, status, role')
        .eq('email', username)
        .maybeSingle();

      if (profiles && profiles.status === 'pending') {
        return { error: "Таны бүртгэлийг админ зөвшөөрөөгүй байна. Та түр хүлээнэ үү." };
      }

      if (profiles && profiles.status === 'rejected') {
        return { error: "Таны бүртгэл татгалзагдсан байна. Админтай холбогдоно уу." };
      }

      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { error: data.message || "Login failed" };
      }

      const user = {
        id: data.userId,
        username: data.username,
        role: data.role || "user"
      };

      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("userId", data.userId);
      localStorage.setItem("userRole", data.role || "user");
      localStorage.setItem("username", data.username);
      localStorage.setItem("user", JSON.stringify(user));

      setIsLoggedIn(true);
      setUserRole(data.role || "user");

      return { error: null };
    } catch (err) {
      return { error: "Backend холбогдсонгүй" };
    }
  };

  const signUp = async (username: string, password: string) => {
    try {
      const res = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { error: data.message || "Бүртгэл амжилтгүй" };
      }

      return { error: null };
    } catch (err) {
      return { error: "Backend холбогдсонгүй" };
    }
  };

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    try {
      const { count: existingUsers } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

      const isFirstUser = existingUsers === 0;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: undefined,
        },
      });

      if (error) {
        return { error: error.message };
      }

      if (data.user) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .update({
            status: isFirstUser ? 'active' : 'pending',
            role: isFirstUser ? 'admin' : 'user',
            approved_at: isFirstUser ? new Date().toISOString() : null,
          })
          .eq('id', data.user.id);

        if (profileError) {
          console.error('Error updating user profile:', profileError);
        }
      }

      return { error: null };
    } catch (err) {
      return { error: "Бүртгэл үүсгэхэд алдаа гарлаа" };
    }
  };

  const verifyEmailCode = async (email: string, code: string) => {
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'signup',
      });

      if (error) {
        return { error: "Буруу код эсвэл хугацаа дууссан" };
      }

      return { error: null };
    } catch (err) {
      return { error: "Баталгаажуулахад алдаа гарлаа" };
    }
  };

  const resendVerificationCode = async (email: string) => {
    try {
      await supabase.auth.resend({
        type: 'signup',
        email,
      });
    } catch (err) {
      throw new Error("Код илгээхэд алдаа гарлаа");
    }
  };

  const requestPasswordReset = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (err) {
      return { error: "Нууц үг сэргээх хүсэлт илгээхэд алдаа гарлаа" };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (err) {
      return { error: "Нууц үг шинэчлэхэд алдаа гарлаа" };
    }
  };

  const signOut = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userId");
    localStorage.removeItem("userRole");
    localStorage.removeItem("username");
    localStorage.removeItem("user");
    supabase.auth.signOut();
    setIsLoggedIn(false);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider value={{
      isLoggedIn,
      userRole,
      loading,
      signIn,
      signUp,
      signUpWithEmail,
      verifyEmailCode,
      resendVerificationCode,
      requestPasswordReset,
      updatePassword,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}