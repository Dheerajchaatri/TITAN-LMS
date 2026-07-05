import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN', description: 'System Administrator with complete access' },
  });

  const teacherRole = await prisma.role.upsert({
    where: { name: 'TEACHER' },
    update: {},
    create: { name: 'TEACHER', description: 'Faculty member managing courses and grading' },
  });

  const studentRole = await prisma.role.upsert({
    where: { name: 'STUDENT' },
    update: {},
    create: { name: 'STUDENT', description: 'Enrolled student attending classes' },
  });

  const parentRole = await prisma.role.upsert({
    where: { name: 'PARENT' },
    update: {},
    create: { name: 'PARENT', description: 'Parent/Guardian tracking student progress' },
  });

  // 2. Permissions
  const permissions = [
    { name: 'manage_users', description: 'CRUD students and teachers' },
    { name: 'manage_courses', description: 'CRUD courses and assignments' },
    { name: 'manage_fees', description: 'CRUD fee structures and recording payments' },
    { name: 'grade_submissions', description: 'Grade assignments and quizzes' },
    { name: 'mark_attendance', description: 'Record student attendance' },
    { name: 'view_grades', description: 'View academic transcripts' },
    { name: 'submit_assignments', description: 'Submit coursework' },
    { name: 'attempt_quizzes', description: 'Take online tests' },
    { name: 'post_discussions', description: 'Ask and reply in discussion forums' },
  ];

  const dbPermissions = [];
  for (const perm of permissions) {
    const p = await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
    dbPermissions.push(p);
  }

  // 3. Link Roles and Permissions
  // Admin gets all permissions
  for (const p of dbPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: p.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: p.id },
    });
  }

  // Teacher Permissions
  const teacherPerms = ['manage_courses', 'grade_submissions', 'mark_attendance', 'post_discussions'];
  for (const p of dbPermissions.filter(p => teacherPerms.includes(p.name))) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: teacherRole.id, permissionId: p.id } },
      update: {},
      create: { roleId: teacherRole.id, permissionId: p.id },
    });
  }

  // Student Permissions
  const studentPerms = ['view_grades', 'submit_assignments', 'attempt_quizzes', 'post_discussions'];
  for (const p of dbPermissions.filter(p => studentPerms.includes(p.name))) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: studentRole.id, permissionId: p.id } },
      update: {},
      create: { roleId: studentRole.id, permissionId: p.id },
    });
  }

  const salt = bcrypt.genSaltSync(10);
  const defaultPasswordHash = bcrypt.hashSync('password123', salt);

  // 4. Create Users
  // Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@lms.com' },
    update: {},
    create: {
      email: 'admin@lms.com',
      passwordHash: defaultPasswordHash,
      firstName: 'Sarah',
      lastName: 'Jenkins',
      roleId: adminRole.id,
      isEmailVerified: true,
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120',
    },
  });

  // Teacher Users
  const teacherUser1 = await prisma.user.upsert({
    where: { email: 'teacher1@lms.com' },
    update: {},
    create: {
      email: 'teacher1@lms.com',
      passwordHash: defaultPasswordHash,
      firstName: 'Marcus',
      lastName: 'Vance',
      roleId: teacherRole.id,
      isEmailVerified: true,
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=120',
    },
  });
  const teacher1 = await prisma.teacher.upsert({
    where: { userId: teacherUser1.id },
    update: {},
    create: {
      userId: teacherUser1.id,
      employeeId: 'EMP001',
      designation: 'Senior Professor',
      qualification: 'Ph.D. in Computer Science',
    },
  });

  const teacherUser2 = await prisma.user.upsert({
    where: { email: 'teacher2@lms.com' },
    update: {},
    create: {
      email: 'teacher2@lms.com',
      passwordHash: defaultPasswordHash,
      firstName: 'Elena',
      lastName: 'Rostova',
      roleId: teacherRole.id,
      isEmailVerified: true,
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120',
    },
  });
  const teacher2 = await prisma.teacher.upsert({
    where: { userId: teacherUser2.id },
    update: {},
    create: {
      userId: teacherUser2.id,
      employeeId: 'EMP002',
      designation: 'Assistant Professor',
      qualification: 'M.Sc. in Mathematics',
    },
  });

  // Parent User
  const parentUser = await prisma.user.upsert({
    where: { email: 'parent@lms.com' },
    update: {},
    create: {
      email: 'parent@lms.com',
      passwordHash: defaultPasswordHash,
      firstName: 'David',
      lastName: 'Miller',
      roleId: parentRole.id,
      isEmailVerified: true,
    },
  });
  const parent = await prisma.parent.upsert({
    where: { userId: parentUser.id },
    update: {},
    create: {
      userId: parentUser.id,
      emergencyContactName: 'David Miller',
      emergencyContactPhone: '+1-555-0199',
      emergencyContactRelationship: 'Father',
    },
  });

  // Student Users
  const studentUser1 = await prisma.user.upsert({
    where: { email: 'student1@lms.com' },
    update: {},
    create: {
      email: 'student1@lms.com',
      passwordHash: defaultPasswordHash,
      firstName: 'Alex',
      lastName: 'Rivera',
      roleId: studentRole.id,
      isEmailVerified: true,
      avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=120',
    },
  });
  const student1 = await prisma.student.upsert({
    where: { userId: studentUser1.id },
    update: {},
    create: {
      userId: studentUser1.id,
      studentId: 'STU001',
      dateOfBirth: new Date('2004-05-15'),
      gender: 'Male',
      parentId: parent.id,
      academicHistory: JSON.stringify({ highSchoolGPA: '3.85', enrolledSemester: 'Fall 2024' }),
    },
  });

  const studentUser2 = await prisma.user.upsert({
    where: { email: 'student2@lms.com' },
    update: {},
    create: {
      email: 'student2@lms.com',
      passwordHash: defaultPasswordHash,
      firstName: 'Maya',
      lastName: 'Lin',
      roleId: studentRole.id,
      isEmailVerified: true,
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=120',
    },
  });
  const student2 = await prisma.student.upsert({
    where: { userId: studentUser2.id },
    update: {},
    create: {
      userId: studentUser2.id,
      studentId: 'STU002',
      dateOfBirth: new Date('2005-02-28'),
      gender: 'Female',
      parentId: parent.id,
      academicHistory: JSON.stringify({ highSchoolGPA: '3.92', enrolledSemester: 'Fall 2024' }),
    },
  });

  // 5. Course Categories & Courses
  const catCS = await prisma.courseCategory.upsert({
    where: { name: 'Computer Science' },
    update: {},
    create: { name: 'Computer Science', description: 'Software engineering, algorithms, and theory' },
  });

  const catMath = await prisma.courseCategory.upsert({
    where: { name: 'Mathematics' },
    update: {},
    create: { name: 'Mathematics', description: 'Calculus, algebra, and discrete math' },
  });

  const courseCS101 = await prisma.course.upsert({
    where: { code: 'CS101' },
    update: {},
    create: {
      code: 'CS101',
      title: 'Introduction to Computer Science',
      description: 'Foundational concepts of computing, variables, loops, arrays, and basic functions using Python.',
      categoryId: catCS.id,
      syllabus: 'Module 1: Introduction to hardware/software\nModule 2: Python basics\nModule 3: Control flow\nModule 4: Functions & Lists',
    },
  });

  const courseCS102 = await prisma.course.upsert({
    where: { code: 'CS102' },
    update: {},
    create: {
      code: 'CS102',
      title: 'Data Structures and Algorithms',
      description: 'Abstract data types, stacks, queues, linked lists, binary trees, sorting, and Big-O complexity analysis.',
      categoryId: catCS.id,
      syllabus: 'Module 1: Complexity analysis\nModule 2: Lists, Stacks, Queues\nModule 3: Recursion\nModule 4: Trees & Graphs',
    },
  });

  const courseMATH101 = await prisma.course.upsert({
    where: { code: 'MATH101' },
    update: {},
    create: {
      code: 'MATH101',
      title: 'Calculus I',
      description: 'Limits, continuity, differentiation, application of derivatives, and introduction to integration.',
      categoryId: catMath.id,
    },
  });

  // 6. Classes
  const classCS101 = await prisma.class.create({
    data: {
      courseId: courseCS101.id,
      teacherId: teacher1.id,
      name: 'CS101-Section A',
      semester: 'Fall 2024',
      academicYear: '2024-2025',
      room: 'Lab 402',
      schedule: JSON.stringify([{ day: 'Monday', time: '09:00 - 10:30' }, { day: 'Wednesday', time: '09:00 - 10:30' }]),
    },
  });

  const classCS102 = await prisma.class.create({
    data: {
      courseId: courseCS102.id,
      teacherId: teacher1.id,
      name: 'CS102-Section A',
      semester: 'Fall 2024',
      academicYear: '2024-2025',
      room: 'Room 105',
      schedule: JSON.stringify([{ day: 'Tuesday', time: '11:00 - 12:30' }, { day: 'Thursday', time: '11:00 - 12:30' }]),
    },
  });

  const classMATH101 = await prisma.class.create({
    data: {
      courseId: courseMATH101.id,
      teacherId: teacher2.id,
      name: 'MATH101-Section B',
      semester: 'Fall 2024',
      academicYear: '2024-2025',
      room: 'Lecture Hall 1',
      schedule: JSON.stringify([{ day: 'Monday', time: '13:00 - 14:30' }, { day: 'Wednesday', time: '13:00 - 14:30' }]),
    },
  });

  // 7. Enroll Students
  await prisma.enrollment.createMany({
    data: [
      { studentId: student1.id, classId: classCS101.id },
      { studentId: student1.id, classId: classMATH101.id },
      { studentId: student2.id, classId: classCS101.id },
      { studentId: student2.id, classId: classCS102.id },
      { studentId: student2.id, classId: classMATH101.id },
    ],
  });

  // 8. Attendance (Past 5 days)
  const days = [1, 2, 3, 4, 5];
  for (const day of days) {
    const date = new Date();
    date.setDate(date.getDate() - day);
    await prisma.attendance.createMany({
      data: [
        { classId: classCS101.id, studentId: student1.id, date, status: 'PRESENT' },
        { classId: classCS101.id, studentId: student2.id, date, status: day === 3 ? 'LATE' : 'PRESENT' },
        { classId: classMATH101.id, studentId: student1.id, date, status: 'PRESENT' },
        { classId: classMATH101.id, studentId: student2.id, date, status: day === 2 ? 'ABSENT' : 'PRESENT' },
      ],
    });
  }

  // 9. Fee Structures & Student Fees
  const tuitionFee = await prisma.feeStructure.create({
    data: {
      name: 'Tuition Fee - Fall 2024',
      amount: 1500,
      dueDate: new Date('2024-09-30'),
      type: 'SEMESTER',
      academicYear: '2024-2025',
    },
  });

  const labFee = await prisma.feeStructure.create({
    data: {
      name: 'Lab & Resource Fee',
      amount: 250,
      dueDate: new Date('2024-09-30'),
      type: 'SEMESTER',
      academicYear: '2024-2025',
    },
  });

  // Setup student fees and mock payments
  const studentFee1 = await prisma.studentFee.create({
    data: {
      studentId: student1.id,
      feeStructureId: tuitionFee.id,
      discount: 100, // $100 discount
      status: 'PAID',
    },
  });

  await prisma.payment.create({
    data: {
      studentFeeId: studentFee1.id,
      amount: 1400,
      paymentMethod: 'CARD',
      transactionId: 'TXN_001_FALL24',
    },
  });

  const studentFee2 = await prisma.studentFee.create({
    data: {
      studentId: student2.id,
      feeStructureId: tuitionFee.id,
      scholarship: 500, // $500 scholarship
      status: 'PARTIAL',
    },
  });

  await prisma.payment.create({
    data: {
      studentFeeId: studentFee2.id,
      amount: 500,
      paymentMethod: 'BANK_TRANSFER',
      transactionId: 'TXN_002_FALL24',
    },
  });

  await prisma.studentFee.createMany({
    data: [
      { studentId: student1.id, feeStructureId: labFee.id, status: 'UNPAID' },
      { studentId: student2.id, feeStructureId: labFee.id, status: 'PAID' },
    ],
  });

  // 10. Course Materials
  await prisma.material.createMany({
    data: [
      {
        classId: classCS101.id,
        title: 'Lecture 1: Python Introduction Slides',
        description: 'Introduction to variable declarations and mathematical operators.',
        fileUrl: '/materials/CS101_Lec1.pdf',
        fileType: 'PDF',
        uploadedById: teacherUser1.id,
      },
      {
        classId: classCS101.id,
        title: 'Basics of Loop Control',
        description: 'Video tutorial covering for-loops and while-loops.',
        fileUrl: 'https://www.youtube.com/watch?v=mock',
        fileType: 'VIDEO',
        uploadedById: teacherUser1.id,
      },
    ],
  });

  // 11. Assignments & Submissions
  const assign1 = await prisma.assignment.create({
    data: {
      classId: classCS101.id,
      title: 'Assignment 1: Functions and Control Flow',
      description: 'Write Python functions to check prime numbers and solve Fibonacci sequences. Submit your code as a single script file.',
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days from now
      maxMarks: 50,
      rubric: JSON.stringify({ correctness: '30%', efficiency: '10%', style: '10%' }),
    },
  });

  await prisma.assignmentSubmission.create({
    data: {
      assignmentId: assign1.id,
      studentId: student1.id,
      submissionText: '```python\ndef is_prime(n):\n    # prime calculation code\n```',
      fileUrl: '/submissions/STU001_Assign1.py',
      status: 'GRADED',
      grade: 48,
      feedback: 'Excellent work! Highly optimized Prime checker logic.',
    },
  });

  await prisma.assignmentSubmission.create({
    data: {
      assignmentId: assign1.id,
      studentId: student2.id,
      submissionText: '# Simple prime check script\ndef get_primes(n):\n   pass',
      status: 'SUBMITTED',
    },
  });

  // 12. Quizzes & QuizAttempts
  const quiz1 = await prisma.quiz.create({
    data: {
      classId: classCS101.id,
      title: 'Pop Quiz 1: Variables & Operations',
      description: 'Short timed quiz covering data types and core operations.',
      durationMinutes: 15,
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3), // 3 days from now
      maxMarks: 10,
    },
  });

  const q1 = await prisma.question.create({
    data: {
      quizId: quiz1.id,
      questionText: 'Which of the following is an immutable data type in Python?',
      type: 'MCQ',
      difficulty: 'EASY',
      points: 5,
    },
  });

  await prisma.questionOption.createMany({
    data: [
      { questionId: q1.id, optionText: 'List', isCorrect: false },
      { questionId: q1.id, optionText: 'Tuple', isCorrect: true },
      { questionId: q1.id, optionText: 'Dictionary', isCorrect: false },
      { questionId: q1.id, optionText: 'Set', isCorrect: false },
    ],
  });

  const q2 = await prisma.question.create({
    data: {
      quizId: quiz1.id,
      questionText: 'What does the operator // represent in Python?',
      type: 'MCQ',
      difficulty: 'EASY',
      points: 5,
    },
  });

  await prisma.questionOption.createMany({
    data: [
      { questionId: q2.id, optionText: 'Floor Division', isCorrect: true },
      { questionId: q2.id, optionText: 'Exponential Multiplier', isCorrect: false },
      { questionId: q2.id, optionText: 'Modulo operation', isCorrect: false },
      { questionId: q2.id, optionText: 'Matrix multiplication', isCorrect: false },
    ],
  });

  // Quiz attempt for student 1
  await prisma.quizAttempt.create({
    data: {
      quizId: quiz1.id,
      studentId: student1.id,
      score: 10,
      feedback: 'Perfect score!',
    },
  });

  // 13. Grades and Exam Results
  const grA = await prisma.grade.create({ data: { name: 'A', minPercentage: 90, maxPercentage: 100, gpaValue: 4.0 } });
  const grB = await prisma.grade.create({ data: { name: 'B', minPercentage: 80, maxPercentage: 89.9, gpaValue: 3.0 } });
  const grC = await prisma.grade.create({ data: { name: 'C', minPercentage: 70, maxPercentage: 79.9, gpaValue: 2.0 } });

  const midTermExam = await prisma.exam.create({
    data: {
      classId: classCS101.id,
      title: 'Mid-Semester Written Examination',
      date: new Date('2024-10-15'),
      durationMinutes: 120,
      maxMarks: 100,
      syllabus: 'Python basics, Loop Control, Array manipulation and function routines',
    },
  });

  await prisma.result.createMany({
    data: [
      { studentId: student1.id, examId: midTermExam.id, marksObtained: 94, gradeId: grA.id, gpa: 4.0, remarks: 'Superb grasp of key programming paradigms.' },
      { studentId: student2.id, examId: midTermExam.id, marksObtained: 85, gradeId: grB.id, gpa: 3.0, remarks: 'Strong implementation skills. Scope for optimization.' },
    ],
  });

  // 14. Global Announcements
  await prisma.announcement.createMany({
    data: [
      {
        title: 'Fall Semester Course Registration Deadline',
        content: 'Please ensure you complete all registrations and clear any pending tuition installments by September 15th.',
        category: 'NOTICE',
        targetAudience: 'ALL',
        senderId: adminUser.id,
      },
      {
        title: 'LMS Platform Maintenance Window',
        content: 'The LMS will undergo infrastructure updates on Saturday between 02:00 AM and 04:00 AM UTC. Expect brief service outages.',
        category: 'ALERT',
        targetAudience: 'ALL',
        senderId: adminUser.id,
      },
    ],
  });

  // 15. Discussions
  const discuss = await prisma.discussion.create({
    data: {
      classId: classCS101.id,
      title: 'Clarification regarding Assignment 1 complexity requirements',
      content: 'Do we need to write binary search algorithms or are standard recursive procedures accepted for optimization?',
      authorId: studentUser2.id,
      isPinned: true,
    },
  });

  await prisma.discussionReply.createMany({
    data: [
      {
        discussionId: discuss.id,
        content: 'Standard recursion is fine, but make sure to memoize results for larger bounds to avoid stack overflow issues.',
        authorId: teacherUser1.id,
      },
      {
        discussionId: discuss.id,
        content: 'Thanks, Professor Vance! I will apply dynamic programming arrays.',
        authorId: studentUser2.id,
      },
    ],
  });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
