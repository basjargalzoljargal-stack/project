import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { TaskFormData } from '../components/TaskModal';

export type TaskReportPeriod = 'daily' | 'weekly' | 'monthly';

export const filterTasksByPeriod = (tasks: TaskFormData[], period: TaskReportPeriod): TaskFormData[] => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return tasks.filter(task => {
    if (!task.dueDate) return false;
    const taskDate = new Date(task.dueDate);
    const taskDay = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());

    switch (period) {
      case 'daily':
        return taskDay.getTime() === today.getTime();
      case 'weekly':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return taskDay >= weekStart && taskDay <= weekEnd;
      case 'monthly':
        return taskDate.getMonth() === now.getMonth() && taskDate.getFullYear() === now.getFullYear();
      default:
        return false;
    }
  });
};

export const exportTasksToPDF = (
  tasks: TaskFormData[],
  filterLabel: string,
  stats: { total: number; completed: number; overdue: number; pending: number }
) => {
  const doc = new jsPDF();

  // ✅ ШИНЭ: Times фонт ашиглах (Cyrillic дэмжинэ)
  doc.setFont('times', 'normal');

  doc.setFontSize(18);
  doc.text('Ажлын төлөвлөгөө', 14, 20);

  doc.setFontSize(10);
  doc.text(`Хугацаа: ${filterLabel}`, 14, 28);
  doc.text(`Хэвлэсэн огноо: ${new Date().toLocaleDateString('mn-MN')}`, 14, 34);

  doc.setFontSize(12);
  doc.text('Нэгтгэл:', 14, 44);
  doc.setFontSize(10);
  doc.text(`Нийт: ${stats.total}`, 14, 51);
  doc.text(`Дууссан: ${stats.completed}`, 14, 57);
  doc.text(`Хугацаа хэтэрсэн: ${stats.overdue}`, 14, 63);
  doc.text(`Хүлээгдэж буй: ${stats.pending}`, 14, 69);

  const translateStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      'Төлөвлөсөн': 'Төлөвлөсөн',
      'Хийгдэж байна': 'Хийгдэж байна',
      'Дууссан': 'Дууссан',
      'Хойшлуулсан': 'Хойшлуулсан',
      'Planned': 'Төлөвлөсөн',
      'In progress': 'Хийгдэж байна',
      'Completed': 'Дууссан',
      'Postponed': 'Хойшлуулсан'
    };
    return statusMap[status] || status;
  };

  const translatePriority = (priority: string) => {
    const priorityMap: Record<string, string> = {
      'Өндөр': 'Өндөр',
      'Дунд': 'Дунд',
      'Бага': 'Бага',
      'high': 'Өндөр',
      'medium': 'Дунд',
      'low': 'Бага'
    };
    return priorityMap[priority] || priority;
  };

  const tableData = tasks.map((task, index) => [
    (index + 1).toString(),
    task.title,
    task.dueDate ? new Date(task.dueDate).toLocaleDateString('mn-MN') : 'Тодорхойгүй',
    task.completed ? 'Дууссан' : translateStatus(task.status),
  ]);

  autoTable(doc, {
    startY: 76,
    head: [['№', 'Төлөвлөгөөний нэр', 'Биелэх огноо', 'Төлөв']],
    body: tableData,
    theme: 'grid',
    headStyles: { 
      fillColor: [15, 23, 42],
      font: 'times', // ✅ Cyrillic дэмжих фонт
      fontStyle: 'bold'
    },
    styles: { 
      fontSize: 9,
      font: 'times' // ✅ Cyrillic дэмжих фонт
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 90 },
      2: { cellWidth: 40 },
      3: { cellWidth: 40 },
    },
  });

  doc.save(`tasks-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportTasksToExcel = (tasks: TaskFormData[]) => {
  const data = tasks.map(task => ({
    'Due Date': task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '',
    'Due Time': task.dueDate ? new Date(task.dueDate).toLocaleTimeString() : '',
    'Created Date': task.createdAt ? new Date(task.createdAt).toLocaleDateString() : '',
    Title: task.title,
    Description: task.description || '',
    Category: task.category || 'General',
    Priority: task.priority || 'low',
    Status: task.status || (task.completed ? 'Completed' : 'Pending'),
    Completed: task.completed ? 'Yes' : 'No',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Tasks');

  worksheet['!cols'] = [
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 30 },
    { wch: 40 },
    { wch: 15 },
    { wch: 10 },
    { wch: 15 },
    { wch: 10 },
  ];

  XLSX.writeFile(workbook, `tasks-export-${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const printTasks = (tasks: TaskFormData[], period: TaskReportPeriod) => {
  const filteredTasks = filterTasksByPeriod(tasks, period);
  const periodLabel = period.charAt(0).toUpperCase() + period.slice(1);

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const completedCount = filteredTasks.filter(t => t.completed).length;
  const pendingCount = filteredTasks.filter(t => !t.completed).length;
  const highPriorityCount = filteredTasks.filter(t => t.priority === 'high').length;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${periodLabel} Tasks Report</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .header { border-bottom: 2px solid #111827; padding-bottom: 10px; margin-bottom: 20px; }
        h1 { margin: 0; font-size: 24px; }
        .date { color: #6b7280; font-size: 12px; margin-top: 5px; }
        .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 20px 0; }
        .summary-item { border: 1px solid #d1d5db; padding: 15px; text-align: center; border-radius: 4px; }
        .summary-value { font-size: 24px; font-weight: bold; }
        .summary-label { font-size: 12px; color: #6b7280; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background-color: #f3f4f6; padding: 12px; text-align: left; border: 1px solid #d1d5db; font-weight: 600; }
        td { padding: 10px 12px; border: 1px solid #d1d5db; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; }
        .high { background-color: #fee2e2; color: #991b1b; }
        .medium { background-color: #fed7aa; color: #9a3412; }
        .low { background-color: #e5e7eb; color: #374151; }
        .completed { background-color: #d1fae5; color: #065f46; }
        .pending { background-color: #e5e7eb; color: #374151; }
        .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #d1d5db; font-size: 12px; color: #6b7280; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${periodLabel} Tasks Report</h1>
        <div class="date">Generated on: ${new Date().toLocaleDateString()}</div>
      </div>

      <div class="summary">
        <div class="summary-item">
          <div class="summary-value">${filteredTasks.length}</div>
          <div class="summary-label">Total Tasks</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${completedCount}</div>
          <div class="summary-label">Completed</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${pendingCount}</div>
          <div class="summary-label">Pending</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${highPriorityCount}</div>
          <div class="summary-label">High Priority</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Time</th>
            <th>Task</th>
            <th>Category</th>
            <th>Priority</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${filteredTasks.map(task => `
            <tr>
              <td>${new Date(task.dueDate || '').toLocaleDateString()}</td>
              <td>${new Date(task.dueDate || '').toLocaleTimeString()}</td>
              <td>${task.title}</td>
              <td>${task.category || 'General'}</td>
              <td><span class="badge ${task.priority}">${task.priority || 'low'}</span></td>
              <td><span class="badge ${task.completed ? 'completed' : 'pending'}">${task.completed ? 'Completed' : 'Pending'}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer">
        <p>Personal Planner - Tasks Report</p>
      </div>
    </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 250);
};

export const printFilteredTasks = (
  tasks: TaskFormData[],
  filterLabel: string,
  stats: { total: number; completed: number; overdue: number; pending: number }
) => {
  window.dispatchEvent(new CustomEvent('triggerPrint', {
    detail: { tasks, filterLabel, stats }
  }));
};