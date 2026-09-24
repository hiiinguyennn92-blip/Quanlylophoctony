import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ClassRepository } from '../../repositories/dataRepository';
import { Sparkles, School, GraduationCap, ArrowRight, X } from 'lucide-react';

export const OnboardingModal: React.FC = () => {
  const {
    currentUser,
    showOnboarding,
    setShowOnboarding,
    refreshClasses,
    setActiveClassId,
    showToast,
    seedDemoClass,
    classes,
  } = useApp();

  const [schoolName, setSchoolName] = useState('Trường Tiểu học Chu Văn An');
  const [schoolYear, setSchoolYear] = useState('2025 - 2026');
  const [grade, setGrade] = useState('3');
  const [className, setClassName] = useState('3A1');
  const [teacherName, setTeacherName] = useState(currentUser?.displayName || 'Cô Mai');
  const [session, setSession] = useState<'morning' | 'afternoon' | 'full_day'>('full_day');
  const [expectedStudentCount, setExpectedStudentCount] = useState(35);
  const [loading, setLoading] = useState(false);

  if (!showOnboarding) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!className.trim()) {
      showToast('Vui lòng nhập tên lớp', 'error');
      return;
    }

    setLoading(true);
    try {
      const newClass = await ClassRepository.createClass({
        ownerId: currentUser.uid,
        schoolName,
        schoolYear,
        grade,
        className,
        teacherName,
        session,
        expectedStudentCount: Number(expectedStudentCount) || 35,
      });

      await refreshClasses();
      setActiveClassId(newClass.id);
      setShowOnboarding(false);
      showToast(`Đã khởi tạo Lớp ${className} thành công!`, 'success');
    } catch (err: any) {
      console.error(err);
      showToast('Không thể tạo lớp: ' + (err.message || ''), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDemo = async () => {
    setLoading(true);
    await seedDemoClass();
    setLoading(false);
    setShowOnboarding(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-5 text-white relative">
          {classes.length > 0 && (
            <button
              onClick={() => setShowOnboarding(false)}
              className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Khởi tạo Lớp Chủ Nhiệm</h2>
              <p className="text-xs text-emerald-100 mt-0.5">
                Thiết lập thông tin lớp học tiểu học của bạn
              </p>
            </div>
          </div>
        </div>

        {/* Quick Demo Option */}
        <div className="p-5 bg-amber-50/70 border-b border-amber-100 flex items-center justify-between gap-4">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-slate-800">Trải nghiệm nhanh với dữ liệu mẫu?</h4>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                Nạp sẵn Lớp 3A1 với 10 học sinh, chuyên cần, đánh giá học tập, thi đua tổ và sổ nhật ký.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSeedDemo}
            disabled={loading}
            className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            Nạp mẫu ngay
          </button>
        </div>

        {/* Manual Form */}
        <form onSubmit={handleCreate} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tên trường học
              </label>
              <div className="relative">
                <School className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="Ví dụ: Trường Tiểu học Chu Văn An"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Năm học
              </label>
              <input
                type="text"
                required
                value={schoolYear}
                onChange={(e) => setSchoolYear(e.target.value)}
                placeholder="2025 - 2026"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Khối lớp
              </label>
              <select
                value={grade}
                onChange={(e) => {
                  setGrade(e.target.value);
                  setClassName(`${e.target.value}A1`);
                }}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
              >
                <option value="1">Khối 1</option>
                <option value="2">Khối 2</option>
                <option value="3">Khối 3</option>
                <option value="4">Khối 4</option>
                <option value="5">Khối 5</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tên lớp (Mã lớp)
              </label>
              <input
                type="text"
                required
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="3A1, 4B..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Giáo viên chủ nhiệm
              </label>
              <input
                type="text"
                required
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="Họ và tên Thầy/Cô"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Buổi học
              </label>
              <select
                value={session}
                onChange={(e: any) => setSession(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
              >
                <option value="full_day">Học cả ngày (2 buổi/ngày)</option>
                <option value="morning">Buổi sáng</option>
                <option value="afternoon">Buổi chiều</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sĩ số dự kiến
              </label>
              <input
                type="number"
                value={expectedStudentCount}
                onChange={(e) => setExpectedStudentCount(Number(e.target.value))}
                min="1"
                max="60"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            {classes.length > 0 && (
              <button
                type="button"
                onClick={() => setShowOnboarding(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
              >
                Hủy bỏ
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <span>{loading ? 'Đang tạo lớp...' : 'Tạo lớp và bắt đầu'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
