import { TaskFormData } from '../components/TaskModal';
import { generateRecurringTasks, shouldRegenerateRecurringTasks } from './recurringTasks';

const STORAGE_KEY = 'tasks';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function saveToStorage(tasks: TaskFormData[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function loadFromStorage(): TaskFormData[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error loading tasks from localStorage:', error);
    return [];
  }
}

export function getTasks(): TaskFormData[] {
  const tasks = loadFromStorage();
  ensureRecurringTasksGenerated(tasks);
  return loadFromStorage();
}

function ensureRecurringTasksGenerated(tasks: TaskFormData[]): void {
  const recurringTasks = tasks.filter(t => t.isRecurring && t.id);
  let tasksToAdd: TaskFormData[] = [];
  let needsUpdate = false;

  for (const recurringTask of recurringTasks) {
    if (shouldRegenerateRecurringTasks(tasks, recurringTask)) {
      const existingGeneratedIds = new Set(
        tasks.filter(t => t.parentTaskId === recurringTask.id).map(t => t.id)
      );

      const newTasks = generateRecurringTasks(recurringTask);
      const uniqueNewTasks = newTasks.filter(t => !existingGeneratedIds.has(t.id));

      if (uniqueNewTasks.length > 0) {
        tasksToAdd.push(...uniqueNewTasks);
        needsUpdate = true;
      }
    }
  }

  if (needsUpdate && tasksToAdd.length > 0) {
    const allTasks = [...tasks, ...tasksToAdd];
    saveToStorage(allTasks);
  }
}

export function getTasksByDocumentId(documentId: string): TaskFormData[] {
  const allTasks = loadFromStorage();
  return allTasks.filter(task => task.document_id === documentId);
}

export function addTask(task: Omit<TaskFormData, 'id'>): TaskFormData {
  const tasks = loadFromStorage();
  const newTask: TaskFormData = {
    ...task,
    id: generateId(),
    isRecurring: task.recurrenceType ? task.recurrenceType !== 'Нэг удаагийн' : false
  };
  tasks.push(newTask);

  if (newTask.isRecurring && newTask.recurrenceType && newTask.recurrenceType !== 'Нэг удаагийн') {
    const recurringTasks = generateRecurringTasks(newTask);
    tasks.push(...recurringTasks);
  }

  saveToStorage(tasks);
  return newTask;
}

export function updateTask(id: string, updates: Partial<TaskFormData>): TaskFormData | null {
  const tasks = loadFromStorage();
  const index = tasks.findIndex(task => task.id === id);

  if (index === -1) {
    console.error('Task not found:', id);
    return null;
  }

  const originalTask = tasks[index];
  const wasRecurring = originalTask.isRecurring;
  const updatedTask = { ...originalTask, ...updates };

  if (updates.recurrenceType) {
    updatedTask.isRecurring = updates.recurrenceType !== 'Нэг удаагийн';
  }

  tasks[index] = updatedTask;

  if (wasRecurring && updatedTask.isRecurring &&
      (updates.recurrenceType || updates.dueDate)) {
    const filteredTasks = tasks.filter(t => t.parentTaskId !== id);
    const newRecurringTasks = generateRecurringTasks(updatedTask);
    const finalTasks = [...filteredTasks, ...newRecurringTasks];
    saveToStorage(finalTasks);
  } else if (wasRecurring && !updatedTask.isRecurring) {
    const filteredTasks = tasks.filter(t => t.parentTaskId !== id);
    saveToStorage(filteredTasks);
  } else if (!wasRecurring && updatedTask.isRecurring) {
    const newRecurringTasks = generateRecurringTasks(updatedTask);
    const finalTasks = [...tasks, ...newRecurringTasks];
    saveToStorage(finalTasks);
  } else {
    saveToStorage(tasks);
  }

  return updatedTask;
}

export function deleteTask(id: string): boolean {
  const tasks = loadFromStorage();
  const taskToDelete = tasks.find(task => task.id === id);

  if (!taskToDelete) {
    console.error('Task not found:', id);
    return false;
  }

  let filteredTasks = tasks.filter(task => task.id !== id);

  if (taskToDelete.isRecurring) {
    filteredTasks = filteredTasks.filter(task => task.parentTaskId !== id);
  }

  saveToStorage(filteredTasks);
  return true;
}
