import { X, Upload, FileIcon, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

export type RecurrenceType = 'Нэг удаагийн' | '7 хоног бүр' | 'Сар бүр' | 'Улирал бүр' | 'Жил бүр';

export interface TaskFormData {
  id?: string;
  document_id?: string;
  title: string;
  description: string;
  dueDate: string;
  createdAt?: string;
  category: 'Ерөнхий' | 'Төсөл' | 'Бичиг баримттай холбоотой' | 'General' | 'Project' | 'Document Related';
  status: 'Төлөвлөсөн' | 'Хийгдэж байна' | 'Дууссан' | 'Хойшлуулсан' | 'Planned' | 'In progress' | 'Completed' | 'Postponed';
  priority: 'Өндөр' | 'Дунд' | 'Бага' | 'high' | 'medium' | 'low';
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
  report_file_name?: string;
  report_file_url?: string;
  report_file_type?: string;
  completed_at?: string;
}

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: TaskFormData, reportFile?: File) => void;
  task?: TaskFormData | null;
}

export default function TaskModal({ isOpen, onClose, onSave, task }: TaskModalProps) {
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    dueDate: '',
    category: 'Ерөнхий',
    status: 'Төлөвлөсөн',
    priority: 'Дунд',
    completed: false,
    recurrenceType: 'Нэг удаагийн',
  });

  const [fileName, setFileName] = useState<string>('');
  const [selectedReportFile, setSelectedReportFile] = useState<File | null>(null);
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    if (task) {
      setFormData(task);
      setFileName(task.fileName || '');
      setSelectedReportFile(null);

      if (task.dueDate) {
        const dt = new Date(task.dueDate);
        const dateStr = dt.toISOString().split('T')[0];
        const timeStr = dt.toTimeString().slice(0, 5);
        setDate(dateStr);
        setTime(timeStr);
      }
    } else {
      setFormData({
        title: '',
        description: '',
        dueDate: '',
        category: 'Ерөнхий',
        status: 'Төлөвлөсөн',
        priority: 'Дунд',
        completed: false,
        recurrenceType: 'Нэг удаагийн',
      });
      setFileName('');
      setSelectedReportFile(null);
      setDate('');
      setTime('');
    }
  }, [task, isOpen]);

  const handleStatusChange = (newStatus: TaskFormData['status']) => {
    const updates: Partial<TaskFormData> = { 
      status: newStatus,
      completed: newStatus === 'Дууссан' || newStatus === 'Completed'
    };
    
    // If marking as completed, add timestamp
    if ((newStatus === 'Дууссан' || newStatus === 'Completed') && 
        (formData.status !== 'Дууссан' && formData.status !== 'Completed')) {
      updates.completed_at = new Date().toISOString();
    }
    
    setFormData({ ...formData, ...updates });
  };

  const handleReportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/png',
        'image/jpeg'
      ];

      if (!allowedTypes.includes(file.type)) {
        alert('PDF, DOC, DOCX, PNG, JPG файл хавсаргана уу');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        alert('Файлын хэмжээ 10MB-аас бага байх ёстой');
        return;
      }

      setSelectedReportFile(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const timeToUse = time || '09:00';
    const dueDate = `${date}T${timeToUse}`;

    // Require report file when completing task
    if ((formData.status === 'Дууссан' || formData.status === 'Completed') && 
        !selectedReportFile && !formData.report_file_url) {
      alert('Дууссан төлөвлөгөөнд биелэлтийн тайлан хавсаргана уу');
      return;
    }

    onSave({
      ...formData,
      dueDate,
      createdAt: formData.createdAt || new Date().toISOString(),
      fileName: fileName || undefined
    }, selectedReportFile || undefined);
    
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
    }
  };

  if (!isOpen) return null;

  const isCompleted = formData.status === 'Дууссан' || formData.status === 'Completed';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">
            {task ? 'Төлөвлөгөө засах' : 'Шинэ төлөвлөгөө нэмэх'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-2">
              Гарчиг *
            </label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              placeholder="Гарчиг оруулна уу"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-2">
              Тайлбар
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent resize-none"
              rows={4}
              placeholder="Тайлбар оруулна уу..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-slate-700 mb-2">
                Биелэх огноо *
              </label>
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label htmlFor="time" className="block text-sm font-medium text-slate-700 mb-2">
                Цаг
              </label>
              <input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                placeholder="09:00"
              />
              <p className="text-xs text-slate-500 mt-1">Анхдагч: 09:00</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-slate-700 mb-2">
                Ач холбогдол *
              </label>
              <select
                id="priority"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskFormData['priority'] })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                required
              >
                <option value="Өндөр">Өндөр</option>
                <option value="Дунд">Дунд</option>
                <option value="Бага">Бага</option>
              </select>
            </div>

            <div>
              <label htmlFor="recurrence" className="block text-sm font-medium text-slate-700 mb-2">
                Давтамж *
              </label>
              <select
                id="recurrence"
                value={formData.recurrenceType || 'Нэг удаагийн'}
                onChange={(e) => setFormData({ ...formData, recurrenceType: e.target.value as RecurrenceType })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                required
                disabled={!!formData.parentTaskId}
              >
                <option value="Нэг удаагийн">Нэг удаагийн</option>
                <option value="7 хоног бүр">7 хоног бүр</option>
                <option value="Сар бүр">Сар бүр</option>
                <option value="Улирал бүр">Улирал бүр</option>
                <option value="Жил бүр">Жил бүр</option>
              </select>
              {formData.parentTaskId && (
                <p className="text-xs text-slate-500 mt-1">Үүсгэгдсэн давтагдах төлөвлөгөө</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-slate-700 mb-2">
                Ангилал *
              </label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as TaskFormData['category'] })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                required
              >
                <option value="Ерөнхий">Ерөнхий</option>
                <option value="Төсөл">Төсөл</option>
                <option value="Бичиг баримттай холбоотой">Бичиг баримттай холбоотой</option>
              </select>
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-slate-700 mb-2">
                Төлөв *
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => handleStatusChange(e.target.value as TaskFormData['status'])}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                required
              >
                <option value="Төлөвлөсөн">Төлөвлөсөн</option>
                <option value="Хийгдэж байна">Хийгдэж байна</option>
                <option value="Дууссан">Дууссан</option>
                <option value="Хойшлуулсан">Хойшлуулсан</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Файл хавсаргах (заавал биш)
            </label>
            <div className="relative">
              <input
                id="file"
                type="file"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="file"
                className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-slate-400 cursor-pointer transition-colors"
              >
                <Upload className="w-5 h-5 text-slate-400 mr-2" />
                <span className="text-sm text-slate-600">
                  {fileName || 'Файл хавсаргах'}
                </span>
              </label>
              {fileName && (
                <div className="mt-2 flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg">
                  <FileIcon className="w-4 h-4" />
                  <span>{fileName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Report Upload Section - Only show when status is Completed */}
          {isCompleted && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <label className="block text-sm font-medium text-green-900">
                  Биелэлтийн тайлан *
                </label>
              </div>
              <div className="border-2 border-dashed border-green-300 rounded-lg p-6 hover:border-green-400 transition-colors bg-white">
                <input
                  type="file"
                  id="report-file-upload"
                  onChange={handleReportFileChange}
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  className="hidden"
                />
                <label
                  htmlFor="report-file-upload"
                  className="flex flex-col items-center justify-center cursor-pointer"
                >
                  {selectedReportFile ? (
                    <>
                      <FileIcon className="w-12 h-12 text-green-600 mb-2" />
                      <p className="text-sm text-slate-700 font-medium">{selectedReportFile.name}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {(selectedReportFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </>
                  ) : formData.report_file_name ? (
                    <>
                      <FileIcon className="w-12 h-12 text-green-600 mb-2" />
                      <p className="text-sm text-slate-700 font-medium">{formData.report_file_name}</p>
                      <p className="text-xs text-slate-500 mt-1">Одоогийн тайлан</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 text-green-600 mb-2" />
                      <p className="text-sm text-green-900 font-medium">Биелэлтийн тайлан хавсаргах</p>
                      <p className="text-xs text-slate-500 mt-1">PDF, DOC, DOCX, PNG, JPG (хамгийн ихдээ 10MB)</p>
                    </>
                  )}
                </label>
              </div>
              <p className="text-xs text-green-700 mt-2">
                * Дууссан төлөвлөгөөнд биелэлтийн тайлан заавал хавсаргана уу
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
            >
              Цуцлах
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-2.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors"
            >
              {task ? 'Шинэчлэх' : 'Үүсгэх'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}