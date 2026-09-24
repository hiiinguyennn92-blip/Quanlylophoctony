import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ParentContact, Student } from '../../types';
import { ParentRepository } from '../../repositories/dataRepository';
import { AIClientService } from '../../services/aiClientService';
import { SendZaloModal } from '../common/SendZaloModal';
import { format } from 'date-fns';
import {
  Users,
  Phone,
  MessageCircle,
  Copy,
  Check,
  Sparkles,
  Search,
  Plus,
  Edit,
  Trash2,
  Send,
  ExternalLink,
  X,
  UserCheck,
} from 'lucide-react';

export const ParentsView: React.FC = () => {
  const {
    activeClass,
    currentUser,
    students,
    parents,
    refreshActiveData,
    showToast,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTabSub, setActiveTabSub] = useState<'contacts' | 'compose'>('contacts');

  // Compose State
  const [recipientType, setRecipientType] = useState<'all' | 'group' | 'individual'>('all');
  const [selectedGroup, setSelectedGroup] = useState('Tổ 1');
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || '');
  const [topic, setTopic] = useState('Thông báo học tập & hoạt động tuần tới');
  const [extraDetails, setExtraDetails] = useState('');
  const [tone, setTone] = useState<'ấm áp, khích lệ' | 'trang trọng, học vụ' | 'ngắn gọn, trực tiếp'>('ấm áp, khích lệ');
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [copied, setCopied] = useState(false);

  // Send Zalo Modal State
  const [showZaloModal, setShowZaloModal] = useState(false);
  const [zaloStudent, setZaloStudent] = useState<Student | null>(null);
  const [zaloInitialMessage, setZaloInitialMessage] = useState('');
  const [sentZaloParentIds, setSentZaloParentIds] = useState<Set<string>>(new Set());

  // Edit / Add Modal
  const [showContactModal, setShowContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState<ParentContact | null>(null);
  const [formStudentId, setFormStudentId] = useState(students[0]?.id || '');
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formType, setFormType] = useState<ParentContact['type']>('Mẹ');
  const [formEmail, setFormEmail] = useState('');

  const studentMap = React.useMemo(() => {
    return new Map(students.map((s) => [s.id, s]));
  }, [students]);

  // Target students for message broadcast
  const targetStudents = React.useMemo(() => {
    if (recipientType === 'all') return students;
    if (recipientType === 'group') return students.filter((s) => s.groupId === selectedGroup);
    if (recipientType === 'individual') return students.filter((s) => s.id === selectedStudentId);
    return [];
  }, [recipientType, students, selectedGroup, selectedStudentId]);

  // Filtered contacts
  const filteredParents = React.useMemo(() => {
    return parents.filter((p) => {
      const stu = studentMap.get(p.studentId);
      const stuName = stu?.fullName.toLowerCase() || '';
      const q = searchTerm.toLowerCase();
      return (
        p.fullName.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        stuName.includes(q)
      );
    });
  }, [parents, searchTerm, studentMap]);

  const handleOpenAddContact = () => {
    setEditingContact(null);
    setFormStudentId(students[0]?.id || '');
    setFormName('');
    setFormPhone('');
    setFormType('Mẹ');
    setFormEmail('');
    setShowContactModal(true);
  };

  const handleOpenEditContact = (p: ParentContact) => {
    setEditingContact(p);
    setFormStudentId(p.studentId);
    setFormName(p.fullName);
    setFormPhone(p.phone);
    setFormType(p.type);
    setFormEmail(p.email || '');
    setShowContactModal(true);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClass || !currentUser) return;
    if (!formName.trim() || !formPhone.trim()) {
      showToast('Vui lòng nhập tên và số điện thoại phụ huynh', 'error');
      return;
    }

    try {
      await ParentRepository.saveContact({
        id: editingContact?.id,
        classId: activeClass.id,
        ownerId: currentUser.uid,
        studentId: formStudentId,
        type: formType,
        fullName: formName,
        phone: formPhone,
        email: formEmail || undefined,
        primary: true,
      });

      await refreshActiveData();
      setShowContactModal(false);
      showToast('Đã lưu thông tin liên hệ phụ huynh!');
    } catch (err: any) {
      showToast('Lỗi khi lưu phụ huynh: ' + (err.message || ''), 'error');
    }
  };

  const handleDeleteContact = async (id: string) => {
    try {
      await ParentRepository.deleteContact(id);
      await refreshActiveData();
      showToast('Đã xóa thông tin liên hệ');
    } catch (err: any) {
      showToast('Lỗi khi xóa: ' + (err.message || ''), 'error');
    }
  };

  // Generate AI message
  const handleGenerateMessage = async () => {
    if (!activeClass) return;
    setLoadingAi(true);
    try {
      let targetDesc = `Cả lớp ${activeClass.className}`;
      if (recipientType === 'group') targetDesc = `Phụ huynh các em ${selectedGroup}`;
      else if (recipientType === 'individual') {
        const s = studentMap.get(selectedStudentId);
        targetDesc = `Phụ huynh em ${s?.fullName || 'học sinh'}`;
      }

      const res = await AIClientService.generateParentMessage({
        topic,
        teacherName: activeClass.teacherName,
        className: activeClass.className,
        details: `${extraDetails}. Gửi tới: ${targetDesc}`,
        tone,
      });

      setGeneratedMessage(res.message);
      showToast('Đã soạn xong tin nhắn bằng AI!');
    } catch (err: any) {
      showToast('Lỗi khi tạo tin nhắn: ' + (err.message || ''), 'error');
    } finally {
      setLoadingAi(false);
    }
  };

  const handleCopyMessage = () => {
    if (!generatedMessage) return;
    navigator.clipboard.writeText(generatedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast('Đã sao chép tin nhắn để dán vào Zalo/SMS!');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-rose-600" />
            <span>Liên Lạc Phụ Huynh & Soạn Tin Zalo</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Danh bạ liên hệ nhanh · Soạn thảo thông điệp sư phạm ấm áp bằng AI
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTabSub('contacts')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTabSub === 'contacts' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Danh bạ ({parents.length})
            </button>
            <button
              onClick={() => setActiveTabSub('compose')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTabSub === 'compose' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Soạn tin nhắn AI</span>
            </button>
          </div>

          {activeTabSub === 'contacts' && (
            <button
              onClick={handleOpenAddContact}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm liên hệ</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. CONTACTS TAB */}
      {activeTabSub === 'contacts' && (
        <div className="space-y-4">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm phụ huynh theo tên, số điện thoại hoặc tên học sinh..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">STT</th>
                    <th className="py-3 px-4">Học sinh</th>
                    <th className="py-3 px-4">Tổ</th>
                    <th className="py-3 px-4">Phụ huynh</th>
                    <th className="py-3 px-4">Quan hệ</th>
                    <th className="py-3 px-4">Số điện thoại</th>
                    <th className="py-3 px-4 text-right">Liên lạc nhanh</th>
                    <th className="py-3 px-4 text-right w-20">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredParents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        Chưa có dữ liệu phụ huynh khớp với tìm kiếm.
                      </td>
                    </tr>
                  ) : (
                    filteredParents.map((parent, idx) => {
                      const student = studentMap.get(parent.studentId);
                      const cleanPhone = parent.phone.replace(/\D/g, '');

                      return (
                        <tr key={parent.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 text-center font-medium text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {student?.fullName || 'Học sinh'}
                          </td>
                          <td className="py-3 px-4 text-slate-500">
                            {student?.groupId || '-'}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800">
                            {parent.fullName}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold">
                              {parent.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-slate-700">
                            {parent.phone}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Call */}
                              <a
                                href={`tel:${parent.phone}`}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg text-xs flex items-center gap-1 transition-colors"
                                title="Gọi điện"
                              >
                                <Phone className="w-3 h-3 text-emerald-600" />
                                <span>Gọi</span>
                              </a>

                              {/* Soạn & Gửi Zalo */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (student) {
                                    setZaloStudent(student);
                                    setZaloInitialMessage('');
                                    setShowZaloModal(true);
                                  }
                                }}
                                className="px-2.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                title="Soạn & Gửi tin nhắn Zalo cho phụ huynh này"
                              >
                                <MessageCircle className="w-3 h-3 fill-white" />
                                <span>Nhắn Zalo</span>
                              </button>

                              {/* Zalo Direct Chat */}
                              <a
                                href={`https://zalo.me/${cleanPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs flex items-center transition-colors"
                                title="Mở trang Zalo chat trực tiếp"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenEditContact(parent)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 rounded"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteContact(parent.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. COMPOSE AI ZALO MESSAGE TAB */}
      {activeTabSub === 'compose' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Thiết lập nội dung gửi phụ huynh</span>
            </h3>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Người nhận tin nhắn
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setRecipientType('all')}
                    className={`py-2 px-2 rounded-xl border text-center transition-colors cursor-pointer ${
                      recipientType === 'all'
                        ? 'bg-rose-50 border-rose-300 text-rose-800 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Toàn bộ lớp
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientType('group')}
                    className={`py-2 px-2 rounded-xl border text-center transition-colors cursor-pointer ${
                      recipientType === 'group'
                        ? 'bg-rose-50 border-rose-300 text-rose-800 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Theo Tổ
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientType('individual')}
                    className={`py-2 px-2 rounded-xl border text-center transition-colors cursor-pointer ${
                      recipientType === 'individual'
                        ? 'bg-rose-50 border-rose-300 text-rose-800 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Học sinh riêng
                  </button>
                </div>
              </div>

              {recipientType === 'group' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Chọn Tổ
                  </label>
                  <select
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Tổ 1">Tổ 1</option>
                    <option value="Tổ 2">Tổ 2</option>
                    <option value="Tổ 3">Tổ 3</option>
                    <option value="Tổ 4">Tổ 4</option>
                  </select>
                </div>
              )}

              {recipientType === 'individual' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Chọn học sinh
                  </label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.groupId})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chủ đề thông báo
                </label>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                >
                  <option value="Thông báo học tập & hoạt động tuần tới">Thông báo học tập tuần tới</option>
                  <option value="Nhắc nhở chuẩn bị đồ dùng / đồng phục sự kiện">Nhắc chuẩn bị đồ dùng / đồng phục</option>
                  <option value="Khen ngợi biểu hiện tích cực của con">Khen ngợi biểu hiện tích cực</option>
                  <option value="Mời họp phụ huynh đầu năm / cuối kì">Mời họp phụ huynh</option>
                  <option value="Nhắc nhở chuyên cần & giờ giấc đi học">Nhắc nhở chuyên cần & giờ giấc</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chi tiết nội dung cần truyền đạt
                </label>
                <textarea
                  rows={3}
                  value={extraDetails}
                  onChange={(e) => setExtraDetails(e.target.value)}
                  placeholder="VD: Thứ Hai mặc đồng phục áo trắng có khăn quàng, mang theo bút chì và thước kẻ..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Văn phong & Giọng điệu
                </label>
                <select
                  value={tone}
                  onChange={(e: any) => setTone(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                >
                  <option value="ấm áp, khích lệ">Ấm áp, ân cần, gần gũi</option>
                  <option value="trang trọng, học vụ">Trang trọng, chuẩn mực sư phạm</option>
                  <option value="ngắn gọn, trực tiếp">Ngắn gọn, súc tích (Dưới 50 từ)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleGenerateMessage}
                disabled={loadingAi}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-200" />
                <span>{loadingAi ? 'AI đang soạn tin...' : 'Soạn tin nhắn tự động bằng AI'}</span>
              </button>
            </div>
          </div>

          {/* AI Result Box */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Bản thảo tin nhắn gửi Zalo / SMS
              </h3>

              {generatedMessage && (
                <button
                  onClick={handleCopyMessage}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Đã sao chép' : 'Sao chép để gửi'}</span>
                </button>
              )}
            </div>

            <textarea
              rows={12}
              value={generatedMessage}
              onChange={(e) => setGeneratedMessage(e.target.value)}
              placeholder="Nội dung tin nhắn do AI tạo sẽ xuất hiện ở đây. Thầy/Cô có thể tùy ý sửa đổi trước khi gửi."
              className="w-full p-4 text-xs leading-relaxed border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-slate-50/50 font-medium text-slate-800"
            />

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Độ dài: {generatedMessage.length} ký tự</span>
              <span>Đã kiểm tra văn phong chuẩn mực tiểu học</span>
            </div>

            {/* Quick Send via Zalo Button in Result Box */}
            {generatedMessage && (
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                {recipientType === 'individual' ? (
                  <button
                    type="button"
                    onClick={() => {
                      const stu = studentMap.get(selectedStudentId);
                      if (stu) {
                        setZaloStudent(stu);
                        setZaloInitialMessage(generatedMessage);
                        setShowZaloModal(true);
                      }
                    }}
                    className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 fill-white" />
                    <span>Mở Zalo & Gửi tới Phụ huynh ({studentMap.get(selectedStudentId)?.fullName})</span>
                  </button>
                ) : (
                  <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                    <span>Thầy/Cô có thể gửi lần lượt tới từng phụ huynh ở bảng danh sách bên dưới.</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Target Recipients Zalo Broadcast helper list */}
          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Danh sách phụ huynh nhận tin Zalo ({targetStudents.length} học sinh)</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {sentZaloParentIds.size > 0
                    ? `Đã gửi qua Zalo: ${sentZaloParentIds.size}/${targetStudents.length} phụ huynh`
                    : 'Bấm "Mở Zalo gửi" để tự động chép tin nhắn cá nhân hóa và mở cửa sổ chat Zalo'}
                </p>
              </div>

              {sentZaloParentIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => setSentZaloParentIds(new Set())}
                  className="text-[11px] text-slate-400 hover:text-slate-600 underline cursor-pointer"
                >
                  Đặt lại trạng thái gửi ({sentZaloParentIds.size})
                </button>
              )}
            </div>

            <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
              {targetStudents.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  Không có học sinh nào trong nhóm đã chọn.
                </div>
              ) : (
                targetStudents.map((stu) => {
                  const parentContact = parents.find((p) => p.studentId === stu.id);
                  const isSent = parentContact ? sentZaloParentIds.has(parentContact.id) : false;

                  return (
                    <div
                      key={stu.id}
                      className={`p-3 flex items-center justify-between gap-3 text-xs transition-colors ${
                        isSent ? 'bg-emerald-50/40' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                            isSent ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {isSent ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : stu.fullName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                            <span>{stu.fullName}</span>
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px] font-normal">
                              {stu.groupId || 'Lớp'}
                            </span>
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {parentContact ? (
                              <span>
                                {parentContact.fullName} ({parentContact.type}) -{' '}
                                <strong className="font-mono text-slate-700">{parentContact.phone}</strong>
                              </span>
                            ) : (
                              <span className="text-amber-600 italic">Chưa có SĐT phụ huynh (bấm Soạn riêng để nhập)</span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setZaloStudent(stu);
                            setZaloInitialMessage(generatedMessage);
                            setShowZaloModal(true);
                          }}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1"
                          title="Tùy chỉnh nội dung tin nhắn riêng cho học sinh này"
                        >
                          <Edit className="w-3 h-3 text-slate-500" />
                          <span className="hidden sm:inline">Soạn riêng</span>
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            if (!parentContact?.phone) {
                              setZaloStudent(stu);
                              setZaloInitialMessage(generatedMessage);
                              setShowZaloModal(true);
                              return;
                            }

                            if (!generatedMessage.trim()) {
                              showToast('Vui lòng soạn nội dung tin nhắn trước khi gửi', 'error');
                              return;
                            }

                            const phoneDigits = parentContact.phone.replace(/\D/g, '');
                            let msg = generatedMessage
                              .replace(/\{tên_học_sinh\}/g, stu.fullName)
                              .replace(/\{tên_con\}/g, stu.fullName);

                            await navigator.clipboard.writeText(msg);
                            setSentZaloParentIds((prev) => new Set([...prev, parentContact.id]));

                            if (activeClass && currentUser) {
                              try {
                                await ParentRepository.saveInteraction({
                                  classId: activeClass.id,
                                  ownerId: currentUser.uid,
                                  studentId: stu.id,
                                  contactName: parentContact.fullName,
                                  phone: parentContact.phone,
                                  type: 'Tin nhắn',
                                  summary: `Gửi Zalo: "${msg.slice(0, 80)}..."`,
                                  status: 'Hoàn thành',
                                  followUpNeeded: false,
                                  date: format(new Date(), 'yyyy-MM-dd'),
                                });
                              } catch (e) {
                                console.warn(e);
                              }
                            }

                            window.open(`https://zalo.me/${phoneDigits}`, '_blank', 'noopener,noreferrer');
                            showToast(`Đã chép tin nhắn cho PH em ${stu.fullName}! Đang mở Zalo...`);
                          }}
                          className={`px-3 py-1.5 font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                            isSent
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
                          }`}
                        >
                          <MessageCircle className="w-3.5 h-3.5 fill-white" />
                          <span>{isSent ? 'Gửi lại Zalo' : 'Mở Zalo gửi'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit / Add Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">
                {editingContact ? 'Sửa thông tin liên hệ' : 'Thêm liên hệ phụ huynh'}
              </h3>
              <button onClick={() => setShowContactModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Học sinh *
                </label>
                <select
                  value={formStudentId}
                  onChange={(e) => setFormStudentId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none bg-white"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.groupId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Quan hệ
                  </label>
                  <select
                    value={formType}
                    onChange={(e: any) => setFormType(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none bg-white"
                  >
                    <option value="Mẹ">Mẹ</option>
                    <option value="Bố">Bố</option>
                    <option value="Người giám hộ">Giám hộ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Họ và tên phụ huynh *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số điện thoại *
                </label>
                <input
                  type="tel"
                  required
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="0912 345 678"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email (tùy chọn)
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="phuhuynh@email.com"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowContactModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  Lưu liên hệ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Zalo Modal */}
      {showZaloModal && zaloStudent && (
        <SendZaloModal
          isOpen={showZaloModal}
          onClose={() => setShowZaloModal(false)}
          student={zaloStudent}
          initialMessage={zaloInitialMessage || generatedMessage}
          defaultTopic={topic}
        />
      )}
    </div>
  );
};
