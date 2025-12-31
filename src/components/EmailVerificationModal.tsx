import { useState, useRef, useEffect } from 'react';
import { Mail, AlertCircle, CheckCircle } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';

interface EmailVerificationModalProps {
  email: string;
  onVerified: () => void;
  onResend: () => Promise<void>;
  onVerifyCode: (code: string) => Promise<{ error: string | null }>;
}

export default function EmailVerificationModal({
  email,
  onVerified,
  onResend,
  onVerifyCode
}: EmailVerificationModalProps) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(600);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const maskEmail = (email: string) => {
    const [username, domain] = email.split('@');
    if (username.length <= 3) {
      return `${username[0]}***@${domain}`;
    }
    return `${username.slice(0, 3)}***@${domain}`;
  };

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setError('');

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (!/^\d{6}$/.test(pastedData)) return;

    const newCode = pastedData.split('');
    setCode(newCode);
    inputRefs.current[5]?.focus();
  };

  const handleVerify = async () => {
    const verificationCode = code.join('');
    if (verificationCode.length !== 6) {
      setError('6 оронтой код оруулна уу');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const { error } = await onVerifyCode(verificationCode);
      if (error) {
        setError(error);
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        setSuccess('Амжилттай баталгаажлаа!');
        setTimeout(onVerified, 1500);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setError('');

    try {
      await onResend();
      setCountdown(600);
      setSuccess('Код дахин илгээгдлээ');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Код илгээхэд алдаа гарлаа');
    } finally {
      setIsResending(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md">
        <Card shadow="xl" padding="lg">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Имэйл баталгаажуулах
            </h2>
            <p className="text-slate-600">
              Баталгаажуулах код илгээгдлээ:
            </p>
            <p className="text-slate-900 font-medium mt-1">
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

          <div className="mb-6">
            <div className="flex gap-2 justify-center" onPaste={handlePaste}>
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-14 text-center text-2xl font-bold border-2 border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none transition-colors"
                  disabled={isVerifying}
                />
              ))}
            </div>
          </div>

          <div className="text-center mb-6">
            <p className="text-sm text-slate-600 mb-2">
              Хугацаа: <span className="font-medium text-slate-900">{formatTime(countdown)}</span>
            </p>
            <button
              type="button"
              onClick={handleResend}
              disabled={countdown > 0 || isResending}
              className="text-sm text-blue-600 hover:text-blue-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
            >
              {isResending ? 'Илгээж байна...' : 'Дахин илгээх'}
            </button>
          </div>

          <Button
            type="button"
            variant="primary"
            fullWidth
            size="lg"
            onClick={handleVerify}
            loading={isVerifying}
            disabled={isVerifying || code.join('').length !== 6}
          >
            Баталгаажуулах
          </Button>
        </Card>
      </div>
    </div>
  );
}
