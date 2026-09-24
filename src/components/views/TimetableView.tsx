import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  TimetableCell,
  TimetablePeriod,
  DutyAssignment,
  DailyRoutineStep,
} from '../../types';
import { TimetableRepository } from '../../repositories/dataRepository';
import { TimetableDesignModal } from './TimetableDesignModal';
import {
  CalendarDays,
  Printer,
  Save,
  Clock,
  Sparkles,
  Users,
  CheckCircle,
  Plus,
  Trash2,
  Edit2,
  RotateCcw,
  Check,
  Send,
  X,
  ChevronRight,
  UserCheck,
  Calendar,
  AlertCircle,
} from 'lucide-react';

const DAYS = [
  { key: 'monday', label: 'Thứ Hai' },
  { key: 'tuesday', label: 'Thứ Ba' },
  { key: 'wednesday', label: 'Thứ Tư' },
  { key: 'thursday', label: 'Thứ Năm' },
  { key: 'friday', label: 'Thứ Sáu' },
];

const DEFAULT_PERIODS: TimetablePeriod[] = [
  { period: 1, session: 'morning', name: 'Tiết 1', time: '07:30 - 08:05', defaultSub: 'Toán' },
  { period: 2, session: 'morning', name: 'Tiết 2', time: '08:15 - 08:50', defaultSub: 'Tiếng Việt' },
  { period: 3, session: 'morning', name: 'Tiết 3', time: '09:20 - 09:55', defaultSub: 'Tiếng Anh' },
  { period: 4, session: 'morning', name: 'Tiết 4', time: '10:05 - 10:40', defaultSub: 'TN&XH' },
  { period: 5, session: 'afternoon', name: 'Tiết 5', time: '14:00 - 14:35', defaultSub: 'Mĩ thuật' },
  { period: 6, session: 'afternoon', name: 'Tiết 6', time: '14:45 - 15:20', defaultSub: 'Âm nhạc' },
  { period: 7, session: 'afternoon', name: 'Tiết 7', time: '15:30 - 16:05', defaultSub: 'Hoạt động trải nghiệm' },
];

const SUBJECT_OPTIONS = [
  'Chào cờ',
  'Sinh hoạt lớp',
  'Toán',
  'Tiếng Việt',
  'Tiếng Anh',
  'Tự nhiên và Xã hội',
  'Khoa học',
  'Lịch sử và Địa lí',
  'Tin học',
  'Công nghệ',
  'Đạo đức',
  'Âm nhạc',
  'Mĩ thuật',
  'Giáo dục thể chất',
  'Hoạt động trải nghiệm',
  'Ôn luyện',
  'Nghỉ',
];

const DEFAULT_DUTIES: DutyAssignment[] = [
  {
    id: 'duty_mon',
    day: 'Thứ Hai',
    dayKey: 'monday',
    assigneeType: 'group',
    assignedGroup: 'Tổ 1 (Trực tuần)',
    tasks: 'Chuẩn bị cờ hoa, khăn trải bàn, kiểm tra vệ sinh lớp đầu tuần',
    notes: 'Tập trung lúc 07:15',
  },
  {
    id: 'duty_tue',
    day: 'Thứ Ba',
    dayKey: 'tuesday',
    assigneeType: 'group',
    assignedGroup: 'Tổ 2 (Vệ sinh lớp)',
    tasks: 'Quét lớp, lau bảng sạch sẽ sau các tiết học, đổ rác đúng nơi quy định',
  },
  {
    id: 'duty_wed',
    day: 'Thứ Tư',
    dayKey: 'wednesday',
    assigneeType: 'group',
    assignedGroup: 'Tổ 3 (Kê dọn bàn ghế)',
    tasks: 'Kê ngay ngắn bàn ghế thẳng hàng, sắp xếp giá sách thư viện mini của lớp',
  },
  {
    id: 'duty_thu',
    day: 'Thứ Năm',
    dayKey: 'thursday',
    assigneeType: 'group',
    assignedGroup: 'Tổ 4 (Tưới cây & lau bảng)',
    tasks: 'Tưới chậu cây góc thiên nhiên, lau bụi bậu cửa sổ, chuẩn bị phấn nước',
  },
  {
    id: 'duty_fri',
    day: 'Thứ Sáu',
    dayKey: 'friday',
    assigneeType: 'group',
    assignedGroup: 'Cả lớp tổng vệ sinh cuối tuần',
    tasks: 'Tổng vệ sinh phòng học, lau cửa kính, tắt toàn bộ quạt điện và khóa chốt cửa',
    notes: 'Tất cả 4 tổ cùng tham gia 15 phút cuối buổi chiều',
  },
];

const DEFAULT_ROUTINES: DailyRoutineStep[] = [
  {
    id: 'rt_1',
    time: '07:15',
    title: 'Đón học sinh & Mở cửa thông thoáng',
    description: 'Có mặt tại lớp, mở rèm cửa sổ đón gió lành, chào đón học sinh đầu ngày và nhắc cất cặp gọn gàng.',
    completedToday: false,
  },
  {
    id: 'rt_2',
    time: '07:30',
    title: '15 phút đầu giờ: Điểm danh & Truy bài',
    description: 'Điểm danh 1 chạm trên hệ thống, kiểm tra khăn quàng / đồng phục, ban cán sự kiểm tra bài tập về nhà.',
    completedToday: false,
  },
  {
    id: 'rt_3',
    time: '09:00',
    title: 'Thể dục giữa giờ & Uống nước',
    description: 'Nhắc nhở học sinh ra sân tập thể dục nhịp điệu, uống đủ nước và vệ sinh cá nhân trước tiết 3.',
    completedToday: false,
  },
  {
    id: 'rt_4',
    time: '11:15',
    title: 'Tổ chức Bán trú & Ăn trưa',
    description: 'Rửa tay xà phòng, hướng dẫn học sinh ăn cơm trật tự, không để rơi vãi thức ăn, xếp gọn khay thìa.',
    completedToday: false,
  },
  {
    id: 'rt_5',
    time: '12:00',
    title: 'Nghỉ trưa & Phòng ngủ trật tự',
    description: 'Nhắc học sinh giữ trật tự, điều chỉnh nhiệt độ quạt/điều hòa vừa phải, đảm bảo an toàn giấc ngủ.',
    completedToday: false,
  },
  {
    id: 'rt_6',
    time: '13:45',
    title: 'Báo thức chiều & Rửa mặt',
    description: 'Gấp chăn gối gọn gàng, rửa mặt tỉnh táo chuẩn bị cho các tiết học buổi chiều.',
    completedToday: false,
  },
  {
    id: 'rt_7',
    time: '16:15',
    title: 'Sinh hoạt cuối ngày & Trả trẻ an toàn',
    description: 'Nhắc học sinh mang đầy đủ đồ dùng cá nhân, tắt điện quạt, kiểm tra lớp và bàn giao học sinh cho phụ huynh.',
    completedToday: false,
  },
];

const QUICK_DUTY_SUGGESTIONS = [
  'Quét lớp sạch sẽ',
  'Lau bảng sau mỗi tiết',
  'Đổ rác đúng giờ',
  'Kê bàn ghế ngay ngắn',
  'Tưới cây góc thiên nhiên',
  'Chuẩn bị phấn & khăn lau',
  'Kiểm tra tắt điện quạt',
  'Sắp xếp tủ sách lớp học',
];

export const TimetableView: React.FC = () => {
  const { activeClass, currentUser, timetable, students, refreshActiveData, showToast } = useApp();

  // State
  const [grid, setGrid] = useState<Record<string, string>>({});
  const [periods, setPeriods] = useState<TimetablePeriod[]>(DEFAULT_PERIODS);
  const [duties, setDuties] = useState<DutyAssignment[]>(DEFAULT_DUTIES);
  const [routines, setRoutines] = useState<DailyRoutineStep[]>(DEFAULT_ROUTINES);
  const [saving, setSaving] = useState(false);

  // Modals
  const [isDesignModalOpen, setIsDesignModalOpen] = useState(false);
  const [isEditPeriodsModalOpen, setIsEditPeriodsModalOpen] = useState(false);
  const [isEditDutiesModalOpen, setIsEditDutiesModalOpen] = useState(false);
  const [isEditRoutinesModalOpen, setIsEditRoutinesModalOpen] = useState(false);
  const [isZaloModalOpen, setIsZaloModalOpen] = useState(false);

  // Edit draft states
  const [tempPeriods, setTempPeriods] = useState<TimetablePeriod[]>([]);
  const [tempDuties, setTempDuties] = useState<DutyAssignment[]>([]);
  const [tempRoutines, setTempRoutines] = useState<DailyRoutineStep[]>([]);

  // Load custom periods, duties, routines for the active classroom
  useEffect(() => {
    if (!activeClass || !currentUser) return;

    const loadCustomSettings = async () => {
      try {
        const [savedPeriods, savedDuties, savedRoutines] = await Promise.all([
          TimetableRepository.getPeriods(activeClass.id, currentUser.uid),
          TimetableRepository.getDutyAssignments(activeClass.id, currentUser.uid),
          TimetableRepository.getDailyRoutines(activeClass.id, currentUser.uid),
        ]);

        if (savedPeriods && savedPeriods.length > 0) {
          setPeriods(savedPeriods);
        } else {
          setPeriods(DEFAULT_PERIODS);
        }

        if (savedDuties && savedDuties.length > 0) {
          setDuties(savedDuties);
        } else {
          setDuties(DEFAULT_DUTIES);
        }

        if (savedRoutines && savedRoutines.length > 0) {
          setRoutines(savedRoutines);
        } else {
          setRoutines(DEFAULT_ROUTINES);
        }
      } catch (err) {
        console.warn('Error loading custom timetable settings:', err);
      }
    };

    loadCustomSettings();
  }, [activeClass, currentUser]);

  // Initialize timetable matrix
  useEffect(() => {
    const map: Record<string, string> = {};
    // Load from database if exists
    timetable.forEach((item) => {
      map[`${item.dayOfWeek}_${item.period}`] = item.subject;
    });

    // Provide sensible defaults if empty
    DAYS.forEach((d) => {
      periods.forEach((p) => {
        const key = `${d.key}_${p.period}`;
        if (!map[key]) {
          if (d.key === 'monday' && p.period === 1) map[key] = 'Chào cờ';
          else if (d.key === 'friday' && p.period === 7) map[key] = 'Sinh hoạt lớp';
          else map[key] = p.defaultSub || 'Ôn luyện';
        }
      });
    });

    setGrid(map);
  }, [timetable, periods]);

  const handleCellChange = (day: string, period: number, subject: string) => {
    setGrid((prev) => ({
      ...prev,
      [`${day}_${period}`]: subject,
    }));
  };

  const handleSaveTimetable = async () => {
    if (!activeClass || !currentUser) return;
    setSaving(true);
    try {
      const cells: any[] = [];
      DAYS.forEach((d) => {
        periods.forEach((p) => {
          cells.push({
            dayOfWeek: d.key,
            period: p.period,
            session: p.session,
            subject: grid[`${d.key}_${p.period}`] || 'Nghỉ',
          });
        });
      });

      await TimetableRepository.saveTimetable(activeClass.id, currentUser.uid, cells);
      await refreshActiveData();
      showToast('Đã lưu thời khóa biểu lớp học thành công!');
    } catch (err: any) {
      showToast('Lỗi khi lưu TKB: ' + (err.message || ''), 'error');
    } finally {
      setSaving(false);
    }
  };

  // --- Handlers: Edit Periods Modal ---
  const openEditPeriods = () => {
    setTempPeriods(JSON.parse(JSON.stringify(periods)));
    setIsEditPeriodsModalOpen(true);
  };

  const handlePeriodChange = (index: number, field: keyof TimetablePeriod, value: any) => {
    setTempPeriods((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAddPeriod = (session: 'morning' | 'afternoon') => {
    setTempPeriods((prev) => {
      const nextPeriodNum = prev.length > 0 ? Math.max(...prev.map((p) => p.period)) + 1 : 1;
      return [
        ...prev,
        {
          period: nextPeriodNum,
          session,
          name: `Tiết ${nextPeriodNum}`,
          time: session === 'morning' ? '10:45 - 11:20' : '16:15 - 16:50',
          defaultSub: 'Ôn luyện',
        },
      ];
    });
  };

  const handleDeletePeriod = (index: number) => {
    setTempPeriods((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSavePeriods = async () => {
    if (!activeClass || !currentUser) return;
    try {
      await TimetableRepository.savePeriods(activeClass.id, currentUser.uid, tempPeriods);
      setPeriods(tempPeriods);
      setIsEditPeriodsModalOpen(false);
      showToast('Đã cập nhật khung giờ các tiết học!');
    } catch (err: any) {
      showToast('Lỗi lưu khung giờ: ' + (err.message || ''), 'error');
    }
  };

  const handleResetPeriods = () => {
    setTempPeriods(JSON.parse(JSON.stringify(DEFAULT_PERIODS)));
  };

  // --- Handlers: Edit Duty Assignments Modal ---
  const openEditDuties = () => {
    setTempDuties(JSON.parse(JSON.stringify(duties)));
    setIsEditDutiesModalOpen(true);
  };

  const handleDutyChange = (index: number, field: keyof DutyAssignment, value: any) => {
    setTempDuties((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleToggleStudentInDuty = (dutyIndex: number, studentId: string) => {
    setTempDuties((prev) => {
      const next = [...prev];
      const currentIds = next[dutyIndex].assignedStudentIds || [];
      const updated = currentIds.includes(studentId)
        ? currentIds.filter((id) => id !== studentId)
        : [...currentIds, studentId];
      next[dutyIndex] = { ...next[dutyIndex], assignedStudentIds: updated };
      return next;
    });
  };

  const handleAddDuty = () => {
    setTempDuties((prev) => [
      ...prev,
      {
        id: 'duty_' + Date.now(),
        day: 'Thứ Bảy',
        dayKey: 'saturday',
        assigneeType: 'group',
        assignedGroup: 'Tổ 1',
        tasks: 'Kiểm tra vệ sinh và khóa cửa phòng học',
      },
    ]);
  };

  const handleDeleteDuty = (index: number) => {
    setTempDuties((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveDuties = async () => {
    if (!activeClass || !currentUser) return;
    try {
      await TimetableRepository.saveDutyAssignments(activeClass.id, currentUser.uid, tempDuties);
      setDuties(tempDuties);
      setIsEditDutiesModalOpen(false);
      showToast('Đã lưu phân công trực nhật thành công!');
    } catch (err: any) {
      showToast('Lỗi lưu phân công: ' + (err.message || ''), 'error');
    }
  };

  const handleResetDuties = () => {
    setTempDuties(JSON.parse(JSON.stringify(DEFAULT_DUTIES)));
  };

  // --- Handlers: Edit Routines Modal ---
  const openEditRoutines = () => {
    setTempRoutines(JSON.parse(JSON.stringify(routines)));
    setIsEditRoutinesModalOpen(true);
  };

  const handleRoutineChange = (index: number, field: keyof DailyRoutineStep, value: any) => {
    setTempRoutines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAddRoutine = () => {
    setTempRoutines((prev) => [
      ...prev,
      {
        id: 'rt_' + Date.now(),
        time: '15:00',
        title: 'Giờ uống sữa / Bữa phụ xế',
        description: 'Nhắc học sinh rửa tay và dùng bữa nhẹ trật tự.',
        completedToday: false,
      },
    ]);
  };

  const handleDeleteRoutine = (index: number) => {
    setTempRoutines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveRoutines = async () => {
    if (!activeClass || !currentUser) return;
    try {
      await TimetableRepository.saveDailyRoutines(activeClass.id, currentUser.uid, tempRoutines);
      setRoutines(tempRoutines);
      setIsEditRoutinesModalOpen(false);
      showToast('Đã lưu quy trình nề nếp của GVCN!');
    } catch (err: any) {
      showToast('Lỗi lưu quy trình: ' + (err.message || ''), 'error');
    }
  };

  const handleResetRoutines = () => {
    setTempRoutines(JSON.parse(JSON.stringify(DEFAULT_ROUTINES)));
  };

  const handleToggleRoutineCheck = async (routineId: string) => {
    const updated = routines.map((r) =>
      r.id === routineId ? { ...r, completedToday: !r.completedToday } : r
    );
    setRoutines(updated);
    if (activeClass && currentUser) {
      try {
        await TimetableRepository.saveDailyRoutines(activeClass.id, currentUser.uid, updated);
      } catch (e) {
        console.warn('Failed to update routine toggle:', e);
      }
    }
  };

  // Progress stats for routines
  const completedRoutineCount = routines.filter((r) => r.completedToday).length;
  const routinePercentage = routines.length > 0 ? Math.round((completedRoutineCount / routines.length) * 100) : 0;

  // Prepare Zalo message preview for timetable
  const timetableZaloContent = `THỜI KHÓA BIỂU & LỊCH TUẦN LỚP ${activeClass?.className || '3A1'}\n` +
    `Năm học: ${activeClass?.schoolYear || '2025 - 2026'} | GVCN: ${activeClass?.teacherName || 'Cô Giáo'}\n\n` +
    `Kính gửi Quý Phụ huynh Thời khóa biểu chi tiết:\n` +
    DAYS.map((d) => {
      const subs = periods.map((p) => `${p.name || `Tiết ${p.period}`}: ${grid[`${d.key}_${p.period}`] || 'Nghỉ'}`).join(', ');
      return `📌 ${d.label}: ${subs}`;
    }).join('\n') +
    `\n\n🧹 Phân công trực nhật tuần:\n` +
    duties.map((du) => `• ${du.day}: ${du.assignedGroup || 'Tổ trực'} (${du.tasks})`).join('\n') +
    `\n\nKính chúc các con có một tuần học tập thật vui và bổ ích!`;

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 no-print">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-emerald-600" />
            <span>Thời Khóa Biểu & Lịch Tuần Lớp {activeClass?.className || '---'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cài đặt giờ từng tiết · Phân công trực nhật Tổ / Học sinh · Quy trình nề nếp GVCN
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Design Timetable Button (Sparkles) */}
          <button
            onClick={() => setIsDesignModalOpen(true)}
            className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:opacity-90 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-98"
          >
            <Sparkles className="w-4 h-4 text-amber-200" />
            <span>Thiết kế Poster Nghệ Thuật (3D, Chibi, Pixel...)</span>
          </button>

          <button
            onClick={openEditPeriods}
            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Tùy chỉnh giờ bắt đầu - kết thúc của từng tiết"
          >
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Sửa giờ từng tiết</span>
          </button>

          <button
            onClick={() => setIsZaloModalOpen(true)}
            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Gửi Zalo PH</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>In TKB</span>
          </button>

          <button
            onClick={handleSaveTimetable}
            disabled={saving}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Đang lưu...' : 'Lưu TKB'}</span>
          </button>
        </div>
      </div>

      {/* Main Timetable Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden printable-area">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              THỜI KHÓA BIỂU LỚP {activeClass?.className?.toUpperCase()} - NĂM HỌC {activeClass?.schoolYear}
            </h3>
            <p className="text-xs text-slate-500">{activeClass?.schoolName} · GVCN: {activeClass?.teacherName}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Khung giờ: {periods.length} tiết / ngày</span>
            <button
              onClick={openEditPeriods}
              className="text-xs text-emerald-700 hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <Edit2 className="w-3 h-3" />
              <span>Chỉnh khung giờ</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100/70 text-slate-700 font-bold border-b border-slate-200 text-center">
              <tr>
                <th className="py-2.5 px-3 border-r border-slate-200 w-20">Buổi</th>
                <th className="py-2.5 px-3 border-r border-slate-200 w-32">
                  <div className="flex items-center justify-center gap-1">
                    <span>Tiết / Giờ</span>
                    <button
                      onClick={openEditPeriods}
                      className="p-0.5 hover:bg-slate-200 rounded text-slate-500"
                      title="Sửa giờ từng tiết"
                    >
                      <Clock className="w-3 h-3" />
                    </button>
                  </div>
                </th>
                {DAYS.map((d) => (
                  <th key={d.key} className="py-2.5 px-3 border-r border-slate-200 min-w-[120px]">
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {/* Morning Session */}
              {periods.filter((p) => p.session === 'morning').map((p, idx, arr) => (
                <tr key={p.period} className="hover:bg-slate-50/50">
                  {idx === 0 && (
                    <td
                      rowSpan={arr.length}
                      className="py-3 px-3 text-center font-bold bg-emerald-50/40 text-emerald-900 border-r border-slate-200 uppercase text-[11px]"
                    >
                      Buổi Sáng
                    </td>
                  )}
                  <td className="py-2 px-3 text-center border-r border-slate-200 bg-slate-50/50">
                    <div className="font-bold text-slate-800">{p.name || `Tiết ${p.period}`}</div>
                    <div
                      onClick={openEditPeriods}
                      className="text-[10px] text-slate-500 hover:text-emerald-700 cursor-pointer font-mono font-medium"
                      title="Nhấn để đổi giờ tiết này"
                    >
                      {p.time || 'Chưa đặt'}
                    </div>
                  </td>
                  {DAYS.map((d) => {
                    const key = `${d.key}_${p.period}`;
                    const currentVal = grid[key] || '';
                    const isFlag = currentVal === 'Chào cờ';
                    const isClosing = currentVal === 'Sinh hoạt lớp';

                    return (
                      <td key={d.key} className="p-1 border-r border-slate-200 text-center">
                        <select
                          value={currentVal}
                          onChange={(e) => handleCellChange(d.key, p.period, e.target.value)}
                          className={`w-full py-2 px-1 text-xs font-semibold rounded-lg border-0 text-center focus:ring-2 focus:ring-emerald-500 cursor-pointer ${
                            isFlag
                              ? 'bg-red-50 text-red-700 font-bold'
                              : isClosing
                              ? 'bg-amber-50 text-amber-800 font-bold'
                              : 'bg-transparent text-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          {SUBJECT_OPTIONS.map((sub) => (
                            <option key={sub} value={sub}>
                              {sub}
                            </option>
                          ))}
                        </select>
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Afternoon Session */}
              {periods.filter((p) => p.session === 'afternoon').map((p, idx, arr) => (
                <tr key={p.period} className="hover:bg-slate-50/50">
                  {idx === 0 && (
                    <td
                      rowSpan={arr.length}
                      className="py-3 px-3 text-center font-bold bg-amber-50/40 text-amber-900 border-r border-slate-200 uppercase text-[11px]"
                    >
                      Buổi Chiều
                    </td>
                  )}
                  <td className="py-2 px-3 text-center border-r border-slate-200 bg-slate-50/50">
                    <div className="font-bold text-slate-800">{p.name || `Tiết ${p.period}`}</div>
                    <div
                      onClick={openEditPeriods}
                      className="text-[10px] text-slate-500 hover:text-emerald-700 cursor-pointer font-mono font-medium"
                      title="Nhấn để đổi giờ tiết này"
                    >
                      {p.time || 'Chưa đặt'}
                    </div>
                  </td>
                  {DAYS.map((d) => {
                    const key = `${d.key}_${p.period}`;
                    const currentVal = grid[key] || '';
                    const isClosing = currentVal === 'Sinh hoạt lớp';

                    return (
                      <td key={d.key} className="p-1 border-r border-slate-200 text-center">
                        <select
                          value={currentVal}
                          onChange={(e) => handleCellChange(d.key, p.period, e.target.value)}
                          className={`w-full py-2 px-1 text-xs font-semibold rounded-lg border-0 text-center focus:ring-2 focus:ring-emerald-500 cursor-pointer ${
                            isClosing
                              ? 'bg-amber-50 text-amber-800 font-bold'
                              : 'bg-transparent text-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          {SUBJECT_OPTIONS.map((sub) => (
                            <option key={sub} value={sub}>
                              {sub}
                            </option>
                          ))}
                        </select>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Duty Schedule & Routine Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 no-print">
        {/* 1. Duty Schedule (Phân công trực nhật các Tổ trong tuần) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Phân công trực nhật các Tổ trong tuần</span>
            </div>
            <button
              onClick={openEditDuties}
              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Chỉnh sửa nhiệm vụ & Tổ/Học sinh</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {duties.map((duty, idx) => {
              // Get assigned student names if specific students selected
              const assignedStudentNames = duty.assignedStudentIds && duty.assignedStudentIds.length > 0
                ? students.filter((s) => duty.assignedStudentIds?.includes(s.id)).map((s) => s.fullName)
                : [];

              return (
                <div
                  key={duty.id || idx}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-emerald-200 transition-colors space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{duty.day}</span>
                    <span className="font-bold text-xs text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                      {duty.assigneeType === 'student' && assignedStudentNames.length > 0
                        ? `Học sinh: ${assignedStudentNames.join(', ')}`
                        : duty.assignedGroup || 'Tổ trực'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 flex items-start gap-1.5">
                    <span className="text-slate-400 font-medium shrink-0">Nhiệm vụ:</span>
                    <span className="font-medium text-slate-800">{duty.tasks || 'Chưa giao nhiệm vụ cụ thể'}</span>
                  </div>
                  {duty.notes && (
                    <div className="text-[11px] text-amber-700 bg-amber-50/60 px-2 py-0.5 rounded-md border border-amber-100">
                      Lưu ý: {duty.notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Daily Routine (Quy trình nề nếp mỗi ngày của GVCN) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>Quy trình nề nếp mỗi ngày của GVCN</span>
            </div>
            <button
              onClick={openEditRoutines}
              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Chỉnh sửa các bước</span>
            </button>
          </div>

          {/* Routine Tracker Header */}
          <div className="p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-indigo-950">Tiến độ nề nếp hôm nay</span>
              <p className="text-[11px] text-indigo-700 font-medium">
                Đã hoàn thành {completedRoutineCount}/{routines.length} bước ({routinePercentage}%)
              </p>
            </div>
            <div className="w-20 bg-indigo-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
                style={{ width: `${routinePercentage}%` }}
              />
            </div>
          </div>

          {/* Routine Steps List with Interactive Checklist */}
          <div className="space-y-2 text-xs">
            {routines.map((routine) => (
              <div
                key={routine.id}
                onClick={() => handleToggleRoutineCheck(routine.id)}
                className={`p-2.5 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer ${
                  routine.completedToday
                    ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                    : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/70 text-slate-800'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    routine.completedToday ? 'bg-emerald-600 text-white' : 'border-2 border-slate-300 bg-white'
                  }`}
                >
                  {routine.completedToday && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>

                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[11px] bg-slate-200/70 text-slate-700">
                      {routine.time}
                    </span>
                    <span className={`font-bold ${routine.completedToday ? 'line-through text-slate-500' : ''}`}>
                      {routine.title}
                    </span>
                  </div>
                  {routine.description && (
                    <p className="text-[11px] text-slate-500 leading-relaxed">{routine.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: Cài đặt & Chỉnh sửa thời gian từng tiết        */}
      {/* ======================================================== */}
      {isEditPeriodsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-emerald-200" />
                <div>
                  <h3 className="text-base font-bold">Cài Đặt Khung Giờ Từng Tiết Học</h3>
                  <p className="text-xs text-emerald-100">
                    Tùy chỉnh thời gian bắt đầu - kết thúc phù hợp với thời khóa biểu thực tế của trường
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditPeriodsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Danh sách tiết học ({tempPeriods.length} tiết)
                </span>
                <button
                  onClick={handleResetPeriods}
                  className="text-xs text-slate-500 hover:text-emerald-700 flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Khôi phục giờ chuẩn BGD</span>
                </button>
              </div>

              <div className="space-y-3">
                {tempPeriods.map((p, idx) => (
                  <div
                    key={p.period}
                    className="p-3 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
                  >
                    <div className="flex items-center gap-2 w-32 shrink-0">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                        {p.period}
                      </span>
                      <input
                        type="text"
                        value={p.name || `Tiết ${p.period}`}
                        onChange={(e) => handlePeriodChange(idx, 'name', e.target.value)}
                        placeholder="Tên tiết"
                        className="w-24 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="flex items-center gap-2 flex-1">
                      <select
                        value={p.session}
                        onChange={(e) => handlePeriodChange(idx, 'session', e.target.value as any)}
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium cursor-pointer"
                      >
                        <option value="morning">Buổi Sáng</option>
                        <option value="afternoon">Buổi Chiều</option>
                      </select>

                      <div className="flex-1 flex items-center gap-1.5">
                        <span className="text-xs text-slate-500 font-medium">Khung giờ:</span>
                        <input
                          type="text"
                          value={p.time}
                          onChange={(e) => handlePeriodChange(idx, 'time', e.target.value)}
                          placeholder="vd: 07:30 - 08:05"
                          className="flex-1 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeletePeriod(idx)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      title="Xóa tiết này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => handleAddPeriod('morning')}
                  className="px-3 py-1.5 border border-dashed border-emerald-400 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm tiết Buổi Sáng</span>
                </button>
                <button
                  onClick={() => handleAddPeriod('afternoon')}
                  className="px-3 py-1.5 border border-dashed border-amber-400 bg-amber-50/50 hover:bg-amber-50 text-amber-800 text-xs font-semibold rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm tiết Buổi Chiều</span>
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
              <button
                onClick={() => setIsEditPeriodsModalOpen(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSavePeriods}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Lưu khung giờ tiết học</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: Chỉnh sửa phân công trực nhật (Tổ hoặc Học sinh) */}
      {/* ======================================================== */}
      {isEditDutiesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-emerald-200" />
                <div>
                  <h3 className="text-base font-bold">Chỉnh Sửa Phân Công Trực Nhật Trong Tuần</h3>
                  <p className="text-xs text-emerald-100">
                    Phân công theo Tổ hoặc chỉ định từng Học sinh cụ thể · Chỉnh sửa nhiệm vụ chi tiết
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditDutiesModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Lịch trực nhật các ngày ({tempDuties.length} ngày)
                </span>
                <button
                  onClick={handleResetDuties}
                  className="text-xs text-slate-500 hover:text-emerald-700 flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Khôi phục mặc định</span>
                </button>
              </div>

              <div className="space-y-4">
                {tempDuties.map((duty, idx) => (
                  <div
                    key={duty.id || idx}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={duty.day}
                          onChange={(e) => handleDutyChange(idx, 'day', e.target.value)}
                          placeholder="Thứ..."
                          className="w-28 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                        />
                        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                          <button
                            type="button"
                            onClick={() => handleDutyChange(idx, 'assigneeType', 'group')}
                            className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                              duty.assigneeType === 'group'
                                ? 'bg-emerald-600 text-white'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            Theo Tổ
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDutyChange(idx, 'assigneeType', 'student')}
                            className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                              duty.assigneeType === 'student'
                                ? 'bg-emerald-600 text-white'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            Chọn Học Sinh
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteDuty(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors self-end sm:self-auto"
                        title="Xóa phiên trực này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Assignee selection */}
                    {duty.assigneeType === 'group' ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-medium">Tổ phụ trách:</span>
                        <input
                          type="text"
                          value={duty.assignedGroup || ''}
                          onChange={(e) => handleDutyChange(idx, 'assignedGroup', e.target.value)}
                          placeholder="vd: Tổ 1 (Trực tuần)"
                          className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                        />
                        <div className="flex gap-1">
                          {['Tổ 1', 'Tổ 2', 'Tổ 3', 'Tổ 4', 'Cả lớp'].map((g) => (
                            <button
                              key={g}
                              type="button"
                              onClick={() => handleDutyChange(idx, 'assignedGroup', g)}
                              className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-[11px] font-medium rounded-lg"
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <span className="text-xs text-slate-600 font-semibold flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Chọn các học sinh phụ trách ngày này:</span>
                        </span>
                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-white rounded-xl border border-slate-200">
                          {students.map((stu) => {
                            const isSelected = duty.assignedStudentIds?.includes(stu.id);
                            return (
                              <button
                                key={stu.id}
                                type="button"
                                onClick={() => handleToggleStudentInDuty(idx, stu.id)}
                                className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                <span>{stu.fullName}</span>
                                <span className="text-[10px] opacity-75 font-mono">({stu.groupId})</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Task field with quick chips */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600 font-semibold">Nhiệm vụ trực nhật:</span>
                        <span className="text-[10px] text-slate-400">Gợi ý nhanh bên dưới:</span>
                      </div>
                      <input
                        type="text"
                        value={duty.tasks}
                        onChange={(e) => handleDutyChange(idx, 'tasks', e.target.value)}
                        placeholder="vd: Quét lớp, lau bảng, đổ rác..."
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                      />
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {QUICK_DUTY_SUGGESTIONS.map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => {
                              const current = duty.tasks || '';
                              const updated = current ? `${current}, ${sug}` : sug;
                              handleDutyChange(idx, 'tasks', updated);
                            }}
                            className="text-[10px] px-2 py-0.5 bg-white hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 rounded-md text-slate-600 transition-colors"
                          >
                            + {sug}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Notes field */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-medium">Ghi chú:</span>
                      <input
                        type="text"
                        value={duty.notes || ''}
                        onChange={(e) => handleDutyChange(idx, 'notes', e.target.value)}
                        placeholder="vd: Tập trung lúc 07:15..."
                        className="flex-1 px-3 py-1 bg-white border border-slate-200 rounded-xl text-xs text-slate-700"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleAddDuty}
                className="w-full py-2.5 border border-dashed border-emerald-400 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-800 text-xs font-bold rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm ngày trực nhật mới</span>
              </button>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
              <button
                onClick={() => setIsEditDutiesModalOpen(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSaveDuties}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Lưu phân công trực nhật</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: Chỉnh sửa quy trình nề nếp mỗi ngày của GVCN    */}
      {/* ======================================================== */}
      {isEditRoutinesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-indigo-600 to-purple-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-indigo-200" />
                <div>
                  <h3 className="text-base font-bold">Chỉnh Sửa Quy Trình Nề Nếp Của GVCN</h3>
                  <p className="text-xs text-indigo-100">
                    Sắp xếp các mốc thời gian và nhiệm vụ nề nếp xuyên suốt một ngày học tập của lớp
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditRoutinesModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Các mốc nề nếp ({tempRoutines.length} mốc)
                </span>
                <button
                  onClick={handleResetRoutines}
                  className="text-xs text-slate-500 hover:text-indigo-700 flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Khôi phục quy trình chuẩn</span>
                </button>
              </div>

              <div className="space-y-3">
                {tempRoutines.map((routine, idx) => (
                  <div
                    key={routine.id || idx}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={routine.time}
                          onChange={(e) => handleRoutineChange(idx, 'time', e.target.value)}
                          placeholder="07:15"
                          className="w-20 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-indigo-900"
                        />
                        <input
                          type="text"
                          value={routine.title}
                          onChange={(e) => handleRoutineChange(idx, 'title', e.target.value)}
                          placeholder="Tiêu đề công việc..."
                          className="flex-1 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                        />
                      </div>
                      <button
                        onClick={() => handleDeleteRoutine(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        title="Xóa mốc này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <textarea
                        value={routine.description || ''}
                        onChange={(e) => handleRoutineChange(idx, 'description', e.target.value)}
                        placeholder="Mô tả chi tiết nhắc nhở / hành động cần làm..."
                        rows={2}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleAddRoutine}
                className="w-full py-2.5 border border-dashed border-indigo-400 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-800 text-xs font-bold rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm mốc nề nếp mới</span>
              </button>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
              <button
                onClick={() => setIsEditRoutinesModalOpen(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSaveRoutines}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Lưu quy trình nề nếp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: Studio Thiết kế Thời khóa biểu Nghệ thuật (3D, Chibi...) */}
      {/* ======================================================== */}
      <TimetableDesignModal
        isOpen={isDesignModalOpen}
        onClose={() => setIsDesignModalOpen(false)}
        activeClass={activeClass}
        periods={periods}
        grid={grid}
        days={DAYS}
        duties={duties}
        onShareZalo={() => {
          setIsDesignModalOpen(false);
          setIsZaloModalOpen(true);
        }}
      />

      {/* ======================================================== */}
      {/* MODAL 5: Gửi Thời Khóa Biểu & Lịch Tuần Qua Zalo          */}
      {/* ======================================================== */}
      {isZaloModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col">
            <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-blue-200" />
                <div>
                  <h3 className="text-sm font-bold">Gửi Lịch Học & Trực Nhật Qua Zalo Lớp</h3>
                  <p className="text-[11px] text-blue-100">Gửi thông báo nhanh đến phụ huynh lớp {activeClass?.className}</p>
                </div>
              </div>
              <button
                onClick={() => setIsZaloModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nội dung thông báo (đã được định dạng sẵn):
                </label>
                <textarea
                  value={timetableZaloContent}
                  readOnly
                  rows={9}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 leading-relaxed focus:outline-none"
                />
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  Mẹo: Thầy/Cô có thể vào <strong>"Thiết kế Poster"</strong> để tải ảnh đẹp đính kèm khi gửi vào nhóm Zalo!
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsZaloModalOpen(false)}
                className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(timetableZaloContent);
                  showToast('Đã sao chép nội dung TKB vào bộ nhớ tạm!');
                }}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Sao chép tin nhắn</span>
              </button>
              <a
                href="https://chat.zalo.me"
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  navigator.clipboard.writeText(timetableZaloContent);
                  showToast('Đã sao chép! Mở Zalo Web để dán tin nhắn.');
                }}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Mở Zalo gửi ngay</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
