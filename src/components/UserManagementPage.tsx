import { useState, useEffect } from 'react';
import { ChevronLeft, Search, Plus, Edit, Trash2, X, Upload, Check, Ban } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Button from './ui/Button';
import Card from './ui/Card';
import Badge from './ui/Badge';
import Input from './ui/Input';
import Modal from './ui/Modal';

interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  position?: string;
  role: string;
  is_active: boolean;
  status?: string;
  rejection_reason?: string;
  avatar_url?: string;
  departments?: Department[];
}

interface Department {
  id: string;
  name: string;
  color?: string;
  is_primary?: boolean;
}

interface UserManagementPageProps {
  onBack: () => void;
}

export default function UserManagementPage({ onBack }: UserManagementPageProps) {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionUserId, setRejectionUserId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const usersPerPage = 10;

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    position: '',
    role: 'user',
    is_active: true,
    department_ids: [] as string[],
    primary_department_id: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, deptData] = await Promise.all([
        loadUsers(),
        loadDepartments(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      const usersWithDepts = await Promise.all(
        (usersData || []).map(async (user) => {
          const { data: deptData } = await supabase
            .from('user_departments')
            .select(`
              department_id,
              is_primary,
              departments!inner(id, name, color)
            `)
            .eq('user_id', user.id);

          const departments = (deptData || []).map((d: any) => ({
            id: d.departments.id,
            name: d.departments.name,
            color: d.departments.color,
            is_primary: d.is_primary,
          }));

          return {
            ...user,
            departments,
          };
        })
      );

      setUsers(usersWithDepts);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        full_name: user.full_name,
        email: user.email,
        phone: user.phone || '',
        position: user.position || '',
        role: user.role,
        is_active: user.is_active,
        department_ids: user.departments?.map(d => d.id) || [],
        primary_department_id: user.departments?.find(d => d.is_primary)?.id || '',
      });
    } else {
      setEditingUser(null);
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        position: '',
        role: 'user',
        is_active: true,
        department_ids: [],
        primary_department_id: '',
      });
    }
    setShowUserModal(true);
  };

  const handleSaveUser = async () => {
    if (!formData.full_name || !formData.email) {
      alert('Нэр болон имэйл оруулна уу');
      return;
    }

    try {
      if (editingUser) {
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            full_name: formData.full_name,
            phone: formData.phone,
            position: formData.position,
            role: formData.role,
            is_active: formData.is_active,
          })
          .eq('id', editingUser.id);

        if (updateError) throw updateError;

        await supabase
          .from('user_departments')
          .delete()
          .eq('user_id', editingUser.id);

        if (formData.department_ids.length > 0) {
          const deptInserts = formData.department_ids.map(deptId => ({
            user_id: editingUser.id,
            department_id: deptId,
            is_primary: deptId === formData.primary_department_id,
          }));

          await supabase
            .from('user_departments')
            .insert(deptInserts);
        }

        alert('Хэрэглэгч амжилттай засагдлаа');
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: 'TempPassword123!',
          options: {
            data: {
              full_name: formData.full_name,
            },
          },
        });

        if (authError) throw authError;

        if (authData.user) {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert([{
              id: authData.user.id,
              email: formData.email,
              full_name: formData.full_name,
              phone: formData.phone,
              position: formData.position,
              role: formData.role,
              is_active: formData.is_active,
            }]);

          if (profileError) throw profileError;

          if (formData.department_ids.length > 0) {
            const deptInserts = formData.department_ids.map(deptId => ({
              user_id: authData.user.id,
              department_id: deptId,
              is_primary: deptId === formData.primary_department_id,
            }));

            await supabase
              .from('user_departments')
              .insert(deptInserts);
          }
        }

        alert('Хэрэглэгч амжилттай нэмэгдлээ. Анхны нууц үг: TempPassword123!');
      }

      setShowUserModal(false);
      loadUsers();
    } catch (error: any) {
      console.error('Error saving user:', error);
      alert('Алдаа гарлаа: ' + (error.message || 'Unknown error'));
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Энэ хэрэглэгчийг устгах уу?')) return;

    try {
      await supabase
        .from('user_departments')
        .delete()
        .eq('user_id', userId);

      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      alert('Хэрэглэгч устгагдлаа');
      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Хэрэглэгч устгахад алдаа гарлаа');
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;
      loadUsers();
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const handleDepartmentToggle = (deptId: string) => {
    const newDeptIds = formData.department_ids.includes(deptId)
      ? formData.department_ids.filter(id => id !== deptId)
      : [...formData.department_ids, deptId];

    setFormData({
      ...formData,
      department_ids: newDeptIds,
      primary_department_id: newDeptIds.includes(formData.primary_department_id)
        ? formData.primary_department_id
        : newDeptIds[0] || '',
    });
  };

  const handleApproveUser = async (userId: string) => {
    if (!confirm('Энэ хэрэглэгчийг зөвшөөрөх үү?')) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          status: 'active',
          approved_at: new Date().toISOString(),
          approved_by: currentUser?.id,
        })
        .eq('id', userId);

      if (error) throw error;

      alert('Хэрэглэгч баталгаажлаа! Имэйл илгээгдлээ.');
      loadUsers();
    } catch (error) {
      console.error('Error approving user:', error);
      alert('Хэрэглэгч зөвшөөрөхөд алдаа гарлаа');
    }
  };

  const handleRejectUser = async () => {
    if (!rejectionUserId || !rejectionReason.trim()) {
      alert('Татгалзах шалтгаан оруулна уу');
      return;
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
        })
        .eq('id', rejectionUserId);

      if (error) throw error;

      alert('Хэрэглэгч татгалзагдлаа! Имэйл илгээгдлээ.');
      setShowRejectionModal(false);
      setRejectionReason('');
      setRejectionUserId(null);
      loadUsers();
    } catch (error) {
      console.error('Error rejecting user:', error);
      alert('Хэрэглэгч татгалзахад алдаа гарлаа');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = departmentFilter === 'all' ||
                       user.departments?.some(d => d.id === departmentFilter);
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' ||
                         (statusFilter === 'pending' ? user.status === 'pending' :
                          statusFilter === 'active' ? user.status === 'active' :
                          statusFilter === 'rejected' ? user.status === 'rejected' :
                          user.is_active);

    return matchesSearch && matchesDept && matchesRole && matchesStatus;
  });

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + usersPerPage);

  const getRoleBadge = (role: string) => {
    const colors = {
      admin: 'bg-red-100 text-red-800',
      manager: 'bg-yellow-100 text-yellow-800',
      user: 'bg-blue-100 text-blue-800',
    };
    return colors[role as keyof typeof colors] || colors.user;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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
              <h1 className="text-3xl font-bold text-slate-900">Хэрэглэгч удирдлага</h1>
              <p className="text-slate-600">{users.length} нийт хэрэглэгч</p>
            </div>
          </div>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="w-5 h-5 mr-2" />
            Шинэ хэрэглэгч
          </Button>
        </div>

        <Card className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Хайх..."
                className="pl-10"
              />
            </div>

            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Бүх хэлтэс</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Бүх эрх</option>
              <option value="admin">Админ</option>
              <option value="manager">Менежер</option>
              <option value="user">Хэрэглэгч</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Бүх төлөв</option>
              <option value="pending">🟡 Хүлээгдэж байгаа ({users.filter(u => u.status === 'pending').length})</option>
              <option value="active">🟢 Идэвхитэй</option>
              <option value="rejected">🔴 Татгалзагдсан</option>
            </select>
          </div>
        </Card>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-4 px-4 text-sm font-semibold text-slate-700">Хэрэглэгч</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-slate-700">Имэйл</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-slate-700">Хэлтэс</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-slate-700">Албан тушаал</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-slate-700">Эрх</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-slate-700">Төлөв</th>
                  <th className="text-right py-4 px-4 text-sm font-semibold text-slate-700">Үйлдэл</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => (
                  <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center text-white font-semibold">
                          {getInitials(user.full_name)}
                        </div>
                        <span className="font-medium text-slate-900">{user.full_name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-600">{user.email}</td>
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1">
                        {user.departments?.map((dept) => (
                          <Badge
                            key={dept.id}
                            className={`${dept.is_primary ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-slate-100 text-slate-700'}`}
                          >
                            {dept.name}
                            {dept.is_primary && ' ★'}
                          </Badge>
                        ))}
                        {(!user.departments || user.departments.length === 0) && (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-600">{user.position || '-'}</td>
                    <td className="py-4 px-4">
                      <Badge className={getRoleBadge(user.role)}>
                        {user.role === 'admin' ? 'Админ' : user.role === 'manager' ? 'Менежер' : 'Хэрэглэгч'}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      <Badge className={`${
                        user.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        user.status === 'active' ? 'bg-green-100 text-green-800' :
                        user.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {user.status === 'pending' ? '🟡 Хүлээгдэж байна' :
                         user.status === 'active' ? '🟢 Идэвхитэй' :
                         user.status === 'rejected' ? '🔴 Татгалзагдсан' :
                         'Идэвхигүй'}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-2">
                        {user.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApproveUser(user.id)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                              title="Зөвшөөрөх"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setRejectionUserId(user.id);
                                setShowRejectionModal(true);
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Татгалзах"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {user.status !== 'pending' && (
                          <>
                            <button
                              onClick={() => handleOpenModal(user)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              disabled={user.id === currentUser?.id}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-600">Хэрэглэгч олдсонгүй</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-4 border-t border-slate-200">
              <p className="text-sm text-slate-600">
                {startIndex + 1}-{Math.min(startIndex + usersPerPage, filteredUsers.length)} / {filteredUsers.length}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Өмнөх
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Дараах
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {showRejectionModal && (
        <Modal onClose={() => {
          setShowRejectionModal(false);
          setRejectionReason('');
          setRejectionUserId(null);
        }}>
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">Бүртгэл татгалзах</h2>
              <button onClick={() => {
                setShowRejectionModal(false);
                setRejectionReason('');
                setRejectionUserId(null);
              }} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Татгалзах шалтгаан *
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Татгалзах шалтгааныг бичнэ үү..."
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <Button variant="outline" onClick={() => {
                setShowRejectionModal(false);
                setRejectionReason('');
                setRejectionUserId(null);
              }} fullWidth>
                Болих
              </Button>
              <Button onClick={handleRejectUser} fullWidth>
                Татгалзах
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {showUserModal && (
        <Modal onClose={() => setShowUserModal(false)}>
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">
                {editingUser ? 'Хэрэглэгч засах' : 'Шинэ хэрэглэгч нэмэх'}
              </h2>
              <button onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Нэр *
                </label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Овог нэр"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Имэйл *
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                  disabled={!!editingUser}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Утас
                </label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="99999999"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Албан тушаал
                </label>
                <Input
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="Ахлах мэргэжилтэн"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Хэлтэс
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3">
                  {departments.map(dept => (
                    <label key={dept.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.department_ids.includes(dept.id)}
                        onChange={() => handleDepartmentToggle(dept.id)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="flex-1 text-sm text-slate-700">{dept.name}</span>
                      {formData.department_ids.includes(dept.id) && (
                        <input
                          type="radio"
                          name="primary_dept"
                          checked={formData.primary_department_id === dept.id}
                          onChange={() => setFormData({ ...formData, primary_department_id: dept.id })}
                          className="w-4 h-4 text-blue-600"
                          title="Үндсэн хэлтэс"
                        />
                      )}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-1">Radio button = Үндсэн хэлтэс</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Эрх
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="admin"
                      checked={formData.role === 'admin'}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-slate-700">Админ</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="manager"
                      checked={formData.role === 'manager'}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-slate-700">Менежер</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="user"
                      checked={formData.role === 'user'}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-slate-700">Хэрэглэгч</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Идэвхитэй</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <Button variant="outline" onClick={() => setShowUserModal(false)} fullWidth>
                Болих
              </Button>
              <Button onClick={handleSaveUser} fullWidth>
                Хадгалах
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
