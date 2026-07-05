import { Router, Response } from 'express';
import prisma from '../db';
import { authenticateJWT, requireRole, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Apply teacher validation
router.use(authenticateJWT);
router.use(requireRole(['TEACHER']));

// Helper helper to fetch teacher id
const getTeacherId = async (userId: string) => {
  const teacher = await prisma.teacher.findUnique({ where: { userId } });
  if (!teacher) throw new Error('Teacher profile not found');
  return teacher.id;
};

// 1. Teacher Dashboard Data
router.get('/dashboard-stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const teacherId = await getTeacherId(req.user!.id);
    const classes = await prisma.class.findMany({
      where: { teacherId },
      include: {
        enrollments: true,
        assignments: {
          include: {
            submissions: { where: { status: 'SUBMITTED' } }
          }
        },
        quizzes: true
      }
    });

    const classIds = classes.map(c => c.id);

    // Count pending assignment grading
    let pendingGrading = 0;
    classes.forEach(c => {
      c.assignments.forEach(a => {
        pendingGrading += a.submissions.length;
      });
    });

    // Today's classes count
    const todayClasses = classes.filter(c => {
      if (!c.schedule) return false;
      try {
        const schedule = JSON.parse(c.schedule);
        // Simple mock matching weekday name
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const todayName = days[new Date().getDay()];
        return schedule.some((s: any) => s.day === todayName);
      } catch {
        return false;
      }
    });

    // Students count
    const totalStudentsEnrolled = await prisma.enrollment.count({
      where: { classId: { in: classIds } }
    });

    // Recent announcements
    const announcements = await prisma.announcement.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      classesCount: classes.length,
      studentsCount: totalStudentsEnrolled,
      pendingGrading,
      todayClassesCount: todayClasses.length,
      classes: classes.map(c => ({
        id: c.id,
        name: c.name,
        semester: c.semester,
        room: c.room,
        studentCount: c.enrollments.length
      })),
      announcements
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch stats' });
  }
});

// 2. Class lists & student rosters
router.get('/classes', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const teacherId = await getTeacherId(req.user!.id);
    const classes = await prisma.class.findMany({
      where: { teacherId },
      include: { course: true, enrollments: { include: { student: { include: { user: true } } } } }
    });
    res.json(classes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/classes/:classId/students', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const enrollments = await prisma.enrollment.findMany({
      where: { classId: req.params.classId },
      include: { student: { include: { user: true } } }
    });
    res.json(enrollments.map(e => e.student));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch class roster' });
  }
});

// 3. Materials Management
router.post('/classes/:classId/materials', async (req: AuthenticatedRequest, res: Response) => {
  const { title, description, fileUrl, fileType } = req.body;
  if (!title || !fileUrl || !fileType) {
    return res.status(400).json({ error: 'Missing material parameter fields' });
  }

  try {
    const material = await prisma.material.create({
      data: {
        classId: req.params.classId,
        title,
        description,
        fileUrl,
        fileType,
        uploadedById: req.user!.id
      }
    });
    res.status(201).json(material);
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload course material' });
  }
});

// 4. Assignments Management
router.get('/classes/:classId/assignments', async (req, res) => {
  try {
    const assignments = await prisma.assignment.findMany({
      where: { classId: req.params.classId },
      include: { submissions: { include: { student: { include: { user: true } } } } }
    });
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

router.post('/classes/:classId/assignments', async (req, res) => {
  const { title, description, dueDate, maxMarks, rubric } = req.body;
  if (!title || !dueDate || !maxMarks) {
    return res.status(400).json({ error: 'Title, dueDate, and maxMarks are required' });
  }

  try {
    const assignment = await prisma.assignment.create({
      data: {
        classId: req.params.classId,
        title,
        description,
        dueDate: new Date(dueDate),
        maxMarks: Number(maxMarks),
        rubric: rubric ? JSON.stringify(rubric) : null
      }
    });
    res.status(201).json(assignment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

router.put('/submissions/:submissionId/grade', async (req, res) => {
  const { grade, feedback } = req.body;
  if (grade === undefined) return res.status(400).json({ error: 'Grade is required' });

  try {
    const submission = await prisma.assignmentSubmission.update({
      where: { id: req.params.submissionId },
      data: {
        grade: Number(grade),
        feedback,
        status: 'GRADED'
      }
    });
    res.json(submission);
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit grade' });
  }
});

// 5. Quiz Management
router.post('/classes/:classId/quizzes', async (req, res) => {
  const { title, description, durationMinutes, dueDate, maxMarks, questions } = req.body;
  if (!title || !durationMinutes || !dueDate || !maxMarks) {
    return res.status(400).json({ error: 'Missing quiz fields' });
  }

  try {
    const quiz = await prisma.quiz.create({
      data: {
        classId: req.params.classId,
        title,
        description,
        durationMinutes: Number(durationMinutes),
        dueDate: new Date(dueDate),
        maxMarks: Number(maxMarks),
      }
    });

    if (questions && Array.isArray(questions)) {
      for (const q of questions) {
        const question = await prisma.question.create({
          data: {
            quizId: quiz.id,
            questionText: q.questionText,
            type: q.type || 'MCQ',
            difficulty: q.difficulty || 'MEDIUM',
            points: q.points || 5,
          }
        });

        if (q.options && Array.isArray(q.options)) {
          await prisma.questionOption.createMany({
            data: q.options.map((opt: any) => ({
              questionId: question.id,
              optionText: opt.optionText,
              isCorrect: opt.isCorrect || false
            }))
          });
        }
      }
    }

    res.status(201).json(quiz);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to build quiz' });
  }
});

// 6. Attendance Operations
router.post('/classes/:classId/attendance', async (req, res) => {
  const { date, records } = req.body; // records: [{studentId: "...", status: "PRESENT"|"ABSENT"|...}]
  if (!date || !records || !Array.isArray(records)) {
    return res.status(400).json({ error: 'Date and list of student status records are required' });
  }

  try {
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0,0,0,0);

    const ops = records.map(rec => {
      return prisma.attendance.upsert({
        where: {
          studentId_classId_date: {
            studentId: rec.studentId,
            classId: req.params.classId,
            date: attendanceDate
          }
        },
        update: { status: rec.status, remarks: rec.remarks },
        create: {
          studentId: rec.studentId,
          classId: req.params.classId,
          date: attendanceDate,
          status: rec.status,
          remarks: rec.remarks
        }
      });
    });

    await prisma.$transaction(ops);
    res.json({ message: 'Attendance records updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to record attendance' });
  }
});

// Get attendance logs
router.get('/classes/:classId/attendance', async (req, res) => {
  try {
    const logs = await prisma.attendance.findMany({
      where: { classId: req.params.classId },
      include: { student: { include: { user: true } } },
      orderBy: { date: 'desc' }
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve attendance logs' });
  }
});

export default router;
