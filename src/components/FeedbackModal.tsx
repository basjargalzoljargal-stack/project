import { useState } from 'react';
import { X, Edit, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Modal from './ui/Modal';
import Button from './ui/Button';

interface Proposal {
  id: string;
  title: string;
}

interface FeedbackModalProps {
  proposal: Proposal;
  onClose: () => void;
  onSubmit: () => void;
}

export default function FeedbackModal({ proposal, onClose, onSubmit }: FeedbackModalProps) {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');

    if (!feedback.trim()) {
      setError('Санал хүсэлтийг оруулна уу');
      return;
    }

    if (feedback.trim().length < 20) {
      setError('Санал хүсэлт 20-оос дээш тэмдэгт байх ёстой');
      return;
    }

    setIsLoading(true);

    try {
      const { error: updateError } = await supabase
        .from('proposals')
        .update({
          status: 'submitted',
          review_comments: feedback.trim(),
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', proposal.id);

      if (updateError) throw updateError;

      const { error: commentError } = await supabase
        .from('proposal_comments')
        .insert([{
          proposal_id: proposal.id,
          user_id: user?.id,
          comment: `Засварласны дараа дахин илгээнэ үү: ${feedback.trim()}`,
        }]);

      if (commentError) throw commentError;

      alert('Санал хүсэлт амжилттай илгээгдлээ');
      onSubmit();
    } catch (err: any) {
      setError(err.message || 'Илгээхэд алдаа гарлаа');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} size="md">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
            <Edit className="w-6 h-6 text-yellow-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Засварлуулах санал илгээх</h2>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <form className="space-y-5">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-900">
            <span className="font-semibold">Төсөл:</span> {proposal.title}
          </p>
          <p className="text-xs text-yellow-700 mt-1">
            Илгээгч таны санал хүсэлтийг харж, засварласны дараа дахин илгээх болно.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Санал, хүсэлт <span className="text-red-600">*</span>
          </label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Юу засварлах шаардлагатай болохыг тодорхой бичнэ үү (20+ тэмдэгт)..."
            rows={6}
            disabled={isLoading}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <p className="text-xs text-slate-500 mt-1">
            {feedback.length}/20 тэмдэгт
          </p>
        </div>

        <div className="flex gap-3 pt-4 border-t border-slate-200">
          <Button
            type="button"
            variant="outline"
            fullWidth
            onClick={onClose}
            disabled={isLoading}
          >
            Болих
          </Button>
          <Button
            type="button"
            variant="primary"
            fullWidth
            onClick={handleSubmit}
            loading={isLoading}
            disabled={isLoading}
          >
            Илгээх
          </Button>
        </div>
      </form>
    </Modal>
  );
}
