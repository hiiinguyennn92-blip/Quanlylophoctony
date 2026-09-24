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
import { ClassInfo } from '../types';

export interface BackupDataPayload {
  schemaVersion: string;
  exportedAt: string;
  appVersion: string;
  ownerId: string;
  classes: ClassInfo[];
  students: any[];
  parentContacts: any[];
  attendanceRecords: any[];
  assessments: any[];
  competencies: any[];
  competitionEntries: any[];
  tasks: any[];
  taskCompletions: any[];
  parentInteractions: any[];
  journalEntries: any[];
  classEvents: any[];
}

export class BackupService {
  public static async exportWorkspaceBackup(ownerId: string): Promise<string> {
    const classes = await ClassRepository.getClassesByOwner(ownerId);
    let allStudents: any[] = [];
    let allParents: any[] = [];
    let allAttendance: any[] = [];
    let allAssessments: any[] = [];
    let allCompetencies: any[] = [];
    let allCompetition: any[] = [];
    let allTasks: any[] = [];
    let allCompletions: any[] = [];
    let allInteractions: any[] = [];
    let allJournals: any[] = [];
    let allEvents: any[] = [];

    for (const c of classes) {
      const students = await StudentRepository.getStudents(c.id, ownerId);
      allStudents = allStudents.concat(students);

      const parents = await ParentRepository.getContacts(c.id, ownerId);
      allParents = allParents.concat(parents);

      const att = await AttendanceRepository.getAllAttendance(c.id, ownerId);
      allAttendance = allAttendance.concat(att);

      const assess = await LearningRepository.getAssessments(c.id, ownerId);
      allAssessments = allAssessments.concat(assess);

      const comp = await LearningRepository.getCompetencies(c.id, ownerId);
      allCompetencies = allCompetencies.concat(comp);

      const entries = await CompetitionRepository.getEntries(c.id, ownerId);
      allCompetition = allCompetition.concat(entries);

      const tasks = await TaskRepository.getTasks(c.id, ownerId);
      allTasks = allTasks.concat(tasks);

      const completions = await TaskRepository.getCompletions(c.id, ownerId);
      allCompletions = allCompletions.concat(completions);

      const interactions = await ParentRepository.getInteractions(c.id, ownerId);
      allInteractions = allInteractions.concat(interactions);

      const journals = await JournalRepository.getEntries(c.id, ownerId);
      allJournals = allJournals.concat(journals);

      const events = await EventRepository.getEvents(c.id, ownerId);
      allEvents = allEvents.concat(events);
    }

    const payload: BackupDataPayload = {
      schemaVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      appVersion: '1.0.0',
      ownerId,
      classes,
      students: allStudents,
      parentContacts: allParents,
      attendanceRecords: allAttendance,
      assessments: allAssessments,
      competencies: allCompetencies,
      competitionEntries: allCompetition,
      tasks: allTasks,
      taskCompletions: allCompletions,
      parentInteractions: allInteractions,
      journalEntries: allJournals,
      classEvents: allEvents,
    };

    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sao_Luu_Tro_Ly_Chu_Nhiem_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    localStorage.setItem('last_backup_timestamp', new Date().toISOString());
    return payload.exportedAt;
  }

  public static validateBackupFile(content: string): { valid: boolean; summary?: any; error?: string } {
    try {
      const data = JSON.parse(content);
      if (!data || typeof data !== 'object') {
        return { valid: false, error: 'Tệp không phải định dạng JSON hợp lệ.' };
      }
      if (!data.schemaVersion || !data.classes || !Array.isArray(data.classes)) {
        return { valid: false, error: 'Cấu trúc tệp sao lưu không đúng định dạng chuẩn hệ thống.' };
      }

      return {
        valid: true,
        summary: {
          exportedAt: data.exportedAt,
          schemaVersion: data.schemaVersion,
          classCount: data.classes.length,
          studentCount: Array.isArray(data.students) ? data.students.length : 0,
          attendanceCount: Array.isArray(data.attendanceRecords) ? data.attendanceRecords.length : 0,
          taskCount: Array.isArray(data.tasks) ? data.tasks.length : 0,
        },
      };
    } catch (e: any) {
      return { valid: false, error: 'Không thể đọc tệp JSON: ' + (e.message || 'Lỗi cú pháp') };
    }
  }

  public static async restoreFromBackup(content: string, currentOwnerId: string): Promise<{ classesRestored: number; studentsRestored: number }> {
    const data: BackupDataPayload = JSON.parse(content);
    if (!data.classes || !Array.isArray(data.classes)) {
      throw new Error('Dữ liệu khôi phục không hợp lệ: thiếu danh sách lớp');
    }

    const classIdMap = new Map<string, string>();
    const studentIdMap = new Map<string, string>();
    const taskIdMap = new Map<string, string>();

    // 1. Restore classes
    for (const c of data.classes) {
      const newClass = await ClassRepository.createClass({
        ownerId: currentOwnerId,
        schoolName: c.schoolName || '',
        schoolYear: c.schoolYear || '',
        grade: c.grade || '1',
        className: c.className || '',
        teacherName: c.teacherName || '',
        session: c.session || 'full_day',
        contactInfo: c.contactInfo,
        expectedStudentCount: c.expectedStudentCount,
      });
      classIdMap.set(c.id, newClass.id);
    }

    // 2. Restore students
    if (Array.isArray(data.students)) {
      for (const s of data.students) {
        const mappedClassId = classIdMap.get(s.classId) || s.classId;
        const newStudent = await StudentRepository.createStudent({
          classId: mappedClassId,
          ownerId: currentOwnerId,
          fullName: s.fullName,
          studentCode: s.studentCode || '',
          dob: s.dob || '2017-01-01',
          gender: s.gender || 'nam',
          groupId: s.groupId || 'Tổ 1',
          address: s.address,
          notes: s.notes,
        });
        studentIdMap.set(s.id, newStudent.id);
      }
    }

    // 3. Restore parent contacts
    if (Array.isArray(data.parentContacts)) {
      for (const p of data.parentContacts) {
        const mappedClassId = classIdMap.get(p.classId) || p.classId;
        const mappedStudentId = studentIdMap.get(p.studentId) || p.studentId;
        await ParentRepository.saveContact({
          classId: mappedClassId,
          ownerId: currentOwnerId,
          studentId: mappedStudentId,
          fullName: p.fullName,
          phone: p.phone,
          email: p.email,
          type: (p.type as any) || 'Phụ huynh',
          primary: p.primary !== false,
        });
      }
    }

    // 4. Restore attendance records
    if (Array.isArray(data.attendanceRecords)) {
      // Group by classId and date for batching
      const attGrouped = new Map<string, Array<{ studentId: string; status: any; notes?: string }>>();
      for (const a of data.attendanceRecords) {
        const mappedClassId = classIdMap.get(a.classId) || a.classId;
        const mappedStudentId = studentIdMap.get(a.studentId) || a.studentId;
        const key = `${mappedClassId}_${a.date}`;
        if (!attGrouped.has(key)) {
          attGrouped.set(key, []);
        }
        attGrouped.get(key)!.push({
          studentId: mappedStudentId,
          status: a.status,
          notes: a.notes,
        });
      }

      for (const [key, records] of attGrouped.entries()) {
        const [cId, dStr] = key.split('_');
        await AttendanceRepository.saveAttendanceBatch(cId, currentOwnerId, dStr, records);
      }
    }

    // 5. Restore assessments
    if (Array.isArray(data.assessments)) {
      for (const ass of data.assessments) {
        const mappedClassId = classIdMap.get(ass.classId) || ass.classId;
        const mappedStudentId = studentIdMap.get(ass.studentId) || ass.studentId;
        await LearningRepository.saveAssessment({
          classId: mappedClassId,
          ownerId: currentOwnerId,
          studentId: mappedStudentId,
          subjectId: ass.subjectId,
          date: ass.date || new Date().toISOString().slice(0, 10),
          level: ass.level,
          score: ass.score,
          assessmentType: ass.assessmentType || 'thường xuyên',
          teacherComment: ass.teacherComment || ass.comment || '',
        });
      }
    }

    // 6. Restore competency evaluations
    if (Array.isArray(data.competencies)) {
      for (const comp of data.competencies) {
        const mappedClassId = classIdMap.get(comp.classId) || comp.classId;
        const mappedStudentId = studentIdMap.get(comp.studentId) || comp.studentId;
        await LearningRepository.saveCompetency({
          classId: mappedClassId,
          ownerId: currentOwnerId,
          studentId: mappedStudentId,
          period: comp.period,
          type: comp.type,
          criterion: comp.criterion,
          level: comp.level,
          note: comp.note,
        });
      }
    }

    // 7. Restore competition entries
    if (Array.isArray(data.competitionEntries)) {
      for (const entry of data.competitionEntries) {
        const mappedClassId = classIdMap.get(entry.classId) || entry.classId;
        const mappedStudentId = entry.studentId ? (studentIdMap.get(entry.studentId) || entry.studentId) : undefined;
        await CompetitionRepository.addEntry({
          classId: mappedClassId,
          ownerId: currentOwnerId,
          date: entry.date,
          groupId: entry.groupId,
          studentId: mappedStudentId,
          pointDelta: entry.pointDelta,
          ruleTitle: entry.ruleTitle || entry.reason || 'Thi đua nề nếp',
          note: entry.note,
        });
      }
    }

    // 8. Restore tasks
    if (Array.isArray(data.tasks)) {
      for (const t of data.tasks) {
        const mappedClassId = classIdMap.get(t.classId) || t.classId;
        const createdTask = await TaskRepository.createTask({
          classId: mappedClassId,
          ownerId: currentOwnerId,
          title: t.title,
          description: t.description,
          dueAt: t.dueAt,
          type: t.type || 'nhiệm vụ học tập',
          subject: t.subject,
        });
        taskIdMap.set(t.id, createdTask.id);
      }
    }

    // 9. Restore task completions
    if (Array.isArray(data.taskCompletions)) {
      for (const tc of data.taskCompletions) {
        const mappedClassId = classIdMap.get(tc.classId) || tc.classId;
        const mappedTaskId = taskIdMap.get(tc.taskId) || tc.taskId;
        const mappedStudentId = studentIdMap.get(tc.studentId) || tc.studentId;
        await TaskRepository.toggleCompletion(
          mappedClassId,
          currentOwnerId,
          mappedTaskId,
          mappedStudentId,
          !!tc.completed
        );
      }
    }

    // 10. Restore parent interactions
    if (Array.isArray(data.parentInteractions)) {
      for (const pi of data.parentInteractions) {
        const mappedClassId = classIdMap.get(pi.classId) || pi.classId;
        const mappedStudentId = studentIdMap.get(pi.studentId) || pi.studentId;
        await ParentRepository.createInteraction({
          classId: mappedClassId,
          ownerId: currentOwnerId,
          studentId: mappedStudentId,
          date: pi.date,
          contactName: pi.contactName || 'Phụ huynh',
          phone: pi.phone || '',
          type: (pi.type as any) || 'Sổ liên lạc',
          summary: pi.summary || pi.content || '',
          status: (pi.status as any) || 'Hoàn thành',
          followUpNeeded: !!pi.followUpNeeded,
        });
      }
    }

    // 11. Restore journal entries
    if (Array.isArray(data.journalEntries)) {
      for (const j of data.journalEntries) {
        const mappedClassId = classIdMap.get(j.classId) || j.classId;
        await JournalRepository.createEntry({
          classId: mappedClassId,
          ownerId: currentOwnerId,
          date: j.date,
          category: j.category || 'hoạt động lớp',
          content: j.content,
          nextAction: j.nextAction || j.actionTaken || '',
        });
      }
    }

    // 12. Restore events
    if (Array.isArray(data.classEvents)) {
      for (const ev of data.classEvents) {
        const mappedClassId = classIdMap.get(ev.classId) || ev.classId;
        await EventRepository.createEvent({
          classId: mappedClassId,
          ownerId: currentOwnerId,
          title: ev.title,
          description: ev.description,
          date: ev.date,
          type: ev.type,
          location: ev.location,
        });
      }
    }

    return {
      classesRestored: data.classes.length,
      studentsRestored: Array.isArray(data.students) ? data.students.length : 0,
    };
  }

  public static async exportClassBackup(classId: string, className: string, ownerId: string): Promise<void> {
    const students = await StudentRepository.getStudents(classId, ownerId);
    const parents = await ParentRepository.getContacts(classId, ownerId);
    const attendance = await AttendanceRepository.getAllAttendance(classId, ownerId);
    const assessments = await LearningRepository.getAssessments(classId, ownerId);
    const competencies = await LearningRepository.getCompetencies(classId, ownerId);
    const competition = await CompetitionRepository.getEntries(classId, ownerId);
    const tasks = await TaskRepository.getTasks(classId, ownerId);
    const completions = await TaskRepository.getCompletions(classId, ownerId);
    const interactions = await ParentRepository.getInteractions(classId, ownerId);
    const journals = await JournalRepository.getEntries(classId, ownerId);
    const events = await EventRepository.getEvents(classId, ownerId);

    const classes = await ClassRepository.getClassesByOwner(ownerId);
    const currentClass = classes.find((c) => c.id === classId) || {
      id: classId,
      ownerId,
      className,
      grade: '1',
      schoolName: 'Tiểu học',
      schoolYear: '2025 - 2026',
      teacherName: 'Giáo viên',
    };

    const payload: BackupDataPayload = {
      schemaVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      appVersion: '1.0.0',
      ownerId,
      classes: [currentClass as any],
      students,
      parentContacts: parents,
      attendanceRecords: attendance,
      assessments,
      competencies,
      competitionEntries: competition,
      tasks,
      taskCompletions: completions,
      parentInteractions: interactions,
      journalEntries: journals,
      classEvents: events,
    };

    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SaoLuu_Lop_${className || classId}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  public static async importClassBackup(file: File, classId: string, ownerId: string): Promise<void> {
    const text = await file.text();
    await BackupService.restoreFromBackup(text, ownerId);
  }
}

