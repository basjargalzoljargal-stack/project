import { Home, FileText, Calendar, Settings, LogOut, Shield, PlusCircle, FolderOpen, CheckSquare, UserCheck, ClipboardCheck, MessageCircle, BarChart3, ListChecks, FileBarChart, Users, Building2 } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  userRole?: string | null;
  onAdminClick?: () => void;
  onNewProposalClick?: () => void;
  onMyProposalsClick?: () => void;
  onProposalReviewClick?: () => void;
  onAssignmentsClick?: () => void;
  onCompletionsReviewClick?: () => void;
  onChatClick?: () => void;
  onAdvancedCalendarClick?: () => void;
  onAdminDashboardClick?: () => void;
  onCompletionsClick?: () => void;
  onReportsClick?: () => void;
  onUserManagementClick?: () => void;
  onDepartmentManagementClick?: () => void;
}

export default function Sidebar({ activeTab, onTabChange, onLogout, userRole, onAdminClick, onNewProposalClick, onMyProposalsClick, onProposalReviewClick, onAssignmentsClick, onCompletionsReviewClick, onChatClick, onAdvancedCalendarClick, onAdminDashboardClick, onCompletionsClick, onReportsClick, onUserManagementClick, onDepartmentManagementClick }: SidebarProps) {
  const menuItems = [
    { id: 'home', label: 'Нүүр', icon: Home },
    { id: 'documents', label: 'Албан бичиг', icon: FileText },
    { id: 'settings', label: 'Тохиргоо', icon: Settings },
  ];

  const handleChatClick = () => {
    if (onChatClick) {
      onChatClick();
    }
  };

  const handleAdvancedCalendarClick = () => {
    if (onAdvancedCalendarClick) {
      onAdvancedCalendarClick();
    }
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-slate-200 flex flex-col">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
            <Home className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900">Төлөвлөгөө</h1>
            <p className="text-xs text-slate-500">Эмх цэгцтэй байна</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 pt-6 border-t border-slate-200">
          <p className="px-4 text-xs font-semibold text-slate-500 uppercase mb-2">Төсөл санал</p>
          <ul className="space-y-1">
            {onNewProposalClick && (
              <li>
                <button
                  onClick={onNewProposalClick}
                  className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <PlusCircle className="w-5 h-5" />
                  <span className="font-medium">Шинэ санал</span>
                </button>
              </li>
            )}
            {onMyProposalsClick && (
              <li>
                <button
                  onClick={onMyProposalsClick}
                  className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <FolderOpen className="w-5 h-5" />
                  <span className="font-medium">Миний саналууд</span>
                </button>
              </li>
            )}
            {(userRole === 'admin' || userRole === 'manager') && onProposalReviewClick && (
              <li>
                <button
                  onClick={onProposalReviewClick}
                  className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <CheckSquare className="w-5 h-5" />
                  <span className="font-medium">Саналууд хянах</span>
                </button>
              </li>
            )}
          </ul>
        </div>

        {onAssignmentsClick && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="px-4 text-xs font-semibold text-slate-500 uppercase mb-2">Ажил хуваарилалт</p>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={onAssignmentsClick}
                  className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <UserCheck className="w-5 h-5" />
                  <span className="font-medium">Миний ажлууд</span>
                </button>
              </li>
              {onCompletionsClick && (
                <li>
                  <button
                    onClick={onCompletionsClick}
                    className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <ListChecks className="w-5 h-5" />
                    <span className="font-medium">Биелэлт</span>
                  </button>
                </li>
              )}
              {onReportsClick && (
                <li>
                  <button
                    onClick={onReportsClick}
                    className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <FileBarChart className="w-5 h-5" />
                    <span className="font-medium">Тайлан</span>
                  </button>
                </li>
              )}
              {(userRole === 'admin' || userRole === 'manager') && onCompletionsReviewClick && (
                <li>
                  <button
                    onClick={onCompletionsReviewClick}
                    className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <ClipboardCheck className="w-5 h-5" />
                    <span className="font-medium">Гүйцэтгэл хянах</span>
                  </button>
                </li>
              )}
            </ul>
          </div>
        )}

        {(onChatClick || onAdvancedCalendarClick) && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="px-4 text-xs font-semibold text-slate-500 uppercase mb-2">Харилцаа</p>
            <ul className="space-y-1">
              {onAdvancedCalendarClick && (
                <li>
                  <button
                    onClick={handleAdvancedCalendarClick}
                    className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Calendar className="w-5 h-5" />
                    <span className="font-medium">Календар</span>
                  </button>
                </li>
              )}
              {onChatClick && (
                <li>
                  <button
                    onClick={handleChatClick}
                    className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span className="font-medium">Чат</span>
                  </button>
                </li>
              )}
            </ul>
          </div>
        )}

        {/* ✅ АДМИН ТОВЧ - Зөвхөн админд харагдана */}
        {userRole === 'admin' && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="px-4 text-xs font-semibold text-slate-500 uppercase mb-2">Админ</p>
            <ul className="space-y-1">
              {onAdminDashboardClick && (
                <li>
                  <button
                    onClick={onAdminDashboardClick}
                    className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <BarChart3 className="w-5 h-5" />
                    <span className="font-medium">Админ самбар</span>
                  </button>
                </li>
              )}
              {onUserManagementClick && (
                <li>
                  <button
                    onClick={onUserManagementClick}
                    className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Users className="w-5 h-5" />
                    <span className="font-medium">Хэрэглэгч удирдах</span>
                  </button>
                </li>
              )}
              {onDepartmentManagementClick && (
                <li>
                  <button
                    onClick={onDepartmentManagementClick}
                    className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Building2 className="w-5 h-5" />
                    <span className="font-medium">Хэлтэс удирдах</span>
                  </button>
                </li>
              )}
            </ul>
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-slate-200">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Гарах</span>
        </button>
      </div>
    </aside>
  );
}