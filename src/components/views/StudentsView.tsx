import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Student, ParentContact } from '../../types';
import { StudentRepository, ParentRepository } from '../../repositories/dataRepository';
import { ImportExportService, ParsedStudentRow } from '../../services/importExportService';
import {
  UserPlus,
  FileSpreadsheet,
  Download,
  Upload,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Phone,
  Cake,
  Users,
  Eye,
  CheckCircle,
  AlertCircle,
  X,
  Sparkles,
  Award,
  BookOpen,
  Calendar,
  BookMarked,
  MessageCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { SendZaloModal } from '../common/SendZaloModal';
import { EmptyState } from '../common/EmptyState';

export const StudentsView: React.FC = () => {
  const {
    activeClass,
    currentUser,
    students,
    parents,
    attendanceRecords,
    assessments,
    competencies,
    competitionEntries,
    journalEntries,
    refreshActiveData,
    showToast,
    setActiveTab,
    selectedStudentForDetail,
    setSelectedStudentForDetail,
  } = useApp();

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedGender, setSelectedGender] = useState<string>('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Student | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // Import State
  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([]);
  const [importing, setImporting] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [dob, setDob] = useState('2017-01-01');
  const [gender, setGender] = useState<'nam' | 'nữ' | 'khác'>('nam');
  const [groupId, setGroupId] = useState('Tổ 1');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Parent form state
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentType, setParentType] = useState<'Bố' | 'Mẹ' | 'Người giám hộ' | 'Khác'>('Mẹ');

  const parentMap = React.useMemo(() => {
    const map = new Map<string, ParentContact>();
    parents.forEach((p) => {
      if (p.primary || !map.has(p.studentId)) {
        map.set(p.studentId, p);
      }
    });
    return map;
  }, [parents]);

  // Filtered Students
  const filteredStudents = React.useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.studentCode && s.studentCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (parentMap.get(s.id)?.phone.includes(searchTerm) ?? false);
      const matchGroup = selectedGroup === 'all' || s.groupId === selectedGroup;
      const matchGender = selectedGender === 'all' || s.gender === selectedGender;
      return matchSearch && matchGroup && matchGender;
    });
  }, [students, searchTerm, selectedGroup, selectedGender, parentMap]);

  const openAddModal = () => {
    setEditingStudent(null);
    setFullName('');
    setStudentCode(`HS${(students.length + 1).toString().padStart(2, '0')}`);
    setDob('2017-01-01');
    setGender('nam');
    setGroupId('Tổ 1');
    setAddress('');
    setNotes('');
    setParentName('');
    setParentPhone('');
    setParentType('Mẹ');
    setShowAddModal(true);
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setFullName(student.fullName);
    setStudentCode(student.studentCode || '');
    setDob(student.dob || '2017-01-01');
    setGender(student.gender);
    setGroupId(student.groupId || 'Tổ 1');
    setAddress(student.address || '');
    setNotes(student.notes || '');

    const p = parentMap.get(student.id);
    if (p) {
      setParentName(p.fullName);
      setParentPhone(p.phone);
      setParentType(p.type);
    } else {
      setParentName('');
      setParentPhone('');
      setParentType('Mẹ');
    }
    setShowAddModal(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClass || !currentUser) return;
    if (!fullName.trim()) {
      showToast('Vui lòng nhập họ và tên học sinh', 'error');
      return;
    }

    try {
      if (editingStudent) {
        // Update
        await StudentRepository.updateStudent(editingStudent.id, {
          fullName,
          studentCode,
          dob,
          gender,
          groupId,
          address,
          notes,
        });

        if (parentName.trim() && parentPhone.trim()) {
          const existingParent = parentMap.get(editingStudent.id);
          await ParentRepository.saveContact({
            id: existingParent?.id,
            classId: activeClass.id,
            ownerId: currentUser.uid,
            studentId: editingStudent.id,
            fullName: parentName,
            phone: parentPhone,
            type: parentType,
            primary: true,
          });
        }

        showToast('Cập nhật thông tin học sinh thành công!');
      } else {
        // Create
        const newStu = await StudentRepository.createStudent({
          classId: activeClass.id,
          ownerId: currentUser.uid,
          fullName,
          studentCode,
          dob,
          gender,
          groupId,
          address,
          notes,
        });

        if (parentName.trim() && parentPhone.trim()) {
          await ParentRepository.saveContact({
            classId: activeClass.id,
            ownerId: currentUser.uid,
            studentId: newStu.id,
            fullName: parentName,
            phone: parentPhone,
            type: parentType,
            primary: true,
          });
        }

        showToast(`Đã thêm học sinh ${fullName} vào danh sách!`);
      }

      await refreshActiveData();
      setShowAddModal(false);
    } catch (err: any) {
      showToast('Lỗi khi lưu học sinh: ' + (err.message || ''), 'error');
    }
  };

  const handleDeleteStudent = async () => {
    if (!showDeleteConfirm) return;
    try {
      await StudentRepository.deleteStudent(showDeleteConfirm.id);
      showToast(`Đã xóa học sinh ${showDeleteConfirm.fullName}`, 'info');
      setShowDeleteConfirm(null);
      if (selectedStudentForDetail?.id === showDeleteConfirm.id) {
        setSelectedStudentForDetail(null);
      }
      await refreshActiveData();
    } catch (err: any) {
      showToast('Lỗi khi xóa học sinh: ' + (err.message || ''), 'error');
    }
  };

  // Import handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await ImportExportService.parseStudentFile(file);
      setParsedRows(rows);
    } catch (err: any) {
      showToast('Không thể đọc file: ' + (err.message || 'Lỗi định dạng'), 'error');
    }
  };

  const handleConfirmImport = async () => {
    if (!activeClass || !currentUser) return;
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      showToast('Không có dữ liệu học sinh hợp lệ để nhập', 'error');
      return;
    }

    setImporting(true);
    try {
      const studentPayloads = validRows.map((r) => ({
        fullName: r.fullName,
        studentCode: r.studentCode || '',
        dob: r.dob || '2017-01-01',
        gender: r.gender,
        groupId: r.groupId || 'Tổ 1',
        address: r.address || '',
        notes: r.notes || '',
      }));

      const created = await StudentRepository.batchCreateStudents(activeClass.id, currentUser.uid, studentPayloads);

      // Create parent contacts for those with parent info
      for (let i = 0; i < created.length; i++) {
        const row = validRows[i];
        if (row.parentName && row.parentPhone) {
          await ParentRepository.saveContact({
            classId: activeClass.id,
            ownerId: currentUser.uid,
            studentId: created[i].id,
            type: (row.parentType as any) || 'Bố',
            fullName: row.parentName,
            phone: row.parentPhone,
            email: row.email,
            primary: true,
          });
        }
      }

      showToast(`Đã nhập thành công ${created.length} học sinh vào lớp!`);
      setShowImportModal(false);
      setParsedRows([]);
      await refreshActiveData();
    } catch (err: any) {
      showToast('Lỗi khi nhập danh sách: ' + (err.message || ''), 'error');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Bar / Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-800">
            Danh sách Học sinh ({students.length} em)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Lớp {activeClass?.className || '---'} · Quản lý hồ sơ, phụ huynh & nhóm học tập
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => ImportExportService.downloadTemplate()}
            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            title="Tải tệp mẫu Excel"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Tải mẫu Excel</span>
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="px-3 py-1.5 border border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-600" />
            <span>Nhập Excel</span>
          </button>

          <button
            onClick={() => {
              if (activeClass) {
                ImportExportService.exportStudentsToExcel(activeClass.className, students, parents);
              }
            }}
            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Xuất Excel</span>
          </button>

          <button
            onClick={openAddModal}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>Thêm học sinh</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên học sinh, mã HS, SĐT phụ huynh..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-700"
          >
            <option value="all">Tất cả các Tổ</option>
            <option value="Tổ 1">Tổ 1</option>
            <option value="Tổ 2">Tổ 2</option>
            <option value="Tổ 3">Tổ 3</option>
            <option value="Tổ 4">Tổ 4</option>
          </select>

          <select
            value={selectedGender}
            onChange={(e) => setSelectedGender(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-700"
          >
            <option value="all">Tất cả giới tính</option>
            <option value="nam">Nam</option>
            <option value="nữ">Nữ</option>
          </select>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 w-12 text-center">STT</th>
                <th className="py-3 px-4">Họ và tên</th>
                <th className="py-3 px-4">Mã HS</th>
                <th className="py-3 px-4">Ngày sinh</th>
                <th className="py-3 px-4">Giới tính</th>
                <th className="py-3 px-4">Tổ</th>
                <th className="py-3 px-4">Phụ huynh liên hệ</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 px-4 text-center">
                    {students.length === 0 ? (
                      <EmptyState
                        icon={Users}
                        title="Chưa có học sinh nào trong danh sách lớp"
                        description="Thầy/Cô hãy bắt đầu năm học mới bằng cách thêm từng học sinh hoặc tải lên tệp Excel danh sách lớp có sẵn."
                        action={{
                          label: 'Thêm học sinh đầu tiên',
                          onClick: () => setShowAddModal(true),
                        }}
                      />
                    ) : (
                      <div className="py-8 text-center text-xs text-slate-400">
                        Không tìm thấy học sinh nào khớp với từ khóa tìm kiếm hoặc bộ lọc hiện tại.
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => {
                  const p = parentMap.get(student.id);
                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-emerald-50/30 transition-colors group cursor-pointer"
                      onClick={() => setSelectedStudentForDetail(student)}
                    >
                      <td className="py-3 px-4 text-center font-medium text-slate-400 tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 group-hover:text-emerald-700 flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-800 flex items-center justify-center text-xs font-bold shrink-0 border border-emerald-200/50">
                          {student.fullName.charAt(0)}
                        </div>
                        <span className="font-semibold text-slate-900 group-hover:text-emerald-800 transition-colors">
                          {student.fullName}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-medium font-mono text-xs">
                        {student.studentCode || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 tabular-nums text-xs">
                        {student.dob || '—'}
                      </td>
                      <td className="py-3 px-4 capitalize">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            student.gender === 'nữ'
                              ? 'bg-rose-50/80 text-rose-700 border-rose-200/60'
                              : 'bg-blue-50/80 text-blue-700 border-blue-200/60'
                          }`}
                        >
                          {student.gender}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200/60">
                          {student.groupId || 'Chưa xếp tổ'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {p ? (
                          <div className="text-[11px] leading-snug">
                            <div className="font-semibold text-slate-800">
                              {p.fullName} <span className="font-normal text-slate-400 text-[10px]">({p.type})</span>
                            </div>
                            <div className="text-slate-500 font-mono tracking-tight text-[10px]">
                              {p.phone}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">Chưa có liên hệ</span>
                        )}
                      </td>
                      <td
                        className="py-3 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedStudentForDetail(student)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(student)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Sửa"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(student)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Mobile Card List View */}
      <div className="md:hidden space-y-3">
        {filteredStudents.length === 0 ? (
          <div className="bg-white p-8 text-center text-xs text-slate-400 rounded-2xl border border-slate-200">
            Không tìm thấy học sinh nào
          </div>
        ) : (
          filteredStudents.map((s, idx) => {
            const p = parentMap.get(s.id);
            return (
              <div
                key={s.id}
                onClick={() => setSelectedStudentForDetail(s)}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400">#{idx + 1}</span>
                    <span className="text-sm font-bold text-slate-900">{s.fullName}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                    {s.groupId}
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex items-center justify-between">
                  <span>Mã: {s.studentCode || '-'}</span>
                  <span>Sinh: {s.dob}</span>
                </div>
                {p && (
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">
                      {p.type}: {p.fullName}
                    </span>
                    <a
                      href={`tel:${p.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-emerald-700 font-bold flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{p.phone}</span>
                    </a>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ======================================================== */}
      {/* STUDENT PROFILE DRAWER / MODAL */}
      {/* ======================================================== */}
      {selectedStudentForDetail && (
        <StudentDetailDrawer
          student={selectedStudentForDetail}
          parent={parentMap.get(selectedStudentForDetail.id)}
          onClose={() => setSelectedStudentForDetail(null)}
          onEdit={() => {
            const s = selectedStudentForDetail;
            setSelectedStudentForDetail(null);
            openEditModal(s);
          }}
          onGoToAIComment={() => {
            setSelectedStudentForDetail(null);
            setActiveTab('ai-comments');
          }}
        />
      )}

      {/* ======================================================== */}
      {/* ADD / EDIT STUDENT MODAL */}
      {/* ======================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">
                {editingStudent ? 'Sửa thông tin học sinh' : 'Thêm học sinh mới'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Thông tin học sinh
                </h4>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Họ và tên học sinh *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Minh An"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mã học sinh
                    </label>
                    <input
                      type="text"
                      value={studentCode}
                      onChange={(e) => setStudentCode(e.target.value)}
                      placeholder="HS01"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Ngày sinh
                    </label>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Giới tính
                    </label>
                    <select
                      value={gender}
                      onChange={(e: any) => setGender(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                    >
                      <option value="nam">Nam</option>
                      <option value="nữ">Nữ</option>
                      <option value="khác">Khác</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tổ sinh hoạt
                    </label>
                    <select
                      value={groupId}
                      onChange={(e) => setGroupId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                    >
                      <option value="Tổ 1">Tổ 1</option>
                      <option value="Tổ 2">Tổ 2</option>
                      <option value="Tổ 3">Tổ 3</option>
                      <option value="Tổ 4">Tổ 4</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Địa chỉ cư trú
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Số nhà, đường, phường, quận..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ghi chú đặc điểm cá nhân
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Tính cách, sở thích, lưu ý sức khỏe..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Parent Info */}
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Thông tin phụ huynh chính
                </h4>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mối quan hệ
                    </label>
                    <select
                      value={parentType}
                      onChange={(e: any) => setParentType(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none bg-white"
                    >
                      <option value="Mẹ">Mẹ</option>
                      <option value="Bố">Bố</option>
                      <option value="Người giám hộ">Người giám hộ</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Họ và tên phụ huynh
                    </label>
                    <input
                      type="text"
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      placeholder="Họ và tên"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số điện thoại liên lạc
                  </label>
                  <input
                    type="tel"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    placeholder="0912 345 678"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  {editingStudent ? 'Lưu thay đổi' : 'Thêm học sinh'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DELETE CONFIRM MODAL */}
      {/* ======================================================== */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 border border-slate-200 animate-in fade-in zoom-in-95 duration-100">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-center text-sm font-bold text-slate-900">
              Xóa học sinh khỏi lớp?
            </h3>
            <p className="text-center text-xs text-slate-600 mt-1">
              Thầy/Cô có chắc chắn muốn xóa học sinh{' '}
              <strong className="text-slate-800">{showDeleteConfirm.fullName}</strong>? Dữ liệu
              chuyên cần và đánh giá của học sinh này sẽ bị xóa.
            </p>
            <div className="mt-5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleDeleteStudent}
                className="flex-1 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* EXCEL IMPORT MODAL WITH LIVE PREVIEW */}
      {/* ======================================================== */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Nhập danh sách học sinh từ Excel / CSV
                </h3>
                <p className="text-xs text-slate-500">
                  Hệ thống kiểm tra lỗi định dạng và hiển thị xem trước trước khi lưu
                </p>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setParsedRows([]);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* File selector & Template */}
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-emerald-400 transition-colors">
                <FileSpreadsheet className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">
                  Chọn tệp Excel (.xlsx, .xls) hoặc CSV từ máy tính
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Đảm bảo đúng các cột: STT, Họ và tên, Mã học sinh, Ngày sinh, Giới tính, Tổ...
                </p>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="mt-3 text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                />
              </div>

              {/* Preview table */}
              {parsedRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">
                      Xem trước dữ liệu ({parsedRows.length} dòng phát hiện)
                    </span>
                    <span className="text-emerald-700 font-semibold">
                      {parsedRows.filter((r) => r.isValid).length} dòng hợp lệ
                    </span>
                  </div>

                  <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[10px] uppercase">
                        <tr>
                          <th className="p-2">Dòng</th>
                          <th className="p-2">Họ và tên</th>
                          <th className="p-2">Ngày sinh</th>
                          <th className="p-2">Giới tính</th>
                          <th className="p-2">Tổ</th>
                          <th className="p-2">Phụ huynh</th>
                          <th className="p-2">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedRows.map((r, i) => (
                          <tr
                            key={i}
                            className={r.isValid ? 'bg-white' : 'bg-red-50/50'}
                          >
                            <td className="p-2 text-slate-400">#{r.rowNumber}</td>
                            <td className="p-2 font-medium text-slate-900">{r.fullName || '-'}</td>
                            <td className="p-2 text-slate-600">{r.dob || '-'}</td>
                            <td className="p-2 capitalize">{r.gender}</td>
                            <td className="p-2">{r.groupId}</td>
                            <td className="p-2">
                              {r.parentName ? `${r.parentName} (${r.parentPhone})` : '-'}
                            </td>
                            <td className="p-2">
                              {r.isValid ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600 text-[11px] font-semibold">
                                  <CheckCircle className="w-3.5 h-3.5" /> Hợp lệ
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-red-600 text-[11px] font-semibold" title={r.errors.join(', ')}>
                                  <AlertCircle className="w-3.5 h-3.5" /> {r.errors[0]}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    setParsedRows([]);
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={importing || parsedRows.filter((r) => r.isValid).length === 0}
                  onClick={handleConfirmImport}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  {importing ? 'Đang lưu vào lớp...' : `Xác nhận nhập ${parsedRows.filter((r) => r.isValid).length} học sinh`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ========================================================
// STUDENT PROFILE DRAWER COMPONENT
// ========================================================
interface StudentDetailDrawerProps {
  student: Student;
  parent?: ParentContact;
  onClose: () => void;
  onEdit: () => void;
  onGoToAIComment: () => void;
}

const StudentDetailDrawer: React.FC<StudentDetailDrawerProps> = ({
  student,
  parent,
  onClose,
  onEdit,
  onGoToAIComment,
}) => {
  const { attendanceRecords, assessments, competencies, competitionEntries, journalEntries } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'info' | 'attendance' | 'learning' | 'competition' | 'journal'>('info');
  const [showZaloModal, setShowZaloModal] = useState(false);

  // Student specific data
  const studentAtt = attendanceRecords.filter((r) => r.studentId === student.id);
  const studentAssess = assessments.filter((a) => a.studentId === student.id);
  const studentComp = competencies.filter((c) => c.studentId === student.id);
  const studentEntries = competitionEntries.filter((e) => e.studentId === student.id);
  const studentJournals = journalEntries.filter((j) => j.studentId === student.id);

  const presentCount = studentAtt.filter((r) => r.status === 'present').length;
  const excusedCount = studentAtt.filter((r) => r.status === 'excused_absence').length;
  const unexcusedCount = studentAtt.filter((r) => r.status === 'unexcused_absence').length;
  const lateCount = studentAtt.filter((r) => r.status === 'late').length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200">
        {/* Header */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              {student.fullName.charAt(0)}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{student.fullName}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Mã: {student.studentCode || '---'} · {student.groupId} · Giới tính: {student.gender}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onEdit}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg text-xs font-semibold"
              title="Chỉnh sửa"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-tab navigation */}
        <div className="flex items-center px-4 border-b border-slate-200 bg-white overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab('info')}
            className={`py-3 px-3 border-b-2 transition-colors shrink-0 ${
              activeSubTab === 'info'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Hồ sơ & Phụ huynh
          </button>
          <button
            onClick={() => setActiveSubTab('attendance')}
            className={`py-3 px-3 border-b-2 transition-colors shrink-0 ${
              activeSubTab === 'attendance'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Chuyên cần ({studentAtt.length})
          </button>
          <button
            onClick={() => setActiveSubTab('learning')}
            className={`py-3 px-3 border-b-2 transition-colors shrink-0 ${
              activeSubTab === 'learning'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Học tập ({studentAssess.length})
          </button>
          <button
            onClick={() => setActiveSubTab('competition')}
            className={`py-3 px-3 border-b-2 transition-colors shrink-0 ${
              activeSubTab === 'competition'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Thi đua ({studentEntries.length})
          </button>
          <button
            onClick={() => setActiveSubTab('journal')}
            className={`py-3 px-3 border-b-2 transition-colors shrink-0 ${
              activeSubTab === 'journal'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Nhật ký ({studentJournals.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeSubTab === 'info' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400">Ngày sinh:</span>
                    <p className="font-semibold text-slate-800">{student.dob || '-'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Giới tính:</span>
                    <p className="font-semibold text-slate-800 capitalize">{student.gender}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400">Địa chỉ cư trú:</span>
                    <p className="font-semibold text-slate-800">{student.address || 'Chưa cập nhật'}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400">Ghi chú đặc điểm:</span>
                    <p className="font-semibold text-slate-800">{student.notes || 'Không có ghi chú'}</p>
                  </div>
                </div>
              </div>

              {/* Parent */}
              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-800 font-bold uppercase tracking-wider text-[10px]">
                    Liên hệ Phụ huynh
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowZaloModal(true)}
                    className="px-2.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-[11px] rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  >
                    <MessageCircle className="w-3 h-3 fill-white" />
                    <span>Nhắn Zalo</span>
                  </button>
                </div>
                {parent ? (
                  <div className="space-y-1">
                    <p className="font-bold text-slate-800 text-sm">{parent.fullName} ({parent.type})</p>
                    <p className="text-slate-600 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <a href={`tel:${parent.phone}`} className="font-bold text-emerald-700 hover:underline">
                        {parent.phone}
                      </a>
                    </p>
                    {parent.email && <p className="text-slate-500">Email: {parent.email}</p>}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-slate-400 italic">Chưa có thông tin liên hệ phụ huynh cho học sinh này.</p>
                    <p className="text-[11px] text-blue-600">Bấm "Nhắn Zalo" để nhập SĐT phụ huynh và gửi tin nhắn.</p>
                  </div>
                )}
              </div>

              {/* Quick AI comment trigger */}
              <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-indigo-900">Gợi ý nhận xét AI</h4>
                  <p className="text-[11px] text-indigo-700">Tạo bản thảo nhận xét Thông tư 27 dựa trên dữ liệu thật của em</p>
                </div>
                <button
                  onClick={onGoToAIComment}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Tạo nhận xét</span>
                </button>
              </div>
            </div>
          )}

          {activeSubTab === 'attendance' && (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                  <div className="text-emerald-700 font-bold text-lg">{presentCount}</div>
                  <div className="text-[10px] text-emerald-600">Có mặt</div>
                </div>
                <div className="bg-amber-50 p-2 rounded-lg border border-amber-100">
                  <div className="text-amber-700 font-bold text-lg">{excusedCount}</div>
                  <div className="text-[10px] text-amber-600">Có phép</div>
                </div>
                <div className="bg-red-50 p-2 rounded-lg border border-red-100">
                  <div className="text-red-700 font-bold text-lg">{unexcusedCount}</div>
                  <div className="text-[10px] text-red-600">Không phép</div>
                </div>
                <div className="bg-purple-50 p-2 rounded-lg border border-purple-100">
                  <div className="text-purple-700 font-bold text-lg">{lateCount}</div>
                  <div className="text-[10px] text-purple-600">Đi muộn</div>
                </div>
              </div>

              <div className="space-y-1.5">
                {studentAtt.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400">Chưa có lịch sử điểm danh</p>
                ) : (
                  studentAtt.map((r) => (
                    <div key={r.id} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-slate-800">{r.date}</span>
                        {r.notes && <span className="text-slate-500 ml-2 text-[11px]">- {r.notes}</span>}
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.status === 'present'
                          ? 'bg-emerald-100 text-emerald-800'
                          : r.status === 'excused_absence'
                          ? 'bg-amber-100 text-amber-800'
                          : r.status === 'unexcused_absence'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {r.status === 'present' ? 'Có mặt' : r.status === 'excused_absence' ? 'Có phép' : r.status === 'unexcused_absence' ? 'Không phép' : 'Đi muộn'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeSubTab === 'learning' && (
            <div className="space-y-3">
              {studentAssess.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">Chưa có đánh giá học tập nào</p>
              ) : (
                studentAssess.map((a) => (
                  <div key={a.id} className="p-3 rounded-xl border border-slate-200 bg-white space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{a.subjectId}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        a.level === 'Hoàn thành tốt'
                          ? 'bg-emerald-100 text-emerald-800'
                          : a.level === 'Hoàn thành'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {a.level} {a.score !== undefined ? `(${a.score}đ)` : ''}
                      </span>
                    </div>
                    {a.teacherComment && (
                      <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg">
                        "{a.teacherComment}"
                      </p>
                    )}
                    <span className="text-[10px] text-slate-400">Ngày ghi: {a.date}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {activeSubTab === 'competition' && (
            <div className="space-y-2">
              {studentEntries.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">Chưa có điểm cộng/trừ thi đua cá nhân</p>
              ) : (
                studentEntries.map((e) => (
                  <div key={e.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-800">{e.ruleTitle}</p>
                      {e.note && <p className="text-[11px] text-slate-500">{e.note}</p>}
                      <span className="text-[10px] text-slate-400">{e.date}</span>
                    </div>
                    <span className={`text-xs font-bold ${e.pointDelta > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {e.pointDelta > 0 ? `+${e.pointDelta}` : e.pointDelta} điểm
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {activeSubTab === 'journal' && (
            <div className="space-y-2">
              {studentJournals.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">Chưa có ghi chép nhật ký riêng về học sinh này</p>
              ) : (
                studentJournals.map((j) => (
                  <div key={j.id} className="p-3 rounded-xl border border-slate-200 bg-white space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 capitalize">
                        {j.category}
                      </span>
                      <span className="text-[10px] text-slate-400">{j.date}</span>
                    </div>
                    <p className="text-slate-800 mt-1">{j.content}</p>
                    {j.nextAction && (
                      <p className="text-[11px] text-emerald-700 font-medium">Kế hoạch: {j.nextAction}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Send Zalo Modal */}
      {showZaloModal && (
        <SendZaloModal
          isOpen={showZaloModal}
          onClose={() => setShowZaloModal(false)}
          student={student}
          initialMessage=""
          defaultTopic={`Thông tin học tập & rèn luyện em ${student.fullName}`}
        />
      )}
    </div>
  );
};
