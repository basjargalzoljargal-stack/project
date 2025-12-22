// Task Storage - Hybrid: localStorage + Database Migration

const API_URL = "https://my-website-backend-3yoe.onrender.com";

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

// Get userId from localStorage
const getUserId = (): string | null => {
  return localStorage.getItem('userId');
};

// Sync functions for backward compatibility
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
  
  // Background sync to database
  syncTaskToDatabase(newTask, 'create');
};

export const updateTask = (taskId: string, updates: Partial<TaskFormData>): void => {
  const tasks = getTasks();
  const index = tasks.findIndex(t => t.id === taskId);
  
  if (index !== -1) {
    tasks[index] = { ...tasks[index], ...updates };
    localStorage.setItem('tasks', JSON.stringify(tasks));
    
    // Background sync to database
    syncTaskToDatabase(tasks[index], 'update');
  }
};

export const deleteTask = (taskId: string): void => {
  const tasks = getTasks();
  const filtered = tasks.filter(t => t.id !== taskId);
  localStorage.setItem('tasks', JSON.stringify(filtered));
  
  // Background sync to database
  syncTaskToDatabase({ id: taskId } as TaskFormData, 'delete');
};

// Background sync to database (non-blocking)
const syncTaskToDatabase = async (task: TaskFormData, action: 'create' | 'update' | 'delete') => {
  const userId = getUserId();
  
  if (!userId) {
    console.log('User not logged in, skipping database sync');
    return;
  }

  try {
    if (action === 'create') {
      await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: task.id,
          userId: parseInt(userId),
          title: task.title,
          description: task.description,
          dueDate: task.dueDate,
          status: task.status,
          priority: task.priority,
          category: task.category,
          completed: task.completed,
          fileName: task.fileName,
          isRecurring: task.isRecurring,
          recurrencePattern: task.recurrencePattern,
          recurrenceEndDate: task.recurrenceEndDate,
          parentTaskId: task.parentTaskId
        })
      });
    } else if (action === 'update') {
      await fetch(`${API_URL}/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          dueDate: task.dueDate,
          status: task.status,
          priority: task.priority,
          category: task.category,
          completed: task.completed,
          fileName: task.fileName,
          isRecurring: task.isRecurring,
          recurrencePattern: task.recurrencePattern,
          recurrenceEndDate: task.recurrenceEndDate,
          parentTaskId: task.parentTaskId
        })
      });
    } else if (action === 'delete') {
      await fetch(`${API_URL}/tasks/${task.id}`, {
        method: 'DELETE'
      });
    }
    
    console.log(`✅ Task ${action}d to database:`, task.id);
  } catch (error) {
    console.error(`❌ Database sync failed (${action}):`, error);
  }
};

// Load tasks from database on login
export const loadTasksFromDatabase = async (): Promise<TaskFormData[]> => {
  const userId = getUserId();
  
  if (!userId) {
    console.log('User not logged in');
    return getTasks(); // Return localStorage tasks
  }

  try {
    const response = await fetch(`${API_URL}/tasks/${userId}`);
    const data = await response.json();

    if (data.success && data.tasks) {
      const dbTasks = data.tasks.map((task: any) => ({
        id: task.id,
        title: task.title,
        description: task.description || '',
        dueDate: task.due_date,
        status: task.status,
        priority: task.priority,
        category: task.category || '',
        completed: task.completed,
        fileName: task.file_name,
        isRecurring: task.is_recurring,
        recurrencePattern: task.recurrence_pattern,
        recurrenceEndDate: task.recurrence_end_date,
        parentTaskId: task.parent_task_id
      }));
      
      // Merge with localStorage
      const localTasks = getTasks();
      const merged = mergeTasks(localTasks, dbTasks);
      
      // Save merged to localStorage
      localStorage.setItem('tasks', JSON.stringify(merged));
      
      return merged;
    }

    return getTasks();
  } catch (error) {
    console.error('Error loading from database:', error);
    return getTasks(); // Fallback to localStorage
  }
};

// Merge localStorage and database tasks (database takes precedence)
const mergeTasks = (localTasks: TaskFormData[], dbTasks: TaskFormData[]): TaskFormData[] => {
  const dbIds = new Set(dbTasks.map(t => t.id));
  const localOnly = localTasks.filter(t => !dbIds.has(t.id));
  
  // Upload local-only tasks to database
  localOnly.forEach(task => {
    syncTaskToDatabase(task, 'create');
  });
  
  return [...dbTasks, ...localOnly];
};

// One-time migration: Upload all localStorage tasks to database
export const migrateToDatabase = async (): Promise<void> => {
  const userId = getUserId();
  
  if (!userId) {
    console.log('User not logged in, cannot migrate');
    return;
  }

  const migrated = localStorage.getItem('tasks_migrated');
  if (migrated === 'true') {
    console.log('Tasks already migrated');
    return;
  }

  const localTasks = getTasks();
  
  if (localTasks.length === 0) {
    localStorage.setItem('tasks_migrated', 'true');
    return;
  }

  console.log(`🔄 Migrating ${localTasks.length} tasks to database...`);

  try {
    for (const task of localTasks) {
      await syncTaskToDatabase(task, 'create');
    }
    
    localStorage.setItem('tasks_migrated', 'true');
    console.log('✅ Migration complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
};