import { useState, useEffect } from 'react';
import { X, Upload, FileText } from 'lucide-react';

export interface DocumentFormData {
  id?: string;
  received_date: string;
  sender: string;
  document_number: string;
  summary: string;
  category: 'Response required' | 'Informational' | 'Instruction' | 'Organizational';
  deadline?: string;
  responsible_person?: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  file_url?: string;
  file_name?: string;
  file_type?: string;
  // ✅ Report/Response fields
  report_file_url?: string;
  report_file_name?: string;
  report_file_type?: string;
}

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (document: DocumentFormData, file?: File, reportFile?: File) => void;
  document?: DocumentFormData | null;
}

export default function DocumentModal({ isOpen, onClose, onSave, document }: DocumentModalProps) {
  const [formData, setFormData] = useState<DocumentFormData>({
    received_date: new Date().toISOString().split('T')[0],
    sender: '',
    document_number: '',
    summary: '',
    category: 'Informational',
    status: 'Pending',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedReportFile, setSelectedReportFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (document) {
      setFormData(document);
      setSelectedFile(null);
      setSelectedReportFile(null);
    } else {
      setFormData({
        received_date: new Date().toISOString().split('T')[0],
        sender: '',
        document_number: '',
        summary: '',
        category: 'Informational',
        status: 'Pending',
      });
      setSelectedFile(null);
      setSelectedReportFile(null);
    }
  }, [document, isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

      setSelectedFile(file);
    }
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

    if (!formData.sender || !formData.document_number || !formData.summary) {
      alert('Шаардлагатай бүх талбарыг бөглөнө үү');
      return;
    }

    if (formData.category === 'Response required' && !formData.deadline) {
      alert('Хариу шаардлагатай албан бичигт хугацаа тогтооно уу');
      return;
    }

    setUploading(true);
    try {
      onSave(formData, selectedFile || undefined, selectedReportFile || undefined);
      onClose();
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">
            {document ? 'Албан бичиг засах' : 'Шинэ албан бичиг'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Ирсэн огноо *
              </label>
              <input
                type="date"
                value={formData.received_date}
                onChange={(e) => setFormData({ ...formData, received_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Бичгийн дугаар *
              </label>
              <input
                type="text"
                value={formData.document_number}
                onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                placeholder="Жишээ нь: DOC-2024-001"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Илгээгч *
            </label>
            <input
              type="text"
              value={formData.sender}
              onChange={(e) => setFormData({ ...formData, sender: e.target.value })}
              placeholder="Байгууллага эсвэл хүний нэр"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Товч утга *
            </label>
            <textarea
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              placeholder="Албан бичгийн товч тайлбар"
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Ангилал *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({
                  ...formData,
                  category: e.target.value as DocumentFormData['category'],
                  deadline: e.target.value === 'Response required' ? formData.deadline : undefined,
                  responsible_person: e.target.value === 'Response required' ? formData.responsible_person : undefined
                })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="Informational">Мэдээллийн</option>
                <option value="Response required">Хариу шаардлагатай</option>
                <option value="Instruction">Зааварчилгаа</option>
                <option value="Organizational">Зохион байгуулалтын</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Төлөв
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as DocumentFormData['status'] })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="Pending">Хүлээгдэж буй</option>
                <option value="In Progress">Хийгдэж байна</option>
                <option value="Completed">Дууссан</option>
              </select>
            </div>
          </div>

          {formData.category === 'Response required' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Хариу өгөх хугацаа *
                </label>
                <input
                  type="date"
                  value={formData.deadline || ''}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Хариуцагч
                </label>
                <input
                  type="text"
                  value={formData.responsible_person || ''}
                  onChange={(e) => setFormData({ ...formData, responsible_person: e.target.value })}
                  placeholder="Хариуцагч хүний нэр"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Файл хавсаргах
            </label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 hover:border-slate-400 transition-colors">
              <input
                type="file"
                id="file-upload"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                className="hidden"
              />
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center cursor-pointer"
              >
                {selectedFile ? (
                  <>
                    <FileText className="w-12 h-12 text-slate-400 mb-2" />
                    <p className="text-sm text-slate-700 font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </>
                ) : formData.file_name ? (
                  <>
                    <FileText className="w-12 h-12 text-slate-400 mb-2" />
                    <p className="text-sm text-slate-700 font-medium">{formData.file_name}</p>
                    <p className="text-xs text-slate-500 mt-1">Одоогийн файл</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-slate-400 mb-2" />
                    <p className="text-sm text-slate-700 font-medium">Хавсаргахын тулд дарна уу</p>
                    <p className="text-xs text-slate-500 mt-1">PDF, DOC, DOCX, PNG, JPG (хамгийн ихдээ 10MB)</p>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* ✅ ШИНЭ: Report/Response Upload - ЗӨВХӨН status="Completed" үед харагдана */}
          {formData.status === 'Completed' && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                📄 Хариу/Тайлан хавсаргах (заавал биш)
              </label>
              <div className="border-2 border-dashed border-green-300 rounded-lg p-6 hover:border-green-400 transition-colors">
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
                      <FileText className="w-10 h-10 text-green-600 mb-2" />
                      <p className="text-sm text-slate-700 font-medium">{selectedReportFile.name}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {(selectedReportFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </>
                  ) : formData.report_file_name ? (
                    <>
                      <FileText className="w-10 h-10 text-green-600 mb-2" />
                      <p className="text-sm text-slate-700 font-medium">{formData.report_file_name}</p>
                      <p className="text-xs text-green-600 mt-1">Одоогийн тайлан</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-green-400 mb-2" />
                      <p className="text-sm text-slate-700 font-medium">Тайлан хавсаргах</p>
                      <p className="text-xs text-slate-500 mt-1">PDF, DOC, DOCX, PNG, JPG</p>
                    </>
                  )}
                </label>
              </div>
              <p className="text-xs text-slate-600 mt-2">
                💡 Энэ албан бичигт хариу өгсөн эсвэл тайлан бичсэн бол энд хавсаргаж болно
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              disabled={uploading}
            >
              Цуцлах
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={uploading}
            >
              {uploading ? 'Хадгалж байна...' : document ? 'Шинэчлэх' : 'Хадгалах'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}