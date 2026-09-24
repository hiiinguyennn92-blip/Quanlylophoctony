import * as XLSX from 'xlsx';
import { Student, ParentContact, AttendanceRecord, Assessment } from '../types';

export interface ParsedStudentRow {
  rowNumber: number;
  fullName: string;
  studentCode?: string;
  dob?: string;
  gender: 'nam' | 'nữ' | 'khác';
  groupId?: string;
  parentName?: string;
  parentPhone?: string;
  parentType?: string;
  email?: string;
  address?: string;
  notes?: string;
  errors: string[];
  isValid: boolean;
}

export class ImportExportService {
  public static downloadTemplate() {
    const headers = [
      ['STT', 'Họ và tên', 'Mã học sinh', 'Ngày sinh (YYYY-MM-DD)', 'Giới tính (nam/nữ)', 'Tổ', 'Tên phụ huynh', 'Số điện thoại', 'Email', 'Địa chỉ', 'Ghi chú'],
      [1, 'Nguyễn Văn An', 'HS01', '2017-03-15', 'nam', 'Tổ 1', 'Nguyễn Văn Bình', '0901234567', 'binh@example.com', 'Hà Nội', 'Ngoan ngoãn'],
      [2, 'Trần Thị Mai', 'HS02', '2017-05-20', 'nữ', 'Tổ 2', 'Lê Thị Cúc', '0912345678', 'cuc@example.com', 'Hà Nội', 'Viết chữ đẹp'],
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(headers);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 22 },
      { wch: 14 },
      { wch: 24 },
      { wch: 18 },
      { wch: 10 },
      { wch: 20 },
      { wch: 16 },
      { wch: 22 },
      { wch: 24 },
      { wch: 24 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Mau_Nhap_Hoc_Sinh');
    XLSX.writeFile(wb, 'Mau_Nhap_Danh_Sach_Hoc_Sinh_Tieu_Hoc.xlsx');
  }

  public static async parseStudentFile(file: File): Promise<ParsedStudentRow[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          if (rawRows.length < 2) {
            resolve([]);
            return;
          }

          // Skip header row
          const results: ParsedStudentRow[] = [];

          for (let i = 1; i < rawRows.length; i++) {
            const row = rawRows[i];
            if (!row || row.length === 0 || row.every((c) => c === undefined || c === '')) {
              continue; // Skip empty row
            }

            const fullName = String(row[1] || '').trim();
            const studentCode = String(row[2] || '').trim();
            let rawDob = String(row[3] || '').trim();
            let genderStr = String(row[4] || '').toLowerCase().trim();
            const groupId = String(row[5] || '').trim() || 'Tổ 1';
            const parentName = String(row[6] || '').trim();
            const parentPhone = String(row[7] || '').trim();
            const email = String(row[8] || '').trim();
            const address = String(row[9] || '').trim();
            const notes = String(row[10] || '').trim();

            const errors: string[] = [];

            if (!fullName) {
              errors.push('Họ và tên không được để trống');
            }

            // Normalize gender
            let gender: 'nam' | 'nữ' | 'khác' = 'nam';
            if (genderStr === 'nữ' || genderStr === 'nu' || genderStr === 'female' || genderStr === 'gái') {
              gender = 'nữ';
            } else if (genderStr === 'nam' || genderStr === 'male' || genderStr === 'trai') {
              gender = 'nam';
            } else if (genderStr) {
              gender = 'khác';
            }

            // Normalize DOB if Excel numeric date
            if (typeof row[3] === 'number') {
              const excelDate = new Date((row[3] - (25567 + 2)) * 86400 * 1000);
              if (!isNaN(excelDate.getTime())) {
                rawDob = excelDate.toISOString().split('T')[0];
              }
            }

            if (rawDob && !/^\d{4}-\d{2}-\d{2}$/.test(rawDob)) {
              // Try DD/MM/YYYY
              const parts = rawDob.split(/[/.-]/);
              if (parts.length === 3) {
                if (parts[0].length === 4) {
                  rawDob = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
                } else if (parts[2].length === 4) {
                  rawDob = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
              }
            }

            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
              errors.push('Định dạng email phụ huynh không hợp lệ');
            }

            results.push({
              rowNumber: i + 1,
              fullName,
              studentCode,
              dob: rawDob || '2017-01-01',
              gender,
              groupId,
              parentName,
              parentPhone,
              parentType: 'Bố',
              email,
              address,
              notes,
              errors,
              isValid: errors.length === 0,
            });
          }

          resolve(results);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  }

  public static exportStudentsToExcel(className: string, students: Student[], parents: ParentContact[]) {
    const parentMap = new Map(parents.map((p) => [p.studentId, p]));

    const data: any[][] = [
      [`DANH SÁCH HỌC SINH LỚP ${className.toUpperCase()}`],
      [`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`],
      [],
      ['STT', 'Họ và tên', 'Mã học sinh', 'Ngày sinh', 'Giới tính', 'Tổ', 'Người liên hệ', 'Số điện thoại', 'Địa chỉ', 'Ghi chú'],
    ];

    students.forEach((s, idx) => {
      const p = parentMap.get(s.id);
      data.push([
        idx + 1,
        s.fullName,
        s.studentCode || '',
        s.dob || '',
        s.gender === 'nữ' ? 'Nữ' : 'Nam',
        s.groupId || '',
        p ? `${p.type}: ${p.fullName}` : '',
        p ? p.phone : '',
        s.address || '',
        s.notes || '',
      ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 24 },
      { wch: 14 },
      { wch: 14 },
      { wch: 10 },
      { wch: 10 },
      { wch: 22 },
      { wch: 16 },
      { wch: 26 },
      { wch: 26 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, `HocSinh_${className}`);
    XLSX.writeFile(wb, `Danh_Sach_Hoc_Sinh_${className}.xlsx`);
  }

  public static exportAttendanceToExcel(
    className: string,
    dates: string[],
    students: Student[],
    attendanceRecords: AttendanceRecord[]
  ) {
    const recordMap = new Map<string, AttendanceRecord['status']>();
    attendanceRecords.forEach((r) => {
      recordMap.set(`${r.studentId}_${r.date}`, r.status);
    });

    const headers = ['STT', 'Mã HS', 'Họ và tên', 'Tổ', ...dates.map((d) => d.slice(5))];
    const data: any[][] = [
      [`BẢNG ĐIỂM DANH CHUYÊN CẦN LỚP ${className.toUpperCase()}`],
      [`Kỳ báo cáo: ${dates[0] || ''} đến ${dates[dates.length - 1] || ''}`],
      [],
      headers,
    ];

    students.forEach((s, idx) => {
      const row: any[] = [idx + 1, s.studentCode || '', s.fullName, s.groupId || ''];
      dates.forEach((d) => {
        const st = recordMap.get(`${s.id}_${d}`);
        if (st === 'present') row.push('V');
        else if (st === 'excused_absence') row.push('P');
        else if (st === 'unexcused_absence') row.push('KP');
        else if (st === 'late') row.push('M');
        else row.push('-');
      });
      data.push(row);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, `DiemDanh_${className}`);
    XLSX.writeFile(wb, `Bao_Cao_Diem_Danh_${className}.xlsx`);
  }
}
