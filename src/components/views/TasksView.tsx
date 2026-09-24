import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Task, TaskCompletion } from '../../types';
import { TaskRepository } from '../../repositories/dataRepository';
import { AIClientService } from '../../services/aiClientService';
import {
  ListTodo,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  MessageCircle,
  Copy,
  Trash2,
  BookOpen,
  Users,
  Sparkles,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { EmptyState } from '../common/EmptyState';

export const TasksView: React.FC = () => {
  const {
    activeClass,
    currentUser,
    students,
    tasks,
    taskCompletions,
    refreshActiveData,
    showToast,
  } = useApp();

  const [selectedTaskId, setSelectedTaskId] = useState<string>(tasks[0]?.id || '');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create form state
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Toán');
  const [description, setDescription] = useState('');
  const [dueAt, setDueAt] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [targetGroup, setTargetGroup] = useState('all');

  // AI draft message state
  const [aiDraftMessage, setAiDraftMessage] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Sync selected task
  React.useEffect(() => {
    if (!selectedTaskId && tasks.length > 0) {
      setSelectedTaskId(tasks[0].id);
    }
  }, [tasks, selectedTaskId]);

  const activeTask = tasks.find((t) => t.id === selectedTaskId);

  // Filter students targeted by active task
  const targetedStudents = React.useMemo(() => {
    if (!activeTask) return [];
    if (!activeTask.targetGroup || activeTask.targetGroup === 'all') return students;
    return students.filter((s) => s.groupId === activeTask.targetGroup);
  }, [activeTask, students]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClass || !currentUser) return;
    if (!title.trim()) {
      showToast('Vui lòng nhập tiêu đề nhiệm vụ', 'error');
      return;
    }

    try {
      const newTask = await TaskRepository.createTask({
        classId: activeClass.id,
        ownerId: currentUser.uid,
        title,
        subject,
        description,
        dueAt,
        targetGroup: targetGroup === 'all' ? undefined : targetGroup,
      });

      await refreshActiveData();
      setSelectedTaskId(newTask.id);
      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      showToast('Đã tạo nhiệm vụ mới thành công!');
    } catch (err: any) {
      showToast('Lỗi khi tạo nhiệm vụ: ' + (err.message || ''), 'error');
    }
  };

  const handleToggleStudentCompletion = async (studentId: string, currentCompleted: boolean) => {
    if (!activeTask || !activeClass || !currentUser) return;
    try {
      await TaskRepository.toggleCompletion(
        activeClass.id,
        currentUser.uid,
        activeTask.id,
        studentId,
        !currentCompleted
      );
      await refreshActiveData();
    } catch (err: any) {
      showToast('Lỗi khi cập nhật bài nộp: ' + (err.message || ''), 'error');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await TaskRepository.deleteTask(taskId);
      await refreshActiveData();
      showToast('Đã xóa nhiệm vụ');
      if (selectedTaskId === taskId && tasks.length > 1) {
        setSelectedTaskId(tasks.find((t) => t.id !== taskId)?.id || '');
      }
    } catch (err: any) {
      showToast('Lỗi khi xóa nhiệm vụ: ' + (err.message || ''), 'error');
    }
  };

  // Generate AI Reminder message for parents
  const handleGenerateAIMessage = async () => {
    if (!activeTask || !activeClass) return;
    setLoadingAi(true);
    try {
      const res = await AIClientService.generateParentMessage({
        topic: 'Nhắc nhở bài tập / nhiệm vụ về nhà',
        teacherName: activeClass.teacherName,
        className: activeClass.className,
        details: `Nhiệm vụ: ${activeTask.title}. Môn: ${activeTask.subject || 'Tổng hợp'}. Hạn nộp: ${activeTask.dueAt}. Hướng dẫn: ${activeTask.description || 'Hoàn thành đầy đủ theo yêu cầu.'}`,
        tone: 'cổ vũ, thân thiện',
      });
      setAiDraftMessage(res.message);
      showToast('Đã soạn xong tin nhắn Zalo gửi phụ huynh!');
    } catch (err: any) {
      showToast('Không thể soạn tin nhắn: ' + (err.message || ''), 'error');
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-indigo-600" />
            <span>Giao Nhiệm Vụ & Bài Tập Về Nhà</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý bài nộp học sinh · Soạn nhanh tin nhắc phụ huynh qua Zalo bằng AI
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Giao nhiệm vụ mới</span>
        </button>
      </div>

      {/* Main Grid: Task list (Left) + Detail Checklist (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Task List */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
            <span>Danh sách nhiệm vụ ({tasks.length})</span>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {tasks.length === 0 ? (
              <EmptyState
                icon={ListTodo}
                iconColor="text-indigo-600"
                title="Chưa có bài tập nào"
                description="Bấm 'Giao nhiệm vụ mới' để tạo bài tập về nhà."
                action={{
                  label: 'Tạo bài tập',
                  onClick: () => setShowCreateModal(true),
                  icon: Plus,
                  variant: 'indigo',
                }}
                className="py-6 px-4"
              />
            ) : (
              tasks.map((task) => {
                const completions = taskCompletions.filter((c) => c.taskId === task.id && c.completed);
                const total = students.length || 1;
                const pct = Math.round((completions.length / total) * 100);
                const isSelected = selectedTaskId === task.id;

                return (
                  <div
                    key={task.id}
                    onClick={() => {
                      setSelectedTaskId(task.id);
                      setAiDraftMessage(null);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-400/20'
                        : 'bg-slate-50/60 border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                        {task.title}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTask(task.id);
                        }}
                        className="text-slate-300 hover:text-red-500 p-0.5 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                      <span>{task.subject || 'Tổng hợp'}</span>
                      <span className="font-semibold text-slate-700">Hạn: {task.dueAt}</span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Tiến độ: {completions.length}/{total} em</span>
                      <span className="font-bold text-indigo-700">{pct}%</span>
                    </div>

                    <div className="w-full h-1.5 bg-slate-200 rounded-full mt-1 overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full bg-indigo-600 rounded-full transition-all"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Task Detail & Student Checklist (2 spans) */}
        <div className="md:col-span-2 space-y-5">
          {activeTask ? (
            <div className="space-y-5">
              {/* Task Detail Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                      Môn: {activeTask.subject || 'Chủ nhiệm'}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{activeTask.title}</h3>
                    <p className="text-xs text-slate-600 mt-1">{activeTask.description || 'Không có hướng dẫn thêm.'}</p>
                  </div>

                  <div className="flex items-center gap-2 self-start">
                    <button
                      onClick={handleGenerateAIMessage}
                      disabled={loadingAi}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl border border-indigo-200 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{loadingAi ? 'Đang soạn tin...' : 'AI Soạn tin Zalo'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>Hạn nộp: <strong className="text-slate-800">{activeTask.dueAt}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span>Đối tượng: <strong className="text-slate-800">{activeTask.targetGroup || 'Toàn lớp'}</strong></span>
                  </div>
                </div>

                {/* AI Draft Zalo message view */}
                {aiDraftMessage && (
                  <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-900 flex items-center gap-1">
                        <MessageCircle className="w-3.5 h-3.5 text-indigo-600" />
                        Tin nhắn Zalo gợi ý gửi phụ huynh
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(aiDraftMessage);
                          showToast('Đã chép nội dung tin nhắn Zalo!');
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 text-indigo-700 text-[11px] font-semibold rounded-lg border border-indigo-200 flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Sao chép tin</span>
                      </button>
                    </div>
                    <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed bg-white p-3 rounded-lg border border-indigo-100">
                      {aiDraftMessage}
                    </p>
                  </div>
                )}
              </div>

              {/* Student Checklist Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">
                    Kiểm tra bài nộp học sinh ({targetedStudents.length} em)
                  </span>
                  <span className="text-slate-500">Chạm để đổi trạng thái hoàn thành</span>
                </div>

                <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                  {targetedStudents.map((student, idx) => {
                    const comp = taskCompletions.find((c) => c.taskId === activeTask.id && c.studentId === student.id);
                    const isDone = comp?.completed || false;

                    return (
                      <div
                        key={student.id}
                        onClick={() => handleToggleStudentCompletion(student.id, isDone)}
                        className={`p-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer ${
                          isDone ? 'bg-emerald-50/20' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-400 w-6 text-center font-medium">
                            {idx + 1}
                          </span>
                          <div>
                            <span className="text-xs font-bold text-slate-900">{student.fullName}</span>
                            <span className="text-slate-400 text-[11px] ml-2">({student.groupId})</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                              isDone
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{isDone ? 'Đã hoàn thành' : 'Chưa nộp'}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={BookOpen}
              iconColor="text-indigo-600"
              title="Chọn nhiệm vụ để kiểm tra bài nộp"
              description="Xem danh sách học sinh đã hoàn thành hoặc dùng AI soạn tin nhắn nhắc nhở phụ huynh qua Zalo một chạm."
              quote={{
                text: 'Gieo hành vi, gặt thói quen; gieo thói quen, gặt tính cách; gieo tính cách, gặt số phận.',
                author: 'Ngạn ngữ giáo dục',
              }}
              action={
                tasks.length === 0
                  ? {
                      label: 'Giao nhiệm vụ đầu tiên',
                      onClick: () => setShowCreateModal(true),
                      icon: Plus,
                      variant: 'indigo',
                    }
                  : undefined
              }
            />
          )}
        </div>
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Giao nhiệm vụ / Bài tập mới</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tiêu đề nhiệm vụ *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Ôn tập bảng nhân 7, vẽ tranh gia đình..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Môn học
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none bg-white"
                  >
                    <option value="Toán">Toán</option>
                    <option value="Tiếng Việt">Tiếng Việt</option>
                    <option value="Tiếng Anh">Tiếng Anh</option>
                    <option value="Tự nhiên và Xã hội">Tự nhiên và Xã hội</option>
                    <option value="Mĩ thuật">Mĩ thuật</option>
                    <option value="Hoạt động trải nghiệm">Hoạt động trải nghiệm</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hạn hoàn thành
                  </label>
                  <input
                    type="date"
                    required
                    value={dueAt}
                    onChange={(e) => setDueAt(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Đối tượng giao bài
                </label>
                <select
                  value={targetGroup}
                  onChange={(e) => setTargetGroup(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none bg-white"
                >
                  <option value="all">Toàn bộ học sinh trong lớp</option>
                  <option value="Tổ 1">Chỉ Tổ 1</option>
                  <option value="Tổ 2">Chỉ Tổ 2</option>
                  <option value="Tổ 3">Chỉ Tổ 3</option>
                  <option value="Tổ 4">Chỉ Tổ 4</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Yêu cầu / Hướng dẫn học sinh
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Làm bài tập trang... Vở bài tập... Nộp vào đầu giờ sáng mai..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  Giao bài ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
