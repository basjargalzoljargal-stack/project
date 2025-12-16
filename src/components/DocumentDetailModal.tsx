import { X, Download, FileText, Calendar, User, Clock, Tag, AlertCircle } from 'lucide-react';
import { DocumentFormData } from './DocumentModal';
import { TaskFormData } from './TaskModal';

interface DocumentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentFormData | null;
  onEdit: () => void;
  onDelete: () => void;
  associatedTasks: TaskFormData[];
}

export default function DocumentDetailModal({
  isOpen,
  onClose,
  document,
  onEdit,
  onDelete,
  associatedTasks
}: DocumentDetailModalProps) {
  if (!isOpen || !document) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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

  const isOverdue = () => {
    if (!document.deadline || document.status === 'Completed') return false;
    return new Date(document.deadline) < new Date();
  };

  const handleDownload = () => {
    if (document.file_url) {
      window.open(document.file_url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Албан бичгийн дэлгэрэнгүй</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(document.category)}`}>
                  {document.category === 'Response required' ? 'Хариу шаардлагатай' :
                   document.category === 'Informational' ? 'Мэдээллийн' :
                   document.category === 'Instruction' ? 'Зааварчилгаа' :
                   document.category === 'Organizational' ? 'Зохион байгуулалтын' : document.category}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(document.status)}`}>
                  {document.status === 'Pending' ? 'Хүлээгдэж буй' :
                   document.status === 'In Progress' ? 'Хийгдэж байна' :
                   document.status === 'Completed' ? 'Дууссан' : document.status}
                </span>
                {isOverdue() && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Хугацаа хэтэрсэн
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-600">
                Бичгийн #{document.document_number}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onEdit}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Засах
              </button>
              <button
                onClick={onDelete}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
              >
                Устгах
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span>Ирсэн огноо</span>
                </div>
                <p className="text-slate-900 font-medium">{formatDate(document.received_date)}</p>
              </div>

              <div>
                <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                  <User className="w-4 h-4" />
                  <span>Илгээгч</span>
                </div>
                <p className="text-slate-900 font-medium">{document.sender}</p>
              </div>

              {document.deadline && (
                <div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                    <Clock className="w-4 h-4" />
                    <span>Хариу өгөх хугацаа</span>
                  </div>
                  <p className={`font-medium ${isOverdue() ? 'text-red-600' : 'text-slate-900'}`}>
                    {formatDate(document.deadline)}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                  <Tag className="w-4 h-4" />
                  <span>Ангилал</span>
                </div>
                <p className="text-slate-900 font-medium">
                  {document.category === 'Response required' ? 'Хариу шаардлагатай' :
                   document.category === 'Informational' ? 'Мэдээллийн' :
                   document.category === 'Instruction' ? 'Зааварчилгаа' :
                   document.category === 'Organizational' ? 'Зохион байгуулалтын' : document.category}
                </p>
              </div>

              {document.responsible_person && (
                <div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                    <User className="w-4 h-4" />
                    <span>Хариуцагч</span>
                  </div>
                  <p className="text-slate-900 font-medium">{document.responsible_person}</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-slate-600 mb-2">Товч утга</h3>
            <p className="text-slate-900 bg-slate-50 p-4 rounded-lg">{document.summary}</p>
          </div>

          {document.file_url && (
            <div className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-slate-100 rounded-lg">
                    <FileText className="w-6 h-6 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{document.file_name}</p>
                    <p className="text-xs text-slate-500">{document.file_type}</p>
                  </div>
                </div>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Татах
                </button>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-slate-900 mb-3">Холбоотой ажил үүрэг</h3>
            {associatedTasks.length > 0 ? (
              <div className="space-y-2">
                {associatedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        task.completed ? 'bg-green-500' : 'bg-slate-400'
                      }`} />
                      <span className={`text-sm ${task.completed ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                        {task.title}
                      </span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      task.priority === 'high' ? 'bg-red-100 text-red-800' :
                      task.priority === 'medium' ? 'bg-orange-100 text-orange-800' :
                      'bg-slate-100 text-slate-800'
                    }`}>
                      {task.priority === 'high' ? 'Өндөр' :
                       task.priority === 'medium' ? 'Дунд' :
                       task.priority === 'low' ? 'Бага' : task.priority}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 bg-slate-50 p-4 rounded-lg text-center">
                Холбоотой ажил үүрэг байхгүй байна
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
