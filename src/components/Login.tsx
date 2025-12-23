import { useState } from "react";
import { LogIn, Lock, User, AlertCircle, UserPlus } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (isRegistering) {
      // Registration
      if (password !== confirmPassword) {
        setError("Нууц үг таарахгүй байна");
        return;
      }

      if (password.length < 6) {
        setError("Нууц үг дор хаяж 6 тэмдэгт байх ёстой");
        return;
      }

      const { error } = await signUp(username, password);

      if (error) {
        setError(error);
      } else {
        setSuccess("Амжилттай бүртгэгдлээ! Админы зөвшөөрлийг хүлээнэ үү.");
        setUsername("");
        setPassword("");
        setConfirmPassword("");
        // Switch back to login after 3 seconds
        setTimeout(() => {
          setIsRegistering(false);
          setSuccess("");
        }, 3000);
      }
    } else {
      // Login
      const { error } = await signIn(username, password);

      if (error) {
        setError(error);
      } else {
        onLogin();
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-900 rounded-2xl mb-4">
              {isRegistering ? (
                <UserPlus className="w-8 h-8 text-white" />
              ) : (
                <LogIn className="w-8 h-8 text-white" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              {isRegistering ? "Бүртгүүлэх" : "Тавтай морил"}
            </h1>
            <p className="text-slate-600 mt-2">
              {isRegistering ? "Шинэ хэрэглэгч үүсгэх" : "Өөрийн эрхээр нэвтэрнэ үү"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-green-600" />
                <p className="text-sm text-green-800">{success}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Нэвтрэх нэр
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder={isRegistering ? "Хэрэглэгчийн нэр" : "admin"}
                  required
                  minLength={3}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Нууц үг
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {isRegistering && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Нууц үг баталгаажуулах
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-slate-900 text-white py-2.5 rounded-lg hover:bg-slate-800 transition-colors font-medium"
            >
              {isRegistering ? "Бүртгүүлэх" : "Нэвтрэх"}
            </button>

            <div className="text-center pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setError("");
                  setSuccess("");
                  setUsername("");
                  setPassword("");
                  setConfirmPassword("");
                }}
                className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                {isRegistering ? (
                  <>
                    Аль хэдийн бүртгэлтэй юу?{" "}
                    <span className="font-medium text-slate-900">Нэвтрэх</span>
                  </>
                ) : (
                  <>
                    Шинэ хэрэглэгч үү?{" "}
                    <span className="font-medium text-slate-900">Бүртгүүлэх</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}