// Task Storage - Simple localStorage version

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
  isRecurring?: boolean;
  recurrencePattern?: string;
  recurrenceEndDate?: string;
  parentTaskId?: string;
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
    id: task.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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