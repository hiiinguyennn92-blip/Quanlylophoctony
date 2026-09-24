import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  CheckSquare,
  AlertTriangle,
  ListTodo,
  Trophy,
  Cake,
  Calendar,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  Clock,
  Heart,
  ChevronRight,
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { isBirthdayToday } from '../../utils/dateUtils';

export const DashboardView: React.FC = () => {
  const {
    activeClass,
    students,
    attendanceRecords,
    tasks,
    taskCompletions,
    competitionEntries,
    classEvents,
    attentionSignals,
    setActiveTab,
    setSelectedStudentForDetail,
    seedDemoClass,
  } = useApp();

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const currentHour = new Date().getHours();
  const timeGreeting =
    currentHour < 11
      ? 'Chúc Thầy/Cô một buổi sáng giảng dạy tràn đầy năng lượng!'
      : currentHour < 14
      ? 'Chúc Thầy/Cô buổi trưa nhiều niềm vui và an lành!'
      : currentHour < 18
      ? 'Chúc Thầy/Cô buổi chiều làm việc hiệu quả và thảnh thơi!'
      : 'Chúc Thầy/Cô buổi tối nghỉ ngơi ấm áp bên gia đình!';

  // Student demographics
  const maleCount = React.useMemo(() => students.filter((s) => s.gender === 'nam').length, [students]);
  const femaleCount = React.useMemo(() => students.filter((s) => s.gender === 'nữ').length, [students]);

  // Today attendance numbers
  const todayAttendance = React.useMemo(() => {
    const records = attendanceRecords.filter((r) => r.date === todayStr);
    const present = records.filter((r) => r.status === 'present').length;
    const excused = records.filter((r) => r.status === 'excused_absence').length;
    const unexcused = records.filter((r) => r.status === 'unexcused_absence').length;
    const late = records.filter((r) => r.status === 'late').length;
    const recordedTotal = records.length;
    return { present, excused, unexcused, late, recordedTotal };
  }, [attendanceRecords, todayStr]);

  // Tasks due today or upcoming
  const todayTasks = React.useMemo(() => {
    return tasks.filter((t) => t.dueAt >= todayStr).slice(0, 3);
  }, [tasks, todayStr]);

  // Group Competition scores
  const groupScores = React.useMemo(() => {
    const scores: Record<string, number> = {
      'Tổ 1': 0,
      'Tổ 2': 0,
      'Tổ 3': 0,
      'Tổ 4': 0,
    };
    competitionEntries.forEach((e) => {
      if (e.groupId && scores[e.groupId] !== undefined) {
        scores[e.groupId] += e.pointDelta;
      }
    });
    return Object.entries(scores)
      .map(([name, score]) => ({ name, score }))
      .sort((a, b) => b.score - a.score);
  }, [competitionEntries]);

  // Today birthdays
  const birthdayStudents = React.useMemo(() => {
    return students.filter((s) => isBirthdayToday(s.dob));
  }, [students]);

  // 7-day attendance history with weekdays
  const weekAttendanceTrend = React.useMemo(() => {
    const days = [];
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    for (let i = 6; i >= 0; i--) {
      const targetDate = subDays(new Date(), i);
      const dStr = format(targetDate, 'yyyy-MM-dd');
      const dayRecs = attendanceRecords.filter((r) => r.date === dStr);
      const pres = dayRecs.filter((r) => r.status === 'present').length;
      const tot = students.length || 1;
      const pct = dayRecs.length > 0 ? Math.round((pres / tot) * 100) : null;
      days.push({
        date: dStr,
        dayName: dayNames[targetDate.getDay()],
        label: format(targetDate, 'dd/MM'),
        presentPct: pct,
        presentCount: pres,
        hasRecord: dayRecs.length > 0,
        isToday: i === 0,
      });
    }
    return days;
  }, [attendanceRecords, students.length]);

  const avgAttendancePct = React.useMemo(() => {
    const valid = weekAttendanceTrend.filter((d) => d.presentPct !== null);
    if (valid.length === 0) return null;
    const sum = valid.reduce((acc, curr) => acc + (curr.presentPct || 0), 0);
    return Math.round(sum / valid.length);
  }, [weekAttendanceTrend]);

  return (
    <div className="space-y-6">
      {/* Header Welcome Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 rounded-3xl p-6 sm:p-7 text-white shadow-sm border border-emerald-600/50">
        {/* Soft decorative background elements */}
        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-emerald-500/20 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-48 h-48 rounded-full bg-teal-400/20 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-emerald-100 text-xs font-semibold uppercase tracking-wider">
              <span className="px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-xs border border-white/20">
                {activeClass?.schoolName || 'Trường Tiểu học'}
              </span>
              <span>·</span>
              <span>Năm học {activeClass?.schoolYear || '2025 - 2026'}</span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-2 text-white tracking-tight">
              Lớp {activeClass?.className || '---'} · GVCN: {activeClass?.teacherName || 'Thầy/Cô'}
            </h1>

            <p className="text-xs sm:text-sm text-emerald-100/90 mt-1.5 max-w-xl leading-relaxed">
              {timeGreeting}
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-stretch md:self-auto shrink-0 flex-wrap">
            <button
              onClick={() => setActiveTab('attendance')}
              className="flex-1 md:flex-none px-4 py-2.5 bg-white text-emerald-900 hover:bg-emerald-50 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <CheckSquare className="w-4 h-4 text-emerald-600 stroke-[2.2]" />
              <span>Điểm danh 1 phút</span>
            </button>
            <button
              onClick={() => setActiveTab('ai-comments')}
              className="flex-1 md:flex-none px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white border border-white/25 rounded-xl text-xs font-bold backdrop-blur-xs transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>AI Viết nhận xét</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* 1. Sĩ số */}
        <div
          onClick={() => setActiveTab('students')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-emerald-300 hover:shadow-xs hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Sĩ số học sinh</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums tracking-tight">
              {students.length}
            </span>
            <span className="text-xs text-slate-400">/ {activeClass?.expectedStudentCount || 35} em</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium">
              {maleCount} nam · {femaleCount} nữ
            </span>
            <span className="text-emerald-700 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              Xem danh sách <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* 2. Điểm danh hôm nay */}
        <div
          onClick={() => setActiveTab('attendance')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-blue-300 hover:shadow-xs hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Chuyên cần hôm nay</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <CheckSquare className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums tracking-tight">
              {todayAttendance.recordedTotal > 0 ? `${todayAttendance.present}` : '0'}
            </span>
            <span className="text-xs text-slate-400">/ {students.length} có mặt</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] truncate">
            {todayAttendance.recordedTotal === 0 ? (
              <span className="text-slate-400 italic">Chưa điểm danh buổi sáng</span>
            ) : (
              <div className="flex items-center gap-1.5 truncate">
                {todayAttendance.excused > 0 && (
                  <span className="text-amber-700 font-medium">{todayAttendance.excused} có phép</span>
                )}
                {todayAttendance.unexcused > 0 && (
                  <span className="text-rose-700 font-medium">{todayAttendance.unexcused} không phép</span>
                )}
                {todayAttendance.late > 0 && (
                  <span className="text-purple-700 font-medium">{todayAttendance.late} muộn</span>
                )}
                {todayAttendance.excused === 0 && todayAttendance.unexcused === 0 && todayAttendance.late === 0 && (
                  <span className="text-emerald-700 font-semibold">100% hiện diện đầy đủ</span>
                )}
              </div>
            )}
            <span className="text-blue-700 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform shrink-0">
              Kiểm diện <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* 3. Nhiệm vụ & Bài tập */}
        <div
          onClick={() => setActiveTab('tasks')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-indigo-300 hover:shadow-xs hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Nhiệm vụ & Bài tập</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ListTodo className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums tracking-tight">
              {tasks.length}
            </span>
            <span className="text-xs text-slate-400">bài đang theo dõi</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium">Theo dõi nộp bài</span>
            <span className="text-indigo-700 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              Kiểm tra <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* 4. Học sinh cần quan tâm */}
        <div
          onClick={() => setActiveTab('attention')}
          className={`bg-white p-4 sm:p-5 rounded-2xl border shadow-2xs hover:shadow-xs hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group ${
            attentionSignals.length > 0
              ? 'border-amber-200/80 hover:border-amber-400'
              : 'border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Cần xem xét thêm</span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform ${
                attentionSignals.length > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <AlertTriangle className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span
              className={`text-2xl sm:text-3xl font-bold tabular-nums tracking-tight ${
                attentionSignals.length > 0 ? 'text-amber-800' : 'text-slate-900'
              }`}
            >
              {attentionSignals.length}
            </span>
            <span className="text-xs text-slate-400">em có dấu hiệu</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium truncate">Minh chứng thực tế</span>
            <span className="text-amber-800 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform shrink-0">
              Chi tiết <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Attendance trend & Tasks */}
        <div className="lg:col-span-2 space-y-6">
          {/* 7-Day Attendance Trend */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 stroke-[2]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Chuyên cần 7 ngày qua</h3>
                  <p className="text-[11px] text-slate-400">
                    {avgAttendancePct !== null
                      ? `Tỷ lệ chuyên cần trung bình: ${avgAttendancePct}%`
                      : 'Chưa có đủ dữ liệu chuyên cần tuần này'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('attendance')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
              >
                <span>Xem sổ điểm danh</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2.5 sm:gap-4 items-end pt-5 pb-1">
              {weekAttendanceTrend.map((day, idx) => {
                const isSelected = day.isToday;
                return (
                  <div key={idx} className="flex flex-col items-center gap-2 group">
                    <div className="text-[11px] font-bold text-slate-700 tabular-nums">
                      {day.presentPct !== null ? `${day.presentPct}%` : '—'}
                    </div>
                    <div className="w-full bg-slate-100/90 rounded-xl h-32 relative flex items-end justify-center overflow-hidden p-0.5">
                      {day.presentPct !== null ? (
                        <div
                          style={{ height: `${Math.max(day.presentPct, 8)}%` }}
                          className={`w-full transition-all duration-500 rounded-lg ${
                            day.presentPct >= 95
                              ? 'bg-gradient-to-t from-emerald-600 to-teal-500'
                              : day.presentPct >= 85
                              ? 'bg-gradient-to-t from-teal-600 to-cyan-500'
                              : 'bg-gradient-to-t from-amber-600 to-yellow-500'
                          } ${isSelected ? 'ring-2 ring-emerald-400 ring-offset-1' : ''}`}
                        />
                      ) : (
                        <div className="h-1.5 w-full bg-slate-200 rounded-full" />
                      )}
                    </div>
                    <div className="text-center leading-tight">
                      <span className={`block text-[11px] font-bold ${isSelected ? 'text-emerald-800' : 'text-slate-700'}`}>
                        {day.dayName}
                      </span>
                      <span className="block text-[10px] text-slate-400">{day.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Urgent Tasks */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <ListTodo className="w-4 h-4 stroke-[2]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Nhiệm vụ & Bài tập cần hoàn thành</h3>
                  <p className="text-[11px] text-slate-400">Theo dõi tiến độ hoàn thành bài tập của học sinh</p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('tasks')}
                className="text-xs font-bold text-indigo-700 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <span>Tất cả ({tasks.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {todayTasks.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                Chưa có nhiệm vụ học tập nào được giao. Bấm vào Nhiệm vụ để giao bài mới!
              </div>
            ) : (
              <div className="space-y-3">
                {todayTasks.map((t) => {
                  const completedCount = taskCompletions.filter((c) => c.taskId === t.id && c.completed).length;
                  const total = students.length || 1;
                  const pct = Math.round((completedCount / total) * 100);
                  return (
                    <div
                      key={t.id}
                      onClick={() => setActiveTab('tasks')}
                      className="p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-700 transition-colors truncate">
                          {t.title}
                        </span>
                        <span className="shrink-0 text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-slate-200/70 text-slate-700">
                          Hạn: {t.dueAt}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Đã nộp: <strong className="text-slate-800">{completedCount}/{total}</strong> học sinh</span>
                        <span className="font-bold text-indigo-700">{pct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200/80 rounded-full mt-1.5 overflow-hidden">
                        <div
                          style={{ width: `${pct}%` }}
                          className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 span): Birthdays, Leaderboard, Events */}
        <div className="space-y-6">
          {/* Birthday Card */}
          {birthdayStudents.length > 0 ? (
            <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 via-rose-500 to-pink-600 p-5 sm:p-6 rounded-2xl text-white shadow-xs">
              <div className="flex items-center gap-2 text-white/95 text-xs font-bold uppercase tracking-wider">
                <Cake className="w-4 h-4 animate-bounce" />
                <span>Sinh nhật hôm nay!</span>
              </div>
              <div className="mt-3 space-y-1">
                {birthdayStudents.map((s, idx) => (
                  <div key={s.id || `bday_${idx}`}>
                    <p className="text-lg font-bold text-white tracking-tight">{s.fullName}</p>
                    <p className="text-xs text-white/85">{s.groupId} · Chúc con luôn vui vẻ và chăm ngoan!</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setActiveTab('birthdays')}
                className="mt-4 w-full py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-xs text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Gửi lời chúc mừng qua Zalo</span>
              </button>
            </div>
          ) : (
            <div
              onClick={() => setActiveTab('birthdays')}
              className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-pink-300 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Cake className="w-5 h-5 stroke-[1.8]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 group-hover:text-pink-700 transition-colors">
                    Lịch sinh nhật học sinh
                  </h4>
                  <p className="text-[11px] text-slate-400">Xem sinh nhật tuần này & tháng này</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
          )}

          {/* Group Competition Ranking */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Trophy className="w-4 h-4 stroke-[2]" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Thi đua các Tổ tuần này</h3>
              </div>
              <button
                onClick={() => setActiveTab('competition')}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
              >
                <span>Cộng sao</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {groupScores.map((item, idx) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                        idx === 0
                          ? 'bg-amber-500 text-white shadow-2xs'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-700'
                          : idx === 2
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-slate-800">{item.name}</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-800 tabular-nums">
                    {item.score > 0 ? `+${item.score}` : item.score} điểm
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Next Upcoming Event */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                  <Calendar className="w-4 h-4 stroke-[2]" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Hoạt động sắp diễn ra</h3>
              </div>
              <button
                onClick={() => setActiveTab('events')}
                className="text-xs font-bold text-purple-700 hover:text-purple-800 flex items-center gap-1 cursor-pointer"
              >
                <span>Lịch lớp</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {classEvents.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                Chưa có sự kiện nào trong tuần này.
              </div>
            ) : (
              <div className="space-y-2">
                {classEvents.slice(0, 2).map((ev) => (
                  <div key={ev.id} className="p-3 rounded-xl bg-purple-50/60 border border-purple-100/80">
                    <p className="text-xs font-bold text-slate-900">{ev.title}</p>
                    <p className="text-[11px] text-purple-700 mt-1 font-medium">
                      {ev.date} {ev.startTime ? `· ${ev.startTime}` : ''} {ev.location ? `· ${ev.location}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
