import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Plus,
  UserPlus,
  CheckSquare,
  ListTodo,
  BookMarked,
  MessageCircle,
  Calendar,
  X,
} from 'lucide-react';

export const QuickActionModal: React.FC = () => {
  const { setQuickActionTarget, setActiveTab } = useApp();
  const [open, setOpen] = useState(false);

  const actions = [
    {
      id: 'quick_attendance',
      label: 'Điểm danh nhanh',
      icon: CheckSquare,
      color: 'bg-emerald-600 text-white hover:bg-emerald-700',
      action: () => setActiveTab('attendance'),
    },
    {
      id: 'add_student',
      label: 'Thêm học sinh',
      icon: UserPlus,
      color: 'bg-blue-600 text-white hover:bg-blue-700',
      action: () => setQuickActionTarget('add_student'),
    },
    {
      id: 'create_task',
      label: 'Giao nhiệm vụ',
      icon: ListTodo,
      color: 'bg-indigo-600 text-white hover:bg-indigo-700',
      action: () => setQuickActionTarget('create_task'),
    },
    {
      id: 'write_journal',
      label: 'Ghi nhật ký lớp',
      icon: BookMarked,
      color: 'bg-amber-600 text-white hover:bg-amber-700',
      action: () => setQuickActionTarget('write_journal'),
    },
    {
      id: 'message_parent',
      label: 'Nhắn phụ huynh',
      icon: MessageCircle,
      color: 'bg-rose-600 text-white hover:bg-rose-700',
      action: () => setActiveTab('parents'),
    },
    {
      id: 'add_event',
      label: 'Thêm hoạt động / lịch',
      icon: Calendar,
      color: 'bg-purple-600 text-white hover:bg-purple-700',
      action: () => setQuickActionTarget('add_event'),
    },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-40 no-print flex flex-col items-end">
      {/* Speed Dial Menu items */}
      {open && (
        <div className="mb-3 flex flex-col items-end gap-2 animate-in fade-in slide-in-from-bottom-5 duration-150">
          {actions.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.id}
                onClick={() => {
                  act.action();
                  setOpen(false);
                }}
                className="flex items-center gap-2.5 px-3.5 py-2 bg-white text-slate-800 rounded-xl shadow-lg border border-slate-200/80 hover:bg-slate-50 transition-all text-xs font-semibold group cursor-pointer"
              >
                <span>{act.label}</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${act.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Main floating button */}
      <button
        onClick={() => setOpen(!open)}
        className={`w-13 h-13 rounded-2xl flex items-center justify-center text-white shadow-xl transition-transform duration-200 cursor-pointer ${
          open ? 'bg-slate-800 rotate-45 scale-95' : 'bg-emerald-600 hover:bg-emerald-700 hover:scale-105'
        }`}
        aria-label="Tác vụ nhanh"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
};
