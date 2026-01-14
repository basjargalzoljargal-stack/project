import { useState } from "react";
import { LogIn, Lock, User, AlertCircle, UserPlus } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import Button from "./ui/Button";
import Input from "./ui/Input";
import Card from "./ui/Card";

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
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card shadow="xl" padding="lg">
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

            <Input
              label="Нэвтрэх нэр"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={isRegistering ? "Хэрэглэгчийн нэр" : "admin"}
              leftIcon={<User className="w-5 h-5" />}
              required
              minLength={3}
              disabled={isLoading}
            />

            <Input
              label="Нууц үг"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              leftIcon={<Lock className="w-5 h-5" />}
              required
              minLength={6}
              disabled={isLoading}
            />

            {isRegistering && (
              <Input
                label="Нууц үг баталгаажуулах"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                leftIcon={<Lock className="w-5 h-5" />}
                required
                minLength={6}
                disabled={isLoading}
              />
            )}

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                fullWidth
                size="lg"
                loading={isLoading}
                disabled={isLoading}
              >
                {isRegistering ? "Бүртгүүлэх" : "Нэвтрэх"}
              </Button>
            </div>

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
                disabled={isLoading}
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
        </Card>
      </div>
    </div>
  );
}