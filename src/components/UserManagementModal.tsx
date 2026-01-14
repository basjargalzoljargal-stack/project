import { useState, useEffect } from 'react';
import { X, User, AlertCircle, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';

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

interface Department {
  id: string;
  name: string;
  color: string;
}

interface UserManagementModalProps {
  user: UserProfile | null;
  departments: Department[];
  onClose: () => void;
  onSave: () => void;
}

export default function UserManagementModal({
  user,
  departments,
  onClose,
  onSave,
}: UserManagementModalProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState('');
  const [role, setRole] = useState('user');
  const [status, setStatus] = useState('active');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [selectedDepartments, setSelectedDepartments] = useState<Array<{ id: string; is_primary: boolean }>>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name);
      setEmail(user.email);
      setPhone(user.phone || '');
      setPosition(user.position || '');
      setRole(user.role);
      setStatus(user.status);
      setAvatarUrl(user.avatar_url || '');
      setSelectedDepartments(
        user.departments?.map((dept) => ({
          id: dept.id,
          is_primary: dept.is_primary,
        })) || []
      );
    }
  }, [user]);

  const handleDepartmentToggle = (departmentId: string) => {
    const exists = selectedDepartments.find((d) => d.id === departmentId);

    if (exists) {
      setSelectedDepartments(selectedDepartments.filter((d) => d.id !== departmentId));
    } else {
      setSelectedDepartments([
        ...selectedDepartments,
        { id: departmentId, is_primary: selectedDepartments.length === 0 },
      ]);
    }
  };

  const handleSetPrimary = (departmentId: string) => {
    setSelectedDepartments(
      selectedDepartments.map((dept) => ({
        ...dept,
        is_primary: dept.id === departmentId,
      }))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Нэрээ оруулна уу');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('И-мэйл хаяг буруу байна');
      return;
    }

    if (selectedDepartments.length === 0) {
      setError('Дор хаяж нэг хэлтэс сонгоно уу');
      return;
    }

    const hasPrimary = selectedDepartments.some((d) => d.is_primary);
    if (!hasPrimary && selectedDepartments.length > 0) {
      setError('Үндсэн хэлтэс сонгоно уу');
      return;
    }

    setIsLoading(true);

    try {
      const userData = {
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        position: position.trim() || null,
        role,
        status,
        avatar_url: avatarUrl.trim() || null,
        updated_at: new Date().toISOString(),
      };

      let userId = user?.id;

      if (user) {
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update(userData)
          .eq('id', user.id);

        if (updateError) throw updateError;
      } else {
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password: 'TempPassword123!',
          options: {
            data: {
              full_name: fullName.trim(),
            },
          },
        });

        if (signUpError) throw signUpError;
        if (!authData.user) throw new Error('Failed to create user');

        userId = authData.user.id;

        const { error: profileError } = await supabase
          .from('user_profiles')
          .upsert([{
            id: userId,
            ...userData,
            created_at: new Date().toISOString(),
          }]);

        if (profileError) throw profileError;
      }

      if (userId) {
        const { error: deleteError } = await supabase
          .from('user_departments')
          .delete()
          .eq('user_id', userId);

        if (deleteError) throw deleteError;

        const departmentInserts = selectedDepartments.map((dept) => ({
          user_id: userId,
          department_id: dept.id,
          is_primary: dept.is_primary,
        }));

        const { error: insertError } = await supabase
          .from('user_departments')
          .insert(departmentInserts);

        if (insertError) throw insertError;
      }

      onSave();
    } catch (err: any) {
      setError(err.message || 'Алдаа гарлаа');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} size="lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <User className="w-6 h-6 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            {user ? 'Хэрэглэгч засах' : 'Шинэ хэрэглэгч нэмэх'}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Input
            label="Бүтэн нэр"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Жишээ: Бат Болд"
            required
            disabled={isLoading}
          />

          <Input
            label="И-мэйл хаяг"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            required
            disabled={isLoading || !!user}
          />

          <Input
            label="Утасны дугаар"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="99001122"
            disabled={isLoading}
          />

          <Input
            label="Албан тушаал"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder="Жишээ: Борлуулалтын менежер"
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Хэлтэс сонгох
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3">
            {departments.map((dept) => {
              const isSelected = selectedDepartments.find((d) => d.id === dept.id);
              const isPrimary = isSelected?.is_primary;

              return (
                <div
                  key={dept.id}
                  className="flex items-center justify-between p-2 hover:bg-slate-50 rounded transition-colors"
                >
                  <label className="flex items-center gap-3 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={!!isSelected}
                      onChange={() => handleDepartmentToggle(dept.id)}
                      disabled={isLoading}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-600 rounded"
                    />
                    <span className="text-sm text-slate-900">{dept.name}</span>
                  </label>
                  {isSelected && (
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(dept.id)}
                      disabled={isLoading}
                      className={`text-xs px-2 py-1 rounded transition-colors ${
                        isPrimary
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                      }`}
                    >
                      {isPrimary ? 'Үндсэн ⭐' : 'Үндсэн болгох'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Үндсэн хэлтэс нь хэрэглэгчийн гол хэлтэс юм
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Эрх
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 border-2 border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
              <input
                type="radio"
                name="role"
                value="admin"
                checked={role === 'admin'}
                onChange={() => setRole('admin')}
                disabled={isLoading}
                className="w-4 h-4 text-blue-600 focus:ring-blue-600"
              />
              <div>
                <div className="font-medium text-slate-900">Admin</div>
                <div className="text-xs text-slate-600">Бүх эрхтэй</div>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 border-2 border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
              <input
                type="radio"
                name="role"
                value="manager"
                checked={role === 'manager'}
                onChange={() => setRole('manager')}
                disabled={isLoading}
                className="w-4 h-4 text-blue-600 focus:ring-blue-600"
              />
              <div>
                <div className="font-medium text-slate-900">Manager</div>
                <div className="text-xs text-slate-600">Хэлтсийн эрхтэй</div>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 border-2 border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
              <input
                type="radio"
                name="role"
                value="user"
                checked={role === 'user'}
                onChange={() => setRole('user')}
                disabled={isLoading}
                className="w-4 h-4 text-blue-600 focus:ring-blue-600"
              />
              <div>
                <div className="font-medium text-slate-900">User</div>
                <div className="text-xs text-slate-600">Энгийн хэрэглэгч</div>
              </div>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Төлөв
          </label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="status"
                value="active"
                checked={status === 'active'}
                onChange={() => setStatus('active')}
                disabled={isLoading}
                className="w-4 h-4 text-green-600 focus:ring-green-600"
              />
              <span className="text-sm text-slate-900">Идэвхитэй</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="status"
                value="inactive"
                checked={status === 'inactive'}
                onChange={() => setStatus('inactive')}
                disabled={isLoading}
                className="w-4 h-4 text-slate-600 focus:ring-slate-600"
              />
              <span className="text-sm text-slate-900">Идэвхигүй</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Зураг URL (сонголттой)
          </label>
          <Input
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://example.com/avatar.jpg"
            disabled={isLoading}
            leftIcon={<Upload className="w-5 h-5" />}
          />
        </div>

        <div className="flex gap-3 pt-4 border-t border-slate-200">
          <Button
            type="button"
            variant="outline"
            fullWidth
            onClick={onClose}
            disabled={isLoading}
          >
            Болих
          </Button>
          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={isLoading}
            disabled={isLoading}
          >
            {user ? 'Хадгалах' : 'Нэмэх'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
