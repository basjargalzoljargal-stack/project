// Task Storage with Recurring Tasks Support + User Filtering

export type RecurrenceType = 'Нэг удаагийн' | '7 хоног бүр' | 'Сар бүр' | 'Улирал бүр' | 'Жил бүр';

export interface TaskFormData {
  id?: string;
  userId?: string; // ✅ НЭМСЭН: User ID
  title: string;
  description: string;
  dueDate: string;
  status: string;
  priority: string;
  category: string;
  completed: boolean;
  fileName?: string;
  recurrenceType?: RecurrenceType;
  isRecurring?: boolean;
  parentTaskId?: string;
  recurrenceData?: {
    dayOfWeek?: number;
    dayOfMonth?: number;
    month?: number;
  };
  document_id?: string;
  createdAt?: string;
}

// ✅ ШИНЭ: Get current user ID from localStorage
const getCurrentUserId = (): string | null => {
  const userJson = localStorage.getItem('user');
  if (!userJson) return null;
  
  try {
    const user = JSON.parse(userJson);
    return user.id?.toString() || null;
  } catch (error) {
    console.error('Error parsing user:', error);
    return null;
  }
};

// ✅ ЗАСВАРЛАСАН: Get tasks for current user only
export const getTasks = (): TaskFormData[] => {
  const tasksJson = localStorage.getItem('tasks');
  if (!tasksJson) return [];
  
  try {
    const allTasks = JSON.parse(tasksJson);
    const currentUserId = getCurrentUserId();
    
    if (!currentUserId) {
      console.warn('No user logged in');
      return [];
    }
    
    // ✅ Filter tasks by userId
    return allTasks.filter((task: TaskFormData) => task.userId === currentUserId);
  } catch (error) {
    console.error('Error parsing tasks:', error);
    return [];
  }
};

// ✅ ШИНЭ: Get ALL tasks (for internal use only)
const getAllTasks = (): TaskFormData[] => {
  const tasksJson = localStorage.getItem('tasks');
  if (!tasksJson) return [];
  
  try {
    return JSON.parse(tasksJson);
  } catch (error) {
    console.error('Error parsing tasks:', error);
    return [];
  }
};

// ✅ ЗАСВАРЛАСАН: Add task with userId
export const addTask = (task: TaskFormData): TaskFormData => {
  const allTasks = getAllTasks();
  const currentUserId = getCurrentUserId();
  
  if (!currentUserId) {
    throw new Error('No user logged in');
  }
  
  const newTask = {
    ...task,
    id: task.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId: currentUserId, // ✅ Add userId
    isRecurring: task.recurrenceType !== 'Нэг удаагийн',
    parentTaskId: task.parentTaskId || undefined
  };
  
  allTasks.push(newTask);
  localStorage.setItem('tasks', JSON.stringify(allTasks));
  
  return newTask;
};

// ✅ ЗАСВАРЛАСАН: Update task (check userId)
export const updateTask = (taskId: string, updates: Partial<TaskFormData>): void => {
  const allTasks = getAllTasks();
  const currentUserId = getCurrentUserId();
  
  if (!currentUserId) {
    throw new Error('No user logged in');
  }
  
  const index = allTasks.findIndex(t => t.id === taskId && t.userId === currentUserId);
  
  if (index !== -1) {
    allTasks[index] = { ...allTasks[index], ...updates };
    localStorage.setItem('tasks', JSON.stringify(allTasks));
  }
};

// ✅ ЗАСВАРЛАСАН: Delete task (check userId)
export const deleteTask = (taskId: string): void => {
  const allTasks = getAllTasks();
  const currentUserId = getCurrentUserId();
  
  if (!currentUserId) {
    throw new Error('No user logged in');
  }
  
  const filtered = allTasks.filter(t => !(t.id === taskId && t.userId === currentUserId));
  localStorage.setItem('tasks', JSON.stringify(filtered));
};

// ✅ ЗАСВАРЛАСАН: Get tasks by document ID (filter by userId)
export const getTasksByDocumentId = (documentId: string): TaskFormData[] => {
  const tasks = getTasks(); // Already filtered by userId
  return tasks.filter(task => task.document_id === documentId);
};

// Calculate next due date based on recurrence type
function calculateNextDueDate(currentDate: Date, recurrenceType: RecurrenceType): Date {
  const nextDate = new Date(currentDate);
  
  switch (recurrenceType) {
    case '7 хоног бүр':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'Сар бүр':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'Улирал бүр':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'Жил бүр':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    default:
      // 'Нэг удаагийн' - no recurrence
      break;
  }
  
  return nextDate;
}

// ✅ ЗАСВАРЛАСАН: Check and create recurring tasks (for current user)
export const checkAndCreateRecurringTasks = (): void => {
  const tasks = getTasks(); // Already filtered by userId
  const currentUserId = getCurrentUserId();
  
  if (!currentUserId) {
    console.warn('No user logged in');
    return;
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const newTasks: TaskFormData[] = [];
  
  tasks.forEach(task => {
    // Only check original recurring tasks (not child tasks)
    if (!task.isRecurring || task.parentTaskId || task.recurrenceType === 'Нэг удаагийн') {
      return;
    }
    
    const taskDueDate = new Date(task.dueDate);
    taskDueDate.setHours(0, 0, 0, 0);
    
    // Check if the task due date has passed
    if (taskDueDate >= today) {
      return; // Task not yet due
    }
    
    // Calculate the next due date
    let nextDueDate = new Date(taskDueDate);
    
    // Keep calculating until we find a future date
    while (nextDueDate < today) {
      nextDueDate = calculateNextDueDate(nextDueDate, task.recurrenceType!);
    }
    
    // Check if a task already exists for this date
    const existingTask = tasks.find(t => {
      if (t.parentTaskId !== task.id) return false;
      const tDate = new Date(t.dueDate);
      tDate.setHours(0, 0, 0, 0);
      return tDate.getTime() === nextDueDate.getTime();
    });
    
    if (!existingTask) {
      // Create new recurring task
      const newTask: TaskFormData = {
        ...task,
        id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: currentUserId, // ✅ Add userId
        dueDate: nextDueDate.toISOString(),
        parentTaskId: task.id,
        completed: false,
        status: 'Төлөвлөсөн',
        createdAt: new Date().toISOString()
      };
      
      newTasks.push(newTask);
    }
  });
  
  // Add all new tasks
  if (newTasks.length > 0) {
    const allTasks = getAllTasks();
    const updatedTasks = [...allTasks, ...newTasks];
    localStorage.setItem('tasks', JSON.stringify(updatedTasks));
    console.log(`✅ Created ${newTasks.length} recurring tasks`);
  }
};

// ✅ ЗАСВАРЛАСАН: Get all child tasks of a recurring task (filter by userId)
export const getChildTasks = (parentTaskId: string): TaskFormData[] => {
  const tasks = getTasks(); // Already filtered by userId
  return tasks.filter(task => task.parentTaskId === parentTaskId);
};

// Check if a recurring task should generate more instances
export const shouldGenerateRecurringTask = (task: TaskFormData): boolean => {
  if (!task.isRecurring || task.recurrenceType === 'Нэг удаагийн') {
    return false;
  }
  
  const taskDueDate = new Date(task.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  taskDueDate.setHours(0, 0, 0, 0);
  
  return taskDueDate < today;
};