import { useState } from 'react';
import { Mail, ArrowLeft, AlertCircle, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from './ui/Button';
import Input from './ui/Input';
import Card from './ui/Card';

interface ForgotPasswordPageProps {
  onBackToLogin: () => void;
  onEmailSent: (email: string) => void;
}

export default function ForgotPasswordPage({ onBackToLogin, onEmailSent }: ForgotPasswordPageProps) {
  const [email, setEmail] = useState('');
  const [resetMethod, setResetMethod] = useState<'email' | 'sms'>('email');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { requestPasswordReset } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('И-мэйл хаяг буруу байна');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await requestPasswordReset(email);

      if (error) {
        setError(error);
      } else {
        onEmailSent(email);
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
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Нууц үг мартсан</h1>
            <p className="text-slate-600 mt-2">Бүртгэлтэй email хаягаа оруулна уу</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

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
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Сэргээх арга
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 border-2 border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="radio"
                    name="resetMethod"
                    value="email"
                    checked={resetMethod === 'email'}
                    onChange={() => setResetMethod('email')}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-600"
                    disabled={isLoading}
                  />
                  <span className="text-sm text-slate-900">Email-ээр сэргээх</span>
                </label>
                <label className="flex items-center gap-3 p-3 border-2 border-slate-200 rounded-lg cursor-not-allowed opacity-50">
                  <input
                    type="radio"
                    name="resetMethod"
                    value="sms"
                    checked={resetMethod === 'sms'}
                    onChange={() => setResetMethod('sms')}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-600"
                    disabled={true}
                  />
                  <span className="text-sm text-slate-600">SMS-ээр сэргээх (Утасны дугаар бүртгэлтэй бол)</span>
                </label>
              </div>
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
                <Send className="w-5 h-5 mr-2" />
                Илгээх
              </Button>
            </div>

            <div className="text-center pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={onBackToLogin}
                className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
                disabled={isLoading}
              >
                <ArrowLeft className="w-4 h-4" />
                Буцаж нэвтрэх
              </button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
