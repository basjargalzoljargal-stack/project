import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';

const API_URL = "https://my-website-backend-3yoe.onrender.com";

export default function AdminPage({ onBack }: { onBack: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch(`${API_URL}/admin/users`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) return <div className="p-8">Ачааллаж байна...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <button onClick={onBack} className="mb-4 px-4 py-2 bg-white border rounded-lg flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Буцах
        </button>
        
        <h1 className="text-3xl font-bold mb-6">Админ Панель</h1>
        
        <pre className="bg-white p-4 rounded-lg">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );
}