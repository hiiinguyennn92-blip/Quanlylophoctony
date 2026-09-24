import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AIClientService } from '../../services/aiClientService';
import { LearningRepository } from '../../repositories/dataRepository';
import { SendZaloModal } from '../common/SendZaloModal';
import {
  Sparkles,
  Copy,
  Check,
  Save,
  ShieldCheck,
  AlertCircle,
  Sliders,
  Heart,
  TrendingUp,
  FileCheck2,
  Smile,
  Zap,
  Tag,
  MessageCircle,
  Award,
  ChevronRight,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { format } from 'date-fns';

const TONE_OPTIONS = [
  {
    id: 'warm',
    label: 'Ấm áp & Ân cần',
    subLabel: 'Người mẹ hiền thứ hai',
    icon: Heart,
    color: 'text-rose-600 bg-rose-50 border-rose-200',
    description: 'Chan chứa tình yêu thương, biểu đạt sự trân trọng những nét ngây thơ và nỗ lực nhỏ của trẻ.',
  },
  {
    id: 'growth',
    label: 'Tư duy phát triển',
    subLabel: 'Khen ngợi nỗ lực & tiến bộ',
    icon: TrendingUp,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    description: 'Khích lệ quá trình kiên trì rèn luyện, biến lỗi sai thành bài học, tin vào tiềm năng của học sinh.',
  },
  {
    id: 'formal_tt27',
    label: 'Chuẩn mực TT 27',
    subLabel: 'Học bạ & Báo cáo',
    icon: FileCheck2,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    description: 'Văn phong sư phạm chuẩn mực theo Thông tư 27/2020/TT-BGDĐT, trung tính, cô đọng và khúc chiết.',
  },
  {
    id: 'lively',
    label: 'Sinh động & Tươi vui',
    subLabel: 'Năng lượng tích cực',
    icon: Smile,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    description: 'Tươi sáng, dùng hình ảnh dễ thương giúp học sinh hào hứng và tự hào khi đọc sổ liên lạc.',
  },
  {
    id: 'concise',
    label: 'Súc tích & Cô đọng',
    subLabel: 'Sổ liên lạc / Zalo / SMS',
    icon: Zap,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    description: '25-35 từ trúng trọng tâm, phù hợp các ô nhận xét giới hạn ký tự hoặc tin nhắn nhanh.',
  },
];

const AVAILABLE_COMPETENCIES = [
  'Tự chủ và tự học',
  'Giao tiếp và hợp tác',
  'Giải quyết vấn đề và sáng tạo',
  'Năng lực ngôn ngữ (Tiếng Việt)',
  'Năng lực tính toán (Toán)',
  'Năng lực khoa học & đời sống',
  'Năng lực công nghệ & tin học',
];

const AVAILABLE_QUALITIES = [
  'Yêu nước',
  'Nhân ái',
  'Chăm chỉ',
  'Trung thực',
  'Trách nhiệm',
];

export const AICommentView: React.FC = () => {
  const {
    activeClass,
    currentUser,
    students,
    assessments,
    refreshActiveData,
    showToast,
  } = useApp();

  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [subject, setSubject] = useState<string>('Đánh giá chung cuối kì');
  const [level, setLevel] = useState<string>('Hoàn thành tốt');
  const [score, setScore] = useState<string>('9');
  const [strengths, setStrengths] = useState<string>('Tiếp thu bài nhanh, chữ viết sạch đẹp, tích cực phát biểu xây dựng bài');
  const [improvements, setImprovements] = useState<string>('Cần cẩn thận hơn khi giải toán có lời văn và rèn thêm tính kiên nhẫn');
  const [competencyQualities, setCompetencyQualities] = useState<string>('Tự giác học bài, hòa đồng và hay giúp đỡ bạn bè');

  // Tone state
  const [tone, setTone] = useState<string>('warm');

  // Selected competencies & qualities tags
  const [selectedCompetencies, setSelectedCompetencies] = useState<string[]>([
    'Tự chủ và tự học',
    'Năng lực tính toán (Toán)',
  ]);
  const [selectedQualities, setSelectedQualities] = useState<string[]>([
    'Chăm chỉ',
    'Nhân ái',
  ]);

  // AI Response state
  const [loading, setLoading] = useState(false);
  const [generatedComment, setGeneratedComment] = useState<string>('');
  const [alternativeVersions, setAlternativeVersions] = useState<Array<{ tone: string; label: string; comment: string }>>([]);
  const [competencyAnalysis, setCompetencyAnalysis] = useState<{
    canDo: string;
    needImprovement: string;
    actionPlan: string;
    competenciesTagged: string[];
    qualitiesTagged: string[];
  } | null>(null);
  const [evidenceUsed, setEvidenceUsed] = useState<string[]>([]);
  const [missingInfo, setMissingInfo] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  // Zalo Send Modal State
  const [showZaloModal, setShowZaloModal] = useState(false);
  const [zaloMessageToSend, setZaloMessageToSend] = useState('');

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  // Auto-fill student existing data when selecting
  const handleSelectStudent = (sId: string) => {
    setSelectedStudentId(sId);
    const stu = students.find((s) => s.id === sId);
    if (!stu) return;

    // Check recent assessments for this student
    const stuAssess = assessments.filter((a) => a.studentId === sId);
    if (stuAssess.length > 0) {
      const latest = stuAssess[0];
      setLevel(latest.level);
      if (latest.score !== undefined) setScore(String(latest.score));
      if (latest.teacherComment) setStrengths(latest.teacherComment);
    }
  };

  const toggleCompetency = (crit: string) => {
    setSelectedCompetencies((prev) =>
      prev.includes(crit) ? prev.filter((c) => c !== crit) : [...prev, crit]
    );
  };

  const toggleQuality = (qual: string) => {
    setSelectedQualities((prev) =>
      prev.includes(qual) ? prev.filter((q) => q !== qual) : [...prev, qual]
    );
  };

  const handleGenerate = async () => {
    if (!selectedStudent) {
      showToast('Vui lòng chọn học sinh trước khi tạo nhận xét', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await AIClientService.generateComment({
        studentName: selectedStudent.fullName,
        grade: activeClass?.grade || '3',
        subject,
        level,
        score: score ? Number(score) : undefined,
        strengths,
        improvements,
        competencyQualities,
        targetCompetencies: selectedCompetencies,
        targetQualities: selectedQualities,
        tone,
      });

      setGeneratedComment(res.comment);
      setAlternativeVersions(res.alternativeVersions || []);
      setCompetencyAnalysis(res.competencyAnalysis || null);
      setEvidenceUsed(res.evidenceUsed || []);
      setMissingInfo(res.missingInformation || []);
      showToast('Đã tạo xong nhận xét tự nhiên & khung năng lực!');
    } catch (err: any) {
      showToast('Không thể tạo nhận xét: ' + (err.message || ''), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!generatedComment) return;
    navigator.clipboard.writeText(generatedComment);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    showToast('Đã sao chép nhận xét vào bộ nhớ tạm!');
  };

  const handleSaveToProfile = async () => {
    if (!activeClass || !currentUser || !selectedStudent || !generatedComment) return;
    try {
      await LearningRepository.saveAssessment({
        classId: activeClass.id,
        ownerId: currentUser.uid,
        studentId: selectedStudent.id,
        subjectId: subject,
        date: format(new Date(), 'yyyy-MM-dd'),
        level: level as any,
        score: score ? Number(score) : undefined,
        teacherComment: generatedComment,
        assessmentType: 'thường xuyên',
      });

      await refreshActiveData();
      showToast('Đã lưu nhận xét vào hồ sơ học sinh thành công!');
    } catch (err: any) {
      showToast('Lỗi khi lưu nhận xét: ' + (err.message || ''), 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
              <Sparkles className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>AI Agent Sư Phạm: Ngữ Điệu Tự Nhiên & Khung Năng Lực Tiểu Học</span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-full uppercase">
                  GDPT 2018 & TT 27
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Khử sạch văn mẫu máy móc · Ngữ điệu chân thực của người thầy · Đánh giá theo cấu trúc 3 thành tố: Can - Need - Action
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-200 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Anti-AI Cliché Filter Active</span>
          </span>
        </div>
      </div>

      {/* Main Grid: Form Inputs (Left) and AI Output (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input Form (7 cols) */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          {/* Section 1: Học sinh & Môn học */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-3">
              <Sliders className="w-4 h-4 text-indigo-600" />
              <span>1. Thông tin học sinh & Mảng đánh giá</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chọn học sinh *
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => handleSelectStudent(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white font-medium cursor-pointer"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.studentCode || s.groupId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Môn học / Nội dung đánh giá
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none bg-white font-medium"
                  >
                    <option value="Đánh giá chung cuối kì">Đánh giá chung (Sổ liên lạc)</option>
                    <option value="Toán">Toán</option>
                    <option value="Tiếng Việt">Tiếng Việt</option>
                    <option value="Tiếng Anh">Tiếng Anh</option>
                    <option value="Tự nhiên và Xã hội">Tự nhiên và Xã hội</option>
                    <option value="Lịch sử và Địa lý">Lịch sử và Địa lý</option>
                    <option value="Tin học và Công nghệ">Tin học & Công nghệ</option>
                    <option value="Đạo đức">Đạo đức</option>
                    <option value="Năng lực & Phẩm chất">Năng lực & Phẩm chất</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Điểm số (nếu có)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.5"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    placeholder="9.0"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none font-semibold text-indigo-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mức độ hoàn thành
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 'Hoàn thành tốt', label: 'Hoàn thành tốt (T)', bg: 'hover:bg-emerald-50 text-emerald-800' },
                    { val: 'Hoàn thành', label: 'Hoàn thành (H)', bg: 'hover:bg-blue-50 text-blue-800' },
                    { val: 'Chưa hoàn thành', label: 'Chưa hoàn thành (C)', bg: 'hover:bg-amber-50 text-amber-800' },
                  ].map((lvl) => (
                    <button
                      key={lvl.val}
                      type="button"
                      onClick={() => setLevel(lvl.val)}
                      className={`px-2.5 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center ${
                        level === lvl.val
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : `bg-slate-50 text-slate-600 border-slate-200 ${lvl.bg}`
                      }`}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Skill Ngữ Điệu Tự Nhiên (5 Tones) */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-rose-500" />
                <span>2. Chọn Skill Ngữ Điệu Sư Phạm Tự Nhiên</span>
              </span>
              <span className="text-[11px] font-semibold text-indigo-600">5 Phong cách chuyên sâu</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TONE_OPTIONS.map((t) => {
                const IconComp = t.icon;
                const isSelected = tone === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTone(t.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? `${t.color} ring-2 ring-indigo-400/40 shadow-xs font-bold`
                        : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-700'
                    } ${t.id === 'concise' ? 'sm:col-span-2' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <IconComp className="w-4 h-4 shrink-0" />
                      <div className="truncate">
                        <span className="text-xs font-bold">{t.label}</span>
                        <span className="text-[10px] opacity-75 font-normal ml-1">· {t.subLabel}</span>
                      </div>
                    </div>
                    <p className="text-[10px] opacity-80 mt-1 leading-snug line-clamp-2">
                      {t.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Mindset Đánh Giá Khung Năng Lực & Phẩm Chất */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-500" />
                <span>3. Khung Năng Lực & Phẩm Chất Trọng Tâm (GDPT 2018)</span>
              </h3>
              <span className="text-[10px] text-slate-400">Chọn các mục em thể hiện rõ</span>
            </div>

            {/* Năng Lực Tags */}
            <div>
              <span className="text-[11px] font-bold text-slate-600 block mb-1.5">
                Khung Năng Lực cốt lõi:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_COMPETENCIES.map((crit) => {
                  const isChecked = selectedCompetencies.includes(crit);
                  return (
                    <button
                      key={crit}
                      type="button"
                      onClick={() => toggleCompetency(crit)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border ${
                        isChecked
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {crit}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Phẩm Chất Tags */}
            <div>
              <span className="text-[11px] font-bold text-slate-600 block mb-1.5">
                5 Phẩm Chất chủ yếu:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_QUALITIES.map((qual) => {
                  const isChecked = selectedQualities.includes(qual);
                  return (
                    <button
                      key={qual}
                      type="button"
                      onClick={() => toggleQuality(qual)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border ${
                        isChecked
                          ? 'bg-amber-600 text-white border-amber-700 shadow-2xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {qual}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 4: Quan sát cụ thể */}
          <div className="pt-2 border-t border-slate-100 space-y-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Điểm mạnh đã quan sát thấy (Dẫn chứng cụ thể)
              </label>
              <textarea
                rows={2}
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                placeholder="VD: Tính toán nhanh, chữ viết sạch sẽ, hăng hái phát biểu..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nội dung cần rèn luyện thêm (Vùng phát triển gần)
              </label>
              <textarea
                rows={2}
                value={improvements}
                onChange={(e) => setImprovements(e.target.value)}
                placeholder="VD: Cần đọc kĩ đề bài, chú ý dấu câu, giữ tập trung trong giờ..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>{loading ? 'AI Agent đang phân tích & biên soạn...' : 'Tạo Nhận Xét Tự Nhiên & Khung Năng Lực'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: AI Output & Mindset Analysis (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          {/* Main Output Box */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  <span>Bản thảo nhận xét sư phạm hoàn chỉnh</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Ngữ điệu tự nhiên · Không dán nhãn · Giáo viên duyệt trước khi lưu
                </p>
              </div>

              {generatedComment && (
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  <button
                    onClick={handleCopy}
                    className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
                  </button>

                  <button
                    onClick={handleSaveToProfile}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Lưu vào sổ</span>
                  </button>

                  <button
                    onClick={() => {
                      setZaloMessageToSend(generatedComment);
                      setShowZaloModal(true);
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Chỉnh sửa & Gửi nhận xét này cho phụ huynh qua Zalo"
                  >
                    <MessageCircle className="w-3.5 h-3.5 fill-white" />
                    <span>Gửi qua Zalo</span>
                  </button>
                </div>
              )}
            </div>

            {/* Editable Textarea with Natural Voice feel */}
            <div className="relative">
              <textarea
                rows={6}
                value={generatedComment}
                onChange={(e) => setGeneratedComment(e.target.value)}
                placeholder="Nhận xét do AI Agent biên soạn theo ngữ điệu tự nhiên và khung năng lực sẽ hiển thị ở đây. Thầy/Cô có thể chỉnh sửa trực tiếp từng câu từ trước khi lưu."
                className="w-full p-4 text-xs leading-relaxed border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-800 bg-slate-50/40"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 px-1">
                <span>Số từ: {generatedComment ? generatedComment.trim().split(/\s+/).length : 0} từ</span>
                <span>Ngữ điệu: <strong>{TONE_OPTIONS.find((t) => t.id === tone)?.label}</strong></span>
              </div>
            </div>

            {/* Alternative Tones: 1-click apply */}
            {alternativeVersions.length > 0 && (
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Phương án ngữ điệu thay thế (Bấm để áp dụng nhanh):</span>
                </span>
                <div className="space-y-2">
                  {alternativeVersions.map((alt, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50/70 hover:bg-slate-100/70 border border-slate-200 rounded-xl text-xs space-y-1 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                          <Tag className="w-3 h-3 text-indigo-500" />
                          {alt.label}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setZaloMessageToSend(alt.comment);
                              setShowZaloModal(true);
                            }}
                            className="px-2 py-0.5 text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors cursor-pointer flex items-center gap-1"
                            title="Soạn & Gửi phương án này qua Zalo"
                          >
                            <MessageCircle className="w-3 h-3 fill-blue-600" />
                            <span>Gửi Zalo</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setGeneratedComment(alt.comment);
                              showToast(`Đã áp dụng phương án: ${alt.label}`);
                            }}
                            className="px-2 py-0.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors cursor-pointer"
                          >
                            Áp dụng ngay
                          </button>
                        </div>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed italic">
                        "{alt.comment}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Competency Framework Analysis (Can - Need - Action) */}
            {competencyAnalysis && (
              <div className="pt-3 border-t border-slate-100 space-y-2.5">
                <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-indigo-600" />
                  <span>Phân Tích Khung Năng Lực 3 Thành Tố (Can - Need - Action):</span>
                </h4>

                <div className="grid grid-cols-1 gap-2 text-xs">
                  {/* CAN */}
                  <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                    <span className="font-bold text-emerald-800 text-[11px] flex items-center gap-1">
                      <span>🌟</span>
                      <span>CAN (Năng lực đã làm chủ):</span>
                    </span>
                    <p className="text-slate-700 text-[11px] mt-0.5">{competencyAnalysis.canDo}</p>
                  </div>

                  {/* NEED */}
                  <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl">
                    <span className="font-bold text-blue-800 text-[11px] flex items-center gap-1">
                      <span>🌱</span>
                      <span>NEED (Vùng phát triển gần):</span>
                    </span>
                    <p className="text-slate-700 text-[11px] mt-0.5">{competencyAnalysis.needImprovement}</p>
                  </div>

                  {/* ACTION */}
                  <div className="p-2.5 bg-purple-50/70 border border-purple-200 rounded-xl">
                    <span className="font-bold text-purple-800 text-[11px] flex items-center gap-1">
                      <span>🎯</span>
                      <span>ACTION (Kế hoạch phối hợp GV & Gia đình):</span>
                    </span>
                    <p className="text-slate-700 text-[11px] mt-0.5">{competencyAnalysis.actionPlan}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Evidence Used Grounding Card */}
            {evidenceUsed.length > 0 && (
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-xs space-y-1">
                <span className="font-bold text-emerald-800 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Căn cứ thực tế đã sử dụng
                </span>
                <ul className="list-disc list-inside text-slate-700 space-y-0.5 text-[11px]">
                  {evidenceUsed.map((ev, i) => (
                    <li key={i}>{ev}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Missing Info Warning */}
            {missingInfo.length > 0 && (
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 text-xs space-y-1">
                <span className="font-bold text-amber-800 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  Lưu ý dữ liệu cần bổ sung
                </span>
                <ul className="list-disc list-inside text-slate-700 space-y-0.5 text-[11px]">
                  {missingInfo.map((mi, i) => (
                    <li key={i}>{mi}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Send Zalo Modal */}
      {selectedStudent && (
        <SendZaloModal
          isOpen={showZaloModal}
          onClose={() => setShowZaloModal(false)}
          student={selectedStudent}
          initialMessage={zaloMessageToSend || generatedComment}
          defaultTopic={`Nhận xét ${subject}`}
        />
      )}
    </div>
  );
};
