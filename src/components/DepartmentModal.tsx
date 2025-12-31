import { useState, useEffect } from 'react';
import { X, Building2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';

interface Department {
  id: string;
  name: string;
  description: string;
  color: string;
  parent_department_id: string | null;
  department_head_id: string | null;
}

interface User {
  id: string;
  full_name: string;
  email: string;
}

interface DepartmentModalProps {
  department: Department | null;
  departments: Department[];
  users: User[];
  onClose: () => void;
  onSave: () => void;
}

const colorOptions = [
  { value: 'red', label: 'Улаан', bgColor: 'bg-red-500', borderColor: 'border-red-500' },
  { value: 'blue', label: 'Цэнхэр', bgColor: 'bg-blue-500', borderColor: 'border-blue-500' },
  { value: 'green', label: 'Ногоон', bgColor: 'bg-green-500', borderColor: 'border-green-500' },
  { value: 'yellow', label: 'Шар', bgColor: 'bg-yellow-500', borderColor: 'border-yellow-500' },
  { value: 'purple', label: 'Нил ягаан', bgColor: 'bg-purple-500', borderColor: 'border-purple-500' },
];

export default function DepartmentModal({
  department,
  departments,
  users,
  onClose,
  onSave,
}: DepartmentModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('blue');
  const [parentDepartmentId, setParentDepartmentId] = useState<string>('');
  const [departmentHeadId, setDepartmentHeadId] = useState<string>('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (department) {
      setName(department.name);
      setDescription(department.description);
      setColor(department.color);
      setParentDepartmentId(department.parent_department_id || '');
      setDepartmentHeadId(department.department_head_id || '');
    }
  }, [department]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Хэлтсийн нэрийг оруулна уу');
      return;
    }

    setIsLoading(true);

    try {
      const data = {
        name: name.trim(),
        description: description.trim(),
        color,
        parent_department_id: parentDepartmentId || null,
        department_head_id: departmentHeadId || null,
        updated_at: new Date().toISOString(),
      };

      if (department) {
        const { error: updateError } = await supabase
          .from('departments')
          .update(data)
          .eq('id', department.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('departments')
          .insert([data]);

        if (insertError) throw insertError;
      }

      onSave();
    } catch (err: any) {
      setError(err.message || 'Алдаа гарлаа');
    } finally {
      setIsLoading(false);
    }
  };

  const availableParentDepartments = departments.filter(
    (d) => !department || d.id !== department.id
  );

  return (
    <Modal onClose={onClose} size="md">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            {department ? 'Хэлтэс засах' : 'Шинэ хэлтэс нэмэх'}
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

        <Input
          label="Хэлтсийн нэр"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Жишээ: Борлуулалтын хэлтэс"
          required
          disabled={isLoading}
        />

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Тайлбар
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Хэлтсийн тухай товч тайлбар..."
            rows={3}
            disabled={isLoading}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Өнгө
          </label>
          <div className="flex gap-3">
            {colorOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setColor(option.value)}
                disabled={isLoading}
                className={`w-10 h-10 rounded-lg ${option.bgColor} transition-all ${
                  color === option.value
                    ? 'ring-2 ring-offset-2 ring-slate-900 scale-110'
                    : 'opacity-60 hover:opacity-100'
                }`}
                title={option.label}
              />
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Сонгосон: <span className="font-medium">{colorOptions.find(c => c.value === color)?.label}</span>
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Эцэг хэлтэс (сонголттой)
          </label>
          <select
            value={parentDepartmentId}
            onChange={(e) => setParentDepartmentId(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Үгүй</option>
            {availableParentDepartments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Хэлтсийн дарга (сонголттой)
          </label>
          <select
            value={departmentHeadId}
            onChange={(e) => setDepartmentHeadId(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Сонгох...</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.full_name} ({user.email})
              </option>
            ))}
          </select>
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
            {department ? 'Хадгалах' : 'Нэмэх'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
