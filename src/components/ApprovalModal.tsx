import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';

interface Proposal {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  user_id: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
}

interface ApprovalModalProps {
  proposal: Proposal;
  onClose: () => void;
  onApprove: () => void;
}

export default function ApprovalModal({ proposal, onClose, onApprove }: ApprovalModalProps) {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState(proposal.start_date);
  const [endDate, setEndDate] = useState(proposal.end_date);
  const [priority, setPriority] = useState('medium');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [createPlan, setCreatePlan] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const { data } = await supabase
      .from('user_profiles')
      .select('id, full_name, email')
      .eq('status', 'active')
      .order('full_name');

    if (data) {
      setUsers(data);
    }
  };

  const handleSubmit = async () => {
    setError('');

    if (!startDate || !endDate) {
      setError('Эхлэх болон дуусах огноог оруулна уу');
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setError('Дуусах огноо эхлэх огнооноос хойш байх ёстой');
      return;
    }

    if (selectedAssignees.length === 0) {
      setError('Дор хаяж нэг хариуцагч сонгоно уу');
      return;
    }

    setIsLoading(true);

    try {
      const { error: updateError } = await supabase
        .from('proposals')
        .update({
          status: 'approved',
          priority,
          start_date: startDate,
          end_date: endDate,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', proposal.id);

      if (updateError) throw updateError;

      await supabase
        .from('proposal_assignees')
        .delete()
        .eq('proposal_id', proposal.id);

      const assigneeInserts = selectedAssignees.map(userId => ({
        proposal_id: proposal.id,
        user_id: userId,
      }));

      const { error: assigneeError } = await supabase
        .from('proposal_assignees')
        .insert(assigneeInserts);

      if (assigneeError) throw assigneeError;

      const { error: commentError } = await supabase
        .from('proposal_comments')
        .insert([{
          proposal_id: proposal.id,
          user_id: user?.id,
          comment: `Төсөл баталгаажлаа. Эрхэм зэрэг: ${priority === 'high' ? 'Өндөр' : priority === 'medium' ? 'Дунд' : 'Бага'}`,
        }]);

      if (commentError) throw commentError;

      if (createPlan) {
        const { data: taskData, error: taskError } = await supabase
          .from('tasks')
          .insert([{
            title: proposal.title,
            description: `Батлагдсан төслөөс үүссэн: ${proposal.title}`,
            source_type: 'manual',
            source_proposal_id: proposal.id,
            status: 'draft',
            priority,
            start_date: startDate,
            end_date: endDate,
            created_by: user?.id,
          }])
          .select()
          .single();

        if (taskError) throw taskError;

        if (taskData) {
          await supabase
            .from('proposals')
            .update({ linked_plan_id: taskData.id })
            .eq('id', proposal.id);
        }
      }

      alert(createPlan ? 'Төсөл баталгаажиж, төлөвлөгөө үүсгэлээ' : 'Төсөл амжилттай баталгаажлаа');
      onApprove();
    } catch (err: any) {
      setError(err.message || 'Баталгаажуулахад алдаа гарлаа');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} size="md">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Төсөл баталгаажуулах</h2>
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

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <span className="font-semibold">Төсөл:</span> {proposal.title}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Эхлэх огноо"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            disabled={isLoading}
          />
          <Input
            label="Дуусах огноо"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Хариуцагч хүмүүс
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3">
            {users.map((user) => (
              <label
                key={user.id}
                className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded transition-colors cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedAssignees.includes(user.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedAssignees([...selectedAssignees, user.id]);
                    } else {
                      setSelectedAssignees(selectedAssignees.filter(id => id !== user.id));
                    }
                  }}
                  disabled={isLoading}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-600 rounded"
                />
                <div className="flex-1">
                  <p className="text-sm text-slate-900">{user.full_name}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
          <input
            type="checkbox"
            id="createPlan"
            checked={createPlan}
            onChange={(e) => setCreatePlan(e.target.checked)}
            disabled={isLoading}
            className="w-5 h-5 text-blue-600 focus:ring-blue-600 rounded mt-0.5"
          />
          <label htmlFor="createPlan" className="flex-1 cursor-pointer">
            <div className="font-medium text-slate-900">Төлөвлөгөө үүсгэх</div>
            <div className="text-sm text-slate-600 mt-1">
              Баталгаажуулсны дараа автоматаар төлөвлөгөө үүсгэж, ажил хуваарилах боломжтой болно
            </div>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Эрхэм зэрэг
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 border-2 border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
              <input
                type="radio"
                name="priority"
                value="high"
                checked={priority === 'high'}
                onChange={() => setPriority('high')}
                disabled={isLoading}
                className="w-4 h-4 text-red-600 focus:ring-red-600"
              />
              <div>
                <div className="font-medium text-slate-900">Өндөр</div>
                <div className="text-xs text-slate-600">Яаралтай төсөл</div>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 border-2 border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
              <input
                type="radio"
                name="priority"
                value="medium"
                checked={priority === 'medium'}
                onChange={() => setPriority('medium')}
                disabled={isLoading}
                className="w-4 h-4 text-yellow-600 focus:ring-yellow-600"
              />
              <div>
                <div className="font-medium text-slate-900">Дунд</div>
                <div className="text-xs text-slate-600">Хэвийн төсөл</div>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 border-2 border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
              <input
                type="radio"
                name="priority"
                value="low"
                checked={priority === 'low'}
                onChange={() => setPriority('low')}
                disabled={isLoading}
                className="w-4 h-4 text-blue-600 focus:ring-blue-600"
              />
              <div>
                <div className="font-medium text-slate-900">Бага</div>
                <div className="text-xs text-slate-600">Урт хугацааны төсөл</div>
              </div>
            </label>
          </div>
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
            Баталгаажуулах
          </Button>
        </div>
      </form>
    </Modal>
  );
}
