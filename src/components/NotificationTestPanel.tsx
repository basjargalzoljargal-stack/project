import { useState } from 'react';
import { Bell, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { createSampleNotifications } from '../utils/notifications';
import Button from './ui/Button';
import Card from './ui/Card';

export default function NotificationTestPanel() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleGenerateSampleNotifications = async () => {
    if (!user?.id) return;

    setLoading(true);
    setMessage('');

    try {
      await createSampleNotifications(user.id);
      setMessage('10 жишээ мэдэгдэл амжилттай үүсгэлээ! Мэдэгдлийн төвийг шалгана уу.');
    } catch (error) {
      console.error('Error generating notifications:', error);
      setMessage('Алдаа гарлаа. Дахин оролдоно уу.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
          <Bell className="w-6 h-6 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Мэдэгдлийн систем турших
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            Мэдэгдлийн системийг турших үүднээс 10 жишээ мэдэгдэл үүсгэх боломжтой.
            Энэ нь өөр өөр төрлийн мэдэгдлүүд агуулна.
          </p>
          <Button
            variant="primary"
            onClick={handleGenerateSampleNotifications}
            disabled={loading}
          >
            <Plus className="w-4 h-4 mr-2" />
            {loading ? 'Үүсгэж байна...' : 'Жишээ мэдэгдэл үүсгэх'}
          </Button>
          {message && (
            <p className={`mt-3 text-sm ${message.includes('амжилттай') ? 'text-green-600' : 'text-red-600'}`}>
              {message}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
