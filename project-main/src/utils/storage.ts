import { User, Task, Document } from '../types';

const STORAGE_KEYS = {
  USERS: 'app_users',
  TASKS: 'app_tasks',
  DOCUMENTS: 'app_documents',
} as const;

function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading from localStorage (${key}):`, error);
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving to localStorage (${key}):`, error);
  }
}

export function initializeStorage(): void {
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    saveUsers([]);
  }
  if (!localStorage.getItem(STORAGE_KEYS.TASKS)) {
    saveTasks([]);
  }
  if (!localStorage.getItem(STORAGE_KEYS.DOCUMENTS)) {
    saveDocuments([]);
  }
}

export function getUsers(): User[] {
  return getFromStorage<User[]>(STORAGE_KEYS.USERS, []);
}

export function saveUsers(users: User[]): void {
  saveToStorage(STORAGE_KEYS.USERS, users);
}

export function getTasks(): Task[] {
  return getFromStorage<Task[]>(STORAGE_KEYS.TASKS, []);
}

export function saveTasks(tasks: Task[]): void {
  saveToStorage(STORAGE_KEYS.TASKS, tasks);
}

export function getDocuments(): Document[] {
  return getFromStorage<Document[]>(STORAGE_KEYS.DOCUMENTS, []);
}

export function saveDocuments(documents: Document[]): void {
  saveToStorage(STORAGE_KEYS.DOCUMENTS, documents);
}

export function addTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Task {
  const tasks = getTasks();
  const newTask: Task = {
    ...task,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  tasks.push(newTask);
  saveTasks(tasks);
  return newTask;
}

export function updateTask(id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>): Task | null {
  const tasks = getTasks();
  const index = tasks.findIndex(task => task.id === id);
  if (index === -1) return null;

  tasks[index] = {
    ...tasks[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  saveTasks(tasks);
  return tasks[index];
}

export function deleteTask(id: string): boolean {
  const tasks = getTasks();
  const filteredTasks = tasks.filter(task => task.id !== id);
  if (filteredTasks.length === tasks.length) return false;
  saveTasks(filteredTasks);
  return true;
}

export function addDocument(document: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>): Document {
  const documents = getDocuments();
  const newDocument: Document = {
    ...document,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  documents.push(newDocument);
  saveDocuments(documents);
  return newDocument;
}

export function updateDocument(id: string, updates: Partial<Omit<Document, 'id' | 'createdAt'>>): Document | null {
  const documents = getDocuments();
  const index = documents.findIndex(doc => doc.id === id);
  if (index === -1) return null;

  documents[index] = {
    ...documents[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  saveDocuments(documents);
  return documents[index];
}

export function deleteDocument(id: string): boolean {
  const documents = getDocuments();
  const filteredDocuments = documents.filter(doc => doc.id !== id);
  if (filteredDocuments.length === documents.length) return false;
  saveDocuments(filteredDocuments);
  return true;
}

export function clearAllData(): void {
  localStorage.removeItem(STORAGE_KEYS.USERS);
  localStorage.removeItem(STORAGE_KEYS.TASKS);
  localStorage.removeItem(STORAGE_KEYS.DOCUMENTS);
  initializeStorage();
}
