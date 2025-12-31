import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, List, Grid, Plus, Filter, X, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Button from './ui/Button';
import Card from './ui/Card';
import Badge from './ui/Badge';
import Modal from './ui/Modal';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'planned' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  category?: string;
  department_id?: string;
  assigned_to?: string;
  due_date: string;
  start_time?: string;
  end_time?: string;
  created_at: string;
  user_id: string;
}

interface Department {
  id: string;
  name: string;
  color: string;
}

type ViewType = 'month' | 'week' | 'day' | 'list';

interface AdvancedCalendarProps {
  onBack: () => void;
}

export default function AdvancedCalendar({ onBack }: AdvancedCalendarProps) {
  const { user } = useAuth();
  const [view, setView] = useState<ViewType>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddTime, setQuickAddTime] = useState<string>('');
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [hoveredDay, setHoveredDay] = useState<Date | null>(null);

  const [filters, setFilters] = useState({
    categories: [] as string[],
    priorities: [] as string[],
    departments: [] as string[],
    statuses: [] as string[],
  });

  const [newTask, setNewTask] = useState({
    title: '',
    category: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    description: '',
    start_time: '',
    end_time: '',
  });

  useEffect(() => {
    loadTasks();
    loadDepartments();

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 't') {
        setCurrentDate(new Date());
      } else if (e.key === 'n') {
        setShowQuickAdd(true);
      } else if (e.key === 'ArrowLeft') {
        navigateDate(-1);
      } else if (e.key === 'ArrowRight') {
        navigateDate(1);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [view]);

  useEffect(() => {
    loadTasks();
  }, [currentDate, filters]);

  const loadTasks = async () => {
    try {
      let query = supabase
        .from('tasks')
        .select('*')
        .order('due_date', { ascending: true });

      const { data } = await query;

      if (data) {
        let filtered = data;

        if (filters.priorities.length > 0) {
          filtered = filtered.filter(t => filters.priorities.includes(t.priority));
        }
        if (filters.statuses.length > 0) {
          filtered = filtered.filter(t => filters.statuses.includes(t.status));
        }
        if (filters.departments.length > 0) {
          filtered = filtered.filter(t => t.department_id && filters.departments.includes(t.department_id));
        }

        setTasks(filtered);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const loadDepartments = async () => {
    try {
      const { data } = await supabase
        .from('departments')
        .select('id, name, color');

      if (data) {
        setDepartments(data);
      }
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const navigateDate = (direction: number) => {
    const newDate = new Date(currentDate);

    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + direction);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + (7 * direction));
    } else if (view === 'day') {
      newDate.setDate(newDate.getDate() + direction);
    }

    setCurrentDate(newDate);
  };

  const getMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days: Date[] = [];
    const currentDay = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDay));
      currentDay.setDate(currentDay.getDate() + 1);
    }

    return days;
  };

  const getWeekDays = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }

    return days;
  };

  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => {
      const taskDate = new Date(task.due_date);
      return (
        taskDate.getDate() === date.getDate() &&
        taskDate.getMonth() === date.getMonth() &&
        taskDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const getTasksForDateRange = (startDate: Date, endDate: Date) => {
    return tasks.filter(task => {
      const taskDate = new Date(task.due_date);
      return taskDate >= startDate && taskDate <= endDate;
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (date: Date, time?: string) => {
    if (!draggedTask) return;

    try {
      const newDueDate = new Date(date);

      if (time) {
        const [hours, minutes] = time.split(':');
        newDueDate.setHours(parseInt(hours), parseInt(minutes));
      }

      await supabase
        .from('tasks')
        .update({
          due_date: newDueDate.toISOString(),
          start_time: time || draggedTask.start_time,
        })
        .eq('id', draggedTask.id);

      loadTasks();
      setDraggedTask(null);
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleQuickAdd = async () => {
    if (!newTask.title.trim() || !selectedDate) return;

    try {
      const dueDate = new Date(selectedDate);

      if (quickAddTime) {
        const [hours, minutes] = quickAddTime.split(':');
        dueDate.setHours(parseInt(hours), parseInt(minutes));
      }

      await supabase
        .from('tasks')
        .insert({
          title: newTask.title,
          description: newTask.description,
          category: newTask.category,
          priority: newTask.priority,
          status: 'planned',
          due_date: dueDate.toISOString(),
          start_time: newTask.start_time || quickAddTime,
          end_time: newTask.end_time,
          user_id: user?.id,
        });

      setShowQuickAdd(false);
      setNewTask({
        title: '',
        category: '',
        priority: 'medium',
        description: '',
        start_time: '',
        end_time: '',
      });
      setQuickAddTime('');
      loadTasks();
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const handleToggleComplete = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'planned' : 'completed';

    await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', taskId);

    loadTasks();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-slate-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const formatTime = (time?: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    return `${hours}:${minutes}`;
  };

  const getDayName = (dayIndex: number) => {
    const names = ['Ня', 'Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя'];
    return names[dayIndex];
  };

  const getMonthName = (monthIndex: number) => {
    const names = ['1-р сар', '2-р сар', '3-р сар', '4-р сар', '5-р сар', '6-р сар', '7-р сар', '8-р сар', '9-р сар', '10-р сар', '11-р сар', '12-р сар'];
    return names[monthIndex];
  };

  const getStatistics = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayTasks = tasks.filter(t => {
      const taskDate = new Date(t.due_date);
      taskDate.setHours(0, 0, 0, 0);
      return taskDate.getTime() === today.getTime();
    });

    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());
    const thisWeekEnd = new Date(thisWeekStart);
    thisWeekEnd.setDate(thisWeekStart.getDate() + 7);

    const weekTasks = tasks.filter(t => {
      const taskDate = new Date(t.due_date);
      return taskDate >= thisWeekStart && taskDate < thisWeekEnd;
    });

    const overdueTasks = tasks.filter(t => {
      const taskDate = new Date(t.due_date);
      return taskDate < today && t.status !== 'completed';
    });

    return {
      today: {
        total: todayTasks.length,
        completed: todayTasks.filter(t => t.status === 'completed').length,
        remaining: todayTasks.filter(t => t.status !== 'completed').length,
      },
      week: {
        total: weekTasks.length,
        completed: weekTasks.filter(t => t.status === 'completed').length,
        percentage: weekTasks.length > 0
          ? Math.round((weekTasks.filter(t => t.status === 'completed').length / weekTasks.length) * 100)
          : 0,
      },
      overdue: overdueTasks.length,
    };
  };

  const stats = getStatistics();

  const renderMonthView = () => {
    const days = getMonthDays();

    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="grid grid-cols-7 border-b border-slate-200">
          {[0, 1, 2, 3, 4, 5, 6].map(day => (
            <div key={day} className="p-3 text-center font-semibold text-slate-700 border-r border-slate-100 last:border-r-0">
              {getDayName(day)}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            const dayTasks = getTasksForDate(day);
            const isCurrentDay = isToday(day);
            const isOtherMonth = !isCurrentMonth(day);

            return (
              <div
                key={idx}
                className={`min-h-32 p-2 border-r border-b border-slate-100 transition-colors ${
                  isOtherMonth ? 'bg-slate-50' : 'bg-white hover:bg-blue-50'
                } ${isCurrentDay ? 'bg-blue-100' : ''}`}
                onClick={() => {
                  setSelectedDate(day);
                  setShowQuickAdd(true);
                }}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(day)}
                onMouseEnter={() => setHoveredDay(day)}
                onMouseLeave={() => setHoveredDay(null)}
              >
                <div className={`text-sm font-semibold mb-1 ${
                  isCurrentDay
                    ? 'bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center'
                    : isOtherMonth
                    ? 'text-slate-400'
                    : 'text-slate-700'
                }`}>
                  {day.getDate()}
                </div>

                <div className="space-y-1">
                  {dayTasks.slice(0, 3).map(task => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task)}
                      className={`text-xs p-1 rounded cursor-move hover:shadow-md transition-shadow ${
                        getStatusColor(task.status)
                      } border`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`}></div>
                        <span className="truncate flex-1">{task.title}</span>
                      </div>
                      {task.start_time && (
                        <div className="text-xs opacity-70 mt-0.5">
                          {formatTime(task.start_time)}
                        </div>
                      )}
                    </div>
                  ))}
                  {dayTasks.length > 3 && (
                    <div className="text-xs text-slate-500 text-center">
                      +{dayTasks.length - 3} бусад
                    </div>
                  )}
                </div>

                {hoveredDay?.getTime() === day.getTime() && dayTasks.length > 0 && (
                  <div className="absolute z-10 mt-2 p-3 bg-white rounded-lg shadow-xl border border-slate-200 w-64">
                    <h4 className="font-semibold text-slate-900 mb-2">
                      {day.getDate()}-н өдөр
                    </h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {dayTasks.map(task => (
                        <div key={task.id} className={`text-sm p-2 rounded border ${getStatusColor(task.status)}`}>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`}></div>
                            <span className="font-medium">{task.title}</span>
                          </div>
                          {task.start_time && (
                            <div className="text-xs opacity-70 mt-1">
                              ⏰ {formatTime(task.start_time)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays();
    const hours = Array.from({ length: 13 }, (_, i) => i + 8);

    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-8 border-b border-slate-200">
          <div className="p-3 border-r border-slate-100"></div>
          {weekDays.map((day, idx) => (
            <div
              key={idx}
              className={`p-3 text-center border-r border-slate-100 last:border-r-0 ${
                isToday(day) ? 'bg-blue-100' : ''
              }`}
            >
              <div className="text-sm font-semibold text-slate-700">{getDayName(day.getDay())}</div>
              <div className={`text-lg font-bold ${isToday(day) ? 'text-blue-600' : 'text-slate-900'}`}>
                {day.getDate()}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-8 max-h-[600px] overflow-y-auto">
          <div className="border-r border-slate-100">
            {hours.map(hour => (
              <div key={hour} className="h-16 p-2 border-b border-slate-100 text-xs text-slate-500">
                {hour}:00
              </div>
            ))}
          </div>

          {weekDays.map((day, dayIdx) => (
            <div key={dayIdx} className="border-r border-slate-100 last:border-r-0 relative">
              {hours.map((hour) => {
                const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
                const tasksAtTime = getTasksForDate(day).filter(t =>
                  t.start_time && t.start_time.startsWith(hour.toString().padStart(2, '0'))
                );

                return (
                  <div
                    key={hour}
                    className="h-16 border-b border-slate-100 hover:bg-blue-50 transition-colors cursor-pointer"
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(day, timeSlot)}
                    onClick={() => {
                      setSelectedDate(day);
                      setQuickAddTime(timeSlot);
                      setShowQuickAdd(true);
                    }}
                  >
                    {tasksAtTime.map(task => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={() => handleDragStart(task)}
                        className={`absolute left-1 right-1 p-1 rounded text-xs cursor-move hover:shadow-md transition-shadow z-10 ${
                          getStatusColor(task.status)
                        } border`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`}></div>
                          <span className="truncate font-medium">{task.title}</span>
                        </div>
                        <div className="text-xs opacity-70">
                          {formatTime(task.start_time)} - {formatTime(task.end_time)}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}

              {isToday(day) && (
                <div
                  className="absolute left-0 right-0 h-0.5 bg-red-500 z-20"
                  style={{
                    top: `${((new Date().getHours() - 8) * 64) + (new Date().getMinutes() / 60 * 64)}px`
                  }}
                >
                  <div className="w-2 h-2 bg-red-500 rounded-full absolute -left-1 -top-1"></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const hours = Array.from({ length: 13 }, (_, i) => i + 8);
    const dayTasks = getTasksForDate(currentDate);
    const allDayTasks = dayTasks.filter(t => !t.start_time);
    const timedTasks = dayTasks.filter(t => t.start_time);

    return (
      <div className="space-y-4">
        {allDayTasks.length > 0 && (
          <Card className="bg-blue-50 border-blue-200">
            <h3 className="font-semibold text-slate-900 mb-3">Бүтэн өдрийн ажил</h3>
            <div className="space-y-2">
              {allDayTasks.map(task => (
                <div
                  key={task.id}
                  className={`p-3 rounded-lg border ${getStatusColor(task.status)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getPriorityColor(task.priority)}`}></div>
                      <span className="font-medium">{task.title}</span>
                    </div>
                    <button
                      onClick={() => handleToggleComplete(task.id, task.status)}
                      className={`p-1 rounded ${
                        task.status === 'completed' ? 'text-green-600' : 'text-slate-400'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                  {task.description && (
                    <p className="text-sm text-slate-600 mt-1">{task.description}</p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto">
            {hours.map((hour) => {
              const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
              const tasksAtTime = timedTasks.filter(t =>
                t.start_time && t.start_time.startsWith(hour.toString().padStart(2, '0'))
              );

              return (
                <div key={hour} className="flex border-b border-slate-100">
                  <div className="w-20 p-3 border-r border-slate-100 text-sm text-slate-500">
                    {hour}:00
                  </div>
                  <div
                    className="flex-1 min-h-24 p-2 hover:bg-blue-50 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedDate(currentDate);
                      setQuickAddTime(timeSlot);
                      setShowQuickAdd(true);
                    }}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(currentDate, timeSlot)}
                  >
                    {tasksAtTime.map(task => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={() => handleDragStart(task)}
                        className={`p-3 rounded-lg mb-2 cursor-move hover:shadow-md transition-shadow border ${
                          getStatusColor(task.status)
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${getPriorityColor(task.priority)}`}></div>
                            <span className="font-semibold">{task.title}</span>
                          </div>
                          <button
                            onClick={() => handleToggleComplete(task.id, task.status)}
                            className={`p-1 rounded ${
                              task.status === 'completed' ? 'text-green-600' : 'text-slate-400'
                            }`}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="text-sm text-slate-600 flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {formatTime(task.start_time)} - {formatTime(task.end_time) || 'No end'}
                        </div>
                        {task.description && (
                          <p className="text-sm text-slate-600 mt-2">{task.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderListView = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueTasks = tasks.filter(t => {
      const taskDate = new Date(t.due_date);
      taskDate.setHours(0, 0, 0, 0);
      return taskDate < today && t.status !== 'completed';
    });

    const todayTasks = getTasksForDate(today);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowTasks = getTasksForDate(tomorrow);

    const upcomingTasks = tasks.filter(t => {
      const taskDate = new Date(t.due_date);
      taskDate.setHours(0, 0, 0, 0);
      const twoDaysFromNow = new Date(today);
      twoDaysFromNow.setDate(today.getDate() + 2);
      return taskDate >= twoDaysFromNow && t.status !== 'completed';
    }).slice(0, 10);

    const renderTaskCard = (task: Task) => (
      <Card key={task.id} className={`hover:shadow-md transition-shadow ${getStatusColor(task.status)}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <button
              onClick={() => handleToggleComplete(task.id, task.status)}
              className={`mt-1 p-1 rounded border-2 ${
                task.status === 'completed'
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'border-slate-300 hover:border-green-500'
              }`}
            >
              {task.status === 'completed' && <Check className="w-4 h-4" />}
            </button>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-3 h-3 rounded-full ${getPriorityColor(task.priority)}`}></div>
                <h3 className={`font-semibold ${task.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                  {task.title}
                </h3>
              </div>

              {task.description && (
                <p className="text-sm text-slate-600 mb-2">{task.description}</p>
              )}

              <div className="flex flex-wrap gap-2 text-sm">
                {task.start_time && (
                  <Badge className="bg-blue-100 text-blue-800">
                    <Clock className="w-3 h-3 mr-1" />
                    {formatTime(task.start_time)}
                  </Badge>
                )}
                {task.category && (
                  <Badge className="bg-purple-100 text-purple-800">
                    {task.category}
                  </Badge>
                )}
                <Badge className={getPriorityColor(task.priority) + ' text-white'}>
                  {task.priority === 'high' ? 'Яаралтай' : task.priority === 'medium' ? 'Дунд' : 'Бага'}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );

    return (
      <div className="space-y-6">
        {overdueTasks.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <h2 className="text-lg font-bold text-red-600">Хугацаа хэтэрсэн ({overdueTasks.length})</h2>
            </div>
            <div className="space-y-2">
              {overdueTasks.map(renderTaskCard)}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-3">Өнөөдөр ({todayTasks.length})</h2>
          {todayTasks.length > 0 ? (
            <div className="space-y-2">
              {todayTasks.map(renderTaskCard)}
            </div>
          ) : (
            <Card className="text-center py-8">
              <p className="text-slate-500">Өнөөдөр ажил байхгүй байна</p>
            </Card>
          )}
        </div>

        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-3">Маргааш ({tomorrowTasks.length})</h2>
          {tomorrowTasks.length > 0 ? (
            <div className="space-y-2">
              {tomorrowTasks.map(renderTaskCard)}
            </div>
          ) : (
            <Card className="text-center py-8">
              <p className="text-slate-500">Маргааш ажил байхгүй байна</p>
            </Card>
          )}
        </div>

        {upcomingTasks.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-3">Ирээдүй ({upcomingTasks.length})</h2>
            <div className="space-y-2">
              {upcomingTasks.map(renderTaskCard)}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={onBack}>
              <ChevronLeft className="w-5 h-5 mr-1" />
              Буцах
            </Button>
            <h1 className="text-3xl font-bold text-slate-900">Календар</h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={view === 'month' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setView('month')}
            >
              <Grid className="w-4 h-4 mr-1" />
              Сар
            </Button>
            <Button
              variant={view === 'week' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setView('week')}
            >
              <CalendarIcon className="w-4 h-4 mr-1" />
              7 хоног
            </Button>
            <Button
              variant={view === 'day' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setView('day')}
            >
              <Clock className="w-4 h-4 mr-1" />
              Өдөр
            </Button>
            <Button
              variant={view === 'list' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setView('list')}
            >
              <List className="w-4 h-4 mr-1" />
              Жагсаалт
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm mb-1">Өнөөдөр</p>
                <p className="text-3xl font-bold">{stats.today.total}</p>
                <p className="text-sm text-blue-100 mt-2">
                  {stats.today.completed} дууссан, {stats.today.remaining} үлдсэн
                </p>
              </div>
              <CalendarIcon className="w-12 h-12 text-blue-200" />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm mb-1">Энэ долоо хоног</p>
                <p className="text-3xl font-bold">{stats.week.total}</p>
                <p className="text-sm text-green-100 mt-2">
                  {stats.week.percentage}% дууссан
                </p>
              </div>
              <Clock className="w-12 h-12 text-green-200" />
            </div>
          </Card>

          <Card className={`bg-gradient-to-br ${stats.overdue > 0 ? 'from-red-500 to-red-600' : 'from-slate-500 to-slate-600'} text-white`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm mb-1">Хугацаа хэтэрсэн</p>
                <p className="text-3xl font-bold">{stats.overdue}</p>
                {stats.overdue > 0 && (
                  <p className="text-sm text-red-100 mt-2">Анхаар!</p>
                )}
              </div>
              <AlertCircle className="w-12 h-12 text-red-200" />
            </div>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setShowFilters(!showFilters)}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm mb-1">Шүүлтүүр</p>
                <p className="text-3xl font-bold text-slate-900">
                  {Object.values(filters).flat().length}
                </p>
              </div>
              <Filter className="w-12 h-12 text-slate-400" />
            </div>
          </Card>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigateDate(-1)}>
              <ChevronLeft className="w-5 h-5" />
            </Button>

            <div className="text-center min-w-64">
              <h2 className="text-2xl font-bold text-slate-900">
                {view === 'month' && `${getMonthName(currentDate.getMonth())} ${currentDate.getFullYear()}`}
                {view === 'week' && `${getWeekDays()[0].getDate()}-${getWeekDays()[6].getDate()} ${getMonthName(currentDate.getMonth())} ${currentDate.getFullYear()}`}
                {view === 'day' && `${currentDate.getDate()} ${getMonthName(currentDate.getMonth())} ${currentDate.getFullYear()}`}
                {view === 'list' && 'Бүх ажил'}
              </h2>
            </div>

            <Button variant="outline" onClick={() => navigateDate(1)}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
              Өнөөдөр
            </Button>
            <Button variant="primary" onClick={() => { setSelectedDate(new Date()); setShowQuickAdd(true); }}>
              <Plus className="w-4 h-4 mr-1" />
              Ажил нэмэх
            </Button>
          </div>
        </div>

        {showFilters && (
          <Card className="mb-6 bg-slate-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Шүүлтүүр</h3>
              <button
                onClick={() => setFilters({ categories: [], priorities: [], departments: [], statuses: [] })}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Бүгдийг арилгах
              </button>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Чухал байдал</p>
                <div className="space-y-2">
                  {['high', 'medium', 'low'].map(priority => (
                    <label key={priority} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.priorities.includes(priority)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilters(prev => ({ ...prev, priorities: [...prev.priorities, priority] }));
                          } else {
                            setFilters(prev => ({ ...prev, priorities: prev.priorities.filter(p => p !== priority) }));
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm text-slate-700">
                        {priority === 'high' ? 'Өндөр' : priority === 'medium' ? 'Дунд' : 'Бага'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Төлөв</p>
                <div className="space-y-2">
                  {['planned', 'in_progress', 'completed'].map(status => (
                    <label key={status} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.statuses.includes(status)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilters(prev => ({ ...prev, statuses: [...prev.statuses, status] }));
                          } else {
                            setFilters(prev => ({ ...prev, statuses: prev.statuses.filter(s => s !== status) }));
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm text-slate-700">
                        {status === 'planned' ? 'Төлөвлөсөн' : status === 'in_progress' ? 'Хийгдэж байгаа' : 'Дууссан'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Хэлтэс</p>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {departments.map(dept => (
                    <label key={dept.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.departments.includes(dept.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilters(prev => ({ ...prev, departments: [...prev.departments, dept.id] }));
                          } else {
                            setFilters(prev => ({ ...prev, departments: prev.departments.filter(d => d !== dept.id) }));
                          }
                        }}
                        className="rounded"
                      />
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dept.color }}></div>
                        <span className="text-sm text-slate-700">{dept.name}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        <div>
          {view === 'month' && renderMonthView()}
          {view === 'week' && renderWeekView()}
          {view === 'day' && renderDayView()}
          {view === 'list' && renderListView()}
        </div>

        <div className="mt-6 text-center text-sm text-slate-500">
          <p>Товчлол: T - Өнөөдөр, N - Шинэ ажил, ← → - Навигац</p>
        </div>
      </div>

      {showQuickAdd && (
        <Modal onClose={() => setShowQuickAdd(false)} size="lg">
          <h3 className="text-xl font-bold text-slate-900 mb-4">Шинэ ажил нэмэх</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Гарчиг *
              </label>
              <input
                type="text"
                value={newTask.title}
                onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ажлын гарчиг..."
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Тайлбар
              </label>
              <textarea
                value={newTask.description}
                onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Дэлгэрэнгүй тайлбар..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Эхлэх цаг
                </label>
                <input
                  type="time"
                  value={newTask.start_time || quickAddTime}
                  onChange={(e) => setNewTask(prev => ({ ...prev, start_time: e.target.value }))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Дуусах цаг
                </label>
                <input
                  type="time"
                  value={newTask.end_time}
                  onChange={(e) => setNewTask(prev => ({ ...prev, end_time: e.target.value }))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Ангилал
                </label>
                <input
                  type="text"
                  value={newTask.category}
                  onChange={(e) => setNewTask(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ангилал..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Чухал байдал
                </label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask(prev => ({ ...prev, priority: e.target.value as 'low' | 'medium' | 'high' }))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Бага</option>
                  <option value="medium">Дунд</option>
                  <option value="high">Өндөр</option>
                </select>
              </div>
            </div>

            {selectedDate && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-900">
                  📅 Огноо: {selectedDate.getDate()} {getMonthName(selectedDate.getMonth())} {selectedDate.getFullYear()}
                </p>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-4 border-t border-slate-200">
              <Button variant="outline" onClick={() => setShowQuickAdd(false)}>
                Цуцлах
              </Button>
              <Button variant="primary" onClick={handleQuickAdd} disabled={!newTask.title.trim()}>
                <Plus className="w-4 h-4 mr-1" />
                Нэмэх
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
