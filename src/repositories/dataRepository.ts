import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../services/firebase';
import {
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
  TimetableCell,
  TimetablePeriod,
  DutyAssignment,
  DailyRoutineStep,
  SeatingAssignment,
  SeatingLayoutConfig,
} from '../types';

// Helper to generate consistent IDs if crypto.randomUUID isn't available
function uuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'id_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

/**
 * Checks if the current client is authenticated in Firebase and matches the ownerId.
 * When false (e.g. guest mode, preview sandbox, or offline), the repositories seamlessly
 * use localStorage so teachers can manage classes without unauthenticated Firestore errors.
 */
function shouldUseFirestore(ownerId?: string): boolean {
  if (typeof window === 'undefined') return false;
  if (!auth.currentUser) return false;
  if (ownerId && auth.currentUser.uid !== ownerId) return false;
  return true;
}

/**
 * Local storage engine for guest/sandbox mode when not logged in to Firebase Auth.
 */
const localDb = {
  getCollection<T extends { id?: string }>(col: string, filterFn?: (item: T) => boolean): T[] {
    try {
      const raw = localStorage.getItem(`local_db_${col}`);
      const list: T[] = raw ? JSON.parse(raw) : [];
      return filterFn ? list.filter(filterFn) : list;
    } catch {
      return [];
    }
  },

  setCollection<T>(col: string, list: T[]): void {
    try {
      localStorage.setItem(`local_db_${col}`, JSON.stringify(list));
    } catch (e) {
      console.warn(`localDb setCollection error for ${col}:`, e);
    }
  },

  getItem<T extends { id?: string }>(col: string, id: string): T | null {
    const list = this.getCollection<T>(col);
    return list.find((i) => i.id === id) || null;
  },

  setItem<T extends { id?: string }>(col: string, item: T): void {
    const list = this.getCollection<T>(col);
    const idx = list.findIndex((i) => i.id === item.id);
    if (idx >= 0) {
      list[idx] = item;
    } else {
      list.push(item);
    }
    this.setCollection(col, list);
  },

  updateItem<T extends { id?: string }>(col: string, id: string, updates: Partial<T>): void {
    const list = this.getCollection<T>(col);
    const idx = list.findIndex((i) => i.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...updates };
      this.setCollection(col, list);
    }
  },

  deleteItem(col: string, id: string): void {
    const list = this.getCollection<{ id: string }>(col);
    this.setCollection(
      col,
      list.filter((i) => i.id !== id)
    );
  },

  batchSet<T extends { id?: string }>(col: string, items: T[]): void {
    const list = this.getCollection<T>(col);
    const itemMap = new Map(list.map((i) => [i.id, i]));
    items.forEach((item) => {
      if (item.id) itemMap.set(item.id, item);
    });
    this.setCollection(col, Array.from(itemMap.values()));
  },
};

// ==========================================
// 1. CLASS REPOSITORY
// ==========================================
export class ClassRepository {
  public static async getClassesByOwner(ownerId: string): Promise<ClassInfo[]> {
    const colPath = 'classes';
    if (shouldUseFirestore(ownerId)) {
      try {
        const q = query(collection(db, colPath), where('ownerId', '==', ownerId));
        const snap = await getDocs(q);
        const list: ClassInfo[] = [];
        snap.forEach((d) => list.push({ ...d.data(), id: d.id } as ClassInfo));
        return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, colPath);
      }
    }
    return localDb
      .getCollection<ClassInfo>(colPath, (c) => c.ownerId === ownerId)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }

  public static async createClass(classData: Omit<ClassInfo, 'id' | 'createdAt' | 'updatedAt'>): Promise<ClassInfo> {
    const colPath = 'classes';
    const id = uuid();
    const now = new Date().toISOString();
    const newClass: ClassInfo = {
      ...classData,
      id,
      createdAt: now,
      updatedAt: now,
    };

    if (shouldUseFirestore(classData.ownerId)) {
      try {
        await setDoc(doc(db, colPath, id), newClass);
        return newClass;
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `${colPath}/${id}`);
      }
    }

    localDb.setItem(colPath, newClass);
    return newClass;
  }

  public static async updateClass(id: string, updates: Partial<ClassInfo>): Promise<void> {
    const docPath = `classes/${id}`;
    if (shouldUseFirestore()) {
      try {
        await updateDoc(doc(db, 'classes', id), {
          ...updates,
          updatedAt: new Date().toISOString(),
        });
        return;
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, docPath);
      }
    }
    localDb.updateItem<ClassInfo>('classes', id, { ...updates, updatedAt: new Date().toISOString() });
  }

  public static async deleteClass(id: string): Promise<void> {
    const classCollections = [
      'students',
      'parentContacts',
      'attendanceRecords',
      'assessments',
      'competencyEvaluations',
      'competitionEntries',
      'tasks',
      'taskCompletions',
      'parentInteractions',
      'journalEntries',
      'classEvents',
      'timetable',
      'seatingAssignments',
      'attentionSignals',
    ];

    if (shouldUseFirestore()) {
      try {
        // 1. Cascade delete all dependent records across all collections
        for (const col of classCollections) {
          try {
            const q = query(collection(db, col), where('classId', '==', id));
            const snap = await getDocs(q);
            if (!snap.empty) {
              const docsToDelete = snap.docs;
              for (let i = 0; i < docsToDelete.length; i += 400) {
                const chunk = docsToDelete.slice(i, i + 400);
                const batch = writeBatch(db);
                chunk.forEach((d) => batch.delete(d.ref));
                await batch.commit();
              }
            }
          } catch (colErr) {
            console.warn(`[CascadeDelete] Warning cleaning ${col} for class ${id}:`, colErr);
          }
        }

        // 2. Delete the root class document
        const docPath = `classes/${id}`;
        await deleteDoc(doc(db, 'classes', id));
        return;
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `classes/${id}`);
      }
    }

    // Cascade delete in localDb
    for (const col of classCollections) {
      const remaining = localDb.getCollection<{ id: string; classId?: string }>(
        col,
        (item) => item.classId !== id
      );
      localDb.setCollection(col, remaining);
    }
    localDb.deleteItem('classes', id);
  }
}

// Helper for Firestore batch writes with safe chunking (Firestore limit is 500 ops per batch)
async function commitBatchInChunks<T>(
  items: T[],
  operation: (batch: ReturnType<typeof writeBatch>, item: T) => void,
  chunkSize: number = 400
): Promise<void> {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach((item) => operation(batch, item));
    await batch.commit();
  }
}

// ==========================================
// 2. STUDENT REPOSITORY
// ==========================================
export class StudentRepository {
  public static async getStudents(classId: string, ownerId: string): Promise<Student[]> {
    const colPath = 'students';
    if (shouldUseFirestore(ownerId)) {
      try {
        const q = query(
          collection(db, colPath),
          where('classId', '==', classId),
          where('ownerId', '==', ownerId)
        );
        const snap = await getDocs(q);
        const list: Student[] = [];
        snap.forEach((d) => list.push({ ...d.data(), id: d.id } as Student));
        return list.sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, colPath);
      }
    }
    return localDb
      .getCollection<Student>(colPath, (s) => s.classId === classId && s.ownerId === ownerId)
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'));
  }

  public static async createStudent(data: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<Student> {
    const colPath = 'students';
    const id = uuid();
    const now = new Date().toISOString();
    const student: Student = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };

    if (shouldUseFirestore(data.ownerId)) {
      try {
        await setDoc(doc(db, colPath, id), student);
        return student;
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `${colPath}/${id}`);
      }
    }

    localDb.setItem(colPath, student);
    return student;
  }

  public static async updateStudent(id: string, updates: Partial<Student>): Promise<void> {
    const docPath = `students/${id}`;
    if (shouldUseFirestore()) {
      try {
        await updateDoc(doc(db, 'students', id), {
          ...updates,
          updatedAt: new Date().toISOString(),
        });
        return;
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, docPath);
      }
    }
    localDb.updateItem<Student>('students', id, { ...updates, updatedAt: new Date().toISOString() });
  }

  public static async deleteStudent(id: string): Promise<void> {
    const docPath = `students/${id}`;
    if (shouldUseFirestore()) {
      try {
        await deleteDoc(doc(db, 'students', id));

        // Cascade delete from related collections in Firestore
        const subCollections = [
          'parentContacts',
          'attendanceRecords',
          'assessments',
          'competencyEvaluations',
          'competitionEntries',
          'taskCompletions',
          'parentInteractions',
          'seatingAssignments',
          'attentionSignals',
        ];

        for (const col of subCollections) {
          try {
            const q = query(collection(db, col), where('studentId', '==', id));
            const snap = await getDocs(q);
            if (!snap.empty) {
              const docsToDelete = snap.docs;
              for (let i = 0; i < docsToDelete.length; i += 400) {
                const chunk = docsToDelete.slice(i, i + 400);
                const batch = writeBatch(db);
                chunk.forEach((d) => batch.delete(d.ref));
                await batch.commit();
              }
            }
          } catch (e) {
            console.warn(`Cascade delete warning for ${col}:`, e);
          }
        }
        return;
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, docPath);
      }
    }

    // Cascade delete in localDb
    localDb.deleteItem('students', id);
    const subCollections = [
      'parentContacts',
      'attendanceRecords',
      'assessments',
      'competencyEvaluations',
      'competitionEntries',
      'taskCompletions',
      'parentInteractions',
      'seatingAssignments',
      'attentionSignals',
    ];
    subCollections.forEach((col) => {
      const remaining = localDb.getCollection<{ id: string; studentId?: string }>(col, (item) => item.studentId !== id);
      localDb.setCollection(col, remaining);
    });
  }

  public static async batchCreateStudents(
    classId: string,
    ownerId: string,
    studentsList: Omit<Student, 'id' | 'classId' | 'ownerId' | 'createdAt' | 'updatedAt'>[]
  ): Promise<Student[]> {
    const now = new Date().toISOString();
    const results: Student[] = studentsList.map((s) => ({
      ...s,
      id: uuid(),
      classId,
      ownerId,
      createdAt: now,
      updatedAt: now,
    }));

    if (shouldUseFirestore(ownerId)) {
      try {
        await commitBatchInChunks(results, (batch, student) => {
          const ref = doc(db, 'students', student.id);
          batch.set(ref, student);
        });
        return results;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'students_batch');
      }
    }

    localDb.batchSet('students', results);
    return results;
  }
}

// ==========================================
// 3. PARENT REPOSITORY
// ==========================================
export class ParentRepository {
  public static async getContacts(classId: string, ownerId: string): Promise<ParentContact[]> {
    const colPath = 'parentContacts';
    if (shouldUseFirestore(ownerId)) {
      try {
        const q = query(
          collection(db, colPath),
          where('classId', '==', classId),
          where('ownerId', '==', ownerId)
        );
        const snap = await getDocs(q);
        const list: ParentContact[] = [];
        snap.forEach((d) => list.push({ ...d.data(), id: d.id } as ParentContact));
        return list;
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, colPath);
      }
    }
    return localDb.getCollection<ParentContact>(colPath, (p) => p.classId === classId && p.ownerId === ownerId);
  }

  public static async saveContact(
    data: Omit<ParentContact, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): Promise<ParentContact> {
    const colPath = 'parentContacts';
    const id = data.id || uuid();
    const now = new Date().toISOString();
    const contact: ParentContact = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };

    if (shouldUseFirestore(data.ownerId)) {
      try {
        await setDoc(doc(db, colPath, id), contact);
        return contact;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `${colPath}/${id}`);
      }
    }

    localDb.setItem(colPath, contact);
    return contact;
  }

  public static async deleteContact(id: string): Promise<void> {
    if (shouldUseFirestore()) {
      try {
        await deleteDoc(doc(db, 'parentContacts', id));
        return;
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `parentContacts/${id}`);
      }
    }
    localDb.deleteItem('parentContacts', id);
  }

  public static async getInteractions(classId: string, ownerId: string): Promise<ParentInteraction[]> {
    const colPath = 'parentInteractions';
    if (shouldUseFirestore(ownerId)) {
      try {
        const q = query(
          collection(db, colPath),
          where('classId', '==', classId),
          where('ownerId', '==', ownerId)
        );
        const snap = await getDocs(q);
        const list: ParentInteraction[] = [];
        snap.forEach((d) => list.push({ ...d.data(), id: d.id } as ParentInteraction));
        return list.sort((a, b) => b.date.localeCompare(a.date));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, colPath);
      }
    }
    return localDb
      .getCollection<ParentInteraction>(colPath, (p) => p.classId === classId && p.ownerId === ownerId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  public static async createInteraction(
    data: Omit<ParentInteraction, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ParentInteraction> {
    const colPath = 'parentInteractions';
    const id = uuid();
    const now = new Date().toISOString();
    const item: ParentInteraction = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };

    if (shouldUseFirestore(data.ownerId)) {
      try {
        await setDoc(doc(db, colPath, id), item);
        return item;
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `${colPath}/${id}`);
      }
    }

    localDb.setItem(colPath, item);
    return item;
  }

  public static async saveInteraction(
    data: Omit<ParentInteraction, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ParentInteraction> {
    return this.createInteraction(data);
  }

  public static async deleteInteraction(id: string): Promise<void> {
    if (shouldUseFirestore()) {
      try {
        await deleteDoc(doc(db, 'parentInteractions', id));
        return;
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `parentInteractions/${id}`);
      }
    }
    localDb.deleteItem('parentInteractions', id);
  }
}

// ==========================================
// 4. ATTENDANCE REPOSITORY
// ==========================================
export class AttendanceRepository {
  public static async getAttendanceByDate(
    classId: string,
    ownerId: string,
    date: string
  ): Promise<AttendanceRecord[]> {
    const colPath = 'attendanceRecords';
    if (shouldUseFirestore(ownerId)) {
      try {
        const q = query(
          collection(db, colPath),
          where('classId', '==', classId),
          where('ownerId', '==', ownerId),
          where('date', '==', date)
        );
        const snap = await getDocs(q);
        const list: AttendanceRecord[] = [];
        snap.forEach((d) => list.push({ ...d.data(), id: d.id } as AttendanceRecord));
        return list;
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, colPath);
      }
    }
    return localDb.getCollection<AttendanceRecord>(
      colPath,
      (a) => a.classId === classId && a.ownerId === ownerId && a.date === date
    );
  }

  public static async getAllAttendance(classId: string, ownerId: string): Promise<AttendanceRecord[]> {
    const colPath = 'attendanceRecords';
    if (shouldUseFirestore(ownerId)) {
      try {
        const q = query(
          collection(db, colPath),
          where('classId', '==', classId),
          where('ownerId', '==', ownerId)
        );
        const snap = await getDocs(q);
        const list: AttendanceRecord[] = [];
        snap.forEach((d) => list.push({ ...d.data(), id: d.id } as AttendanceRecord));
        return list;
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, colPath);
      }
    }
    return localDb.getCollection<AttendanceRecord>(colPath, (a) => a.classId === classId && a.ownerId === ownerId);
  }

  public static async saveAttendanceBatch(
    classId: string,
    ownerId: string,
    date: string,
    records: { studentId: string; status: AttendanceRecord['status']; notes?: string }[]
  ): Promise<void> {
    const now = new Date().toISOString();
    const batchRecords: AttendanceRecord[] = records.map((r) => ({
      id: `${classId}_${r.studentId}_${date}`,
      studentId: r.studentId,
      classId,
      ownerId,
      date,
      status: r.status,
      notes: r.notes || '',
      createdAt: now,
      updatedAt: now,
    }));

    if (shouldUseFirestore(ownerId)) {
      try {
        await commitBatchInChunks(batchRecords, (batch, record) => {
          const ref = doc(db, 'attendanceRecords', record.id);
          batch.set(ref, record);
        });
        return;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'attendanceRecords_batch');
      }
    }

    localDb.batchSet('attendanceRecords', batchRecords);
  }
}

// ==========================================
// 5. LEARNING & ASSESSMENT REPOSITORY
// ==========================================
export class LearningRepository {
  public static async getAssessments(classId: string, ownerId: string): Promise<Assessment[]> {
    const colPath = 'assessments';
    if (shouldUseFirestore(ownerId)) {
      try {
        const q = query(
          collection(db, colPath),
          where('classId', '==', classId),
          where('ownerId', '==', ownerId)
        );
        const snap = await getDocs(q);
        const list: Assessment[] = [];
        snap.forEach((d) => list.push({ ...d.data(), id: d.id } as Assessment));
        return list.sort((a, b) => b.date.localeCompare(a.date));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, colPath);
      }
    }
    return localDb
      .getCollection<Assessment>(colPath, (a) => a.classId === classId && a.ownerId === ownerId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  public static async saveAssessment(
    data: Omit<Assessment, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): Promise<Assessment> {
    const colPath = 'assessments';
    const id = data.id || uuid();
    const now = new Date().toISOString();
    const item: Assessment = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };

    if (shouldUseFirestore(data.ownerId)) {
      try {
        await setDoc(doc(db, colPath, id), item);
        return item;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `${colPath}/${id}`);
      }
    }

    localDb.setItem(colPath, item);
    return item;
  }

  public static async saveAssessmentBatch(
    classId: string,
    ownerId: string,
    assessmentsList: Array<Omit<Assessment, 'id' | 'classId' | 'ownerId' | 'createdAt' | 'updatedAt'> & { id?: string }>
  ): Promise<Assessment[]> {
    const colPath = 'assessments';
    const now = new Date().toISOString();
    const results: Assessment[] = assessmentsList.map((item) => ({
      ...item,
      id: item.id || `${classId}_${item.studentId}_${item.subjectId}_${item.date}`,
      classId,
      ownerId,
      createdAt: now,
      updatedAt: now,
    }));

    if (shouldUseFirestore(ownerId)) {
      const batch = writeBatch(db);
      results.forEach((rec) => {
        const ref = doc(db, colPath, rec.id);
        batch.set(ref, rec);
      });
      try {
        await batch.commit();
        return results;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'assessments_batch');
      }
    }

    localDb.batchSet(colPath, results);
    return results;
  }

  public static async deleteAssessment(id: string): Promise<void> {
    if (shouldUseFirestore()) {
      try {
        await deleteDoc(doc(db, 'assessments', id));
        return;
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `assessments/${id}`);
      }
    }
    localDb.deleteItem('assessments', id);
  }

  public static async getCompetencies(classId: string, ownerId: string): Promise<CompetencyEvaluation[]> {
    const colPath = 'competencyEvaluations';
    if (shouldUseFirestore(ownerId)) {
      try {
        const q = query(
          collection(db, colPath),
          where('classId', '==', classId),
          where('ownerId', '==', ownerId)
        );
        const snap = await getDocs(q);
        const list: CompetencyEvaluation[] = [];
        snap.forEach((d) => list.push({ ...d.data(), id: d.id } as CompetencyEvaluation));
        return list;
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, colPath);
      }
    }
    return localDb.getCollection<CompetencyEvaluation>(
      colPath,
      (c) => c.classId === classId && c.ownerId === ownerId
    );
  }

  public static async saveCompetency(
    data: Omit<CompetencyEvaluation, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): Promise<CompetencyEvaluation> {
    const colPath = 'competencyEvaluations';
    const id = data.id || uuid();
    const now = new Date().toISOString();
    const item: CompetencyEvaluation = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };

    if (shouldUseFirestore(data.ownerId)) {
      try {
        await setDoc(doc(db, colPath, id), item);
        return item;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `${colPath}/${id}`);
      }
    }

    localDb.setItem(colPath, item);
    return item;
  }

  public static async saveCompetencyBatch(
    classId: string,
    ownerId: string,
    evalsList: Array<Omit<CompetencyEvaluation, 'id' | 'classId' | 'ownerId' | 'createdAt' | 'updatedAt'> & { id?: string }>
  ): Promise<CompetencyEvaluation[]> {
    const colPath = 'competencyEvaluations';
    const now = new Date().toISOString();
    const results: CompetencyEvaluation[] = evalsList.map((item) => ({
      ...item,
      id: item.id || `${classId}_${item.studentId}_${item.period}_${encodeURIComponent(item.criterion)}`,
      classId,
      ownerId,
      createdAt: now,
      updatedAt: now,
    }));

    if (shouldUseFirestore(ownerId)) {
      try {
        await commitBatchInChunks(results, (batch, rec) => {
          const ref = doc(db, colPath, rec.id);
          batch.set(ref, rec);
        });
        return results;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'competencies_batch');
      }
    }

    localDb.batchSet(colPath, results);
    return results;
  }
}

// ==========================================
// 6. COMPETITION REPOSITORY
// ==========================================
export class CompetitionRepository {
  public static async getEntries(classId: string, ownerId: string): Promise<CompetitionEntry[]> {
    const colPath = 'competitionEntries';
    if (shouldUseFirestore(ownerId)) {
      try {
        const q = query(
          collection(db, colPath),
          where('classId', '==', classId),
          where('ownerId', '==', ownerId)
        );
        const snap = await getDocs(q);
        const list: CompetitionEntry[] = [];
        snap.forEach((d) => list.push({ ...d.data(), id: d.id } as CompetitionEntry));
        return list.sort((a, b) => b.date.localeCompare(a.date));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, colPath);
      }
    }
    return localDb
      .getCollection<CompetitionEntry>(colPath, (c) => c.classId === classId && c.ownerId === ownerId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  public static async addEntry(
    data: Omit<CompetitionEntry, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<CompetitionEntry> {
    const colPath = 'competitionEntries';
    const id = uuid();
    const now = new Date().toISOString();
    const item: CompetitionEntry = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };

    if (shouldUseFirestore(data.ownerId)) {
      try {
        await setDoc(doc(db, colPath, id), item);
        return item;
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `${colPath}/${id}`);
      }
    }

    localDb.setItem(colPath, item);
    return item;
  }

  public static async deleteEntry(id: string): Promise<void> {
    if (shouldUseFirestore()) {
      try {
        await deleteDoc(doc(db, 'competitionEntries', id));
        return;
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `competitionEntries/${id}`);
      }
    }
    localDb.deleteItem('competitionEntries', id);
  }
}

// ==========================================
// 7. TASK REPOSITORY
// ==========================================
export class TaskRepository {
  public static async getTasks(classId: string, ownerId: string): Promise<Task[]> {
    const colPath = 'tasks';
    if (shouldUseFirestore(ownerId)) {
      try {
        const q = query(
          collection(db, colPath),
          where('classId', '==', classId),
          where('ownerId', '==', ownerId)
        );
        const snap = await getDocs(q);
        const list: Task[] = [];
        snap.forEach((d) => list.push({ ...d.data(), id: d.id } as Task));
        return list.sort((a, b) => b.dueAt.localeCompare(a.dueAt));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, colPath);
      }
    }
    return localDb
      .getCollection<Task>(colPath, (t) => t.classId === classId && t.ownerId === ownerId)
      .sort((a, b) => b.dueAt.localeCompare(a.dueAt));
  }

  public static async createTask(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const colPath = 'tasks';
    const id = uuid();
    const now = new Date().toISOString();
    const item: Task = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };

    if (shouldUseFirestore(data.ownerId)) {
      try {
        await setDoc(doc(db, colPath, id), item);
        return item;
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `${colPath}/${id}`);
      }
    }

    localDb.setItem(colPath, item);
    return item;
  }

  public static async deleteTask(id: string): Promise<void> {
    if (shouldUseFirestore()) {
      try {
        await deleteDoc(doc(db, 'tasks', id));
        return;
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `tasks/${id}`);
      }
    }
    localDb.deleteItem('tasks', id);
  }

  public static async getCompletions(classId: string, ownerId: string): Promise<TaskCompletion[]> {
    const colPath = 'taskCompletions';
    if (shouldUseFirestore(ownerId)) {
      try {
        const q = query(
          collection(db, colPath),
          where('classId', '==', classId),
          where('ownerId', '==', ownerId)
        );
        const snap = await getDocs(q);
        const list: TaskCompletion[] = [];
        snap.forEach((d) => list.push({ ...d.data(), id: d.id } as TaskCompletion));
        return list;
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, colPath);
      }
    }
    return localDb.getCollection<TaskCompletion>(colPath, (t) => t.classId === classId && t.ownerId === ownerId);
  }

  public static async toggleCompletion(
    classId: string,
    ownerId: string,
    taskId: string,
    studentId: string,
    completed: boolean
  ): Promise<void> {
    const docId = `${classId}_${taskId}_${studentId}`;
    const now = new Date().toISOString();
    const record: TaskCompletion = {
      id: docId,
      classId,
      ownerId,
      taskId,
      studentId,
      completed,
      completedAt: completed ? now : undefined,
      updatedAt: now,
    };

    if (shouldUseFirestore(ownerId)) {
      try {
        await setDoc(doc(db, 'taskCompletions', docId), record);
        return;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `taskCompletions/${docId}`);
      }
    }

    localDb.setItem('taskCompletions', record);
  }

  public static async updateCompletion(
    taskId: string,
    studentId: string,
    completed: boolean,
    classId?: string,
    ownerId?: string
  ): Promise<void> {
    const cid = classId || 'default';
    const oid = ownerId || 'default';
    await TaskRepository.toggleCompletion(cid, oid, taskId, studentId, completed);
  }
}

// ==========================================
// 8. JOURNAL REPOSITORY
// ==========================================
export class JournalRepository {
  public static async getEntries(classId: string, ownerId: string): Promise<JournalEntry[]> {
    const colPath = 'journalEntries';
    if (shouldUseFirestore(ownerId)) {
      try {
        const q = query(
          collection(db, colPath),
          where('classId', '==', classId),
          where('ownerId', '==', ownerId)
        );
        const snap = await getDocs(q);
        const list: JournalEntry[] = [];
        snap.forEach((d) => list.push({ ...d.data(), id: d.id } as JournalEntry));
        return list.sort((a, b) => b.date.localeCompare(a.date));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, colPath);
      }
    }
    return localDb
      .getCollection<JournalEntry>(colPath, (j) => j.classId === classId && j.ownerId === ownerId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  public static async createEntry(
    data: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<JournalEntry> {
    const colPath = 'journalEntries';
    const id = uuid();
    const now = new Date().toISOString();
    const item: JournalEntry = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };

    if (shouldUseFirestore(data.ownerId)) {
      try {
        await setDoc(doc(db, colPath, id), item);
        return item;
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `${colPath}/${id}`);
      }
    }

    localDb.setItem(colPath, item);
    return item;
  }

  public static async deleteEntry(id: string): Promise<void> {
    if (shouldUseFirestore()) {
      try {
        await deleteDoc(doc(db, 'journalEntries', id));
        return;
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `journalEntries/${id}`);
      }
    }
    localDb.deleteItem('journalEntries', id);
  }
}

// ==========================================
// 9. EVENT REPOSITORY
// ==========================================
export class EventRepository {
  public static async getEvents(classId: string, ownerId: string): Promise<ClassEvent[]> {
    const colPath = 'classEvents';
    if (shouldUseFirestore(ownerId)) {
      try {
        const q = query(
          collection(db, colPath),
          where('classId', '==', classId),
          where('ownerId', '==', ownerId)
        );
        const snap = await getDocs(q);
        const list: ClassEvent[] = [];
        snap.forEach((d) => list.push({ ...d.data(), id: d.id } as ClassEvent));
        return list.sort((a, b) => a.date.localeCompare(b.date));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, colPath);
      }
    }
    return localDb
      .getCollection<ClassEvent>(colPath, (e) => e.classId === classId && e.ownerId === ownerId)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  public static async createEvent(data: Omit<ClassEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<ClassEvent> {
    const colPath = 'classEvents';
    const id = uuid();
    const now = new Date().toISOString();
    const item: ClassEvent = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };

    if (shouldUseFirestore(data.ownerId)) {
      try {
        await setDoc(doc(db, colPath, id), item);
        return item;
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `${colPath}/${id}`);
      }
    }

    localDb.setItem(colPath, item);
    return item;
  }

  public static async deleteEvent(id: string): Promise<void> {
    if (shouldUseFirestore()) {
      try {
        await deleteDoc(doc(db, 'classEvents', id));
        return;
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `classEvents/${id}`);
      }
    }
    localDb.deleteItem('classEvents', id);
  }
}

// ==========================================
// 10. TIMETABLE REPOSITORY
// ==========================================
export class TimetableRepository {
  public static async getTimetable(classId: string, ownerId: string): Promise<TimetableCell[]> {
    const colPath = 'timetables';
    if (shouldUseFirestore(ownerId)) {
      try {
        const q = query(
          collection(db, colPath),
          where('classId', '==', classId),
          where('ownerId', '==', ownerId)
        );
        const snap = await getDocs(q);
        const list: TimetableCell[] = [];
        snap.forEach((d) => list.push({ ...d.data(), id: d.id } as TimetableCell));
        return list;
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, colPath);
      }
    }
    return localDb.getCollection<TimetableCell>(colPath, (t) => t.classId === classId && t.ownerId === ownerId);
  }

  public static async saveTimetable(
    classId: string,
    ownerId: string,
    cells: Array<Omit<TimetableCell, 'id' | 'classId' | 'ownerId' | 'updatedAt'>>
  ): Promise<void> {
    const colPath = 'timetables';
    const now = new Date().toISOString();
    const items: TimetableCell[] = cells.map((cell) => ({
      id: `${classId}_${cell.dayOfWeek}_${cell.period}`,
      classId,
      ownerId,
      dayOfWeek: cell.dayOfWeek,
      period: cell.period,
      session: cell.session,
      subject: cell.subject,
      updatedAt: now,
    }));

    if (shouldUseFirestore(ownerId)) {
      try {
        const q = query(
          collection(db, colPath),
          where('classId', '==', classId),
          where('ownerId', '==', ownerId)
        );
        const snap = await getDocs(q);
        const batch = writeBatch(db);
        const newItemIds = new Set(items.map((i) => i.id));

        // Delete previous timetable cells that are cleared or removed
        snap.forEach((d) => {
          if (!newItemIds.has(d.id)) {
            batch.delete(d.ref);
          }
        });

        items.forEach((item) => {
          const ref = doc(db, colPath, item.id);
          batch.set(ref, item);
        });

        await batch.commit();
        const allLocal = localDb.getCollection<TimetableCell>(colPath);
        const retained = allLocal.filter((t) => t.classId !== classId);
        localDb.setCollection(colPath, [...retained, ...items]);
        return;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, colPath);
      }
    }

    const allLocal = localDb.getCollection<TimetableCell>(colPath);
    const retained = allLocal.filter((t) => t.classId !== classId);
    localDb.setCollection(colPath, [...retained, ...items]);
  }

  // --- 10b. Periods Configuration ---
  public static async getPeriods(classId: string, ownerId: string): Promise<TimetablePeriod[] | null> {
    const colPath = 'timetablePeriods';
    const docId = `periods_${classId}`;
    if (shouldUseFirestore(ownerId)) {
      try {
        const snap = await getDoc(doc(db, colPath, docId));
        if (snap.exists() && snap.data()?.periods) {
          return snap.data().periods as TimetablePeriod[];
        }
      } catch (error) {
        console.warn('Error reading periods from firestore:', error);
      }
    }
    const item = localDb.getItem<{ id: string; periods: TimetablePeriod[] }>(colPath, docId);
    return item ? item.periods : null;
  }

  public static async savePeriods(classId: string, ownerId: string, periods: TimetablePeriod[]): Promise<void> {
    const colPath = 'timetablePeriods';
    const docId = `periods_${classId}`;
    const payload = {
      id: docId,
      classId,
      ownerId,
      periods,
      updatedAt: new Date().toISOString(),
    };

    if (shouldUseFirestore(ownerId)) {
      try {
        await setDoc(doc(db, colPath, docId), payload);
        return;
      } catch (error) {
        console.warn('Error saving periods to firestore:', error);
      }
    }
    localDb.setItem(colPath, payload);
  }

  // --- 10c. Duty Assignments ---
  public static async getDutyAssignments(classId: string, ownerId: string): Promise<DutyAssignment[] | null> {
    const colPath = 'dutyAssignments';
    const docId = `duty_${classId}`;
    if (shouldUseFirestore(ownerId)) {
      try {
        const snap = await getDoc(doc(db, colPath, docId));
        if (snap.exists() && snap.data()?.duties) {
          return snap.data().duties as DutyAssignment[];
        }
      } catch (error) {
        console.warn('Error reading duties from firestore:', error);
      }
    }
    const item = localDb.getItem<{ id: string; duties: DutyAssignment[] }>(colPath, docId);
    return item ? item.duties : null;
  }

  public static async saveDutyAssignments(classId: string, ownerId: string, duties: DutyAssignment[]): Promise<void> {
    const colPath = 'dutyAssignments';
    const docId = `duty_${classId}`;
    const payload = {
      id: docId,
      classId,
      ownerId,
      duties,
      updatedAt: new Date().toISOString(),
    };

    if (shouldUseFirestore(ownerId)) {
      try {
        await setDoc(doc(db, colPath, docId), payload);
        return;
      } catch (error) {
        console.warn('Error saving duties to firestore:', error);
      }
    }
    localDb.setItem(colPath, payload);
  }

  // --- 10d. Daily Routines ---
  public static async getDailyRoutines(classId: string, ownerId: string): Promise<DailyRoutineStep[] | null> {
    const colPath = 'dailyRoutines';
    const docId = `routines_${classId}`;
    if (shouldUseFirestore(ownerId)) {
      try {
        const snap = await getDoc(doc(db, colPath, docId));
        if (snap.exists() && snap.data()?.routines) {
          return snap.data().routines as DailyRoutineStep[];
        }
      } catch (error) {
        console.warn('Error reading routines from firestore:', error);
      }
    }
    const item = localDb.getItem<{ id: string; routines: DailyRoutineStep[] }>(colPath, docId);
    return item ? item.routines : null;
  }

  public static async saveDailyRoutines(classId: string, ownerId: string, routines: DailyRoutineStep[]): Promise<void> {
    const colPath = 'dailyRoutines';
    const docId = `routines_${classId}`;
    const payload = {
      id: docId,
      classId,
      ownerId,
      routines,
      updatedAt: new Date().toISOString(),
    };

    if (shouldUseFirestore(ownerId)) {
      try {
        await setDoc(doc(db, colPath, docId), payload);
        return;
      } catch (error) {
        console.warn('Error saving routines to firestore:', error);
      }
    }
    localDb.setItem(colPath, payload);
  }
}

// ==========================================
// 11. SEATING REPOSITORY
// ==========================================
export class SeatingRepository {
  public static async getSeating(classId: string, ownerId: string): Promise<SeatingAssignment[]> {
    const colPath = 'seatingAssignments';
    if (shouldUseFirestore(ownerId)) {
      try {
        const q = query(
          collection(db, colPath),
          where('classId', '==', classId),
          where('ownerId', '==', ownerId)
        );
        const snap = await getDocs(q);
        const list: SeatingAssignment[] = [];
        snap.forEach((d) => list.push({ ...d.data(), id: d.id } as SeatingAssignment));
        return list;
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, colPath);
      }
    }
    return localDb.getCollection<SeatingAssignment>(
      colPath,
      (s) => s.classId === classId && s.ownerId === ownerId
    );
  }

  public static async saveSeating(
    classId: string,
    ownerId: string,
    assignments: Array<Omit<SeatingAssignment, 'id' | 'classId' | 'ownerId' | 'updatedAt'>>
  ): Promise<void> {
    const colPath = 'seatingAssignments';
    const now = new Date().toISOString();
    const items: SeatingAssignment[] = assignments.map((item) => ({
      id: `${classId}_${item.row}_${item.col}_${item.position}`,
      classId,
      ownerId,
      studentId: item.studentId,
      row: item.row,
      col: item.col,
      position: item.position,
      updatedAt: now,
    }));

    if (shouldUseFirestore(ownerId)) {
      try {
        const q = query(
          collection(db, colPath),
          where('classId', '==', classId),
          where('ownerId', '==', ownerId)
        );
        const snap = await getDocs(q);
        const batch = writeBatch(db);
        const newItemIds = new Set(items.map((i) => i.id));

        // Delete previous seating assignments that are no longer assigned (prevents ghost seats)
        snap.forEach((d) => {
          if (!newItemIds.has(d.id)) {
            batch.delete(d.ref);
          }
        });

        items.forEach((item) => {
          const ref = doc(db, colPath, item.id);
          batch.set(ref, item);
        });

        await batch.commit();
        const allLocal = localDb.getCollection<SeatingAssignment>(colPath);
        const retained = allLocal.filter((s) => s.classId !== classId);
        localDb.setCollection(colPath, [...retained, ...items]);
        return;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, colPath);
      }
    }

    const allLocal = localDb.getCollection<SeatingAssignment>(colPath);
    const retained = allLocal.filter((s) => s.classId !== classId);
    localDb.setCollection(colPath, [...retained, ...items]);
  }

  public static async getLayoutConfig(classId: string, ownerId: string): Promise<SeatingLayoutConfig | null> {
    const colPath = 'seatingConfigs';
    if (shouldUseFirestore(ownerId)) {
      try {
        const ref = doc(db, colPath, `${classId}_config`);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          return { ...snap.data(), id: snap.id } as SeatingLayoutConfig;
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, colPath);
      }
    }
    const found = localDb.getCollection<SeatingLayoutConfig>(
      colPath,
      (c) => c.classId === classId && c.ownerId === ownerId
    );
    return found.length > 0 ? found[0] : null;
  }

  public static async saveLayoutConfig(
    classId: string,
    ownerId: string,
    config: Omit<SeatingLayoutConfig, 'id' | 'classId' | 'ownerId' | 'updatedAt'>
  ): Promise<void> {
    const colPath = 'seatingConfigs';
    const id = `${classId}_config`;
    const docData: SeatingLayoutConfig = {
      ...config,
      id,
      classId,
      ownerId,
      updatedAt: new Date().toISOString(),
    };

    if (shouldUseFirestore(ownerId)) {
      try {
        const ref = doc(db, colPath, id);
        await setDoc(ref, docData);
        return;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, colPath);
      }
    }

    localDb.setItem(colPath, docData);
  }
}
