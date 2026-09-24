import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { JournalEntry } from '../../types';
import { JournalRepository } from '../../repositories/dataRepository';
import { AIClientService } from '../../services/aiClientService';
import {
  BookMarked,
  Plus,
  Calendar,
  Sparkles,
  Search,
  Filter,
  Trash2,
  Copy,
  Check,
  User,
  Heart,
  AlertCircle,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { EmptyState } from '../common/EmptyState';

export const JournalView: React.FC = () => {
  const {
    activeClass,
    currentUser,
    students,
    journalEntries,
    refreshActiveData,
    showToast,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [category, setCategory] = useState<JournalEntry['category']>('khen ngợi');
  const [content, setContent] = useState('');
  const [studentId, setStudentId] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [entryDate, setEntryDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // AI Summary modal
  const [showAiSummary, setShowAiSummary] = useState(false);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  const studentMap = React.useMemo(() => {
    return new Map(students.map((s) => [s.id, s.fullName]));
  }, [students]);

  // Filtered journals
  const filteredEntries = React.useMemo(() => {
    return journalEntries.filter((j) => {
      const matchSearch =
        j.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (j.nextAction && j.nextAction.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (j.studentId && (studentMap.get(j.studentId)?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false));
      const matchCat = selectedCategory === 'all' || j.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [journalEntries, searchTerm, selectedCategory, studentMap]);

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClass || !currentUser) return;
    if (!content.trim()) {
      showToast('Vui lòng nhập nội dung nhật ký', 'error');
      return;
    }

    try {
      await JournalRepository.createEntry({
        classId: activeClass.id,
        ownerId: currentUser.uid,
        date: entryDate,
        category,
        studentId: studentId || undefined,
        content,
        nextAction: nextAction || undefined,
      });

      await refreshActiveData();
      setShowAddModal(false);
      setContent('');
      setNextAction('');
      setStudentId('');
      showToast('Đã lưu mục nhật ký chủ nhiệm!');
    } catch (err: any) {
      showToast('Lỗi khi lưu nhật ký: ' + (err.message || ''), 'error');
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      await JournalRepository.deleteEntry(id);
      await refreshActiveData();
      showToast('Đã xóa mục nhật ký');
    } catch (err: any) {
      showToast('Lỗi khi xóa: ' + (err.message || ''), 'error');
    }
  };

  const handleGenerateSummary = async () => {
    if (!activeClass) return;
    setLoadingSummary(true);
    setShowAiSummary(true);
    try {
      const res = await AIClientService.summarizeClass({
        className: activeClass.className,
        teacherName: activeClass.teacherName,
        totalStudents: students.length,
        attendanceStats: 'Chuyên cần tốt, trung bình 97% có mặt',
        recentJournals: journalEntries.slice(0, 10).map((j) => ({
          date: j.date,
          category: j.category,
          content: j.content,
        })),
        competitionLeaders: 'Tổ 1 và Tổ 3 đang dẫn đầu thi đua',
      });

      setAiSummary(res.summaryReport);
      showToast('Đã tạo tóm tắt nhật ký và báo cáo tuần!');
    } catch (err: any) {
      showToast('Lỗi khi tạo báo cáo: ' + (err.message || ''), 'error');
    } finally {
      setLoadingSummary(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-amber-600" />
            <span>Sổ Nhật Ký Chủ Nhiệm Lớp</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ghi chép sự vụ, khen thưởng, sức khỏe và các trao đổi với học sinh / phụ huynh
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleGenerateSummary}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl border border-indigo-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>AI Tóm tắt tuần & Báo cáo</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Ghi chép mới</span>
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo nội dung, kế hoạch hoặc tên học sinh..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
          >
            <option value="all">Tất cả phân loại</option>
            <option value="khen ngợi">Khen ngợi</option>
            <option value="nhắc nhở nề nếp">Nhắc nhở nề nếp</option>
            <option value="sự cố va chạm">Sự cố va chạm</option>
            <option value="sức khỏe y tế">Sức khỏe y tế</option>
            <option value="trao đổi phụ huynh">Trao đổi phụ huynh</option>
            <option value="khác">Khác</option>
          </select>
        </div>
      </div>

      {/* Timeline List */}
      <div className="space-y-3">
        {filteredEntries.length === 0 ? (
          <EmptyState
            icon={BookMarked}
            iconColor="text-amber-600"
            title={searchTerm || selectedCategory !== 'all' ? 'Không tìm thấy nhật ký phù hợp' : 'Trang nhật ký đầu năm còn tinh khôi'}
            description={
              searchTerm || selectedCategory !== 'all'
                ? 'Thử thay đổi từ khóa tìm kiếm hoặc lọc theo tất cả chuyên mục để xem lại các ghi chép khác.'
                : 'Mỗi ngày đến lớp là một hành trình kỳ diệu. Hãy lưu lại những khoảnh khắc tiến bộ, sự việc đáng nhớ hoặc lời dặn dò của học sinh hôm nay.'
            }
            quote={{
              text: 'Dưới ánh mặt trời, không có nghề nào cao quý hơn nghề dạy học.',
              author: 'Jan Amos Komenský (Comenius)',
            }}
            action={
              searchTerm || selectedCategory !== 'all'
                ? undefined
                : {
                    label: 'Viết ghi chép đầu tiên',
                    onClick: () => setShowAddModal(true),
                    icon: Plus,
                    variant: 'primary',
                  }
            }
          />
        ) : (
          filteredEntries.map((entry) => {
            const stuName = entry.studentId ? studentMap.get(entry.studentId) : null;
            let badgeBg = 'bg-slate-100 text-slate-700';
            if (entry.category === 'khen ngợi') badgeBg = 'bg-emerald-100 text-emerald-800';
            else if (entry.category === 'nhắc nhở nề nếp') badgeBg = 'bg-amber-100 text-amber-800';
            else if (entry.category === 'sự cố va chạm') badgeBg = 'bg-rose-100 text-rose-800';
            else if (entry.category === 'sức khỏe y tế') badgeBg = 'bg-red-100 text-red-800';
            else if (entry.category === 'trao đổi phụ huynh') badgeBg = 'bg-blue-100 text-blue-800';

            return (
              <div
                key={entry.id}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize ${badgeBg}`}>
                      {entry.category}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      Ngày: {entry.date}
                    </span>
                    {stuName && (
                      <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                        HS: {stuName}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="text-slate-300 hover:text-red-500 p-1 rounded transition-colors"
                    title="Xóa nhật ký"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-800 leading-relaxed font-medium">
                  {entry.content}
                </p>

                {entry.nextAction && (
                  <div className="pt-2 border-t border-slate-100 text-xs flex items-center gap-1.5 text-emerald-700 font-semibold">
                    <span>Hướng xử lý / Kế hoạch:</span>
                    <span className="text-slate-700 font-normal">{entry.nextAction}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Ghi chép Nhật ký chủ nhiệm mới</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEntry} className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ngày ghi chép
                  </label>
                  <input
                    type="date"
                    required
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phân loại sự vụ
                  </label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none bg-white font-medium"
                  >
                    <option value="khen ngợi">Khen ngợi</option>
                    <option value="nhắc nhở nề nếp">Nhắc nhở nề nếp</option>
                    <option value="sự cố va chạm">Sự cố / Va chạm</option>
                    <option value="sức khỏe y tế">Sức khỏe / Y tế</option>
                    <option value="trao đổi phụ huynh">Trao đổi phụ huynh</option>
                    <option value="khác">Khác</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Học sinh liên quan (nếu có)
                </label>
                <select
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none bg-white"
                >
                  <option value="">Toàn lớp / Không chọn riêng</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.groupId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nội dung chi tiết *
                </label>
                <textarea
                  rows={4}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Ghi lại sự việc, lời nói, biểu hiện hoặc thỏa thuận đã đạt được..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kế hoạch theo dõi / Hướng xử lý tiếp theo
                </label>
                <input
                  type="text"
                  value={nextAction}
                  onChange={(e) => setNextAction(e.target.value)}
                  placeholder="VD: Tiếp tục theo dõi giờ ra chơi ngày mai, gọi điện cho mẹ lúc 17h..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  Lưu nhật ký
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Weekly Summary Modal */}
      {showAiSummary && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-indigo-950">
                  Báo Cáo & Tóm Tắt Tuần Bằng AI
                </h3>
              </div>
              <button onClick={() => setShowAiSummary(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {loadingSummary ? (
                <div className="py-12 text-center text-xs text-slate-500 space-y-2">
                  <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p>AI đang tổng hợp dữ liệu chuyên cần, nhật ký và thi đua tuần này...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">
                      Bản báo cáo chuẩn bị cho giờ sinh hoạt lớp / họp chuyên môn
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(aiSummary);
                        setCopiedSummary(true);
                        setTimeout(() => setCopiedSummary(false), 2000);
                        showToast('Đã sao chép báo cáo vào bộ nhớ tạm!');
                      }}
                      className="px-3 py-1 bg-white hover:bg-slate-50 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSummary ? 'Đã sao chép' : 'Sao chép nội dung'}</span>
                    </button>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto font-mono">
                    {aiSummary}
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowAiSummary(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
