import { useState, useEffect } from 'react';
import { ChevronLeft, FileText, Download, Eye, Plus, Trash2, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Button from './ui/Button';
import Card from './ui/Card';
import Badge from './ui/Badge';
import Modal from './ui/Modal';
import jsPDF from 'jspdf';

interface Report {
  id: string;
  plan_id: string;
  title: string;
  content: any;
  created_at: string;
  created_by: string;
  plan?: {
    title: string;
    description: string;
    due_date: string;
  };
  creator?: {
    full_name: string;
  };
}

interface ReportsPageProps {
  onBack: () => void;
  planIdForReport?: string;
}

export default function ReportsPage({ onBack, planIdForReport }: ReportsPageProps) {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [completedPlans, setCompletedPlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadReports();
    loadCompletedPlans();
  }, []);

  useEffect(() => {
    if (planIdForReport) {
      setSelectedPlanId(planIdForReport);
      setShowCreateModal(true);
    }
  }, [planIdForReport]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          creator:user_profiles!created_by(full_name)
        `)
        .eq('type', 'report')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const reportsWithPlans = await Promise.all(
        (data || []).map(async (report) => {
          if (report.linked_task_id) {
            const { data: planData } = await supabase
              .from('tasks')
              .select('title, description, due_date')
              .eq('id', report.linked_task_id)
              .maybeSingle();

            return {
              ...report,
              plan_id: report.linked_task_id,
              plan: planData,
              content: typeof report.content === 'string' ? JSON.parse(report.content) : report.content,
            };
          }
          return report;
        })
      );

      setReports(reportsWithPlans);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCompletedPlans = async () => {
    try {
      const { data: tasksData, error } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          due_date
        `)
        .eq('category', 'plan')
        .order('due_date', { ascending: false });

      if (error) throw error;

      const plansWithProgress = await Promise.all(
        (tasksData || []).map(async (task) => {
          const { data: subtasksData } = await supabase
            .from('subtasks')
            .select('id, status')
            .eq('parent_task_id', task.id);

          const { data: completionsData } = await supabase
            .from('task_completions')
            .select('id, subtask_id, review_status')
            .in('subtask_id', (subtasksData || []).map(s => s.id))
            .eq('review_status', 'approved');

          const allCompleted = (subtasksData?.length || 0) > 0 &&
            (completionsData?.length || 0) === (subtasksData?.length || 0);

          return {
            ...task,
            completed: allCompleted,
          };
        })
      );

      setCompletedPlans(plansWithProgress.filter(p => p.completed));
    } catch (error) {
      console.error('Error loading completed plans:', error);
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedPlanId) {
      alert('Төлөвлөгөө сонгоно уу');
      return;
    }

    setGenerating(true);
    try {
      const { data: planData, error: planError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', selectedPlanId)
        .single();

      if (planError) throw planError;

      const { data: subtasksData, error: subtasksError } = await supabase
        .from('subtasks')
        .select(`
          *,
          user_profiles!assigned_to(full_name)
        `)
        .eq('parent_task_id', selectedPlanId);

      if (subtasksError) throw subtasksError;

      const completionsData = await Promise.all(
        (subtasksData || []).map(async (subtask) => {
          const { data: completion } = await supabase
            .from('task_completions')
            .select('*')
            .eq('subtask_id', subtask.id)
            .eq('review_status', 'approved')
            .maybeSingle();

          return {
            subtask_title: subtask.title,
            assigned_to: subtask.user_profiles?.full_name,
            completion_percentage: completion?.completion_percentage || 0,
            completion_notes: completion?.completion_notes || '',
            submitted_at: completion?.submitted_at,
          };
        })
      );

      const reportContent = {
        plan_title: planData.title,
        plan_description: planData.description,
        start_date: planData.created_at,
        end_date: planData.due_date,
        total_tasks: subtasksData?.length || 0,
        completed_tasks: completionsData.length,
        tasks: completionsData,
      };

      const { error: insertError } = await supabase
        .from('documents')
        .insert([{
          title: `${planData.title} - Үр дүн тайлан`,
          type: 'report',
          content: JSON.stringify(reportContent),
          linked_task_id: selectedPlanId,
          created_by: user?.id,
        }]);

      if (insertError) throw insertError;

      alert('Тайлан амжилттай үүсгэлээ');
      setShowCreateModal(false);
      setSelectedPlanId('');
      loadReports();
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Тайлан үүсгэхэд алдаа гарлаа');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPDF = async (report: Report) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let y = margin;

      doc.setFontSize(20);
      doc.text(report.title, margin, y);
      y += 15;

      doc.setFontSize(12);
      doc.text(`Төлөвлөгөө: ${report.content.plan_title}`, margin, y);
      y += 10;

      doc.text(`Огноо: ${new Date(report.created_at).toLocaleDateString('mn-MN')}`, margin, y);
      y += 15;

      doc.setFontSize(14);
      doc.text('Биелэлтийн мэдээлэл', margin, y);
      y += 10;

      doc.setFontSize(11);
      doc.text(`Нийт ажил: ${report.content.total_tasks}`, margin, y);
      y += 7;
      doc.text(`Дууссан ажил: ${report.content.completed_tasks}`, margin, y);
      y += 7;
      doc.text(`Гүйцэтгэл: ${Math.round((report.content.completed_tasks / report.content.total_tasks) * 100)}%`, margin, y);
      y += 15;

      doc.setFontSize(14);
      doc.text('Ажлуудын дэлгэрэнгүй', margin, y);
      y += 10;

      doc.setFontSize(10);
      (report.content.tasks || []).forEach((task: any, index: number) => {
        if (y > 270) {
          doc.addPage();
          y = margin;
        }

        doc.text(`${index + 1}. ${task.subtask_title}`, margin, y);
        y += 6;
        doc.text(`   Хариуцагч: ${task.assigned_to || 'Тодорхойгүй'}`, margin, y);
        y += 6;
        doc.text(`   Гүйцэтгэл: ${task.completion_percentage}%`, margin, y);
        y += 6;
        if (task.completion_notes) {
          const notes = doc.splitTextToSize(`   Тэмдэглэл: ${task.completion_notes}`, pageWidth - margin * 2);
          doc.text(notes, margin, y);
          y += notes.length * 6;
        }
        y += 5;
      });

      doc.save(`${report.title}.pdf`);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('PDF татахад алдаа гарлаа');
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('Энэ тайланг устгах уу?')) return;

    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      alert('Тайлан устгагдлаа');
      loadReports();
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('Тайлан устгахад алдаа гарлаа');
    }
  };

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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={onBack}>
              <ChevronLeft className="w-5 h-5 mr-2" />
              Буцах
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Тайлангууд</h1>
              <p className="text-slate-600">Төлөвлөгөө биелэлтийн тайлангууд</p>
            </div>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-5 h-5 mr-2" />
            Тайлан үүсгэх
          </Button>
        </div>

        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id} className="hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">{report.title}</h3>
                    {report.plan && (
                      <p className="text-sm text-slate-600 mb-2">Төлөвлөгөө: {report.plan.title}</p>
                    )}
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <span>Үүсгэсэн: {formatDate(report.created_at)}</span>
                      <span>•</span>
                      <span>{report.creator?.full_name}</span>
                    </div>
                    {report.content && (
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline">
                          {report.content.completed_tasks || 0}/{report.content.total_tasks || 0} ажил
                        </Badge>
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Дууссан
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedReport(report);
                      setShowDetailModal(true);
                    }}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Харах
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadPDF(report)}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteReport(report.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {reports.length === 0 && (
            <Card>
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600">Тайлан байхгүй байна</p>
                <Button onClick={() => setShowCreateModal(true)} className="mt-4">
                  <Plus className="w-5 h-5 mr-2" />
                  Эхний тайлан үүсгэх
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {showCreateModal && (
        <Modal onClose={() => setShowCreateModal(false)}>
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Тайлан үүсгэх</h2>
              <p className="text-slate-600">Дууссан төлөвлөгөөнөөс тайлан үүсгэх</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Төлөвлөгөө сонгох *
              </label>
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Сонгох</option>
                {completedPlans.map(plan => (
                  <option key={plan.id} value={plan.id}>
                    {plan.title} - {formatDate(plan.due_date)}
                  </option>
                ))}
              </select>
            </div>

            {completedPlans.length === 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Одоогоор дууссан төлөвлөгөө байхгүй байна. Эхлээд төлөвлөгөө биелүүлж дуусгана уу.
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <Button variant="outline" onClick={() => setShowCreateModal(false)} fullWidth>
                Болих
              </Button>
              <Button
                onClick={handleGenerateReport}
                disabled={!selectedPlanId || generating}
                fullWidth
              >
                {generating ? 'Үүсгэж байна...' : 'Тайлан үүсгэх'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {showDetailModal && selectedReport && (
        <Modal onClose={() => setShowDetailModal(false)} size="lg">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">{selectedReport.title}</h2>
              {selectedReport.plan && (
                <p className="text-slate-600">Төлөвлөгөө: {selectedReport.plan.title}</p>
              )}
            </div>

            {selectedReport.content && (
              <div className="space-y-4">
                <Card className="bg-blue-50 border-blue-200">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Нийт ажил</p>
                      <p className="text-2xl font-bold text-slate-900">{selectedReport.content.total_tasks}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Дууссан</p>
                      <p className="text-2xl font-bold text-green-600">{selectedReport.content.completed_tasks}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Гүйцэтгэл</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {Math.round((selectedReport.content.completed_tasks / selectedReport.content.total_tasks) * 100)}%
                      </p>
                    </div>
                  </div>
                </Card>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Ажлуудын дэлгэрэнгүй</h3>
                  <div className="space-y-3">
                    {(selectedReport.content.tasks || []).map((task: any, index: number) => (
                      <Card key={index} className="bg-slate-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-slate-900 mb-2">{task.subtask_title}</h4>
                            <div className="space-y-1 text-sm text-slate-600">
                              <p>Хариуцагч: {task.assigned_to || 'Тодорхойгүй'}</p>
                              <p>Гүйцэтгэл: {task.completion_percentage}%</p>
                              {task.completion_notes && (
                                <p className="mt-2 text-slate-700">{task.completion_notes}</p>
                              )}
                            </div>
                          </div>
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Дууссан
                          </Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <Button variant="outline" onClick={() => setShowDetailModal(false)} fullWidth>
                Хаах
              </Button>
              <Button onClick={() => handleDownloadPDF(selectedReport)} fullWidth>
                <Download className="w-5 h-5 mr-2" />
                PDF татах
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
