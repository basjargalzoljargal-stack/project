import { useState, useEffect } from 'react';
import { Bell, Settings, X, Check, Clock, AlertCircle, MessageCircle, FileText, UserPlus, Megaphone, CheckCircle, XCircle, Edit3, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Button from './ui/Button';
import Card from './ui/Card';
import Badge from './ui/Badge';
import Modal from './ui/Modal';

interface Notification {
  id: string;
  user_id: string;
  type: 'task_assigned' | 'task_due_soon' | 'task_overdue' |
        'task_completed' | 'chat_mention' | 'chat_message' |
        'proposal_approved' | 'proposal_rejected' | 'proposal_needs_revision' |
        'completion_reviewed' | 'added_to_department' | 'system_announcement';
  title: string;
  message: string;
  actor_id?: string;
  actor_name?: string;
  link?: string;
  related_type?: 'task' | 'proposal' | 'completion' | 'chat';
  related_id?: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationSettings {
  id?: string;
  user_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
  task_assigned: boolean;
  task_due_soon: boolean;
  task_overdue: boolean;
  task_completed: boolean;
  chat_messages: boolean;
  chat_mentions_only: boolean;
  proposal_reviewed: boolean;
  completion_reviewed: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  weekend_mode: boolean;
}

type FilterType = 'all' | 'unread' | 'read';

interface NotificationCenterProps {
  onClose?: () => void;
  isDropdown?: boolean;
}

export default function NotificationCenter({ onClose, isDropdown = false }: NotificationCenterProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    user_id: user?.id || '',
    email_notifications: true,
    push_notifications: false,
    task_assigned: true,
    task_due_soon: true,
    task_overdue: true,
    task_completed: false,
    chat_messages: false,
    chat_mentions_only: true,
    proposal_reviewed: true,
    completion_reviewed: true,
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
    weekend_mode: false,
  });

  useEffect(() => {
    loadNotifications();
    loadSettings();

    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    filterNotifications();
  }, [notifications, filter]);

  const loadNotifications = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      if (data) setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const loadSettings = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (data) setSettings(data);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const filterNotifications = () => {
    let filtered = [...notifications];

    if (filter === 'unread') {
      filtered = filtered.filter(n => !n.is_read);
    } else if (filter === 'read') {
      filtered = filtered.filter(n => n.is_read);
    }

    setFilteredNotifications(filtered);
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user?.id)
        .eq('is_read', false);

      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const deleteReadNotifications = async () => {
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user?.id)
        .eq('is_read', true);

      setNotifications(prev => prev.filter(n => !n.is_read));
    } catch (error) {
      console.error('Error deleting read notifications:', error);
    }
  };

  const saveSettings = async () => {
    try {
      const { data: existing } = await supabase
        .from('notification_settings')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('notification_settings')
          .update({
            ...settings,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user?.id);
      } else {
        await supabase
          .from('notification_settings')
          .insert({
            ...settings,
            user_id: user?.id,
          });
      }

      setShowSettings(false);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_assigned':
        return <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center"><Clock className="w-5 h-5 text-blue-600" /></div>;
      case 'task_due_soon':
        return <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center"><AlertCircle className="w-5 h-5 text-orange-600" /></div>;
      case 'task_overdue':
        return <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center"><AlertCircle className="w-5 h-5 text-red-600" /></div>;
      case 'task_completed':
        return <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center"><CheckCircle className="w-5 h-5 text-green-600" /></div>;
      case 'chat_mention':
        return <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center"><MessageCircle className="w-5 h-5 text-purple-600" /></div>;
      case 'chat_message':
        return <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center"><MessageCircle className="w-5 h-5 text-purple-600" /></div>;
      case 'proposal_approved':
        return <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center"><FileText className="w-5 h-5 text-green-600" /></div>;
      case 'proposal_rejected':
        return <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center"><XCircle className="w-5 h-5 text-red-600" /></div>;
      case 'proposal_needs_revision':
        return <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center"><Edit3 className="w-5 h-5 text-yellow-600" /></div>;
      case 'completion_reviewed':
        return <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center"><CheckCircle className="w-5 h-5 text-blue-600" /></div>;
      case 'added_to_department':
        return <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center"><UserPlus className="w-5 h-5 text-indigo-600" /></div>;
      case 'system_announcement':
        return <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center"><Megaphone className="w-5 h-5 text-slate-600" /></div>;
      default:
        return <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center"><Bell className="w-5 h-5 text-slate-600" /></div>;
    }
  };

  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds} секундын өмнө`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} минутын өмнө`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} цагийн өмнө`;
    } else if (diffInSeconds < 172800) {
      return `өчигдөр ${then.getHours()}:${then.getMinutes().toString().padStart(2, '0')}`;
    } else {
      return `${then.getMonth() + 1}/${then.getDate()} ${then.getHours()}:${then.getMinutes().toString().padStart(2, '0')}`;
    }
  };

  const groupNotificationsByDate = () => {
    const groups: { [key: string]: Notification[] } = {
      'Өнөөдөр': [],
      'Өчигдөр': [],
      'Энэ долоо хоног': [],
      'Өмнөх': [],
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    filteredNotifications.forEach(notification => {
      const notifDate = new Date(notification.created_at);
      const notifDay = new Date(notifDate.getFullYear(), notifDate.getMonth(), notifDate.getDate());

      if (notifDay.getTime() === today.getTime()) {
        groups['Өнөөдөр'].push(notification);
      } else if (notifDay.getTime() === yesterday.getTime()) {
        groups['Өчигдөр'].push(notification);
      } else if (notifDay >= weekAgo) {
        groups['Энэ долоо хоног'].push(notification);
      } else {
        groups['Өмнөх'].push(notification);
      }
    });

    return groups;
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const groupedNotifications = groupNotificationsByDate();

  const containerClass = isDropdown
    ? "w-96 max-h-[600px] bg-white rounded-xl shadow-2xl border border-slate-200"
    : "w-full max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200";

  return (
    <div className={containerClass}>
      <div className="sticky top-0 bg-white border-b border-slate-200 p-4 rounded-t-xl z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell className="w-6 h-6 text-slate-900" />
            <h2 className="text-xl font-bold text-slate-900">Мэдэгдэл</h2>
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white">{unreadCount}</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="Тохиргоо"
            >
              <Settings className="w-5 h-5 text-slate-600" />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <Button
            variant={filter === 'all' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            Бүгд
          </Button>
          <Button
            variant={filter === 'unread' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('unread')}
          >
            Уншаагүй {unreadCount > 0 && `(${unreadCount})`}
          </Button>
          <Button
            variant={filter === 'read' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('read')}
          >
            Уншсан
          </Button>
        </div>

        {notifications.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={markAllAsRead}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              disabled={unreadCount === 0}
            >
              Бүгдийг уншсан болгох
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={deleteReadNotifications}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Уншсаныг устгах
            </button>
          </div>
        )}
      </div>

      <div className={isDropdown ? "max-h-[500px] overflow-y-auto" : "max-h-[600px] overflow-y-auto"}>
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            {filter === 'unread' ? (
              <>
                <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Бүх мэдэгдэл уншигдсан</h3>
                <p className="text-slate-500 text-center">Та бүх мэдэгдлээ уншсан байна</p>
              </>
            ) : (
              <>
                <Bell className="w-16 h-16 text-slate-300 mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Мэдэгдэл байхгүй байна</h3>
                <p className="text-slate-500 text-center">Одоогоор мэдэгдэл байхгүй байна</p>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {Object.entries(groupedNotifications).map(([groupName, groupNotifications]) => {
              if (groupNotifications.length === 0) return null;

              return (
                <div key={groupName}>
                  <div className="sticky top-0 bg-slate-50 px-4 py-2 z-5">
                    <h3 className="text-sm font-semibold text-slate-700">{groupName}</h3>
                  </div>

                  {groupNotifications.map(notification => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer ${
                        !notification.is_read ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => {
                        if (!notification.is_read) {
                          markAsRead(notification.id);
                        }
                      }}
                    >
                      <div className="flex gap-3">
                        {getNotificationIcon(notification.type)}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className={`font-semibold text-slate-900 ${!notification.is_read ? 'font-bold' : ''}`}>
                              {notification.title}
                            </h4>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                              className="p-1 hover:bg-slate-200 rounded transition-colors flex-shrink-0"
                              title="Устгах"
                            >
                              <X className="w-4 h-4 text-slate-400" />
                            </button>
                          </div>

                          <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                            {notification.message}
                          </p>

                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            {notification.actor_name && (
                              <>
                                <span className="font-medium">{notification.actor_name}</span>
                                <span>•</span>
                              </>
                            )}
                            <span>{getRelativeTime(notification.created_at)}</span>
                            {!notification.is_read && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-blue-600 font-medium">
                                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                  Шинэ
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showSettings && (
        <Modal onClose={() => setShowSettings(false)} size="lg">
          <div className="max-h-[600px] overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Мэдэгдлийн тохиргоо</h3>

            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-slate-900 mb-3">Мэдэгдэл хүлээн авах сувгууд</h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={true}
                      disabled
                      className="rounded"
                    />
                    <span className="text-slate-700">Апп дотроос</span>
                    <Badge className="bg-green-100 text-green-800 text-xs">Идэвхтэй</Badge>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.email_notifications}
                      onChange={(e) => setSettings(prev => ({ ...prev, email_notifications: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-slate-700">Email</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.push_notifications}
                      onChange={(e) => setSettings(prev => ({ ...prev, push_notifications: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-slate-700">Browser push</span>
                  </label>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-6">
                <h4 className="font-semibold text-slate-900 mb-3">Төрлөөр тохируулах</h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.task_assigned}
                      onChange={(e) => setSettings(prev => ({ ...prev, task_assigned: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-slate-700">Ажил хуваарилагдсан</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.task_due_soon}
                      onChange={(e) => setSettings(prev => ({ ...prev, task_due_soon: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-slate-700">Хугацаа ойртох (24 цагийн өмнө)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.task_overdue}
                      onChange={(e) => setSettings(prev => ({ ...prev, task_overdue: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-slate-700">Хугацаа хэтэрсэн</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.task_completed}
                      onChange={(e) => setSettings(prev => ({ ...prev, task_completed: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-slate-700">Ажил дууссан</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.chat_mentions_only}
                      onChange={(e) => setSettings(prev => ({ ...prev, chat_mentions_only: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-slate-700">Чат мессеж (зөвхөн @mention)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.chat_messages}
                      onChange={(e) => setSettings(prev => ({ ...prev, chat_messages: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-slate-700">Чат мессеж (бүх)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.proposal_reviewed}
                      onChange={(e) => setSettings(prev => ({ ...prev, proposal_reviewed: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-slate-700">Төсөл санал шийдэгдсэн</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.completion_reviewed}
                      onChange={(e) => setSettings(prev => ({ ...prev, completion_reviewed: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-slate-700">Биелэлт хянагдсан</span>
                  </label>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-6">
                <h4 className="font-semibold text-slate-900 mb-3">Тайван цаг</h4>
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={settings.quiet_hours_enabled}
                    onChange={(e) => setSettings(prev => ({ ...prev, quiet_hours_enabled: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-slate-700">Идэвхжүүлэх</span>
                </label>

                {settings.quiet_hours_enabled && (
                  <div className="grid grid-cols-2 gap-4 ml-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Эхлэх</label>
                      <input
                        type="time"
                        value={settings.quiet_hours_start}
                        onChange={(e) => setSettings(prev => ({ ...prev, quiet_hours_start: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Дуусах</label>
                      <input
                        type="time"
                        value={settings.quiet_hours_end}
                        onChange={(e) => setSettings(prev => ({ ...prev, quiet_hours_end: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 pt-6">
                <h4 className="font-semibold text-slate-900 mb-3">Амралтын өдөр</h4>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.weekend_mode}
                    onChange={(e) => setSettings(prev => ({ ...prev, weekend_mode: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-slate-700">Бямба/Ням гаригт мэдэгдэл өгөхгүй</span>
                </label>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-6 mt-6 border-t border-slate-200">
              <Button variant="outline" onClick={() => setShowSettings(false)}>
                Цуцлах
              </Button>
              <Button variant="primary" onClick={saveSettings}>
                Хадгалах
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
