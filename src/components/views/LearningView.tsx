import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Assessment, AssessmentLevel, Student } from '../../types';
import { LearningRepository } from '../../repositories/dataRepository';
import { SendZaloModal } from '../common/SendZaloModal';
import {
  BookOpen,
  Plus,
  Save,
  CheckCircle,
  AlertCircle,
  TrendingDown,
  Sparkles,
  Search,
  Filter,
  MessageCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { Keyboard } from 'lucide-react';

const PRIMARY_SUBJECTS = [
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
  'Hoạt động trải nghiệm',
];

export const LearningView: React.FC = () => {
  const {
    activeClass,
    currentUser,
    students,
    assessments,
    refreshActiveData,
    showToast,
    setActiveTab,
  } = useApp();

  const [selectedSubject, setSelectedSubject] = useState<string>('Toán');
  const [assessmentDate, setAssessmentDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [assessmentType, setAssessmentType] = useState<Assessment['assessmentType']>('thường xuyên');
  const [viewMode, setViewMode] = useState<'subject_matrix' | 'student_list'>('subject_matrix');

  // Input states for subject matrix
  const [scoresMap, setScoresMap] = useState<Record<string, { level: AssessmentLevel; score?: number; comment?: string }>>({});
  const [saving, setSaving] = useState(false);

  // Fast keyboard navigation refs
  const scoreInputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const commentInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Send Zalo Modal State
  const [showZaloModal, setShowZaloModal] = useState(false);
  const [selectedStudentForZalo, setSelectedStudentForZalo] = useState<Student | null>(null);
  const [zaloMessage, setZaloMessage] = useState('');

  // Sync state when subject or assessments change
  React.useEffect(() => {
    const map: Record<string, { level: AssessmentLevel; score?: number; comment?: string }> = {};
    const relevant = assessments.filter((a) => a.subjectId === selectedSubject);

    students.forEach((s) => {
      // Find latest assessment for this student & subject
      const latest = relevant.filter((a) => a.studentId === s.id).sort((a, b) => b.date.localeCompare(a.date))[0];
      if (latest) {
        map[s.id] = {
          level: latest.level,
          score: latest.score,
          comment: latest.teacherComment || '',
        };
      } else {
        map[s.id] = {
          level: 'Hoàn thành',
          comment: '',
        };
      }
    });
    setScoresMap(map);
  }, [selectedSubject, assessments, students]);

  const updateStudentAssess = (studentId: string, updates: Partial<{ level: AssessmentLevel; score?: number; comment?: string }>) => {
    setScoresMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        ...updates,
      },
    }));
  };

  const handleSaveAll = async () => {
    if (!activeClass || !currentUser) return;
    if (students.length === 0) {
      showToast('Lớp chưa có học sinh để lưu đánh giá.', 'info');
      return;
    }
    setSaving(true);
    try {
      const relevant = assessments.filter((a) => a.subjectId === selectedSubject);
      const batchList: any[] = [];

      for (const s of students) {
        const item = scoresMap[s.id];
        if (item) {
          const existing = relevant.find((a) => a.studentId === s.id && a.date === assessmentDate);
          batchList.push({
            id: existing?.id,
            studentId: s.id,
            subjectId: selectedSubject,
            date: assessmentDate,
            level: item.level,
            score: item.score !== undefined ? Number(item.score) : undefined,
            teacherComment: item.comment,
            assessmentType,
          });
        }
      }

      await LearningRepository.saveAssessmentBatch(activeClass.id, currentUser.uid, batchList);
      await refreshActiveData();
      showToast(`Đã lưu kết quả đánh giá môn ${selectedSubject}!`);
    } catch (err: any) {
      showToast('Lỗi khi lưu đánh giá: ' + (err.message || ''), 'error');
    } finally {
      setSaving(false);
    }
  };

  // Stats for current subject
  const subjectStats = React.useMemo(() => {
    const vals = Object.values(scoresMap);
    const excellent = vals.filter((v) => v.level === 'Hoàn thành tốt').length;
    const completed = vals.filter((v) => v.level === 'Hoàn thành').length;
    const needSupport = vals.filter((v) => v.level === 'Chưa hoàn thành').length;
    const total = students.length || 1;
    return {
      excellent,
      completed,
      needSupport,
      excellentPct: Math.round((excellent / total) * 100),
      completedPct: Math.round((completed / total) * 100),
      needSupportPct: Math.round((needSupport / total) * 100),
    };
  }, [scoresMap, students.length]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Theo Dõi Kết Quả Học Tập
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Đánh giá thường xuyên & định kỳ môn học theo Thông tư 27/2020/TT-BGDĐT
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('ai-comments')}
            className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl border border-indigo-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span>AI Gợi ý nhận xét</span>
          </button>

          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Đang lưu...' : 'Lưu kết quả môn này'}</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Subject tabs & Date */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        {/* Subject Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold">
          {PRIMARY_SUBJECTS.map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedSubject(sub)}
              className={`px-3 py-1.5 rounded-xl shrink-0 transition-colors cursor-pointer ${
                selectedSubject === sub
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>

        {/* Date & Assessment Type */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Kỳ đánh giá:</span>
              <select
                value={assessmentType}
                onChange={(e: any) => setAssessmentType(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 font-semibold"
              >
                <option value="thường xuyên">Thường xuyên</option>
                <option value="định kỳ giữa kì">Định kỳ Giữa kì</option>
                <option value="định kỳ cuối kì">Định kỳ Cuối kì</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Ngày ghi:</span>
              <input
                type="date"
                value={assessmentDate}
                onChange={(e) => setAssessmentDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 font-semibold"
              />
            </div>
          </div>

            {/* Quick Level Distribution & Keyboard helper */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="text-emerald-700 font-bold">
                Hoàn thành tốt: {subjectStats.excellent} ({subjectStats.excellentPct}%)
              </span>
              <span className="text-blue-700 font-bold">
                Hoàn thành: {subjectStats.completed} ({subjectStats.completedPct}%)
              </span>
              <span className="text-amber-700 font-bold">
                Chưa hoàn thành: {subjectStats.needSupport} ({subjectStats.needSupportPct}%)
              </span>

              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg text-[11px] text-slate-500 font-medium border border-slate-200">
                <Keyboard className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  Bấm <kbd className="px-1 bg-white border border-slate-300 rounded font-mono text-[10px]">Enter</kbd> hoặc <kbd className="px-1 bg-white border border-slate-300 rounded font-mono text-[10px]">↓</kbd> để xuống học sinh tiếp theo, <kbd className="px-1 bg-white border border-slate-300 rounded font-mono text-[10px]">Tab</kbd> chuyển ô nhận xét
                </span>
              </div>
            </div>
        </div>
      </div>

      {/* Roster Input Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 w-12 text-center">STT</th>
                <th className="py-3 px-4 min-w-[160px]">Học sinh</th>
                <th className="py-3 px-4">Tổ</th>
                <th className="py-3 px-4 min-w-[200px]">Mức độ đạt được</th>
                <th className="py-3 px-4 w-28">Điểm số (nếu có)</th>
                <th className="py-3 px-4">Nhận xét của giáo viên</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Lớp chưa có học sinh nào.
                  </td>
                </tr>
              ) : (
                students.map((student, idx) => {
                  const state = scoresMap[student.id] || { level: 'Hoàn thành', comment: '' };
                  const isLow = state.level === 'Chưa hoàn thành';

                  return (
                    <tr
                      key={student.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isLow ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-center font-medium text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {student.fullName}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-medium">
                        {student.groupId}
                      </td>
                      <td className="py-3 px-4">
                        <div className="inline-flex rounded-lg p-1 bg-slate-100 text-[11px] font-semibold">
                          <button
                            type="button"
                            onClick={() => updateStudentAssess(student.id, { level: 'Hoàn thành tốt' })}
                            className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                              state.level === 'Hoàn thành tốt'
                                ? 'bg-emerald-600 text-white font-bold'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            HTT (T)
                          </button>
                          <button
                            type="button"
                            onClick={() => updateStudentAssess(student.id, { level: 'Hoàn thành' })}
                            className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                              state.level === 'Hoàn thành'
                                ? 'bg-blue-600 text-white font-bold'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            HT (H)
                          </button>
                          <button
                            type="button"
                            onClick={() => updateStudentAssess(student.id, { level: 'Chưa hoàn thành' })}
                            className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                              state.level === 'Chưa hoàn thành'
                                ? 'bg-amber-600 text-white font-bold'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            CHT (C)
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          ref={(el) => {
                            scoreInputsRef.current[idx] = el;
                          }}
                          type="number"
                          min="0"
                          max="10"
                          step="0.5"
                          value={state.score !== undefined ? state.score : ''}
                          onChange={(e) =>
                            updateStudentAssess(student.id, {
                              score: e.target.value === '' ? undefined : Number(e.target.value),
                            })
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === 'ArrowDown') {
                              e.preventDefault();
                              const next = scoreInputsRef.current[idx + 1];
                              if (next) {
                                next.focus();
                                next.select();
                              }
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              const prev = scoreInputsRef.current[idx - 1];
                              if (prev) {
                                prev.focus();
                                prev.select();
                              }
                            }
                          }}
                          placeholder="Điểm..."
                          className="w-20 px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <input
                            ref={(el) => {
                              commentInputsRef.current[idx] = el;
                            }}
                            type="text"
                            value={state.comment || ''}
                            onChange={(e) => updateStudentAssess(student.id, { comment: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const nextComment = commentInputsRef.current[idx + 1];
                                if (nextComment) {
                                  nextComment.focus();
                                } else {
                                  const nextScore = scoreInputsRef.current[idx + 1];
                                  if (nextScore) nextScore.focus();
                                }
                              } else if (e.key === 'ArrowDown' && e.currentTarget.selectionStart === e.currentTarget.value.length) {
                                const nextComment = commentInputsRef.current[idx + 1];
                                if (nextComment) {
                                  e.preventDefault();
                                  nextComment.focus();
                                }
                              } else if (e.key === 'ArrowUp' && e.currentTarget.selectionStart === 0) {
                                const prevComment = commentInputsRef.current[idx - 1];
                                if (prevComment) {
                                  e.preventDefault();
                                  prevComment.focus();
                                }
                              }
                            }}
                            placeholder="Nhận xét sự tiến bộ, ưu điểm hoặc điểm cần khắc phục..."
                            className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStudentForZalo(student);
                              const noteText = state.comment
                                ? `Nhận xét: "${state.comment}". Mức đạt: ${state.level}${state.score !== undefined ? ` (${state.score} điểm)` : ''}.`
                                : `Em đạt mức ${state.level} môn ${selectedSubject}${state.score !== undefined ? ` (${state.score} điểm)` : ''}.`;
                              setZaloMessage(noteText);
                              setShowZaloModal(true);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 hover:border-blue-300 border border-slate-200 rounded-lg transition-colors cursor-pointer shrink-0"
                            title="Gửi nhận xét môn này cho phụ huynh qua Zalo"
                          >
                            <MessageCircle className="w-3.5 h-3.5 fill-blue-50" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Send Zalo Modal */}
      {showZaloModal && selectedStudentForZalo && (
        <SendZaloModal
          isOpen={showZaloModal}
          onClose={() => setShowZaloModal(false)}
          student={selectedStudentForZalo}
          initialMessage={zaloMessage}
          defaultTopic={`Đánh giá môn ${selectedSubject}`}
        />
      )}
    </div>
  );
};
