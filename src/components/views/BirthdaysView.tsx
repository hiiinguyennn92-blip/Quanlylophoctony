import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Student } from '../../types';
import { AIClientService } from '../../services/aiClientService';
import {
  Cake,
  Sparkles,
  Copy,
  Check,
  Calendar,
  Gift,
  Heart,
  Star,
  Printer,
} from 'lucide-react';
import { parseISO, isThisWeek, isThisMonth } from 'date-fns';
import { parseDobParts, isBirthdayToday, formatDobDisplay } from '../../utils/dateUtils';

export const BirthdaysView: React.FC = () => {
  const { activeClass, students, showToast } = useApp();

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(students[0] || null);
  const [wishType, setWishType] = useState<'ấm áp tình cảm' | 'vui vẻ sôi nổi' | 'thơ ngắn 4 câu'>('ấm áp tình cảm');
  const [aiWish, setAiWish] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [copied, setCopied] = useState(false);

  // Group students by Month
  const studentsByMonth = React.useMemo(() => {
    const months: Record<number, Student[]> = {};
    for (let m = 1; m <= 12; m++) months[m] = [];

    students.forEach((s) => {
      const parts = parseDobParts(s.dob);
      if (parts && months[parts.month]) {
        months[parts.month].push(s);
      }
    });

    return months;
  }, [students]);

  // Today birthdays
  const todayBirthdays = React.useMemo(() => {
    return students.filter((s) => isBirthdayToday(s.dob));
  }, [students]);

  // Generate AI Birthday wish
  const handleGenerateWish = async () => {
    if (!selectedStudent || !activeClass) return;
    setLoadingAi(true);
    try {
      const res = await AIClientService.generateBirthdayWish({
        studentName: selectedStudent.fullName,
        age: 8,
        teacherName: activeClass.teacherName,
        style: wishType,
      });

      setAiWish(res.wish);
      showToast('Đã tạo xong lời chúc sinh nhật ấm áp!');
    } catch (err: any) {
      showToast('Lỗi khi tạo lời chúc: ' + (err.message || ''), 'error');
    } finally {
      setLoadingAi(false);
    }
  };

  const handleCopyWish = () => {
    if (!aiWish) return;
    navigator.clipboard.writeText(aiWish);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast('Đã sao chép lời chúc!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Cake className="w-5 h-5 text-pink-500" />
            <span>Sinh Nhật Học Sinh & Thiệp Chúc Mừng</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi sinh nhật cả năm · AI soạn lời chúc ấm áp khích lệ tuổi mới
          </p>
        </div>
      </div>

      {/* Today Alert Card */}
      {todayBirthdays.length > 0 && (
        <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 rounded-2xl p-6 text-white shadow-md flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-pink-100">
              <Gift className="w-4 h-4" />
              <span>Hôm nay là sinh nhật của học sinh!</span>
            </div>
            <h3 className="text-xl font-black">
              Chúc mừng sinh nhật {todayBirthdays.map((s) => s.fullName).join(', ')}!
            </h3>
            <p className="text-xs text-pink-100 max-w-lg">
              Thầy/Cô hãy gửi lời chúc hoặc tổ chức một tràng pháo tay đầu giờ để tạo niềm vui cho các con nhé!
            </p>
          </div>
          <button
            onClick={() => {
              setSelectedStudent(todayBirthdays[0]);
              handleGenerateWish();
            }}
            className="px-4 py-2 bg-white text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-bold shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            Tạo lời chúc ngay
          </button>
        </div>
      )}

      {/* Main Grid: AI Birthday Card & 12 Month Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: AI Wish & Digital Card (1 span) */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <Sparkles className="w-4 h-4 text-pink-500" />
              <span>Gợi ý lời chúc sinh nhật AI</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chọn học sinh
                </label>
                <select
                  value={selectedStudent?.id || ''}
                  onChange={(e) => {
                    const s = students.find((st) => st.id === e.target.value);
                    if (s) setSelectedStudent(s);
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.dob || 'Chưa có ngày sinh'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phong cách lời chúc
                </label>
                <select
                  value={wishType}
                  onChange={(e: any) => setWishType(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                >
                  <option value="ấm áp tình cảm">Ấm áp, ân cần của cô/thầy</option>
                  <option value="vui vẻ sôi nổi">Vui vẻ, hào hứng, cổ vũ</option>
                  <option value="thơ ngắn 4 câu">Thơ vần 4 câu dí dỏm</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleGenerateWish}
                disabled={loadingAi}
                className="w-full py-2.5 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-200" />
                <span>{loadingAi ? 'Đang viết lời chúc...' : 'Viết lời chúc bằng AI'}</span>
              </button>
            </div>

            {/* Electronic Birthday Card Output */}
            {aiWish && (
              <div className="p-4 bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-200 rounded-2xl space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-pink-800 uppercase tracking-wider flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5 text-pink-600" />
                    Thiệp điện tử
                  </span>
                  <button
                    onClick={handleCopyWish}
                    className="px-2.5 py-1 bg-white hover:bg-pink-100 text-pink-700 text-[11px] font-semibold rounded-lg border border-pink-200 flex items-center gap-1 cursor-pointer"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
                  </button>
                </div>

                <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-serif italic bg-white/80 p-3 rounded-xl border border-pink-100">
                  "{aiWish}"
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: 12 Month Birthday Grid (2 spans) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">
              Lịch sinh nhật 12 tháng trong năm
            </h3>
            <span className="text-xs text-slate-500">Tổng cộng {students.length} học sinh</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => {
              const list = studentsByMonth[m] || [];
              const isCurrentMonth = new Date().getMonth() + 1 === m;

              return (
                <div
                  key={m}
                  className={`p-3 rounded-xl border transition-all ${
                    isCurrentMonth
                      ? 'bg-pink-50/60 border-pink-300 ring-2 ring-pink-400/20'
                      : 'bg-slate-50/50 border-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
                    <span className="text-xs font-bold text-slate-800">
                      Tháng {m} {isCurrentMonth && '⭐'}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {list.length} em
                    </span>
                  </div>

                  <div className="mt-2 space-y-1 max-h-36 overflow-y-auto">
                    {list.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">Không có ngày sinh</p>
                    ) : (
                      list.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => setSelectedStudent(s)}
                          className="flex items-center justify-between text-xs py-1 px-1.5 rounded hover:bg-white cursor-pointer transition-colors"
                        >
                          <span className="font-medium text-slate-800 truncate">{s.fullName}</span>
                          <span className="text-[10px] text-pink-600 font-bold shrink-0 ml-1">
                            {s.dob?.split('-')[2]}/{s.dob?.split('-')[1]}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
