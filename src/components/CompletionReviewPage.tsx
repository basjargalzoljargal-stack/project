import { useState, useEffect } from 'react';
import { ChevronLeft, Search, CheckCircle, XCircle, RefreshCw, Eye, Download, FileText, Image as ImageIcon, Video, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Button from './ui/Button';
import Card from './ui/Card';
import Badge from './ui/Badge';
import Input from './ui/Input';
import Modal from './ui/Modal';

interface Completion {
  id: string;
  assignment: {
    task: {
      title: string;
      description: string;
    };
    deadline: string;
  };
  user: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
  progress_percentage: number;
  is_fully_completed: boolean;
  work_description: string;
  challenges: string;
  next_steps: string;
  status: string;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by_user: {
    full_name: string;
  } | null;
  reviewer_comment: string;
  file_count: number;
}

interface CompletionFile {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  file_category: string;
}

interface CompletionReviewPageProps {
  onBack: () => void;
}

export default function CompletionReviewPage({ onBack }: CompletionReviewPageProps) {
  const { user } = useAuth();
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [filteredCompletions, setFilteredCompletions] = useState<Completion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCompletion, setSelectedCompletion] = useState<Completion | null>(null);
  const [completionFiles, setCompletionFiles] = useState<CompletionFile[]>([]);
  const [reviewComment, setReviewComment] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    submitted: 0,
    under_review: 0,
    approved: 0,
    revision_requested: 0,
    rejected: 0,
  });

  useEffect(() => {
    loadCompletions();
  }, []);

  useEffect(() => {
    filterCompletions();
  }, [searchTerm, statusFilter, completions]);

  const loadCompletions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('task_completions')
        .select(`
          *,
          assignment:task_assignments(
            task:tasks(title, description),
            deadline
          ),
          user:user_profiles!user_id(id, full_name, email, avatar_url),
          reviewed_by_user:user_profiles!reviewed_by(full_name)
        `)
        .neq('status', 'draft')
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      const completionsWithCounts = await Promise.all(
        (data || []).map(async (comp: any) => {
          const { count } = await supabase
            .from('completion_files')
            .select('*', { count: 'exact', head: true })
            .eq('completion_id', comp.id);

          return {
            ...comp,
            assignment: Array.isArray(comp.assignment) ? comp.assignment[0] : comp.assignment,
            user: Array.isArray(comp.user) ? comp.user[0] : comp.user,
            reviewed_by_user: Array.isArray(comp.reviewed_by_user) ? comp.reviewed_by_user[0] : comp.reviewed_by_user,
            file_count: count || 0,
          };
        })
      );

      setCompletions(completionsWithCounts);

      const statsData = {
        total: completionsWithCounts.length,
        submitted: completionsWithCounts.filter(c => c.status === 'submitted').length,
        under_review: completionsWithCounts.filter(c => c.status === 'under_review').length,
        approved: completionsWithCounts.filter(c => c.status === 'approved').length,
        revision_requested: completionsWithCounts.filter(c => c.status === 'revision_requested').length,
        rejected: completionsWithCounts.filter(c => c.status === 'rejected').length,
      };
      setStats(statsData);
    } catch (error) {
      console.error('Error loading completions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterCompletions = () => {
    let filtered = completions;

    if (searchTerm) {
      filtered = filtered.filter(
        (c) =>
          c.assignment.task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.user.full_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }

    setFilteredCompletions(filtered);
  };

  const handleViewDetails = async (completion: Completion) => {
    setSelectedCompletion(completion);
    setReviewComment(completion.reviewer_comment || '');

    const { data } = await supabase
      .from('completion_files')
      .select('*')
      .eq('completion_id', completion.id);

    setCompletionFiles(data || []);
  };

  const handleReview = async (newStatus: 'approved' | 'revision_requested' | 'rejected') => {
    if (!selectedCompletion) return;

    if (!reviewComment && newStatus !== 'approved') {
      alert('Тайлбар оруулна уу');
      return;
    }

    setIsReviewing(true);
    try {
      await supabase
        .from('task_completions')
        .update({
          status: newStatus,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
          reviewer_comment: reviewComment,
        })
        .eq('id', selectedCompletion.id);

      if (newStatus === 'approved') {
        await supabase
          .from('task_assignments')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', selectedCompletion.assignment.id);
      }

      alert(
        newStatus === 'approved'
          ? 'Амжилттай батлагдлаа'
          : newStatus === 'revision_requested'
          ? 'Засварын хүсэлт илгээгдлээ'
          : 'Татгалзлаа'
      );

      setSelectedCompletion(null);
      loadCompletions();
    } catch (error) {
      console.error('Error reviewing completion:', error);
      alert('Алдаа гарлаа');
    } finally {
      setIsReviewing(false);
    }
  };

  const handleDownloadFile = async (file: CompletionFile) => {
    const { data } = await supabase.storage
      .from('task-completions')
      .download(file.file_path);

    if (data) {
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return { label: 'Илгээгдсэн', color: 'bg-blue-100 text-blue-800', icon: RefreshCw };
      case 'under_review':
        return { label: 'Хянагдаж байна', color: 'bg-purple-100 text-purple-800', icon: Eye };
      case 'approved':
        return { label: 'Батлагдсан', color: 'bg-green-100 text-green-800', icon: CheckCircle };
      case 'revision_requested':
        return { label: 'Засвар хийх', color: 'bg-orange-100 text-orange-800', icon: RefreshCw };
      case 'rejected':
        return { label: 'Татгалзсан', color: 'bg-red-100 text-red-800', icon: XCircle };
      default:
        return { label: status, color: 'bg-slate-100 text-slate-800', icon: RefreshCw };
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress <= 30) return 'bg-red-500';
    if (progress <= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-blue-600" />;
    if (type.startsWith('video/')) return <Video className="w-5 h-5 text-purple-600" />;
    return <FileText className="w-5 h-5 text-slate-600" />;
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
              <h1 className="text-3xl font-bold text-slate-900">Гүйцэтгэлийн тайлан хянах</h1>
              <p className="text-slate-600">Илгээгдсэн ажлын гүйцэтгэл</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
          <Card className="p-4">
            <div className="text-center">
              <p className="text-sm text-slate-600">Нийт</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-center">
              <p className="text-sm text-slate-600">Илгээгдсэн</p>
              <p className="text-2xl font-bold text-blue-600">{stats.submitted}</p>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-center">
              <p className="text-sm text-slate-600">Хянагдаж байна</p>
              <p className="text-2xl font-bold text-purple-600">{stats.under_review}</p>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-center">
              <p className="text-sm text-slate-600">Батлагдсан</p>
              <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-center">
              <p className="text-sm text-slate-600">Засвар шаардлага</p>
              <p className="text-2xl font-bold text-orange-600">{stats.revision_requested}</p>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-center">
              <p className="text-sm text-slate-600">Татгалзсан</p>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            </div>
          </Card>
        </div>

        <Card className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              placeholder="Ажил, хүн хайх..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="w-5 h-5" />}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Бүх төлөв</option>
              <option value="submitted">Илгээгдсэн</option>
              <option value="under_review">Хянагдаж байна</option>
              <option value="approved">Батлагдсан</option>
              <option value="revision_requested">Засвар шаардлага</option>
              <option value="rejected">Татгалзсан</option>
            </select>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4">
          {filteredCompletions.map((completion) => {
            const statusBadge = getStatusBadge(completion.status);
            const StatusIcon = statusBadge.icon;

            return (
              <Card key={completion.id} className="hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                      {completion.user.avatar_url ? (
                        <img
                          src={completion.user.avatar_url}
                          alt={completion.user.full_name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        completion.user.full_name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">
                        {completion.assignment.task.title}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-slate-600 mb-3">
                        <span>{completion.user.full_name}</span>
                        <span>•</span>
                        <span>
                          Илгээсэн:{' '}
                          {new Date(completion.submitted_at).toLocaleDateString('mn-MN')}
                        </span>
                        {completion.file_count > 0 && (
                          <>
                            <span>•</span>
                            <Badge variant="outline" className="text-xs">
                              📎 {completion.file_count} файл
                            </Badge>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex-1 max-w-xs">
                          <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                            <span>Гүйцэтгэл</span>
                            <span className="font-semibold">{completion.progress_percentage}%</span>
                          </div>
                          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getProgressColor(completion.progress_percentage)}`}
                              style={{ width: `${completion.progress_percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={statusBadge.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusBadge.label}
                        </Badge>
                        {completion.is_fully_completed && (
                          <Badge className="bg-green-100 text-green-800">
                            ✓ Дууссан
                          </Badge>
                        )}
                      </div>
                      {completion.reviewed_by_user && (
                        <p className="text-xs text-slate-500 mt-2">
                          Хянасан: {completion.reviewed_by_user.full_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetails(completion)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Дэлгэрэнгүй
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        {filteredCompletions.length === 0 && (
          <Card>
            <div className="text-center py-12">
              <Eye className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600">Тайлан олдсонгүй</p>
            </div>
          </Card>
        )}
      </div>

      {selectedCompletion && (
        <Modal onClose={() => setSelectedCompletion(null)} size="xl">
          <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Гүйцэтгэлийн дэлгэрэнгүй</h2>
              <button
                onClick={() => setSelectedCompletion(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <Card className="bg-slate-50">
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-slate-600">Ажлын нэр</p>
                  <p className="font-semibold text-slate-900">
                    {selectedCompletion.assignment.task.title}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-600">Гүйцэтгэсэн</p>
                    <p className="text-sm text-slate-900">{selectedCompletion.user.full_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Илгээсэн огноо</p>
                    <p className="text-sm text-slate-900">
                      {new Date(selectedCompletion.submitted_at).toLocaleDateString('mn-MN')}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-700">Гүйцэтгэлийн хувь</p>
                <span className="text-xl font-bold">
                  {selectedCompletion.progress_percentage}%
                </span>
              </div>
              <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getProgressColor(selectedCompletion.progress_percentage)}`}
                  style={{ width: `${selectedCompletion.progress_percentage}%` }}
                />
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Хийсэн ажил</p>
              <Card className="bg-slate-50">
                <p className="text-sm text-slate-900 whitespace-pre-wrap">
                  {selectedCompletion.work_description}
                </p>
              </Card>
            </div>

            {selectedCompletion.challenges && (
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Асуудал/саад бэрхшээл</p>
                <Card className="bg-amber-50 border-amber-200">
                  <p className="text-sm text-slate-900 whitespace-pre-wrap">
                    {selectedCompletion.challenges}
                  </p>
                </Card>
              </div>
            )}

            {selectedCompletion.next_steps && (
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Дараагийн алхам</p>
                <Card className="bg-blue-50 border-blue-200">
                  <p className="text-sm text-slate-900 whitespace-pre-wrap">
                    {selectedCompletion.next_steps}
                  </p>
                </Card>
              </div>
            )}

            {completionFiles.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-700 mb-3">
                  Хавсаргасан файлууд ({completionFiles.length})
                </p>
                <div className="space-y-2">
                  {completionFiles.map((file) => (
                    <Card key={file.id} className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3">
                        {getFileIcon(file.file_type)}
                        <div>
                          <p className="text-sm font-medium text-slate-900">{file.file_name}</p>
                          <p className="text-xs text-slate-500">
                            {formatFileSize(file.file_size)} • {file.file_category}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadFile(file)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {selectedCompletion.reviewer_comment && (
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Хяналтын тайлбар</p>
                <Card className="bg-purple-50 border-purple-200">
                  <p className="text-sm text-slate-900 whitespace-pre-wrap">
                    {selectedCompletion.reviewer_comment}
                  </p>
                </Card>
              </div>
            )}

            {selectedCompletion.status !== 'approved' && selectedCompletion.status !== 'rejected' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <MessageSquare className="w-4 h-4 inline mr-1" />
                  Хяналтын тайлбар
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Санал хүсэлт, тайлбар..."
                  rows={4}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            )}

            {selectedCompletion.status !== 'approved' && selectedCompletion.status !== 'rejected' && (
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <Button
                  variant="outline"
                  onClick={() => setSelectedCompletion(null)}
                  disabled={isReviewing}
                  fullWidth
                >
                  Хаах
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleReview('revision_requested')}
                  loading={isReviewing}
                  disabled={isReviewing}
                  className="text-orange-600 border-orange-600 hover:bg-orange-50"
                  fullWidth
                  leftIcon={<RefreshCw className="w-4 h-4" />}
                >
                  Засвар хүсэх
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleReview('rejected')}
                  loading={isReviewing}
                  disabled={isReviewing}
                  className="text-red-600 border-red-600 hover:bg-red-50"
                  fullWidth
                  leftIcon={<XCircle className="w-4 h-4" />}
                >
                  Татгалзах
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleReview('approved')}
                  loading={isReviewing}
                  disabled={isReviewing}
                  fullWidth
                  leftIcon={<CheckCircle className="w-4 h-4" />}
                >
                  Батлах
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
