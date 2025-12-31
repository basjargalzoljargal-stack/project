import { useState, useEffect } from 'react';
import { X, Plus, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Button from './ui/Button';
import Input from './ui/Input';
import Modal from './ui/Modal';

interface Task {
  id?: string;
  title: string;
  description: string;
  due_date: string;
  assigned_to?: string;
  assigned_to_name?: string;
}

interface PlanCreationModalProps {
  onClose: () => void;
  onSave: () => void;
  proposalId?: string;
  proposalData?: {
    title: string;
    objective: string;
    start_date: string;
    end_date: string;
  };
}

export default function PlanCreationModal({ onClose, onSave, proposalId, proposalData }: PlanCreationModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    console.log('PlanCreationModal mounted!');
  }, []);

  const [planData, setPlanData] = useState({
    title: proposalData?.title || '',
    description: proposalData?.objective || '',
    start_date: proposalData?.start_date || '',
    end_date: proposalData?.end_date || '',
  });

  const [tasks, setTasks] = useState<Task[]>([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState<Task>({
    title: '',
    description: '',
    due_date: '',
    assigned_to: '',
  });

  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, email')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleAddTask = () => {
    setTaskForm({
      title: '',
      description: '',
      due_date: planData.start_date,
      assigned_to: '',
    });
    setEditingTask(null);
    setShowTaskForm(true);
  };

  const handleEditTask = (task: Task, index: number) => {
    setTaskForm({ ...task });
    setEditingTask({ ...task, id: String(index) });
    setShowTaskForm(true);
  };

  const handleSaveTask = () => {
    if (!taskForm.title || !taskForm.due_date) {
      alert('Ажлын нэр болон deadline оруулна уу');
      return;
    }

    const assignedUser = users.find(u => u.id === taskForm.assigned_to);
    const newTask = {
      ...taskForm,
      assigned_to_name: assignedUser?.full_name || '',
    };

    if (editingTask) {
      const index = parseInt(editingTask.id || '0');
      const updatedTasks = [...tasks];
      updatedTasks[index] = newTask;
      setTasks(updatedTasks);
    } else {
      setTasks([...tasks, newTask]);
    }

    setShowTaskForm(false);
    setTaskForm({
      title: '',
      description: '',
      due_date: '',
      assigned_to: '',
    });
  };

  const handleDeleteTask = (index: number) => {
    if (confirm('Энэ ажлыг устгах уу?')) {
      setTasks(tasks.filter((_, i) => i !== index));
    }
  };

  const handleNextStep = () => {
    if (!planData.title || !planData.start_date || !planData.end_date) {
      alert('Бүх талбарыг бөглөнө үү');
      return;
    }
    setStep(2);
  };

  const handleSavePlan = async () => {
    if (tasks.length === 0) {
      alert('Наад зах нь 1 ажил нэмнэ үү');
      return;
    }

    setSaving(true);
    try {
      const { data: planData_, error: planError } = await supabase
        .from('tasks')
        .insert([{
          title: planData.title,
          description: planData.description,
          due_date: planData.end_date,
          status: 'pending',
          priority: 'medium',
          category: 'plan',
          source_type: proposalId ? 'proposal' : 'manual',
          source_id: proposalId || null,
          created_by: user?.id,
        }])
        .select()
        .single();

      if (planError) throw planError;

      const subtasksToInsert = tasks.map(task => ({
        parent_task_id: planData_.id,
        title: task.title,
        description: task.description,
        due_date: task.due_date,
        assigned_to: task.assigned_to || null,
        status: 'pending',
        created_by: user?.id,
      }));

      const { error: subtasksError } = await supabase
        .from('subtasks')
        .insert(subtasksToInsert);

      if (subtasksError) throw subtasksError;

      if (proposalId) {
        await supabase
          .from('proposals')
          .update({ linked_plan_id: planData_.id })
          .eq('id', proposalId);
      }

      alert('Төлөвлөгөө амжилттай үүсгэлээ');
      onSave();
      onClose();
    } catch (error) {
      console.error('Error creating plan:', error);
      alert('Төлөвлөгөө үүсгэхэд алдаа гарлаа');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} size="lg">
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">
            {step === 1 ? 'Шинэ төлөвлөгөө' : 'Ажил/Арга хэмжээ нэмэх'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
              step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
            }`}>
              1
            </div>
            <div className={`w-24 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
              step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
            }`}>
              2
            </div>
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Төлөвлөгөөний нэр *
              </label>
              <Input
                value={planData.title}
                onChange={(e) => setPlanData({ ...planData, title: e.target.value })}
                placeholder="Төлөвлөгөөний нэр оруулах"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Тайлбар
              </label>
              <textarea
                value={planData.description}
                onChange={(e) => setPlanData({ ...planData, description: e.target.value })}
                placeholder="Төлөвлөгөөний тайлбар"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Эхлэх огноо *
                </label>
                <Input
                  type="date"
                  value={planData.start_date}
                  onChange={(e) => setPlanData({ ...planData, start_date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Дуусах огноо *
                </label>
                <Input
                  type="date"
                  value={planData.end_date}
                  onChange={(e) => setPlanData({ ...planData, end_date: e.target.value })}
                  min={planData.start_date}
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleNextStep}>
                Дараах алхам
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && !showTaskForm && (
          <div className="space-y-4">
            <Button onClick={handleAddTask} variant="outline" fullWidth>
              <Plus className="w-5 h-5 mr-2" />
              Ажил нэмэх
            </Button>

            {tasks.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900">Нэмсэн ажлууд:</h3>
                {tasks.map((task, index) => (
                  <div key={index} className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-900">{task.title}</h4>
                        {task.description && (
                          <p className="text-sm text-slate-600 mt-1">{task.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                          <span>Deadline: {new Date(task.due_date).toLocaleDateString('mn-MN')}</span>
                          {task.assigned_to_name && (
                            <span>Хариуцагч: {task.assigned_to_name}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleEditTask(task, index)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="w-5 h-5 mr-2" />
                Буцах
              </Button>
              <Button onClick={handleSavePlan} disabled={saving || tasks.length === 0} fullWidth>
                {saving ? 'Хадгалж байна...' : 'Хадгалах'}
              </Button>
            </div>
          </div>
        )}

        {step === 2 && showTaskForm && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Ажлын нэр *
              </label>
              <Input
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                placeholder="Ажлын нэр"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Тайлбар
              </label>
              <textarea
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                placeholder="Ажлын тайлбар"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Deadline *
                </label>
                <Input
                  type="date"
                  value={taskForm.due_date}
                  onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                  min={planData.start_date}
                  max={planData.end_date}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Хариуцагч
                </label>
                <select
                  value={taskForm.assigned_to}
                  onChange={(e) => setTaskForm({ ...taskForm, assigned_to: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Сонгох</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <Button
                variant="outline"
                onClick={() => {
                  setShowTaskForm(false);
                  setTaskForm({
                    title: '',
                    description: '',
                    due_date: '',
                    assigned_to: '',
                  });
                }}
              >
                Болих
              </Button>
              <Button onClick={handleSaveTask} fullWidth>
                {editingTask ? 'Засах' : 'Нэмэх'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
