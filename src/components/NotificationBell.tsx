import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import NotificationCenter from './NotificationCenter';
import Badge from './ui/Badge';

export default function NotificationBell() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadUnreadCount();

    const interval = setInterval(loadUnreadCount, 30000);

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      clearInterval(interval);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadUnreadCount = async () => {
    if (!user?.id) return;

    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
        title="Мэдэгдэл"
      >
        <Bell className="w-6 h-6 text-slate-700" />
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1">
            <Badge className="bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[20px] h-5 flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
            <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
          </div>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 top-full mt-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <NotificationCenter
            onClose={() => setShowDropdown(false)}
            isDropdown={true}
          />
        </div>
      )}
    </div>
  );
}
