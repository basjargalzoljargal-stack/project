import { useState, useEffect } from 'react';
import { Plus, Search, Eye, Edit2, Trash2, AlertCircle, FileText, Download } from 'lucide-react';
import DocumentModal, { DocumentFormData } from './DocumentModal';
import DocumentDetailModal from './DocumentDetailModal';
import DocumentExportMenu from './DocumentExportMenu';
import { TaskFormData } from './TaskModal';
import { addTask, getTasksByDocumentId } from '../utils/taskStorage';
import { getDocuments, addDocument, updateDocument, deleteDocument } from '../utils/documentStorage';

interface DocumentsPageProps {
  tasks: TaskFormData[];
}

// Helper function to convert file to base64
const convertFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

export default function DocumentsPage({ tasks }: DocumentsPageProps) {
  const [documents, setDocuments] = useState<DocumentFormData[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<DocumentFormData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<DocumentFormData | null>(null);
  const [viewingDocument, setViewingDocument] = useState<DocumentFormData | null>(null);
  const [viewingDocumentTasks, setViewingDocumentTasks] = useState<TaskFormData[]>([]);
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

  const loadDocuments = () => {
    setLoading(true);
    const loadedDocuments = getDocuments();
    const sorted = loadedDocuments.sort((a, b) =>
      new Date(b.received_date).getTime() - new Date(a.received_date).getTime()
    );
    setDocuments(sorted);
    setLoading(false);
  };

  const handleSaveDocument = async (formData: DocumentFormData, file?: File, reportFile?: File) => {
    try {
      let file_url = formData.file_url;
      let file_name = formData.file_name;
      let file_type = formData.file_type;

      // Handle original document file
      if (file) {
        try {
          const base64 = await convertFileToBase64(file);
          file_url = base64;
          file_name = file.name;
          file_type = file.type;
        } catch (error) {
          console.error('Error converting file to base64:', error);
          alert('Файл хадгалахад алдаа гарлаа');
          return;
        }
      }

      // ✅ Handle report file
      let report_file_url = formData.report_file_url;
      let report_file_name = formData.report_file_name;
      let report_file_type = formData.report_file_type;

      if (reportFile) {
        try {
          const base64 = await convertFileToBase64(reportFile);
          report_file_url = base64;
          report_file_name = reportFile.name;
          report_file_type = reportFile.type;
        } catch (error) {
          console.error('Error converting report file to base64:', error);
          alert('Тайлан файл хадгалахад алдаа гарлаа');
          return;
        }
      }

      const documentData = {
        ...formData,
        file_url,
        file_name,
        file_type,
        report_file_url,
        report_file_name,
        report_file_type
      };

      let savedDocumentId = formData.id;

      if (formData.id) {
        updateDocument(formData.id, documentData);
      } else {
        const newDocument = addDocument(documentData);
        savedDocumentId = newDocument.id;

        if (formData.category === 'Response required' && formData.deadline) {
          const taskDeadline = new Date(formData.deadline);
          taskDeadline.setHours(17, 0, 0, 0);

          addTask({
            document_id: savedDocumentId,
            title: `Албан бичигт хариу өгөх – ${formData.document_number}`,
            description: formData.summary,
            dueDate: taskDeadline.toISOString(),
            createdAt: new Date().toISOString(),
            category: 'Document Related',
            status: 'Planned',
            priority: 'high',
            completed: false,
          });
        }
      }

      loadDocuments();
      setIsModalOpen(false);
      setEditingDocument(null);
    } catch (error) {
      console.error('Error saving document:', error);
      alert('Албан бичиг хадгалахад алдаа гарлаа');
    }
  };

  const handleDeleteDocument = (id: string) => {
    if (!confirm('Энэ албан бичгийг устгахдаа итгэлтэй байна уу?')) return;

    try {
      deleteDocument(id);
      loadDocuments();
      setIsDetailModalOpen(false);
      setViewingDocument(null);
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Албан бичиг устгахад алдаа гарлаа');
    }
  };

  // ✅ Download report file
  const handleDownloadReport = (document: DocumentFormData) => {
    if (!document.report_file_url || !document.report_file_name) {
      alert('Тайлан файл олдсонгүй');
      return;
    }

    try {
      const link = document.createElement('a');
      link.href = document.report_file_url;
      link.download = document.report_file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
    if (document.id) {
      const linkedTasks = getTasksByDocumentId(document.id);
      setViewingDocumentTasks(linkedTasks);
    }
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Огноо</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Илгээгч</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Бичгийн №</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Төрөл</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Хариу өгөх хугацаа</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Төлөв</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Үйлдэл</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map((doc) => (
                  <tr
                    key={doc.id}
                    className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                      isOverdue(doc) ? 'bg-red-50' : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-sm text-slate-900">
                      {formatDate(doc.received_date)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-slate-900 font-medium">{doc.sender}</div>
                      <div className="text-xs text-slate-500 truncate max-w-xs">{doc.summary}</div>
                      {/* ✅ Show report indicator */}
                      {doc.status === 'Completed' && doc.report_file_name && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadReport(doc);
                          }}
                          className="flex items-center gap-1 mt-1 text-xs text-green-700 hover:text-green-800 hover:underline"
                        >
                          <Download className="w-3 h-3" />
                          {doc.report_file_name}
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-900 font-mono">
                      {doc.document_number}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(doc.category)}`}>
                        {doc.category === 'Response required' ? 'Хариу шаардлагатай' :
                         doc.category === 'Informational' ? 'Мэдээллийн' :
                         doc.category === 'Instruction' ? 'Зааварчилгаа' :
                         doc.category === 'Organizational' ? 'Зохион байгуулалтын' : doc.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {doc.deadline ? (
                        <div className="flex items-center gap-1">
                          {isOverdue(doc) && <AlertCircle className="w-4 h-4 text-red-600" />}
                          <span className={isOverdue(doc) ? 'text-red-600 font-medium' : 'text-slate-900'}>
                            {formatDate(doc.deadline)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                        {doc.status === 'Pending' ? 'Хүлээгдэж буй' :
                         doc.status === 'In Progress' ? 'Хийгдэж байна' :
                         doc.status === 'Completed' ? 'Дууссан' : doc.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleViewDocument(doc)}
                          className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                          title="Дэлгэрэнгүй харах"
                        >
                          <Eye className="w-4 h-4 text-slate-600" />
                        </button>
                        <button
                          onClick={() => handleEditDocument(doc)}
                          className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
              {documents.filter(d => d.category === 'Response required').length}
            </div>
            <div className="text-sm text-slate-600">Хариу Шаардлагатай</div>
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
          setViewingDocumentTasks([]);
        }}
        document={viewingDocument}
        onEdit={() => viewingDocument && handleEditDocument(viewingDocument)}
        onDelete={() => viewingDocument?.id && handleDeleteDocument(viewingDocument.id)}
        associatedTasks={viewingDocumentTasks}
      />
    </div>
  );
}