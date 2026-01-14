import { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Clock, AlertCircle } from 'lucide-react';
import { TaskFormData } from './TaskModal';

interface CalendarPageProps {
  tasks: TaskFormData[];
  onTaskClick: (task: TaskFormData) => void;
}

export default function CalendarPage({ tasks, onTaskClick }: CalendarPageProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthNames = [
    '1-р сар', '2-р сар', '3-р сар', '4-р сар', '5-р сар', '6-р сар',
    '7-р сар', '8-р сар', '9-р сар', '10-р сар', '11-р сар', '12-р сар'
  ];

  const daysOfWeek = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const previousYear = () => {
    setCurrentDate(new Date(currentDate.getFullYear() - 1, currentDate.getMonth()));
  };

  const nextYear = () => {
    setCurrentDate(new Date(currentDate.getFullYear() + 1, currentDate.getMonth()));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = parseInt(e.target.value);
    setCurrentDate(new Date(currentDate.getFullYear(), newMonth));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newYear = parseInt(e.target.value);
    if (!isNaN(newYear) && newYear > 0) {
      setCurrentDate(new Date(newYear, currentDate.getMonth()));
    }
  };

  const isToday = (day: number | null) => {
    if (!day) return false;
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const getTasksForDate = (day: number | null) => {
    if (!day) return [];

    return tasks.filter(task => {
      const taskDate = new Date(task.dueDate);
      return (
        taskDate.getDate() === day &&
        taskDate.getMonth() === currentDate.getMonth() &&
        taskDate.getFullYear() === currentDate.getFullYear()
      );
    });
  };

  const isOverdue = (task: TaskFormData) => {
    const taskDate = new Date(task.dueDate);
    const now = new Date();
    return taskDate < now && !task.completed;
  };

  const getTaskColor = (task: TaskFormData) => {
    if (isOverdue(task)) {
      return 'bg-red-500 hover:bg-red-600 text-white';
    }
    if (task.priority === 'Өндөр' || task.priority === 'high') {
      return 'bg-orange-500 hover:bg-orange-600 text-white';
    }
    if (task.completed) {
      return 'bg-green-100 hover:bg-green-200 text-green-800 line-through';
    }
    return 'bg-blue-100 hover:bg-blue-200 text-blue-800';
  };

  const getTaskIcon = (task: TaskFormData) => {
    if (isOverdue(task)) {
      return <AlertCircle className="w-3 h-3" />;
    }
    if (task.priority === 'Өндөр' || task.priority === 'high') {
      return <Clock className="w-3 h-3" />;
    }
    return null;
  };

  const days = getDaysInMonth(currentDate);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                {currentDate.getFullYear()} он {monthNames[currentDate.getMonth()]}
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                {tasks.length} сарын ажил
              </p>
            </div>
            <button
              onClick={goToToday}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
            >
              Өнөөдөр
            </button>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700 mr-2">Жил:</span>
              <button
                onClick={previousYear}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="Өмнөх жил"
              >
                <ChevronsLeft className="w-5 h-5 text-slate-600" />
              </button>
              <input
                type="number"
                value={currentDate.getFullYear()}
                onChange={handleYearChange}
                min="1900"
                max="2200"
                className="w-20 px-3 py-1.5 text-center text-lg font-semibold text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              />
              <button
                onClick={nextYear}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="Дараагийн жил"
              >
                <ChevronsRight className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="hidden md:block w-px h-8 bg-slate-300"></div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700 mr-2">Сар:</span>
              <button
                onClick={previousMonth}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="Өмнөх сар"
              >
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
              <select
                value={currentDate.getMonth()}
                onChange={handleMonthChange}
                className="px-4 py-1.5 text-lg font-semibold text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent bg-white cursor-pointer"
              >
                {monthNames.map((month, index) => (
                  <option key={index} value={index}>
                    {month}
                  </option>
                ))}
              </select>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="Дараагийн сар"
              >
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {daysOfWeek.map((day) => (
            <div
              key={day}
              className="text-center text-sm font-semibold text-slate-700 pb-2 border-b border-slate-200"
            >
              {day}
            </div>
          ))}

          {days.map((day, index) => {
            const dayTasks = getTasksForDate(day);
            const hasOverdue = dayTasks.some(task => isOverdue(task));
            const hasUrgent = dayTasks.some(task => (task.priority === 'Өндөр' || task.priority === 'high') && !isOverdue(task));

            return (
              <div
                key={index}
                className={`min-h-[120px] p-2 rounded-lg border transition-colors ${
                  day === null
                    ? 'bg-slate-50 border-slate-100'
                    : isToday(day)
                    ? 'bg-blue-50 border-blue-300 border-2'
                    : hasOverdue
                    ? 'bg-red-50 border-red-200'
                    : hasUrgent
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                {day !== null && (
                  <>
                    <div
                      className={`text-sm font-semibold mb-2 ${
                        isToday(day)
                          ? 'text-blue-700'
                          : 'text-slate-900'
                      }`}
                    >
                      {day}
                    </div>
                    <div className="space-y-1">
                      {dayTasks.slice(0, 3).map((task) => (
                        <button
                          key={task.id}
                          onClick={() => onTaskClick(task)}
                          className={`w-full text-left px-2 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${getTaskColor(task)}`}
                          title={task.title}
                        >
                          {getTaskIcon(task)}
                          <span className="truncate">{task.title}</span>
                        </button>
                      ))}
                      {dayTasks.length > 3 && (
                        <div className="text-xs text-slate-600 px-2">
                          +{dayTasks.length - 3} бусад
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Тайлбар</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-sm text-slate-700">Хугацаа хэтэрсэн</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span className="text-sm text-slate-700">Яаралтай (Өндөр ач холбогдолтой)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 rounded border border-blue-300"></div>
            <span className="text-sm text-slate-700">Энгийн ажил</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 rounded border border-green-300"></div>
            <span className="text-sm text-slate-700">Дууссан</span>
          </div>
        </div>
      </div>
    </div>
  );
}
