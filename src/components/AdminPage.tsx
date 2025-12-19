import { useState, useEffect } from 'react';
import { Users, Shield, CheckCircle, XCircle, Trash2, ArrowLeft } from 'lucide-react';

interface User {
  id: number;
  username: string;
  role: string;
  approved: boolean;
  last_login: string | null;
  created_at: string;
}

interface Stats {
  total: number;
  approved: number;
  pending: number;
  admins: number;
}

const API_URL = "https://my-website-backend-3yoe.onrender.com";

interface AdminPageProps {
  onBack: () => void;
}

export default function AdminPage({ onBack }: AdminPageProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, approved: 0, pending: 0, admins: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');

  const loadData = async () => {
    try {
      setLoading(true);
      
      const usersRes = await fetch(`${API_URL}/admin/users`);
      const usersData = await usersRes.json();
      
      const statsRes = await fetch(`${API_URL}/admin/stats`);
      const statsData = await statsRes.json();

      if (usersData.success) {
        setUsers(usersData.users);
      }

      if (statsData.success) {
        setStats(statsData.stats);
      }

    } catch (error) {
      console.error('Өгөгдөл татах алдаа:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const approveUser = async (userId: number) => {
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/approve`, {
        method: 'POST'
      });
      const data = await res.json();

      if (data.success) {
        loadData();
      }
    } catch (error) {
      console.error('Зөвшөөрөх алдаа:', error);
    }
  };

  const rejectUser = async (userId: number) => {
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/reject`, {
        method: 'POST'
      });
      const data = await res.json();

      if (data.success) {
        loadData();
      }
    } catch (error) {
      console.error('Цуцлах алдаа:', error);
    }
  };

  const deleteUser = async (userId: number, username: string) => {
    if (!window.confirm(`"${username}" хэрэглэгчийг устгах уу?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (data.success) {
        loadData();
      }
    } catch (error) {
      console.error('Устгах алдаа:', error);
    }
  };

  const changeRole = async (userId: number, newRole: string) => {
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();

      if (data.success) {
        loadData();
      }
    } catch (error) {
      console.error('Эрх өөрчлөх алдаа:', error);
    }
  };

  const filteredUsers = users.filter(user => {
    if (filter === 'pending') return !user.approved;
    if (filter === 'approved') return user.approved;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-xl text-gray-700">Ачааллаж байна...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <ArrowLeft className="w-4 h-4" />
              Буцах
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Админ Панель</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Нийт хэрэглэгч</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Users className="w-12 h-12 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Зөвшөөрөгдсөн</p>
                <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Хүлээгдэж буй</p>
                <p className="text-3xl font-bold text-orange-600">{stats.pending}</p>
              </div>
              <XCircle className="w-12 h-12 text-orange-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Админууд</p>
                <p className="text-3xl font-bold text-purple-600">{stats.admins}</p>
              </div>
              <Shield className="w-12 h-12 text-purple-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setFilter('all')}
              className={`px-6 py-3 font-medium ${
                filter === 'all'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Бүгд ({stats.total})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-6 py-3 font-medium ${
                filter === 'pending'
                  ? 'border-b-2 border-orange-500 text-orange-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Хүлээгдэж буй ({stats.pending})
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-6 py-3 font-medium ${
                filter === 'approved'
                  ? 'border-b-2 border-green-500 text-green-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Зөвшөөрөгдсөн ({stats.approved})
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Хэрэглэгч</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Эрх</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Төлөв</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Сүүлд нэвтэрсэн</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Бүртгэгдсэн</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Үйлдэл</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={user.role}
                      onChange={(e) => changeRole(user.id, e.target.value)}
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="user">Хэрэглэгч</option>
                      <option value="admin">Админ</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.approved ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Зөвшөөрөгдсөн
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                        Хүлээгдэж буй
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.last_login ? new Date(user.last_login).toLocaleString('mn-MN') : 'Хэзээ ч'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString('mn-MN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      {!user.approved ? (
                        <button
                          onClick={() => approveUser(user.id)}
                          className="text-green-600 hover:text-green-900"
                          title="Зөвшөөрөх"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => rejectUser(user.id)}
                          className="text-orange-600 hover:text-orange-900"
                          title="Цуцлах"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteUser(user.id, user.username)}
                        className="text-red-600 hover:text-red-900"
                        title="Устгах"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              Хэрэглэгч олдсонгүй
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
