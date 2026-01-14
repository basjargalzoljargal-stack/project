import { useState, useEffect } from 'react';
import { Users, Shield, CheckCircle, XCircle, Trash2, Building2 } from 'lucide-react';

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

export default function AdminPage({ onBack, onDepartmentsClick }: { onBack: () => void; onDepartmentsClick?: () => void }) {
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
      if (data.success) loadData();
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
      if (data.success) loadData();
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
      if (data.success) loadData();
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
      if (data.success) loadData();
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
        <div style={{ fontSize: '20px', color: '#374151' }}>Ачааллаж байна...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '24px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={onBack}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                backgroundColor: 'white',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              ← Буцах
            </button>
            <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', margin: 0 }}>Админ Панель</h1>
          </div>
          {onDepartmentsClick && (
            <button
              onClick={onDepartmentsClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              <Building2 style={{ width: '20px', height: '20px' }} />
              Хэлтэс/Хэрэглэгч удирдлага
            </button>
          )}
        </div>

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '24px' }}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 8px 0' }}>Нийт хэрэглэгч</p>
                <p style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', margin: 0 }}>{stats.total}</p>
              </div>
              <Users style={{ width: '48px', height: '48px', color: '#3b82f6' }} />
            </div>
          </div>

          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 8px 0' }}>Зөвшөөрөгдсөн</p>
                <p style={{ fontSize: '30px', fontWeight: 'bold', color: '#059669', margin: 0 }}>{stats.approved}</p>
              </div>
              <CheckCircle style={{ width: '48px', height: '48px', color: '#10b981' }} />
            </div>
          </div>

          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 8px 0' }}>Хүлээгдэж буй</p>
                <p style={{ fontSize: '30px', fontWeight: 'bold', color: '#ea580c', margin: 0 }}>{stats.pending}</p>
              </div>
              <XCircle style={{ width: '48px', height: '48px', color: '#f97316' }} />
            </div>
          </div>

          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 8px 0' }}>Админууд</p>
                <p style={{ fontSize: '30px', fontWeight: 'bold', color: '#7c3aed', margin: 0 }}>{stats.admins}</p>
              </div>
              <Shield style={{ width: '48px', height: '48px', color: '#8b5cf6' }} />
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
            <button
              onClick={() => setFilter('all')}
              style={{
                padding: '16px 24px',
                fontWeight: '500',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                borderBottom: filter === 'all' ? '2px solid #3b82f6' : 'none',
                color: filter === 'all' ? '#3b82f6' : '#6b7280'
              }}
            >
              Бүгд ({stats.total})
            </button>
            <button
              onClick={() => setFilter('pending')}
              style={{
                padding: '16px 24px',
                fontWeight: '500',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                borderBottom: filter === 'pending' ? '2px solid #f97316' : 'none',
                color: filter === 'pending' ? '#f97316' : '#6b7280'
              }}
            >
              Хүлээгдэж буй ({stats.pending})
            </button>
            <button
              onClick={() => setFilter('approved')}
              style={{
                padding: '16px 24px',
                fontWeight: '500',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                borderBottom: filter === 'approved' ? '2px solid #10b981' : 'none',
                color: filter === 'approved' ? '#10b981' : '#6b7280'
              }}
            >
              Зөвшөөрөгдсөн ({stats.approved})
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f9fafb' }}>
              <tr>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>ID</th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Хэрэглэгч</th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Эрх</th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Төлөв</th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Сүүлд нэвтэрсэн</th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Үйлдэл</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user, index) => (
                <tr key={user.id} style={{ borderTop: index > 0 ? '1px solid #e5e7eb' : 'none' }}>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: '#111827' }}>{user.id}</td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ 
                        width: '40px', 
                        height: '40px', 
                        backgroundColor: '#3b82f6', 
                        borderRadius: '50%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '16px'
                      }}>
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>{user.username}</div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <select
                      value={user.role}
                      onChange={(e) => changeRole(user.id, e.target.value)}
                      style={{
                        fontSize: '14px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="user">Хэрэглэгч</option>
                      <option value="admin">Админ</option>
                    </select>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      fontWeight: '600',
                      backgroundColor: user.approved ? '#d1fae5' : '#fed7aa',
                      color: user.approved ? '#065f46' : '#9a3412'
                    }}>
                      {user.approved ? 'Зөвшөөрөгдсөн' : 'Хүлээгдэж буй'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: '#6b7280' }}>
                    {user.last_login ? new Date(user.last_login).toLocaleString('mn-MN') : 'Хэзээ ч'}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {!user.approved ? (
                        <button
                          onClick={() => approveUser(user.id)}
                          style={{
                            padding: '6px',
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            color: '#059669'
                          }}
                          title="Зөвшөөрөх"
                        >
                          <CheckCircle style={{ width: '20px', height: '20px' }} />
                        </button>
                      ) : (
                        <button
                          onClick={() => rejectUser(user.id)}
                          style={{
                            padding: '6px',
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            color: '#ea580c'
                          }}
                          title="Цуцлах"
                        >
                          <XCircle style={{ width: '20px', height: '20px' }} />
                        </button>
                      )}
                      <button
                        onClick={() => deleteUser(user.id, user.username)}
                        style={{
                          padding: '6px',
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          color: '#dc2626'
                        }}
                        title="Устгах"
                      >
                        <Trash2 style={{ width: '20px', height: '20px' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>
              Хэрэглэгч олдсонгүй
            </div>
          )}
        </div>
      </div>
    </div>
  );
}