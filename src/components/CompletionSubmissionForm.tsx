import { useState, useEffect, useRef } from 'react';
import { X, Upload, FileText, Image as ImageIcon, Video, AlertCircle, CheckCircle, Save, Send, Eye, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import Card from './ui/Card';
import Badge from './ui/Badge';

interface Assignment {
  id: string;
  task: {
    id: string;
    title: string;
    description: string;
  };
  assigned_by_user: {
    full_name: string;
  };
  deadline: string;
  notes: string;
}

interface UploadedFile {
  id?: string;
  file?: File;
  name: string;
  size: number;
  type: string;
  category: string;
  preview?: string;
  path?: string;
}

interface CompletionSubmissionFormProps {
  assignmentId: string;
  onClose: () => void;
  onSubmit: () => void;
}

const MAX_FILES = 10;
const MAX_TOTAL_SIZE = 50 * 1024 * 1024;
const MAX_FILE_SIZES = {
  image: 10 * 1024 * 1024,
  pdf: 25 * 1024 * 1024,
  video: 100 * 1024 * 1024,
};

const ALLOWED_TYPES = {
  image: ['image/jpeg', 'image/jpg', 'image/png'],
  pdf: ['application/pdf'],
  doc: ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  video: ['video/mp4'],
};

export default function CompletionSubmissionForm({ assignmentId, onClose, onSubmit }: CompletionSubmissionFormProps) {
  const { user } = useAuth();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [completionId, setCompletionId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isFullyCompleted, setIsFullyCompleted] = useState(false);
  const [workDescription, setWorkDescription] = useState('');
  const [challenges, setChallenges] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadAssignment();
    loadExistingCompletion();
  }, [assignmentId]);

  useEffect(() => {
    if (completionId) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      autoSaveTimerRef.current = setTimeout(() => {
        saveDraft();
      }, 30000);
    }
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [workDescription, challenges, nextSteps, progress, isFullyCompleted]);

  const loadAssignment = async () => {
    const { data, error } = await supabase
      .from('task_assignments')
      .select(`
        id,
        task:tasks(id, title, description),
        assigned_by_user:user_profiles!assigned_by(full_name),
        deadline,
        notes
      `)
      .eq('id', assignmentId)
      .single();

    if (error) {
      console.error('Error loading assignment:', error);
      return;
    }

    setAssignment({
      ...data,
      task: Array.isArray(data.task) ? data.task[0] : data.task,
      assigned_by_user: Array.isArray(data.assigned_by_user) ? data.assigned_by_user[0] : data.assigned_by_user,
    });
  };

  const loadExistingCompletion = async () => {
    const { data } = await supabase
      .from('task_completions')
      .select('*')
      .eq('assignment_id', assignmentId)
      .eq('user_id', user?.id)
      .in('status', ['draft', 'revision_requested'])
      .maybeSingle();

    if (data) {
      setCompletionId(data.id);
      setProgress(data.progress_percentage);
      setIsFullyCompleted(data.is_fully_completed);
      setWorkDescription(data.work_description);
      setChallenges(data.challenges || '');
      setNextSteps(data.next_steps || '');
      loadFiles(data.id);
    }
  };

  const loadFiles = async (completionId: string) => {
    const { data } = await supabase
      .from('completion_files')
      .select('*')
      .eq('completion_id', completionId);

    if (data) {
      const files: UploadedFile[] = data.map(f => ({
        id: f.id,
        name: f.file_name,
        size: f.file_size,
        type: f.file_type,
        category: f.file_category,
        path: f.file_path,
      }));
      setUploadedFiles(files);
    }
  };

  const saveDraft = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const completionData = {
        assignment_id: assignmentId,
        user_id: user.id,
        progress_percentage: progress,
        is_fully_completed: isFullyCompleted,
        work_description: workDescription,
        challenges,
        next_steps: nextSteps,
        status: 'draft',
        updated_at: new Date().toISOString(),
      };

      if (completionId) {
        await supabase
          .from('task_completions')
          .update(completionData)
          .eq('id', completionId);
      } else {
        const { data } = await supabase
          .from('task_completions')
          .insert(completionData)
          .select()
          .single();

        if (data) {
          setCompletionId(data.id);
        }
      }

      setLastSaved(new Date());
    } catch (err) {
      console.error('Error saving draft:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleProgressChange = (value: number) => {
    setProgress(value);
    if (value === 100) {
      setIsFullyCompleted(true);
    }
  };

  const handleCompletedCheck = (checked: boolean) => {
    setIsFullyCompleted(checked);
    if (checked) {
      setProgress(100);
    }
  };

  const validateForm = () => {
    if (workDescription.length < 500) {
      setError('Хийсэн ажлын тайлбар дор хаяж 500 тэмдэгт байх ёстой');
      return false;
    }

    if (challenges.length > 0 && challenges.length < 200) {
      setError('Асуудлын тайлбар дор хаяж 200 тэмдэгт байх ёстой');
      return false;
    }

    if (!isFullyCompleted && progress < 100 && nextSteps.length === 0) {
      setError('Дараагийн алхмыг оруулна уу');
      return false;
    }

    if (isFullyCompleted && uploadedFiles.length === 0) {
      setError('Дууссан ажилд дор хаяж 1 файл хавсаргах шаардлагатай');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    setError('');

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (!completionId) {
        await saveDraft();
      }

      if (completionId) {
        await supabase
          .from('task_completions')
          .update({
            status: 'submitted',
            submitted_at: new Date().toISOString(),
          })
          .eq('id', completionId);

        await supabase
          .from('task_assignments')
          .update({
            status: isFullyCompleted ? 'completed' : 'in_progress',
            completed_at: isFullyCompleted ? new Date().toISOString() : null,
          })
          .eq('id', assignmentId);

        alert('Амжилттай илгээгдлээ!');
        onSubmit();
      }
    } catch (err: any) {
      setError(err.message || 'Илгээхэд алдаа гарлаа');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    await handleFiles(files);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      await handleFiles(files);
    }
  };

  const handleFiles = async (files: File[]) => {
    if (!completionId) {
      await saveDraft();
      if (!completionId) {
        setError('Файл байршуулахын өмнө ноорог хадгална уу');
        return;
      }
    }

    if (uploadedFiles.length + files.length > MAX_FILES) {
      setError(`Хамгийн ихдээ ${MAX_FILES} файл байршуулах боломжтой`);
      return;
    }

    const totalSize = uploadedFiles.reduce((sum, f) => sum + f.size, 0) +
      files.reduce((sum, f) => sum + f.size, 0);

    if (totalSize > MAX_TOTAL_SIZE) {
      setError('Нийт файлын хэмжээ 50MB-аас хэтэрч болохгүй');
      return;
    }

    setUploading(true);
    setError('');

    for (const file of files) {
      if (!validateFile(file)) {
        continue;
      }

      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user!.id}/${completionId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError, data } = await supabase.storage
          .from('task-completions')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const category = getFileCategory(file.type);

        const { data: fileData, error: dbError } = await supabase
          .from('completion_files')
          .insert({
            completion_id: completionId,
            file_name: file.name,
            file_path: fileName,
            file_type: file.type,
            file_size: file.size,
            file_category: category,
          })
          .select()
          .single();

        if (dbError) throw dbError;

        const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;

        setUploadedFiles(prev => [...prev, {
          id: fileData.id,
          name: file.name,
          size: file.size,
          type: file.type,
          category,
          path: fileName,
          preview,
        }]);
      } catch (err: any) {
        console.error('Error uploading file:', err);
        setError(`${file.name} байршуулахад алдаа гарлаа`);
      }
    }

    setUploading(false);
  };

  const validateFile = (file: File): boolean => {
    const allAllowedTypes = [
      ...ALLOWED_TYPES.image,
      ...ALLOWED_TYPES.pdf,
      ...ALLOWED_TYPES.doc,
      ...ALLOWED_TYPES.video,
    ];

    if (!allAllowedTypes.includes(file.type)) {
      setError(`${file.name}: Дэмжигдээгүй файлын төрөл`);
      return false;
    }

    if (file.type.startsWith('image/') && file.size > MAX_FILE_SIZES.image) {
      setError(`${file.name}: Зургийн хэмжээ 10MB-аас хэтрэх боломжгүй`);
      return false;
    }

    if (file.type === 'application/pdf' && file.size > MAX_FILE_SIZES.pdf) {
      setError(`${file.name}: PDF файлын хэмжээ 25MB-аас хэтрэх боломжгүй`);
      return false;
    }

    if (file.type.startsWith('video/') && file.size > MAX_FILE_SIZES.video) {
      setError(`${file.name}: Видео файлын хэмжээ 100MB-аас хэтрэх боломжгүй`);
      return false;
    }

    return true;
  };

  const getFileCategory = (type: string): string => {
    if (type.startsWith('image/')) return 'screenshot';
    if (type === 'application/pdf') return 'report';
    if (type.startsWith('video/')) return 'video';
    return 'other';
  };

  const handleRemoveFile = async (file: UploadedFile) => {
    if (file.id) {
      await supabase
        .from('completion_files')
        .delete()
        .eq('id', file.id);

      if (file.path) {
        await supabase.storage
          .from('task-completions')
          .remove([file.path]);
      }
    }

    setUploadedFiles(prev => prev.filter(f => f.id !== file.id));
  };

  const getProgressColor = () => {
    if (progress <= 30) return 'bg-red-500';
    if (progress <= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="w-5 h-5" />;
    if (type.startsWith('video/')) return <Video className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />;
  };

  if (!assignment) {
    return (
      <Modal onClose={onClose}>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Ачааллаж байна...</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} size="xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Ажил гүйцэтгэлийн тайлан</h2>
          {lastSaved && (
            <p className="text-xs text-slate-500 mt-1">
              Сүүлд хадгалагдсан: {lastSaved.toLocaleTimeString('mn-MN')}
            </p>
          )}
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
        <Card className="bg-slate-50">
          <div className="space-y-2">
            <div>
              <p className="text-sm text-slate-600">Ажлын нэр</p>
              <p className="font-semibold text-slate-900">{assignment.task.title}</p>
            </div>
            {assignment.task.description && (
              <div>
                <p className="text-sm text-slate-600">Тайлбар</p>
                <p className="text-sm text-slate-900">{assignment.task.description}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-600">Хуваарилсан</p>
                <p className="text-sm text-slate-900">{assignment.assigned_by_user.full_name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Эцсийн хугацаа</p>
                <p className="text-sm text-slate-900">
                  {new Date(assignment.deadline).toLocaleDateString('mn-MN')}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-slate-700">
              Гүйцэтгэлийн хувь
            </label>
            <span className="text-2xl font-bold" style={{ color: progress <= 30 ? '#ef4444' : progress <= 70 ? '#eab308' : '#22c55e' }}>
              {progress}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={(e) => handleProgressChange(parseInt(e.target.value))}
            className="w-full h-3 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, ${progress <= 30 ? '#ef4444' : progress <= 70 ? '#eab308' : '#22c55e'} ${progress}%, #e2e8f0 ${progress}%)`,
            }}
          />
          <div className="flex items-center gap-2 mt-3">
            <input
              type="checkbox"
              id="fully-completed"
              checked={isFullyCompleted}
              onChange={(e) => handleCompletedCheck(e.target.checked)}
              className="w-4 h-4 text-green-600 focus:ring-green-600 rounded"
            />
            <label htmlFor="fully-completed" className="text-sm text-slate-700">
              Бүрэн биелсэн
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Хийсэн ажил <span className="text-red-500">*</span>
          </label>
          <textarea
            value={workDescription}
            onChange={(e) => setWorkDescription(e.target.value)}
            placeholder="Хийсэн ажлын дэлгэрэнгүй тайлбар..."
            rows={8}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <p className={`text-xs mt-1 ${workDescription.length >= 500 ? 'text-green-600' : 'text-slate-500'}`}>
            {workDescription.length} / 500+ тэмдэгт (шаардлагатай)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Асуудал/саад бэрхшээл
          </label>
          <textarea
            value={challenges}
            onChange={(e) => setChallenges(e.target.value)}
            placeholder="Тулгарсан асуудал, саад бэрхшээл..."
            rows={4}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          {challenges.length > 0 && (
            <p className={`text-xs mt-1 ${challenges.length >= 200 ? 'text-green-600' : 'text-orange-500'}`}>
              {challenges.length} / 200+ тэмдэгт (санал болгож байна)
            </p>
          )}
        </div>

        {!isFullyCompleted && progress < 100 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Дараагийн алхам <span className="text-red-500">*</span>
            </label>
            <textarea
              value={nextSteps}
              onChange={(e) => setNextSteps(e.target.value)}
              placeholder="Дараа юу хийх шаардлагатай..."
              rows={4}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Нотлох баримт {isFullyCompleted && <span className="text-red-500">*</span>}
          </label>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.mp4"
              className="hidden"
            />
            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-700 mb-2">
              📁 Файл чирж оруулах эсвэл{' '}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                сонгох
              </button>
            </p>
            <p className="text-xs text-slate-500">
              Дэмжигдэх: JPG, PNG, PDF, DOC, MP4
            </p>
            <p className="text-xs text-slate-500">
              Хамгийн их {MAX_FILES} файл, нийт 50MB
            </p>
          </div>

          {uploading && (
            <div className="mt-3 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-slate-600 mt-2">Файл байршуулж байна...</p>
            </div>
          )}

          {uploadedFiles.length > 0 && (
            <div className="mt-4 space-y-3">
              <p className="text-sm font-medium text-slate-700">
                Байршуулсан файлууд ({uploadedFiles.length}/{MAX_FILES})
              </p>
              {uploadedFiles.map((file) => (
                <Card key={file.id} className="flex items-start gap-3 p-3">
                  <div className="flex-shrink-0">
                    {file.preview ? (
                      <img src={file.preview} alt={file.name} className="w-16 h-16 object-cover rounded" />
                    ) : (
                      <div className="w-16 h-16 bg-slate-100 rounded flex items-center justify-center">
                        {getFileIcon(file.type)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                    <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {file.category}
                    </Badge>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(file)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 mt-6 pt-6 border-t border-slate-200">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isSaving || isSubmitting}
        >
          Буцах
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={saveDraft}
          loading={isSaving}
          disabled={isSaving || isSubmitting}
          leftIcon={<Save className="w-4 h-4" />}
        >
          Ноорог хадгалах
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowPreview(true)}
          disabled={isSaving || isSubmitting}
          leftIcon={<Eye className="w-4 h-4" />}
        >
          Урьдчилан үзэх
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={handleSubmit}
          loading={isSubmitting}
          disabled={isSaving || isSubmitting}
          leftIcon={<Send className="w-4 h-4" />}
          fullWidth
        >
          Илгээх
        </Button>
      </div>

      {showPreview && (
        <Modal onClose={() => setShowPreview(false)} size="lg">
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900">Урьдчилан үзэх</h3>
            <Card className="bg-slate-50">
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">Гүйцэтгэл</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className={`h-full ${getProgressColor()}`} style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-sm font-semibold">{progress}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Хийсэн ажил</p>
                  <p className="text-sm text-slate-900 whitespace-pre-wrap">{workDescription}</p>
                </div>
                {challenges && (
                  <div>
                    <p className="text-sm font-medium text-slate-700">Асуудал</p>
                    <p className="text-sm text-slate-900 whitespace-pre-wrap">{challenges}</p>
                  </div>
                )}
                {nextSteps && (
                  <div>
                    <p className="text-sm font-medium text-slate-700">Дараагийн алхам</p>
                    <p className="text-sm text-slate-900 whitespace-pre-wrap">{nextSteps}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-slate-700">Файлууд ({uploadedFiles.length})</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {uploadedFiles.map(file => (
                      <Badge key={file.id} variant="outline">
                        {file.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Хаах
              </Button>
              <Button variant="primary" onClick={handleSubmit} loading={isSubmitting}>
                Баталгаажуулах
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
}
