import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { TaskFormData } from './TaskModal';

interface CalendarPreviewProps {
  tasks?: TaskFormData[];
}

export default function CalendarPreview({ tasks = [] }: CalendarPreviewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthNames = [
    '1-р сар', '2-р сар', '3-р сар', '4-р сар', '5-р сар', '6-р сар',
    '7-р сар', '8-р сар', '9-р сар', '10-р сар', '11-р сар', '12-р сар'
  ];

  const daysOfWeek = ['Ням', 'Дав', 'Мяг', 'Лха', 'Пүр', 'Баа', 'Бям'];

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

  const hasOverdueTasks = (day: number | null) => {
    const dayTasks = getTasksForDate(day);
    const now = new Date();
    return dayTasks.some(task => {
      const taskDate = new Date(task.dueDate);
      return taskDate < now && !task.completed;
    });
  };

  const hasCompletedTasks = (day: number | null) => {
    const dayTasks = getTasksForDate(day);
    return dayTasks.length > 0 && dayTasks.every(task => task.completed);
  };

  const hasPendingTasks = (day: number | null) => {
    const dayTasks = getTasksForDate(day);
    return dayTasks.some(task => !task.completed);
  };

  const days = getDaysInMonth(currentDate);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={previousMonth}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {daysOfWeek.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-slate-500 pb-2"
          >
            {day}
          </div>
        ))}
        {days.map((day, index) => {
          const dayTasks = getTasksForDate(day);
          const hasOverdue = hasOverdueTasks(day);
          const hasCompleted = hasCompletedTasks(day);
          const hasPending = hasPendingTasks(day);

          return (
            <div
              key={index}
              className={`aspect-square flex flex-col items-center justify-center text-sm rounded-lg transition-colors relative ${
                day === null
                  ? ''
                  : isToday(day)
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'hover:bg-slate-100 text-slate-700 cursor-pointer'
              }`}
            >
              <div>{day}</div>
              {day !== null && dayTasks.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {hasOverdue && (
                    <div className="w-1 h-1 rounded-full bg-red-500"></div>
                  )}
                  {hasPending && !hasOverdue && (
                    <div className={`w-1 h-1 rounded-full ${isToday(day) ? 'bg-white' : 'bg-blue-500'}`}></div>
                  )}
                  {hasCompleted && (
                    <div className={`w-1 h-1 rounded-full ${isToday(day) ? 'bg-white' : 'bg-green-500'}`}></div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
