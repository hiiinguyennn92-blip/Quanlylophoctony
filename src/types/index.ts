export type UserRole = 'teacher' | 'admin';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role?: UserRole;
  photoURL?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClassInfo {
  id: string;
  ownerId: string;
  schoolName: string;
  schoolYear: string;
  grade: string; // 1, 2, 3, 4, 5
  className: string; // 1A1, 3A2, 5B...
  teacherName: string;
  session: 'morning' | 'afternoon' | 'full_day';
  contactInfo?: string;
  expectedStudentCount?: number;
  actualStudentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export type Gender = 'nam' | 'nữ' | 'khác';

export interface Student {
  id: string;
  classId: string;
  ownerId: string;
  studentCode: string; // Mã học sinh
  fullName: string;
  dob: string; // YYYY-MM-DD
  gender: Gender;
  address?: string;
  avatarUrl?: string;
  groupId: string; // Tổ 1, Tổ 2, Tổ 3, Tổ 4, ...
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ParentContact {
  id: string;
  studentId: string;
  classId: string;
  ownerId: string;
  type: 'Bố' | 'Mẹ' | 'Người giám hộ' | 'Khác';
  fullName: string;
  phone: string;
  email?: string;
  primary: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AttendanceStatus = 'present' | 'excused_absence' | 'unexcused_absence' | 'late';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  classId: string;
  ownerId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  id: string;
  classId?: string;
  ownerId?: string;
  name: string;
  code: string;
  order: number;
}

export type AssessmentLevel = 'Hoàn thành tốt' | 'Hoàn thành' | 'Chưa hoàn thành';

export interface Assessment {
  id: string;
  studentId: string;
  classId: string;
  ownerId: string;
  subjectId: string;
  date: string; // YYYY-MM-DD
  score?: number; // thang điểm 10 (nếu có bài kiểm tra)
  level: AssessmentLevel;
  teacherComment?: string;
  assessmentType: 'thường xuyên' | 'định kỳ giữa kì' | 'định kỳ cuối kì';
  createdAt: string;
  updatedAt: string;
}

export type CompetencyQualityType = 'competency' | 'quality';
export type EvaluationLevel = 'Tốt' | 'Đạt' | 'Cần cố gắng';

export interface CompetencyEvaluation {
  id: string;
  studentId: string;
  classId: string;
  ownerId: string;
  criterion: string; // Tự chủ & tự học, Giao tiếp & hợp tác, Chăm chỉ, v.v.
  type: CompetencyQualityType;
  period: 'Giữa học kì 1' | 'Cuối học kì 1' | 'Giữa học kì 2' | 'Cuối năm học';
  level: EvaluationLevel;
  note?: string;
  evaluator?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompetitionRule {
  id: string;
  classId: string;
  ownerId: string;
  title: string;
  points: number; // +1, +2, -1, v.v.
  type: 'positive' | 'negative';
  active: boolean;
  description?: string;
}

export interface CompetitionEntry {
  id: string;
  classId: string;
  ownerId: string;
  studentId?: string; // nếu là điểm cá nhân
  groupId?: string; // nếu là điểm cộng tổ
  ruleId?: string;
  ruleTitle: string;
  pointDelta: number;
  date: string; // YYYY-MM-DD
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export type TaskType = 'bài tập' | 'nhiệm vụ học tập' | 'chuẩn bị đồ dùng' | 'nộp sản phẩm' | 'phụ huynh hỗ trợ';

export interface Task {
  id: string;
  classId: string;
  ownerId: string;
  title: string;
  description?: string;
  subject?: string;
  targetGroup?: string;
  type?: TaskType;
  assignedAt?: string; // YYYY-MM-DD
  dueAt: string; // YYYY-MM-DD
  audience?: 'all' | string; // 'all' hoặc tên nhóm/học sinh
  createdAt: string;
  updatedAt: string;
}

export interface TaskCompletion {
  id: string;
  classId: string;
  ownerId: string;
  taskId: string;
  studentId: string;
  completed: boolean;
  completedAt?: string;
  updatedAt: string;
}

export interface ParentInteraction {
  id: string;
  classId: string;
  ownerId: string;
  studentId: string;
  contactName: string;
  phone: string;
  type: 'Gọi điện' | 'Tin nhắn' | 'Gặp trực tiếp' | 'Sổ liên lạc';
  summary: string;
  status: 'Hoàn thành' | 'Cần theo dõi thêm';
  followUpNeeded: boolean;
  date: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
}

export type JournalCategory =
  | 'tiến bộ'
  | 'cần quan tâm'
  | 'trao đổi phụ huynh'
  | 'hoạt động lớp'
  | 'tình huống'
  | 'kế hoạch'
  | 'khen ngợi'
  | 'nhắc nhở nề nếp'
  | 'sự cố va chạm'
  | 'sức khỏe y tế'
  | 'khác'
  | string;

export interface JournalEntry {
  id: string;
  classId: string;
  ownerId: string;
  studentId?: string;
  category: JournalCategory;
  content: string;
  nextAction?: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
}

export type ClassEventType =
  | 'họp phụ huynh'
  | 'ngoại khóa'
  | 'sinh hoạt lớp'
  | 'thi'
  | 'kiểm tra'
  | 'trải nghiệm'
  | 'ngày hội'
  | 'tham quan'
  | 'trường'
  | 'lớp'
  | 'dã ngoại'
  | 'thi đua'
  | 'khác'
  | string;

export interface ClassEvent {
  id: string;
  classId: string;
  ownerId: string;
  title: string;
  type: ClassEventType;
  date: string; // YYYY-MM-DD
  startTime?: string;
  endTime?: string;
  location?: string;
  description?: string;
  participants?: string;
  notes?: string;
  reminderDaysBefore?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AttentionSignal {
  id?: string;
  studentId: string;
  studentName: string;
  groupId: string;
  signalType: 'high_absence' | 'frequent_late' | 'learning_support' | 'uncompleted_tasks';
  title: string;
  description: string;
  signals?: string[];
  recommendations?: string[];
  evidence?: {
    dates?: string[];
    count?: number;
    details?: string;
  };
}

export interface TimetableCell {
  id: string;
  classId: string;
  ownerId: string;
  dayOfWeek: string;
  period: number;
  session: 'morning' | 'afternoon';
  subject: string;
  updatedAt: string;
}

export interface TimetablePeriod {
  period: number;
  session: 'morning' | 'afternoon';
  name?: string;
  time: string; // e.g. "07:30 - 08:05"
  defaultSub?: string;
}

export interface DutyAssignment {
  id: string;
  classId?: string;
  ownerId?: string;
  day: string; // "Thứ Hai", "Thứ Ba"...
  dayKey: string; // "monday", "tuesday"...
  assigneeType: 'group' | 'student';
  assignedGroup?: string; // "Tổ 1", "Tổ 2"...
  assignedStudentIds?: string[];
  tasks: string; // "Quét lớp, lau bảng, đổ rác, kê bàn ghế"
  notes?: string;
  updatedAt?: string;
}

export interface DailyRoutineStep {
  id: string;
  classId?: string;
  ownerId?: string;
  time: string; // "07:15", "07:30"...
  title: string;
  description?: string;
  completedToday?: boolean;
  order?: number;
  updatedAt?: string;
}

export type TimetableDesignStyle = 'cartoon_3d' | 'chibi_pastel' | 'pixel_art' | 'chalkboard' | 'watercolor';

export interface TimetableDesignConfig {
  style: TimetableDesignStyle;
  themeColor: string;
  showTime: boolean;
  showDuty: boolean;
  showMotto: boolean;
  mottoText: string;
  badgeText: string;
  decorations: string[];
}

export type DeskType = 'double' | 'triple' | 'single';

export interface SeatingLayoutConfig {
  id?: string;
  classId?: string;
  ownerId?: string;
  columns: number; // 2, 3, 4, 5
  rows: number; // 3, 4, 5, 6, 7
  deskType: DeskType; // 'double' | 'triple' | 'single'
  teacherDeskPos: 'left' | 'center' | 'right';
  boardTitle?: string;
  showAvatars: boolean;
  showGroupBadge: boolean;
  showSpecialNotes: boolean; // eye/height/leader
  doorPos: 'left' | 'right';
  windowPos: 'left' | 'right';
  aisleWidth?: 'normal' | 'wide' | 'compact';
  themeStyle?: 'chalkboard' | 'modern_wood' | 'pastel_nordic' | 'clean_minimal';
  updatedAt?: string;
}

export interface SeatingAssignment {
  id: string;
  classId: string;
  ownerId: string;
  studentId: string;
  row: number;
  col: number;
  position: 'left' | 'right' | 'middle' | 'single' | string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  type: 'attendance_alert' | 'birthday' | 'task_due' | 'parent_followup';
  title: string;
  message: string;
  date: string;
  read: boolean;
  actionRoute?: string;
}
