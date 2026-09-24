import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Printer,
  Sparkles,
  Share2,
  Check,
  Palette,
  Eye,
  Calendar,
  Clock,
  Users,
  Award,
  BookOpen,
} from 'lucide-react';
import {
  ClassInfo,
  TimetablePeriod,
  DutyAssignment,
  TimetableDesignStyle,
} from '../../types';

interface TimetableDesignModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeClass: ClassInfo | null;
  periods: TimetablePeriod[];
  grid: Record<string, string>;
  days: { key: string; label: string }[];
  duties: DutyAssignment[];
  onShareZalo?: () => void;
}

const STYLES: {
  id: TimetableDesignStyle;
  name: string;
  badge: string;
  desc: string;
  icon: string;
  bgClass: string;
  borderClass: string;
  headerStyle: string;
  cellStyle: string;
  fontFamily: string;
}[] = [
  {
    id: 'cartoon_3d',
    name: 'Hoạt hình 3D Cute',
    badge: '3D Studio',
    desc: 'Đổ bóng khối 3D sinh động, màu sắc tươi vui, sticker linh vật nổi khối',
    icon: '🚀',
    bgClass: 'bg-gradient-to-br from-amber-50 via-sky-50 to-emerald-50 text-slate-800',
    borderClass: 'border-2 border-emerald-400 shadow-xl rounded-3xl',
    headerStyle: 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-md',
    cellStyle: 'rounded-xl shadow-xs transition-transform hover:scale-105',
    fontFamily: 'font-sans',
  },
  {
    id: 'chibi_pastel',
    name: 'Chibi Kawaii Pastel',
    badge: 'Dễ thương',
    desc: 'Gam màu kẹo ngọt pastel, mây hồng, thỏ con đáng yêu, nét bo tròn',
    icon: '🐰',
    bgClass: 'bg-gradient-to-br from-pink-50 via-rose-50 to-purple-50 text-slate-800',
    borderClass: 'border-3 border-pink-300 shadow-lg rounded-3xl border-dashed',
    headerStyle: 'bg-gradient-to-r from-pink-400 via-rose-400 to-purple-400 text-white',
    cellStyle: 'rounded-2xl border border-pink-200 shadow-2xs',
    fontFamily: 'font-sans',
  },
  {
    id: 'pixel_art',
    name: 'Pixel Art 16-Bit',
    badge: 'Retro Gaming',
    desc: 'Phong cách game phiêu lưu 16-bit cổ điển, đường viền pixel sắc nét, ô quest',
    icon: '👾',
    bgClass: 'bg-slate-900 text-slate-100',
    borderClass: 'border-4 border-emerald-400 shadow-2xl rounded-none ring-4 ring-slate-800',
    headerStyle: 'bg-emerald-600 text-white border-b-4 border-emerald-800',
    cellStyle: 'rounded-none border-2 border-slate-700 bg-slate-800 text-emerald-300 font-mono',
    fontFamily: 'font-mono',
  },
  {
    id: 'chalkboard',
    name: 'Bảng Đen Phấn Trắng',
    badge: 'Sư phạm Vintage',
    desc: 'Nền bảng xanh trường học, nét chữ phấn trắng ngà, thước kẻ ê-ke vẽ tay',
    icon: '📐',
    bgClass: 'bg-gradient-to-b from-slate-900 via-emerald-950 to-slate-900 text-emerald-50',
    borderClass: 'border-4 border-amber-800 shadow-2xl rounded-xl',
    headerStyle: 'bg-emerald-900/90 text-amber-200 border-b-2 border-emerald-700/60',
    cellStyle: 'rounded-lg border border-emerald-800/80 bg-emerald-950/60 text-slate-100',
    fontFamily: 'font-serif',
  },
  {
    id: 'watercolor',
    name: 'Màu Nước Thảo Mộc',
    badge: 'Botanical',
    desc: 'Họa tiết lá xanh thiên nhiên mộc mạc, loang màu nước thanh nhã, thư thái',
    icon: '🌿',
    bgClass: 'bg-gradient-to-br from-emerald-50/70 via-teal-50/50 to-amber-50/60 text-slate-800',
    borderClass: 'border-2 border-teal-200 shadow-lg rounded-2xl',
    headerStyle: 'bg-teal-700 text-white shadow-xs',
    cellStyle: 'rounded-xl border border-teal-100/80 bg-white/90 text-teal-950',
    fontFamily: 'font-sans',
  },
];

const THEME_COLORS = [
  { id: 'emerald', name: 'Xanh Ngọc', hex: '#059669', bg: 'bg-emerald-600', ring: 'ring-emerald-500' },
  { id: 'sky', name: 'Xanh Trời', hex: '#0284c7', bg: 'bg-sky-600', ring: 'ring-sky-500' },
  { id: 'rose', name: 'Hồng Đào', hex: '#e11d48', bg: 'bg-rose-500', ring: 'ring-rose-400' },
  { id: 'amber', name: 'Vàng Nắng', hex: '#d97706', bg: 'bg-amber-500', ring: 'ring-amber-400' },
  { id: 'purple', name: 'Tím Mộng', hex: '#7c3aed', bg: 'bg-purple-600', ring: 'ring-purple-400' },
];

export const TimetableDesignModal: React.FC<TimetableDesignModalProps> = ({
  isOpen,
  onClose,
  activeClass,
  periods,
  grid,
  days,
  duties,
  onShareZalo,
}) => {
  const [selectedStyle, setSelectedStyle] = useState<TimetableDesignStyle>('cartoon_3d');
  const [themeColor, setThemeColor] = useState('emerald');
  const [showTime, setShowTime] = useState(true);
  const [showDuty, setShowDuty] = useState(true);
  const [showMotto, setShowMotto] = useState(true);
  const [mottoText, setMottoText] = useState('Mỗi ngày đến trường là một ngày vui · Lớp học thân thiện');
  const [downloading, setDownloading] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const currentStyleConfig = STYLES.find((s) => s.id === selectedStyle) || STYLES[0];

  // Helper color tags for subjects based on current style
  const getSubjectBadgeStyle = (subject: string) => {
    if (!subject || subject === 'Nghỉ') {
      return selectedStyle === 'pixel_art'
        ? 'bg-slate-800 text-slate-500 border border-slate-700'
        : selectedStyle === 'chalkboard'
        ? 'bg-slate-900/60 text-slate-500 border border-emerald-900/40'
        : 'bg-slate-100 text-slate-400 border border-slate-200';
    }

    if (subject === 'Chào cờ') {
      return selectedStyle === 'pixel_art'
        ? 'bg-red-950 text-red-300 border border-red-700 font-bold'
        : selectedStyle === 'chalkboard'
        ? 'bg-red-900/50 text-amber-200 border border-red-500/50 font-bold'
        : 'bg-red-50 text-red-700 border border-red-200 font-bold';
    }

    if (subject === 'Sinh hoạt lớp') {
      return selectedStyle === 'pixel_art'
        ? 'bg-amber-950 text-amber-300 border border-amber-600 font-bold'
        : selectedStyle === 'chalkboard'
        ? 'bg-amber-900/50 text-amber-100 border border-amber-500/50 font-bold'
        : 'bg-amber-50 text-amber-800 border border-amber-200 font-bold';
    }

    if (subject.includes('Toán')) {
      return selectedStyle === 'pixel_art'
        ? 'bg-blue-950 text-blue-300 border border-blue-700'
        : selectedStyle === 'chalkboard'
        ? 'bg-cyan-950/70 text-cyan-200 border border-cyan-800/60'
        : 'bg-blue-50 text-blue-700 border border-blue-200';
    }

    if (subject.includes('Tiếng Việt')) {
      return selectedStyle === 'pixel_art'
        ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
        : selectedStyle === 'chalkboard'
        ? 'bg-emerald-900/50 text-emerald-200 border border-emerald-700/60'
        : 'bg-emerald-50 text-emerald-800 border border-emerald-200';
    }

    if (subject.includes('Tiếng Anh')) {
      return selectedStyle === 'pixel_art'
        ? 'bg-purple-950 text-purple-300 border border-purple-700'
        : selectedStyle === 'chalkboard'
        ? 'bg-purple-950/70 text-purple-200 border border-purple-800/60'
        : 'bg-purple-50 text-purple-700 border border-purple-200';
    }

    // Default badge
    return selectedStyle === 'pixel_art'
      ? 'bg-slate-800 text-slate-200 border border-slate-600'
      : selectedStyle === 'chalkboard'
      ? 'bg-emerald-900/40 text-slate-100 border border-emerald-800/50'
      : 'bg-slate-50 text-slate-800 border border-slate-200';
  };

  // Canvas-based PNG export for crisp offline download
  const handleDownloadPNG = async () => {
    setDownloading(true);
    try {
      // Use modern Canvas 2D painting to create high-resolution poster
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = 1600;
      const height = 1100;
      canvas.width = width;
      canvas.height = height;

      // Draw background
      if (selectedStyle === 'pixel_art') {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, height);
        // Grid pattern
        ctx.fillStyle = '#1e293b';
        for (let x = 0; x < width; x += 32) {
          for (let y = 0; y < height; y += 32) {
            if ((x + y) % 64 === 0) ctx.fillRect(x, y, 4, 4);
          }
        }
      } else if (selectedStyle === 'chalkboard') {
        ctx.fillStyle = '#06261c';
        ctx.fillRect(0, 0, width, height);
        // Wood frame border
        ctx.lineWidth = 16;
        ctx.strokeStyle = '#78350f';
        ctx.strokeRect(8, 8, width - 16, height - 16);
      } else if (selectedStyle === 'chibi_pastel') {
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, '#fdf2f8');
        grad.addColorStop(0.5, '#fff1f2');
        grad.addColorStop(1, '#f5f3ff');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      } else if (selectedStyle === 'watercolor') {
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, '#ecfdf5');
        grad.addColorStop(0.5, '#f0fdfa');
        grad.addColorStop(1, '#fefce8');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      } else {
        // 3D Cartoon
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, '#f0fdf4');
        grad.addColorStop(0.5, '#f0f9ff');
        grad.addColorStop(1, '#fef3c7');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }

      // Title & School Banner
      ctx.textAlign = 'center';
      ctx.fillStyle = selectedStyle === 'pixel_art' ? '#34d399' : selectedStyle === 'chalkboard' ? '#fef08a' : '#047857';
      ctx.font = selectedStyle === 'pixel_art' ? 'bold 36px monospace' : 'bold 42px sans-serif';
      ctx.fillText(`THỜI KHÓA BIỂU LỚP ${activeClass?.className || '3A1'}`, width / 2, 70);

      ctx.fillStyle = selectedStyle === 'pixel_art' ? '#94a3b8' : selectedStyle === 'chalkboard' ? '#cbd5e1' : '#64748b';
      ctx.font = '22px sans-serif';
      ctx.fillText(
        `${activeClass?.schoolName || 'Trường Tiểu học'} · Năm học ${activeClass?.schoolYear || '2025 - 2026'} · GVCN: ${
          activeClass?.teacherName || 'Cô Giáo'
        }`,
        width / 2,
        110
      );

      // Motto banner
      if (showMotto && mottoText) {
        ctx.fillStyle = selectedStyle === 'pixel_art' ? '#fbbf24' : '#d97706';
        ctx.font = 'italic bold 20px sans-serif';
        ctx.fillText(`⭐ "${mottoText}" ⭐`, width / 2, 145);
      }

      // Table layout calculations
      const startX = 60;
      const startY = 175;
      const tableW = width - 120;
      const colW = (tableW - 120) / days.length;
      const rowH = 65;

      // Header row
      ctx.fillStyle = selectedStyle === 'pixel_art' ? '#047857' : selectedStyle === 'chalkboard' ? '#064e3b' : '#059669';
      ctx.fillRect(startX, startY, tableW, 45);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('Tiết / Giờ', startX + 60, startY + 28);

      days.forEach((d, i) => {
        ctx.fillText(d.label, startX + 120 + i * colW + colW / 2, startY + 28);
      });

      // Rows
      periods.forEach((p, rIdx) => {
        const y = startY + 45 + rIdx * rowH;
        // Background row alternating
        ctx.fillStyle = rIdx % 2 === 0
          ? (selectedStyle === 'pixel_art' ? '#1e293b' : selectedStyle === 'chalkboard' ? 'rgba(6, 78, 59, 0.2)' : 'rgba(255, 255, 255, 0.8)')
          : (selectedStyle === 'pixel_art' ? '#0f172a' : selectedStyle === 'chalkboard' ? 'rgba(6, 78, 59, 0.05)' : 'rgba(248, 250, 252, 0.6)');
        ctx.fillRect(startX, y, tableW, rowH);

        // Period & Time label
        ctx.textAlign = 'center';
        ctx.fillStyle = selectedStyle === 'pixel_art' ? '#38bdf8' : selectedStyle === 'chalkboard' ? '#fef08a' : '#1e293b';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(`Tiết ${p.period}`, startX + 60, y + 26);

        if (showTime && p.time) {
          ctx.fillStyle = selectedStyle === 'pixel_art' ? '#94a3b8' : selectedStyle === 'chalkboard' ? '#94a3b8' : '#64748b';
          ctx.font = '13px sans-serif';
          ctx.fillText(p.time, startX + 60, y + 48);
        }

        // Days cells
        days.forEach((d, cIdx) => {
          const sub = grid[`${d.key}_${p.period}`] || 'Nghỉ';
          const cellX = startX + 120 + cIdx * colW + 6;
          const cellY = y + 8;
          const cellWidth = colW - 12;
          const cellHeight = rowH - 16;

          // Cell background
          ctx.fillStyle = sub === 'Chào cờ'
            ? 'rgba(239, 68, 68, 0.2)'
            : sub === 'Sinh hoạt lớp'
            ? 'rgba(245, 158, 11, 0.2)'
            : sub === 'Toán'
            ? 'rgba(59, 130, 246, 0.15)'
            : sub === 'Tiếng Việt'
            ? 'rgba(16, 185, 129, 0.15)'
            : 'rgba(255, 255, 255, 0.5)';

          ctx.fillRect(cellX, cellY, cellWidth, cellHeight);
          ctx.strokeStyle = selectedStyle === 'pixel_art' ? '#334155' : 'rgba(203, 213, 225, 0.6)';
          ctx.strokeRect(cellX, cellY, cellWidth, cellHeight);

          // Subject text
          ctx.textAlign = 'center';
          ctx.fillStyle = selectedStyle === 'pixel_art'
            ? (sub === 'Chào cờ' ? '#fca5a5' : sub === 'Sinh hoạt lớp' ? '#fde047' : '#e2e8f0')
            : selectedStyle === 'chalkboard'
            ? (sub === 'Chào cờ' ? '#fca5a5' : sub === 'Sinh hoạt lớp' ? '#fde047' : '#f8fafc')
            : '#0f172a';
          ctx.font = 'bold 16px sans-serif';
          ctx.fillText(sub, cellX + cellWidth / 2, cellY + cellHeight / 2 + 5);
        });
      });

      // Duty Footer
      if (showDuty && duties.length > 0) {
        const dutyY = startY + 45 + periods.length * rowH + 20;
        ctx.fillStyle = selectedStyle === 'pixel_art' ? '#1e293b' : 'rgba(255, 255, 255, 0.85)';
        ctx.fillRect(startX, dutyY, tableW, 60);
        ctx.strokeStyle = selectedStyle === 'pixel_art' ? '#38bdf8' : '#059669';
        ctx.strokeRect(startX, dutyY, tableW, 60);

        ctx.textAlign = 'left';
        ctx.fillStyle = selectedStyle === 'pixel_art' ? '#38bdf8' : '#047857';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('🧹 LỊCH TRỰC NHẬT TUẦN:', startX + 20, dutyY + 36);

        const dutySummary = duties
          .slice(0, 5)
          .map((d) => `${d.day}: ${d.assignedGroup || 'Tổ trực'}`)
          .join('   |   ');
        ctx.fillStyle = selectedStyle === 'pixel_art' ? '#cbd5e1' : '#334155';
        ctx.font = '14px sans-serif';
        ctx.fillText(dutySummary, startX + 260, dutyY + 36);
      }

      // Convert to blob and download
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `ThoiKhoaBieu_${activeClass?.className || 'Lop'}_${selectedStyle}.png`;
      a.click();
    } catch (e) {
      console.error('Error generating canvas PNG:', e);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* Modal Top Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shadow-inner">
              🎨
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  Studio Thiết Kế Thời Khóa Biểu Nghệ Thuật
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-white/25 text-white text-[11px] font-bold">
                  AI & Art Styles
                </span>
              </div>
              <p className="text-xs text-emerald-100 font-medium">
                Tạo poster lịch học lớp {activeClass?.className} chuẩn phong cách 3D, Chibi, Pixel, Bảng phấn để in A4 hoặc gửi phụ huynh
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Split Controls & Live Preview */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
          {/* Left Controls Toolbar (4 cols) */}
          <div className="lg:col-span-4 p-5 space-y-5 bg-slate-50/70 overflow-y-auto">
            {/* 1. Style Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-emerald-600" />
                <span>1. Chọn Phong cách Nghệ thuật</span>
              </label>

              <div className="grid grid-cols-1 gap-2">
                {STYLES.map((st) => {
                  const isSelected = selectedStyle === st.id;
                  return (
                    <button
                      key={st.id}
                      onClick={() => setSelectedStyle(st.id)}
                      className={`w-full text-left p-3 rounded-2xl transition-all border flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-500 shadow-xs ring-2 ring-emerald-500/20'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl shrink-0">{st.icon}</span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-800">{st.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-slate-100 text-slate-600">
                              {st.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{st.desc}</p>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Theme Colors */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                2. Gam màu chủ đạo
              </label>
              <div className="flex items-center gap-2">
                {THEME_COLORS.map((tc) => (
                  <button
                    key={tc.id}
                    onClick={() => setThemeColor(tc.id)}
                    className={`w-8 h-8 rounded-full ${tc.bg} transition-all cursor-pointer flex items-center justify-center text-white ${
                      themeColor === tc.id ? 'ring-3 ring-offset-2 ' + tc.ring : 'opacity-80 hover:opacity-100'
                    }`}
                    title={tc.name}
                  >
                    {themeColor === tc.id && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Display Options */}
            <div className="space-y-2.5 bg-white p-3.5 rounded-2xl border border-slate-200">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                3. Tùy chọn hiển thị
              </label>

              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showTime}
                    onChange={(e) => setShowTime(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="text-slate-700 font-medium">Hiện khung giờ từng tiết (07:30 - 08:05)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showDuty}
                    onChange={(e) => setShowDuty(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="text-slate-700 font-medium">Hiện phân công trực nhật các Tổ ở chân trang</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showMotto}
                    onChange={(e) => setShowMotto(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="text-slate-700 font-medium">Hiện khẩu hiệu / Lời chúc lớp</span>
                </label>
              </div>

              {showMotto && (
                <div className="pt-2">
                  <input
                    type="text"
                    value={mottoText}
                    onChange={(e) => setMottoText(e.target.value)}
                    placeholder="Khẩu hiệu lớp..."
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}
            </div>

            {/* 4. Action Export Buttons */}
            <div className="pt-2 space-y-2">
              <button
                onClick={handleDownloadPNG}
                disabled={downloading}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <Download className="w-4 h-4" />
                <span>{downloading ? 'Đang xuất ảnh PNG...' : 'Tải Poster Thời Khóa Biểu (PNG HD)'}</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => window.print()}
                  className="py-2.5 px-3 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span>In bản A4</span>
                </button>

                {onShareZalo && (
                  <button
                    onClick={onShareZalo}
                    className="py-2.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Gửi Zalo PH</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Live Preview Canvas (8 cols) */}
          <div className="lg:col-span-8 p-4 sm:p-6 bg-slate-100/80 flex flex-col items-center justify-center overflow-x-auto">
            <div className="w-full max-w-4xl text-center mb-2 flex items-center justify-between px-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                <span>Bản xem trước trực tiếp (Live Preview)</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {currentStyleConfig.name} · {activeClass?.className || 'Lớp'}
              </span>
            </div>

            {/* Poster Card Container */}
            <div
              ref={previewRef}
              className={`w-full max-w-3xl p-5 sm:p-7 transition-all ${currentStyleConfig.bgClass} ${currentStyleConfig.borderClass} ${currentStyleConfig.fontFamily}`}
            >
              {/* Poster Header */}
              <div className="text-center space-y-1 mb-5 relative">
                {/* Style Mascot Stickers */}
                <div className="absolute top-0 left-0 text-3xl opacity-90 hidden sm:block">
                  {selectedStyle === 'cartoon_3d' && '🎒'}
                  {selectedStyle === 'chibi_pastel' && '🐰'}
                  {selectedStyle === 'pixel_art' && '👾'}
                  {selectedStyle === 'chalkboard' && '📐'}
                  {selectedStyle === 'watercolor' && '🌿'}
                </div>
                <div className="absolute top-0 right-0 text-3xl opacity-90 hidden sm:block">
                  {selectedStyle === 'cartoon_3d' && '🚀'}
                  {selectedStyle === 'chibi_pastel' && '🌸'}
                  {selectedStyle === 'pixel_art' && '💎'}
                  {selectedStyle === 'chalkboard' && '🔔'}
                  {selectedStyle === 'watercolor' && '🌻'}
                </div>

                <div className="inline-block px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-emerald-100/80 text-emerald-900 border border-emerald-200">
                  {activeClass?.schoolName || 'Trường Tiểu học'} · Năm học {activeClass?.schoolYear || '2025 - 2026'}
                </div>

                <h1 className="text-xl sm:text-2xl font-black tracking-tight mt-1">
                  THỜI KHÓA BIỂU LỚP {activeClass?.className?.toUpperCase() || '3A1'}
                </h1>

                <p className="text-xs opacity-75">
                  Giáo viên chủ nhiệm: <strong>{activeClass?.teacherName || 'Cô Nguyễn Thị Mai'}</strong>
                </p>

                {showMotto && (
                  <p className="text-xs font-semibold italic text-amber-600 mt-1">
                    "{mottoText}"
                  </p>
                )}
              </div>

              {/* Poster Timetable Grid */}
              <div className="overflow-x-auto rounded-2xl shadow-xs border border-slate-200/50 bg-white/70 backdrop-blur-xs">
                <table className="w-full text-center text-xs border-collapse">
                  <thead>
                    <tr className={currentStyleConfig.headerStyle}>
                      <th className="py-2.5 px-2 w-24 border-r border-white/20 font-bold">Tiết / Giờ</th>
                      {days.map((d) => (
                        <th key={d.key} className="py-2.5 px-2 border-r border-white/20 font-bold min-w-[90px]">
                          {d.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60">
                    {periods.map((p) => (
                      <tr key={p.period} className="hover:bg-white/40">
                        <td className="py-2 px-2 border-r border-slate-200/60 bg-white/50">
                          <div className="font-bold text-slate-800">Tiết {p.period}</div>
                          {showTime && p.time && (
                            <div className="text-[10px] text-slate-500 font-mono">{p.time}</div>
                          )}
                        </td>
                        {days.map((d) => {
                          const sub = grid[`${d.key}_${p.period}`] || 'Nghỉ';
                          return (
                            <td key={d.key} className="p-1.5 border-r border-slate-200/60">
                              <div
                                className={`py-1.5 px-1 text-center font-bold text-xs ${currentStyleConfig.cellStyle} ${getSubjectBadgeStyle(
                                  sub
                                )}`}
                              >
                                {sub}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Poster Footer: Duty Schedule */}
              {showDuty && duties.length > 0 && (
                <div className="mt-4 p-3 rounded-2xl bg-white/80 border border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-800 shrink-0">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span>Trực nhật trong tuần:</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {duties.slice(0, 5).map((d) => (
                      <span
                        key={d.id}
                        className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100 text-[11px] font-semibold"
                      >
                        {d.day}: {d.assignedGroup || 'Tổ trực'}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
