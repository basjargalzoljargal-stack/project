import { useState, useEffect } from 'react';
import {
  Users, Plus, Edit, Trash2, Building2, Search,
  Filter, ChevronLeft, Mail, Phone, User as UserIcon
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Button from './ui/Button';
import Card from './ui/Card';
import Badge from './ui/Badge';
import Input from './ui/Input';
import DepartmentModal from './DepartmentModal';
import UserManagementModal from './UserManagementModal';

interface Department {
  id: string;
  name: string;
  description: string;
  color: string;
  parent_department_id: string | null;
  department_head_id: string | null;
  created_at: string;
  updated_at: string;
  head_name?: string;
  member_count?: number;
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  position: string | null;
  role: string;
  status: string;
  avatar_url: string | null;
  departments?: Array<{
    id: string;
    name: string;
    color: string;
    is_primary: boolean;
  }>;
}

interface DepartmentManagementPageProps {
  onBack: () => void;
}

const colorOptions = [
  { value: 'red', label: 'Улаан', color: 'border-red-500 bg-red-50' },
  { value: 'blue', label: 'Цэнхэр', color: 'border-blue-500 bg-blue-50' },
  { value: 'green', label: 'Ногоон', color: 'border-green-500 bg-green-50' },
  { value: 'yellow', label: 'Шар', color: 'border-yellow-500 bg-yellow-50' },
  { value: 'purple', label: 'Нил ягаан', color: 'border-purple-500 bg-purple-50' },
];

const getColorClasses = (color: string) => {
  const found = colorOptions.find(opt => opt.value === color);
  return found ? found.color : 'border-slate-500 bg-slate-50';
};

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case 'admin': return 'bg-red-100 text-red-800';
    case 'manager': return 'bg-blue-100 text-blue-800';
    default: return 'bg-slate-100 text-slate-800';
  }
};

export default function DepartmentManagementPage({ onBack }: DepartmentManagementPageProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');

  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchTerm, filterDepartment, filterRole, users]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadDepartments(), loadUsers()]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    const { data, error } = await supabase
      .from('departments')
      .select(`
        *,
        head:user_profiles!department_head_id(full_name)
      `)
      .order('name');

    if (error) {
      console.error('Error loading departments:', error);
      return;
    }

    const depsWithCounts = await Promise.all(
      (data || []).map(async (dept) => {
        const { count } = await supabase
          .from('user_departments')
          .select('*', { count: 'exact', head: false })
          .eq('department_id', dept.id);

        return {
          ...dept,
          head_name: dept.head?.[0]?.full_name,
          member_count: count || 0,
        };
      })
    );

    setDepartments(depsWithCounts);
  };

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('full_name');

    if (error) {
      console.error('Error loading users:', error);
      return;
    }

    const usersWithDepts = await Promise.all(
      (data || []).map(async (user) => {
        const { data: userDepts } = await supabase
          .from('user_departments')
          .select(`
            is_primary,
            department:departments(id, name, color)
          `)
          .eq('user_id', user.id);

        return {
          ...user,
          departments: (userDepts || []).map((ud: any) => ({
            id: ud.department.id,
            name: ud.department.name,
            color: ud.department.color,
            is_primary: ud.is_primary,
          })),
        };
      })
    );

    setUsers(usersWithDepts);
  };

  const filterUsers = () => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterDepartment !== 'all') {
      filtered = filtered.filter((user) =>
        user.departments?.some((dept) => dept.id === filterDepartment)
      );
    }

    if (filterRole !== 'all') {
      filtered = filtered.filter((user) => user.role === filterRole);
    }

    setFilteredUsers(filtered);
    setCurrentPage(1);
  };

  const handleDeleteDepartment = async (id: string) => {
    if (!confirm('Энэ хэлтсийг устгахдаа итгэлтэй байна уу?')) {
      return;
    }

    const { error } = await supabase
      .from('departments')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Хэлтэс устгахад алдаа гарлаа: ' + error.message);
      return;
    }

    await loadDepartments();
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Энэ хэрэглэгчийг устгахдаа итгэлтэй байна уу?')) {
      return;
    }

    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Хэрэглэгч устгахад алдаа гарлаа: ' + error.message);
      return;
    }

    await loadUsers();
  };

  const handleDepartmentSaved = () => {
    setShowDepartmentModal(false);
    setEditingDepartment(null);
    loadDepartments();
  };

  const handleUserSaved = () => {
    setShowUserModal(false);
    setEditingUser(null);
    loadUsers();
  };

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * usersPerPage,
    currentPage * usersPerPage
  );
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

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
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Буцах</span>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Байгууллагын удирдлага</h1>
              <p className="text-slate-600">Хэлтэс, бүлэг болон хэрэглэгчдийн удирдлага</p>
            </div>
          </div>
        </div>

        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Building2 className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-slate-900">Хэлтэс/Бүлэг удирдлага</h2>
            </div>
            <Button
              variant="primary"
              onClick={() => {
                setEditingDepartment(null);
                setShowDepartmentModal(true);
              }}
            >
              <Plus className="w-5 h-5 mr-2" />
              Шинэ хэлтэс нэмэх
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept) => (
              <Card key={dept.id} className={`border-l-4 ${getColorClasses(dept.color)}`}>
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900">{dept.name}</h3>
                      {dept.description && (
                        <p className="text-sm text-slate-600 mt-1">{dept.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingDepartment(dept);
                          setShowDepartmentModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteDepartment(dept.id)}
                        className="text-red-600 hover:text-red-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Users className="w-4 h-4" />
                      <span>{dept.member_count} хүн</span>
                    </div>
                    {dept.head_name && (
                      <div className="text-slate-600">
                        <span className="font-medium">Дарга:</span> {dept.head_name}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {departments.length === 0 && (
            <Card>
              <div className="text-center py-12">
                <Building2 className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600">Хэлтэс байхгүй байна</p>
                <p className="text-sm text-slate-500 mt-1">Шинэ хэлтэс нэмж эхлээрэй</p>
              </div>
            </Card>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-slate-900">Хэрэглэгч удирдлага</h2>
            </div>
            <Button
              variant="primary"
              onClick={() => {
                setEditingUser(null);
                setShowUserModal(true);
              }}
            >
              <Plus className="w-5 h-5 mr-2" />
              Шинэ хэрэглэгч
            </Button>
          </div>

          <Card className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <Input
                  placeholder="Хайх..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  leftIcon={<Search className="w-5 h-5" />}
                />
              </div>
              <div>
                <select
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Бүх хэлтэс</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Бүх эрх</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="user">User</option>
                </select>
              </div>
            </div>
          </Card>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Хэрэглэгч</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Албан тушаал</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Хэлтэс</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Эрх</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Төлөв</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Үйлдэл</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map((user) => (
                    <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt={user.full_name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              user.full_name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{user.full_name}</div>
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                              <Mail className="w-3 h-3" />
                              {user.email}
                            </div>
                            {user.phone && (
                              <div className="flex items-center gap-2 text-xs text-slate-600">
                                <Phone className="w-3 h-3" />
                                {user.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-slate-700">{user.position || '-'}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-1">
                          {user.departments?.map((dept) => (
                            <Badge
                              key={dept.id}
                              variant="outline"
                              className={`text-xs ${getColorClasses(dept.color)} ${dept.is_primary ? 'font-semibold' : ''}`}
                            >
                              {dept.name}
                              {dept.is_primary && ' ⭐'}
                            </Badge>
                          ))}
                          {(!user.departments || user.departments.length === 0) && (
                            <span className="text-sm text-slate-500">-</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Badge className={`${getRoleBadgeColor(user.role)} text-xs font-semibold`}>
                          {user.role === 'admin' ? 'Admin' : user.role === 'manager' ? 'Manager' : 'User'}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant={user.status === 'active' ? 'success' : 'default'} className="text-xs">
                          {user.status === 'active' ? 'Идэвхитэй' : 'Идэвхигүй'}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingUser(user);
                              setShowUserModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-700 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-700 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <UserIcon className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600">Хэрэглэгч олдсонгүй</p>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-200">
                <div className="text-sm text-slate-600">
                  Нийт {filteredUsers.length} хэрэглэгчээс {((currentPage - 1) * usersPerPage) + 1}-{Math.min(currentPage * usersPerPage, filteredUsers.length)}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Өмнөх
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 rounded ${
                          page === currentPage
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-slate-700 hover:bg-slate-100'
                        } transition-colors`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Дараах
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </section>
      </div>

      {showDepartmentModal && (
        <DepartmentModal
          department={editingDepartment}
          departments={departments}
          users={users}
          onClose={() => {
            setShowDepartmentModal(false);
            setEditingDepartment(null);
          }}
          onSave={handleDepartmentSaved}
        />
      )}

      {showUserModal && (
        <UserManagementModal
          user={editingUser}
          departments={departments}
          onClose={() => {
            setShowUserModal(false);
            setEditingUser(null);
          }}
          onSave={handleUserSaved}
        />
      )}
    </div>
  );
}
