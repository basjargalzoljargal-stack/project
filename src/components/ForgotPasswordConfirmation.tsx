import { useState, useEffect } from 'react';
import { CheckCircle, Mail, ArrowLeft, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from './ui/Button';
import Card from './ui/Card';

interface ForgotPasswordConfirmationProps {
  email: string;
  onBackToLogin: () => void;
}

export default function ForgotPasswordConfirmation({ email, onBackToLogin }: ForgotPasswordConfirmationProps) {
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { requestPasswordReset } = useAuth();

  useEffect(() => {
    if (countdown > 0 && !canResend) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCanResend(true);
    }
  }, [countdown, canResend]);

  const maskEmail = (email: string) => {
    const [username, domain] = email.split('@');
    if (username.length <= 3) {
      return `${username[0]}***@${domain}`;
    }
    return `${username.slice(0, 3)}***@${domain}`;
  };

  const handleResend = async () => {
    setIsResending(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await requestPasswordReset(email);

      if (error) {
        setError(error);
      } else {
        setSuccess('Email дахин илгээгдлээ');
        setCountdown(60);
        setCanResend(false);
        setTimeout(() => setSuccess(''), 3000);
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card shadow="lg" padding="lg">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-2xl mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Email илгээгдлээ
            </h1>
            <p className="text-slate-600">
              Нууц үг сэргээх холбоос дараах хаяг руу илгээгдлээ:
            </p>
            <p className="text-slate-900 font-medium mt-2">
              {maskEmail(email)}
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-6">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg mb-6">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-800">{success}</p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-slate-700">
                <p className="font-medium text-slate-900 mb-1">Дараах алхмуудыг дагана уу:</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-600">
                  <li>Email хаягаа шалгана уу</li>
                  <li>"Нууц үг сэргээх" холбоос дээр дарна уу</li>
                  <li>Шинэ нууц үгээ оруулна уу</li>
                  <li>Шинэ нууц үгээрээ нэвтэрнэ үү</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="text-center mb-6">
            <p className="text-sm text-slate-600 mb-3">
              Email ирээгүй үү?
            </p>
            <button
              type="button"
              onClick={handleResend}
              disabled={!canResend || isResending}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
            >
              {isResending ? 'Илгээж байна...' : canResend ? 'Дахин илгээх' : `Дахин илгээх (${countdown}с)`}
            </button>
          </div>

          <Button
            type="button"
            variant="primary"
            fullWidth
            size="lg"
            onClick={onBackToLogin}
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Нэвтрэх хуудас руу буцах
          </Button>

          <div className="mt-6 p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-600 text-center">
              Холбоос нь 60 минутын дараа хүчингүй болно
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
