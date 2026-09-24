import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CompetitionEntry } from '../../types';
import { CompetitionRepository } from '../../repositories/dataRepository';
import {
  Trophy,
  Plus,
  Minus,
  Award,
  Sparkles,
  Users,
  CheckCircle,
  Star,
  Flame,
  ThumbsUp,
  History,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { EmptyState } from '../common/EmptyState';

const DEFAULT_RULES = [
  { title: 'Hăng hái phát biểu xây dựng bài', delta: 2, type: 'positive' },
  { title: 'Xếp hàng ngay ngắn, giữ trật tự', delta: 1, type: 'positive' },
  { title: 'Vệ sinh lớp học sạch sẽ', delta: 2, type: 'positive' },
  { title: 'Làm bài tập đầy đủ, sạch đẹp', delta: 2, type: 'positive' },
  { title: 'Biết giúp đỡ bạn bè trong giờ chơi', delta: 2, type: 'positive' },
  { title: 'Nói chuyện riêng trong giờ học', delta: -1, type: 'negative' },
  { title: 'Quên mang đồ dùng học tập', delta: -1, type: 'negative' },
  { title: 'Đi học muộn', delta: -1, type: 'negative' },
  { title: 'Bỏ rác chưa đúng nơi quy định', delta: -1, type: 'negative' },
];

export const CompetitionView: React.FC = () => {
  const {
    activeClass,
    currentUser,
    students,
    competitionEntries,
    refreshActiveData,
    showToast,
  } = useApp();

  const [selectedGroup, setSelectedGroup] = useState<string>('Tổ 1');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [customNote, setCustomNote] = useState<string>('');
  const [adding, setAdding] = useState(false);

  // Group point totals & dynamic groups
  const groupPoints = React.useMemo(() => {
    const scores: Record<string, number> = {};

    // Seed standard groups
    ['Tổ 1', 'Tổ 2', 'Tổ 3', 'Tổ 4'].forEach((g) => {
      scores[g] = 0;
    });

    // Add any other group from student list
    students.forEach((s) => {
      if (s.groupId && scores[s.groupId] === undefined) {
        scores[s.groupId] = 0;
      }
    });

    competitionEntries.forEach((e) => {
      if (e.groupId) {
        if (scores[e.groupId] === undefined) {
          scores[e.groupId] = 0;
        }
        scores[e.groupId] += e.pointDelta;
      }
    });

    return scores;
  }, [competitionEntries, students]);

  // Ranked groups
  const sortedGroups = Object.entries(groupPoints).sort((a, b) => b[1] - a[1]);

  const handleApplyRule = async (ruleTitle: string, delta: number) => {
    if (!activeClass || !currentUser) return;
    setAdding(true);
    try {
      await CompetitionRepository.addEntry({
        classId: activeClass.id,
        ownerId: currentUser.uid,
        groupId: selectedGroup,
        studentId: selectedStudentId || undefined,
        ruleTitle,
        pointDelta: delta,
        date: format(new Date(), 'yyyy-MM-dd'),
        note: customNote || undefined,
      });

      setCustomNote('');
      await refreshActiveData();
      showToast(`Đã ${delta > 0 ? 'cộng' : 'trừ'} ${Math.abs(delta)} điểm cho ${selectedGroup}!`);
    } catch (err: any) {
      showToast('Lỗi khi ghi nhận thi đua: ' + (err.message || ''), 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      await CompetitionRepository.deleteEntry(id);
      await refreshActiveData();
      showToast('Đã xóa lượt chấm điểm này');
    } catch (err: any) {
      showToast('Lỗi khi xóa: ' + (err.message || ''), 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <span>Thi Đua & Khen Thưởng Các Tổ</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cộng trừ điểm thi đua nhanh · Tuyên dương các tổ xuất sắc trong tuần
          </p>
        </div>
      </div>

      {/* Leaderboard Podium Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {sortedGroups.map(([group, pts], idx) => {
          const isTop = idx === 0;
          return (
            <div
              key={group}
              onClick={() => setSelectedGroup(group)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                selectedGroup === group
                  ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              {isTop && (
                <div className="absolute -right-6 -top-6 w-16 h-16 bg-amber-400/20 rounded-full flex items-end justify-start p-2 text-amber-600">
                  <Star className="w-4 h-4 fill-amber-400" />
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Hạng {idx + 1}</span>
                <span
                  className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center ${
                    idx === 0
                      ? 'bg-amber-500 text-white'
                      : idx === 1
                      ? 'bg-slate-300 text-slate-700'
                      : idx === 2
                      ? 'bg-amber-700 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {idx + 1}
                </span>
              </div>

              <div className="mt-2">
                <h4 className="text-base font-bold text-slate-900">{group}</h4>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-amber-700">{pts}</span>
                  <span className="text-xs text-slate-400 font-semibold">điểm</span>
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-1">
                <span>{selectedGroup === group ? 'Đang chọn tổ này' : 'Chạm để chọn cộng điểm'}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Scoring Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Quick point action panel (2 spans) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Thao tác cộng / trừ điểm cho: <span className="text-emerald-700 font-black">{selectedGroup}</span>
              </h3>
              <p className="text-xs text-slate-500">Chạm vào tiêu chí bên dưới để tính điểm ngay</p>
            </div>

            {/* Select specific student in group if applicable */}
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
            >
              <option value="">Toàn tổ (Điểm tập thể)</option>
              {students
                .filter((s) => s.groupId === selectedGroup)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    Học sinh: {s.fullName}
                  </option>
                ))}
            </select>
          </div>

          {/* Quick Click Criteria Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {DEFAULT_RULES.map((rule, idx) => {
              const isPositive = rule.type === 'positive';
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={adding}
                  onClick={() => handleApplyRule(rule.title, rule.delta)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isPositive
                      ? 'bg-emerald-50/40 border-emerald-100 hover:bg-emerald-50 hover:border-emerald-300'
                      : 'bg-rose-50/40 border-rose-100 hover:bg-rose-50 hover:border-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        isPositive ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                      }`}
                    >
                      {isPositive ? <Plus className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                    </div>
                    <span className="text-xs font-semibold text-slate-800 leading-snug">
                      {rule.title}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-extrabold shrink-0 ${
                      isPositive ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {isPositive ? `+${rule.delta}` : rule.delta}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="pt-2">
            <input
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="Ghi chú chi tiết thêm nếu có (ví dụ: giờ Toán thứ 3)..."
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none"
            />
          </div>
        </div>

        {/* Right: History Log (1 span) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-slate-800 text-sm font-bold">
            <History className="w-4 h-4 text-slate-500" />
            <span>Lịch sử ghi điểm gần đây</span>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2">
            {competitionEntries.length === 0 ? (
              <EmptyState
                icon={Trophy}
                iconColor="text-amber-500"
                title="Bảng thi đua tuần mới"
                description="Chưa có lượt cộng trừ sao nào hôm nay. Nhấn vào các tiêu chí bên trái để ghi nhận hoa điểm 10 hoặc việc tốt của các em!"
                quote={{
                  text: 'Khen ngợi kịp thời như giọt mưa xuân tưới mát mầm xanh của lòng tự trọng.',
                  author: 'Vasyl Sukhomlynsky',
                }}
                className="py-6 px-4"
              />
            ) : (
              competitionEntries.slice(0, 15).map((entry) => (
                <div
                  key={entry.id}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start justify-between gap-2 text-xs"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-800 truncate">{entry.groupId || 'Cá nhân'}</span>
                      <span className="text-[10px] text-slate-400">· {entry.date}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 truncate mt-0.5">{entry.ruleTitle}</p>
                    {entry.note && <p className="text-[10px] text-slate-400 italic">{entry.note}</p>}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`font-extrabold ${
                        entry.pointDelta > 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {entry.pointDelta > 0 ? `+${entry.pointDelta}` : entry.pointDelta}
                    </span>
                    <button
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="text-slate-300 hover:text-red-500 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
