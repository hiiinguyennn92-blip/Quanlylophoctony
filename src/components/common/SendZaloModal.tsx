import React, { useState, useEffect } from 'react';
import { Student, ParentContact } from '../../types';
import { useApp } from '../../context/AppContext';
import { ParentRepository } from '../../repositories/dataRepository';
import {
  X,
  MessageCircle,
  Copy,
  Check,
  ExternalLink,
  Phone,
  Sparkles,
  Send,
  User,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';

interface SendZaloModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  initialMessage?: string;
  defaultTopic?: string;
  onSavedContact?: (contact: ParentContact) => void;
}

export const SendZaloModal: React.FC<SendZaloModalProps> = ({
  isOpen,
  onClose,
  student,
  initialMessage = '',
  defaultTopic = 'Nhận xét tình hình học tập',
  onSavedContact,
}) => {
  const { activeClass, currentUser, parents, refreshActiveData, showToast } = useApp();

  // Find parent for this student
  const existingParent = parents.find(
    (p) => p.studentId === student.id && (p.primary || true)
  );

  // Form state for parent contact
  const [parentName, setParentName] = useState(existingParent?.fullName || '');
  const [parentPhone, setParentPhone] = useState(existingParent?.phone || '');
  const [parentType, setParentType] = useState<'Bố' | 'Mẹ' | 'Người giám hộ' | 'Khác'>(
    existingParent?.type || 'Mẹ'
  );
  const [saveToContacts, setSaveToContacts] = useState(!existingParent);

  // Message state
  const [message, setMessage] = useState(initialMessage);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('custom');
  const [copied, setCopied] = useState(false);
  const [savingInteraction, setSavingInteraction] = useState(false);

  // Sync state when props change
  useEffect(() => {
    if (existingParent) {
      setParentName(existingParent.fullName);
      setParentPhone(existingParent.phone);
      setParentType(existingParent.type);
      setSaveToContacts(false);
    } else {
      setParentName('');
      setParentPhone('');
      setParentType('Mẹ');
      setSaveToContacts(true);
    }
  }, [existingParent, student.id]);

  useEffect(() => {
    setMessage(initialMessage);
    setSelectedTemplate('custom');
  }, [initialMessage, isOpen]);

  if (!isOpen) return null;

  const teacherName = activeClass?.teacherName || 'Giáo viên Chủ nhiệm';
  const className = activeClass?.className || 'Lớp';
  const studentName = student.fullName;
  const cleanPhone = parentPhone.replace(/\D/g, '');

  // Message templates
  const applyTemplate = (templateKey: string) => {
    setSelectedTemplate(templateKey);
    const salutation = parentType === 'Bố' ? 'Kính gửi Bố em' : parentType === 'Mẹ' ? 'Kính gửi Mẹ em' : 'Kính gửi Phụ huynh em';
    const rawComment = initialMessage.trim() || 'con luôn chăm chỉ, tích cực học tập và rèn luyện tốt trong tuần qua.';

    switch (templateKey) {
      case 'standard':
        setMessage(
          `${salutation} ${studentName} (${className}),\n` +
          `Cô ${teacherName} xin gửi nhận xét học tập và rèn luyện của con:\n\n` +
          `"${rawComment}"\n\n` +
          `Nhờ gia đình tiếp tục đồng hành, khích lệ và phối hợp cùng cô giáo để con ngày càng tiến bộ hơn nữa ạ.\n` +
          `Trân trọng,\nCô ${teacherName} - ${className}`
        );
        break;

      case 'praise':
        setMessage(
          `Chào ${parentType.toLowerCase()} em ${studentName}!\n` +
          `Cô ${teacherName} rất vui mừng chia sẻ với gia đình về sự nỗ lực và tiến bộ vượt bậc của ${studentName} tuần này:\n\n` +
          `🌟 "${rawComment}"\n\n` +
          `Con rất đáng khen ngợi! Mong gia đình dành cho con lời khen để con thêm hứng khởi học tập nhé ạ ❤️`
        );
        break;

      case 'reminder':
        setMessage(
          `${salutation} ${studentName},\n` +
          `Cô ${teacherName} xin trao đổi một số nội dung cần gia đình phối hợp rèn luyện thêm cho con:\n\n` +
          `📌 "${rawComment}"\n\n` +
          `Nhờ ${parentType.toLowerCase()} nhắc nhở và đồng hành cùng con thêm tại nhà. Có vấn đề gì cần hỗ trợ, gia đình cứ nhắn cô nhé ạ. Cảm ơn ${parentType.toLowerCase()}!`
        );
        break;

      case 'quick':
        setMessage(
          `[${className}] Cô ${teacherName} gửi lời nhận xét em ${studentName}:\n` +
          `"${rawComment}"`
        );
        break;

      case 'raw':
        setMessage(initialMessage);
        break;

      default:
        break;
    }
  };

  const handleCopyOnly = async () => {
    if (!message.trim()) {
      showToast('Nội dung tin nhắn đang trống', 'error');
      return;
    }
    await navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    showToast('Đã sao chép tin nhắn vào bộ nhớ tạm!');
  };

  const handleOpenZaloAndSend = async () => {
    if (!parentPhone.trim()) {
      showToast('Vui lòng nhập số điện thoại phụ huynh để mở Zalo', 'error');
      return;
    }

    if (!message.trim()) {
      showToast('Vui lòng nhập nội dung tin nhắn cần gửi', 'error');
      return;
    }

    const phoneOnlyDigits = parentPhone.replace(/\D/g, '');
    if (phoneOnlyDigits.length < 9) {
      showToast('Số điện thoại không hợp lệ (tối thiểu 9 số)', 'error');
      return;
    }

    setSavingInteraction(true);

    try {
      // 1. If saveToContacts is checked or contact was modified, update parent repository
      if (activeClass && currentUser && saveToContacts && parentName.trim()) {
        const saved = await ParentRepository.saveContact({
          id: existingParent?.id,
          classId: activeClass.id,
          ownerId: currentUser.uid,
          studentId: student.id,
          type: parentType,
          fullName: parentName.trim(),
          phone: parentPhone.trim(),
          primary: true,
        });
        if (onSavedContact) onSavedContact(saved);
        await refreshActiveData();
      }

      // 2. Copy message text to clipboard
      await navigator.clipboard.writeText(message);
      setCopied(true);

      // 3. Log interaction to ParentRepository for record keeping
      if (activeClass && currentUser) {
        try {
          await ParentRepository.saveInteraction({
            classId: activeClass.id,
            ownerId: currentUser.uid,
            studentId: student.id,
            contactName: parentName || `Phụ huynh em ${student.fullName}`,
            phone: parentPhone,
            type: 'Tin nhắn',
            summary: `Gửi tin Zalo: "${message.slice(0, 120)}${message.length > 120 ? '...' : ''}"`,
            status: 'Hoàn thành',
            followUpNeeded: false,
            date: format(new Date(), 'yyyy-MM-dd'),
          });
        } catch (logErr) {
          console.warn('Lỗi ghi nhật ký liên lạc:', logErr);
        }
      }

      // 4. Open Zalo chat
      const zaloUrl = `https://zalo.me/${phoneOnlyDigits}`;
      window.open(zaloUrl, '_blank', 'noopener,noreferrer');

      showToast(`Đã sao chép tin nhắn & mở Zalo tới ${parentName || 'phụ huynh'}! Thầy/Cô chỉ cần nhấn Ctrl+V để gửi.`);
    } catch (err: any) {
      showToast('Lỗi khi mở Zalo: ' + (err.message || ''), 'error');
    } finally {
      setSavingInteraction(false);
    }
  };

  const handleOpenSMS = () => {
    if (!parentPhone.trim()) {
      showToast('Vui lòng nhập số điện thoại phụ huynh', 'error');
      return;
    }
    const clean = parentPhone.replace(/\D/g, '');
    const smsUrl = `sms:${clean}?body=${encodeURIComponent(message)}`;
    window.location.href = smsUrl;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white backdrop-blur-xs">
              <MessageCircle className="w-5 h-5 fill-white/20" />
            </div>
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <span>Gửi Tin Nhắn / Nhận Xét Qua Zalo</span>
                <span className="px-2 py-0.5 text-[10px] bg-white/20 rounded-full font-medium">
                  {className}
                </span>
              </h3>
              <p className="text-[11px] text-blue-100">
                Gửi tới phụ huynh em <strong>{studentName}</strong> ({student.groupId || 'Lớp'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {/* Parent contact information banner & edit */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                <User className="w-3.5 h-3.5 text-blue-600" />
                Thông tin Phụ huynh nhận tin:
              </span>
              {existingParent ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                  <Check className="w-3 h-3" /> Đã có trong danh bạ
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-semibold text-[10px]">
                  <AlertCircle className="w-3 h-3" /> Chưa lưu số liên hệ
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Mối quan hệ
                </label>
                <select
                  value={parentType}
                  onChange={(e: any) => setParentType(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                >
                  <option value="Mẹ">Mẹ</option>
                  <option value="Bố">Bố</option>
                  <option value="Người giám hộ">Giám hộ</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>

              <div className="sm:col-span-5">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Họ tên phụ huynh
                </label>
                <input
                  type="text"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  placeholder={`Phụ huynh em ${studentName}`}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Số điện thoại Zalo *
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    placeholder="0912 345 678"
                    className="w-full px-2.5 py-1.5 pl-7 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            {/* Checkbox to save new contact to class parent directory */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="saveContactCheck"
                checked={saveToContacts}
                onChange={(e) => setSaveToContacts(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
              />
              <label htmlFor="saveContactCheck" className="text-[11px] text-slate-600 cursor-pointer">
                Lưu / Cập nhật số này vào Danh bạ Phụ huynh của lớp
              </label>
            </div>
          </div>

          {/* Template Quick Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Mẫu tin nhắn nhanh chuẩn mực sư phạm:</span>
              </label>
              <span className="text-[11px] text-slate-400">Bấm để thay đổi mẫu</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => applyTemplate('standard')}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedTemplate === 'standard'
                    ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <div className="font-semibold text-[11px]">1. Nhận xét định kỳ</div>
                <div className="text-[10px] text-slate-500 truncate">Kính gửi + nhận xét + phối hợp</div>
              </button>

              <button
                type="button"
                onClick={() => applyTemplate('praise')}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedTemplate === 'praise'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <div className="font-semibold text-[11px]">2. Khen ngợi tiến bộ</div>
                <div className="text-[10px] text-slate-500 truncate">Biểu dương nỗ lực của con</div>
              </button>

              <button
                type="button"
                onClick={() => applyTemplate('reminder')}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedTemplate === 'reminder'
                    ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <div className="font-semibold text-[11px]">3. Nhắc nhở rèn thêm</div>
                <div className="text-[10px] text-slate-500 truncate">Vùng phát triển + gia đình</div>
              </button>

              <button
                type="button"
                onClick={() => applyTemplate('raw')}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedTemplate === 'raw'
                    ? 'bg-purple-50 border-purple-300 text-purple-900 font-bold shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <div className="font-semibold text-[11px]">4. Nội dung gốc</div>
                <div className="text-[10px] text-slate-500 truncate">Giữ nguyên lời nhận xét AI</div>
              </button>
            </div>
          </div>

          {/* Editable Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800">
                Nội dung tin nhắn (Thầy/Cô có thể chỉnh sửa tự do trước khi gửi):
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {message.length} ký tự · ~{message.trim() ? message.trim().split(/\s+/).length : 0} từ
              </span>
            </div>

            <div className="relative">
              <textarea
                rows={7}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  setSelectedTemplate('custom');
                }}
                placeholder="Nhập hoặc chỉnh sửa nội dung tin nhắn gửi qua Zalo..."
                className="w-full p-3.5 text-xs leading-relaxed border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white font-normal text-slate-800 shadow-inner"
              />
            </div>
          </div>

          {/* Instructions Box */}
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-2.5 text-blue-900">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <span className="font-bold">Cách thức hoạt động:</span> Khi bấm{' '}
              <strong>"Mở Zalo & Gửi ngay"</strong>, hệ thống tự động sao chép toàn bộ nội dung tin nhắn
              vừa soạn vào khay nhớ tạm và chuyển sang phòng chat Zalo của số điện thoại{' '}
              <strong className="font-mono">{parentPhone || '[Chưa nhập SĐT]'}</strong>. Thầy/Cô chỉ cần nhấn{' '}
              <kbd className="px-1.5 py-0.5 bg-white border border-blue-300 rounded text-[10px] font-bold shadow-2xs">Ctrl + V</kbd>{' '}
              (hoặc giữ màn hình chọn Dán) để gửi ngay!
            </div>
          </div>
        </div>

        {/* Modal Footer Buttons */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyOnly}
              className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Đã sao chép!' : 'Sao chép tin nhắn'}</span>
            </button>

            {cleanPhone && (
              <button
                type="button"
                onClick={handleOpenSMS}
                className="px-2.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-semibold text-xs hidden sm:flex items-center gap-1 transition-colors cursor-pointer"
                title="Gửi tin qua SMS điện thoại"
              >
                <span>SMS</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
            >
              Đóng
            </button>

            <button
              type="button"
              onClick={handleOpenZaloAndSend}
              disabled={savingInteraction || !parentPhone.trim()}
              className="flex-1 sm:flex-none px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>{savingInteraction ? 'Đang mở...' : 'Mở Zalo & Gửi ngay'}</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
