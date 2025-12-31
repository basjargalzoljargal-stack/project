import { useState } from 'react';
import { Lock, Eye, EyeOff, AlertCircle, Check, X, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from './ui/Button';
import Input from './ui/Input';
import Card from './ui/Card';

interface ResetPasswordPageProps {
  onPasswordReset: () => void;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const passwordRequirements: PasswordRequirement[] = [
  { label: 'Дор хаяж 8 тэмдэгт', test: (p) => p.length >= 8 },
  { label: 'Том үсэг агуулах', test: (p) => /[A-Z]/.test(p) },
  { label: 'Тоо агуулах', test: (p) => /[0-9]/.test(p) },
  { label: 'Тусгай тэмдэгт (!@#$%)', test: (p) => /[!@#$%]/.test(p) },
];

export default function ResetPasswordPage({ onPasswordReset }: ResetPasswordPageProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { updatePassword } = useAuth();

  const getPasswordStrength = (password: string): { label: string; color: string; width: string } => {
    const passedRequirements = passwordRequirements.filter(req => req.test(password)).length;

    if (password.length === 0) {
      return { label: '', color: '', width: '0%' };
    }
    if (passedRequirements <= 1) {
      return { label: 'Сул', color: 'bg-red-500', width: '33%' };
    }
    if (passedRequirements <= 2) {
      return { label: 'Дунд', color: 'bg-yellow-500', width: '66%' };
    }
    return { label: 'Хүчтэй', color: 'bg-green-500', width: '100%' };
  };

  const passwordStrength = getPasswordStrength(password);
  const allRequirementsMet = passwordRequirements.every(req => req.test(password));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!allRequirementsMet) {
      setError('Нууц үг шаардлага хангахгүй байна');
      return;
    }

    if (password !== confirmPassword) {
      setError('Нууц үг таарахгүй байна');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await updatePassword(password);

      if (error) {
        setError(error);
      } else {
        onPasswordReset();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card shadow="lg" padding="lg">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-900 rounded-2xl mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Нууц үг сэргээх</h1>
            <p className="text-slate-600 mt-2">Шинэ нууц үгээ оруулна уу</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div>
              <div className="relative">
                <Input
                  label="Шинэ нууц үг"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  leftIcon={<Lock className="w-5 h-5" />}
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[38px] text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {password && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                    <span>Нууц үгийн хүч:</span>
                    <span className={`font-medium ${
                      passwordStrength.label === 'Сул' ? 'text-red-600' :
                      passwordStrength.label === 'Дунд' ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${passwordStrength.color} transition-all duration-300`}
                      style={{ width: passwordStrength.width }}
                    />
                  </div>

                  <div className="space-y-1 pt-2">
                    {passwordRequirements.map((req, index) => {
                      const met = req.test(password);
                      return (
                        <div key={index} className="flex items-center gap-2 text-xs">
                          {met ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <X className="w-4 h-4 text-slate-400" />
                          )}
                          <span className={met ? 'text-green-600' : 'text-slate-500'}>
                            {req.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <Input
                label="Нууц үг баталгаажуулах"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                leftIcon={<Lock className="w-5 h-5" />}
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-[38px] text-slate-400 hover:text-slate-600 transition-colors"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <X className="w-3 h-3" />
                  Нууц үг таарахгүй байна
                </p>
              )}
              {confirmPassword && password === confirmPassword && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Нууц үг таарч байна
                </p>
              )}
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                fullWidth
                size="lg"
                loading={isLoading}
                disabled={isLoading}
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Нууц үг сэргээх
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
