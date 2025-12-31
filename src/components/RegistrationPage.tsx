import { useState } from 'react';
import { UserPlus, Mail, Lock, User, Eye, EyeOff, AlertCircle, Check, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import EmailVerificationModal from './EmailVerificationModal';
import Button from './ui/Button';
import Input from './ui/Input';
import Card from './ui/Card';

interface RegistrationPageProps {
  onLoginClick: () => void;
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

export default function RegistrationPage({ onLoginClick }: RegistrationPageProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [showPendingApproval, setShowPendingApproval] = useState(false);

  const { signUpWithEmail, verifyEmailCode, resendVerificationCode } = useAuth();

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

    if (!fullName.trim()) {
      setError('Нэр оруулна уу');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('И-мэйл хаяг буруу байна');
      return;
    }

    if (!allRequirementsMet) {
      setError('Нууц үг шаардлага хангахгүй байна');
      return;
    }

    if (password !== confirmPassword) {
      setError('Нууц үг таарахгүй байна');
      return;
    }

    if (!termsAccepted) {
      setError('Үйлчилгээний нөхцөлийг зөвшөөрнө үү');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await signUpWithEmail(email, password, fullName);

      if (error) {
        setError(error);
      } else {
        setRegisteredEmail(email);
        setShowPendingApproval(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerified = () => {
    setShowVerification(false);
    onLoginClick();
  };

  const handleResendCode = async () => {
    await resendVerificationCode(registeredEmail);
  };

  const handleVerifyCode = async (code: string) => {
    return await verifyEmailCode(registeredEmail, code);
  };

  if (showPendingApproval) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card shadow="xl" padding="lg">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
                <AlertCircle className="w-8 h-8 text-yellow-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Бүртгэл амжилттай!</h1>
              <p className="text-slate-600 mb-6">
                Таны бүртгэлийг админ хянаж зөвшөөрч байна. Баталгаажсаны дараа нэвтрэх боломжтой болно.
              </p>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
                <p className="text-sm text-blue-800">
                  <strong>И-мэйл:</strong> {registeredEmail}
                </p>
                <p className="text-xs text-blue-600 mt-2">
                  Таны бүртгэл хүлээгдэж байна. Имэйлээ шалгана уу.
                </p>
              </div>
              <Button onClick={onLoginClick} fullWidth>
                Нэвтрэх хуудас руу буцах
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (showVerification) {
    return (
      <EmailVerificationModal
        email={registeredEmail}
        onVerified={handleVerified}
        onResend={handleResendCode}
        onVerifyCode={handleVerifyCode}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card shadow="xl" padding="lg">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-900 rounded-2xl mb-4">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Бүртгүүлэх</h1>
            <p className="text-slate-600 mt-2">Шинэ хэрэглэгч үүсгэх</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <Input
              label="Нэр"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Овог нэр"
              leftIcon={<User className="w-5 h-5" />}
              required
              disabled={isLoading}
            />

            <Input
              label="И-мэйл хаяг"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              leftIcon={<Mail className="w-5 h-5" />}
              required
              disabled={isLoading}
            />

            <div>
              <div className="relative">
                <Input
                  label="Нууц үг"
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

            <div className="flex items-start gap-2 pt-2">
              <input
                type="checkbox"
                id="terms"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                disabled={isLoading}
              />
              <label htmlFor="terms" className="text-sm text-slate-600 cursor-pointer">
                Үйлчилгээний нөхцөл болон нууцлалын бодлогыг уншиж танилцсан бөгөөд зөвшөөрч байна
              </label>
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
                Бүртгүүлэх
              </Button>
            </div>

            <div className="text-center pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={onLoginClick}
                className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
                disabled={isLoading}
              >
                Бүртгэлтэй юу?{' '}
                <span className="font-medium text-slate-900">Нэвтрэх</span>
              </button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
