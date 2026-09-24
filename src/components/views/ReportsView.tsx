import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AIClientService } from '../../services/aiClientService';
import { ImportExportService } from '../../services/importExportService';
import {
  FileText,
  Download,
  Printer,
  Sparkles,
  Copy,
  Check,
  CheckCircle,
  FileSpreadsheet,
  Calendar,
  Users,
} from 'lucide-react';
import { format } from 'date-fns';

export const ReportsView: React.FC = () => {
  const {
    activeClass,
    students,
    parents,
    attendanceRecords,
    assessments,
    competitionEntries,
    journalEntries,
    showToast,
  } = useApp();

  const [reportType, setReportType] = useState<'week' | 'month' | 'term'>('week');
  const [reportText, setReportText] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate automated report
  const handleGenerateReport = async () => {
    if (!activeClass) return;
    setLoadingAi(true);
    try {
      // 1. Calculate deterministic attendance statistics from actual records
      const totalRecs = attendanceRecords.length;
      const presentRecs = attendanceRecords.filter((r) => r.status === 'present').length;
      const excusedRecs = attendanceRecords.filter((r) => r.status === 'excused_absence').length;
      const unexcusedRecs = attendanceRecords.filter((r) => r.status === 'unexcused_absence').length;
      const lateRecs = attendanceRecords.filter((r) => r.status === 'late').length;

      let computedAttendanceStats = '';
      if (totalRecs > 0) {
        const pct = Math.round((presentRecs / totalRecs) * 100);
        computedAttendanceStats = `Sĩ số: ${students.length} em. Tổng lượt ghi nhận: ${totalRecs} lượt (Có mặt: ${presentRecs} lượt - đạt ${pct}%, Có phép: ${excusedRecs} lượt, Không phép: ${unexcusedRecs} lượt, Muộn: ${lateRecs} lượt).`;
      } else {
        computedAttendanceStats = `Sĩ số ${students.length} em. Kỳ này chưa có bản ghi điểm danh nào trong hệ thống.`;
      }

      // 2. Calculate deterministic group competition ranking from actual entries
      const groupScores: Record<string, number> = { 'Tổ 1': 0, 'Tổ 2': 0, 'Tổ 3': 0, 'Tổ 4': 0 };
      competitionEntries.forEach((e) => {
        if (e.groupId && groupScores[e.groupId] !== undefined) {
          groupScores[e.groupId] += e.pointDelta;
        }
      });
      const sortedGroups = Object.entries(groupScores).sort((a, b) => b[1] - a[1]);
      const computedCompetitionLeaders = competitionEntries.length > 0
        ? `Điểm thi đua các tổ: ${sortedGroups.map(([g, s]) => `${g} (${s >= 0 ? '+' : ''}${s} điểm)`).join(', ')}. Tổ dẫn đầu: ${sortedGroups[0][0]}.`
        : 'Chưa có ghi nhận thi đua nào được nhập trong hệ thống.';

      const periodLabels = {
        week: 'Báo cáo sinh hoạt tuần',
        month: 'Báo cáo chủ nhiệm tháng',
        term: 'Báo cáo sơ kết học kỳ',
      };

      const res = await AIClientService.summarizeClass({
        className: `${activeClass.className} (${periodLabels[reportType]})`,
        teacherName: activeClass.teacherName,
        totalStudents: students.length,
        attendanceStats: computedAttendanceStats,
        recentJournals: journalEntries.slice(0, 10).map((j) => ({
          date: j.date,
          category: j.category,
          content: j.content,
        })),
        competitionLeaders: computedCompetitionLeaders,
      });

      setReportText(res.summaryReport);
      showToast('Đã soạn xong báo cáo công tác chủ nhiệm!');
    } catch (err: any) {
      showToast('Lỗi khi soạn báo cáo: ' + (err.message || ''), 'error');
    } finally {
      setLoadingAi(false);
    }
  };

  const handleCopyReport = () => {
    if (!reportText) return;
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast('Đã sao chép nội dung báo cáo!');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 no-print">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <span>Báo Cáo & Xuất Dữ Liệu Hồ Sơ Lớp</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Báo cáo tuần/tháng theo mẫu · Xuất file Excel chuẩn · In ấn xem trước khổ A4
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              if (activeClass) {
                ImportExportService.exportStudentsToExcel(activeClass.className, students, parents);
              }
            }}
            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Xuất Excel Hồ sơ HS</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>In Báo cáo A4</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Generator controls */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 no-print">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>AI Soạn Báo Cáo Tự Động</span>
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kỳ báo cáo
              </label>
              <select
                value={reportType}
                onChange={(e: any) => setReportType(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-medium"
              >
                <option value="week">Báo cáo sinh hoạt tuần</option>
                <option value="month">Báo cáo chủ nhiệm tháng</option>
                <option value="term">Báo cáo sơ kết học kỳ</option>
              </select>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1.5 text-slate-600">
              <div className="font-bold text-slate-800">Dữ liệu tự động tổng hợp:</div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-500">
                <li>Sĩ số hiện tại: {students.length} em</li>
                <li>Dữ liệu điểm danh & tỷ lệ chuyên cần</li>
                <li>Ghi nhận thi đua các tổ & tuyên dương</li>
                <li>Sổ nhật ký nề nếp trong kỳ</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={handleGenerateReport}
              disabled={loadingAi}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>{loadingAi ? 'AI đang tổng hợp báo cáo...' : 'Soạn báo cáo đầy đủ'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Printable Report Preview (2 spans) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 printable-area space-y-4">
          <div className="flex items-center justify-between no-print">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Bản thảo xem trước báo cáo
            </h3>

            {reportText && (
              <button
                onClick={handleCopyReport}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Đã sao chép' : 'Sao chép văn bản'}</span>
              </button>
            )}
          </div>

          {/* Printable Report Header */}
          <div className="text-center space-y-1 pb-3 border-b border-slate-200">
            <p className="text-xs uppercase font-bold text-slate-500 tracking-wider">
              {activeClass?.schoolName || 'TRƯỜNG TIỂU HỌC CHU VĂN AN'}
            </p>
            <h2 className="text-base font-black text-slate-900 uppercase">
              BÁO CÁO CÔNG TÁC CHỦ NHIỆM LỚP {activeClass?.className || '---'}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Năm học {activeClass?.schoolYear || '2025 - 2026'} · GVCN: {activeClass?.teacherName || '---'}
            </p>
          </div>

          {/* Report Body */}
          <div>
            {reportText ? (
              <div className="text-xs leading-relaxed text-slate-800 whitespace-pre-wrap font-sans p-2">
                {reportText}
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-slate-400">
                Nhấn "Soạn báo cáo đầy đủ" ở bên trái để AI tự động trích xuất số liệu và lập báo cáo hoàn chỉnh.
              </div>
            )}
          </div>

          {/* Signatures Footer */}
          <div className="pt-8 grid grid-cols-2 text-center text-xs text-slate-700">
            <div>
              <p className="font-bold">BAN GIÁM HIỆU</p>
              <p className="text-[11px] text-slate-400 mt-0.5">(Ký và ghi rõ họ tên)</p>
            </div>
            <div>
              <p className="text-slate-500">..., ngày ... tháng ... năm ...</p>
              <p className="font-bold mt-1">GIÁO VIÊN CHỦ NHIỆM</p>
              <p className="text-[11px] text-slate-400 mt-0.5">(Ký và ghi rõ họ tên)</p>
              <p className="font-bold mt-12 text-slate-900">{activeClass?.teacherName || 'Cô Mai'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
