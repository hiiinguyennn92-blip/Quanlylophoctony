import {
  ClassRepository,
  StudentRepository,
  ParentRepository,
  AttendanceRepository,
  LearningRepository,
  CompetitionRepository,
  TaskRepository,
  JournalRepository,
  EventRepository,
} from '../repositories/dataRepository';
import { format, subDays } from 'date-fns';

export class SampleDataService {
  public static async seedDemoData(ownerId: string, teacherName: string): Promise<string> {
    // 1. Create Class 3A1
    const newClass = await ClassRepository.createClass({
      ownerId,
      schoolName: 'Trường Tiểu học Chu Văn An',
      schoolYear: '2025 - 2026',
      grade: '3',
      className: '3A1',
      teacherName: teacherName || 'Cô Nguyễn Thị Mai',
      session: 'full_day',
      contactInfo: '0912 345 678',
      expectedStudentCount: 10,
    });

    const classId = newClass.id;

    // 2. 10 realistic Vietnamese primary students
    const sampleStudents = [
      {
        fullName: 'Nguyễn Minh An',
        studentCode: 'HS3A1-01',
        dob: '2017-03-15',
        gender: 'nam' as const,
        groupId: 'Tổ 1',
        address: 'P. Thụy Khuê, Tây Hồ, Hà Nội',
        notes: 'Nhanh nhẹn, thích vẽ tranh và phát biểu',
        parentName: 'Nguyễn Văn Hùng',
        parentPhone: '0903 111 222',
        parentType: 'Bố' as const,
      },
      {
        fullName: 'Trần Bảo Châu',
        studentCode: 'HS3A1-02',
        dob: '2017-09-22',
        gender: 'nữ' as const,
        groupId: 'Tổ 1',
        address: 'P. Bưởi, Tây Hồ, Hà Nội',
        notes: 'Chăm chỉ, viết chữ đẹp, cẩn thận',
        parentName: 'Lê Thu Trang',
        parentPhone: '0904 222 333',
        parentType: 'Mẹ' as const,
      },
      {
        fullName: 'Lê Hoàng Dũng',
        studentCode: 'HS3A1-03',
        dob: '2017-01-10',
        gender: 'nam' as const,
        groupId: 'Tổ 2',
        address: 'P. Yên Phụ, Tây Hồ, Hà Nội',
        notes: 'Toán học tiếp thu nhanh, cần chú ý chữ viết',
        parentName: 'Lê Minh Hải',
        parentPhone: '0905 333 444',
        parentType: 'Bố' as const,
      },
      {
        fullName: 'Phạm Hương Giang',
        studentCode: 'HS3A1-04',
        dob: '2017-05-18',
        gender: 'nữ' as const,
        groupId: 'Tổ 2',
        address: 'P. Quảng An, Tây Hồ, Hà Nội',
        notes: 'Tích cực giúp đỡ bạn, tính toán nhanh',
        parentName: 'Đặng Kim Chi',
        parentPhone: '0906 444 555',
        parentType: 'Mẹ' as const,
      },
      {
        fullName: 'Vũ Đức Hải',
        studentCode: 'HS3A1-05',
        dob: '2017-11-05',
        gender: 'nam' as const,
        groupId: 'Tổ 2',
        address: 'P. Nhật Tân, Tây Hồ, Hà Nội',
        notes: 'Hay đi muộn vài buổi do nhà xa, hiền lành',
        parentName: 'Vũ Quốc Khánh',
        parentPhone: '0907 555 666',
        parentType: 'Bố' as const,
      },
      {
        fullName: 'Hoàng Mai Lan',
        studentCode: 'HS3A1-06',
        dob: '2017-08-30',
        gender: 'nữ' as const,
        groupId: 'Tổ 3',
        address: 'P. Tứ Liên, Tây Hồ, Hà Nội',
        notes: 'Đọc diễn cảm tốt, hát hay, tổ trưởng tổ 3',
        parentName: 'Hoàng Văn Bách',
        parentPhone: '0908 666 777',
        parentType: 'Bố' as const,
      },
      {
        fullName: 'Đỗ Tuấn Kiệt',
        studentCode: 'HS3A1-07',
        dob: '2017-04-12',
        gender: 'nam' as const,
        groupId: 'Tổ 3',
        address: 'P. Xuân La, Tây Hồ, Hà Nội',
        notes: 'Cần kèm thêm phép nhân chia, ngoan ngoãn',
        parentName: 'Trịnh Thị Nga',
        parentPhone: '0909 777 888',
        parentType: 'Mẹ' as const,
      },
      {
        fullName: 'Bùi Thảo Linh',
        studentCode: 'HS3A1-08',
        dob: '2017-12-01',
        gender: 'nữ' as const,
        groupId: 'Tổ 4',
        address: 'P. Nghĩa Đô, Cầu Giấy, Hà Nội',
        notes: 'Sinh nhật tháng này, hoạt bát, vẽ đẹp',
        parentName: 'Bùi Mạnh Dũng',
        parentPhone: '0910 888 999',
        parentType: 'Bố' as const,
      },
      {
        fullName: 'Đặng Quốc Nam',
        studentCode: 'HS3A1-09',
        dob: '2017-07-07',
        gender: 'nam' as const,
        groupId: 'Tổ 4',
        address: 'P. Dịch Vọng, Cầu Giấy, Hà Nội',
        notes: 'Tuần qua nghỉ 2 buổi do ốm có phép',
        parentName: 'Nguyễn Thị Oanh',
        parentPhone: '0911 999 000',
        parentType: 'Mẹ' as const,
      },
      {
        fullName: 'Ngô Phương Thảo',
        studentCode: 'HS3A1-10',
        dob: '2017-02-28',
        gender: 'nữ' as const,
        groupId: 'Tổ 4',
        address: 'P. Mai Dịch, Cầu Giấy, Hà Nội',
        notes: 'Lớp phó học tập, gương mẫu, trách nhiệm cao',
        parentName: 'Ngô Việt Hưng',
        parentPhone: '0912 000 111',
        parentType: 'Bố' as const,
      },
    ];

    // Seed students & parent contacts
    const createdStudents = [];
    for (const item of sampleStudents) {
      const student = await StudentRepository.createStudent({
        classId,
        ownerId,
        fullName: item.fullName,
        studentCode: item.studentCode,
        dob: item.dob,
        gender: item.gender,
        groupId: item.groupId,
        address: item.address,
        notes: item.notes,
      });
      createdStudents.push(student);

      await ParentRepository.saveContact({
        classId,
        ownerId,
        studentId: student.id,
        type: item.parentType,
        fullName: item.parentName,
        phone: item.parentPhone,
        primary: true,
      });
    }

    // 3. Attendance for past 5 weekdays
    const today = new Date();
    for (let i = 0; i < 5; i++) {
      const dayDate = format(subDays(today, i), 'yyyy-MM-dd');
      const records = createdStudents.map((s, idx) => {
        // Diverse realistic states
        let status: 'present' | 'excused_absence' | 'unexcused_absence' | 'late' = 'present';
        if (s.studentCode === 'HS3A1-05' && i === 1) {
          status = 'late';
        } else if (s.studentCode === 'HS3A1-09' && (i === 0 || i === 1)) {
          status = 'excused_absence';
        } else if (s.studentCode === 'HS3A1-07' && i === 3) {
          status = 'unexcused_absence';
        }
        return {
          studentId: s.id,
          status,
          notes: status === 'excused_absence' ? 'Phụ huynh xin nghỉ do sốt nhẹ' : status === 'late' ? 'Kẹt xe đường Yên Phụ' : '',
        };
      });
      await AttendanceRepository.saveAttendanceBatch(classId, ownerId, dayDate, records);
    }

    // 4. Learning Assessments
    const todayStr = format(today, 'yyyy-MM-dd');
    for (const s of createdStudents) {
      // Math
      await LearningRepository.saveAssessment({
        classId,
        ownerId,
        studentId: s.id,
        subjectId: 'Toán',
        date: todayStr,
        level: s.studentCode === 'HS3A1-07' ? 'Chưa hoàn thành' : s.studentCode === 'HS3A1-03' ? 'Hoàn thành tốt' : 'Hoàn thành',
        score: s.studentCode === 'HS3A1-07' ? 5 : s.studentCode === 'HS3A1-03' ? 10 : 8,
        assessmentType: 'thường xuyên',
        teacherComment: s.studentCode === 'HS3A1-07' ? 'Cần ôn thêm bảng cửu chương 6, 7' : 'Nắm chắc kiến thức bài học',
      });

      // Vietnamese
      await LearningRepository.saveAssessment({
        classId,
        ownerId,
        studentId: s.id,
        subjectId: 'Tiếng Việt',
        date: todayStr,
        level: s.studentCode === 'HS3A1-02' ? 'Hoàn thành tốt' : 'Hoàn thành',
        score: s.studentCode === 'HS3A1-02' ? 9.5 : 8,
        assessmentType: 'thường xuyên',
        teacherComment: 'Đọc to rõ ràng, trình bày sạch đẹp',
      });
    }

    // 5. Competition Entries
    await CompetitionRepository.addEntry({
      classId,
      ownerId,
      groupId: 'Tổ 1',
      ruleTitle: 'Xếp hàng ngay ngắn, vệ sinh sạch',
      pointDelta: 5,
      date: todayStr,
      note: 'Tổ 1 giữ trật tự và hoàn thành tốt 15 phút đầu giờ',
    });
    await CompetitionRepository.addEntry({
      classId,
      ownerId,
      groupId: 'Tổ 2',
      ruleTitle: 'Hăng hái phát biểu xây dựng bài',
      pointDelta: 8,
      date: todayStr,
      note: 'Nhiều bạn giơ tay phát biểu môn Toán',
    });
    await CompetitionRepository.addEntry({
      classId,
      ownerId,
      studentId: createdStudents[0].id,
      ruleTitle: 'Giúp đỡ bạn trong giờ ra chơi',
      pointDelta: 3,
      date: todayStr,
      note: 'Minh An hỗ trợ bạn nhặt đồ rơi',
    });

    // 6. Tasks
    const t1 = await TaskRepository.createTask({
      classId,
      ownerId,
      title: 'Chuẩn bị bài Tập làm văn: Kể về người thân',
      description: 'Lập dàn ý ngắn vào vở nháp, chuẩn bị 1 bức ảnh gia đình',
      type: 'bài tập',
      assignedAt: todayStr,
      dueAt: format(subDays(today, -2), 'yyyy-MM-dd'),
      audience: 'all',
    });
    // Mark completion for 8 of 10 students
    for (let i = 0; i < 8; i++) {
      await TaskRepository.toggleCompletion(classId, ownerId, t1.id, createdStudents[i].id, true);
    }

    const t2 = await TaskRepository.createTask({
      classId,
      ownerId,
      title: 'Mang đất nặn và kéo thủ công môn Mĩ thuật',
      description: 'Dụng cụ tạo hình con vật theo nhóm',
      type: 'chuẩn bị đồ dùng',
      assignedAt: todayStr,
      dueAt: format(subDays(today, -1), 'yyyy-MM-dd'),
      audience: 'all',
    });
    for (let i = 0; i < 9; i++) {
      await TaskRepository.toggleCompletion(classId, ownerId, t2.id, createdStudents[i].id, true);
    }

    // 7. Journal entries
    await JournalRepository.createEntry({
      classId,
      ownerId,
      studentId: createdStudents[6].id,
      category: 'cần quan tâm',
      content: 'Tuấn Kiệt hôm nay còn lúng túng khi làm bài tập tính giá trị biểu thức. Đã dặn bạn Hoàng Dũng kèm thêm ở bàn.',
      nextAction: 'Theo dõi sự tiến bộ trong tiết luyện tập ngày mai',
      date: todayStr,
    });
    await JournalRepository.createEntry({
      classId,
      ownerId,
      category: 'hoạt động lớp',
      content: 'Tiết sinh hoạt sao nhi đồng diễn ra sôi nổi, các em tham gia hát múa hào hứng.',
      date: todayStr,
    });

    // 8. Class Events
    await EventRepository.createEvent({
      classId,
      ownerId,
      title: 'Họp Phụ huynh Định kỳ Đầu Học kì II',
      type: 'họp phụ huynh',
      date: format(subDays(today, -5), 'yyyy-MM-dd'),
      startTime: '08:30',
      endTime: '10:30',
      location: 'Phòng học lớp 3A1 (Tầng 2)',
      description: 'Báo cáo tình hình học kỳ I và phương hướng học tập học kỳ II',
      participants: 'Toàn thể phụ huynh lớp 3A1',
    });
    await EventRepository.createEvent({
      classId,
      ownerId,
      title: 'Tham quan Trải nghiệm Lăng Bác & Bảo tàng Lịch sử',
      type: 'trải nghiệm',
      date: format(subDays(today, -14), 'yyyy-MM-dd'),
      startTime: '07:30',
      endTime: '16:00',
      location: 'Quảng trường Ba Đình & Bảo tàng Lịch sử Quốc gia',
      description: 'Hoạt động ngoại khóa giáo dục truyền thống',
      participants: 'Giáo viên và học sinh toàn khối 3',
    });

    return classId;
  }
}
