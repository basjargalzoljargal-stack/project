import { useState, useEffect } from 'react';
import { X, Search, Star, User, Folder, AlertCircle, Bell, BellOff, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import Badge from './ui/Badge';

interface Task {
  id: string;
  title: string;
  description?: string;
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  department?: {
    id: string;
    name: string;
    color: string;
  };
  task_count?: number;
}

interface Department {
  id: string;
  name: string;
  color: string;
  member_count: number;
  head?: {
    full_name: string;
  };
}

interface TaskAssignmentModalProps {
  task: Task;
  onClose: () => void;
  onAssign: () => void;
}

type AssignmentType = 'individual' | 'department' | 'mixed';

export default function TaskAssignmentModal({ task, onClose, onAssign }: TaskAssignmentModalProps) {
  const { user } = useAuth();
  const [assignmentType, setAssignmentType] = useState<AssignmentType>('individual');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [primaryUserId, setPrimaryUserId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [notes, setNotes] = useState('');
  const [sendNotification, setSendNotification] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadUsers();
    loadDepartments();
  }, []);

  const loadUsers = async () => {
    const { data: usersData } = await supabase
      .from('user_profiles')
      .select(`
        id,
        full_name,
        email,
        avatar_url,
        department:user_departments!inner(department:departments(id, name, color))
      `)
      .eq('status', 'active')
      .order('full_name');

    if (usersData) {
      const { data: assignmentCounts } = await supabase
        .from('task_assignments')
        .select('user_id, status')
        .in('status', ['pending', 'accepted', 'in_progress']);

      const taskCounts: Record<string, number> = {};
      assignmentCounts?.forEach(assignment => {
        taskCounts[assignment.user_id] = (taskCounts[assignment.user_id] || 0) + 1;
      });

      const formattedUsers = usersData.map((u: any) => ({
        id: u.id,
        full_name: u.full_name,
        email: u.email,
        avatar_url: u.avatar_url,
        department: Array.isArray(u.department) && u.department[0]?.department
          ? u.department[0].department
          : null,
        task_count: taskCounts[u.id] || 0,
      }));

      setUsers(formattedUsers);
    }
  };

  const loadDepartments = async () => {
    const { data: deptsData } = await supabase
      .from('departments')
      .select('id, name, color, head_id')
      .order('name');

    if (deptsData) {
      const deptsWithCounts = await Promise.all(
        deptsData.map(async (dept) => {
          const { count } = await supabase
            .from('user_departments')
            .select('*', { count: 'exact', head: false })
            .eq('department_id', dept.id);

          let head = null;
          if (dept.head_id) {
            const { data: headData } = await supabase
              .from('user_profiles')
              .select('full_name')
              .eq('id', dept.head_id)
              .single();
            head = headData;
          }

          return {
            id: dept.id,
            name: dept.name,
            color: dept.color,
            member_count: count || 0,
            head,
          };
        })
      );

      setDepartments(deptsWithCounts);
    }
  };

  const handleUserToggle = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
      if (primaryUserId === userId) {
        setPrimaryUserId('');
      }
    } else {
      setSelectedUsers([...selectedUsers, userId]);
      if (selectedUsers.length === 0) {
        setPrimaryUserId(userId);
      }
    }
  };

  const handleDepartmentToggle = (deptId: string) => {
    if (selectedDepartments.includes(deptId)) {
      setSelectedDepartments(selectedDepartments.filter(id => id !== deptId));
    } else {
      setSelectedDepartments([...selectedDepartments, deptId]);
    }
  };

  const handleSetPrimary = (userId: string) => {
    setPrimaryUserId(userId);
  };

  const getTotalAssignees = async () => {
    let total = 0;
    const assigneeIds = new Set<string>();

    if (assignmentType === 'individual' || assignmentType === 'mixed') {
      selectedUsers.forEach(id => assigneeIds.add(id));
      total += selectedUsers.length;
    }

    if (assignmentType === 'department' || assignmentType === 'mixed') {
      for (const deptId of selectedDepartments) {
        const { data } = await supabase
          .from('user_departments')
          .select('user_id')
          .eq('department_id', deptId);

        data?.forEach(ud => {
          if (!assigneeIds.has(ud.user_id)) {
            assigneeIds.add(ud.user_id);
            total += 1;
          }
        });
      }
    }

    return { total, assigneeIds: Array.from(assigneeIds) };
  };

  const handleSubmit = async () => {
    setError('');

    if (assignmentType === 'individual' && selectedUsers.length === 0) {
      setError('Дор хаяж нэг хүн сонгоно уу');
      return;
    }

    if (assignmentType === 'department' && selectedDepartments.length === 0) {
      setError('Дор хаяж нэг хэлтэс сонгоно уу');
      return;
    }

    if (assignmentType === 'mixed' && selectedUsers.length === 0 && selectedDepartments.length === 0) {
      setError('Хүн эсвэл хэлтэс сонгоно уу');
      return;
    }

    if (!deadline) {
      setError('Эцсийн хугацаа оруулна уу');
      return;
    }

    setIsLoading(true);

    try {
      const { total, assigneeIds } = await getTotalAssignees();

      const assignments = assigneeIds.map(userId => ({
        task_id: task.id,
        user_id: userId,
        assigned_by: user?.id,
        is_primary: userId === primaryUserId,
        assignment_type: assignmentType,
        department_id: assignmentType === 'department' ? selectedDepartments[0] : null,
        status: 'pending',
        priority,
        deadline,
        notes,
        notified: sendNotification,
      }));

      const { data: assignmentsData, error: assignError } = await supabase
        .from('task_assignments')
        .insert(assignments)
        .select();

      if (assignError) throw assignError;

      if (sendNotification && assignmentsData) {
        const notifications = assignmentsData.map(assignment => ({
          assignment_id: assignment.id,
          user_id: assignment.user_id,
          notification_type: 'in_app',
          subject: 'Шинэ ажил хуваарилагдлаа',
          message: `"${task.title}" гэсэн ажлыг танд хуваарилав. Эцсийн хугацаа: ${new Date(deadline).toLocaleDateString('mn-MN')}`,
        }));

        await supabase
          .from('assignment_notifications')
          .insert(notifications);
      }

      alert(`Амжилттай ${total} хүнд хуваарилагдлаа`);
      onAssign();
    } catch (err: any) {
      setError(err.message || 'Хуваарилахад алдаа гарлаа');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter(u =>
    u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSelectedUser = (userId: string) => users.find(u => u.id === userId);

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-slate-600';
    }
  };

  const getDepartmentByColor = (color: string) => {
    const colorMap: Record<string, string> = {
      blue: '🔵',
      green: '🟢',
      yellow: '🟡',
      red: '🔴',
      purple: '🟣',
      orange: '🟠',
    };
    return colorMap[color] || '⚪';
  };

  return (
    <Modal onClose={onClose} size="xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Ажил хуваарилах</h2>
          <p className="text-sm text-slate-600 mt-1">{task.title}</p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <form className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Хуваарилах төрөл
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
              <input
                type="radio"
                name="assignmentType"
                value="individual"
                checked={assignmentType === 'individual'}
                onChange={() => setAssignmentType('individual')}
                className="w-4 h-4 text-blue-600 focus:ring-blue-600"
              />
              <User className="w-5 h-5 text-slate-600" />
              <div>
                <div className="font-medium text-slate-900">Хүн</div>
                <div className="text-xs text-slate-600">Хувь хүнд хуваарилах</div>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
              <input
                type="radio"
                name="assignmentType"
                value="department"
                checked={assignmentType === 'department'}
                onChange={() => setAssignmentType('department')}
                className="w-4 h-4 text-blue-600 focus:ring-blue-600"
              />
              <Folder className="w-5 h-5 text-slate-600" />
              <div>
                <div className="font-medium text-slate-900">Бүлэг</div>
                <div className="text-xs text-slate-600">Хэлтэст хуваарилах</div>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
              <input
                type="radio"
                name="assignmentType"
                value="mixed"
                checked={assignmentType === 'mixed'}
                onChange={() => setAssignmentType('mixed')}
                className="w-4 h-4 text-blue-600 focus:ring-blue-600"
              />
              <Users className="w-5 h-5 text-slate-600" />
              <div>
                <div className="font-medium text-slate-900">Холимог</div>
                <div className="text-xs text-slate-600">Хэлтэс болон хүн</div>
              </div>
            </label>
          </div>
        </div>

        {(assignmentType === 'individual' || assignmentType === 'mixed') && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Хүн сонгох
            </label>
            <Input
              placeholder="Хайх..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="w-5 h-5" />}
            />
            <div className="mt-3 max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
              {filteredUsers.map((user) => (
                <label
                  key={user.id}
                  className="flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-100 last:border-0"
                >
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => handleUserToggle(user.id)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-600 rounded"
                  />
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.full_name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      user.full_name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{user.full_name}</p>
                    <p className="text-xs text-slate-500">
                      {user.department?.name || 'Хэлтэс байхгүй'} • {user.task_count} ажил
                    </p>
                  </div>
                </label>
              ))}
            </div>

            {selectedUsers.length > 0 && (
              <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="text-sm font-medium text-slate-700 mb-2">
                  Сонгогдсон хүмүүс ({selectedUsers.length})
                </p>
                <div className="space-y-2">
                  {selectedUsers.map((userId) => {
                    const selectedUser = getSelectedUser(userId);
                    if (!selectedUser) return null;
                    return (
                      <div
                        key={userId}
                        className="flex items-center justify-between p-2 bg-white rounded border border-slate-200"
                      >
                        <div className="flex items-center gap-2">
                          {primaryUserId === userId ? (
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          ) : (
                            <User className="w-4 h-4 text-slate-400" />
                          )}
                          <span className="text-sm text-slate-900">
                            {selectedUser.full_name}
                            {primaryUserId === userId && (
                              <span className="text-xs text-yellow-600 ml-2">(Ахлах)</span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {primaryUserId !== userId && (
                            <button
                              type="button"
                              onClick={() => handleSetPrimary(userId)}
                              className="text-xs text-blue-600 hover:text-blue-700"
                            >
                              Ахлах болгох
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleUserToggle(userId)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {(assignmentType === 'department' || assignmentType === 'mixed') && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Хэлтэс сонгох
            </label>
            <div className="space-y-2 max-h-64 overflow-y-auto border border-slate-200 rounded-lg p-3">
              {departments.map((dept) => (
                <label
                  key={dept.id}
                  className="flex items-start gap-3 p-3 hover:bg-slate-50 rounded transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedDepartments.includes(dept.id)}
                    onChange={() => handleDepartmentToggle(dept.id)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-600 rounded mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Folder className="w-5 h-5 text-slate-600" />
                      <span className="text-sm font-medium text-slate-900">{dept.name}</span>
                      <span>{getDepartmentByColor(dept.color)}</span>
                      <Badge variant="outline" className="text-xs">
                        {dept.member_count} хүн
                      </Badge>
                    </div>
                    {dept.head && (
                      <p className="text-xs text-slate-500 mt-1 ml-7">
                        Дарга: {dept.head.full_name}
                      </p>
                    )}
                  </div>
                </label>
              ))}
            </div>

            {selectedDepartments.length > 0 && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-900 mb-2">
                  Сонгогдсон хэлтэсүүд
                </p>
                <div className="space-y-2">
                  {selectedDepartments.map((deptId) => {
                    const dept = departments.find(d => d.id === deptId);
                    if (!dept) return null;
                    return (
                      <div key={deptId} className="text-sm text-blue-800">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Folder className="w-4 h-4" />
                            <span>{dept.name} {getDepartmentByColor(dept.color)}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDepartmentToggle(deptId)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-xs text-blue-700 ml-6">
                          → {dept.member_count} хүнд хуваарилагдана
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Эцсийн хугацаа"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            required
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Эрхэм зэрэг
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="high">🔴 Өндөр</option>
              <option value="medium">🟡 Дунд</option>
              <option value="low">🟢 Бага</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Нэмэлт тайлбар
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Нэмэлт мэдээлэл..."
            rows={3}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <input
            type="checkbox"
            id="notification"
            checked={sendNotification}
            onChange={(e) => setSendNotification(e.target.checked)}
            className="w-4 h-4 text-blue-600 focus:ring-blue-600 rounded"
          />
          <label htmlFor="notification" className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            {sendNotification ? (
              <Bell className="w-5 h-5 text-blue-600" />
            ) : (
              <BellOff className="w-5 h-5 text-slate-400" />
            )}
            Мэдэгдэл илгээх
          </label>
        </div>

        {sendNotification && (selectedUsers.length > 0 || selectedDepartments.length > 0) && (
          <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-900 mb-2">
                  📬 Мэдэгдлийн танилцуулга
                </p>
                <div className="space-y-2 text-sm text-blue-800">
                  {assignmentType === 'individual' && (
                    <p>• Хүн: {selectedUsers.length} хүн</p>
                  )}
                  {assignmentType === 'department' && (
                    <div>
                      {selectedDepartments.map(deptId => {
                        const dept = departments.find(d => d.id === deptId);
                        return dept ? (
                          <p key={deptId}>• {dept.name}: {dept.member_count} хүн</p>
                        ) : null;
                      })}
                    </div>
                  )}
                  {assignmentType === 'mixed' && (
                    <>
                      {selectedDepartments.map(deptId => {
                        const dept = departments.find(d => d.id === deptId);
                        return dept ? (
                          <p key={deptId}>• {dept.name}: {dept.member_count} хүн</p>
                        ) : null;
                      })}
                      {selectedUsers.length > 0 && (
                        <p>• Бусад: {selectedUsers.length} хүн</p>
                      )}
                    </>
                  )}
                </div>
                <div className="mt-3 p-3 bg-white rounded border border-blue-200">
                  <p className="text-xs font-semibold text-slate-700">Сэдэв:</p>
                  <p className="text-sm text-slate-900 mb-2">Шинэ ажил хуваарилагдлаа</p>
                  <p className="text-xs font-semibold text-slate-700">Мессеж:</p>
                  <p className="text-sm text-slate-900">
                    "{task.title}" гэсэн ажлыг танд хуваарилав.
                    Эцсийн хугацаа: {deadline ? new Date(deadline).toLocaleDateString('mn-MN') : '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-6 border-t border-slate-200">
          <Button
            type="button"
            variant="outline"
            fullWidth
            onClick={onClose}
            disabled={isLoading}
          >
            Цуцлах
          </Button>
          <Button
            type="button"
            variant="primary"
            fullWidth
            onClick={handleSubmit}
            loading={isLoading}
            disabled={isLoading}
          >
            Хуваарилах
          </Button>
        </div>
      </form>
    </Modal>
  );
}
