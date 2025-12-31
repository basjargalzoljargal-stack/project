import { useState, useEffect } from 'react';
import { Users, CheckCircle, AlertCircle, TrendingUp, TrendingDown, Download, ArrowLeft, Calendar, Filter, UserPlus, FileText, Settings } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { getDashboardStats, getWeeklyPerformance, getCategoryDistribution, getDepartmentStats, getTopPerformers, getRecentActivities } from '../utils/dashboardData';
import Card from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';

interface DashboardStats {
  totalUsers: number;
  usersGrowth: number;
  totalTasks: number;
  tasksGrowth: number;
  completionRate: number;
  completionChange: number;
  overdueTasks: number;
  overdueChange: number;
}

interface ChartDataPoint {
  day?: string;
  rate?: number;
  name?: string;
  value?: number;
  count?: number;
  color?: string;
}

interface TopPerformer {
  userId: string;
  name: string;
  avatar?: string;
  department: string;
  completed: number;
  total: number;
  rating: number;
}

interface RecentActivity {
  id: string;
  type: 'task_completed' | 'task_assigned' | 'proposal_submitted' | 'user_added' | 'task_overdue';
  userId: string;
  userName: string;
  action: string;
  timestamp: string;
}

type DateFilter = 'today' | 'week' | 'month' | 'custom';

interface AdminDashboardPageProps {
  onBack: () => void;
}

export default function AdminDashboardPage({ onBack }: AdminDashboardPageProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [weeklyData, setWeeklyData] = useState<ChartDataPoint[]>([]);
  const [categoryData, setCategoryData] = useState<ChartDataPoint[]>([]);
  const [departmentData, setDepartmentData] = useState<ChartDataPoint[]>([]);
  const [topPerformers, setTopPerformers] = useState<TopPerformer[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>('week');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  useEffect(() => {
    loadDashboardData();

    const interval = setInterval(() => {
      loadRecentActivitiesOnly();
    }, 30000);

    return () => clearInterval(interval);
  }, [dateFilter, selectedDepartment]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsData, weeklyPerf, categoryDist, deptStats, performers, activities] = await Promise.all([
        getDashboardStats(),
        getWeeklyPerformance(),
        getCategoryDistribution(),
        getDepartmentStats(),
        getTopPerformers(),
        getRecentActivities(),
      ]);

      setStats(statsData);
      setWeeklyData(weeklyPerf);
      setCategoryData(categoryDist);
      setDepartmentData(deptStats);
      setTopPerformers(performers);
      setRecentActivities(activities);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentActivitiesOnly = async () => {
    try {
      const activities = await getRecentActivities();
      setRecentActivities(activities);
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'task_completed':
        return '🟢';
      case 'task_assigned':
        return '🔵';
      case 'proposal_submitted':
        return '🟡';
      case 'user_added':
        return '🔵';
      case 'task_overdue':
        return '🔴';
      default:
        return '⚪';
    }
  };

  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds} секундын өмнө`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} минутын өмнө`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} цагийн өмнө`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} өдрийн өмнө`;
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <span key={i} className={i < rating ? 'text-yellow-400' : 'text-slate-300'}>
          ⭐
        </span>
      );
    }
    return stars;
  };

  const handleExport = () => {
    alert('Экспорт функц удахгүй нэмэгдэнэ');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-slate-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-slate-200 rounded-lg"></div>
              ))}
            </div>
            <div className="h-96 bg-slate-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-slate-700" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
              <p className="text-slate-600 mt-1">Системийн тойм мэдээлэл ба статистик</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Экспорт
            </Button>
            <Button variant="primary">
              <Settings className="w-4 h-4 mr-2" />
              Тохиргоо
            </Button>
          </div>
        </div>

        <div className="mb-6 flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-600" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilter)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="today">Өнөөдөр</option>
              <option value="week">Энэ 7 хоног</option>
              <option value="month">Энэ сар</option>
              <option value="custom">Өөрийн сонголт</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-600" />
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Бүх хэлтэс</option>
              <option value="dept1">Хэлтэс 1</option>
              <option value="dept2">Хэлтэс 2</option>
              <option value="admin">Захиргаа</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-blue-100 mb-2">
                  <Users className="w-5 h-5" />
                  <span className="text-sm font-medium">Нийт хэрэглэгч</span>
                </div>
                <div className="text-4xl font-bold mb-2">{stats.totalUsers}</div>
                <div className="flex items-center gap-1 text-sm">
                  {stats.usersGrowth >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span>+{stats.usersGrowth} энэ сард</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-purple-100 mb-2">
                  <FileText className="w-5 h-5" />
                  <span className="text-sm font-medium">Нийт ажил</span>
                </div>
                <div className="text-4xl font-bold mb-2">{stats.totalTasks}</div>
                <div className="flex items-center gap-1 text-sm">
                  <TrendingUp className="w-4 h-4" />
                  <span>+{stats.tasksGrowth} энэ сард</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-green-100 mb-2">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">Дууссан ажил</span>
                </div>
                <div className="text-4xl font-bold mb-2">{stats.completionRate}%</div>
                <div className="flex items-center gap-1 text-sm">
                  {stats.completionChange >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span>{stats.completionChange >= 0 ? '+' : ''}{stats.completionChange}% өмнөхөөс</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-red-100 mb-2">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">Хугацаа хэтэрсэн</span>
                </div>
                <div className="text-4xl font-bold mb-2">{stats.overdueTasks}</div>
                <div className="flex items-center gap-1 text-sm">
                  {stats.overdueChange >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span>{stats.overdueChange} энэ сард</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <Card className="mb-8 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-6">7 хоногийн гүйцэтгэл</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 5 }}
                activeDot={{ r: 7 }}
                name="Гүйцэтгэл %"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card className="p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Категориор</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name} ${entry.value}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Хэлтсээр</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={departmentData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" stroke="#64748b" />
                <YAxis dataKey="name" type="category" stroke="#64748b" width={100} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="count" name="Ажлын тоо">
                  {departmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card className="p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Идэвхитэй хэрэглэгчид</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-2 text-sm font-semibold text-slate-700">Нэр</th>
                    <th className="text-left py-3 px-2 text-sm font-semibold text-slate-700">Хэлтэс</th>
                    <th className="text-left py-3 px-2 text-sm font-semibold text-slate-700">Дууссан</th>
                    <th className="text-left py-3 px-2 text-sm font-semibold text-slate-700">Үнэлгээ</th>
                  </tr>
                </thead>
                <tbody>
                  {topPerformers.map((performer) => {
                    const completionPercent = Math.round((performer.completed / performer.total) * 100);
                    return (
                      <tr key={performer.userId} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                              {performer.name.charAt(0)}
                            </div>
                            <span className="font-medium text-slate-900">{performer.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <Badge className="bg-blue-100 text-blue-700">{performer.department}</Badge>
                        </td>
                        <td className="py-3 px-2">
                          <div>
                            <div className="text-sm font-medium text-slate-900 mb-1">
                              {performer.completed}/{performer.total} ({completionPercent}%)
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2">
                              <div
                                className="bg-green-500 h-2 rounded-full transition-all"
                                style={{ width: `${completionPercent}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-0.5">
                            {renderStars(performer.rating)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Сүүлийн үйлдлүүд</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors">
                  <span className="text-2xl flex-shrink-0">{getActivityIcon(activity.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900 font-medium">
                      {activity.userName} {activity.action}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {getRelativeTime(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <UserPlus className="w-10 h-10 text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Шинэ хэрэглэгч нэмэх</h3>
            <p className="text-sm text-slate-600">Системд шинэ хэрэглэгч бүртгэх</p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <FileText className="w-10 h-10 text-purple-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Төсөл үүсгэх</h3>
            <p className="text-sm text-slate-600">Шинэ төсөл санал үүсгэх</p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <Download className="w-10 h-10 text-green-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Тайлан үүсгэх</h3>
            <p className="text-sm text-slate-600">Статистик тайлан татаж авах</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
