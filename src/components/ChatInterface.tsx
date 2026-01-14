import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Search, Settings, Send, Paperclip, Smile, MoreVertical, Pin, Edit2, Trash2, Reply, Check, CheckCheck, Users, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Button from './ui/Button';
import Card from './ui/Card';
import Badge from './ui/Badge';
import Input from './ui/Input';
import Modal from './ui/Modal';

interface ChatRoom {
  id: string;
  name: string;
  type: 'department' | 'project' | 'direct' | 'custom';
  department_id?: string;
  project_id?: string;
  avatar_url?: string;
  color?: string;
  description?: string;
  is_announcement_only: boolean;
  member_count?: number;
  unread_count?: number;
  last_message?: {
    message: string;
    user_name: string;
    created_at: string;
  };
  is_pinned: boolean;
}

interface ChatMember {
  id: string;
  user_id: string;
  role: 'admin' | 'member';
  user: {
    full_name: string;
    email: string;
    avatar_url?: string;
  };
  joined_at: string;
}

interface Message {
  id: string;
  room_id: string;
  user_id: string;
  message: string;
  message_type: 'text' | 'file' | 'system';
  reply_to_id?: string;
  reply_to?: Message;
  mentions?: string[];
  is_pinned: boolean;
  is_edited: boolean;
  created_at: string;
  user: {
    full_name: string;
    avatar_url?: string;
  };
  reactions?: { emoji: string; count: number; users: string[] }[];
}

interface ChatInterfaceProps {
  onBack: () => void;
}

export default function ChatInterface({ onBack }: ChatInterfaceProps) {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<ChatMember[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'department' | 'project' | 'direct'>('all');
  const [showSettings, setShowSettings] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadRooms();
  }, []);

  useEffect(() => {
    if (activeRoom) {
      loadMessages(activeRoom.id);
      loadMembers(activeRoom.id);
      markAsRead(activeRoom.id);
    }
  }, [activeRoom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadRooms = async () => {
    try {
      const { data: memberships } = await supabase
        .from('chat_members')
        .select('room_id, is_pinned')
        .eq('user_id', user?.id);

      if (!memberships) return;

      const roomIds = memberships.map(m => m.room_id);
      const { data: roomsData } = await supabase
        .from('chat_rooms')
        .select('*')
        .in('id', roomIds);

      if (!roomsData) return;

      const roomsWithData = await Promise.all(
        roomsData.map(async (room) => {
          const { count: memberCount } = await supabase
            .from('chat_members')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', room.id);

          const { data: lastMsg } = await supabase
            .from('chat_messages')
            .select(`
              message,
              created_at,
              user:user_profiles!user_id(full_name)
            `)
            .eq('room_id', room.id)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const membership = memberships.find(m => m.room_id === room.id);

          const { count: unreadCount } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', room.id)
            .gt('created_at', membership ? (await supabase
              .from('chat_members')
              .select('last_read_at')
              .eq('room_id', room.id)
              .eq('user_id', user?.id)
              .single()).data?.last_read_at || '1970-01-01' : '1970-01-01');

          return {
            ...room,
            member_count: memberCount || 0,
            unread_count: unreadCount || 0,
            last_message: lastMsg ? {
              message: lastMsg.message,
              user_name: Array.isArray(lastMsg.user) ? lastMsg.user[0]?.full_name : lastMsg.user?.full_name,
              created_at: lastMsg.created_at,
            } : undefined,
            is_pinned: membership?.is_pinned || false,
          };
        })
      );

      roomsWithData.sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
        const aTime = a.last_message?.created_at || a.created_at;
        const bTime = b.last_message?.created_at || b.created_at;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      setRooms(roomsWithData);
    } catch (error) {
      console.error('Error loading rooms:', error);
    }
  };

  const loadMessages = async (roomId: string) => {
    try {
      const { data } = await supabase
        .from('chat_messages')
        .select(`
          *,
          user:user_profiles!user_id(full_name, avatar_url),
          reply_to:chat_messages!reply_to_id(
            id,
            message,
            user:user_profiles!user_id(full_name)
          )
        `)
        .eq('room_id', roomId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (data) {
        const messagesWithReactions = await Promise.all(
          data.map(async (msg: any) => {
            const { data: reactions } = await supabase
              .from('chat_reactions')
              .select('emoji, user_id')
              .eq('message_id', msg.id);

            const reactionMap = new Map<string, { count: number; users: string[] }>();
            reactions?.forEach(r => {
              if (reactionMap.has(r.emoji)) {
                const current = reactionMap.get(r.emoji)!;
                current.count++;
                current.users.push(r.user_id);
              } else {
                reactionMap.set(r.emoji, { count: 1, users: [r.user_id] });
              }
            });

            return {
              ...msg,
              user: Array.isArray(msg.user) ? msg.user[0] : msg.user,
              reply_to: msg.reply_to ? (Array.isArray(msg.reply_to) ? msg.reply_to[0] : msg.reply_to) : undefined,
              reactions: Array.from(reactionMap.entries()).map(([emoji, data]) => ({
                emoji,
                ...data,
              })),
            };
          })
        );

        setMessages(messagesWithReactions);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const loadMembers = async (roomId: string) => {
    try {
      const { data } = await supabase
        .from('chat_members')
        .select(`
          *,
          user:user_profiles!user_id(full_name, email, avatar_url)
        `)
        .eq('room_id', roomId);

      if (data) {
        setMembers(data.map((m: any) => ({
          ...m,
          user: Array.isArray(m.user) ? m.user[0] : m.user,
        })));
      }
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const markAsRead = async (roomId: string) => {
    await supabase
      .from('chat_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('room_id', roomId)
      .eq('user_id', user?.id);

    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, unread_count: 0 } : r));
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeRoom || !user) return;

    const messageText = editingMessage ? newMessage : (replyTo ? `@${replyTo.user.full_name} ${newMessage}` : newMessage);
    const mentions = extractMentions(messageText);

    try {
      if (editingMessage) {
        await supabase
          .from('chat_messages')
          .update({
            message: newMessage,
            is_edited: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingMessage.id);

        setEditingMessage(null);
      } else {
        await supabase
          .from('chat_messages')
          .insert({
            room_id: activeRoom.id,
            user_id: user.id,
            message: messageText,
            message_type: 'text',
            reply_to_id: replyTo?.id,
            mentions,
          });

        setReplyTo(null);
      }

      setNewMessage('');
      loadMessages(activeRoom.id);
      loadRooms();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      const mentionedUser = members.find(m => m.user.full_name.includes(match[1]));
      if (mentionedUser) {
        mentions.push(mentionedUser.user_id);
      }
    }

    return mentions;
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;

    const existingReaction = messages
      .find(m => m.id === messageId)
      ?.reactions?.find(r => r.emoji === emoji && r.users.includes(user.id));

    if (existingReaction) {
      await supabase
        .from('chat_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji);
    } else {
      await supabase
        .from('chat_reactions')
        .insert({
          message_id: messageId,
          user_id: user.id,
          emoji,
        });
    }

    loadMessages(activeRoom!.id);
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!window.confirm('Мессеж устгах уу?')) return;

    await supabase
      .from('chat_messages')
      .update({ is_deleted: true })
      .eq('id', messageId);

    loadMessages(activeRoom!.id);
  };

  const handlePinMessage = async (messageId: string, isPinned: boolean) => {
    await supabase
      .from('chat_messages')
      .update({ is_pinned: !isPinned })
      .eq('id', messageId);

    loadMessages(activeRoom!.id);
  };

  const handleTogglePinRoom = async (roomId: string, isPinned: boolean) => {
    await supabase
      .from('chat_members')
      .update({ is_pinned: !isPinned })
      .eq('room_id', roomId)
      .eq('user_id', user?.id);

    loadRooms();
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Өнөөдөр';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Өчигдөр';
    } else {
      return date.toLocaleDateString('mn-MN');
    }
  };

  const getFilteredRooms = () => {
    let filtered = rooms;

    if (filterType !== 'all') {
      filtered = filtered.filter(r => r.type === filterType);
    }

    if (searchTerm) {
      filtered = filtered.filter(r =>
        r.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const getRoomIcon = (room: ChatRoom) => {
    switch (room.type) {
      case 'department':
        return '📁';
      case 'project':
        return '📊';
      case 'direct':
        return '👤';
      default:
        return '💬';
    }
  };

  const groupMessagesByDate = () => {
    const grouped: { [key: string]: Message[] } = {};

    messages.forEach(msg => {
      const dateKey = formatDate(msg.created_at);
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(msg);
    });

    return grouped;
  };

  const isMyMessage = (msg: Message) => msg.user_id === user?.id;

  const getMemberRole = (userId: string) => {
    return members.find(m => m.user_id === userId)?.role;
  };

  const isAdmin = getMemberRole(user?.id || '') === 'admin';

  const emojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex h-screen">
        <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <Button variant="outline" size="sm" onClick={onBack}>
                <ChevronLeft className="w-5 h-5 mr-1" />
                Буцах
              </Button>
              <h2 className="text-xl font-bold text-slate-900">Чат</h2>
            </div>

            <Input
              placeholder="Хайх..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="w-5 h-5" />}
            />

            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  filterType === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Бүгд
              </button>
              <button
                onClick={() => setFilterType('department')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  filterType === 'department'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Хэлтэс
              </button>
              <button
                onClick={() => setFilterType('project')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  filterType === 'project'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Төсөл
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {getFilteredRooms().map((room) => (
              <div
                key={room.id}
                onClick={() => setActiveRoom(room)}
                className={`p-4 border-b border-slate-100 cursor-pointer transition-colors ${
                  activeRoom?.id === room.id ? 'bg-blue-50' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ backgroundColor: room.color + '20' }}
                  >
                    {getRoomIcon(room)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-slate-900 truncate">
                        {room.name}
                        {room.is_pinned && <Pin className="w-3 h-3 inline ml-1 text-blue-600" />}
                      </h3>
                      {room.unread_count > 0 && (
                        <Badge className="bg-red-500 text-white text-xs">
                          {room.unread_count}
                        </Badge>
                      )}
                    </div>
                    {room.last_message && (
                      <p className="text-sm text-slate-600 truncate">
                        {room.last_message.user_name}: {room.last_message.message}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                      {room.last_message ? formatTime(room.last_message.created_at) : formatTime(room.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          {activeRoom ? (
            <>
              <div className="bg-white border-b border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                      style={{ backgroundColor: activeRoom.color + '20' }}
                    >
                      {getRoomIcon(activeRoom)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{activeRoom.name}</h3>
                      <p className="text-sm text-slate-600">
                        <Users className="w-3 h-3 inline mr-1" />
                        {activeRoom.member_count} гишүүд
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTogglePinRoom(activeRoom.id, activeRoom.is_pinned)}
                    >
                      <Pin className={`w-4 h-4 ${activeRoom.is_pinned ? 'text-blue-600' : ''}`} />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {Object.entries(groupMessagesByDate()).map(([date, dateMessages]) => (
                  <div key={date}>
                    <div className="flex items-center justify-center my-4">
                      <span className="px-3 py-1 bg-slate-200 rounded-full text-xs text-slate-600">
                        {date}
                      </span>
                    </div>
                    {dateMessages.map((msg, idx) => {
                      const showAvatar = idx === 0 || dateMessages[idx - 1].user_id !== msg.user_id;
                      const isMine = isMyMessage(msg);

                      return (
                        <div
                          key={msg.id}
                          className={`flex gap-3 ${isMine ? 'flex-row-reverse' : ''} ${showAvatar ? 'mt-4' : 'mt-1'}`}
                        >
                          {showAvatar && !isMine && (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                              {msg.user.avatar_url ? (
                                <img src={msg.user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                              ) : (
                                msg.user.full_name.charAt(0).toUpperCase()
                              )}
                            </div>
                          )}
                          {!showAvatar && !isMine && <div className="w-8"></div>}

                          <div className={`flex-1 ${isMine ? 'flex flex-col items-end' : ''}`}>
                            {showAvatar && !isMine && (
                              <p className="text-sm font-semibold text-slate-900 mb-1">
                                {msg.user.full_name}
                                {getMemberRole(msg.user_id) === 'admin' && (
                                  <Badge className="ml-2 text-xs bg-yellow-100 text-yellow-800">Админ</Badge>
                                )}
                              </p>
                            )}

                            {msg.reply_to && (
                              <div className="mb-1 p-2 bg-slate-100 rounded-lg text-xs text-slate-600 border-l-2 border-blue-500">
                                <p className="font-semibold">{msg.reply_to.user?.full_name}</p>
                                <p className="truncate">{msg.reply_to.message}</p>
                              </div>
                            )}

                            <div className="group relative">
                              <div
                                className={`inline-block px-4 py-2 rounded-2xl ${
                                  isMine
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-100 text-slate-900'
                                } ${msg.is_pinned ? 'border-2 border-yellow-400' : ''}`}
                              >
                                <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                                {msg.is_edited && (
                                  <span className="text-xs opacity-70 ml-2">(засварласан)</span>
                                )}
                              </div>

                              <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : ''}`}>
                                <span className="text-xs text-slate-500">{formatTime(msg.created_at)}</span>
                                {isMine && (
                                  <CheckCheck className="w-3 h-3 text-blue-600" />
                                )}
                              </div>

                              <div className={`absolute ${isMine ? 'left-0' : 'right-0'} top-0 hidden group-hover:flex items-center gap-1 bg-white shadow-lg rounded-lg p-1`}>
                                {emojis.map(emoji => (
                                  <button
                                    key={emoji}
                                    onClick={() => handleReaction(msg.id, emoji)}
                                    className="hover:bg-slate-100 rounded p-1 text-lg"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                                <button
                                  onClick={() => setReplyTo(msg)}
                                  className="hover:bg-slate-100 rounded p-1"
                                >
                                  <Reply className="w-4 h-4" />
                                </button>
                                {isMine && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setEditingMessage(msg);
                                        setNewMessage(msg.message);
                                        messageInputRef.current?.focus();
                                      }}
                                      className="hover:bg-slate-100 rounded p-1"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteMessage(msg.id)}
                                      className="hover:bg-slate-100 rounded p-1 text-red-600"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                                {isAdmin && (
                                  <button
                                    onClick={() => handlePinMessage(msg.id, msg.is_pinned)}
                                    className="hover:bg-slate-100 rounded p-1"
                                  >
                                    <Pin className={`w-4 h-4 ${msg.is_pinned ? 'text-yellow-600' : ''}`} />
                                  </button>
                                )}
                              </div>

                              {msg.reactions && msg.reactions.length > 0 && (
                                <div className="flex gap-1 mt-1">
                                  {msg.reactions.map((reaction, ridx) => (
                                    <button
                                      key={ridx}
                                      onClick={() => handleReaction(msg.id, reaction.emoji)}
                                      className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 ${
                                        reaction.users.includes(user?.id || '')
                                          ? 'bg-blue-100 border border-blue-300'
                                          : 'bg-slate-100 hover:bg-slate-200'
                                      }`}
                                    >
                                      <span>{reaction.emoji}</span>
                                      <span>{reaction.count}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="bg-white border-t border-slate-200 p-4">
                {replyTo && (
                  <div className="mb-2 p-2 bg-blue-50 rounded-lg flex items-center justify-between">
                    <div className="text-sm">
                      <p className="font-semibold text-blue-900">Хариулах: {replyTo.user.full_name}</p>
                      <p className="text-blue-700 truncate">{replyTo.message}</p>
                    </div>
                    <button onClick={() => setReplyTo(null)} className="text-blue-600 hover:text-blue-700">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {editingMessage && (
                  <div className="mb-2 p-2 bg-yellow-50 rounded-lg flex items-center justify-between">
                    <div className="text-sm">
                      <p className="font-semibold text-yellow-900">Засварлаж байна</p>
                    </div>
                    <button onClick={() => { setEditingMessage(null); setNewMessage(''); }} className="text-yellow-600 hover:text-yellow-700">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <textarea
                      ref={messageInputRef}
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value);
                        const lastChar = e.target.value.slice(-1);
                        if (lastChar === '@') {
                          setShowMentions(true);
                        }
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Мессеж бичих... (@username дуудах)"
                      rows={2}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                  <Button
                    variant="primary"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-12 h-12 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Чат сонгоно уу</h3>
                <p className="text-slate-600">Харилцах хэлтэс эсвэл хүнээ сонгоно уу</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showSettings && activeRoom && (
        <Modal onClose={() => setShowSettings(false)} size="lg">
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900">Чатын тохиргоо</h3>

            <Card className="bg-slate-50">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                    style={{ backgroundColor: activeRoom.color + '20' }}
                  >
                    {getRoomIcon(activeRoom)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{activeRoom.name}</h4>
                    <p className="text-sm text-slate-600">{activeRoom.type === 'department' ? 'Хэлтэсийн чат' : 'Чат'}</p>
                  </div>
                </div>
                {activeRoom.description && (
                  <p className="text-sm text-slate-700">{activeRoom.description}</p>
                )}
              </div>
            </Card>

            <div>
              <h4 className="font-semibold text-slate-900 mb-3">Гишүүд ({members.length})</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                        {member.user.avatar_url ? (
                          <img src={member.user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          member.user.full_name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{member.user.full_name}</p>
                        <p className="text-xs text-slate-500">{member.user.email}</p>
                      </div>
                    </div>
                    {member.role === 'admin' && (
                      <Badge className="bg-yellow-100 text-yellow-800 text-xs">Админ</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowSettings(false)}>
                Хаах
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
