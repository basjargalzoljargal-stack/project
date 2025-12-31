import { useState, useEffect } from 'react';
import { ChevronLeft, Plus, FileText, Edit, Eye, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Button from './ui/Button';
import Card from './ui/Card';
import Badge from './ui/Badge';
import Modal from './ui/Modal';
import ProjectProposalForm from './ProjectProposalForm';

interface Proposal {
  id: string;
  title: string;
  objective: string;
  status: string;
  submitted_at: string | null;
  created_at: string;
  review_comments: string | null;
  reviewer: {
    full_name: string;
  } | null;
  departments: Array<{
    name: string;
  }>;
  comments: Array<{
    comment: string;
    created_at: string;
    user: {
      full_name: string;
    };
  }>;
}

interface MyProposalsPageProps {
  onBack: () => void;
  onNewProposal: () => void;
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
      return { label: 'Батлагдсан', color: 'bg-green-100 text-green-800' };
    case 'rejected':
      return { label: 'Буцаагдсан', color: 'bg-red-100 text-red-800' };
    default:
      return { label: status, color: 'bg-slate-100 text-slate-800' };
  }
};

export default function MyProposalsPage({ onBack, onNewProposal }: MyProposalsPageProps) {
  const { user } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingProposalId, setEditingProposalId] = useState<string | null>(null);

  useEffect(() => {
    loadProposals();
  }, []);

  const loadProposals = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('proposals')
        .select(`
          *,
          reviewer:user_profiles!reviewed_by(full_name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const proposalsWithDetails = await Promise.all(
        (data || []).map(async (proposal) => {
          const [depts, comments] = await Promise.all([
            supabase
              .from('proposal_departments')
              .select('department:departments(name)')
              .eq('proposal_id', proposal.id),
            supabase
              .from('proposal_comments')
              .select('*, user:user_profiles(full_name)')
              .eq('proposal_id', proposal.id)
              .order('created_at', { ascending: false }),
          ]);

          return {
            ...proposal,
            reviewer: Array.isArray(proposal.reviewer) ? proposal.reviewer[0] : proposal.reviewer,
            departments: (depts.data || []).map((d: any) => d.department),
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

  const handleDelete = async (id: string) => {
    if (!confirm('Энэ төслийн саналыг устгахдаа итгэлтэй байна уу?')) {
      return;
    }

    const { error } = await supabase
      .from('proposals')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Устгахад алдаа гарлаа');
      return;
    }

    loadProposals();
  };

  const handleViewDetails = (proposal: Proposal) => {
    setSelectedProposal(proposal);
    setShowDetailModal(true);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('mn-MN');
  };

  const getFilteredProposals = () => {
    switch (activeTab) {
      case 'draft':
        return proposals.filter(p => p.status === 'draft');
      case 'submitted':
        return proposals.filter(p => p.status === 'submitted' || p.status === 'under_review');
      case 'approved':
        return proposals.filter(p => p.status === 'approved');
      case 'rejected':
        return proposals.filter(p => p.status === 'rejected');
      default:
        return proposals;
    }
  };

  const filteredProposals = getFilteredProposals();

  if (editingProposalId !== null) {
    return (
      <ProjectProposalForm
        proposalId={editingProposalId}
        onBack={() => {
          setEditingProposalId(null);
          loadProposals();
        }}
      />
    );
  }

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
              <h1 className="text-3xl font-bold text-slate-900">Миний саналууд</h1>
              <p className="text-slate-600">Илгээсэн болон ноороггүй саналууд</p>
            </div>
          </div>
          <Button variant="primary" onClick={onNewProposal}>
            <Plus className="w-5 h-5 mr-2" />
            Шинэ санал
          </Button>
        </div>

        <Card className="mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Бүгд ({proposals.length})
            </button>
            <button
              onClick={() => setActiveTab('draft')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'draft'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Ноорог ({proposals.filter(p => p.status === 'draft').length})
            </button>
            <button
              onClick={() => setActiveTab('submitted')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'submitted'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Илгээсэн ({proposals.filter(p => p.status === 'submitted' || p.status === 'under_review').length})
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'approved'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Батлагдсан ({proposals.filter(p => p.status === 'approved').length})
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'rejected'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Буцаагдсан ({proposals.filter(p => p.status === 'rejected').length})
            </button>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4">
          {filteredProposals.map((proposal) => {
            const statusBadge = getStatusBadge(proposal.status);
            return (
              <Card key={proposal.id} className="hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">
                          {proposal.title}
                        </h3>
                        <p className="text-sm text-slate-700 line-clamp-2 mb-3">
                          {proposal.objective}
                        </p>
                      </div>
                      <Badge className={`${statusBadge.color} ml-4`}>
                        {statusBadge.label}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
                      <span>
                        {proposal.status === 'draft'
                          ? `Үүсгэсэн: ${formatDate(proposal.created_at)}`
                          : `Илгээсэн: ${formatDate(proposal.submitted_at)}`
                        }
                      </span>
                      {proposal.departments.length > 0 && (
                        <div className="flex items-center gap-2">
                          {proposal.departments.slice(0, 2).map((dept, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {dept.name}
                            </Badge>
                          ))}
                          {proposal.departments.length > 2 && (
                            <span className="text-xs text-slate-500">
                              +{proposal.departments.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {proposal.review_comments && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-xs font-semibold text-yellow-900 mb-1">
                          {proposal.reviewer?.full_name}ын санал:
                        </p>
                        <p className="text-sm text-yellow-800">{proposal.review_comments}</p>
                      </div>
                    )}

                    {proposal.comments.length > 0 && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs font-semibold text-blue-900 mb-1">
                          Сүүлийн сэтгэгдэл:
                        </p>
                        <p className="text-sm text-blue-800">{proposal.comments[0].comment}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(proposal)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {proposal.status === 'draft' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingProposalId(proposal.id)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(proposal.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
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
              <p className="text-slate-600">Төсөл санал байхгүй байна</p>
              <Button variant="primary" className="mt-4" onClick={onNewProposal}>
                <Plus className="w-5 h-5 mr-2" />
                Шинэ санал нэмэх
              </Button>
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
                <Badge className={getStatusBadge(selectedProposal.status).color}>
                  {getStatusBadge(selectedProposal.status).label}
                </Badge>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Зорилго</h3>
                <p className="text-slate-900 whitespace-pre-wrap">{selectedProposal.objective}</p>
              </div>

              <div className="flex items-center gap-4 text-sm text-slate-600">
                <span>
                  {selectedProposal.status === 'draft'
                    ? `Үүсгэсэн: ${formatDate(selectedProposal.created_at)}`
                    : `Илгээсэн: ${formatDate(selectedProposal.submitted_at)}`
                  }
                </span>
              </div>

              {selectedProposal.review_comments && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h3 className="text-sm font-semibold text-yellow-900 mb-2">
                    {selectedProposal.reviewer?.full_name}ын санал
                  </h3>
                  <p className="text-sm text-yellow-800">{selectedProposal.review_comments}</p>
                </div>
              )}

              {selectedProposal.comments.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Сэтгэгдлүүд</h3>
                  <div className="space-y-3">
                    {selectedProposal.comments.map((comment: any, idx: number) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-lg">
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

            <div className="flex gap-3 pt-6 border-t border-slate-200">
              <Button variant="outline" fullWidth onClick={() => setShowDetailModal(false)}>
                Хаах
              </Button>
              {selectedProposal.status === 'draft' && (
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => {
                    setShowDetailModal(false);
                    setEditingProposalId(selectedProposal.id);
                  }}
                >
                  <Edit className="w-5 h-5 mr-2" />
                  Засах
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
