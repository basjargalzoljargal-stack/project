import { useState, useEffect } from 'react';
import { Plus, Search, Eye, Edit2, Trash2, AlertCircle, FileText, Download, Calendar, CheckCircle } from 'lucide-react';
import DocumentModal, { DocumentFormData } from './DocumentModal';
import DocumentDetailModal from './DocumentDetailModal';
import DocumentExportMenu from './DocumentExportMenu';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface DocumentsPageProps {
  onCreateTask?: (documentId: string) => void;
  onViewTask?: (taskId: string) => void;
}

export default function DocumentsPage({ onCreateTask, onViewTask }: DocumentsPageProps) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DocumentFormData[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<DocumentFormData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<DocumentFormData | null>(null);
  const [viewingDocument, setViewingDocument] = useState<DocumentFormData | null>(null);
  const [linkedTasks, setLinkedTasks] = useState<{ [documentId: string]: any }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    const filtered = documents.filter(doc =>
      doc.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.document_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.summary.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredDocuments(filtered);
  }, [searchTerm, documents]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('received_date', { ascending: false });

      if (error) throw error;

      if (data) {
        const formattedDocs: DocumentFormData[] = data.map(doc => ({
          id: doc.id,
          sender: doc.sender,
          document_number: doc.document_number,
          received_date: doc.received_date,
          deadline: doc.deadline || undefined,
          category: doc.category,
          status: doc.status,
          summary: doc.summary,
          file_url: doc.file_url || '',
          file_name: doc.file_name || '',
          file_type: doc.file_type || '',
          report_file_url: doc.report_file_url || undefined,
          report_file_name: doc.report_file_name || undefined,
          report_file_type: doc.report_file_type || undefined,
          document_type: doc.document_type || 'хариугүй',
          linked_task_id: doc.linked_task_id || undefined,
        }));
        setDocuments(formattedDocs);

        const taskIds = formattedDocs
          .map(doc => doc.linked_task_id)
          .filter(Boolean);

        if (taskIds.length > 0) {
          const { data: tasks } = await supabase
            .from('tasks')
            .select('id, title, status')
            .in('id', taskIds);

          if (tasks) {
            const taskMap: { [key: string]: any } = {};
            formattedDocs.forEach(doc => {
              if (doc.linked_task_id) {
                const task = tasks.find(t => t.id === doc.linked_task_id);
                if (task && doc.id) {
                  taskMap[doc.id] = task;
                }
              }
            });
            setLinkedTasks(taskMap);
          }
        }
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      alert('Албан бичиг ачаалахад алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDocument = async (formData: DocumentFormData, file?: File, reportFile?: File) => {
    try {
      let file_url = formData.file_url;
      let file_name = formData.file_name;
      let file_type = formData.file_type;

      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `documents/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);

        file_url = publicUrl;
        file_name = file.name;
        file_type = file.type;
      }

      let report_file_url = formData.report_file_url;
      let report_file_name = formData.report_file_name;
      let report_file_type = formData.report_file_type;

      if (reportFile) {
        const fileExt = reportFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `documents/reports/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, reportFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);

        report_file_url = publicUrl;
        report_file_name = reportFile.name;
        report_file_type = reportFile.type;
      }

      const documentData = {
        sender: formData.sender,
        document_number: formData.document_number,
        received_date: formData.received_date,
        deadline: formData.deadline || null,
        category: formData.category,
        status: formData.status,
        summary: formData.summary,
        file_url,
        file_name,
        file_type,
        report_file_url: report_file_url || null,
        report_file_name: report_file_name || null,
        report_file_type: report_file_type || null,
        document_type: formData.document_type || 'хариугүй',
        created_by: user?.id,
      };

      if (formData.id) {
        const { error } = await supabase
          .from('documents')
          .update(documentData)
          .eq('id', formData.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('documents')
          .insert([documentData]);

        if (error) throw error;
      }

      loadDocuments();
      setIsModalOpen(false);
      setEditingDocument(null);
    } catch (error) {
      console.error('Error saving document:', error);
      alert('Албан бичиг хадгалахад алдаа гарлаа');
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!confirm('Энэ албан бичгийг устгахдаа итгэлтэй байна уу?')) return;

    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) throw error;

      loadDocuments();
      setIsDetailModalOpen(false);
      setViewingDocument(null);
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Албан бичиг устгахад алдаа гарлаа');
    }
  };

  const handleCreateTaskFromDocument = (documentId: string) => {
    if (onCreateTask) {
      onCreateTask(documentId);
    }
  };

  const handleViewLinkedTask = (taskId: string) => {
    if (onViewTask) {
      onViewTask(taskId);
    }
  };

  const handleDownloadReport = (document: DocumentFormData) => {
    if (!document.report_file_url || !document.report_file_name) {
      alert('Тайлан файл олдсонгүй');
      return;
    }

    try {
      const link = globalThis.document.createElement('a');
      link.href = document.report_file_url;
      link.download = document.report_file_name;
      link.target = '_blank';
      globalThis.document.body.appendChild(link);
      link.click();
      globalThis.document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Тайлан татахад алдаа гарлаа');
    }
  };

  const handleAddDocument = () => {
    setEditingDocument(null);
    setIsModalOpen(true);
  };

  const handleEditDocument = (document: DocumentFormData) => {
    setEditingDocument(document);
    setIsDetailModalOpen(false);
    setIsModalOpen(true);
  };

  const handleViewDocument = (document: DocumentFormData) => {
    setViewingDocument(document);
    setIsDetailModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getDocumentTypeColor = (type: string) => {
    return type === 'хариутай'
      ? 'bg-orange-100 text-orange-800'
      : 'bg-slate-100 text-slate-600';
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Response required':
        return 'bg-orange-100 text-orange-800';
      case 'Instruction':
        return 'bg-blue-100 text-blue-800';
      case 'Organizational':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const isOverdue = (document: DocumentFormData) => {
    if (!document.deadline || document.status === 'Completed') return false;
    return new Date(document.deadline) < new Date();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Албан бичиг ачаалж байна...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Албан бичиг</h2>
            <p className="text-sm text-slate-600 mt-1">{documents.length} нийт албан бичиг</p>
          </div>
          <div className="flex items-center gap-3">
            <DocumentExportMenu documents={searchTerm ? filteredDocuments : documents} />
            <button
              onClick={handleAddDocument}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Албан бичиг нэмэх
            </button>
          </div>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Илгээгч, дугаар эсвэл товч утгаар хайх..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        {filteredDocuments.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">
              {searchTerm ? 'Хайлтад тохирох албан бичиг олдсонгүй' : 'Албан бичиг байхгүй байна'}
            </p>
            {!searchTerm && (
              <button
                onClick={handleAddDocument}
                className="mt-4 text-sm text-slate-900 hover:underline"
              >
                Эхний албан бичгээ нэмэх
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocuments.map((doc) => {
              const linkedTask = doc.id ? linkedTasks[doc.id] : null;
              return (
                <div
                  key={doc.id}
                  className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                    isOverdue(doc) ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-slate-600" />
                      <span className="font-mono text-sm text-slate-900">{doc.document_number}</span>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDocumentTypeColor(doc.document_type || 'хариугүй')}`}>
                      {doc.document_type === 'хариутай' ? '⚠️ Хариутай' : 'Хариугүй'}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{doc.sender}</div>
                      <div className="text-xs text-slate-600 line-clamp-2">{doc.summary}</div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(doc.received_date)}
                      </div>
                      {doc.deadline && (
                        <div className={`flex items-center gap-1 ${isOverdue(doc) ? 'text-red-600 font-medium' : ''}`}>
                          {isOverdue(doc) && <AlertCircle className="w-3 h-3" />}
                          Хугацаа: {formatDate(doc.deadline)}
                        </div>
                      )}
                    </div>

                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                      {doc.status === 'Pending' ? 'Хүлээгдэж буй' :
                       doc.status === 'In Progress' ? 'Хийгдэж байна' :
                       doc.status === 'Completed' ? 'Дууссан' : doc.status}
                    </span>
                  </div>

                  {linkedTask ? (
                    <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-green-800 mb-1">
                        <CheckCircle className="w-4 h-4" />
                        <span className="font-medium">Төлөвлөгөө үүсгэсэн</span>
                      </div>
                      <div className="text-xs text-green-700 mb-2">→ 📋 {linkedTask.title}</div>
                      <button
                        onClick={() => linkedTask.id && handleViewLinkedTask(linkedTask.id)}
                        className="text-xs text-green-700 hover:text-green-800 hover:underline font-medium"
                      >
                        Төлөвлөгөө харах →
                      </button>
                    </div>
                  ) : doc.document_type === 'хариутай' ? (
                    <button
                      onClick={() => doc.id && handleCreateTaskFromDocument(doc.id)}
                      className="w-full mb-3 flex items-center justify-center gap-2 px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
                    >
                      <Calendar className="w-4 h-4" />
                      Төлөвлөгөө үүсгэх
                    </button>
                  ) : null}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleViewDocument(doc)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm"
                    >
                      <Eye className="w-4 h-4" />
                      Дэлгэрэнгүй
                    </button>
                    <button
                      onClick={() => handleEditDocument(doc)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Засах"
                    >
                      <Edit2 className="w-4 h-4 text-slate-600" />
                    </button>
                    <button
                      onClick={() => doc.id && handleDeleteDocument(doc.id)}
                      className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                      title="Устгах"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Хураангуй</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <div className="text-2xl font-bold text-slate-900">{documents.length}</div>
            <div className="text-sm text-slate-600">Нийт Албан Бичиг</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {documents.filter(d => d.document_type === 'хариутай').length}
            </div>
            <div className="text-sm text-slate-600">Хариутай</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {documents.filter(d => isOverdue(d)).length}
            </div>
            <div className="text-sm text-slate-600">Хугацаа Хэтэрсэн</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {documents.filter(d => d.status === 'Completed').length}
            </div>
            <div className="text-sm text-slate-600">Дууссан</div>
          </div>
        </div>
      </div>

      <DocumentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingDocument(null);
        }}
        onSave={handleSaveDocument}
        document={editingDocument}
      />

      <DocumentDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setViewingDocument(null);
        }}
        document={viewingDocument}
        onEdit={() => viewingDocument && handleEditDocument(viewingDocument)}
        onDelete={() => viewingDocument?.id && handleDeleteDocument(viewingDocument.id)}
        associatedTasks={[]}
      />
    </div>
  );
}
