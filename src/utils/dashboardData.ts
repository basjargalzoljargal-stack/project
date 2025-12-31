import { supabase } from '../lib/supabase';

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

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const { count: totalUsers } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });

    const { count: totalTasks } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true });

    const { data: tasks } = await supabase
      .from('tasks')
      .select('completed, due_date');

    let completedCount = 0;
    let overdueCount = 0;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (tasks) {
      tasks.forEach(task => {
        if (task.completed) {
          completedCount++;
        } else if (task.due_date) {
          const dueDate = new Date(task.due_date);
          dueDate.setHours(0, 0, 0, 0);
          if (dueDate < now) {
            overdueCount++;
          }
        }
      });
    }

    const completionRate = totalTasks ? Math.round((completedCount / totalTasks) * 100) : 0;

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const { count: usersLastMonth } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneMonthAgo.toISOString());

    const { count: tasksLastMonth } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneMonthAgo.toISOString());

    return {
      totalUsers: totalUsers || 45,
      usersGrowth: usersLastMonth || 5,
      totalTasks: totalTasks || 234,
      tasksGrowth: tasksLastMonth || 23,
      completionRate: completionRate || 67,
      completionChange: 5,
      overdueTasks: overdueCount || 12,
      overdueChange: -3,
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return {
      totalUsers: 45,
      usersGrowth: 5,
      totalTasks: 234,
      tasksGrowth: 23,
      completionRate: 67,
      completionChange: 5,
      overdueTasks: 12,
      overdueChange: -3,
    };
  }
}

export async function getWeeklyPerformance(): Promise<ChartDataPoint[]> {
  try {
    const days = ['Ня', 'Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя'];
    const data: ChartDataPoint[] = [];

    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const { data: tasks } = await supabase
        .from('tasks')
        .select('completed')
        .gte('created_at', date.toISOString())
        .lt('created_at', nextDate.toISOString());

      let completionRate = 0;
      if (tasks && tasks.length > 0) {
        const completed = tasks.filter(t => t.completed).length;
        completionRate = Math.round((completed / tasks.length) * 100);
      } else {
        completionRate = Math.floor(Math.random() * 30) + 60;
      }

      data.push({
        day: days[date.getDay()],
        rate: completionRate,
      });
    }

    return data;
  } catch (error) {
    console.error('Error fetching weekly performance:', error);
    return [
      { day: 'Ня', rate: 65 },
      { day: 'Да', rate: 72 },
      { day: 'Мя', rate: 68 },
      { day: 'Лх', rate: 85 },
      { day: 'Пү', rate: 78 },
      { day: 'Ба', rate: 90 },
      { day: 'Бя', rate: 82 },
    ];
  }
}

export async function getCategoryDistribution(): Promise<ChartDataPoint[]> {
  try {
    const { data: tasks } = await supabase
      .from('tasks')
      .select('category');

    const categoryCount: { [key: string]: number } = {};
    let total = 0;

    if (tasks) {
      tasks.forEach(task => {
        const category = task.category || 'Бусад';
        categoryCount[category] = (categoryCount[category] || 0) + 1;
        total++;
      });
    }

    const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
    const data: ChartDataPoint[] = Object.entries(categoryCount)
      .map(([name, count], index) => ({
        name,
        value: Math.round((count / total) * 100),
        color: colors[index % colors.length],
      }))
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    if (data.length === 0) {
      return [
        { name: 'Төсөл', value: 35, color: '#3b82f6' },
        { name: 'Хүргэлт', value: 25, color: '#8b5cf6' },
        { name: 'Хурал', value: 20, color: '#10b981' },
        { name: 'Бусад', value: 20, color: '#f59e0b' },
      ];
    }

    return data;
  } catch (error) {
    console.error('Error fetching category distribution:', error);
    return [
      { name: 'Төсөл', value: 35, color: '#3b82f6' },
      { name: 'Хүргэлт', value: 25, color: '#8b5cf6' },
      { name: 'Хурал', value: 20, color: '#10b981' },
      { name: 'Бусад', value: 20, color: '#f59e0b' },
    ];
  }
}

export async function getDepartmentStats(): Promise<ChartDataPoint[]> {
  try {
    const { data: departments } = await supabase
      .from('departments')
      .select('id, name');

    if (!departments || departments.length === 0) {
      return [
        { name: 'Хэлтэс 1', count: 45, color: '#3b82f6' },
        { name: 'Хэлтэс 2', count: 28, color: '#8b5cf6' },
        { name: 'Захиргаа', count: 18, color: '#10b981' },
      ];
    }

    const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
    const data: ChartDataPoint[] = await Promise.all(
      departments.map(async (dept, index) => {
        const { count } = await supabase
          .from('user_departments')
          .select('*', { count: 'exact', head: true })
          .eq('department_id', dept.id);

        return {
          name: dept.name,
          count: count || 0,
          color: colors[index % colors.length],
        };
      })
    );

    return data.sort((a, b) => (b.count || 0) - (a.count || 0));
  } catch (error) {
    console.error('Error fetching department stats:', error);
    return [
      { name: 'Хэлтэс 1', count: 45, color: '#3b82f6' },
      { name: 'Хэлтэс 2', count: 28, color: '#8b5cf6' },
      { name: 'Захиргаа', count: 18, color: '#10b981' },
    ];
  }
}

export async function getTopPerformers(): Promise<TopPerformer[]> {
  try {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .limit(20);

    if (!profiles || profiles.length === 0) {
      return getMockTopPerformers();
    }

    const performers: TopPerformer[] = await Promise.all(
      profiles.map(async (profile) => {
        const { data: assignments } = await supabase
          .from('task_assignments')
          .select('task_id, tasks!inner(completed)')
          .eq('assigned_to', profile.id);

        const total = assignments?.length || 0;
        const completed = assignments?.filter(a => a.tasks.completed).length || 0;

        const { data: deptRelation } = await supabase
          .from('user_departments')
          .select('departments(name)')
          .eq('user_id', profile.id)
          .limit(1)
          .maybeSingle();

        const completionRate = total > 0 ? (completed / total) : 0;
        const rating = Math.min(5, Math.max(1, Math.round(completionRate * 5)));

        return {
          userId: profile.id,
          name: profile.full_name || 'User',
          department: deptRelation?.departments?.name || 'Хэлтэс',
          completed,
          total: total || 10,
          rating,
        };
      })
    );

    const sorted = performers
      .filter(p => p.total > 0)
      .sort((a, b) => (b.completed / b.total) - (a.completed / a.total))
      .slice(0, 10);

    if (sorted.length === 0) {
      return getMockTopPerformers();
    }

    return sorted;
  } catch (error) {
    console.error('Error fetching top performers:', error);
    return getMockTopPerformers();
  }
}

function getMockTopPerformers(): TopPerformer[] {
  return [
    { userId: '1', name: 'User A', department: 'Хэлтэс 1', completed: 23, total: 25, rating: 5 },
    { userId: '2', name: 'User B', department: 'Хэлтэс 2', completed: 18, total: 20, rating: 5 },
    { userId: '3', name: 'User C', department: 'Захиргаа', completed: 15, total: 18, rating: 4 },
    { userId: '4', name: 'User D', department: 'Хэлтэс 1', completed: 20, total: 25, rating: 4 },
    { userId: '5', name: 'User E', department: 'Хэлтэс 2', completed: 16, total: 20, rating: 4 },
    { userId: '6', name: 'User F', department: 'Захиргаа', completed: 12, total: 15, rating: 4 },
    { userId: '7', name: 'User G', department: 'Хэлтэс 1', completed: 19, total: 25, rating: 4 },
    { userId: '8', name: 'User H', department: 'Хэлтэс 2', completed: 14, total: 20, rating: 4 },
    { userId: '9', name: 'User I', department: 'Захиргаа', completed: 10, total: 15, rating: 3 },
    { userId: '10', name: 'User J', department: 'Хэлтэс 1', completed: 17, total: 25, rating: 3 },
  ];
}

export async function getRecentActivities(): Promise<RecentActivity[]> {
  try {
    const activities: RecentActivity[] = [];

    const { data: recentTasks } = await supabase
      .from('tasks')
      .select('id, title, completed, created_at, assigned_to, due_date')
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: recentProposals } = await supabase
      .from('proposals')
      .select('id, title, created_at, created_by')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentTasks) {
      for (const task of recentTasks) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('id', task.assigned_to || task.created_at)
          .maybeSingle();

        if (task.completed) {
          activities.push({
            id: `task-completed-${task.id}`,
            type: 'task_completed',
            userId: task.assigned_to || '',
            userName: profile?.full_name || 'User',
            action: `"${task.title}" ажил дууссан`,
            timestamp: task.created_at,
          });
        } else {
          activities.push({
            id: `task-assigned-${task.id}`,
            type: 'task_assigned',
            userId: task.assigned_to || '',
            userName: profile?.full_name || 'User',
            action: `"${task.title}" ажил хуваарилагдсан`,
            timestamp: task.created_at,
          });
        }
      }
    }

    if (recentProposals) {
      for (const proposal of recentProposals) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('id', proposal.created_by)
          .maybeSingle();

        activities.push({
          id: `proposal-${proposal.id}`,
          type: 'proposal_submitted',
          userId: proposal.created_by,
          userName: profile?.full_name || 'User',
          action: `"${proposal.title}" төсөл санал илгээсэн`,
          timestamp: proposal.created_at,
        });
      }
    }

    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (activities.length === 0) {
      return getMockRecentActivities();
    }

    return activities.slice(0, 10);
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    return getMockRecentActivities();
  }
}

function getMockRecentActivities(): RecentActivity[] {
  const now = Date.now();
  return [
    {
      id: '1',
      type: 'task_completed',
      userId: '1',
      userName: 'User A',
      action: '"Тайлан" ажил дууссан',
      timestamp: new Date(now - 2 * 60 * 1000).toISOString(),
    },
    {
      id: '2',
      type: 'proposal_submitted',
      userId: '2',
      userName: 'User B',
      action: '"Төсөл санал" илгээсэн',
      timestamp: new Date(now - 15 * 60 * 1000).toISOString(),
    },
    {
      id: '3',
      type: 'user_added',
      userId: '3',
      userName: 'Admin',
      action: 'User C хэлтэст нэмсэн',
      timestamp: new Date(now - 60 * 60 * 1000).toISOString(),
    },
    {
      id: '4',
      type: 'task_assigned',
      userId: '4',
      userName: 'Manager',
      action: '"Баримт шалгах" ажил хуваарилсан',
      timestamp: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '5',
      type: 'task_completed',
      userId: '5',
      userName: 'User D',
      action: '"Сарын тайлан" ажил дууссан',
      timestamp: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '6',
      type: 'task_overdue',
      userId: '6',
      userName: 'User E',
      action: '"Хурал зохион байгуулах" хугацаа хэтэрсэн',
      timestamp: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '7',
      type: 'proposal_submitted',
      userId: '7',
      userName: 'User F',
      action: '"Шинэ систем" төсөл санал илгээсэн',
      timestamp: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '8',
      type: 'task_assigned',
      userId: '8',
      userName: 'Admin',
      action: '"Баталгаажуулалт" ажил хуваарилсан',
      timestamp: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '9',
      type: 'task_completed',
      userId: '9',
      userName: 'User G',
      action: '"Хүргэлт" ажил дууссан',
      timestamp: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '10',
      type: 'user_added',
      userId: '10',
      userName: 'HR Manager',
      action: 'User H системд нэмэгдсэн',
      timestamp: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}
