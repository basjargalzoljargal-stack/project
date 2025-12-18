import { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Clock, TrendingUp, AlertCircle, Plus, Edit2, Trash2, Calendar as CalendarIcon, FileIcon, Repeat, Shield } from 'lucide-react';
import Sidebar from './Sidebar';
import CalendarPreview from './CalendarPreview';
import CalendarPage from './CalendarPage';
import DocumentsPage from './DocumentsPage';
import AdminPage from './AdminPage';
import TaskModal, { TaskFormData } from './TaskModal';
import TaskExportMenu from './TaskExportMenu';
import TaskCharts from './TaskCharts';
import { getTasks, addTask, updateTask, deleteTask } from '../utils/taskStorage';
import { useAuth } from '../contexts/AuthContext';

interface DashboardProps {
  onLogout: () => void;
}

type TimeFilter = 'all' | 'today' | 'week' | 'month' | 'quarter' | 'year';

export default function Dashboard({ onLogout }: DashboardProps) {
  const { signOut, userRole } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [showAdmin, setShowAdmin] = useState(false);
  const [tasks, setTasks] = useState<TaskFormData[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isPrinting, setIsPrinting] = useState(false);
  const [printData, setPrintData] = useState<{
    tasks: TaskFormData[];
    filterLabel: string;
    stats: { total: number; completed: number; overdue: number; pending: number };
  } | null>(null);

  // Админ панел харуулах
  if (showAdmin) {
    return <AdminPage onBack={() => setShowAdmin(false)} />;
  }

  const loadTasks = () => {
    setLoading(true);
    const loadedTasks = getTasks();
    setTasks(loadedTasks);
    setLoading(false);
  };

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    loadTasks();
  }, [activeTab]);

  useEffect(() => {
    const handlePrintEvent = (event: CustomEvent) => {
      const { tasks, filterLabel, stats } = event.detail;
      setPrintData({ tasks, filterLabel, stats });
      setIsPrinting(true);

      setTimeout(() => {
        window.print();
      }, 100);
    };

    const handleAfterPrint = () => {
      setIsPrinting(false);
      setPrintData(null);
    };

    window.addEventListener('triggerPrint', handlePrintEvent as EventListener);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('triggerPrint', handlePrintEvent as EventListener);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  const getAvailableYears = () => {
    const years = new Set<number>();
    const currentYear = new Date().getFullYear();

    years.add(currentYear - 1);
    years.add(currentYear);
    years.add(currentYear + 1);

    tasks.forEach(task => {
      if (task.dueDate && task.dueDate.trim()) {
        const taskYear = new Date(task.dueDate).getFullYear();
        if (!isNaN(taskYear)) {
          years.add(taskYear);
        }
      }
    });

    return Array.from(years).sort((a, b) => b - a);
  };

  const getFilteredTasks = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let filtered = tasks.filter(task => {
      if (!task.dueDate || !task.dueDate.trim()) {
        return selectedYear === new Date().getFullYear();
      }

      const taskDate = new Date(task.dueDate);
      const taskYear = taskDate.getFullYear();

      if (isNaN(taskYear)) {
        return selectedYear === new Date().getFullYear();
      }

      return taskYear === selectedYear;
    });

    if (timeFilter === 'all') {
      return filtered;
    }

    return filtered.filter(task => {
      if (!task.dueDate || !task.dueDate.trim()) {
        return false;
      }

      const taskDate = new Date(task.dueDate);

      if (isNaN(taskDate.getTime())) {
        return false;
      }

      switch (timeFilter) {
        case 'today':
          const taskToday = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());
          return taskToday.getTime() === today.getTime();

        case 'week':
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          weekEnd.setHours(23, 59, 59, 999);
          return taskDate >= weekStart && taskDate <= weekEnd;

        case 'month':
          return taskDate.getMonth() === now.getMonth() &&
                 taskDate.getFullYear() === now.getFullYear();

        case 'quarter':
          const currentQuarter = Math.floor(now.getMonth() / 3);
          const taskQuarter = Math.floor(taskDate.getMonth() / 3);
          return taskQuarter === currentQuarter &&
                 taskDate.getFullYear() === now.getFullYear();

        case 'year':
          return taskDate.getFullYear() === selectedYear;

        default:
          return true;
      }
    });
  };

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const filteredTasks = getFilteredTasks();
  const completedTasks = filteredTasks.filter(t => t.completed).length;
  const overdueTasks = filteredTasks.filter(t => {
    if (t.completed) return false;
    if (!t.dueDate || !t.dueDate.trim()) return false;
    const dueDate = new Date(t.dueDate);
    if (isNaN(dueDate.getTime())) return false;
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < now;
  }).length;
  const pendingTasks = filteredTasks.filter(t => {
    if (t.completed) return false;
    if (!t.dueDate || !t.dueDate.trim()) return true;
    const dueDate = new Date(t.dueDate);
    if (isNaN(dueDate.getTime())) return true;
    dueDate.setHours(0, 0, 0, 0);
    return dueDate >= now;
  }).length;
  const completionRate = filteredTasks.length > 0 ? Math.round((completedTasks / filteredTasks.length) * 100) : 0;

  const getFilterLabel = () => {
    const timeFilterLabels: Record<TimeFilter, string> = {
      'all': 'Бүгд',
      'today': 'Өнөөдөр',
      'week': 'Энэ 7 хоног',
      'month': 'Энэ сар',
      'quarter': 'Энэ улирал',
      'year': 'Энэ жил'
    };
    return `${timeFilterLabels[timeFilter]} - ${selectedYear}`;
  };

  const toggleTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const newCompleted = !task.completed;
    const newStatus = newCompleted ? 'Дууссан' : 'Хийгдэж байна';

    updateTask(id, { completed: newCompleted, status: newStatus });
    loadTasks();
  };

  const handleAddTask = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const handleEditTask = (task: TaskFormData) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleDeleteTask = (id: string) => {
    if (window.confirm('Та энэ төлөвлөгөөг устгахдаа итгэлтэй байна уу?')) {
      deleteTask(id);
      loadTasks();
    }
  };

  const handleSaveTask = (taskData: TaskFormData) => {
    if (taskData.id) {
      updateTask(taskData.id, taskData);
    } else {
      addTask(taskData);
    }
    loadTasks();
  };

  const formatDate = (dateTime: string) => {
    const date = new Date(dateTime);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTaskDateLabel = (dueDate: string) => {
    const taskDate = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDateOnly = new Date(taskDate);
    taskDateOnly.setHours(0, 0, 0, 0);

    const diffTime = taskDateOnly.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Хугацаа хэтэрсэн';
    if (diffDays === 0) return 'Өнөөдөр';
    if (diffDays === 1) return 'Маргааш';
    if (diffDays <= 7) return `${diffDays} хоногийн дараа`;

    return taskDate.toLocaleDateString('mn-MN', {
      month: 'long',
      day: 'numeric'
    });
  };

  const getTaskBorderClass = (dueDate: string, completed: boolean) => {
    if (completed) return 'border-slate-200';

    const taskDate = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDateOnly = new Date(taskDate);
    taskDateOnly.setHours(0, 0, 0, 0);

    const diffTime = taskDateOnly.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'border-red-300 bg-red-50';
    if (diffDays === 0) return 'border-amber-300 bg-amber-50';
    return 'border-slate-200';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Дууссан':
      case 'Completed':
        return 'bg-green-100 text-green-700';
      case 'Хийгдэж байна':
      case 'In progress':
        return 'bg-blue-100 text-blue-700';
      case 'Төлөвлөсөн':
      case 'Planned':
        return 'bg-slate-100 text-slate-700';
      case 'Хойшлуулсан':
      case 'Postponed':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const handleLogout = () => {
    signOut();
    onLogout();
  };

  const renderContent = () => {
    if (activeTab === 'calendar') {
      return (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Календар</h1>
              <p className="text-slate-600 mt-2">Өдрөөр төлөвлөгөө харах, засварлах</p>
            </div>
            <button
              onClick={handleAddTask}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Төлөвлөгөө нэмэх
            </button>
          </div>
          <CalendarPage tasks={tasks} onTaskClick={handleEditTask} />
        </div>
      );
    }

    if (activeTab === 'documents') {
      return (
        <div className="mb-8">
          <DocumentsPage tasks={tasks} />
        </div>
      );
    }

    return (
      <>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Нүүр</h1>
          <p className="text-slate-600 mt-2">Тавтай морил! Өнөөдрийн тойм</p>
        </div>

        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="year-select" className="text-sm font-medium text-slate-700">
                Жил:
              </label>
              <select
                id="year-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-colors"
              >
                {getAvailableYears().map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setTimeFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  timeFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Бүгд
              </button>
              <button
                onClick={() => setTimeFilter('today')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  timeFilter === 'today'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Өнөөдөр
              </button>
              <button
                onClick={() => setTimeFilter('week')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  timeFilter === 'week'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Энэ долоо хоног
              </button>
              <button
                onClick={() => setTimeFilter('month')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  timeFilter === 'month'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Энэ сар
              </button>
              <button
                onClick={() => setTimeFilter('quarter')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  timeFilter === 'quarter'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Энэ улирал
              </button>
              <button
                onClick={() => setTimeFilter('year')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  timeFilter === 'year'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Энэ жил
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Гүйцэтгэсэн ажлууд</p>
                <p className="text-3xl font-bold text-slate-900">{completionRate}%</p>
                <p className="text-sm text-slate-500 mt-1">{filteredTasks.length}-ийн {completedTasks} ажил</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Хийгдэх ажлууд</p>
                <p className="text-3xl font-bold text-slate-900">{pendingTasks}</p>
                <p className="text-sm text-slate-500 mt-1">Хийх ажлууд</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Хугацаа хэтэрсэн</p>
                <p className="text-3xl font-bold text-slate-900">{overdueTasks}</p>
                <p className="text-sm text-slate-500 mt-1">Анхаарал шаардлагатай</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        <TaskCharts tasks={filteredTasks} selectedYear={selectedYear} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-slate-900">Төлөвлөгөө</h2>
                <div className="flex items-center gap-3">
                  <TaskExportMenu
                    tasks={tasks}
                    filteredTasks={filteredTasks}
                    filterLabel={getFilterLabel()}
                    stats={{
                      total: filteredTasks.length,
                      completed: completedTasks,
                      overdue: overdueTasks,
                      pending: pendingTasks
                    }}
                  />
                  <button
                    onClick={handleAddTask}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Төлөвлөгөө нэмэх
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {filteredTasks.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <p>Энэ хугацаанд төлөвлөгөө байхгүй байна</p>
                  </div>
                ) : (
                  filteredTasks
                    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                    .map((task) => (
                  <div
                    key={task.id}
                    className={`p-4 rounded-lg border hover:border-slate-400 transition-colors ${getTaskBorderClass(task.dueDate, task.completed)}`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleTask(task.id!)}
                        className="flex-shrink-0 mt-1"
                      >
                        {task.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-400" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className={`font-semibold ${task.completed ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                            {task.title}
                          </h3>
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              onClick={() => handleEditTask(task)}
                              className="p-1.5 hover:bg-slate-100 rounded transition-colors"
                              title="Засах"
                            >
                              <Edit2 className="w-4 h-4 text-slate-600" />
                            </button>
                            <button
                              onClick={() => handleDeleteTask(task.id!)}
                              className="p-1.5 hover:bg-red-50 rounded transition-colors"
                              title="Устгах"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </div>
                        {task.description && (
                          <p className="text-sm text-slate-600 mb-3">{task.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="flex items-center gap-1 font-medium text-slate-900">
                            <CalendarIcon className="w-3 h-3" />
                            {getTaskDateLabel(task.dueDate)} - {new Date(task.dueDate).toLocaleDateString('mn-MN', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </span>
                          <span className={`px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
                            {task.status}
                          </span>
                          <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                            {task.category}
                          </span>
                          <span
                            className={`px-2 py-1 rounded-full ${
                              task.priority === 'high'
                                ? 'bg-red-100 text-red-700'
                                : task.priority === 'medium'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {task.priority}
                          </span>
                          {task.fileName && (
                            <span className="flex items-center gap-1 text-slate-600">
                              <FileIcon className="w-3 h-3" />
                              {task.fileName}
                            </span>
                          )}
                          {task.isRecurring && (
                            <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                              <Repeat className="w-3 h-3" />
                              Тогтмол
                            </span>
                          )}
                          {task.parentTaskId && (
                            <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                              <Repeat className="w-3 h-3" />
                              Үүсгэгдсэн
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <CalendarPreview tasks={tasks} />
          </div>
        </div>

      </>
    );
  };

  const translateStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      'Төлөвлөсөн': 'Төлөвлөсөн',
      'Хийгдэж байна': 'Хийгдэж байна',
      'Дууссан': 'Дууссан',
      'Хойшлуулсан': 'Хойшлуулсан',
      'Planned': 'Төлөвлөсөн',
      'In progress': 'Хийгдэж байна',
      'Completed': 'Дууссан',
      'Postponed': 'Хойшлуулсан'
    };
    return statusMap[status] || status;
  };

  const formatDateForPrint = (dateString: string) => {
    if (!dateString) return 'Тодорхойгүй';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Тодорхойгүй';
    return date.toLocaleDateString('mn-MN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        onLogout={handleLogout}
        userRole={userRole}
        onAdminClick={() => setShowAdmin(true)}
      />

      <main className={`flex-1 ml-64 p-8 ${isPrinting ? 'print:hidden' : ''}`}>
        {renderContent()}
      </main>

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        task={editingTask}
      />

      {isPrinting && printData && (
        <div className="hidden print:block print:p-8">
          <div className="print-header" style={{ borderBottom: '2px solid #111827', paddingBottom: '10px', marginBottom: '20px' }}>
            <h1 style={{ margin: '0 0 10px 0', fontSize: '24px', color: '#111827' }}>Ажлын төлөвлөгөө</h1>
            <div style={{ color: '#6b7280', fontSize: '12px', lineHeight: '1.6' }}>
              <strong>Хугацаа:</strong> {printData.filterLabel}<br />
              <strong>Хэвлэсэн огноо:</strong> {new Date().toLocaleDateString('mn-MN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', margin: '20px 0' }}>
            <div style={{ border: '1px solid #d1d5db', padding: '15px', textAlign: 'center', borderRadius: '4px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{printData.stats.total}</div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '5px' }}>Нийт</div>
            </div>
            <div style={{ border: '1px solid #d1d5db', padding: '15px', textAlign: 'center', borderRadius: '4px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{printData.stats.completed}</div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '5px' }}>Дууссан</div>
            </div>
            <div style={{ border: '1px solid #d1d5db', padding: '15px', textAlign: 'center', borderRadius: '4px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{printData.stats.overdue}</div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '5px' }}>Хугацаа хэтэрсэн</div>
            </div>
            <div style={{ border: '1px solid #d1d5db', padding: '15px', textAlign: 'center', borderRadius: '4px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{printData.stats.pending}</div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '5px' }}>Хүлээгдэж буй</div>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
            <thead>
              <tr>
                <th style={{ backgroundColor: '#f3f4f6', padding: '12px', textAlign: 'left', border: '1px solid #d1d5db', fontWeight: 600, fontSize: '12px', color: '#111827', width: '5%' }}>№</th>
                <th style={{ backgroundColor: '#f3f4f6', padding: '12px', textAlign: 'left', border: '1px solid #d1d5db', fontWeight: 600, fontSize: '12px', color: '#111827', width: '50%' }}>Төлөвлөгөө</th>
                <th style={{ backgroundColor: '#f3f4f6', padding: '12px', textAlign: 'left', border: '1px solid #d1d5db', fontWeight: 600, fontSize: '12px', color: '#111827', width: '20%' }}>Биелэх огноо</th>
                <th style={{ backgroundColor: '#f3f4f6', padding: '12px', textAlign: 'left', border: '1px solid #d1d5db', fontWeight: 600, fontSize: '12px', color: '#111827', width: '25%' }}>Төлөв</th>
              </tr>
            </thead>
            <tbody>
              {printData.tasks.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '20px', border: '1px solid #d1d5db' }}>Төлөвлөгөө олдсонгүй</td>
                </tr>
              ) : (
                printData.tasks.map((task, index) => (
                  <tr key={task.id}>
                    <td style={{ textAlign: 'center', padding: '10px 12px', border: '1px solid #d1d5db', fontSize: '11px', verticalAlign: 'top' }}>{index + 1}</td>
                    <td style={{ padding: '10px 12px', border: '1px solid #d1d5db', fontSize: '11px', verticalAlign: 'top' }}>
                      <strong>{task.title}</strong>
                      {task.description && (
                        <><br /><span style={{ fontSize: '10px', color: '#6b7280' }}>{task.description}</span></>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', border: '1px solid #d1d5db', fontSize: '11px', verticalAlign: 'top' }}>{formatDateForPrint(task.dueDate)}</td>
                    <td style={{ padding: '10px 12px', border: '1px solid #d1d5db', fontSize: '11px', verticalAlign: 'top' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 500,
                        backgroundColor: task.completed ? '#d1fae5' : '#e5e7eb',
                        color: task.completed ? '#065f46' : '#374151'
                      }}>
                        {task.completed ? 'Дууссан' : translateStatus(task.status)}
                      </span>
                      {(task.priority === 'Өндөр' || task.priority === 'high') && (
                        <><br /><span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 500,
                          marginTop: '4px',
                          backgroundColor: '#fee2e2',
                          color: '#991b1b'
                        }}>Яаралтай</span></>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div style={{ marginTop: '30px', paddingTop: '10px', borderTop: '1px solid #d1d5db', fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
            Энэхүү тайлан нь автоматаар үүсгэгдсэн болно.
          </div>
        </div>
      )}
    </div>
  );
}
