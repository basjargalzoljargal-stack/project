import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Upload, X, FileText, AlertCircle, Save, Send, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Button from './ui/Button';
import Card from './ui/Card';
import Input from './ui/Input';
import Badge from './ui/Badge';

interface Department {
  id: string;
  name: string;
  color: string;
}

interface ProposalFile {
  id?: string;
  file_name: string;
  file_size: number;
  file_type: string;
  file_path?: string;
  file?: File;
  progress?: number;
}

interface ProjectProposalFormProps {
  proposalId?: string;
  onBack: () => void;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'draft':
      return { label: 'Ноорог', color: 'bg-slate-100 text-slate-800' };
    case 'submitted':
      return { label: 'Илгээсэн', color: 'bg-blue-100 text-blue-800' };
    case 'under_review':
      return { label: 'Хянагдаж байна', color: 'bg-yellow-100 text-yellow-800' };
    case 'approved':
      return { label: 'Баталгаажсан', color: 'bg-green-100 text-green-800' };
    case 'rejected':
      return { label: 'Буцаагдсан', color: 'bg-red-100 text-red-800' };
    default:
      return { label: status, color: 'bg-slate-100 text-slate-800' };
  }
};

export default function ProjectProposalForm({ proposalId, onBack }: ProjectProposalFormProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [objective, setObjective] = useState('');
  const [expectedResult, setExpectedResult] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');
  const [requiredResources, setRequiredResources] = useState('');
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [status, setStatus] = useState('draft');
  const [files, setFiles] = useState<ProposalFile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    loadDepartments();
    if (proposalId) {
      loadProposal();
    }
  }, [proposalId]);

  useEffect(() => {
    if (proposalId) return;

    if (autoSaveTimeout.current) {
      clearTimeout(autoSaveTimeout.current);
    }

    autoSaveTimeout.current = setTimeout(() => {
      if (title || objective) {
        handleAutoSave();
      }
    }, 30000);

    return () => {
      if (autoSaveTimeout.current) {
        clearTimeout(autoSaveTimeout.current);
      }
    };
  }, [title, objective, expectedResult, startDate, endDate, budget, requiredResources, selectedDepartments]);

  const loadDepartments = async () => {
    const { data } = await supabase
      .from('departments')
      .select('id, name, color')
      .order('name');

    if (data) {
      setDepartments(data);
    }
  };

  const loadProposal = async () => {
    if (!proposalId) return;

    setIsLoading(true);
    try {
      const { data: proposal } = await supabase
        .from('proposals')
        .select('*')
        .eq('id', proposalId)
        .single();

      if (proposal) {
        setTitle(proposal.title);
        setObjective(proposal.objective);
        setExpectedResult(proposal.expected_result || '');
        setStartDate(proposal.start_date);
        setEndDate(proposal.end_date);
        setBudget(proposal.budget?.toString() || '');
        setRequiredResources(proposal.required_resources || '');
        setStatus(proposal.status);

        const { data: depts } = await supabase
          .from('proposal_departments')
          .select('department_id')
          .eq('proposal_id', proposalId);

        if (depts) {
          setSelectedDepartments(depts.map(d => d.department_id));
        }

        const { data: filesData } = await supabase
          .from('proposal_files')
          .select('*')
          .eq('proposal_id', proposalId);

        if (filesData) {
          setFiles(filesData.map(f => ({
            id: f.id,
            file_name: f.file_name,
            file_size: f.file_size,
            file_type: f.file_type,
            file_path: f.file_path,
          })));
        }
      }
    } catch (err) {
      console.error('Error loading proposal:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoSave = async () => {
    if (status !== 'draft') return;
    await handleSaveDraft(true);
  };

  const handleSaveDraft = async (isAutoSave = false) => {
    if (!user) return;

    if (!isAutoSave) {
      setIsSaving(true);
    }

    try {
      const proposalData = {
        user_id: user.id,
        title: title.trim() || 'Гарчиггүй төсөл',
        objective: objective.trim() || 'Зорилго тодорхойгүй',
        expected_result: expectedResult.trim(),
        start_date: startDate || new Date().toISOString().split('T')[0],
        end_date: endDate || new Date().toISOString().split('T')[0],
        budget: budget ? parseFloat(budget) : null,
        required_resources: requiredResources.trim(),
        status: 'draft',
        updated_at: new Date().toISOString(),
      };

      let savedProposalId = proposalId;

      if (proposalId) {
        const { error: updateError } = await supabase
          .from('proposals')
          .update(proposalData)
          .eq('id', proposalId);

        if (updateError) throw updateError;
      } else {
        const { data, error: insertError } = await supabase
          .from('proposals')
          .insert([proposalData])
          .select()
          .single();

        if (insertError) throw insertError;
        savedProposalId = data.id;
      }

      if (savedProposalId) {
        await supabase
          .from('proposal_departments')
          .delete()
          .eq('proposal_id', savedProposalId);

        if (selectedDepartments.length > 0) {
          const deptInserts = selectedDepartments.map(deptId => ({
            proposal_id: savedProposalId,
            department_id: deptId,
          }));

          await supabase
            .from('proposal_departments')
            .insert(deptInserts);
        }

        for (const file of files) {
          if (file.file && !file.id) {
            await uploadFile(savedProposalId, file);
          }
        }
      }

      setLastSaved(new Date());
      if (!isAutoSave) {
        alert('Ноорог амжилттай хадгалагдлаа');
      }
    } catch (err: any) {
      if (!isAutoSave) {
        setError(err.message || 'Хадгалахад алдаа гарлаа');
      }
    } finally {
      if (!isAutoSave) {
        setIsSaving(false);
      }
    }
  };

  const handleSubmit = async () => {
    setError('');

    if (!title.trim()) {
      setError('Төслийн нэрийг оруулна уу');
      return;
    }

    if (!objective.trim() || objective.trim().length < 200) {
      setError('Зорилго 200-аас дээш тэмдэгт байх ёстой');
      return;
    }

    if (!startDate || !endDate) {
      setError('Эхлэх болон дуусах огноог оруулна уу');
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setError('Дуусах огноо эхлэх огнооноос хойш байх ёстой');
      return;
    }

    if (selectedDepartments.length === 0) {
      setError('Дор хаяж нэг хэлтэс сонгоно уу');
      return;
    }

    setIsLoading(true);

    try {
      const proposalData = {
        user_id: user?.id,
        title: title.trim(),
        objective: objective.trim(),
        expected_result: expectedResult.trim(),
        start_date: startDate,
        end_date: endDate,
        budget: budget ? parseFloat(budget) : null,
        required_resources: requiredResources.trim(),
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      let savedProposalId = proposalId;

      if (proposalId) {
        const { error: updateError } = await supabase
          .from('proposals')
          .update(proposalData)
          .eq('id', proposalId);

        if (updateError) throw updateError;
      } else {
        const { data, error: insertError } = await supabase
          .from('proposals')
          .insert([proposalData])
          .select()
          .single();

        if (insertError) throw insertError;
        savedProposalId = data.id;
      }

      if (savedProposalId) {
        await supabase
          .from('proposal_departments')
          .delete()
          .eq('proposal_id', savedProposalId);

        if (selectedDepartments.length > 0) {
          const deptInserts = selectedDepartments.map(deptId => ({
            proposal_id: savedProposalId,
            department_id: deptId,
          }));

          await supabase
            .from('proposal_departments')
            .insert(deptInserts);
        }

        for (const file of files) {
          if (file.file && !file.id) {
            await uploadFile(savedProposalId, file);
          }
        }
      }

      alert('Төслийн санал амжилттай илгээгдлээ');
      onBack();
    } catch (err: any) {
      setError(err.message || 'Илгээхэд алдаа гарлаа');
    } finally {
      setIsLoading(false);
    }
  };

  const uploadFile = async (proposalId: string, fileData: ProposalFile) => {
    if (!fileData.file || !user) return;

    const fileExt = fileData.file_name.split('.').pop();
    const fileName = `${user.id}/${proposalId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('proposals')
      .upload(fileName, fileData.file);

    if (uploadError) throw uploadError;

    const { error: dbError } = await supabase
      .from('proposal_files')
      .insert([{
        proposal_id: proposalId,
        file_name: fileData.file_name,
        file_path: fileName,
        file_size: fileData.file_size,
        file_type: fileData.file_type,
      }]);

    if (dbError) throw dbError;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const maxSize = 25 * 1024 * 1024;

    const newFiles: ProposalFile[] = selectedFiles.map(file => {
      if (file.size > maxSize) {
        alert(`${file.name} нь 25MB-аас том байна`);
        return null;
      }

      return {
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        file: file,
      };
    }).filter(Boolean) as ProposalFile[];

    setFiles([...files, ...newFiles]);
  };

  const handleRemoveFile = async (index: number) => {
    const file = files[index];

    if (file.id && proposalId) {
      const { error } = await supabase
        .from('proposal_files')
        .delete()
        .eq('id', file.id);

      if (error) {
        alert('Файл устгахад алдаа гарлаа');
        return;
      }

      if (file.file_path) {
        await supabase.storage
          .from('proposals')
          .remove([file.file_path]);
      }
    }

    setFiles(files.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFiles = Array.from(e.dataTransfer.files);
    const maxSize = 25 * 1024 * 1024;

    const newFiles: ProposalFile[] = droppedFiles.map(file => {
      if (file.size > maxSize) {
        alert(`${file.name} нь 25MB-аас том байна`);
        return null;
      }

      return {
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        file: file,
      };
    }).filter(Boolean) as ProposalFile[];

    setFiles([...files, ...newFiles]);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Ачааллаж байна...</p>
        </div>
      </div>
    );
  }

  const statusBadge = getStatusBadge(status);

  if (isPreview) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Button variant="outline" onClick={() => setIsPreview(false)}>
              <ChevronLeft className="w-5 h-5 mr-2" />
              Буцах
            </Button>
            <Badge className={statusBadge.color}>{statusBadge.label}</Badge>
          </div>

          <Card>
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">{title || 'Гарчиггүй'}</h1>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Зорилго</h3>
                <p className="text-slate-900 whitespace-pre-wrap">{objective || '-'}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Хүрэх үр дүн</h3>
                <p className="text-slate-900 whitespace-pre-wrap">{expectedResult || '-'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Эхлэх огноо</h3>
                  <p className="text-slate-900">{startDate || '-'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Дуусах огноо</h3>
                  <p className="text-slate-900">{endDate || '-'}</p>
                </div>
              </div>

              {budget && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Төсөвт өртөг</h3>
                  <p className="text-slate-900 text-2xl font-bold">{parseFloat(budget).toLocaleString()} ₮</p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Шаардлагатай нөөц</h3>
                <p className="text-slate-900 whitespace-pre-wrap">{requiredResources || '-'}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Хамааралтай хэлтэс</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedDepartments.map(deptId => {
                    const dept = departments.find(d => d.id === deptId);
                    return dept ? (
                      <Badge key={dept.id} variant="outline">
                        {dept.name}
                      </Badge>
                    ) : null;
                  })}
                  {selectedDepartments.length === 0 && <span className="text-slate-500">-</span>}
                </div>
              </div>

              {files.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Хавсаргасан файлууд</h3>
                  <div className="space-y-2">
                    {files.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                        <FileText className="w-5 h-5 text-slate-600" />
                        <span className="text-sm text-slate-900 flex-1">{file.file_name}</span>
                        <span className="text-xs text-slate-500">{formatFileSize(file.file_size)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={onBack}>
              <ChevronLeft className="w-5 h-5 mr-2" />
              Буцах
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Төсөл санал илгээх</h1>
              {lastSaved && (
                <p className="text-sm text-slate-600 mt-1">
                  Сүүлд хадгалсан: {lastSaved.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
          <Badge className={statusBadge.color}>{statusBadge.label}</Badge>
        </div>

        <Card>
          <form className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <Input
              label="Төслийн нэр"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Жишээ: CRM систем нэвтрүүлэх"
              required
              disabled={status !== 'draft'}
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Зорилго <span className="text-red-600">*</span>
              </label>
              <textarea
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="Төслийн зорилго, шаардлага (200+ тэмдэгт)..."
                rows={5}
                disabled={status !== 'draft'}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <p className="text-xs text-slate-500 mt-1">
                {objective.length}/200 тэмдэгт
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Хүрэх үр дүн
              </label>
              <textarea
                value={expectedResult}
                onChange={(e) => setExpectedResult(e.target.value)}
                placeholder="Төслөөс хүлээгдэж буй үр дүн..."
                rows={4}
                disabled={status !== 'draft'}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Эхлэх огноо"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                disabled={status !== 'draft'}
              />
              <Input
                label="Дуусах огноо"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                disabled={status !== 'draft'}
              />
            </div>

            <Input
              label="Төсөвт өртөг (₮)"
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="0"
              disabled={status !== 'draft'}
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Шаардлагатай нөөц
              </label>
              <textarea
                value={requiredResources}
                onChange={(e) => setRequiredResources(e.target.value)}
                placeholder="Хүний нөөц, техник хэрэгсэл гэх мэт..."
                rows={3}
                disabled={status !== 'draft'}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Хамааралтай хэлтэс
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3">
                {departments.map((dept) => (
                  <label
                    key={dept.id}
                    className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded transition-colors cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedDepartments.includes(dept.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDepartments([...selectedDepartments, dept.id]);
                        } else {
                          setSelectedDepartments(selectedDepartments.filter(id => id !== dept.id));
                        }
                      }}
                      disabled={status !== 'draft'}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-600 rounded"
                    />
                    <span className="text-sm text-slate-900">{dept.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Файл хавсаргах (PDF, DOC, PPT, max 25MB)
              </label>
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                onClick={() => status === 'draft' && fileInputRef.current?.click()}
              >
                <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600 mb-2">Файл чирж оруулах эсвэл дарж сонгох</p>
                <p className="text-sm text-slate-500">PDF, DOC, DOCX, PPT, PPTX, JPG, PNG</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                  disabled={status !== 'draft'}
                  className="hidden"
                />
              </div>

              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg"
                    >
                      <FileText className="w-5 h-5 text-slate-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-900 truncate">{file.file_name}</p>
                        <p className="text-xs text-slate-500">{formatFileSize(file.file_size)}</p>
                      </div>
                      {status === 'draft' && (
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(index)}
                          className="text-red-600 hover:text-red-700 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-6 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPreview(true)}
              >
                <Eye className="w-5 h-5 mr-2" />
                Урьдчилан харах
              </Button>
              {status === 'draft' && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSaveDraft(false)}
                    loading={isSaving}
                    disabled={isSaving || isLoading}
                  >
                    <Save className="w-5 h-5 mr-2" />
                    Ноорог хадгалах
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleSubmit}
                    loading={isLoading}
                    disabled={isSaving || isLoading}
                  >
                    <Send className="w-5 h-5 mr-2" />
                    Илгээх
                  </Button>
                </>
              )}
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
