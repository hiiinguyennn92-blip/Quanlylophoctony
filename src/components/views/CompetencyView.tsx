import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CompetencyEvaluation, EvaluationLevel } from '../../types';
import { LearningRepository } from '../../repositories/dataRepository';
import { AIClientService } from '../../services/aiClientService';
import { Award, Save, Sparkles, CheckCircle2, ChevronRight, User, ShieldCheck, Heart } from 'lucide-react';

const CORE_COMPETENCIES = [
  'Tự chủ và tự học',
  'Giao tiếp và hợp tác',
  'Giải quyết vấn đề và sáng tạo',
  'Năng lực ngôn ngữ',
  'Năng lực tính toán',
];

const CORE_QUALITIES = [
  'Yêu nước',
  'Nhân ái',
  'Chăm chỉ',
  'Trung thực',
  'Trách nhiệm',
];

export const CompetencyView: React.FC = () => {
  const {
    activeClass,
    currentUser,
    students,
    competencies,
    assessments,
    refreshActiveData,
    showToast,
    setActiveTab,
  } = useApp();

  const [period, setPeriod] = useState<CompetencyEvaluation['period']>('Giữa học kì 1');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [saving, setSaving] = useState(false);
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [aiMindsetSummary, setAiMindsetSummary] = useState<string>('');

  // Input states for selected student
  const [evalMap, setEvalMap] = useState<Record<string, { level: EvaluationLevel; note: string }>>({});

  // Sync state when selectedStudentId or period changes
  React.useEffect(() => {
    if (!selectedStudentId) {
      if (students.length > 0) setSelectedStudentId(students[0].id);
      return;
    }

    const relevant = competencies.filter(
      (c) => c.studentId === selectedStudentId && c.period === period
    );

    const map: Record<string, { level: EvaluationLevel; note: string }> = {};

    [...CORE_COMPETENCIES, ...CORE_QUALITIES].forEach((crit) => {
      const existing = relevant.find((r) => r.criterion === crit);
      if (existing) {
        map[crit] = { level: existing.level, note: existing.note || '' };
      } else {
        map[crit] = { level: 'Đạt', note: '' };
      }
    });

    setEvalMap(map);
    setAiMindsetSummary('');
  }, [selectedStudentId, period, competencies, students]);

  const updateCrit = (criterion: string, level: EvaluationLevel, note?: string) => {
    setEvalMap((prev) => ({
      ...prev,
      [criterion]: {
        level,
        note: note !== undefined ? note : prev[criterion]?.note || '',
      },
    }));
  };

  const handleAISuggestAll = async () => {
    const student = students.find((s) => s.id === selectedStudentId);
    if (!student) return;

    setAiSuggesting(true);
    try {
      // Find any recent assessments for context
      const stuAssess = assessments.filter((a) => a.studentId === student.id);
      const recentLevels = stuAssess.map((a) => `${a.subjectId}: ${a.level}`).join(', ');

      const res = await AIClientService.generateCompetencyBatch({
        studentName: student.fullName,
        grade: activeClass?.grade || '3',
        period,
        studentNotes: student.notes,
        recentAssessmentLevels: recentLevels || 'Hoàn thành tốt nhiệm vụ học tập',
        attendanceRecord: 'Chuyên cần tốt',
      });

      if (res.evaluations) {
        setEvalMap((prev) => {
          const next = { ...prev };
          Object.entries(res.evaluations).forEach(([crit, item]) => {
            if (next[crit]) {
              next[crit] = {
                level: item.level as EvaluationLevel,
                note: item.note || next[crit].note,
              };
            }
          });
          return next;
        });
      }

      if (res.overallMindsetSummary) {
        setAiMindsetSummary(res.overallMindsetSummary);
      }

      showToast('AI Agent đã đề xuất nhận xét tự nhiên cho 10 tiêu chí!');
    } catch (err: any) {
      showToast('Lỗi khi gợi ý đánh giá AI: ' + (err.message || ''), 'error');
    } finally {
      setAiSuggesting(false);
    }
  };

  const handleSave = async () => {
    if (!activeClass || !currentUser || !selectedStudentId) return;
    setSaving(true);
    try {
      const relevant = competencies.filter(
        (c) => c.studentId === selectedStudentId && c.period === period
      );

      const batchItems: any[] = [];

      for (const crit of CORE_COMPETENCIES) {
        const item = evalMap[crit] || { level: 'Đạt', note: '' };
        const existing = relevant.find((r) => r.criterion === crit);
        batchItems.push({
          id: existing?.id,
          studentId: selectedStudentId,
          criterion: crit,
          type: 'competency' as const,
          period,
          level: item.level,
          note: item.note,
        });
      }

      for (const crit of CORE_QUALITIES) {
        const item = evalMap[crit] || { level: 'Đạt', note: '' };
        const existing = relevant.find((r) => r.criterion === crit);
        batchItems.push({
          id: existing?.id,
          studentId: selectedStudentId,
          criterion: crit,
          type: 'quality' as const,
          period,
          level: item.level,
          note: item.note,
        });
      }

      await LearningRepository.saveCompetencyBatch(activeClass.id, currentUser.uid, batchItems);
      await refreshActiveData();
      showToast('Đã lưu đánh giá năng lực & phẩm chất học sinh!');
    } catch (err: any) {
      showToast('Lỗi khi lưu đánh giá: ' + (err.message || ''), 'error');
    } finally {
      setSaving(false);
    }
  };

  const currentStudent = students.find((s) => s.id === selectedStudentId);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>Đánh Giá Năng Lực & Phẩm Chất</span>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-full">
              Thông tư 27/2020/TT-BGDĐT
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Đánh giá vì sự tiến bộ của người học · 5 Năng lực cốt lõi & 5 Phẩm chất chủ yếu
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e: any) => setPeriod(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none cursor-pointer"
          >
            <option value="Giữa học kì 1">Giữa học kì 1</option>
            <option value="Cuối học kì 1">Cuối học kì 1</option>
            <option value="Giữa học kì 2">Giữa học kì 2</option>
            <option value="Cuối năm học">Cuối năm học</option>
          </select>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Đang lưu...' : 'Lưu đánh giá'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Student List Selector + Assessment Form */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Students List */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="text-xs font-bold text-slate-700 px-2 mb-2 flex items-center justify-between">
            <span>Chọn học sinh ({students.length} em)</span>
            <span className="text-[10px] text-slate-400 font-normal">Chạm để chấm</span>
          </div>
          <div className="max-h-[600px] overflow-y-auto space-y-1">
            {students.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setSelectedStudentId(s.id)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                  selectedStudentId === s.id
                    ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200 ring-1 ring-emerald-300'
                    : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-slate-400 font-semibold text-[11px]">{idx + 1}.</span>
                  <span className="truncate">{s.fullName}</span>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0 ml-1">{s.groupId}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Assessment criteria (2 spans) */}
        <div className="md:col-span-2 space-y-5">
          {currentStudent ? (
            <div className="space-y-5">
              {/* Student Header Card with AI Trigger */}
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 p-4 rounded-2xl border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-600" />
                    <span>{currentStudent.fullName} · {currentStudent.groupId}</span>
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Giai đoạn: <strong>{period}</strong> · Đã nhập {Object.values(evalMap).filter(v => v.note).length}/10 biểu hiện
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAISuggestAll}
                    disabled={aiSuggesting}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Dùng AI Agent đề xuất lời nhận xét tự nhiên cho cả 10 tiêu chí"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>{aiSuggesting ? 'AI đang đề xuất...' : 'AI Đề xuất 10 tiêu chí'}</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('ai-comments')}
                    className="px-3 py-1.5 bg-white text-slate-700 hover:text-indigo-700 text-xs font-semibold rounded-xl shadow-xs border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>Viết nhận xét chi tiết</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* AI Mindset Summary Card if generated */}
              {aiMindsetSummary && (
                <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-2xl text-xs space-y-1 animate-in fade-in">
                  <span className="font-bold text-indigo-900 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    Tư Duy Đánh Giá Khung Năng Lực Của Em {currentStudent.fullName}:
                  </span>
                  <p className="text-slate-700 text-[11px] leading-relaxed italic">
                    "{aiMindsetSummary}"
                  </p>
                </div>
              )}

              {/* 1. Năng lực chung & đặc thù */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-600" />
                    <span>I. Khung Năng Lực Cốt Lõi (5 Tiêu chí)</span>
                  </h4>
                  <span className="text-[10px] text-slate-400">Tốt / Đạt / Cần cố gắng</span>
                </div>

                <div className="space-y-3">
                  {CORE_COMPETENCIES.map((crit) => {
                    const item = evalMap[crit] || { level: 'Đạt', note: '' };
                    return (
                      <div
                        key={crit}
                        className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 space-y-2 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-800">{crit}</span>
                          <div className="inline-flex rounded-lg p-0.5 bg-white border border-slate-200 text-xs font-semibold">
                            {(['Tốt', 'Đạt', 'Cần cố gắng'] as EvaluationLevel[]).map((lvl) => (
                              <button
                                key={lvl}
                                type="button"
                                onClick={() => updateCrit(crit, lvl)}
                                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer text-xs ${
                                  item.level === lvl
                                    ? lvl === 'Tốt'
                                      ? 'bg-emerald-600 text-white font-bold shadow-xs'
                                      : lvl === 'Đạt'
                                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                                      : 'bg-amber-600 text-white font-bold shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                {lvl}
                              </button>
                            ))}
                          </div>
                        </div>
                        <input
                          type="text"
                          value={item.note}
                          onChange={(e) => updateCrit(crit, item.level, e.target.value)}
                          placeholder="Biểu hiện hành vi quan sát được (tự nhiên, chân thực)..."
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. 5 Phẩm chất chủ yếu */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Award className="w-4 h-4 text-teal-600" />
                    <span>II. 5 Phẩm Chất Chủ Yếu</span>
                  </h4>
                  <span className="text-[10px] text-slate-400">Tốt / Đạt / Cần cố gắng</span>
                </div>

                <div className="space-y-3">
                  {CORE_QUALITIES.map((crit) => {
                    const item = evalMap[crit] || { level: 'Đạt', note: '' };
                    return (
                      <div
                        key={crit}
                        className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 space-y-2 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-800">{crit}</span>
                          <div className="inline-flex rounded-lg p-0.5 bg-white border border-slate-200 text-xs font-semibold">
                            {(['Tốt', 'Đạt', 'Cần cố gắng'] as EvaluationLevel[]).map((lvl) => (
                              <button
                                key={lvl}
                                type="button"
                                onClick={() => updateCrit(crit, lvl)}
                                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer text-xs ${
                                  item.level === lvl
                                    ? lvl === 'Tốt'
                                      ? 'bg-emerald-600 text-white font-bold shadow-xs'
                                      : lvl === 'Đạt'
                                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                                      : 'bg-amber-600 text-white font-bold shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                {lvl}
                              </button>
                            ))}
                          </div>
                        </div>
                        <input
                          type="text"
                          value={item.note}
                          onChange={(e) => updateCrit(crit, item.level, e.target.value)}
                          placeholder="Biểu hiện phẩm chất quan sát được..."
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 text-center text-xs text-slate-400 rounded-2xl border border-slate-200">
              Vui lòng chọn một học sinh để bắt đầu đánh giá
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

