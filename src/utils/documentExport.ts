import html2pdf from 'html2pdf.js';
import * as XLSX from 'xlsx';
import { DocumentFormData } from '../components/DocumentModal';

export type DocumentReportType = 'all' | 'response-required' | 'monthly' | 'overdue' | 'by-category';

export const filterDocumentsByType = (
  documents: DocumentFormData[],
  type: DocumentReportType,
  category?: string
): DocumentFormData[] => {
  const now = new Date();

  switch (type) {
    case 'all':
      return documents;
    case 'response-required':
      return documents.filter(doc => doc.category === 'Response required');
    case 'overdue':
      return documents.filter(doc => {
        if (!doc.deadline || doc.status === 'Completed') return false;
        return new Date(doc.deadline) < now;
      });
    case 'monthly':
      return documents.filter(doc => {
        const docDate = new Date(doc.received_date);
        return docDate.getMonth() === now.getMonth() && docDate.getFullYear() === now.getFullYear();
      });
    case 'by-category':
      return category ? documents.filter(doc => doc.category === category) : documents;
    default:
      return documents;
  }
};

// ✅ ШИНЭ: HTML2PDF ашиглах - Монгол үсэг 100% ажиллана!
export const exportDocumentsToPDF = (
  documents: DocumentFormData[],
  type: DocumentReportType,
  category?: string
) => {
  const filteredDocs = filterDocumentsByType(documents, type, category);

  let title = 'Албан бичгийн тайлан';
  switch (type) {
    case 'all':
      title = 'Бүх албан бичиг';
      break;
    case 'response-required':
      title = 'Хариу өгөх шаардлагатай албан бичиг';
      break;
    case 'overdue':
      title = 'Хугацаа хэтэрсэн албан бичиг';
      break;
    case 'monthly':
      title = `Сарын тайлан - ${new Date().toLocaleDateString('mn-MN', { month: 'long', year: 'numeric' })}`;
      break;
    case 'by-category':
      title = `${category} албан бичиг`;
      break;
  }

  const completedCount = filteredDocs.filter(d => d.status === 'Completed').length;
  const pendingCount = filteredDocs.filter(d => d.status === 'Pending').length;
  const inProgressCount = filteredDocs.filter(d => d.status === 'In Progress').length;
  const overdueCount = filteredDocs.filter(d => {
    if (!d.deadline || d.status === 'Completed') return false;
    return new Date(d.deadline) < new Date();
  }).length;

  // HTML контент үүсгэх
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #000;">
      <div style="border-bottom: 2px solid #111827; padding-bottom: 10px; margin-bottom: 20px;">
        <h1 style="margin: 0 0 10px 0; font-size: 24px; color: #111827;">${title}</h1>
        <div style="color: #6b7280; font-size: 12px;">
          Хэвлэсэн огноо: ${new Date().toLocaleDateString('mn-MN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(${overdueCount > 0 ? '4' : '3'}, 1fr); gap: 10px; margin: 20px 0;">
        <div style="border: 1px solid #d1d5db; padding: 15px; text-align: center; border-radius: 4px;">
          <div style="font-size: 24px; font-weight: bold; color: #111827;">${filteredDocs.length}</div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">Нийт</div>
        </div>
        <div style="border: 1px solid #d1d5db; padding: 15px; text-align: center; border-radius: 4px;">
          <div style="font-size: 24px; font-weight: bold; color: #111827;">${completedCount}</div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">Дууссан</div>
        </div>
        <div style="border: 1px solid #d1d5db; padding: 15px; text-align: center; border-radius: 4px;">
          <div style="font-size: 24px; font-weight: bold; color: #111827;">${inProgressCount + pendingCount}</div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">Хийгдэж байгаа</div>
        </div>
        ${overdueCount > 0 ? `
        <div style="border: 1px solid #d1d5db; padding: 15px; text-align: center; border-radius: 4px;">
          <div style="font-size: 24px; font-weight: bold; color: #111827;">${overdueCount}</div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">Хугацаа хэтэрсэн</div>
        </div>
        ` : ''}
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
          <tr>
            <th style="background-color: #f3f4f6; padding: 12px; text-align: left; border: 1px solid #d1d5db; font-weight: 600; font-size: 11px; width: 5%;">№</th>
            <th style="background-color: #f3f4f6; padding: 12px; text-align: left; border: 1px solid #d1d5db; font-weight: 600; font-size: 11px; width: 15%;">Дугаар</th>
            <th style="background-color: #f3f4f6; padding: 12px; text-align: left; border: 1px solid #d1d5db; font-weight: 600; font-size: 11px; width: 20%;">Илгээгч</th>
            <th style="background-color: #f3f4f6; padding: 12px; text-align: left; border: 1px solid #d1d5db; font-weight: 600; font-size: 11px; width: 35%;">Товч агуулга</th>
            <th style="background-color: #f3f4f6; padding: 12px; text-align: center; border: 1px solid #d1d5db; font-weight: 600; font-size: 11px; width: 15%;">Эцсийн хугацаа</th>
            <th style="background-color: #f3f4f6; padding: 12px; text-align: left; border: 1px solid #d1d5db; font-weight: 600; font-size: 11px; width: 10%;">Төлөв</th>
          </tr>
        </thead>
        <tbody>
          ${filteredDocs.length === 0 ? `
            <tr>
              <td colspan="6" style="text-align: center; padding: 20px; border: 1px solid #d1d5db;">Албан бичиг олдсонгүй</td>
            </tr>
          ` : filteredDocs.map((doc, index) => {
            const isOverdue = doc.deadline && doc.status !== 'Completed' && new Date(doc.deadline) < new Date();
            return `
              <tr>
                <td style="padding: 10px 12px; border: 1px solid #d1d5db; font-size: 10px; text-align: center;">${index + 1}</td>
                <td style="padding: 10px 12px; border: 1px solid #d1d5db; font-size: 10px;">
                  <strong>${doc.document_number}</strong><br/>
                  <span style="font-size: 9px; color: #6b7280;">${new Date(doc.received_date).toLocaleDateString('mn-MN')}</span>
                </td>
                <td style="padding: 10px 12px; border: 1px solid #d1d5db; font-size: 10px;">${doc.sender}</td>
                <td style="padding: 10px 12px; border: 1px solid #d1d5db; font-size: 9px;">${doc.summary}</td>
                <td style="padding: 10px 12px; border: 1px solid #d1d5db; font-size: 10px; text-align: center;">
                  ${doc.deadline ? `<span style="padding: 2px 8px; border-radius: 4px; font-size: 9px; background-color: ${isOverdue ? '#fee2e2' : '#e5e7eb'}; color: ${isOverdue ? '#991b1b' : '#374151'};">${new Date(doc.deadline).toLocaleDateString('mn-MN')}</span>` : '<span style="color: #9ca3af;">-</span>'}
                </td>
                <td style="padding: 10px 12px; border: 1px solid #d1d5db; font-size: 10px;">${doc.status}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Түр element үүсгэх
  const element = document.createElement('div');
  element.innerHTML = htmlContent;
  document.body.appendChild(element);

  // PDF үүсгэх
  const options = {
    margin: 10,
    filename: `documents-${type}-${new Date().toISOString().split('T')[0]}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(options).from(element).save().then(() => {
    document.body.removeChild(element);
  });
};

export const exportDocumentsToExcel = (documents: DocumentFormData[]) => {
  const data = documents.map(doc => ({
    'Received Date': new Date(doc.received_date).toLocaleDateString(),
    'Document Number': doc.document_number,
    'Sender': doc.sender,
    'Summary': doc.summary,
    'Category': doc.category,
    'Status': doc.status,
    'Deadline': doc.deadline ? new Date(doc.deadline).toLocaleDateString() : '',
    'Responsible Person': doc.responsible_person || '',
    'File Name': doc.file_name || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Documents');

  worksheet['!cols'] = [
    { wch: 15 },
    { wch: 20 },
    { wch: 25 },
    { wch: 40 },
    { wch: 20 },
    { wch: 15 },
    { wch: 15 },
    { wch: 20 },
    { wch: 25 },
  ];

  XLSX.writeFile(workbook, `documents-export-${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const printDocuments = (
  documents: DocumentFormData[],
  type: DocumentReportType,
  category?: string
) => {
  const filteredDocs = filterDocumentsByType(documents, type, category);

  let title = 'Албан бичгийн тайлан';
  switch (type) {
    case 'all':
      title = 'Бүх албан бичиг';
      break;
    case 'response-required':
      title = 'Хариу өгөх шаардлагатай албан бичиг';
      break;
    case 'overdue':
      title = 'Хугацаа хэтэрсэн албан бичиг';
      break;
    case 'monthly':
      title = `Сарын тайлан - ${new Date().toLocaleDateString('mn-MN', { month: 'long', year: 'numeric' })}`;
      break;
    case 'by-category':
      title = `${category} албан бичиг`;
      break;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Хэвлэх цонхыг нээх боломжгүй байна. Popup-ыг зөвшөөрнө үү.');
    return;
  }

  const completedCount = filteredDocs.filter(d => d.status === 'Completed').length;
  const pendingCount = filteredDocs.filter(d => d.status === 'Pending').length;
  const inProgressCount = filteredDocs.filter(d => d.status === 'In Progress').length;
  const overdueCount = filteredDocs.filter(d => {
    if (!d.deadline || d.status === 'Completed') return false;
    return new Date(d.deadline) < new Date();
  }).length;

  const htmlContent = `<!DOCTYPE html>
<html lang="mn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4; margin: 20mm; }
    body {
      font-family: Arial, sans-serif;
      padding: 20px;
      color: #000;
      background: #fff;
      line-height: 1.5;
    }
    .header {
      border-bottom: 2px solid #111827;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    h1 {
      margin: 0 0 10px 0;
      font-size: 24px;
      color: #111827;
    }
    .date {
      color: #6b7280;
      font-size: 12px;
      line-height: 1.6;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(${overdueCount > 0 ? '4' : '3'}, 1fr);
      gap: 10px;
      margin: 20px 0;
    }
    .summary-item {
      border: 1px solid #d1d5db;
      padding: 15px;
      text-align: center;
      border-radius: 4px;
    }
    .summary-value {
      font-size: 24px;
      font-weight: bold;
      color: #111827;
    }
    .summary-label {
      font-size: 12px;
      color: #6b7280;
      margin-top: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th {
      background-color: #f3f4f6;
      padding: 12px;
      text-align: left;
      border: 1px solid #d1d5db;
      font-weight: 600;
      font-size: 12px;
      color: #111827;
    }
    td {
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      font-size: 11px;
      vertical-align: top;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 500;
    }
    .completed { background-color: #d1fae5; color: #065f46; }
    .in-progress { background-color: #dbeafe; color: #1e40af; }
    .pending { background-color: #e5e7eb; color: #374151; }
    .overdue { background-color: #fee2e2; color: #991b1b; }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${title}</h1>
    <div class="date">Хэвлэсэн огноо: ${new Date().toLocaleDateString('mn-MN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}</div>
  </div>

  <div class="summary">
    <div class="summary-item">
      <div class="summary-value">${filteredDocs.length}</div>
      <div class="summary-label">Нийт</div>
    </div>
    <div class="summary-item">
      <div class="summary-value">${completedCount}</div>
      <div class="summary-label">Дууссан</div>
    </div>
    <div class="summary-item">
      <div class="summary-value">${inProgressCount + pendingCount}</div>
      <div class="summary-label">Хийгдэж байгаа</div>
    </div>
    ${overdueCount > 0 ? `
    <div class="summary-item">
      <div class="summary-value">${overdueCount}</div>
      <div class="summary-label">Хугацаа хэтэрсэн</div>
    </div>
    ` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 5%">№</th>
        <th style="width: 15%">Дугаар</th>
        <th style="width: 20%">Илгээгч</th>
        <th style="width: 30%">Товч агуулга</th>
        <th style="width: 15%">Эцсийн хугацаа</th>
        <th style="width: 15%">Төлөв</th>
      </tr>
    </thead>
    <tbody>
      ${filteredDocs.length === 0 ? `
        <tr>
          <td colspan="6" style="text-align: center; padding: 20px;">Албан бичиг олдсонгүй</td>
        </tr>
      ` : filteredDocs.map((doc, index) => {
        const isOverdue = doc.deadline && doc.status !== 'Completed' && new Date(doc.deadline) < new Date();
        const statusClass = doc.status.toLowerCase().replace(' ', '-');

        return `
          <tr>
            <td style="text-align: center;">${index + 1}</td>
            <td><strong>${doc.document_number}</strong><br/><span style="font-size: 9px; color: #6b7280;">${new Date(doc.received_date).toLocaleDateString('mn-MN')}</span></td>
            <td>${doc.sender}</td>
            <td style="font-size: 10px;">${doc.summary}</td>
            <td style="text-align: center;">${doc.deadline ? `<span class="badge ${isOverdue ? 'overdue' : ''}">${new Date(doc.deadline).toLocaleDateString('mn-MN')}</span>` : '<span style="color: #9ca3af;">-</span>'}</td>
            <td><span class="badge ${statusClass}">${doc.status}</span></td>
          </tr>
        `;
      }).join('')}
    </tbody>
  </table>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 250);
    };
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
};