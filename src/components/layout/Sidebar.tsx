import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  BookOpen,
  Award,
  Sparkles,
  Trophy,
  ListTodo,
  Users2,
  HeartHandshake,
  Cake,
  Calendar,
  BookMarked,
  AlertCircle,
  FileBarChart,
  BotMessageSquare,
  Bot,
  Settings,
  GraduationCap,
  X,
  Clock,
  Grid3X3,
} from 'lucide-react';

interface SidebarProps {
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
  onCloseMobile?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen = false, setMobileOpen, onCloseMobile }) => {
  const { activeTab, setActiveTab, attentionSignals } = useApp();

  const navSections: NavSection[] = [
    {
      title: 'Lớp học & Đánh giá',
      items: [
        { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
        { id: 'students', label: 'Học sinh', icon: Users },
        { id: 'attendance', label: 'Điểm danh', icon: CheckSquare },
        { id: 'learning', label: 'Sổ học tập', icon: BookOpen },
        { id: 'competency', label: 'Năng lực & Phẩm chất', icon: Award },
      ],
    },
    {
      title: 'Trợ lý AI & Điều hành',
      items: [
        { id: 'ai-agent', label: 'Trợ lý AI Chủ nhiệm', icon: Bot, highlight: true },
        { id: 'ai-comments', label: 'AI Viết nhận xét', icon: Sparkles },
        { id: 'competition', label: 'Thi đua & Khen thưởng', icon: Trophy },
        { id: 'tasks', label: 'Nhiệm vụ & Bài tập', icon: ListTodo },
        { id: 'timetable', label: 'Thời khóa biểu', icon: Clock },
        { id: 'seating', label: 'Sơ đồ lớp học', icon: Grid3X3 },
      ],
    },
    {
      title: 'Liên lạc & Chăm sóc',
      items: [
        { id: 'parents', label: 'Sổ Phụ huynh & Zalo', icon: HeartHandshake },
        { id: 'birthdays', label: 'Sinh nhật học sinh', icon: Cake },
        { id: 'events', label: 'Hoạt động & Lịch', icon: Calendar },
        { id: 'journal', label: 'Nhật ký chủ nhiệm', icon: BookMarked },
        {
          id: 'attention',
          label: 'Cần quan tâm',
          icon: AlertCircle,
          badge: attentionSignals.length > 0 ? attentionSignals.length : undefined,
        },
      ],
    },
    {
      title: 'Hệ thống',
      items: [
        { id: 'reports', label: 'Báo cáo & Xuất file', icon: FileBarChart },
        { id: 'settings', label: 'Cài đặt hệ thống', icon: Settings },
      ],
    },
  ];

  const handleNavClick = (id: string) => {
    setActiveTab(id);
    if (setMobileOpen) setMobileOpen(false);
    if (onCloseMobile) onCloseMobile();
  };

  const navContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200/80 select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-xs">
            <GraduationCap className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-none">
              Trợ Lý Chủ Nhiệm AI
            </h1>
            <p className="text-[10px] text-slate-500 mt-1 font-medium leading-none">
              Quản lý lớp học tiểu học
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            if (setMobileOpen) setMobileOpen(false);
            if (onCloseMobile) onCloseMobile();
          }}
          className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          aria-label="Đóng menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation List grouped by Section */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-0.5">
            <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {section.title}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 text-xs font-medium rounded-xl transition-all text-left cursor-pointer group ${
                    isActive
                      ? 'bg-emerald-50/90 text-emerald-900 font-semibold shadow-2xs ring-1 ring-emerald-300/60'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive
                          ? 'text-emerald-700 stroke-[2.2]'
                          : item.highlight
                          ? 'text-indigo-500 group-hover:text-indigo-600 stroke-[1.8]'
                          : 'text-slate-400 group-hover:text-slate-600 stroke-[1.8]'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="shrink-0 px-1.5 py-0.2 text-[10px] font-bold bg-amber-100 text-amber-900 rounded-full">
                      {item.badge}
                    </span>
                  )}
                  {item.highlight && !item.badge && (
                    <span className="shrink-0 text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.2 bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-700 border border-indigo-200/60 rounded">
                      AI
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer Standard Note */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[11px] text-slate-500">
        <span className="font-semibold text-emerald-800">Thông tư 27-BGDĐT</span>
        <span className="text-[10px] text-slate-400">v2.5</span>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0 z-30">
        {navContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => {
            if (setMobileOpen) setMobileOpen(false);
            if (onCloseMobile) onCloseMobile();
          }}
        />
      )}


      {/* Mobile Drawer */}
      <div
        className={`fixed inset-y-0 left-0 w-72 bg-white z-50 transform transition-transform duration-200 ease-in-out lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {navContent}
      </div>
    </>
  );
};
