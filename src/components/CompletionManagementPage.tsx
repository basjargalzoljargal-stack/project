import { useState, useEffect } from 'react';
import { ChevronLeft, CheckCircle, Clock, FileText, Eye, Check, BarChart3 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Button from './ui/Button';
import Card from './ui/Card';
import Badge from './ui/Badge';
import Modal from './ui/Modal';

interface Plan {
  id: string;
  title: string;
  description: string;
  due_date: string;
  status: string;
  subtasks: Subtask[];
  progress: number;
}

interface Subtask {
  id: string;
  title: string;
  description: string;
  due_date: string;
  assigned_to: string;
  assigned_to_name?: string;
  status: string;
  completion?: {
    id: string;
    completion_percentage: number;
    completion_notes: string;
    submitted_at: string;
    review_status: string;
  };
}

interface CompletionManagementPageProps {
  onBack: () => void;
  onCreateReport: (planId: string) => void;
}

export default function CompletionManagementPage({ onBack, onCreateReport }: CompletionManagementPageProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'submitted'>('pending');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubtask, setSelectedSubtask] = useState<Subtask | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('category', 'plan')
        .order('due_date', { ascending: true });

      if (tasksError) throw tasksError;

      const plansWithSubtasks = await Promise.all(
        (tasksData || []).map(async (task) => {
          const { data: subtasksData, error: subtasksError } = await supabase
            .from('subtasks')
            .select(`
              *,
              user_profiles!assigned_to(full_name)
            `)
            .eq('parent_task_id', task.id);

          if (subtasksError) throw subtasksError;

          const subtasksWithCompletions = await Promise.all(
            (subtasksData || []).map(async (subtask) => {
              const { data: completionData } = await supabase
                .from('task_completions')
                .select('*')
                .eq('subtask_id', subtask.id)
                .order('submitted_at', { ascending: false })
                .limit(1)
                .maybeSingle();

              return {
                ...subtask,
                assigned_to_name: subtask.user_profiles?.full_name,
                completion: completionData,
              };
            })
          );

          const completedCount = subtasksWithCompletions.filter(
            st => st.completion?.review_status === 'approved'
          ).length;
          const progress = subtasksWithCompletions.length > 0
            ? Math.round((completedCount / subtasksWithCompletions.length) * 100)
            : 0;

          return {
            ...task,
            subtasks: subtasksWithCompletions,
            progress,
          };
        })
      );

      setPlans(plansWithSubtasks);
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveCompletion = async (subtaskId: string, completionId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('task_completions')
        .update({ review_status: 'approved' })
        .eq('id', completionId);

      if (updateError) throw updateError;

      const { error: subtaskError } = await supabase
        .from('subtasks')
        .update({ status: 'completed' })
        .eq('id', subtaskId);

      if (subtaskError) throw subtaskError;

      alert('Биелэлт баталгаажлаа');
      loadPlans();
      setShowDetailModal(false);
    } catch (error) {
      console.error('Error approving completion:', error);
      alert('Баталгаажуулахад алдаа гарлаа');
    }
  };

  const handleRejectCompletion = async (completionId: string) => {
    const reason = prompt('Буцаах шалтгаан оруулна уу:');
    if (!reason) return;

    try {
      const { error } = await supabase
        .from('task_completions')
        .update({
          review_status: 'rejected',
          reviewer_notes: reason,
        })
        .eq('id', completionId);

      if (error) throw error;

      alert('Биелэлт буцаагдлаа');
      loadPlans();
      setShowDetailModal(false);
    } catch (error) {
      console.error('Error rejecting completion:', error);
      alert('Буцаахад алдаа гарлаа');
    }
  };

  const pendingPlans = plans.filter(p => p.progress < 100);
  const completedPlans = plans.filter(p => p.progress === 100);
  const submittedCompletions = plans
    .flatMap(p => p.subtasks)
    .filter(st => st.completion?.review_status === 'pending');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('mn-MN');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Ачааллаж байна...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={onBack}>
            <ChevronLeft className="w-5 h-5 mr-2" />
            Буцах
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Биелэлт</h1>
            <p className="text-slate-600">Төлөвлөгөө биелэлт хянах, баталгаажуулах</p>
          </div>
        </div>

        <div className="flex gap-4 mb-6">
          <Button
            variant={activeTab === 'pending' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('pending')}
          >
            Хүлээгдэж буй
          </Button>
          <Button
            variant={activeTab === 'submitted' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('submitted')}
          >
            Ирсэн биелэлтүүд ({submittedCompletions.length})
          </Button>
        </div>

        {activeTab === 'pending' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-4">Хүлээгдэж буй төлөвлөгөөнүүд</h2>
              <div className="space-y-4">
                {pendingPlans.map((plan) => (
                  <Card key={plan.id} className="hover:shadow-lg transition-shadow">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-slate-900">{plan.title}</h3>
                            <Badge variant="outline">{plan.progress}% дууссан</Badge>
                          </div>
                          <p className="text-sm text-slate-600 mb-2">Deadline: {formatDate(plan.due_date)}</p>
                          {plan.description && (
                            <p className="text-sm text-slate-700">{plan.description}</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="w-full bg-slate-200 rounded-full h-2 mb-3">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${plan.progress}%` }}
                          ></div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm font-medium text-slate-700">Ажлууд:</p>
                          {plan.subtasks.map((subtask) => (
                            <div
                              key={subtask.id}
                              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                {subtask.completion?.review_status === 'approved' ? (
                                  <CheckCircle className="w-5 h-5 text-green-600" />
                                ) : (
                                  <Clock className="w-5 h-5 text-slate-400" />
                                )}
                                <div>
                                  <p className="text-sm font-medium text-slate-900">{subtask.title}</p>
                                  <p className="text-xs text-slate-600">
                                    {subtask.assigned_to_name || 'Хэн ч хариуцаагүй'}
                                    {subtask.completion && (
                                      <span className="ml-2">
                                        {subtask.completion.completion_percentage}%
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>
                              {subtask.completion?.review_status === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedSubtask(subtask);
                                    setShowDetailModal(true);
                                  }}
                                >
                                  Харах
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}

                {pendingPlans.length === 0 && (
                  <Card>
                    <div className="text-center py-12">
                      <Clock className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                      <p className="text-slate-600">Хүлээгдэж буй төлөвлөгөө байхгүй байна</p>
                    </div>
                  </Card>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-4">Бүрэн дууссан төлөвлөгөөнүүд</h2>
              <div className="space-y-4">
                {completedPlans.map((plan) => (
                  <Card key={plan.id} className="bg-green-50 border-green-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">{plan.title}</h3>
                          <p className="text-sm text-slate-600">
                            Бүх биелэлт ирсэн • {plan.subtasks.length} ажил
                          </p>
                        </div>
                      </div>
                      <Button onClick={() => onCreateReport(plan.id)}>
                        <BarChart3 className="w-5 h-5 mr-2" />
                        Тайлан үүсгэх
                      </Button>
                    </div>
                  </Card>
                ))}

                {completedPlans.length === 0 && (
                  <Card>
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                      <p className="text-slate-600">Дууссан төлөвлөгөө байхгүй байна</p>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'submitted' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Ирсэн биелэлтүүд</h2>
            {submittedCompletions.map((subtask) => (
              <Card key={subtask.id} className="hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">{subtask.title}</h3>
                    <div className="space-y-1 text-sm text-slate-600">
                      <p>Илгээгч: {subtask.assigned_to_name}</p>
                      <p>Илгээсэн: {formatDate(subtask.completion!.submitted_at)}</p>
                      <p>Progress: {subtask.completion!.completion_percentage}%</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedSubtask(subtask);
                        setShowDetailModal(true);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Харах
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApproveCompletion(subtask.id, subtask.completion!.id)}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Батлах
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            {submittedCompletions.length === 0 && (
              <Card>
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-600">Ирсэн биелэлт байхгүй байна</p>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>

      {showDetailModal && selectedSubtask && selectedSubtask.completion && (
        <Modal onClose={() => setShowDetailModal(false)} size="lg">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">{selectedSubtask.title}</h2>
              <p className="text-slate-600">{selectedSubtask.description}</p>
            </div>

            <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-1">Илгээгч</h3>
                <p className="text-slate-900">{selectedSubtask.assigned_to_name}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-1">Илгээсэн огноо</h3>
                <p className="text-slate-900">{formatDate(selectedSubtask.completion.submitted_at)}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-1">Гүйцэтгэл</h3>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${selectedSubtask.completion.completion_percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-slate-900">
                    {selectedSubtask.completion.completion_percentage}%
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-1">Тэмдэглэл</h3>
                <p className="text-slate-900 whitespace-pre-wrap">
                  {selectedSubtask.completion.completion_notes || '-'}
                </p>
              </div>
            </div>

            {selectedSubtask.completion.review_status === 'pending' && (
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <Button
                  variant="primary"
                  onClick={() => handleApproveCompletion(selectedSubtask.id, selectedSubtask.completion!.id)}
                  fullWidth
                >
                  <Check className="w-5 h-5 mr-2" />
                  Батлах
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleRejectCompletion(selectedSubtask.completion!.id)}
                  fullWidth
                  className="text-red-600 hover:text-red-700"
                >
                  Буцаах
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
