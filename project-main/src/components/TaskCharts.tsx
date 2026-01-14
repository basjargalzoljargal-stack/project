import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TaskFormData } from './TaskModal';

interface TaskChartsProps {
  tasks: TaskFormData[];
  selectedYear: number;
}

export default function TaskCharts({ tasks, selectedYear }: TaskChartsProps) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const completedTasks = tasks.filter(t => t.completed).length;
  const inProgressTasks = tasks.filter(t => {
    if (t.completed) return false;
    if (!t.dueDate || !t.dueDate.trim()) return true;
    const dueDate = new Date(t.dueDate);
    if (isNaN(dueDate.getTime())) return true;
    dueDate.setHours(0, 0, 0, 0);
    return dueDate >= now;
  }).length;
  const overdueTasks = tasks.filter(t => {
    if (t.completed) return false;
    if (!t.dueDate || !t.dueDate.trim()) return false;
    const dueDate = new Date(t.dueDate);
    if (isNaN(dueDate.getTime())) return false;
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < now;
  }).length;

  const pieData = [
    { name: 'Дууссан', value: completedTasks, color: '#10b981' },
    { name: 'Хийгдэж байна', value: inProgressTasks, color: '#3b82f6' },
    { name: 'Хугацаа хэтэрсэн', value: overdueTasks, color: '#ef4444' }
  ].filter(item => item.value > 0);

  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const monthName = new Date(selectedYear, i, 1).toLocaleDateString('mn-MN', { month: 'short' });
    const count = tasks.filter(task => {
      if (!task.dueDate || !task.dueDate.trim()) return false;
      const taskDate = new Date(task.dueDate);
      if (isNaN(taskDate.getTime())) return false;
      return taskDate.getMonth() === i && taskDate.getFullYear() === selectedYear;
    }).length;
    return {
      month: monthName,
      count
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-slate-200">
          <p className="text-sm font-medium text-slate-900">{payload[0].name}</p>
          <p className="text-sm text-slate-600">{payload[0].value} ажил</p>
        </div>
      );
    }
    return null;
  };

  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-slate-200">
          <p className="text-sm font-medium text-slate-900">{payload[0].payload.month}</p>
          <p className="text-sm text-slate-600">{payload[0].value} ажил</p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-sm font-semibold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  if (tasks.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Төлөвийн харьцаа</h3>
        <div className="h-64">
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => <span className="text-sm text-slate-700">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
              Мэдээлэл байхгүй байна
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Сараар ажлын тоо ({selectedYear})</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <XAxis
                dataKey="month"
                tick={{ fill: '#64748b', fontSize: 12 }}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 12 }}
                axisLine={{ stroke: '#e2e8f0' }}
                allowDecimals={false}
              />
              <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
              <Bar dataKey="count" fill="#0f172a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
