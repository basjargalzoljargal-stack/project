import { TaskFormData } from './TaskModal';

interface TaskPrintViewProps {
  tasks: TaskFormData[];
  filterLabel: string;
  stats: {
    total: number;
    completed: number;
    overdue: number;
    pending: number;
  };
}

export default function TaskPrintView({ tasks, filterLabel, stats }: TaskPrintViewProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Тодорхойгүй';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Тодорхойгүй';
    return date.toLocaleDateString('mn-MN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

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

  const getPriorityClass = (priority: string) => {
    if (priority === 'Өндөр' || priority === 'high') return 'high';
    if (priority === 'Дунд' || priority === 'medium') return 'medium';
    return 'low';
  };

  return (
    <div style={{ display: 'none' }} className="print-only">
      <div className="print-header">
        <h1>Төлөвлөгөөний тайлан</h1>
        <p>
          <strong>Хугацаа:</strong> {filterLabel}
          <br />
          <strong>Хэвлэсэн огноо:</strong> {new Date().toLocaleDateString('mn-MN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
      </div>

      <div className="print-summary">
        <div className="print-summary-item">
          <div className="print-summary-value">{stats.total}</div>
          <div className="print-summary-label">Нийт</div>
        </div>
        <div className="print-summary-item">
          <div className="print-summary-value">{stats.completed}</div>
          <div className="print-summary-label">Дууссан</div>
        </div>
        <div className="print-summary-item">
          <div className="print-summary-value">{stats.overdue}</div>
          <div className="print-summary-label">Хугацаа хэтэрсэн</div>
        </div>
        <div className="print-summary-item">
          <div className="print-summary-value">{stats.pending}</div>
          <div className="print-summary-label">Хүлээгдэж буй</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style={{ width: '5%' }}>№</th>
            <th style={{ width: '25%' }}>Гарчиг</th>
            <th style={{ width: '30%' }}>Тайлбар</th>
            <th style={{ width: '12%' }}>Эцсийн хугацаа</th>
            <th style={{ width: '10%' }}>Төлөв</th>
            <th style={{ width: '10%' }}>Ач холбогдол</th>
            <th style={{ width: '8%' }}>Баримт</th>
          </tr>
        </thead>
        <tbody>
          {tasks.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>
                Төлөвлөгөө олдсонгүй
              </td>
            </tr>
          ) : (
            tasks.map((task, index) => (
              <tr key={task.id} className="print-avoid-break">
                <td style={{ textAlign: 'center' }}>{index + 1}</td>
                <td><strong>{task.title}</strong></td>
                <td style={{ fontSize: '12px' }}>{task.description || '-'}</td>
                <td>{formatDate(task.dueDate)}</td>
                <td>
                  <span className={`print-badge ${task.completed ? 'completed' : 'pending'}`}>
                    {task.completed ? 'Дууссан' : translateStatus(task.status)}
                  </span>
                </td>
                <td>
                  <span className={`print-badge ${getPriorityClass(task.priority)}`}>
                    {translatePriority(task.priority)}
                  </span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  {task.document_id ? '✓' : '-'}
                  {task.fileName && (
                    <div style={{ fontSize: '10px', marginTop: '2px' }}>
                      {task.fileName}
                    </div>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="print-footer">
        Энэхүү тайлан нь автоматаар үүсгэгдсэн болно.
      </div>
    </div>
  );
}
