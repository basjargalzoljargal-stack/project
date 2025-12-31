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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Supabase session шалгах
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsLoggedIn(true);
        // User profile-с role авах
        supabase
          .from('user_profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            setUserRole(data?.role || 'user');
          });
      }
      setLoading(false);
    });

    // Auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
      if (session) {
        supabase
          .from('user_profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            setUserRole(data?.role || 'user');
          });
      } else {
        setUserRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (username: string, password: string) => {
    try {
      // Profile шалгах
      const { data: profiles } = await supabase
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

      // Supabase auth login
      const { data, error } = await supabase.auth.signInWithPassword({
        email: username,
        password: password,
      });

      if (error) {
        return { error: "Хэрэглэгчийн нэр эсвэл нууц үг буруу байна" };
      }

      setIsLoggedIn(true);
      setUserRole(profiles?.role || 'user');

      return { error: null };
    } catch (err) {
      return { error: "Нэвтрэхэд алдаа гарлаа" };
    }
  };

  const signUp = async (username: string, password: string) => {
    return signUpWithEmail(username, password, username);
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
        redirectTo: window.location.origin + '/#reset',
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
