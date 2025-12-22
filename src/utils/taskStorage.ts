// Task Storage with Backend API Integration

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

// Get all tasks for current user
export const getTasks = async (): Promise<TaskFormData[]> => {
  const userId = getUserId();
  
  if (!userId) {
    console.error('User not logged in');
    return [];
  }

  try {
    const response = await fetch(`${API_URL}/tasks/${userId}`);
    const data = await response.json();

    if (data.success && data.tasks) {
      // Convert database format to frontend format
      return data.tasks.map((task: any) => ({
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
    }

    return [];
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
};

// Add new task
export const addTask = async (task: TaskFormData): Promise<boolean> => {
  const userId = getUserId();
  
  if (!userId) {
    console.error('User not logged in');
    return false;
  }

  const taskId = task.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const response = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: taskId,
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

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error adding task:', error);
    return false;
  }
};

// Update existing task
export const updateTask = async (taskId: string, updates: Partial<TaskFormData>): Promise<boolean> => {
  const userId = getUserId();
  
  if (!userId) {
    console.error('User not logged in');
    return false;
  }

  try {
    // First get the current task
    const tasks = await getTasks();
    const currentTask = tasks.find(t => t.id === taskId);
    
    if (!currentTask) {
      console.error('Task not found');
      return false;
    }

    // Merge updates with current task
    const updatedTask = { ...currentTask, ...updates };

    const response = await fetch(`${API_URL}/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: updatedTask.title,
        description: updatedTask.description,
        dueDate: updatedTask.dueDate,
        status: updatedTask.status,
        priority: updatedTask.priority,
        category: updatedTask.category,
        completed: updatedTask.completed,
        fileName: updatedTask.fileName,
        isRecurring: updatedTask.isRecurring,
        recurrencePattern: updatedTask.recurrencePattern,
        recurrenceEndDate: updatedTask.recurrenceEndDate,
        parentTaskId: updatedTask.parentTaskId
      })
    });

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error updating task:', error);
    return false;
  }
};

// Delete task
export const deleteTask = async (taskId: string): Promise<boolean> => {
  const userId = getUserId();
  
  if (!userId) {
    console.error('User not logged in');
    return false;
  }

  try {
    const response = await fetch(`${API_URL}/tasks/${taskId}`, {
      method: 'DELETE'
    });

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error deleting task:', error);
    return false;
  }
};

// Legacy localStorage functions (for backward compatibility during migration)
// These will be removed once all users have migrated to database

export const migrateLocalStorageToDatabase = async (): Promise<void> => {
  const userId = getUserId();
  
  if (!userId) return;

  try {
    const localTasks = localStorage.getItem('tasks');
    
    if (!localTasks) return;

    const tasks: TaskFormData[] = JSON.parse(localTasks);

    if (tasks.length === 0) return;

    console.log(`Migrating ${tasks.length} tasks to database...`);

    // Upload all tasks to database
    for (const task of tasks) {
      await addTask(task);
    }

    console.log('Migration complete!');
    
    // Clear localStorage after successful migration
    localStorage.removeItem('tasks');
  } catch (error) {
    console.error('Migration error:', error);
  }
};