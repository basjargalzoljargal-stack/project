import { useState, useEffect } from 'react';
import { ChevronLeft, Search, Filter, User, Folder, Calendar, TrendingUp, CheckCircle, Clock, XCircle, RefreshCw, FileCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Button from './ui/Button';
import Card from './ui/Card';
import Badge from './ui/Badge';
import Input from './ui/Input';
import CompletionSubmissionForm from './CompletionSubmissionForm';

interface Assignment {
  id: string;
  task: {
    id: string;
    title: string;
    description: string;
  };
  user: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
  assigned_by_user: {
    full_name: string;
  };
  department?: {
    name: string;
    color: string;
  };
  is_primary: boolean;
  assignment_type: string;
  status: string;
  priority: string;
  deadline: string;
  notes: string;
  created_at: string;
  accepted_at: string | null;
  completed_at: string | null;
}

interface TaskAssignmentPageProps {
  onBack: () => void;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'pending':
      return { label: 'Хүлээгдэж буй', color: 'bg-yellow-100 text-yellow-800', icon: Clock };
    case 'accepted':
      return { label: 'Хүлээн авсан', color: 'bg-blue-100 text-blue-800', icon: CheckCircle };
    case 'in_progress':
      return { label: 'Хийгдэж байна', color: 'bg-purple-100 text-purple-800', icon: RefreshCw };
    case 'completed':
      return { label: 'Дууссан', color: 'bg-green-100 text-green-800', icon: CheckCircle };
    case 'declined':
      return { label: 'Татгалзсан', color: 'bg-red-100 text-red-800', icon: XCircle };
    default:
      return { label: status, color: 'bg-slate-100 text-slate-800', icon: Clock };
  }
};

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case 'high':
      return { label: '🔴 Өндөр', color: 'bg-red-100 text-red-800' };
    case 'medium':
      return { label: '🟡 Дунд', color: 'bg-yellow-100 text-yellow-800' };
    case 'low':
      return { label: '🟢 Бага', color: 'bg-green-100 text-green-800' };
    default:
      return { label: priority, color: 'bg-slate-100 text-slate-800' };
  }
};

export default function TaskAssignmentPage({ onBack }: TaskAssignmentPageProps) {
  const { user, userRole } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [filteredAssignments, setFilteredAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    in_progress: 0,
    completed: 0,
    declined: 0,
  });

  useEffect(() => {
    loadAssignments();
  }, []);

  useEffect(() => {
    filterAssignments();
  }, [searchTerm, statusFilter, typeFilter, assignments]);

  const loadAssignments = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('task_assignments')
        .select(`
          *,
          task:tasks(id, title, description),
          user:user_profiles!user_id(id, full_name, email, avatar_url),
          assigned_by_user:user_profiles!assigned_by(full_name),
          department:departments(name, color)
        `)
        .order('created_at', { ascending: false });

      if (userRole === 'user') {
        query = query.eq('user_id', user?.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedAssignments = (data || []).map((a: any) => ({
        ...a,
        task: Array.isArray(a.task) ? a.task[0] : a.task,
        user: Array.isArray(a.user) ? a.user[0] : a.user,
        assigned_by_user: Array.isArray(a.assigned_by_user) ? a.assigned_by_user[0] : a.assigned_by_user,
        department: Array.isArray(a.department) ? a.department[0] : a.department,
      }));

      setAssignments(formattedAssignments);

      const statsData = {
        total: formattedAssignments.length,
        pending: formattedAssignments.filter((a: any) => a.status === 'pending').length,
        in_progress: formattedAssignments.filter((a: any) => a.status === 'in_progress').length,
        completed: formattedAssignments.filter((a: any) => a.status === 'completed').length,
        declined: formattedAssignments.filter((a: any) => a.status === 'declined').length,
      };
      setStats(statsData);
    } catch (error) {
      console.error('Error loading assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAssignments = () => {
    let filtered = assignments;

    if (searchTerm) {
      filtered = filtered.filter(
        (a) =>
          a.task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.user.full_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((a) => a.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter((a) => a.assignment_type === typeFilter);
    }

    setFilteredAssignments(filtered);
  };

  const handleStatusChange = async (assignmentId: string, newStatus: string) => {
    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'accepted') {
        updateData.accepted_at = new Date().toISOString();
      } else if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('task_assignments')
        .update(updateData)
        .eq('id', assignmentId);

      if (error) throw error;

      loadAssignments();
      alert('Төлөв амжилттай шинэчлэгдлээ');
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Төлөв шинэчлэхэд алдаа гарлаа');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('mn-MN');
  };

  const isOverdue = (deadline: string) => {
    return new Date(deadline) < new Date();
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
              <h1 className="text-3xl font-bold text-slate-900">Ажил хуваарилалт</h1>
              <p className="text-slate-600">Хуваарилагдсан ажлуудын мэдээлэл</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Нийт</p>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-slate-600" />
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Хүлээгдэж буй</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Хийгдэж байна</p>
                <p className="text-2xl font-bold text-purple-600">{stats.in_progress}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Дууссан</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Татгалзсан</p>
                <p className="text-2xl font-bold text-red-600">{stats.declined}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </Card>
        </div>

        <Card className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Input
                placeholder="Ажил, хүн хайх..."
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
                <option value="pending">Хүлээгдэж буй</option>
                <option value="accepted">Хүлээн авсан</option>
                <option value="in_progress">Хийгдэж байна</option>
                <option value="completed">Дууссан</option>
                <option value="declined">Татгалзсан</option>
              </select>
            </div>
            <div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Бүх төрөл</option>
                <option value="individual">Хүн</option>
                <option value="department">Бүлэг</option>
                <option value="mixed">Холимог</option>
              </select>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4">
          {filteredAssignments.map((assignment) => {
            const statusBadge = getStatusBadge(assignment.status);
            const priorityBadge = getPriorityBadge(assignment.priority);
            const StatusIcon = statusBadge.icon;
            const isLate = isOverdue(assignment.deadline) && assignment.status !== 'completed';

            return (
              <Card key={assignment.id} className="hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                        {assignment.user.avatar_url ? (
                          <img
                            src={assignment.user.avatar_url}
                            alt={assignment.user.full_name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          assignment.user.full_name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-slate-900">
                            {assignment.task.title}
                          </h3>
                          {assignment.is_primary && (
                            <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                              ⭐ Ахлах
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-600 mb-3">
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            <span>{assignment.user.full_name}</span>
                          </div>
                          {assignment.assignment_type === 'department' && assignment.department && (
                            <div className="flex items-center gap-1">
                              <Folder className="w-4 h-4" />
                              <span>{assignment.department.name}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span className={isLate ? 'text-red-600 font-semibold' : ''}>
                              {formatDate(assignment.deadline)}
                              {isLate && ' (Хугацаа хэтэрсэн)'}
                            </span>
                          </div>
                        </div>
                        {assignment.notes && (
                          <p className="text-sm text-slate-700 mb-3">{assignment.notes}</p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={statusBadge.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusBadge.label}
                          </Badge>
                          <Badge className={priorityBadge.color}>
                            {priorityBadge.label}
                          </Badge>
                          {assignment.assignment_type === 'individual' && (
                            <Badge variant="outline" className="text-xs">
                              <User className="w-3 h-3 mr-1" />
                              Хүн
                            </Badge>
                          )}
                          {assignment.assignment_type === 'department' && (
                            <Badge variant="outline" className="text-xs">
                              <Folder className="w-3 h-3 mr-1" />
                              Бүлэг
                            </Badge>
                          )}
                          {assignment.assignment_type === 'mixed' && (
                            <Badge variant="outline" className="text-xs">
                              Холимог
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                          Хуваарилсан: {assignment.assigned_by_user.full_name} •{' '}
                          {formatDate(assignment.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                  {assignment.user_id === user?.id && assignment.status !== 'completed' && assignment.status !== 'declined' && (
                    <div className="flex gap-2 ml-4">
                      {assignment.status === 'pending' && (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleStatusChange(assignment.id, 'accepted')}
                          >
                            Хүлээн авах
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(assignment.id, 'declined')}
                            className="text-red-600 hover:text-red-700"
                          >
                            Татгалзах
                          </Button>
                        </>
                      )}
                      {assignment.status === 'accepted' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleStatusChange(assignment.id, 'in_progress')}
                        >
                          Эхлүүлэх
                        </Button>
                      )}
                      {assignment.status === 'in_progress' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedAssignmentId(assignment.id)}
                            leftIcon={<FileCheck className="w-4 h-4" />}
                          >
                            Тайлан илгээх
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleStatusChange(assignment.id, 'completed')}
                          >
                            Дуусгах
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {filteredAssignments.length === 0 && (
          <Card>
            <div className="text-center py-12">
              <User className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600">Хуваарилалт олдсонгүй</p>
            </div>
          </Card>
        )}
      </div>

      {selectedAssignmentId && (
        <CompletionSubmissionForm
          assignmentId={selectedAssignmentId}
          onClose={() => setSelectedAssignmentId(null)}
          onSubmit={() => {
            setSelectedAssignmentId(null);
            loadAssignments();
          }}
        />
      )}
    </div>
  );
}
