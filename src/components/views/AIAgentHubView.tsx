import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { AIClientService } from '../../services/aiClientService';
import { SendZaloModal } from '../common/SendZaloModal';
import { Student } from '../../types';
import { format } from 'date-fns';
import {
  Bot,
  Sparkles,
  Send,
  User,
  ShieldCheck,
  Heart,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Copy,
  MessageCircle,
  RefreshCw,
  Award,
  Users,
  Eye,
  Calendar,
  Zap,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  content: string;
  timestamp: string;
  followUps?: string[];
  suggestedAction?: {
    type: 'zalo' | 'copy';
    label: string;
    payload?: string;
  };
}

const AGENT_SKILLS = [
  {
    id: 'early_warning',
    name: 'Can Thiệp Sớm & Chuyên Cần',
    icon: AlertTriangle,
    badge: 'Skill An Toàn',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Phát hiện học sinh vắng học bất thường, suy giảm động lực và đề xuất can thiệp nhân văn.',
    samplePrompt: 'Hãy rà soát danh sách học sinh có tín hiệu cần quan tâm và đề xuất biện pháp can thiệp sớm cho từng em.',
  },
  {
    id: 'circular_27',
    name: 'Đánh Giá Khung Năng Lực TT27',
    icon: Award,
    badge: 'Skill Sư Phạm',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Tư vấn nhận xét học bạ, 3 năng lực chung, 7 năng lực đặc thù và 5 phẩm chất theo mô hình Can-Need-Action.',
    samplePrompt: 'Gợi ý cách nhận xét phẩm chất Chăm chỉ và Năng lực Tự chủ cho học sinh còn rụt rè, chưa mạnh dạn phát biểu.',
  },
  {
    id: 'classroom_dynamics',
    name: 'Tối Ưu Sơ Đồ & Thị Lực',
    icon: Eye,
    badge: 'Skill Không Gian',
    color: 'bg-sky-50 text-sky-700 border-sky-200',
    description: 'Tư vấn bố trí vị trí ngồi cho học sinh cận thị, thấp bé, ghép đôi bạn cùng tiến giúp đỡ nhau.',
    samplePrompt: 'Lớp có các bạn mắt cận thị và bạn hay nói chuyện riêng, em nên tư vấn bố trí sơ đồ bàn ghế như thế nào?',
  },
  {
    id: 'parent_bridge',
    name: 'Cầu Nối Phụ Huynh & Zalo',
    icon: Heart,
    badge: 'Skill Kết Nối',
    color: 'bg-rose-50 text-rose-700 border-rose-200',
    description: 'Soạn tin nhắn trao đổi phụ huynh tế nhị, ấm áp, bảo vệ sự tự tôn của học sinh và tăng cường phối hợp.',
    samplePrompt: 'Soạn tin nhắn Zalo gửi phụ huynh thông báo việc con dạo này tiến bộ rõ rệt trong giờ học nhưng hay quên mang vở bài tập.',
  },
];

export const AIAgentHubView: React.FC = () => {
  const {
    activeClass,
    students,
    attendanceRecords,
    attentionSignals,
    tasks,
    showToast,
  } = useApp();

  const [inputQuery, setInputQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Modal Zalo State
  const [zaloModalOpen, setZaloModalOpen] = useState(false);
  const [zaloText, setZaloText] = useState('');

  // Calculate attendance statistics today
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayRecords = attendanceRecords.filter((r) => r.date === todayStr);
  const presentCount = todayRecords.filter((r) => r.status === 'present').length;
  const excusedCount = todayRecords.filter((r) => r.status === 'excused_absence').length;
  const unexcusedCount = todayRecords.filter((r) => r.status === 'unexcused_absence').length;
  const lateCount = todayRecords.filter((r) => r.status === 'late').length;

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  // Initial welcome message from the Agent
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'agent',
      content: `Kính chào Thầy/Cô! Em là **Trợ Lý AI Chủ Nhiệm** theo định hướng GDPT 2018 và Thông tư 27/2020/TT-BGDĐT.\n\nHiện tại em đã nắm bắt toàn bộ dữ liệu lớp **${activeClass?.className || 'chưa chọn'}** (sĩ số: ${students.length} em, hôm nay ghi nhận ${presentCount}/${students.length} em có mặt, ${attentionSignals.length} em có tín hiệu cần quan tâm).\n\nThầy/Cô có thể yêu cầu em bất kỳ công việc sư phạm nào: phân tích học sinh, lên kế hoạch sinh hoạt tuần, soạn tin nhắn Zalo cho phụ huynh hoặc tối ưu sơ đồ lớp học!`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      followUps: [
        'Phân tích học sinh cần quan tâm nhất tuần này',
        'Gợi ý kịch bản 35 phút tiết sinh hoạt lớp',
        'Soạn tin nhắn Zalo nhắc nhở phụ huynh giữ ấm mùa đông',
      ],
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = (queryText || inputQuery).trim();
    if (!textToSend || loading) return;

    const userMsg: ChatMessage = {
      id: 'user_' + Date.now(),
      sender: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      // Assemble live contextual data for Agent perception
      const relevantRecords = [
        attentionSignals.length > 0
          ? `Tín hiệu cần chú ý: ${attentionSignals.map((a) => `${a.studentName} (${a.title} - ${a.description})`).join('; ')}`
          : 'Không có tín hiệu nguy cơ nghiêm trọng.',
        tasks.length > 0
          ? `Nhiệm vụ tuần: ${tasks.slice(0, 3).map((t) => t.title).join(', ')}`
          : '',
      ].filter(Boolean).join('\n');

      const res = await AIClientService.askAssistant({
        userQuery: textToSend,
        contextData: {
          className: activeClass?.className,
          studentCount: students.length,
          attendanceToday: {
            present: presentCount,
            excused: excusedCount,
            unexcused: unexcusedCount,
            late: lateCount,
          },
          tasksSummary: tasks.slice(0, 5).map((t) => t.title).join(', '),
          selectedStudent: selectedStudent
            ? {
                fullName: selectedStudent.fullName,
                gender: selectedStudent.gender,
                groupId: selectedStudent.groupId,
                notes: selectedStudent.notes,
              }
            : undefined,
          relevantRecords,
        },
      });

      const agentMsg: ChatMessage = {
        id: 'agent_' + Date.now(),
        sender: 'agent',
        content: res.reply,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        followUps: res.followUps || [],
      };

      setMessages((prev) => [...prev, agentMsg]);
    } catch (err: any) {
      showToast('Lỗi tương tác Trợ lý AI: ' + (err.message || ''), 'error');
      const fallbackMsg: ChatMessage = {
        id: 'agent_err_' + Date.now(),
        sender: 'agent',
        content: 'Dạ Thầy/Cô, kết nối mạng hoặc máy chủ AI đang phản hồi chậm. Thầy/Cô có thể bấm thử lại hoặc chọn một trong các câu hỏi gợi ý bên dưới.',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        followUps: ['Xem báo cáo chuyên cần', 'Soạn tin nhắn Zalo'],
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyContent = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Đã sao chép nội dung câu trả lời!');
  };

  const handleOpenZaloFromMessage = (text: string) => {
    setZaloText(text);
    setZaloModalOpen(true);
  };

  const studentForZalo: Student = selectedStudent || students[0] || {
    id: 'placeholder',
    classId: activeClass?.id || '',
    ownerId: activeClass?.ownerId || '',
    studentCode: 'HS01',
    fullName: 'Em học sinh',
    dob: '2016-01-01',
    gender: 'nam',
    groupId: 'Tổ 1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-8">
      {/* Header & Agent Status Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner">
              <Bot className="w-7 h-7 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Trợ Lý Sư Phạm Toàn Năng
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Sẵn sàng • TT 27 / GDPT 2018
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                AI Agent đa luồng: Tự động phân tích hồ sơ, cảnh báo sớm, đánh giá khung năng lực và cầu nối phụ huynh
              </p>
            </div>
          </div>

          {/* Perception HUD Badges */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-300" />
              <span>Lớp: <strong className="text-white">{activeClass?.className || 'Chưa chọn'}</strong> ({students.length} HS)</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Hôm nay: <strong className="text-white">{presentCount}/{students.length}</strong> có mặt</span>
            </div>
            {attentionSignals.length > 0 && (
              <div className="bg-amber-500/20 backdrop-blur-md px-3 py-1.5 rounded-xl border border-amber-400/30 flex items-center gap-2 text-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-300" />
                <span>Cần quan tâm: <strong>{attentionSignals.length} em</strong></span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Skills Selector + Chat Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Skills Deck & Context Selector (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Target Student Focus Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                Tiêu điểm học sinh cần tư vấn
              </span>
              {selectedStudentId && (
                <button
                  onClick={() => setSelectedStudentId('')}
                  className="text-[11px] text-slate-400 hover:text-slate-600 underline"
                >
                  Xóa chọn
                </button>
              )}
            </div>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-slate-800"
            >
              <option value="">-- Tư vấn toàn diện cả lớp --</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} {s.gender === 'nữ' ? '(Nữ)' : '(Nam)'} {s.groupId ? `• ${s.groupId}` : ''}
                </option>
              ))}
            </select>
            {selectedStudent && (
              <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 text-[11px] text-emerald-900 space-y-1">
                <p className="font-semibold text-emerald-800">
                  Đã khóa ngữ cảnh học sinh: {selectedStudent.fullName}
                </p>
                <p className="text-slate-600 line-clamp-2">
                  {selectedStudent.notes || 'Chưa có ghi chú đặc biệt từ hồ sơ ban đầu.'}
                </p>
              </div>
            )}
          </div>

          {/* 4 Agent Skills Cards */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                4 Nhóm Kỹ Năng Sư Phạm Của Agent
              </h2>
              <span className="text-[10px] text-slate-400">1.000 Luồng Xử Lý</span>
            </div>

            <div className="space-y-2">
              {AGENT_SKILLS.map((skill) => {
                const Icon = skill.icon;
                return (
                  <div
                    key={skill.id}
                    onClick={() => handleSendMessage(skill.samplePrompt)}
                    className="group p-3 rounded-xl border border-slate-100 hover:border-emerald-300 hover:bg-emerald-50/40 transition-all cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${skill.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <h3 className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                          {skill.name}
                        </h3>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 group-hover:bg-emerald-100 group-hover:text-emerald-800 group-hover:border-emerald-200 transition-colors">
                        {skill.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed pl-9">
                      {skill.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pedagogical Ethics & Anti-Bias Assurance */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200/70 p-3.5 flex items-start gap-2.5 text-[11px] text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="leading-snug">
              <strong>Nguyên tắc sư phạm:</strong> Agent tuân thủ nghiêm ngặt chuẩn mực Thông tư 27, không so sánh học sinh, không phán xét tiêu cực, tuyệt đối bảo mật thông tin gia đình.
            </p>
          </div>
        </div>

        {/* Right Column: Conversational Console (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden h-[680px]">
          {/* Console Header */}
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-800">
                Phiên làm việc trực tiếp cùng AI Agent
              </span>
            </div>
            <button
              onClick={() => {
                setMessages([
                  {
                    id: 'welcome_reset',
                    sender: 'agent',
                    content: 'Đã làm mới phiên đối thoại sư phạm. Thầy/Cô muốn em hỗ trợ điều gì tiếp theo?',
                    timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                    followUps: ['Xem báo cáo chuyên cần', 'Soạn tin nhắn Zalo'],
                  },
                ]);
              }}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-slate-200/60 transition-colors"
              title="Làm mới hội thoại"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Làm mới
            </button>
          </div>

          {/* Message Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.sender === 'agent' && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed space-y-2.5 shadow-2xs ${
                    msg.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-tr-none'
                      : 'bg-slate-50 text-slate-800 border border-slate-200/80 rounded-tl-none'
                  }`}
                >
                  {/* Message Content with line breaks */}
                  <div className="whitespace-pre-wrap font-sans text-xs">
                    {msg.content}
                  </div>

                  {/* Agent Action Toolbar */}
                  {msg.sender === 'agent' && (
                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{msg.timestamp}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleCopyContent(msg.content)}
                          className="px-2 py-0.5 rounded-md hover:bg-slate-200/70 text-slate-600 flex items-center gap-1 transition-colors"
                          title="Sao chép nội dung"
                        >
                          <Copy className="w-3 h-3" />
                          Sao chép
                        </button>
                        <button
                          onClick={() => handleOpenZaloFromMessage(msg.content)}
                          className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 flex items-center gap-1 transition-colors font-medium"
                          title="Gửi nội dung này qua Zalo"
                        >
                          <MessageCircle className="w-3 h-3 text-blue-600" />
                          Gửi Zalo
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Follow-up suggestions */}
                  {msg.followUps && msg.followUps.length > 0 && (
                    <div className="pt-1.5 flex flex-wrap gap-1.5">
                      {msg.followUps.map((fu, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(fu)}
                          className="text-[11px] bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 text-slate-700 hover:text-emerald-800 font-medium px-2.5 py-1 rounded-full transition-all text-left"
                        >
                          ✨ {fu}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {msg.sender === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 shadow-xs mt-0.5 font-bold text-xs">
                    GV
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Bot className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl rounded-tl-none p-3.5 text-xs text-slate-500 flex items-center gap-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" />
                  </div>
                  <span>Agent đang phân tích dữ liệu sư phạm và đối chiếu Thông tư 27...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Chips */}
          <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50 flex items-center gap-2 overflow-x-auto text-[11px] no-scrollbar">
            <span className="text-slate-400 font-medium shrink-0">Gợi ý nhanh:</span>
            <button
              onClick={() => handleSendMessage('Đưa ra 3 khuyến nghị can thiệp cho học sinh nghỉ học nhiều tuần này')}
              className="shrink-0 px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-emerald-300 hover:text-emerald-700 text-slate-600 transition-all font-medium"
            >
              ⚠️ Xử lý chuyên cần
            </button>
            <button
              onClick={() => handleSendMessage('Soạn kịch bản 35 phút tiết sinh hoạt lớp chủ đề An toàn giao thông')}
              className="shrink-0 px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-emerald-300 hover:text-emerald-700 text-slate-600 transition-all font-medium"
            >
              📅 Kịch bản sinh hoạt
            </button>
            <button
              onClick={() => handleSendMessage('Tư vấn cách xếp chỗ ngồi cân bằng giữa học sinh cận thị và bạn cùng tiến')}
              className="shrink-0 px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-emerald-300 hover:text-emerald-700 text-slate-600 transition-all font-medium"
            >
              🪑 Sắp xếp chỗ ngồi
            </button>
            <button
              onClick={() => handleSendMessage('Soạn lời nhắn Zalo động viên phụ huynh đồng hành cùng con ôn bài cuối tuần')}
              className="shrink-0 px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-emerald-300 hover:text-emerald-700 text-slate-600 transition-all font-medium"
            >
              💬 Nhắn tin phụ huynh
            </button>
          </div>

          {/* Input Box */}
          <div className="p-3 bg-white border-t border-slate-200/80">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder={
                  selectedStudent
                    ? `Nhập câu hỏi sư phạm về em ${selectedStudent.fullName}...`
                    : 'Hỏi Trợ lý AI về học sinh, chuyên cần, sinh hoạt lớp, phụ huynh...'
                }
                disabled={loading}
                className="flex-1 text-xs px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-slate-800 disabled:bg-slate-100"
              />
              <button
                type="submit"
                disabled={loading || !inputQuery.trim()}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-all shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Gửi</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Send Zalo Modal */}
      {zaloModalOpen && (
        <SendZaloModal
          isOpen={zaloModalOpen}
          onClose={() => setZaloModalOpen(false)}
          initialMessage={zaloText}
          student={studentForZalo}
        />
      )}
    </div>
  );
};
