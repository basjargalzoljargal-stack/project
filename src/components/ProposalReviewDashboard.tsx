import { useState, useEffect } from 'react';
import { ChevronLeft, Search, Filter, FileText, Download, CheckCircle, XCircle, Edit, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Button from './ui/Button';
import Card from './ui/Card';
import Badge from './ui/Badge';
import Input from './ui/Input';
import Modal from './ui/Modal';
import ApprovalModal from './ApprovalModal';
import RejectionModal from './RejectionModal';
import FeedbackModal from './FeedbackModal';
import PlanCreationModal from './PlanCreationModal';

interface Proposal {
  id: string;
  title: string;
  objective: string;
  expected_result: string;
  start_date: string;
  end_date: string;
  budget: number | null;
  required_resources: string;
  status: string;
  priority: string | null;
  submitted_at: string;
  created_at: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
  departments: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  files: Array<{
    id: string;
    file_name: string;
    file_path: string;
    file_size: number;
  }>;
  comments: Array<{
    id: string;
    comment: string;
    created_at: string;
    user: {
      full_name: string;
    };
  }>;
}

interface ProposalReviewDashboardProps {
  onBack: () => void;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'draft':
      return { label: 'Ноорог', color: 'bg-slate-100 text-slate-800' };
    case 'submitted':
      return { label: 'Илгээсэн', color: 'bg-blue-100 text-blue-800' };
    case 'under_review':
      return { label: 'Хянагдаж байна', color: 'bg-yellow-100 text-yellow-800' };
    case 'approved':
      return { label: 'Баталгаажсан', color: 'bg-green-100 text-green-800' };
    case 'rejected':
      return { label: 'Буцаагдсан', color: 'bg-red-100 text-red-800' };
    default:
      return { label: status, color: 'bg-slate-100 text-slate-800' };
  }
};

export default function ProposalReviewDashboard({ onBack }: ProposalReviewDashboardProps) {
  const { user } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [filteredProposals, setFilteredProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);

  useEffect(() => {
    loadProposals();
  }, []);

  useEffect(() => {
    filterProposals();
  }, [searchTerm, statusFilter, proposals]);

  const loadProposals = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('proposals')
        .select(`
          *,
          user:user_profiles!user_id(id, full_name, email, avatar_url)
        `)
        .neq('status', 'draft')
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      const proposalsWithDetails = await Promise.all(
        (data || []).map(async (proposal) => {
          const [depts, files, comments] = await Promise.all([
            supabase
              .from('proposal_departments')
              .select('department:departments(id, name, color)')
              .eq('proposal_id', proposal.id),
            supabase
              .from('proposal_files')
              .select('*')
              .eq('proposal_id', proposal.id),
            supabase
              .from('proposal_comments')
              .select('*, user:user_profiles(full_name)')
              .eq('proposal_id', proposal.id)
              .order('created_at', { ascending: false }),
          ]);

          return {
            ...proposal,
            user: Array.isArray(proposal.user) ? proposal.user[0] : proposal.user,
            departments: (depts.data || []).map((d: any) => d.department),
            files: files.data || [],
            comments: comments.data || [],
          };
        })
      );

      setProposals(proposalsWithDetails);
    } catch (error) {
      console.error('Error loading proposals:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterProposals = () => {
    let filtered = proposals;

    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.user.full_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    setFilteredProposals(filtered);
  };

  const handleViewDetails = (proposal: Proposal) => {
    setSelectedProposal(proposal);
    setShowDetailModal(true);
  };

  const handleApprove = () => {
    setShowDetailModal(false);
    setShowApprovalModal(true);
  };

  const handleReject = () => {
    setShowDetailModal(false);
    setShowRejectionModal(true);
  };

  const handleRequestChanges = () => {
    setShowDetailModal(false);
    setShowFeedbackModal(true);
  };

  const handleActionComplete = () => {
    setShowApprovalModal(false);
    setShowRejectionModal(false);
    setShowFeedbackModal(false);
    setSelectedProposal(null);
    loadProposals();
  };

  const handleDownloadFile = async (file: any) => {
    try {
      const { data, error } = await supabase.storage
        .from('proposals')
        .download(file.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Файл татахад алдаа гарлаа');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('mn-MN');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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
              <h1 className="text-3xl font-bold text-slate-900">Төсөл саналууд хянах</h1>
              <p className="text-slate-600">Ирсэн саналуудыг хянаж, шийдвэр гаргах</p>
            </div>
          </div>
          <Button onClick={() => {
            console.log('Төлөвлөгөө нэмэх button clicked!');
            setShowCreatePlanModal(true);
          }}>
            <Plus className="w-5 h-5 mr-2" />
            Төлөвлөгөө нэмэх
          </Button>
        </div>

        <Card className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Input
                placeholder="Төслийн нэр, илгээгч хайх..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<Search className="w-5 h-5" />}
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Бүх төлөв</option>
                <option value="submitted">Илгээсэн</option>
                <option value="under_review">Хянагдаж байна</option>
                <option value="approved">Баталгаажсан</option>
                <option value="rejected">Буцаагдсан</option>
              </select>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4">
          {filteredProposals.map((proposal) => {
            const statusBadge = getStatusBadge(proposal.status);
            return (
              <Card key={proposal.id} className="hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                        {proposal.user.avatar_url ? (
                          <img
                            src={proposal.user.avatar_url}
                            alt={proposal.user.full_name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          proposal.user.full_name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 mb-1">
                          {proposal.title}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
                          <span>Илгээгч: {proposal.user.full_name}</span>
                          <span>Огноо: {formatDate(proposal.submitted_at)}</span>
                        </div>
                        <p className="text-sm text-slate-700 mb-3 line-clamp-2">
                          {proposal.objective}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={statusBadge.color}>{statusBadge.label}</Badge>
                          {proposal.budget && (
                            <Badge variant="outline">
                              {proposal.budget.toLocaleString()} ₮
                            </Badge>
                          )}
                          {proposal.departments.map((dept) => (
                            <Badge key={dept.id} variant="outline" className="text-xs">
                              {dept.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(proposal)}
                    >
                      Дэлгэрэнгүй
                    </Button>
                    {proposal.status === 'submitted' && (
                      <>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setSelectedProposal(proposal);
                            handleApprove();
                          }}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Батлах
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedProposal(proposal);
                            handleReject();
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Татгалзах
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {filteredProposals.length === 0 && (
          <Card>
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600">Төсөл санал олдсонгүй</p>
            </div>
          </Card>
        )}
      </div>

      {showDetailModal && selectedProposal && (
        <Modal onClose={() => setShowDetailModal(false)} size="lg">
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  {selectedProposal.title}
                </h2>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                      {selectedProposal.user.avatar_url ? (
                        <img
                          src={selectedProposal.user.avatar_url}
                          alt={selectedProposal.user.full_name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        selectedProposal.user.full_name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="text-sm text-slate-700">
                      {selectedProposal.user.full_name}
                    </span>
                  </div>
                  <Badge className={getStatusBadge(selectedProposal.status).color}>
                    {getStatusBadge(selectedProposal.status).label}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Зорилго</h3>
                <p className="text-slate-900 whitespace-pre-wrap">{selectedProposal.objective}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Хүрэх үр дүн</h3>
                <p className="text-slate-900 whitespace-pre-wrap">
                  {selectedProposal.expected_result || '-'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Эхлэх огноо</h3>
                  <p className="text-slate-900">{formatDate(selectedProposal.start_date)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Дуусах огноо</h3>
                  <p className="text-slate-900">{formatDate(selectedProposal.end_date)}</p>
                </div>
              </div>

              {selectedProposal.budget && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Төсөвт өртөг</h3>
                  <p className="text-slate-900 text-2xl font-bold">
                    {selectedProposal.budget.toLocaleString()} ₮
                  </p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Шаардлагатай нөөц</h3>
                <p className="text-slate-900 whitespace-pre-wrap">
                  {selectedProposal.required_resources || '-'}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Хамааралтай хэлтэс</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedProposal.departments.map((dept) => (
                    <Badge key={dept.id} variant="outline">
                      {dept.name}
                    </Badge>
                  ))}
                </div>
              </div>

              {selectedProposal.files.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">
                    Хавсаргасан файлууд
                  </h3>
                  <div className="space-y-2">
                    {selectedProposal.files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg"
                      >
                        <FileText className="w-5 h-5 text-slate-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-900 truncate">{file.file_name}</p>
                          <p className="text-xs text-slate-500">{formatFileSize(file.file_size)}</p>
                        </div>
                        <button
                          onClick={() => handleDownloadFile(file)}
                          className="text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedProposal.comments.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Сэтгэгдлүүд</h3>
                  <div className="space-y-3">
                    {selectedProposal.comments.map((comment: any) => (
                      <div key={comment.id} className="p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-900">
                            {comment.user.full_name}
                          </span>
                          <span className="text-xs text-slate-500">
                            {formatDate(comment.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700">{comment.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {selectedProposal.status === 'submitted' && (
              <div className="flex gap-3 pt-6 border-t border-slate-200">
                <Button variant="primary" onClick={handleApprove} fullWidth>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Батлах
                </Button>
                <Button variant="outline" onClick={handleRequestChanges} fullWidth>
                  <Edit className="w-5 h-5 mr-2" />
                  Засварлуулах
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReject}
                  fullWidth
                  className="text-red-600 hover:text-red-700"
                >
                  <XCircle className="w-5 h-5 mr-2" />
                  Татгалзах
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {showApprovalModal && selectedProposal && (
        <ApprovalModal
          proposal={selectedProposal}
          onClose={() => {
            setShowApprovalModal(false);
            setSelectedProposal(null);
          }}
          onApprove={handleActionComplete}
        />
      )}

      {showRejectionModal && selectedProposal && (
        <RejectionModal
          proposal={selectedProposal}
          onClose={() => {
            setShowRejectionModal(false);
            setSelectedProposal(null);
          }}
          onReject={handleActionComplete}
        />
      )}

      {showFeedbackModal && selectedProposal && (
        <FeedbackModal
          proposal={selectedProposal}
          onClose={() => {
            setShowFeedbackModal(false);
            setSelectedProposal(null);
          }}
          onSubmit={handleActionComplete}
        />
      )}

      {showCreatePlanModal && (
        <PlanCreationModal
          onClose={() => setShowCreatePlanModal(false)}
          onSave={() => {
            setShowCreatePlanModal(false);
            loadProposals();
          }}
        />
      )}
    </div>
  );
}
