import { useState, useEffect } from 'react';

export default function AdminPage({ onBack }: { onBack: () => void }) {
  const [message, setMessage] = useState('Ачааллаж байна...');

  useEffect(() => {
    fetch('https://my-website-backend-3yoe.onrender.com/admin/users')
      .then(r => r.json())
      .then(d => setMessage(JSON.stringify(d, null, 2)))
      .catch(e => setMessage('Алдаа: ' + e.message));
  }, []);

  return (
    <div style={{ padding: 20, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <button 
        onClick={onBack}
        style={{ marginBottom: 20, padding: '10px 20px', cursor: 'pointer' }}
      >
        ← Буцах
      </button>
      
      <h1>Админ Панель</h1>
      
      <pre style={{ backgroundColor: 'white', padding: 20, borderRadius: 8 }}>
        {message}
      </pre>
    </div>
  );
}