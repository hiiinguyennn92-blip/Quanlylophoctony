/**
 * Hardening & Production Verification Test Suite
 * Validates P0-01 (Auth & Ownership), P0-02 (Anti-Hallucination & Groundedness),
 * P0-03 (Cascade Deletion & No Orphan Data), and P1-02 (Backup Schema Integrity).
 */

import { verifyToken, verifyClassOwnership } from '../server/authMiddleware.ts';
import { generateComment, generateCompetencyBatchRecommendation } from '../server/aiEndpoints.ts';
import { BackupService } from '../services/backupService.ts';
import { ClassRepository, StudentRepository } from '../repositories/dataRepository.ts';

// Mock localStorage for Node environment if not present
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] || null,
    length: store.size,
  } as Storage;
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, failureDetail?: string) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${testName}: ${failureDetail || 'Assertion failed'}`);
    failed++;
  }
}

async function runAllVerificationTests() {
  console.log('\n======================================================');
  console.log('--- STARTING CTO HARDENING & PRODUCTION AUDIT TESTS ---');
  console.log('======================================================\n');

  // ----------------------------------------------------
  // SECTION 1: P0-01 AI AUTHENTICATION & AUTHORIZATION
  // ----------------------------------------------------
  console.log('[SECTION 1] P0-01: AI API Authentication & Authorization');

  // TEST-AI-AUTH-01: Empty or missing token
  const emptyUser = await verifyToken('');
  assert(emptyUser === null, 'TEST-AI-AUTH-01: Missing token returns null (401)');

  // TEST-AI-AUTH-02: Invalid/garbage token
  const garbageUser = await verifyToken('random_garbage_token_xyz_123');
  assert(garbageUser === null, 'TEST-AI-AUTH-02: Invalid token rejected (401)');

  // TEST-AI-AUTH-03: Valid guest demo token format
  const validGuestToken = `guest_preview_teacher_${Date.now()}`;
  const validGuest = await verifyToken(validGuestToken);
  assert(
    validGuest !== null && validGuest.isGuest === true && validGuest.uid.includes('teacher'),
    'TEST-AI-AUTH-03: Valid preview token parsed safely'
  );

  // TEST-AI-AUTH-04: Expired guest token rejected
  const expiredGuestToken = `guest_preview_teacher_${Date.now() - 48 * 3600 * 1000}`;
  const expiredGuest = await verifyToken(expiredGuestToken);
  assert(expiredGuest === null, 'TEST-AI-AUTH-04: Stale token older than 24h rejected');

  // TEST-AI-AUTH-05: Resource Ownership - Guest attempting to access real teacher class
  if (validGuest) {
    const guestAccessRealClass = await verifyClassOwnership(validGuest, validGuestToken, 'real_teacher_class_456');
    assert(guestAccessRealClass === false, 'TEST-AI-AUTH-05: Guest cannot access non-demo teacher class (403)');

    const guestAccessDemoClass = await verifyClassOwnership(validGuest, validGuestToken, 'demo_class_3a1');
    assert(guestAccessDemoClass === true, 'TEST-AI-AUTH-05b: Guest can access permitted demo class');
  }

  // ----------------------------------------------------
  // SECTION 2: P0-02 GROUNDEDNESS & ANTI-HALLUCINATION
  // ----------------------------------------------------
  console.log('\n[SECTION 2] P0-02: Grounded AI Failure Contract & Anti-Fabrication');

  // Test generateComment with NO teacher notes (should not invent "chăm ngoan", "tiếp thu tốt")
  const commentResult = await generateComment({
    studentName: 'Nguyễn Văn A',
    subject: 'Toán',
    level: 'Hoàn thành',
    strengths: '',
    improvements: '',
  });

  assert(
    typeof commentResult.comment === 'string' && commentResult.comment.length > 0,
    'TEST-AI-GROUND-01: Comment generation returns valid string'
  );
  assert(
    !commentResult.comment.includes('tiếp thu bài tốt'),
    'TEST-AI-GROUND-02: Does NOT fabricate "tiếp thu bài tốt" without evidence'
  );
  assert(
    !commentResult.comment.includes('chăm ngoan'),
    'TEST-AI-GROUND-03: Does NOT fabricate "chăm ngoan" without evidence'
  );
  assert(
    typeof commentResult.status === 'string',
    `TEST-AI-GROUND-04: Structured status returned: "${commentResult.status}"`
  );
  assert(
    typeof commentResult.retryable === 'boolean',
    `TEST-AI-GROUND-05: Retryable flag present: ${commentResult.retryable}`
  );

  // Test generateCompetencyBatchRecommendation fallback behavior
  const compBatchResult = await generateCompetencyBatchRecommendation({
    studentName: 'Trần Thị B',
    period: 'Học kỳ 1',
    studentNotes: '',
    recentAssessmentLevels: '',
    attendanceRecord: '',
  });

  assert(
    typeof compBatchResult.status === 'string',
    'TEST-AI-GROUND-06: Competency batch returns structured status'
  );

  // If offline/fallback, evaluations must NOT be populated with 10 fabricated fake-5-star criteria
  if (compBatchResult.status === 'ai_unavailable') {
    assert(
      Object.keys(compBatchResult.evaluations).length === 0,
      'TEST-AI-GROUND-07: In ai_unavailable state, no fabricated 10 criteria are emitted'
    );
  }

  // ----------------------------------------------------
  // SECTION 3: P0-03 DATA CASCADE DELETION LIFECYCLE
  // ----------------------------------------------------
  console.log('\n[SECTION 3] P0-03: Complete Cascade Deletion & No Orphan Data');

  const testOwnerId = 'test_owner_999';
  const testClass = await ClassRepository.createClass({
    ownerId: testOwnerId,
    className: 'Lớp Kiểm Thử Cascade',
    grade: '4',
    schoolName: 'Tiểu Học Alpha',
    schoolYear: '2025 - 2026',
    teacherName: 'Thầy Kiểm Thử',
    session: 'morning',
  });

  assert(Boolean(testClass.id), 'TEST-CASCADE-01: Test class created');

  // Create dependent student
  const testStudent = await StudentRepository.createStudent({
    classId: testClass.id,
    ownerId: testOwnerId,
    studentCode: 'HS-TEST-01',
    fullName: 'Lê Văn Test',
    dob: '2016-05-10',
    gender: 'nam',
    groupId: 'Tổ 1',
  });
  assert(Boolean(testStudent.id), 'TEST-CASCADE-02: Test student created');

  // Populate localDb with dummy dependent records for this student and class
  const colKeys = [
    'local_db_parentContacts',
    'local_db_attendanceRecords',
    'local_db_assessments',
    'local_db_competencyEvaluations',
    'local_db_tasks',
    'local_db_taskCompletions',
  ];
  for (const colKey of colKeys) {
    localStorage.setItem(
      colKey,
      JSON.stringify([
        { id: 'rec_1', classId: testClass.id, studentId: testStudent.id },
        { id: 'rec_other', classId: 'other_class_123', studentId: 'other_student_456' },
      ])
    );
  }

  // Execute Cascade Delete of Class
  await ClassRepository.deleteClass(testClass.id);

  // Check that the class is gone
  const classesAfter = await ClassRepository.getClassesByOwner(testOwnerId);
  const classStillExists = classesAfter.some((c) => c.id === testClass.id);
  assert(!classStillExists, 'TEST-CASCADE-03: Root class document deleted');

  // Check that dependent records in collections were cascade-deleted
  let anyOrphansLeft = false;
  for (const colKey of colKeys) {
    const raw = localStorage.getItem(colKey);
    const list = raw ? JSON.parse(raw) : [];
    if (list.some((item: any) => item.classId === testClass.id)) {
      anyOrphansLeft = true;
      break;
    }
  }
  assert(!anyOrphansLeft, 'TEST-CASCADE-04: Zero orphan records remain after Class cascade delete');

  // Check that unrelated class data was NOT touched
  const otherRecordFound = JSON.parse(localStorage.getItem('local_db_parentContacts') || '[]').some(
    (item: any) => item.classId === 'other_class_123'
  );
  assert(otherRecordFound, 'TEST-CASCADE-05: Unrelated classes records preserved safely');

  // ----------------------------------------------------
  // SECTION 4: P1-02 BACKUP & RESTORE SCHEMA INTEGRITY
  // ----------------------------------------------------
  console.log('\n[SECTION 4] P1-02: Backup Schema Validation & Integrity');

  // Corrupted / empty backup
  const valEmpty = BackupService.validateBackupFile('');
  assert(!valEmpty.valid, 'TEST-BACKUP-01: Empty backup rejected');

  const valInvalidJson = BackupService.validateBackupFile('{ bad_json: ');
  assert(!valInvalidJson.valid, 'TEST-BACKUP-02: Malformed JSON rejected');

  const valMissingSchema = BackupService.validateBackupFile(JSON.stringify({ classes: [] }));
  assert(!valMissingSchema.valid, 'TEST-BACKUP-03: Missing schemaVersion rejected');

  const valMissingClasses = BackupService.validateBackupFile(
    JSON.stringify({ schemaVersion: '1.0.0', students: [] })
  );
  assert(!valMissingClasses.valid, 'TEST-BACKUP-04: Missing classes array rejected');

  // Valid backup payload
  const validBackupJson = JSON.stringify({
    schemaVersion: '1.0.0',
    exportedAt: new Date().toISOString(),
    ownerId: 'teacher_123',
    classes: [
      { id: 'c1', className: 'Lớp 3A', grade: '3', schoolName: 'Trường Tiểu học' },
    ],
    students: [
      { id: 's1', classId: 'c1', fullName: 'Nguyễn Văn B' },
    ],
  });
  const valSuccess = BackupService.validateBackupFile(validBackupJson);
  assert(valSuccess.valid, 'TEST-BACKUP-05: Standard compliant backup payload accepted');
  assert(
    valSuccess.summary?.classCount === 1 && valSuccess.summary?.studentCount === 1,
    'TEST-BACKUP-06: Accurate backup summary extracted'
  );

  console.log('\n======================================================');
  console.log(`--- TEST RESULTS: ${passed} PASSED | ${failed} FAILED ---`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runAllVerificationTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
