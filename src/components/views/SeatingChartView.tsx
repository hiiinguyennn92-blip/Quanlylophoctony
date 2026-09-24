import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Student, SeatingAssignment, SeatingLayoutConfig, DeskType } from '../../types';
import { SeatingRepository } from '../../repositories/dataRepository';
import {
  Grid,
  Printer,
  Sparkles,
  Save,
  RotateCcw,
  Users,
  Settings2,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Eye,
  Glasses,
  Crown,
  Search,
  ArrowLeftRight,
  ArrowRightLeft,
  X,
  Plus,
  DoorOpen,
  Sun,
  LayoutGrid,
  Shuffle,
  Columns,
  Rows,
  Layers,
  Check,
  Compass,
} from 'lucide-react';

const DEFAULT_CONFIG: SeatingLayoutConfig = {
  columns: 3,
  rows: 5,
  deskType: 'double',
  teacherDeskPos: 'right',
  boardTitle: 'BẢNG XANH LỚP HỌC · THI ĐUA HỌC TỐT',
  showAvatars: true,
  showGroupBadge: true,
  showSpecialNotes: true,
  doorPos: 'left',
  windowPos: 'right',
  aisleWidth: 'normal',
  themeStyle: 'chalkboard',
};

const PRESETS: Array<{
  name: string;
  desc: string;
  cols: number;
  rows: number;
  deskType: DeskType;
  icon: string;
}> = [
  {
    name: 'Tiêu chuẩn 3 Dãy Đôi',
    desc: '3 Dãy x 5 Bàn = 30 chỗ (Mô hình phổ biến nhất ở Tiểu học)',
    cols: 3,
    rows: 5,
    deskType: 'double',
    icon: '🏫',
  },
  {
    name: 'Tiêu chuẩn 4 Dãy Đôi',
    desc: '4 Dãy x 5 Bàn = 40 chỗ (Lớp học quy mô lớn)',
    cols: 4,
    rows: 5,
    deskType: 'double',
    icon: '🏢',
  },
  {
    name: 'Phòng học 3 Dãy Ba',
    desc: '3 Dãy x 4 Bàn = 36 chỗ (Bàn dài 3 học sinh)',
    cols: 3,
    rows: 4,
    deskType: 'triple',
    icon: '👥',
  },
  {
    name: 'Phòng thi / Bàn Đơn',
    desc: '4 Dãy x 6 Bàn = 24 chỗ (Bàn đơn cá nhân, tập trung cao)',
    cols: 4,
    rows: 6,
    deskType: 'single',
    icon: '🎯',
  },
];

export const SeatingChartView: React.FC = () => {
  const { activeClass, currentUser, students, seatingAssignments, refreshActiveData, showToast } = useApp();

  // Layout Configuration
  const [config, setConfig] = useState<SeatingLayoutConfig>(DEFAULT_CONFIG);
  const [tempConfig, setTempConfig] = useState<SeatingLayoutConfig>(DEFAULT_CONFIG);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Seating Matrix State: key is `${row}_${col}_${pos}` -> studentId
  const [seats, setSeats] = useState<Record<string, string>>({});
  const [selectedSeat, setSelectedSeat] = useState<{ row: number; col: number; pos: string } | null>(null);
  const [selectedUnassignedStudentId, setSelectedUnassignedStudentId] = useState<string | null>(null);

  // Search & Filter in Unassigned Tray
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGroup, setFilterGroup] = useState<string>('all');

  // Saving state
  const [saving, setSaving] = useState(false);

  // Map of students for O(1) lookup
  const studentMap = useMemo(() => {
    return new Map(students.map((s) => [s.id, s]));
  }, [students]);

  // Load layout config from repository
  useEffect(() => {
    if (!activeClass || !currentUser) return;

    const loadConfig = async () => {
      try {
        const saved = await SeatingRepository.getLayoutConfig(activeClass.id, currentUser.uid);
        if (saved) {
          setConfig((prev) => ({ ...prev, ...saved }));
        } else {
          // Adjust default config according to student count
          const initialCols = students.length > 34 ? 4 : 3;
          const initialRows = Math.max(4, Math.ceil(students.length / (initialCols * 2)));
          setConfig((prev) => ({
            ...prev,
            columns: initialCols,
            rows: Math.min(7, Math.max(4, initialRows)),
          }));
        }
      } catch (err) {
        console.warn('Error loading seating config:', err);
      }
    };

    loadConfig();
  }, [activeClass, currentUser, students.length]);

  // Sync seats from database
  useEffect(() => {
    const map: Record<string, string> = {};

    seatingAssignments.forEach((assign) => {
      if (studentMap.has(assign.studentId)) {
        map[`${assign.row}_${assign.col}_${assign.position}`] = assign.studentId;
      }
    });

    // If completely empty and we have students, assign default layout
    if (seatingAssignments.length === 0 && students.length > 0) {
      let stuIdx = 0;
      const cols = config.columns;
      const rows = config.rows;
      const positions = config.deskType === 'triple' ? ['left', 'middle', 'right'] : config.deskType === 'single' ? ['single'] : ['left', 'right'];

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          for (const pos of positions) {
            if (stuIdx < students.length) {
              map[`${r}_${c}_${pos}`] = students[stuIdx].id;
              stuIdx++;
            }
          }
        }
      }
    }

    setSeats(map);
  }, [seatingAssignments, studentMap, config.columns, config.rows, config.deskType, students]);

  // Assigned student IDs
  const assignedStudentIds = useMemo(() => {
    const set = new Set<string>();
    Object.values(seats).forEach((id) => {
      if (id && studentMap.has(id)) set.add(id);
    });
    return set;
  }, [seats, studentMap]);

  // Unassigned students
  const unassignedStudents = useMemo(() => {
    return students.filter((s) => !assignedStudentIds.has(s.id));
  }, [students, assignedStudentIds]);

  // Filtered unassigned students
  const filteredUnassignedStudents = useMemo(() => {
    return unassignedStudents.filter((s) => {
      const matchName = s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || (s.studentCode && s.studentCode.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchGroup = filterGroup === 'all' || s.groupId === filterGroup;
      return matchName && matchGroup;
    });
  }, [unassignedStudents, searchQuery, filterGroup]);

  // Unique groups for filtering
  const groupsList = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.groupId) set.add(s.groupId);
    });
    return Array.from(set).sort();
  }, [students]);

  // Seats per desk based on deskType
  const seatPositions = useMemo(() => {
    if (config.deskType === 'triple') return ['left', 'middle', 'right'];
    if (config.deskType === 'single') return ['single'];
    return ['left', 'right'];
  }, [config.deskType]);

  const totalCapacity = config.columns * config.rows * seatPositions.length;

  // Handle seat click
  const handleSeatClick = (row: number, col: number, pos: string) => {
    const seatKey = `${row}_${col}_${pos}`;

    // Case 1: An unassigned student was selected -> place them into this seat
    if (selectedUnassignedStudentId) {
      setSeats((prev) => {
        const next = { ...prev };
        next[seatKey] = selectedUnassignedStudentId;
        return next;
      });
      setSelectedUnassignedStudentId(null);
      showToast('Đã xếp học sinh vào chỗ ngồi!');
      return;
    }

    // Case 2: No seat currently selected -> select this seat
    if (!selectedSeat) {
      setSelectedSeat({ row, col, pos });
      return;
    }

    // Case 3: Clicked the exact same seat -> deselect
    if (selectedSeat.row === row && selectedSeat.col === col && selectedSeat.pos === pos) {
      setSelectedSeat(null);
      return;
    }

    // Case 4: Swap seats between two positions
    const key1 = `${selectedSeat.row}_${selectedSeat.col}_${selectedSeat.pos}`;
    const key2 = seatKey;

    setSeats((prev) => {
      const next = { ...prev };
      const id1 = next[key1];
      const id2 = next[key2];

      if (id2) next[key1] = id2;
      else delete next[key1];

      if (id1) next[key2] = id1;
      else delete next[key2];

      return next;
    });

    setSelectedSeat(null);
    showToast('Đã hoán đổi vị trí chỗ ngồi!');
  };

  // Remove student from selected seat
  const handleClearSelectedSeat = () => {
    if (!selectedSeat) return;
    const key = `${selectedSeat.row}_${selectedSeat.col}_${selectedSeat.pos}`;
    setSeats((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setSelectedSeat(null);
    showToast('Đã đưa học sinh ra khỏi chỗ ngồi.');
  };

  // Smart Arrange:
  // - Students with eye issues (cận thị) or smaller height seated in rows 0 & 1
  // - Alternating genders and grouping
  const handleSmartArrange = () => {
    if (students.length === 0) {
      showToast('Lớp chưa có học sinh để sắp xếp.', 'info');
      return;
    }

    // Sort priority: 'cận' or 'thấp' first, then group, then name
    const sorted = [...students].sort((a, b) => {
      const aNear = a.notes?.toLowerCase().includes('cận') || a.notes?.toLowerCase().includes('thấp') || false;
      const bNear = b.notes?.toLowerCase().includes('cận') || b.notes?.toLowerCase().includes('thấp') || false;
      if (aNear && !bNear) return -1;
      if (!aNear && bNear) return 1;

      // Then by group so teammates can be close
      if (a.groupId && b.groupId && a.groupId !== b.groupId) {
        return a.groupId.localeCompare(b.groupId);
      }

      return a.fullName.localeCompare(b.fullName);
    });

    const newSeats: Record<string, string> = {};
    let idx = 0;

    for (let r = 0; r < config.rows; r++) {
      for (let c = 0; c < config.columns; c++) {
        for (const pos of seatPositions) {
          if (idx < sorted.length) {
            newSeats[`${r}_${c}_${pos}`] = sorted[idx].id;
            idx++;
          }
        }
      }
    }

    setSeats(newSeats);
    setSelectedSeat(null);
    setSelectedUnassignedStudentId(null);
    showToast('Đã tối ưu xếp chỗ thông minh: Học sinh cận thị được xếp các bàn đầu!');
  };

  // Rotate Columns (Đảo dãy luân phiên chống tật khúc xạ / vẹo cột sống)
  const handleRotateColumns = () => {
    const cols = config.columns;
    const newSeats: Record<string, string> = {};

    Object.entries(seats).forEach(([key, stuId]) => {
      const parts = key.split('_');
      if (parts.length >= 3) {
        const r = Number(parts[0]);
        const c = Number(parts[1]);
        const pos = parts.slice(2).join('_');
        // Shift column by +1 (wrap around)
        const newCol = (c + 1) % cols;
        newSeats[`${r}_${newCol}_${pos}`] = stuId;
      }
    });

    setSeats(newSeats);
    showToast(`Đã đảo dãy luân phiên: Dãy 1 sang Dãy 2, Dãy ${cols} chuyển về Dãy 1!`);
  };

  // Rotate Rows (Đảo hàng bàn: Hàng 1 xuống cuối, các hàng sau đôn lên)
  const handleRotateRows = () => {
    const rows = config.rows;
    const newSeats: Record<string, string> = {};

    Object.entries(seats).forEach(([key, stuId]) => {
      const parts = key.split('_');
      if (parts.length >= 3) {
        const r = Number(parts[0]);
        const c = Number(parts[1]);
        const pos = parts.slice(2).join('_');
        // Shift row by +1 (wrap around)
        const newRow = (r + 1) % rows;
        newSeats[`${newRow}_${c}_${pos}`] = stuId;
      }
    });

    setSeats(newSeats);
    showToast(`Đã đảo hàng luân phiên: Hàng 1 chuyển xuống cuối, các hàng dưới đôn lên 1 bậc!`);
  };

  // Save Seating to database
  const handleSave = async () => {
    if (!activeClass || !currentUser) return;
    setSaving(true);
    try {
      const payload: any[] = [];
      Object.entries(seats).forEach(([key, studentId]) => {
        const parts = key.split('_');
        if (parts.length >= 3 && studentId && studentMap.has(studentId)) {
          payload.push({
            row: Number(parts[0]),
            col: Number(parts[1]),
            position: parts.slice(2).join('_'),
            studentId,
          });
        }
      });

      await Promise.all([
        SeatingRepository.saveSeating(activeClass.id, currentUser.uid, payload),
        SeatingRepository.saveLayoutConfig(activeClass.id, currentUser.uid, config),
      ]);

      await refreshActiveData();
      showToast('Đã lưu sơ đồ chỗ ngồi & cấu trúc phòng học thành công!');
    } catch (err: any) {
      showToast('Lỗi khi lưu sơ đồ: ' + (err.message || ''), 'error');
    } finally {
      setSaving(false);
    }
  };

  // Open config modal
  const openConfigModal = () => {
    setTempConfig(JSON.parse(JSON.stringify(config)));
    setIsConfigModalOpen(true);
  };

  const handleApplyConfig = async () => {
    setConfig(tempConfig);
    setIsConfigModalOpen(false);

    if (activeClass && currentUser) {
      try {
        await SeatingRepository.saveLayoutConfig(activeClass.id, currentUser.uid, tempConfig);
      } catch (err) {
        console.warn('Auto saving config error:', err);
      }
    }
    showToast('Đã cập nhật cấu trúc phòng học thành công!');
  };

  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    setTempConfig((prev) => ({
      ...prev,
      columns: preset.cols,
      rows: preset.rows,
      deskType: preset.deskType,
    }));
  };

  const currentSelectedStudent = selectedSeat
    ? studentMap.get(seats[`${selectedSeat.row}_${selectedSeat.col}_${selectedSeat.pos}`] || '')
    : null;

  // Group Color Badge Helper
  const getGroupBadgeClass = (groupName?: string) => {
    if (!groupName) return 'bg-slate-100 text-slate-700';
    if (groupName.includes('1')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (groupName.includes('2')) return 'bg-sky-100 text-sky-800 border-sky-200';
    if (groupName.includes('3')) return 'bg-purple-100 text-purple-800 border-purple-200';
    if (groupName.includes('4')) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-rose-100 text-rose-800 border-rose-200';
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs shrink-0">
            <Grid className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Sơ Đồ Chỗ Ngồi Lớp {activeClass?.className || '---'}</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {config.columns} dãy · {config.rows} hàng · {config.deskType === 'triple' ? 'Bàn ba' : config.deskType === 'single' ? 'Bàn đơn' : 'Bàn đôi'}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Sĩ số: {students.length} HS · Đã xếp chỗ: <strong className="text-emerald-700">{assignedStudentIds.size}</strong>/{students.length} · Sức chứa: {totalCapacity} chỗ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Edit Room Structure Button */}
          <button
            onClick={openConfigModal}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Tùy chỉnh số dãy, số hàng, loại bàn và các góc phòng học"
          >
            <Settings2 className="w-4 h-4 text-emerald-600" />
            <span>Cấu trúc bàn ghế</span>
          </button>

          {/* Smart Arrange */}
          <button
            onClick={handleSmartArrange}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl border border-indigo-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Xếp chỗ thông minh: Ưu tiên học sinh cận thị / chiều cao ngồi đầu"
          >
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span className="hidden md:inline">Xếp chỗ thông minh</span>
            <span className="md:hidden">Xếp thông minh</span>
          </button>

          {/* Rotate Dropdown / Actions */}
          <div className="flex items-center gap-1 bg-slate-50 p-0.5 rounded-xl border border-slate-200">
            <button
              onClick={handleRotateColumns}
              className="px-2.5 py-1 text-slate-700 hover:bg-white hover:text-emerald-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              title="Đảo luân phiên các dãy bàn (tránh tật khúc xạ mắt)"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-slate-500" />
              <span>Đảo dãy</span>
            </button>
            <button
              onClick={handleRotateRows}
              className="px-2.5 py-1 text-slate-700 hover:bg-white hover:text-emerald-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              title="Đảo luân phiên hàng bàn (hàng 1 xuống cuối)"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500 rotate-90" />
              <span>Đảo hàng</span>
            </button>
          </div>

          {/* Print */}
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>In sơ đồ</span>
          </button>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Đang lưu...' : 'Lưu sơ đồ'}</span>
          </button>
        </div>
      </div>

      {/* Selected Seat Interactive Helper Banner */}
      {selectedSeat && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 p-3.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-amber-950 animate-in fade-in no-print shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full bg-amber-500 animate-ping"></div>
            <span>
              Đang chọn: <strong>Hàng {selectedSeat.row + 1} · Dãy {selectedSeat.col + 1} ({selectedSeat.pos === 'left' ? 'Vị trí Trái' : selectedSeat.pos === 'right' ? 'Vị trí Phải' : selectedSeat.pos === 'middle' ? 'Vị trí Giữa' : 'Bàn Đơn'})</strong>
              {currentSelectedStudent ? (
                <span> — Học sinh: <strong className="text-emerald-800">{currentSelectedStudent.fullName}</strong> ({currentSelectedStudent.groupId})</span>
              ) : (
                <span className="italic text-slate-500"> — (Bàn trống)</span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-amber-800 hidden md:inline">
              👉 Chạm vào bất kỳ bàn khác để <strong>Hoán đổi vị trí</strong>
            </span>
            {currentSelectedStudent && (
              <button
                type="button"
                onClick={handleClearSelectedSeat}
                className="px-3 py-1 bg-white hover:bg-red-50 text-red-700 border border-red-200 font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Rút khỏi bàn</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setSelectedSeat(null)}
              className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold rounded-xl transition-colors cursor-pointer"
            >
              Hủy chọn
            </button>
          </div>
        </div>
      )}

      {/* Main Classroom Podium & Seating Plan Container */}
      <div className="bg-slate-900/5 rounded-3xl p-4 sm:p-7 border border-slate-200 shadow-xs printable-area space-y-7 backdrop-blur-xs">
        {/* Header inside printable view */}
        <div className="hidden print:block text-center border-b border-slate-300 pb-3 mb-4">
          <h1 className="text-xl font-bold uppercase text-slate-900">
            SƠ ĐỒ CHỖ NGỒI LỚP HỌC {activeClass?.className?.toUpperCase()}
          </h1>
          <p className="text-xs text-slate-600">
            {activeClass?.schoolName} · Năm học: {activeClass?.schoolYear} · GVCN: {activeClass?.teacherName}
          </p>
        </div>

        {/* Classroom Front Wall: Blackboard, Teacher's Desk, Doors, Windows */}
        <div className="relative max-w-4xl mx-auto space-y-4">
          {/* Windows / Doors labels */}
          <div className="flex items-center justify-between text-xs font-semibold px-4 text-slate-500">
            <div className="flex items-center gap-1.5 bg-white/80 px-3 py-1 rounded-xl shadow-2xs border border-slate-200">
              <DoorOpen className="w-4 h-4 text-amber-600" />
              <span>{config.doorPos === 'left' ? 'Cửa chính ra vào' : 'Cửa sổ thông thoáng'}</span>
            </div>

            <div className="text-[11px] text-slate-400 uppercase tracking-widest font-bold hidden sm:block">
              ↑ HƯỚNG BỤC GIẢNG & BẢNG LỚP ↑
            </div>

            <div className="flex items-center gap-1.5 bg-white/80 px-3 py-1 rounded-xl shadow-2xs border border-slate-200">
              <Sun className="w-4 h-4 text-sky-500" />
              <span>{config.windowPos === 'right' ? 'Dãy cửa sổ đón sáng' : 'Cửa phụ / Lối đi'}</span>
            </div>
          </div>

          {/* Blackboard (Bảng Đen Chống Lóa Thẩm Mỹ) */}
          <div className="relative mx-auto rounded-2xl overflow-hidden shadow-lg border-4 border-amber-900/80 bg-gradient-to-b from-[#173a2c] via-[#102d22] to-[#0c241b] text-white p-4 text-center">
            {/* Wooden frame accents */}
            <div className="absolute top-1 left-2 w-2 h-2 rounded-full bg-amber-400/80 shadow-xs"></div>
            <div className="absolute top-1 right-2 w-2 h-2 rounded-full bg-amber-400/80 shadow-xs"></div>

            <div className="space-y-1">
              <h3 className="font-extrabold text-xs sm:text-sm tracking-wider uppercase text-emerald-200 font-sans">
                {config.boardTitle || 'BẢNG XANH LỚP HỌC · THI ĐUA DẠY TỐT - HỌC TỐT'}
              </h3>
              <p className="text-[11px] text-emerald-300/80 font-mono">
                Lớp {activeClass?.className} · GVCN: {activeClass?.teacherName || 'Cô Giáo'}
              </p>
            </div>

            {/* Chalk tray simulation */}
            <div className="mt-3 pt-1 border-t border-emerald-800/60 flex items-center justify-center gap-4 text-[10px] text-emerald-200/60">
              <span className="flex items-center gap-1">
                <span className="w-4 h-1 bg-white/80 rounded-full inline-block"></span>
                <span>Phấn trắng</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-5 h-1.5 bg-amber-200/90 rounded-sm inline-block"></span>
                <span>Khay khăn lau</span>
              </span>
            </div>
          </div>

          {/* Teacher's Desk (Bàn Giáo Viên) */}
          <div
            className={`flex ${
              config.teacherDeskPos === 'left'
                ? 'justify-start'
                : config.teacherDeskPos === 'center'
                ? 'justify-center'
                : 'justify-end'
            } px-6`}
          >
            <div className="w-56 p-3 bg-gradient-to-br from-amber-100 via-amber-50 to-orange-100 border-2 border-amber-300 rounded-2xl shadow-sm text-center flex items-center justify-between gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                GV
              </div>
              <div className="text-left flex-1">
                <div className="text-xs font-bold text-amber-950">Bàn Giáo Viên Chủ Nhiệm</div>
                <div className="text-[10px] text-amber-800/80 truncate">
                  {activeClass?.teacherName || 'Bục giảng sư phạm'}
                </div>
              </div>
              <span className="text-base" title="Lọ hoa tươi góc bàn">🌸</span>
            </div>
          </div>
        </div>

        {/* Dynamic Classroom Grid: Columns x Rows */}
        <div className="overflow-x-auto pb-4">
          <div className="min-w-[760px] space-y-5 mx-auto max-w-5xl">
            {Array.from({ length: config.rows }, (_, r) => r).map((rowIdx) => (
              <div key={rowIdx} className="space-y-1.5">
                {/* Row Indicator */}
                <div className="flex items-center justify-between px-3">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 bg-white/70 px-2.5 py-0.5 rounded-full border border-slate-200/80 shadow-2xs">
                    Hàng {rowIdx + 1}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {rowIdx === 0 ? 'Gần bảng nhất (ưu tiên mắt cận)' : rowIdx === config.rows - 1 ? 'Cuối lớp' : ''}
                  </span>
                </div>

                {/* Column desking */}
                <div
                  className="grid gap-3 sm:gap-4"
                  style={{
                    gridTemplateColumns: `repeat(${config.columns}, minmax(0, 1fr))`,
                  }}
                >
                  {Array.from({ length: config.columns }, (_, c) => c).map((colIdx) => {
                    const deskNumber = rowIdx * config.columns + colIdx + 1;

                    return (
                      <div
                        key={colIdx}
                        className="bg-white/95 rounded-2xl p-2.5 sm:p-3 shadow-xs border-2 border-slate-200/90 hover:border-emerald-300 transition-all duration-200 space-y-2 group"
                      >
                        {/* Desk Header Badge */}
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold border-b border-slate-100 pb-1.5 px-0.5">
                          <span className="text-slate-800 font-bold">Dãy {colIdx + 1}</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-md font-mono">
                            Bàn {deskNumber}
                          </span>
                        </div>

                        {/* Desk Surface (Top-Down Realistic Wooden Desk simulation) */}
                        <div
                          className={`grid gap-2 ${
                            config.deskType === 'triple'
                              ? 'grid-cols-3'
                              : config.deskType === 'single'
                              ? 'grid-cols-1'
                              : 'grid-cols-2'
                          }`}
                        >
                          {seatPositions.map((pos) => {
                            const seatKey = `${rowIdx}_${colIdx}_${pos}`;
                            const studentId = seats[seatKey];
                            const student = studentMap.get(studentId || '');

                            const isSelected =
                              selectedSeat?.row === rowIdx &&
                              selectedSeat?.col === colIdx &&
                              selectedSeat?.pos === pos;

                            const isNearSighted = student?.notes?.toLowerCase().includes('cận');
                            const isClassLeader = student?.notes?.toLowerCase().includes('lớp') || student?.notes?.toLowerCase().includes('trưởng') || student?.notes?.toLowerCase().includes('phó');

                            return (
                              <div
                                key={pos}
                                onClick={() => handleSeatClick(rowIdx, colIdx, pos)}
                                className={`relative rounded-xl p-2 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[82px] border ${
                                  isSelected
                                    ? 'bg-amber-100/90 border-amber-500 ring-3 ring-amber-400/50 shadow-md scale-102 z-10'
                                    : student
                                    ? 'bg-gradient-to-b from-white to-slate-50 border-slate-200/90 hover:border-emerald-400 hover:shadow-xs hover:-translate-y-0.5'
                                    : 'bg-slate-100/60 border-dashed border-slate-300 text-slate-400 hover:bg-emerald-50/70 hover:border-emerald-300 hover:text-emerald-700'
                                }`}
                              >
                                {student ? (
                                  <>
                                    {/* Student Header & Indicators */}
                                    <div className="flex items-center justify-between gap-1 mb-1">
                                      {/* Gender / Avatar */}
                                      <div className="flex items-center gap-1">
                                        <div
                                          className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                            student.gender === 'nữ'
                                              ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                              : 'bg-sky-100 text-sky-700 border border-sky-200'
                                          }`}
                                        >
                                          {student.fullName.charAt(0)}
                                        </div>
                                        {config.showSpecialNotes && isClassLeader && (
                                          <span title="Ban cán sự lớp">
                                            <Crown className="w-3 h-3 text-amber-500" />
                                          </span>
                                        )}
                                        {config.showSpecialNotes && isNearSighted && (
                                          <span title="Mắt cận (ngồi bàn trước)">
                                            <Glasses className="w-3.5 h-3.5 text-orange-600" />
                                          </span>
                                        )}
                                      </div>

                                      {/* Group Badge */}
                                      {config.showGroupBadge && student.groupId && (
                                        <span
                                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md border ${getGroupBadgeClass(
                                            student.groupId
                                          )}`}
                                        >
                                          {student.groupId}
                                        </span>
                                      )}
                                    </div>

                                    {/* Student Name */}
                                    <div className="my-auto py-0.5">
                                      <p
                                        className="text-xs font-bold text-slate-900 leading-snug line-clamp-2"
                                        title={student.fullName}
                                      >
                                        {student.fullName}
                                      </p>
                                      {student.studentCode && (
                                        <p className="text-[9px] text-slate-400 font-mono">
                                          #{student.studentCode}
                                        </p>
                                      )}
                                    </div>

                                    {/* Position subtle label */}
                                    <div className="text-[9px] text-slate-400 text-right uppercase tracking-tighter">
                                      {pos === 'left' ? 'Trái' : pos === 'right' ? 'Phải' : pos === 'middle' ? 'Giữa' : 'Chỗ ngồi'}
                                    </div>
                                  </>
                                ) : (
                                  <div className="h-full flex flex-col items-center justify-center py-2 space-y-1">
                                    <Plus className="w-4 h-4 opacity-50" />
                                    <span className="text-[10px] font-semibold tracking-tight">
                                      {pos === 'left' ? 'Ghế trái' : pos === 'right' ? 'Ghế phải' : pos === 'middle' ? 'Ghế giữa' : 'Bàn trống'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Unassigned Students Tray (Học sinh chưa xếp chỗ) */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3.5 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">
                Học sinh chưa xếp chỗ ({unassignedStudents.length})
              </h3>
              <p className="text-[11px] text-slate-500">
                Chọn học sinh bên dưới rồi chạm vào một bàn trống trên sơ đồ
              </p>
            </div>
          </div>

          {/* Search & Group Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên học sinh..."
                className="pl-8 pr-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 w-40"
              />
            </div>

            {groupsList.length > 0 && (
              <select
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium cursor-pointer"
              >
                <option value="all">Tất cả tổ</option>
                {groupsList.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Unassigned list */}
        {unassignedStudents.length === 0 ? (
          <div className="text-xs text-emerald-800 font-medium bg-emerald-50/80 p-3.5 rounded-2xl border border-emerald-200 flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              Tuyệt vời! Toàn bộ <strong>{students.length} học sinh</strong> trong lớp đều đã được sắp xếp vị trí ngồi đầy đủ.
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            {selectedUnassignedStudentId && (
              <div className="text-xs text-emerald-800 bg-emerald-100/70 px-3 py-1.5 rounded-xl border border-emerald-200 font-semibold flex items-center justify-between">
                <span>
                  👉 Đang chọn: <strong>{studentMap.get(selectedUnassignedStudentId)?.fullName}</strong>. Bây giờ hãy chạm vào một bàn trống trên sơ đồ!
                </span>
                <button
                  onClick={() => setSelectedUnassignedStudentId(null)}
                  className="text-slate-600 hover:text-slate-900 font-bold ml-2"
                >
                  Bỏ chọn
                </button>
              </div>
            )}

            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
              {filteredUnassignedStudents.map((s) => {
                const isSelected = selectedUnassignedStudentId === s.id;
                const isNear = s.notes?.toLowerCase().includes('cận');

                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSelectedSeat(null);
                      setSelectedUnassignedStudentId(isSelected ? null : s.id);
                    }}
                    className={`px-3 py-2 rounded-2xl border text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-400/40 scale-102'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/90 shadow-2xs'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isSelected
                          ? 'bg-white text-emerald-800'
                          : s.gender === 'nữ'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-sky-100 text-sky-700'
                      }`}
                    >
                      {s.fullName.charAt(0)}
                    </div>
                    <span>{s.fullName}</span>
                    {s.groupId && (
                      <span className={`text-[9px] px-1 rounded ${isSelected ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-100 text-slate-600'}`}>
                        {s.groupId}
                      </span>
                    )}
                    {isNear && (
                      <Glasses className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-200' : 'text-orange-600'}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL: Cấu hình cấu trúc phòng học & Xếp bàn             */}
      {/* ======================================================== */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                  <Settings2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Cấu Trúc Bàn Ghế & Phòng Học</h3>
                  <p className="text-xs text-emerald-100">
                    Tùy biến số dãy, số hàng, loại bàn và các góc không gian lớp học
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-6 overflow-y-auto flex-1">
              {/* Presets 1-Touch */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Chọn mẫu bố cục có sẵn (Khuyên dùng)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PRESETS.map((p) => {
                    const isCurrent =
                      tempConfig.columns === p.cols &&
                      tempConfig.rows === p.rows &&
                      tempConfig.deskType === p.deskType;

                    return (
                      <div
                        key={p.name}
                        onClick={() => handleApplyPreset(p)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                          isCurrent
                            ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-400/30 shadow-xs'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80'
                        }`}
                      >
                        <span className="text-xl shrink-0">{p.icon}</span>
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{p.name}</span>
                            {isCurrent && <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />}
                          </div>
                          <p className="text-[11px] text-slate-500 leading-snug">{p.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <hr className="border-slate-200" />

              {/* Grid Dimensions */}
              <div className="space-y-4">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Tùy chỉnh chi tiết kích thước phòng học
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Columns */}
                  <div className="space-y-1.5">
                    <span className="text-xs text-slate-600 font-semibold flex items-center gap-1">
                      <Columns className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Số Dãy Bàn (Cột):</span>
                    </span>
                    <select
                      value={tempConfig.columns}
                      onChange={(e) => setTempConfig({ ...tempConfig, columns: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    >
                      <option value={2}>2 Dãy bàn</option>
                      <option value={3}>3 Dãy bàn (Chuẩn)</option>
                      <option value={4}>4 Dãy bàn</option>
                      <option value={5}>5 Dãy bàn</option>
                    </select>
                  </div>

                  {/* Rows */}
                  <div className="space-y-1.5">
                    <span className="text-xs text-slate-600 font-semibold flex items-center gap-1">
                      <Rows className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Số Hàng Bàn (Dọc):</span>
                    </span>
                    <select
                      value={tempConfig.rows}
                      onChange={(e) => setTempConfig({ ...tempConfig, rows: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    >
                      <option value={3}>3 Hàng bàn</option>
                      <option value={4}>4 Hàng bàn</option>
                      <option value={5}>5 Hàng bàn (Chuẩn)</option>
                      <option value={6}>6 Hàng bàn</option>
                      <option value={7}>7 Hàng bàn</option>
                    </select>
                  </div>

                  {/* Desk Type */}
                  <div className="space-y-1.5">
                    <span className="text-xs text-slate-600 font-semibold flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Loại Bàn Ghế:</span>
                    </span>
                    <select
                      value={tempConfig.deskType}
                      onChange={(e) => setTempConfig({ ...tempConfig, deskType: e.target.value as DeskType })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    >
                      <option value="double">Bàn Đôi (2 học sinh/bàn)</option>
                      <option value="triple">Bàn Ba (3 học sinh/bàn)</option>
                      <option value="single">Bàn Đơn (1 học sinh/bàn)</option>
                    </select>
                  </div>
                </div>

                {/* Capacity summary calculation */}
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-950 font-medium">
                  <div>
                    <span>Tổng sức chứa thiết kế: </span>
                    <strong className="text-emerald-700 text-sm font-extrabold">
                      {tempConfig.columns * tempConfig.rows * (tempConfig.deskType === 'triple' ? 3 : tempConfig.deskType === 'single' ? 1 : 2)} chỗ ngồi
                    </strong>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Sĩ số học sinh: {students.length} em
                  </div>
                </div>
              </div>

              <hr className="border-slate-200" />

              {/* Classroom Furniture Positions */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Vị trí Bục giảng & Không gian xung quanh
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-600 font-semibold block mb-1">Bàn Giáo Viên:</span>
                    <select
                      value={tempConfig.teacherDeskPos}
                      onChange={(e) => setTempConfig({ ...tempConfig, teacherDeskPos: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                    >
                      <option value="left">Phía bên Trái</option>
                      <option value="center">Ở Chính Giữa</option>
                      <option value="right">Phía bên Phải</option>
                    </select>
                  </div>

                  <div>
                    <span className="text-slate-600 font-semibold block mb-1">Cửa chính ra vào:</span>
                    <select
                      value={tempConfig.doorPos}
                      onChange={(e) => setTempConfig({ ...tempConfig, doorPos: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                    >
                      <option value="left">Góc bên Trái phòng</option>
                      <option value="right">Góc bên Phải phòng</option>
                    </select>
                  </div>

                  <div>
                    <span className="text-slate-600 font-semibold block mb-1">Dãy cửa sổ đón sáng:</span>
                    <select
                      value={tempConfig.windowPos}
                      onChange={(e) => setTempConfig({ ...tempConfig, windowPos: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                    >
                      <option value="right">Bên Phải lớp học</option>
                      <option value="left">Bên Trái lớp học</option>
                    </select>
                  </div>
                </div>

                <div>
                  <span className="text-slate-600 font-semibold block mb-1">Tiêu đề trên Bảng đen lớp học:</span>
                  <input
                    type="text"
                    value={tempConfig.boardTitle || ''}
                    onChange={(e) => setTempConfig({ ...tempConfig, boardTitle: e.target.value })}
                    placeholder="BẢNG XANH LỚP HỌC · THI ĐUA HỌC TỐT"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              <hr className="border-slate-200" />

              {/* Display Options */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Tùy chọn hiển thị trên thẻ chỗ ngồi
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tempConfig.showGroupBadge}
                      onChange={(e) => setTempConfig({ ...tempConfig, showGroupBadge: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <span className="font-semibold text-slate-800">Hiện huy hiệu Tổ học tập (Tổ 1-4)</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tempConfig.showSpecialNotes}
                      onChange={(e) => setTempConfig({ ...tempConfig, showSpecialNotes: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <span className="font-semibold text-slate-800">Hiện biểu tượng Mắt Cận & Ban Cán Sự</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleApplyConfig}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Áp dụng cấu trúc phòng học</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
