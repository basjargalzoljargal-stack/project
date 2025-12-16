import { useState, useRef, useEffect } from 'react';
import { Download, Printer, FileText, Table } from 'lucide-react';
import { TaskFormData } from './TaskModal';
import { exportTasksToPDF, exportTasksToExcel, printFilteredTasks } from '../utils/taskExport';

interface TaskExportMenuProps {
  tasks: TaskFormData[];
  filteredTasks: TaskFormData[];
  filterLabel: string;
  stats: {
    total: number;
    completed: number;
    overdue: number;
    pending: number;
  };
}

export default function TaskExportMenu({ tasks, filteredTasks, filterLabel, stats }: TaskExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePrint = () => {
    printFilteredTasks(filteredTasks, filterLabel, stats);
    setIsOpen(false);
  };

  const handleExportPDF = () => {
    exportTasksToPDF(filteredTasks, filterLabel, stats);
    setIsOpen(false);
  };

  const handleExportExcel = () => {
    exportTasksToExcel(tasks);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
      >
        <Download className="w-4 h-4" />
        Export / Print
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50">
          <div className="px-3 py-2 border-b border-slate-200">
            <p className="text-xs font-semibold text-slate-700 uppercase">Current Filter</p>
            <p className="text-xs text-slate-500 mt-1">{filterLabel}</p>
          </div>

          <button
            onClick={handlePrint}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Хэвлэх
          </button>

          <button
            onClick={handleExportPDF}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <FileText className="w-4 h-4" />
            PDF татах
          </button>

          <div className="px-3 py-2 border-b border-t border-slate-200 mt-2">
            <p className="text-xs font-semibold text-slate-700 uppercase">Excel Export</p>
          </div>

          <button
            onClick={handleExportExcel}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Table className="w-4 h-4" />
            Бүх төлөвлөгөө (Excel)
          </button>
        </div>
      )}
    </div>
  );
}
