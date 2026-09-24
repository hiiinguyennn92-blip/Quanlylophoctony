import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Search,
  Bell,
  ChevronDown,
  Plus,
  LogOut,
  Sparkles,
  Menu,
  CheckCircle2,
  CalendarDays,
  User,
  ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface TopbarProps {
  onOpenMobileMenu: () => void;
  onOpenQuickSearch?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onOpenMobileMenu, onOpenQuickSearch }) => {
  const {
    currentUser,
    classes,
    activeClass,
    setActiveClassId,
    students,
    parents,
    tasks,
    journalEntries,
    classEvents,
    notifications,
    markNotificationRead,
    setShowOnboarding,
    setActiveTab,
    setSelectedStudentForDetail,
    seedDemoClass,
    logout,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const classRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
      if (classRef.current && !classRef.current.contains(e.target as Node)) {
        setShowClassDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifDropdown(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global search filtering
  const searchResults = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;

    const matchedStudents = students.filter(
      (s) => s.fullName.toLowerCase().includes(q) || (s.studentCode && s.studentCode.toLowerCase().includes(q))
    );
    const matchedParents = parents.filter(
      (p) => p.fullName.toLowerCase().includes(q) || p.phone.includes(q)
    );
    const matchedTasks = tasks.filter((t) => t.title.toLowerCase().includes(q));
    const matchedJournals = journalEntries.filter((j) => j.content.toLowerCase().includes(q));
    const matchedEvents = classEvents.filter((e) => e.title.toLowerCase().includes(q));

    return {
      students: matchedStudents.slice(0, 5),
      parents: matchedParents.slice(0, 3),
      tasks: matchedTasks.slice(0, 3),
      journals: matchedJournals.slice(0, 3),
      events: matchedEvents.slice(0, 3),
      total:
        matchedStudents.length +
        matchedParents.length +
        matchedTasks.length +
        matchedJournals.length +
        matchedEvents.length,
    };
  }, [searchQuery, students, parents, tasks, journalEntries, classEvents]);

  const unreadNotifsCount = notifications.filter((n) => !n.read).length;

  const todayFormatted = React.useMemo(() => {
    try {
      return format(new Date(), "EEEE, 'ngày' dd/MM/yyyy", { locale: vi });
    } catch {
      return new Date().toLocaleDateString('vi-VN');
    }
  }, []);

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-4 lg:px-6 py-2.5">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Mobile hamburger + Class selector */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
            aria-label="Mở danh mục"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Class switcher */}
          <div className="relative" ref={classRef}>
            <button
              onClick={() => setShowClassDropdown(!showClassDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-100/80 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-800 transition-colors border border-slate-200/60"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="truncate max-w-[140px] sm:max-w-[200px]">
                {activeClass ? `Lớp ${activeClass.className}` : 'Chọn lớp'}
              </span>
              {activeClass && (
                <span className="hidden sm:inline text-slate-400 font-normal">
                  ({activeClass.schoolYear})
                </span>
              )}
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            </button>

            {showClassDropdown && (
              <div className="absolute left-0 mt-1.5 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Danh sách lớp học của bạn
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {classes.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setActiveClassId(c.id);
                        setShowClassDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${
                        c.id === activeClass?.id
                          ? 'bg-emerald-50 text-emerald-800 font-semibold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="font-medium">Lớp {c.className}</div>
                        <div className="text-[11px] text-slate-400 font-normal">
                          {c.schoolName} · {c.schoolYear}
                        </div>
                      </div>
                      {c.id === activeClass?.id && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="border-t border-slate-100 mt-1 pt-1 px-1">
                  <button
                    onClick={() => {
                      setShowClassDropdown(false);
                      setShowOnboarding(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm lớp học mới</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Today's date */}
          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 font-medium pl-2">
            <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
            <span className="capitalize">{todayFormatted}</span>
          </div>
        </div>

        {/* Center: Global Search */}
        <div className="flex-1 max-w-md relative" ref={searchRef}>
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              onClick={() => {
                if (onOpenQuickSearch) {
                  onOpenQuickSearch();
                }
              }}
              placeholder="Tìm kiếm học sinh, phụ huynh, nhiệm vụ..."
              className="w-full pl-9 pr-16 py-1.5 bg-slate-100/70 hover:bg-slate-100 focus:bg-white text-xs text-slate-800 placeholder-slate-400 rounded-lg border border-transparent focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-text"
            />
            <button
              type="button"
              onClick={onOpenQuickSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 text-[10px] font-mono text-slate-500 bg-white hover:bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/80 shadow-2xs transition-colors cursor-pointer"
              title="Phím tắt: Ctrl + K hoặc Cmd + K"
            >
              <span>⌘K</span>
            </button>
          </div>

          {/* Search Results Dropdown */}
          {showSearchResults && searchResults && (
            <div className="absolute left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 max-h-96 overflow-y-auto p-2 z-50">
              {searchResults.total === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  Không tìm thấy kết quả nào khớp với "{searchQuery}"
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Students */}
                  {searchResults.students.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1">
                        Học sinh ({searchResults.students.length})
                      </div>
                      {searchResults.students.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => {
                            setSelectedStudentForDetail(s);
                            setActiveTab('students');
                            setShowSearchResults(false);
                            setSearchQuery('');
                          }}
                          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-left text-xs transition-colors"
                        >
                          <div>
                            <span className="font-semibold text-slate-800">{s.fullName}</span>
                            <span className="text-slate-400 ml-2">({s.studentCode || s.groupId})</span>
                          </div>
                          <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                            Xem hồ sơ <ExternalLink className="w-3 h-3" />
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Parents */}
                  {searchResults.parents.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1">
                        Phụ huynh ({searchResults.parents.length})
                      </div>
                      {searchResults.parents.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setActiveTab('parents');
                            setShowSearchResults(false);
                            setSearchQuery('');
                          }}
                          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-left text-xs transition-colors"
                        >
                          <div>
                            <span className="font-medium text-slate-800">{p.fullName}</span>
                            <span className="text-slate-400 ml-2 text-[11px]">({p.phone})</span>
                          </div>
                          <span className="text-[11px] text-slate-500">Mục Phụ huynh</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Tasks */}
                  {searchResults.tasks.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1">
                        Nhiệm vụ ({searchResults.tasks.length})
                      </div>
                      {searchResults.tasks.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            setActiveTab('tasks');
                            setShowSearchResults(false);
                            setSearchQuery('');
                          }}
                          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-left text-xs transition-colors"
                        >
                          <span className="font-medium text-slate-800 truncate">{t.title}</span>
                          <span className="text-[11px] text-slate-400 shrink-0">Hạn: {t.dueAt}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Notification + Profile */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Notification Center */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Thông báo"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
              )}
            </button>

            {showNotifDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between px-3.5 py-1.5 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-800">Thông báo & Nhắc nhở</span>
                  <span className="text-[11px] text-slate-500">{notifications.length} tin</span>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      Không có thông báo mới hôm nay
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          markNotificationRead(n.id);
                          if (n.actionRoute) setActiveTab(n.actionRoute);
                          setShowNotifDropdown(false);
                        }}
                        className={`p-3 text-left cursor-pointer transition-colors hover:bg-slate-50 ${
                          !n.read ? 'bg-amber-50/40' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <p className="text-xs font-semibold text-slate-800 leading-snug">
                            {n.title}
                          </p>
                          {!n.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-normal line-clamp-2">
                          {n.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Account Menu */}
          <div className="relative" ref={userRef}>
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 pl-2 pr-1 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                {currentUser?.displayName?.charAt(0) || 'G'}
              </div>
              <span className="hidden sm:inline font-semibold text-slate-800 max-w-[100px] truncate">
                {currentUser?.displayName || 'Giáo viên'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-800 truncate">
                    {currentUser?.displayName || 'Giáo viên Chủ nhiệm'}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {currentUser?.email || 'Tài khoản giáo viên'}
                  </p>
                </div>

                <button
                  onClick={() => {
                    seedDemoClass();
                    setShowUserDropdown(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-indigo-700 hover:bg-indigo-50 font-medium transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <span>Nạp dữ liệu mẫu Lớp 3A1</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('settings');
                    setShowUserDropdown(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <span>Cài đặt hệ thống</span>
                </button>

                <div className="border-t border-slate-100 mt-1 pt-1">
                  <button
                    onClick={() => {
                      logout();
                      setShowUserDropdown(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
