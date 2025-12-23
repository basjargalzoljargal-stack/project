// Task Storage with Recurring Tasks Support

export type RecurrenceType = 'Нэг удаагийн' | '7 хоног бүр' | 'Сар бүр' | 'Улирал бүр' | 'Жил бүр';

export interface TaskFormData {
  id?: string;
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

export const getTasks = (): TaskFormData[] => {
  const tasksJson = localStorage.getItem('tasks');
  if (!tasksJson) return [];
  
  try {
    return JSON.parse(tasksJson);
  } catch (error) {
    console.error('Error parsing tasks:', error);
    return [];
  }
};

export const addTask = (task: TaskFormData): void => {
  const tasks = getTasks();
  const newTask = {
    ...task,
    id: task.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    isRecurring: task.recurrenceType !== 'Нэг удаагийн',
    parentTaskId: task.parentTaskId || undefined
  };
  
  tasks.push(newTask);
  localStorage.setItem('tasks', JSON.stringify(tasks));
};

export const updateTask = (taskId: string, updates: Partial<TaskFormData>): void => {
  const tasks = getTasks();
  const index = tasks.findIndex(t => t.id === taskId);
  
  if (index !== -1) {
    tasks[index] = { ...tasks[index], ...updates };
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }
};

export const deleteTask = (taskId: string): void => {
  const tasks = getTasks();
  const filtered = tasks.filter(t => t.id !== taskId);
  localStorage.setItem('tasks', JSON.stringify(filtered));
};

export const getTasksByDocumentId = (documentId: string): TaskFormData[] => {
  const tasks = getTasks();
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

// Check and create recurring tasks
export const checkAndCreateRecurringTasks = (): void => {
  const tasks = getTasks();
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
    const allTasks = [...tasks, ...newTasks];
    localStorage.setItem('tasks', JSON.stringify(allTasks));
    console.log(`✅ Created ${newTasks.length} recurring tasks`);
  }
};

// Get all child tasks of a recurring task
export const getChildTasks = (parentTaskId: string): TaskFormData[] => {
  const tasks = getTasks();
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