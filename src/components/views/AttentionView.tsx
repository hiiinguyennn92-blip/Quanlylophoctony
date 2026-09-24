import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  AlertTriangle,
  Heart,
  CheckCircle,
  Phone,
  MessageCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Calendar,
  BookOpen,
} from 'lucide-react';

export const AttentionView: React.FC = () => {
  const {
    activeClass,
    students,
    parents,
    attentionSignals,
    setActiveTab,
    setSelectedStudentForDetail,
    showToast,
  } = useApp();

  const studentMap = React.useMemo(() => {
    return new Map(students.map((s) => [s.id, s]));
  }, [students]);

  const parentMap = React.useMemo(() => {
    const map = new Map<string, any>();
    parents.forEach((p) => {
      if (p.primary || !map.has(p.studentId)) map.set(p.studentId, p);
    });
    return map;
  }, [parents]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Heart className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Tín Hiệu Cần Quan Tâm & Đồng Hành (Grounded Signals)
            </h2>
            <p className="text-xs text-slate-500">
              Chỉ dựa trên minh chứng thực tế (chuyên cần, bài nộp, mức độ học tập) · Tuyệt đối không phán xét hay gắn nhãn tiêu cực
            </p>
          </div>
        </div>

        <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            Hệ thống tự động phát hiện sớm để Thầy/Cô kịp thời động viên, hỗ trợ học sinh và phối hợp ấm áp cùng gia đình.
          </span>
        </div>
      </div>

      {/* Signal Cards List */}
      <div className="space-y-4">
        {attentionSignals.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              Tất cả học sinh đều đang tiến bộ và duy trì nề nếp tốt!
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Không có trường hợp nào vắng nhiều, trễ hạn bài tập hay gặp khó khăn học tập đáng chú ý trong thời gian này.
            </p>
          </div>
        ) : (
          attentionSignals.map((signal, idx) => {
            const student = studentMap.get(signal.studentId);
            const parent = parentMap.get(signal.studentId);
            if (!student) return null;

            return (
              <div
                key={signal.id || `signal_${signal.studentId}_${signal.signalType}_${idx}`}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 hover:border-amber-300 transition-colors"
              >
                {/* Header of Student */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 font-bold flex items-center justify-center text-sm">
                      {student.fullName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span>{student.fullName}</span>
                        <span className="text-xs font-normal text-slate-500">
                          ({student.studentCode || student.groupId})
                        </span>
                      </h4>
                      <p className="text-xs text-slate-500">
                        {student.groupId} · Giới tính: {student.gender}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {parent && (
                      <a
                        href={`tel:${parent.phone}`}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Gọi {parent.type} ({parent.phone})</span>
                      </a>
                    )}

                    <button
                      onClick={() => {
                        setSelectedStudentForDetail(student);
                        setActiveTab('students');
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>Xem hồ sơ</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Evidence Used Box */}
                <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs">
                  <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Minh chứng thực tế quan sát được:
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-slate-600">
                    {(signal.signals || [signal.description || 'Dữ liệu cần theo dõi thêm']).map((sig: string, i: number) => (
                      <li key={i} className="font-medium text-slate-800">
                        {sig}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Actionable Recommendations */}
                <div className="space-y-1.5 bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100 text-xs">
                  <div className="font-bold text-emerald-800 uppercase tracking-wider text-[10px] flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Gợi ý hành động sư phạm nhân văn:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-emerald-950">
                    {(signal.recommendations || [
                      'Trao đổi động viên riêng em đầu giờ học',
                      'Liên hệ phụ huynh để phối hợp nhắc nhở nhẹ nhàng',
                      'Phân công bạn cùng tổ giúp đỡ nhau trong học tập',
                    ]).map((rec: string, i: number) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>

              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
