import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  UserProfile,
  ClassInfo,
  Student,
  ParentContact,
  AttendanceRecord,
  Assessment,
  CompetencyEvaluation,
  CompetitionEntry,
  Task,
  TaskCompletion,
  ParentInteraction,
  JournalEntry,
  ClassEvent,
  AttentionSignal,
  NotificationItem,
  TimetableCell,
  SeatingAssignment,
} from '../types';
import { AuthService } from '../services/authService';
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
  TimetableRepository,
  SeatingRepository,
} from '../repositories/dataRepository';

import { SampleDataService } from '../services/sampleDataService';
import { format, isThisWeek, isThisMonth } from 'date-fns';
import { isBirthdayToday } from '../utils/dateUtils';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface AppContextType {
  currentUser: UserProfile | null;
  setCurrentUser: (user: UserProfile | null) => void;
  loadingAuth: boolean;
  classes: ClassInfo[];
  activeClass: ClassInfo | null;
  setActiveClassId: (id: string) => void;
  refreshClasses: () => Promise<void>;
  
  // Data for active class
  students: Student[];
  parents: ParentContact[];
  attendanceRecords: AttendanceRecord[];
  assessments: Assessment[];
  competencies: CompetencyEvaluation[];
  competitionEntries: CompetitionEntry[];
  tasks: Task[];
  taskCompletions: TaskCompletion[];
  parentInteractions: ParentInteraction[];
  journalEntries: JournalEntry[];
  classEvents: ClassEvent[];
  timetable: TimetableCell[];
  seatingAssignments: SeatingAssignment[];
  
  // Computed / Derived
  attentionSignals: AttentionSignal[];
  notifications: NotificationItem[];
  markNotificationRead: (id: string) => void;
  
  // UI states
  activeTab: string;
  setActiveTab: (tab: string) => void;
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  
  // Modals & Navigation
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;
  quickActionTarget: string | null;
  setQuickActionTarget: (target: string | null) => void;
  selectedStudentForDetail: Student | null;
  setSelectedStudentForDetail: (student: Student | null) => void;
  
  // Reload
  refreshActiveData: () => Promise<void>;
  seedDemoClass: () => Promise<void>;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [activeClassId, setActiveClassIdState] = useState<string>(() => {
    return localStorage.getItem('last_selected_class_id') || '';
  });
  const [activeTab, setActiveTabState] = useState<string>('dashboard');
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Class data
  const [students, setStudents] = useState<Student[]>([]);
  const [parents, setParents] = useState<ParentContact[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [competencies, setCompetencies] = useState<CompetencyEvaluation[]>([]);
  const [competitionEntries, setCompetitionEntries] = useState<CompetitionEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskCompletions, setTaskCompletions] = useState<TaskCompletion[]>([]);
  const [parentInteractions, setParentInteractions] = useState<ParentInteraction[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [classEvents, setClassEvents] = useState<ClassEvent[]>([]);
  const [timetable, setTimetable] = useState<TimetableCell[]>([]);
  const [seatingAssignments, setSeatingAssignments] = useState<SeatingAssignment[]>([]);


  // Modals
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [quickActionTarget, setQuickActionTarget] = useState<string | null>(null);
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<Student | null>(null);

  // Read notifications
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('read_notifications') || '[]');
    } catch {
      return [];
    }
  });

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const setActiveClassId = useCallback((id: string) => {
    setActiveClassIdState(id);
    localStorage.setItem('last_selected_class_id', id);
  }, []);

  const setActiveTab = useCallback((tab: string) => {
    setActiveTabState(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Listen to Auth state
  useEffect(() => {
    const unsubscribe = AuthService.onAuth(async (user) => {
      if (user) {
        try {
          const profile = await AuthService.syncUserProfile(user);
          setCurrentUser(profile);
        } catch {
          setCurrentUser({
            uid: user.uid,
            displayName: user.displayName || user.email?.split('@')[0] || 'Giáo viên',
            email: user.email || '',
            role: 'teacher',
          });
        }
      } else {
        // Fallback demo/guest user to ensure teacher can always evaluate without blocker
        const savedDemo = localStorage.getItem('demo_teacher_user');
        if (savedDemo) {
          try {
            setCurrentUser(JSON.parse(savedDemo));
          } catch {
            setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
        }
      }
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch classes when user is authenticated
  const refreshClasses = useCallback(async () => {
    if (!currentUser) {
      setClasses([]);
      return;
    }
    try {
      let cls = await ClassRepository.getClassesByOwner(currentUser.uid);
      if (cls.length === 0 && currentUser.uid.startsWith('guest_teacher_')) {
        const demoId = await SampleDataService.seedDemoData(currentUser.uid, currentUser.displayName);
        cls = await ClassRepository.getClassesByOwner(currentUser.uid);
        setClasses(cls);
        setActiveClassId(demoId);
        setShowOnboarding(false);
        return;
      }
      setClasses(cls);
      if (cls.length > 0) {
        if (!activeClassId || !cls.find((c) => c.id === activeClassId)) {
          setActiveClassId(cls[0].id);
        }
        setShowOnboarding(false);
      } else {
        setShowOnboarding(true);
      }
    } catch (err) {
      console.error('Failed to load classes:', err);
      setShowOnboarding(true);
    }
  }, [currentUser, activeClassId, setActiveClassId]);

  useEffect(() => {
    if (currentUser) {
      refreshClasses();
    }
  }, [currentUser, refreshClasses]);

  const activeClass = classes.find((c) => c.id === activeClassId) || null;

  // Load all child data for active class
  const refreshActiveData = useCallback(async () => {
    if (!currentUser || !activeClassId) {
      setStudents([]);
      setParents([]);
      setAttendanceRecords([]);
      setAssessments([]);
      setCompetencies([]);
      setCompetitionEntries([]);
      setTasks([]);
      setTaskCompletions([]);
      setParentInteractions([]);
      setJournalEntries([]);
      setClassEvents([]);
      return;
    }

    try {
      const [
        stus,
        pts,
        att,
        assess,
        comp,
        entries,
        tsks,
        cmpls,
        interact,
        journals,
        events,
        ttable,
        seating,
      ] = await Promise.all([
        StudentRepository.getStudents(activeClassId, currentUser.uid),
        ParentRepository.getContacts(activeClassId, currentUser.uid),
        AttendanceRepository.getAllAttendance(activeClassId, currentUser.uid),
        LearningRepository.getAssessments(activeClassId, currentUser.uid),
        LearningRepository.getCompetencies(activeClassId, currentUser.uid),
        CompetitionRepository.getEntries(activeClassId, currentUser.uid),
        TaskRepository.getTasks(activeClassId, currentUser.uid),
        TaskRepository.getCompletions(activeClassId, currentUser.uid),
        ParentRepository.getInteractions(activeClassId, currentUser.uid),
        JournalRepository.getEntries(activeClassId, currentUser.uid),
        EventRepository.getEvents(activeClassId, currentUser.uid),
        TimetableRepository.getTimetable(activeClassId, currentUser.uid),
        SeatingRepository.getSeating(activeClassId, currentUser.uid),
      ]);

      const dedupe = <T extends { id: string }>(arr: T[] | undefined): T[] => {
        if (!arr) return [];
        const seen = new Set<string>();
        return arr.filter((item) => {
          if (!item.id || seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        });
      };

      setStudents(dedupe(stus));
      setParents(dedupe(pts));
      setAttendanceRecords(dedupe(att));
      setAssessments(dedupe(assess));
      setCompetencies(dedupe(comp));
      setCompetitionEntries(dedupe(entries));
      setTasks(dedupe(tsks));
      setTaskCompletions(dedupe(cmpls));
      setParentInteractions(dedupe(interact));
      setJournalEntries(dedupe(journals));
      setClassEvents(dedupe(events));
      setTimetable(dedupe(ttable));
      setSeatingAssignments(dedupe(seating));
    } catch (error) {
      console.error('Failed to load active classroom data:', error);
    }
  }, [currentUser, activeClassId]);


  useEffect(() => {
    if (activeClassId && currentUser) {
      refreshActiveData();
    }
  }, [activeClassId, currentUser, refreshActiveData]);

  // Derived: Students requiring teacher attention (Deterministic Rules with Concrete Evidence)
  const attentionSignals: AttentionSignal[] = React.useMemo(() => {
    if (!students.length) return [];
    const signals: AttentionSignal[] = [];

    students.forEach((s) => {
      // 1. Attendance: 2 or more unexcused or 3+ total absences
      const studentAtt = attendanceRecords.filter((r) => r.studentId === s.id);
      const unexcused = studentAtt.filter((r) => r.status === 'unexcused_absence');
      const excused = studentAtt.filter((r) => r.status === 'excused_absence');
      const lates = studentAtt.filter((r) => r.status === 'late');

      if (unexcused.length >= 1 || excused.length >= 3) {
        signals.push({
          id: `sig_${s.id}_absence`,
          studentId: s.id,
          studentName: s.fullName,
          groupId: s.groupId,
          signalType: 'high_absence',
          title: 'Vắng học nhiều buổi',
          description: `Đã vắng ${unexcused.length} buổi không phép, ${excused.length} buổi có phép.`,
          evidence: {
            count: unexcused.length + excused.length,
            dates: [...unexcused, ...excused].map((r) => r.date),
            details: 'Cần liên hệ phụ huynh để nắm tình hình sức khỏe hoặc gia đình.',
          },
        });
      }

      if (lates.length >= 2) {
        signals.push({
          id: `sig_${s.id}_late`,
          studentId: s.id,
          studentName: s.fullName,
          groupId: s.groupId,
          signalType: 'frequent_late',
          title: 'Đi học muộn nhiều lần',
          description: `Đã ghi nhận ${lates.length} buổi đi muộn.`,
          evidence: {
            count: lates.length,
            dates: lates.map((r) => r.date),
            details: 'Cần trao đổi nhẹ nhàng với học sinh và nhắc nhở gia đình chuẩn bị giờ giấc sớm hơn.',
          },
        });
      }

      // 2. Learning: Has "Chưa hoàn thành" assessment or score <= 5
      const studentAssess = assessments.filter((a) => a.studentId === s.id);
      const lowAssess = studentAssess.filter((a) => a.level === 'Chưa hoàn thành' || (a.score !== undefined && a.score <= 5));
      if (lowAssess.length > 0) {
        signals.push({
          id: `sig_${s.id}_learning`,
          studentId: s.id,
          studentName: s.fullName,
          groupId: s.groupId,
          signalType: 'learning_support',
          title: 'Cần hỗ trợ học tập',
          description: `Gặp khó khăn ở ${lowAssess.map((a) => a.subjectId).join(', ')}.`,
          evidence: {
            count: lowAssess.length,
            details: `Đánh giá gần nhất đạt mức Chưa hoàn thành hoặc điểm thấp. Cần kèm thêm trong tiết phụ đạo.`,
          },
        });
      }

      // 3. Outstanding assignments
      const studentCompletions = taskCompletions.filter((c) => c.studentId === s.id && c.completed);
      const completedTaskIds = new Set(studentCompletions.map((c) => c.taskId));
      const overdueTasks = tasks.filter((t) => !completedTaskIds.has(t.id) && t.dueAt < format(new Date(), 'yyyy-MM-dd'));

      if (overdueTasks.length >= 2) {
        signals.push({
          id: `sig_${s.id}_tasks`,
          studentId: s.id,
          studentName: s.fullName,
          groupId: s.groupId,
          signalType: 'uncompleted_tasks',
          title: 'Nhiều nhiệm vụ quá hạn',
          description: `Chưa hoàn thành ${overdueTasks.length} bài tập/nhiệm vụ đã qua hạn nộp.`,
          evidence: {
            count: overdueTasks.length,
            details: overdueTasks.map((t) => t.title).join('; '),
          },
        });
      }
    });

    return signals;
  }, [students, attendanceRecords, assessments, tasks, taskCompletions]);

  // Derived: Notifications
  const notifications: NotificationItem[] = React.useMemo(() => {
    const list: NotificationItem[] = [];
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    // 1. Birthdays
    students.forEach((s) => {
      if (s.dob && isBirthdayToday(s.dob)) {
        list.push({
          id: `bday_${s.id}_today`,
          type: 'birthday',
          title: `Sinh nhật hôm nay: ${s.fullName}`,
          message: `Hôm nay là sinh nhật của em ${s.fullName} (${s.groupId}). Thầy/Cô gửi lời chúc mừng nhé!`,
          date: todayStr,
          read: readNotificationIds.includes(`bday_${s.id}_today`),
          actionRoute: 'birthdays',
        });
      }
    });

    // 2. Urgent Attention Signals
    attentionSignals.slice(0, 3).forEach((sig, idx) => {
      const nid = `sig_${sig.studentId}_${sig.signalType}_${idx}`;
      list.push({
        id: nid,
        type: 'attendance_alert',
        title: `${sig.title}: ${sig.studentName}`,
        message: sig.description,
        date: todayStr,
        read: readNotificationIds.includes(nid),
        actionRoute: 'attention',
      });
    });

    // 3. Tasks due today or tomorrow
    tasks.forEach((t) => {
      if (t.dueAt === todayStr) {
        list.push({
          id: `task_${t.id}`,
          type: 'task_due',
          title: `Nhiệm vụ đến hạn hôm nay: ${t.title}`,
          message: `Nhiệm vụ "${t.title}" đến hạn hôm nay. Thầy/Cô kiểm tra tiến độ học sinh nộp bài.`,
          date: todayStr,
          read: readNotificationIds.includes(`task_${t.id}`),
          actionRoute: 'tasks',
        });
      }
    });

    // Deduplicate notifications by id
    const seenNotifIds = new Set<string>();
    return list.filter((n) => {
      if (seenNotifIds.has(n.id)) return false;
      seenNotifIds.add(n.id);
      return true;
    });
  }, [students, attentionSignals, tasks, readNotificationIds]);

  const markNotificationRead = useCallback((id: string) => {
    setReadNotificationIds((prev) => {
      if (prev.includes(id)) return prev;
      const updated = [...prev, id];
      localStorage.setItem('read_notifications', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const seedDemoClass = useCallback(async () => {
    if (!currentUser) return;
    try {
      showToast('Đang nạp dữ liệu mẫu Lớp 3A1...', 'info');
      const newClassId = await SampleDataService.seedDemoData(currentUser.uid, currentUser.displayName);
      await refreshClasses();
      setActiveClassId(newClassId);
      showToast('Đã nạp thành công bộ dữ liệu mẫu Lớp 3A1!', 'success');
    } catch (err: any) {
      console.error('Seed demo error:', err);
      showToast('Không thể nạp dữ liệu mẫu: ' + (err.message || ''), 'error');
    }
  }, [currentUser, refreshClasses, setActiveClassId, showToast]);

  const logout = useCallback(async () => {
    localStorage.removeItem('demo_teacher_user');
    await AuthService.signOut();
    setCurrentUser(null);
    setClasses([]);
    showToast('Đã đăng xuất tài khoản.', 'info');
  }, [showToast]);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        loadingAuth,
        classes,
        activeClass,
        setActiveClassId,
        refreshClasses,
        students,
        parents,
        attendanceRecords,
        assessments,
        competencies,
        competitionEntries,
        tasks,
        taskCompletions,
        parentInteractions,
        journalEntries,
        classEvents,
        timetable,
        seatingAssignments,
        attentionSignals,
        notifications,
        markNotificationRead,
        activeTab,
        setActiveTab,
        toasts,
        showToast,
        removeToast,
        showOnboarding,
        setShowOnboarding,
        quickActionTarget,
        setQuickActionTarget,
        selectedStudentForDetail,
        setSelectedStudentForDetail,
        refreshActiveData,
        seedDemoClass,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
