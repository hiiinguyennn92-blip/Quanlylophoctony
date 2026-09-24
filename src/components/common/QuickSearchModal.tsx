import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Student } from '../../types';
import {
  Search,
  X,
  Users,
  Phone,
  BookOpen,
  Calendar,
  ListTodo,
  Sparkles,
  Command,
  ArrowRight,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';

interface QuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenZalo?: (student: Student) => void;
}

export const QuickSearchModal: React.FC<QuickSearchModalProps> = ({
  isOpen,
  onClose,
  onOpenZalo,
}) => {
  const {
    students,
    parents,
    tasks,
    classEvents,
    journalEntries,
    setActiveTab,
    setSelectedStudentForDetail,
    activeClass,
  } = useApp();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Aggregate searchable items
  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase();

    // 1. Navigation shortcuts if query is empty or short
    const navItems = [
      { id: 'nav-students', title: 'Hồ sơ Học sinh', category: 'Điều hướng', tab: 'students', icon: Users, sub: 'Danh sách và thông tin 40+ học sinh' },
      { id: 'nav-attendance', title: 'Điểm danh buổi sáng', category: 'Điều hướng', tab: 'attendance', icon: Calendar, sub: 'Kiểm diện có phép, không phép' },
      { id: 'nav-learning', title: 'Sổ đánh giá học tập (TT27)', category: 'Điều hướng', tab: 'learning', icon: BookOpen, sub: 'Nhập điểm, mức độ HTT/HT/CHT' },
      { id: 'nav-comments', title: 'AI Viết nhận xét học bạ', category: 'Điều hướng', tab: 'ai-comments', icon: Sparkles, sub: 'Tạo nhận xét thông minh & gửi Zalo' },
      { id: 'nav-parents', title: 'Sổ liên lạc Phụ huynh & Zalo', category: 'Điều hướng', tab: 'parents', icon: Phone, sub: 'Danh bạ, gọi điện, nhắn tin Zalo' },
      { id: 'nav-tasks', title: 'Giao nhiệm vụ & Bài tập', category: 'Điều hướng', tab: 'tasks', icon: ListTodo, sub: 'Kiểm tra nộp bài, nhắc nhở PH' },
    ];

    if (!q) {
      return {
        items: navItems.map((n) => ({ ...n, type: 'nav' })),
        total: navItems.length,
      };
    }

    // Filter Students
    const matchedStudents = students
      .filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          (s.studentCode && s.studentCode.toLowerCase().includes(q)) ||
          (s.groupId && s.groupId.toLowerCase().includes(q))
      )
      .map((s) => ({
        id: `stu-${s.id}`,
        title: s.fullName,
        sub: `Mã: ${s.studentCode || 'N/A'} · ${s.groupId || 'Lớp'} · Ngày sinh: ${s.dob || 'N/A'}`,
        category: 'Học sinh',
        type: 'student',
        raw: s,
        icon: Users,
      }));

    // Filter Parents
    const matchedParents = parents
      .filter((p) => p.fullName.toLowerCase().includes(q) || p.phone.includes(q))
      .map((p) => {
        const child = students.find((s) => s.id === p.studentId);
        return {
          id: `par-${p.id}`,
          title: `${p.fullName} (${p.type})`,
          sub: `SĐT: ${p.phone} · PH em ${child?.fullName || 'N/A'}`,
          category: 'Phụ huynh',
          type: 'parent',
          raw: p,
          child,
          icon: Phone,
        };
      });

    // Filter Tasks
    const matchedTasks = tasks
      .filter((t) => t.title.toLowerCase().includes(q) || (t.subject && t.subject.toLowerCase().includes(q)))
      .map((t) => ({
        id: `task-${t.id}`,
        title: t.title,
        sub: `Môn: ${t.subject || 'Tổng hợp'} · Hạn nộp: ${t.dueAt}`,
        category: 'Nhiệm vụ',
        type: 'task',
        raw: t,
        icon: ListTodo,
      }));

    // Filter Events
    const matchedEvents = classEvents
      .filter((e) => e.title.toLowerCase().includes(q))
      .map((e) => ({
        id: `ev-${e.id}`,
        title: e.title,
        sub: `Ngày: ${e.date} · Loại: ${e.type}`,
        category: 'Hoạt động',
        type: 'event',
        raw: e,
        icon: Calendar,
      }));

    const combined = [
      ...matchedStudents,
      ...matchedParents,
      ...matchedTasks,
      ...matchedEvents,
    ];

    return {
      items: combined,
      total: combined.length,
    };
  }, [query, students, parents, tasks, classEvents]);

  // Keyboard navigation inside search list
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.items.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.items.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = results.items[selectedIndex];
      if (current) handleSelect(current);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleSelect = (item: any) => {
    if (item.type === 'nav') {
      setActiveTab(item.tab);
      onClose();
    } else if (item.type === 'student') {
      setSelectedStudentForDetail(item.raw);
      setActiveTab('students');
      onClose();
    } else if (item.type === 'parent') {
      if (item.child && onOpenZalo) {
        onClose();
        onOpenZalo(item.child);
      } else {
        setActiveTab('parents');
        onClose();
      }
    } else if (item.type === 'task') {
      setActiveTab('tasks');
      onClose();
    } else if (item.type === 'event') {
      setActiveTab('events');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-16 sm:pt-24 p-3 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 flex items-center gap-3 bg-white sticky top-0 z-10">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Search className="w-4 h-4 stroke-[2.2]" />
          </div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Tìm học sinh, số phụ huynh, bài tập, hoạt động... (Ctrl + K)"
            className="flex-1 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent"
          />

          {query && (
            <button
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
            <kbd>ESC</kbd> <span>đóng</span>
          </div>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="p-2 sm:p-3 overflow-y-auto space-y-1 divide-y divide-slate-50 text-xs"
        >
          {results.total === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Search className="w-8 h-8 text-slate-300 mx-auto stroke-1" />
              <p className="text-xs font-semibold text-slate-600">
                Không tìm thấy kết quả nào cho "{query}"
              </p>
              <p className="text-[11px] text-slate-400">
                Thầy/Cô hãy thử tìm theo tên không dấu, số điện thoại hoặc mã học sinh.
              </p>
            </div>
          ) : (
            results.items.map((item: any, idx: number) => {
              const Icon = item.icon || Search;
              const isSelected = idx === selectedIndex;

              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full text-left p-2.5 sm:p-3 rounded-xl transition-all flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50/80 text-emerald-950 font-medium ring-1 ring-emerald-300/80 shadow-2xs'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 truncate">
                          {item.title}
                        </span>
                        <span
                          className={`text-[10px] uppercase tracking-wider px-1.5 py-0.2 rounded font-bold ${
                            item.category === 'Học sinh'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.category === 'Phụ huynh'
                              ? 'bg-blue-100 text-blue-800'
                              : item.category === 'Nhiệm vụ'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {item.sub}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
                    <span className="hidden sm:inline">Chọn</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono text-[10px] shadow-2xs">
                ↑
              </kbd>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono text-[10px] shadow-2xs">
                ↓
              </kbd>
              <span>di chuyển</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono text-[10px] shadow-2xs">
                Enter
              </kbd>
              <span>chọn</span>
            </span>
          </div>

          <div className="font-semibold text-emerald-700">
            {activeClass ? `Lớp ${activeClass.className}` : 'Trợ lý Chủ nhiệm'}
          </div>
        </div>
      </div>
    </div>
  );
};
