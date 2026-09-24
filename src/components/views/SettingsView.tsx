import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ClassRepository } from '../../repositories/dataRepository';
import { BackupService } from '../../services/backupService';
import {
  Settings,
  Database,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  Sparkles,
  School,
  Save,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    activeClass,
    currentUser,
    classes,
    setActiveClassId,
    refreshClasses,
    refreshActiveData,
    seedDemoClass,
    showToast,
    setShowOnboarding,
  } = useApp();

  // Class settings form
  const [schoolName, setSchoolName] = useState(activeClass?.schoolName || '');
  const [className, setClassName] = useState(activeClass?.className || '');
  const [schoolYear, setSchoolYear] = useState(activeClass?.schoolYear || '');
  const [teacherName, setTeacherName] = useState(activeClass?.teacherName || '');
  const [expectedCount, setExpectedCount] = useState(activeClass?.expectedStudentCount || 35);
  const [savingClass, setSavingClass] = useState(false);

  // Backup state
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  // Reset confirmation
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  React.useEffect(() => {
    if (activeClass) {
      setSchoolName(activeClass.schoolName);
      setClassName(activeClass.className);
      setSchoolYear(activeClass.schoolYear);
      setTeacherName(activeClass.teacherName);
      setExpectedCount(activeClass.expectedStudentCount || 35);
    }
  }, [activeClass]);

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClass) return;
    setSavingClass(true);
    try {
      await ClassRepository.updateClass(activeClass.id, {
        schoolName,
        className,
        schoolYear,
        teacherName,
        expectedStudentCount: Number(expectedCount),
      });

      await refreshClasses();
      showToast('Đã lưu thông tin lớp học thành công!');
    } catch (err: any) {
      showToast('Lỗi khi lưu thông tin: ' + (err.message || ''), 'error');
    } finally {
      setSavingClass(false);
    }
  };

  const handleBackupDownload = async () => {
    if (!activeClass || !currentUser) return;
    setExporting(true);
    try {
      await BackupService.exportClassBackup(activeClass.id, activeClass.className, currentUser.uid);
      showToast('Đã tải tệp sao lưu JSON về máy an toàn!');
    } catch (err: any) {
      showToast('Lỗi khi tạo sao lưu: ' + (err.message || ''), 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleBackupUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeClass || !currentUser) return;
    setImporting(true);
    try {
      await BackupService.importClassBackup(file, activeClass.id, currentUser.uid);
      await refreshActiveData();
      showToast('Đã phục hồi dữ liệu lớp học thành công từ tệp sao lưu!');
    } catch (err: any) {
      showToast('Lỗi khi phục hồi: ' + (err.message || ''), 'error');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-600" />
            <span>Cài Đặt Hệ Thống & Quản Trị Dữ Liệu</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cập nhật thông tin lớp · Sao lưu dự phòng an toàn · Quản lý danh sách lớp
          </p>
        </div>
      </div>

      {/* 1. Class Information Form */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <School className="w-4 h-4 text-emerald-600" />
          <span>Thông tin Lớp học & Giáo viên chủ nhiệm</span>
        </h3>

        <form onSubmit={handleUpdateClass} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tên trường học
              </label>
              <input
                type="text"
                required
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
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
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none"
              />
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
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Họ và tên Giáo viên chủ nhiệm
              </label>
              <input
                type="text"
                required
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sĩ số chỉ tiêu dự kiến
              </label>
              <input
                type="number"
                value={expectedCount}
                onChange={(e) => setExpectedCount(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={savingClass}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingClass ? 'Đang lưu...' : 'Lưu cập nhật'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. Backup & Restore Data */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-600" />
          <span>Sao Lưu & Phục Hồi Dữ Liệu An Toàn</span>
        </h3>
        <p className="text-xs text-slate-500">
          Xuất toàn bộ cơ sở dữ liệu của lớp (học sinh, phụ huynh, chuyên cần, điểm số, nhật ký, thi đua) ra tệp JSON để lưu trữ ngoại tuyến trên máy tính.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Download backup */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Sao lưu dữ liệu về máy</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Tạo bản sao lưu nén định dạng JSON có dấu thời gian.
            </p>
            <button
              type="button"
              onClick={handleBackupDownload}
              disabled={exporting}
              className="w-full py-2 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-lg border border-slate-200 shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exporting ? 'Đang tạo sao lưu...' : 'Tải tệp sao lưu (.json)'}</span>
            </button>
          </div>

          {/* Restore backup */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Upload className="w-4 h-4 text-blue-600" />
              <span>Khôi phục từ tệp sao lưu</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Chọn tệp sao lưu JSON đã tải trước đây để phục hồi lại dữ liệu.
            </p>
            <label className="w-full py-2 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-lg border border-slate-200 shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-blue-600" />
              <span>{importing ? 'Đang phục hồi...' : 'Chọn tệp khôi phục'}</span>
              <input
                type="file"
                accept=".json"
                onChange={handleBackupUpload}
                disabled={importing}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* 3. Demo Data & Multi-class Management */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <School className="w-4 h-4 text-emerald-600" />
            <span>Danh Sách Các Lớp Chủ Nhiệm ({classes.length})</span>
          </div>
          <button
            type="button"
            onClick={() => setShowOnboarding(true)}
            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>+ Thêm lớp mới</span>
          </button>
        </h3>

        <div className="space-y-2.5">
          {classes.map((cls) => {
            const isActive = cls.id === activeClass?.id;
            return (
              <div
                key={cls.id}
                className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                  isActive
                    ? 'bg-emerald-50/60 border-emerald-300 ring-2 ring-emerald-400/20'
                    : 'bg-slate-50/50 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      Lớp {cls.className}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      ({cls.schoolYear})
                    </span>
                    {isActive && (
                      <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-full">
                        Đang chọn
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {cls.schoolName} · GVCN: {cls.teacherName}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {!isActive && (
                    <button
                      type="button"
                      onClick={async () => {
                        setActiveClassId(cls.id);
                        showToast(`Đã chuyển sang lớp ${cls.className}!`);
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors cursor-pointer"
                    >
                      Chọn lớp này
                    </button>
                  )}

                  {classes.length > 1 && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (window.confirm(`Bạn có chắc chắn muốn xóa lớp ${cls.className}? Dữ liệu lớp này sẽ bị xóa khỏi hệ thống.`)) {
                          try {
                            await ClassRepository.deleteClass(cls.id);
                            await refreshClasses();
                            showToast(`Đã xóa lớp ${cls.className}!`);
                          } catch (err: any) {
                            showToast('Lỗi khi xóa lớp: ' + (err.message || ''), 'error');
                          }
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                      title="Xóa lớp này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-amber-50/60 rounded-xl border border-amber-200">
          <div>
            <h4 className="text-xs font-bold text-slate-800">Nạp lại dữ liệu mẫu Lớp 3A1</h4>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Tạo nhanh một lớp 3A1 đầy đủ học sinh, điểm danh, kết quả học tập và nhật ký để trải nghiệm toàn bộ tính năng.
            </p>
          </div>
          <button
            type="button"
            onClick={seedDemoClass}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            Nạp dữ liệu mẫu
          </button>
        </div>
      </div>
    </div>
  );
};
