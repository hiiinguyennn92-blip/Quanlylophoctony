import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ClassEvent } from '../../types';
import { EventRepository } from '../../repositories/dataRepository';
import {
  Calendar,
  Plus,
  Clock,
  MapPin,
  Trash2,
  Users,
  Sparkles,
  CalendarCheck,
  X,
} from 'lucide-react';
import { format, parseISO, isAfter, isBefore } from 'date-fns';
import { EmptyState } from '../common/EmptyState';

export const EventsView: React.FC = () => {
  const { activeClass, currentUser, classEvents, refreshActiveData, showToast } = useApp();

  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:30');
  const [location, setLocation] = useState('Sân trường');
  const [type, setType] = useState<ClassEvent['type']>('trường');
  const [notes, setNotes] = useState('');
  const [reminderDaysBefore, setReminderDaysBefore] = useState(1);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClass || !currentUser) return;
    if (!title.trim()) {
      showToast('Vui lòng nhập tên sự kiện', 'error');
      return;
    }

    try {
      await EventRepository.createEvent({
        classId: activeClass.id,
        ownerId: currentUser.uid,
        title,
        date,
        startTime,
        endTime,
        location,
        type,
        notes,
        reminderDaysBefore: Number(reminderDaysBefore) || 1,
      });

      await refreshActiveData();
      setShowAddModal(false);
      setTitle('');
      setNotes('');
      showToast('Đã thêm sự kiện / hoạt động vào lịch lớp!');
    } catch (err: any) {
      showToast('Lỗi khi thêm sự kiện: ' + (err.message || ''), 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await EventRepository.deleteEvent(id);
      await refreshActiveData();
      showToast('Đã xóa sự kiện');
    } catch (err: any) {
      showToast('Lỗi khi xóa sự kiện: ' + (err.message || ''), 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            <span>Kế Hoạch Hoạt Động & Sự Kiện Lớp</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Lịch thi đấu, dã ngoại, sinh hoạt dưới cờ, họp phụ huynh & trải nghiệm sáng tạo
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm hoạt động mới</span>
        </button>
      </div>

      {/* Events List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {classEvents.length === 0 ? (
          <div className="col-span-2">
            <EmptyState
              icon={CalendarCheck}
              iconColor="text-purple-600"
              title="Chưa có sự kiện & hoạt động ngoại khóa nào"
              description="Các hoạt động tập thể giúp gắn kết học sinh, rèn luyện kỹ năng sống và tạo nên kỷ niệm đẹp thời tiểu học. Hãy lên kế hoạch cho sự kiện tiếp theo của lớp!"
              quote={{
                text: 'Trường học là nơi cuộc sống được sống chứ không chỉ là nơi chuẩn bị cho cuộc sống tương lai.',
                author: 'John Dewey',
              }}
              action={{
                label: 'Lên lịch hoạt động đầu tiên',
                onClick: () => setShowAddModal(true),
                icon: Plus,
                variant: 'indigo',
              }}
            />
          </div>
        ) : (
          classEvents.map((ev) => {
            let typeColor = 'bg-blue-50 text-blue-700 border-blue-200';
            if (ev.type === 'lớp') typeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
            else if (ev.type === 'dã ngoại') typeColor = 'bg-amber-50 text-amber-700 border-amber-200';
            else if (ev.type === 'thi đua') typeColor = 'bg-purple-50 text-purple-700 border-purple-200';

            return (
              <div
                key={ev.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 hover:border-purple-200 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${typeColor}`}>
                      {ev.type}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-2">{ev.title}</h3>
                  </div>

                  <button
                    onClick={() => handleDelete(ev.id)}
                    className="text-slate-300 hover:text-red-500 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4 text-slate-400" />
                    <span>Ngày diễn ra: <strong className="text-slate-800">{ev.date}</strong></span>
                  </div>

                  {(ev.startTime || ev.endTime) && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span>{ev.startTime} - {ev.endTime}</span>
                    </div>
                  )}

                  {ev.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span>{ev.location}</span>
                    </div>
                  )}
                </div>

                {ev.notes && (
                  <p className="text-xs text-slate-500 pt-2 border-t border-slate-100 italic">
                    Ghi chú: {ev.notes}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Thêm sự kiện / hoạt động mới</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên hoạt động / Sự kiện *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Thi kéo co Hội khỏe Phù Đổng, Hội thi Kể chuyện..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ngày diễn ra
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phân loại
                  </label>
                  <select
                    value={type}
                    onChange={(e: any) => setType(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none bg-white font-medium"
                  >
                    <option value="trường">Cấp Trường</option>
                    <option value="lớp">Nội bộ Lớp</option>
                    <option value="thi đua">Thi đua / Thể thao</option>
                    <option value="dã ngoại">Dã ngoại / Trải nghiệm</option>
                    <option value="khác">Khác</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Giờ bắt đầu
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Địa điểm
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Sân trường, Nhà đa năng..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ghi chú chuẩn bị
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Trang phục áo đồng phục, mang cờ đỏ, nước uống..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  Lưu vào lịch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
