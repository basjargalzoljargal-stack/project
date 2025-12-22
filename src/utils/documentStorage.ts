// Document Storage - matches DocumentModal interface

import { DocumentFormData } from '../components/DocumentModal';

const STORAGE_KEY = 'documents';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function saveToStorage(documents: DocumentFormData[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
}

function loadFromStorage(): DocumentFormData[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error loading documents from localStorage:', error);
    return [];
  }
}

export function getDocuments(): DocumentFormData[] {
  return loadFromStorage();
}

export function addDocument(document: Omit<DocumentFormData, 'id'>): DocumentFormData {
  const documents = loadFromStorage();
  const newDocument: DocumentFormData = {
    ...document,
    id: generateId()
  };
  documents.push(newDocument);
  saveToStorage(documents);
  return newDocument;
}

export function updateDocument(id: string, updates: Partial<DocumentFormData>): DocumentFormData | null {
  const documents = loadFromStorage();
  const index = documents.findIndex(doc => doc.id === id);

  if (index === -1) {
    console.error('Document not found:', id);
    return null;
  }

  documents[index] = { ...documents[index], ...updates };
  saveToStorage(documents);
  return documents[index];
}

export function deleteDocument(id: string): boolean {
  const documents = loadFromStorage();
  const filteredDocuments = documents.filter(doc => doc.id !== id);

  if (filteredDocuments.length === documents.length) {
    console.error('Document not found:', id);
    return false;
  }

  saveToStorage(filteredDocuments);
  return true;
}