import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { AttendanceRecord, AttendanceStatus } from '../../types';
import { AttendanceRepository } from '../../repositories/dataRepository';
import { ImportExportService } from '../../services/importExportService';
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
  Save,
  RotateCcw,
  Download,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { format, subDays, addDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { vi } from 'date-fns/locale';

export const AttendanceView: React.FC = () => {
  const {
    activeClass,
    currentUser,
    students,
    attendanceRecords,
    refreshActiveData,
    showToast,
    setActiveTab,
  } = useApp();

  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'stats'>('day');

  // Local state for the selected date's attendance rows
  const [currentMap, setCurrentMap] = useState<Record<string, { status: AttendanceStatus; notes: string }>>({});
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync current map when selectedDate or attendanceRecords changes
  useEffect(() => {
    const map: Record<string, { status: AttendanceStatus; notes: string }> = {};
    const dateRecs = attendanceRecords.filter((r) => r.date === selectedDate);
    const recByStudent = new Map(dateRecs.map((r) => [r.studentId, r]));

    students.forEach((s) => {
      const rec = recByStudent.get(s.id);
      if (rec) {
        map[s.id] = { status: rec.status, notes: rec.notes || '' };
      } else {
        // Default: present
        map[s.id] = { status: 'present', notes: '' };
      }
    });

    setCurrentMap(map);
    setHasChanges(false);
  }, [selectedDate, students, attendanceRecords]);

  // Fast Cycle Status: present -> excused -> unexcused -> late -> present
  const cycleStatus = (studentId: string) => {
    const current = currentMap[studentId]?.status || 'present';
    let next: AttendanceStatus = 'present';
    if (current === 'present') next = 'excused_absence';
    else if (current === 'excused_absence') next = 'unexcused_absence';
    else if (current === 'unexcused_absence') next = 'late';
    else if (current === 'late') next = 'present';

    setCurrentMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status: next,
      },
    }));
    setHasChanges(true);
  };

  const setDirectStatus = (studentId: string, status: AttendanceStatus) => {
    setCurrentMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
    setHasChanges(true);
  };

  const updateNotes = (studentId: string, notes: string) => {
    setCurrentMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        notes,
      },
    }));
    setHasChanges(true);
  };

  const setAllPresent = () => {
    const updated: Record<string, { status: AttendanceStatus; notes: string }> = {};
    students.forEach((s) => {
      updated[s.id] = { status: 'present', notes: '' };
    });
    setCurrentMap(updated);
    setHasChanges(true);
    showToast('Đã đặt tất cả học sinh có mặt');
  };

  const handleSave = async () => {
    if (!activeClass || !currentUser) return;
    setSaving(true);
    try {
      const batchPayload = students.map((s) => ({
        studentId: s.id,
        status: currentMap[s.id]?.status || 'present',
        notes: currentMap[s.id]?.notes || '',
      }));

      await AttendanceRepository.saveAttendanceBatch(activeClass.id, currentUser.uid, selectedDate, batchPayload);
      await refreshActiveData();
      setHasChanges(false);
      showToast(`Đã lưu bảng điểm danh ngày ${selectedDate}!`);
    } catch (err: any) {
      showToast('Lỗi khi lưu điểm danh: ' + (err.message || ''), 'error');
    } finally {
      setSaving(false);
    }
  };

  // Day summary stats
  const dayStats = React.useMemo(() => {
    const vals = Object.values(currentMap);
    const present = vals.filter((v) => v.status === 'present').length;
    const excused = vals.filter((v) => v.status === 'excused_absence').length;
    const unexcused = vals.filter((v) => v.status === 'unexcused_absence').length;
    const late = vals.filter((v) => v.status === 'late').length;
    return { present, excused, unexcused, late, total: students.length };
  }, [currentMap, students.length]);

  // Week Interval dates
  const weekDays = React.useMemo(() => {
    const cur = new Date(selectedDate);
    const start = startOfWeek(cur, { weekStartsOn: 1 }); // Monday
    const end = endOfWeek(cur, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end }).slice(0, 5); // Mon - Fri
  }, [selectedDate]);

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Sổ Điểm Danh Chuyên Cần
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Điểm danh 1 chạm siêu nhanh · Thống kê tự động theo Thông tư 27
          </p>
        </div>

        {/* View Switcher & Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'day' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Theo ngày
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'week' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Theo tuần
            </button>
            <button
              onClick={() => setViewMode('stats')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'stats' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Tổng kết
            </button>
          </div>

          <button
            onClick={() => {
              if (activeClass) {
                const dates = Array.from(new Set(attendanceRecords.map((r) => r.date))).sort();
                ImportExportService.exportAttendanceToExcel(activeClass.className, dates, students, attendanceRecords);
              }
            }}
            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            title="Xuất bảng điểm danh Excel"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* Date Control Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedDate(format(subDays(new Date(selectedDate), 1), 'yyyy-MM-dd'))}
            className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
            title="Ngày trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
          />

          <button
            onClick={() => setSelectedDate(format(addDays(new Date(selectedDate), 1), 'yyyy-MM-dd'))}
            className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
            title="Ngày sau"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
            className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            Hôm nay
          </button>
        </div>

        {viewMode === 'day' && (
          <div className="flex items-center gap-2">
            <button
              onClick={setAllPresent}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Tất cả có mặt</span>
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className={`px-4 py-1.5 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                hasChanges ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-500/20' : 'bg-slate-800 hover:bg-slate-900'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Đang lưu...' : hasChanges ? 'Lưu thay đổi' : 'Đã đồng bộ'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Daily Summary Counters */}
      {viewMode === 'day' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-emerald-800">Có mặt</span>
              <p className="text-xl font-extrabold text-emerald-900">{dayStats.present}</p>
            </div>
            <span className="text-xs font-bold text-emerald-700">
              {Math.round((dayStats.present / (dayStats.total || 1)) * 100)}%
            </span>
          </div>

          <div className="bg-amber-50/70 border border-amber-200 p-3 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-amber-800">Nghỉ có phép</span>
              <p className="text-xl font-extrabold text-amber-900">{dayStats.excused}</p>
            </div>
            <AlertCircle className="w-5 h-5 text-amber-600 opacity-60" />
          </div>

          <div className="bg-red-50/70 border border-red-200 p-3 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-red-800">Nghỉ không phép</span>
              <p className="text-xl font-extrabold text-red-900">{dayStats.unexcused}</p>
            </div>
            <AlertTriangle className="w-5 h-5 text-red-600 opacity-60" />
          </div>

          <div className="bg-purple-50/70 border border-purple-200 p-3 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-purple-800">Đi học muộn</span>
              <p className="text-xl font-extrabold text-purple-900">{dayStats.late}</p>
            </div>
            <Clock className="w-5 h-5 text-purple-600 opacity-60" />
          </div>
        </div>
      )}

      {/* 1. VIEW MODE: DAILY 1-CLICK ROSTER */}
      {viewMode === 'day' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs text-slate-500 flex items-center justify-between">
            <span>
              Chạm vào hàng hoặc nút trạng thái để chuyển đổi trạng thái (Có mặt ➔ Có phép ➔ Không phép ➔ Muộn)
            </span>
            <span className="font-semibold text-slate-700">Sĩ số: {students.length}</span>
          </div>

          <div className="divide-y divide-slate-100">
            {students.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                Lớp chưa có học sinh nào để điểm danh.
              </div>
            ) : (
              students.map((student, idx) => {
                const state = currentMap[student.id] || { status: 'present', notes: '' };
                const isPresent = state.status === 'present';
                const isExcused = state.status === 'excused_absence';
                const isUnexcused = state.status === 'unexcused_absence';
                const isLate = state.status === 'late';

                return (
                  <div
                    key={student.id}
                    className="p-3.5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-slate-400 w-6 text-center">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="text-sm font-bold text-slate-900">{student.fullName}</span>
                        <span className="text-slate-400 text-xs ml-2">
                          ({student.studentCode || student.groupId})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      {/* 4 Status Pills */}
                      <div className="inline-flex rounded-xl p-1 bg-slate-100 text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => setDirectStatus(student.id, 'present')}
                          className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                            isPresent
                              ? 'bg-emerald-600 text-white shadow-xs font-bold'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Có mặt
                        </button>
                        <button
                          type="button"
                          onClick={() => setDirectStatus(student.id, 'excused_absence')}
                          className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                            isExcused
                              ? 'bg-amber-600 text-white shadow-xs font-bold'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Có phép
                        </button>
                        <button
                          type="button"
                          onClick={() => setDirectStatus(student.id, 'unexcused_absence')}
                          className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                            isUnexcused
                              ? 'bg-red-600 text-white shadow-xs font-bold'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Không phép
                        </button>
                        <button
                          type="button"
                          onClick={() => setDirectStatus(student.id, 'late')}
                          className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                            isLate
                              ? 'bg-purple-600 text-white shadow-xs font-bold'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Đi muộn
                        </button>
                      </div>

                      {/* Notes Input */}
                      <input
                        type="text"
                        value={state.notes}
                        onChange={(e) => updateNotes(student.id, e.target.value)}
                        placeholder="Lý do vắng / ghi chú..."
                        className="w-full sm:w-48 px-3 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 2. VIEW MODE: WEEK MATRIX */}
      {viewMode === 'week' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-12 text-center">STT</th>
                <th className="py-3 px-4 min-w-[160px]">Họ và tên</th>
                <th className="py-3 px-4">Tổ</th>
                {weekDays.map((d, i) => (
                  <th key={i} className="py-3 px-4 text-center">
                    <div>{format(d, 'EEEE', { locale: vi })}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{format(d, 'dd/MM')}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((s, idx) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 text-center text-slate-400">{idx + 1}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{s.fullName}</td>
                  <td className="py-3 px-4 text-slate-500">{s.groupId}</td>
                  {weekDays.map((d, i) => {
                    const dStr = format(d, 'yyyy-MM-dd');
                    const rec = attendanceRecords.find((r) => r.studentId === s.id && r.date === dStr);
                    let badge = <span className="text-slate-300">-</span>;
                    if (rec) {
                      if (rec.status === 'present') {
                        badge = <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">Có mặt</span>;
                      } else if (rec.status === 'excused_absence') {
                        badge = <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">Phép</span>;
                      } else if (rec.status === 'unexcused_absence') {
                        badge = <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold text-[10px]">Không phép</span>;
                      } else if (rec.status === 'late') {
                        badge = <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold text-[10px]">Muộn</span>;
                      }
                    }
                    return (
                      <td key={i} className="py-3 px-4 text-center">
                        {badge}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. VIEW MODE: SUMMARY STATS */}
      {viewMode === 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 mb-3">
              Tỷ lệ chuyên cần toàn lớp
            </h3>
            <div className="space-y-3">
              {students.map((s) => {
                const sRecs = attendanceRecords.filter((r) => r.studentId === s.id);
                const pres = sRecs.filter((r) => r.status === 'present').length;
                const tot = sRecs.length || 1;
                const pct = sRecs.length > 0 ? Math.round((pres / tot) * 100) : 100;
                return (
                  <div key={s.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">{s.fullName}</span>
                      <span className="text-slate-500 font-medium">
                        {pres}/{sRecs.length} buổi ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className={`h-full rounded-full ${
                          pct >= 95 ? 'bg-emerald-500' : pct >= 85 ? 'bg-teal-500' : 'bg-amber-500'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 mb-3">
              Học sinh vắng nhiều nhất
            </h3>
            <div className="space-y-2">
              {students
                .map((s) => {
                  const unexcused = attendanceRecords.filter((r) => r.studentId === s.id && r.status === 'unexcused_absence').length;
                  const excused = attendanceRecords.filter((r) => r.studentId === s.id && r.status === 'excused_absence').length;
                  const late = attendanceRecords.filter((r) => r.studentId === s.id && r.status === 'late').length;
                  return { s, unexcused, excused, late, totalAbsence: unexcused + excused };
                })
                .sort((a, b) => b.totalAbsence - a.totalAbsence)
                .slice(0, 5)
                .map(({ s, unexcused, excused, late, totalAbsence }) => (
                  <div key={s.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900">{s.fullName}</span>
                      <span className="text-slate-400 ml-2">({s.groupId})</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-800">{totalAbsence} buổi vắng</span>
                      <div className="text-[10px] text-slate-500">
                        {unexcused} không phép · {excused} có phép · {late} muộn
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
