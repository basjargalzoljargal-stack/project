// Task Storage with userId filtering - SIMPLIFIED VERSION

export type RecurrenceType = 'Нэг удаагийн' | '7 хоног бүр' | 'Сар бүр' | 'Улирал бүр' | 'Жил бүр';

export interface TaskFormData {
  id?: string;
  userId?: string;
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

// ✅ SIMPLIFIED: Get current user ID directly from localStorage
const getCurrentUserId = (): string | null => {
  try {
    // Try to get from userId first
    const userId = localStorage.getItem('userId');
    if (userId) return userId;
    
    // Fallback to user object
    const userJson = localStorage.getItem('user');
    if (userJson) {
      const user = JSON.parse(userJson);
      return user.id?.toString() || null;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
};

// Get ALL tasks from storage (no filtering)
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

// ✅ Get tasks for current user only
export const getTasks = (): TaskFormData[] => {
  try {
    const allTasks = getAllTasks();
    const currentUserId = getCurrentUserId();
    
    if (!currentUserId) {
      console.warn('No user logged in - returning empty tasks');
      return [];
    }
    
    // Filter tasks by userId
    const userTasks = allTasks.filter(task => {
      // If task has no userId, it's old data - assign to current user
      if (!task.userId) {
        return true; // Show old tasks to logged-in user
      }
      return task.userId === currentUserId;
    });
    
    return userTasks;
  } catch (error) {
    console.error('Error getting tasks:', error);
    return [];
  }
};

// ✅ Add task with userId
export const addTask = (task: TaskFormData): TaskFormData => {
  try {
    const allTasks = getAllTasks();
    const currentUserId = getCurrentUserId();
    
    if (!currentUserId) {
      throw new Error('No user logged in');
    }
    
    const newTask = {
      ...task,
      id: task.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: currentUserId,
      isRecurring: task.recurrenceType !== 'Нэг удаагийн',
      parentTaskId: task.parentTaskId || undefined
    };
    
    allTasks.push(newTask);
    localStorage.setItem('tasks', JSON.stringify(allTasks));
    
    return newTask;
  } catch (error) {
    console.error('Error adding task:', error);
    throw error;
  }
};

// ✅ Update task (with userId check)
export const updateTask = (taskId: string, updates: Partial<TaskFormData>): void => {
  try {
    const allTasks = getAllTasks();
    const currentUserId = getCurrentUserId();
    
    if (!currentUserId) {
      throw new Error('No user logged in');
    }
    
    const index = allTasks.findIndex(t => {
      if (t.id !== taskId) return false;
      // Allow updating tasks with no userId (old data)
      if (!t.userId) return true;
      return t.userId === currentUserId;
    });
    
    if (index !== -1) {
      allTasks[index] = { ...allTasks[index], ...updates };
      localStorage.setItem('tasks', JSON.stringify(allTasks));
    }
  } catch (error) {
    console.error('Error updating task:', error);
    throw error;
  }
};

// ✅ Delete task (with userId check)
export const deleteTask = (taskId: string): void => {
  try {
    const allTasks = getAllTasks();
    const currentUserId = getCurrentUserId();
    
    if (!currentUserId) {
      throw new Error('No user logged in');
    }
    
    const filtered = allTasks.filter(t => {
      if (t.id !== taskId) return true;
      // Allow deleting tasks with no userId (old data)
      if (!t.userId) return false;
      return t.userId !== currentUserId;
    });
    
    localStorage.setItem('tasks', JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
};

// Get tasks by document ID (already filtered by getTasks)
export const getTasksByDocumentId = (documentId: string): TaskFormData[] => {
  const tasks = getTasks();
  return tasks.filter(task => task.document_id === documentId);
};

// Calculate next due date
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
  }
  
  return nextDate;
}

// Check and create recurring tasks
export const checkAndCreateRecurringTasks = (): void => {
  try {
    const tasks = getTasks();
    const currentUserId = getCurrentUserId();
    
    if (!currentUserId) {
      console.warn('No user logged in');
      return;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const newTasks: TaskFormData[] = [];
    
    tasks.forEach(task => {
      if (!task.isRecurring || task.parentTaskId || task.recurrenceType === 'Нэг удаагийн') {
        return;
      }
      
      const taskDueDate = new Date(task.dueDate);
      taskDueDate.setHours(0, 0, 0, 0);
      
      if (taskDueDate >= today) {
        return;
      }
      
      let nextDueDate = new Date(taskDueDate);
      
      while (nextDueDate < today) {
        nextDueDate = calculateNextDueDate(nextDueDate, task.recurrenceType!);
      }
      
      const existingTask = tasks.find(t => {
        if (t.parentTaskId !== task.id) return false;
        const tDate = new Date(t.dueDate);
        tDate.setHours(0, 0, 0, 0);
        return tDate.getTime() === nextDueDate.getTime();
      });
      
      if (!existingTask) {
        const newTask: TaskFormData = {
          ...task,
          id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: currentUserId,
          dueDate: nextDueDate.toISOString(),
          parentTaskId: task.id,
          completed: false,
          status: 'Төлөвлөсөн',
          createdAt: new Date().toISOString()
        };
        
        newTasks.push(newTask);
      }
    });
    
    if (newTasks.length > 0) {
      const allTasks = getAllTasks();
      const updatedTasks = [...allTasks, ...newTasks];
      localStorage.setItem('tasks', JSON.stringify(updatedTasks));
      console.log(`✅ Created ${newTasks.length} recurring tasks`);
    }
  } catch (error) {
    console.error('Error creating recurring tasks:', error);
  }
};

// Get child tasks
export const getChildTasks = (parentTaskId: string): TaskFormData[] => {
  const tasks = getTasks();
  return tasks.filter(task => task.parentTaskId === parentTaskId);
};

// Check if should generate recurring task
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