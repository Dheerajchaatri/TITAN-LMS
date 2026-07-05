import { Router, Response } from 'express';
import prisma from '../db';
import { authenticateJWT, requireRole, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Apply student role authentication
router.use(authenticateJWT);
router.use(requireRole(['STUDENT']));

// Helper to fetch student ID
const getStudentId = async (userId: string) => {
  const student = await prisma.student.findUnique({ where: { userId } });
  if (!student) throw new Error('Student profile not found');
  return student.id;
};

// 1. Student Dashboard Data
router.get('/dashboard-stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentId = await getStudentId(req.user!.id);
    
    // Enrollments
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId },
      include: {
        class: {
          include: {
            course: true,
            teacher: { include: { user: true } },
            assignments: true,
            quizzes: true
          }
        }
      }
    });

    const classIds = enrollments.map(e => e.classId);

    // Attendance rates
    const attendanceLogs = await prisma.attendance.findMany({ where: { studentId } });
    const totalDays = attendanceLogs.length;
    const presentDays = attendanceLogs.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
    const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

    // Upcoming assignments (not submitted yet and due date in future)
    const now = new Date();
    const upcomingAssignments = await prisma.assignment.findMany({
      where: {
        classId: { in: classIds },
        dueDate: { gt: now },
        submissions: {
          none: { studentId }
        }
      },
      include: { class: { include: { course: true } } }
    });

    // Unsubmitted Quizzes
    const upcomingQuizzes = await prisma.quiz.findMany({
      where: {
        classId: { in: classIds },
        dueDate: { gt: now },
        attempts: {
          none: { studentId }
        }
      },
      include: { class: { include: { course: true } } }
    });

    // Fee dashboard invoice stats
    const studentFees = await prisma.studentFee.findMany({
      where: { studentId },
      include: { feeStructure: true, payments: true }
    });

    let feesPaid = 0;
    let feesDue = 0;
    studentFees.forEach(sf => {
      const netCharged = sf.feeStructure.amount + sf.fine - sf.discount - sf.scholarship;
      const paid = sf.payments.reduce((sum, p) => sum + p.amount, 0);
      feesPaid += paid;
      feesDue += Math.max(0, netCharged - paid);
    });

    // Midterm Results and Grades
    const results = await prisma.result.findMany({
      where: { studentId },
      include: { exam: true, grade: true }
    });

    res.json({
      classes: enrollments.map(e => ({
        id: e.class.id,
        name: e.class.name,
        courseCode: e.class.course.code,
        courseTitle: e.class.course.title,
        teacherName: `${e.class.teacher.user.firstName} ${e.class.teacher.user.lastName}`,
        room: e.class.room,
        schedule: e.class.schedule ? JSON.parse(e.class.schedule) : []
      })),
      attendancePercentage,
      upcomingAssignments,
      upcomingQuizzes,
      feesPaid,
      feesDue,
      results
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch student details' });
  }
});

// 2. Class Materials View
router.get('/classes/:classId/materials', async (req, res) => {
  try {
    const materials = await prisma.material.findMany({
      where: { classId: req.params.classId },
      include: { uploadedBy: true }
    });
    res.json(materials);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch course materials' });
  }
});

// 3. Assignments Submission
router.get('/classes/:classId/assignments', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentId = await getStudentId(req.user!.id);
    const assignments = await prisma.assignment.findMany({
      where: { classId: req.params.classId },
      include: {
        submissions: {
          where: { studentId }
        }
      }
    });
    res.json(assignments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/assignments/:assignmentId/submit', async (req: AuthenticatedRequest, res: Response) => {
  const { submissionText, fileUrl } = req.body;
  if (!submissionText && !fileUrl) {
    return res.status(400).json({ error: 'Please enter a submission response or upload a file' });
  }

  try {
    const studentId = await getStudentId(req.user!.id);
    
    // Check if deadline is passed to mark as LATE
    const assignment = await prisma.assignment.findUnique({
      where: { id: req.params.assignmentId }
    });
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    const status = new Date() > new Date(assignment.dueDate) ? 'LATE' : 'SUBMITTED';

    const submission = await prisma.assignmentSubmission.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId: req.params.assignmentId,
          studentId
        }
      },
      update: {
        submissionText,
        fileUrl,
        submittedAt: new Date(),
        status: status === 'LATE' ? 'LATE' : 'RESUBMITTED'
      },
      create: {
        assignmentId: req.params.assignmentId,
        studentId,
        submissionText,
        fileUrl,
        status
      }
    });

    res.status(201).json(submission);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 4. Quiz Attempt Submission
router.get('/quizzes/:quizId', async (req, res) => {
  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: req.params.quizId },
      include: {
        questions: {
          include: {
            options: {
              select: { id: true, optionText: true } // Hide isCorrect to prevent cheating
            }
          }
        }
      }
    });
    res.json(quiz);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch quiz' });
  }
});

router.post('/quizzes/:quizId/attempt', async (req: AuthenticatedRequest, res: Response) => {
  const { answers } = req.body; // Map of questionId -> optionId
  if (!answers || typeof answers !== 'object') {
    return res.status(400).json({ error: 'Answers payload is required' });
  }

  try {
    const studentId = await getStudentId(req.user!.id);
    
    // Fetch quiz with correct options to auto-grade
    const quiz = await prisma.quiz.findUnique({
      where: { id: req.params.quizId },
      include: { questions: { include: { options: true } } }
    });

    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    // Calculate score
    let score = 0;
    for (const q of quiz.questions) {
      const selectedOptionId = answers[q.id];
      const correctOption = q.options.find(o => o.isCorrect);
      
      if (correctOption && selectedOptionId === correctOption.id) {
        score += q.points;
      } else if (quiz.negativeMarking) {
        score -= q.points * 0.25; // standard negative marking penalty
      }
    }

    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId: quiz.id,
        studentId,
        score: Math.max(0, score),
        feedback: `Auto-graded. Scored ${Math.max(0, score)} out of ${quiz.maxMarks} marks.`
      }
    });

    res.json({
      attemptId: attempt.id,
      score: attempt.score,
      feedback: attempt.feedback
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Fees Management
router.get('/fees', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentId = await getStudentId(req.user!.id);
    const fees = await prisma.studentFee.findMany({
      where: { studentId },
      include: { feeStructure: true, payments: true }
    });
    res.json(fees);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/fees/:studentFeeId/pay', async (req: AuthenticatedRequest, res: Response) => {
  const { amount, paymentMethod } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid payment amount' });

  try {
    const studentFee = await prisma.studentFee.findUnique({
      where: { id: req.params.studentFeeId },
      include: { feeStructure: true, payments: true }
    });

    if (!studentFee) return res.status(404).json({ error: 'Fee invoice record not found' });

    const totalCharged = studentFee.feeStructure.amount + studentFee.fine - studentFee.discount - studentFee.scholarship;
    const currentPaid = studentFee.payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = totalCharged - currentPaid;

    if (amount > remaining) {
      return res.status(400).json({ error: `Amount exceeds the outstanding balance of $${remaining}` });
    }

    const txnId = `TXN_${Date.now()}_MOCK`;
    const payment = await prisma.payment.create({
      data: {
        studentFeeId: req.params.studentFeeId,
        amount: Number(amount),
        paymentMethod: paymentMethod || 'CARD',
        transactionId: txnId,
        receiptUrl: `/receipts/${txnId}.pdf`
      }
    });

    // Update StudentFee status
    const newPaid = currentPaid + amount;
    const newStatus = newPaid >= totalCharged ? 'PAID' : 'PARTIAL';
    await prisma.studentFee.update({
      where: { id: req.params.studentFeeId },
      data: { status: newStatus }
    });

    res.status(201).json({ payment, newStatus });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Profile Info Update
router.get('/profile', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const student = await prisma.student.findUnique({
      where: { userId: req.user!.id },
      include: { user: true, parent: { include: { user: true } } }
    });
    res.json(student);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve profile data' });
  }
});

router.put('/profile', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const { dateOfBirth, gender, emergencyContactName, emergencyContactPhone, emergencyContactRelationship } = req.body;
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user!.id } });
    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    await prisma.student.update({
      where: { id: student.id },
      data: {
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : student.dateOfBirth,
        gender: gender || student.gender
      }
    });

    if (student.parentId) {
      await prisma.parent.update({
        where: { id: student.parentId },
        data: {
          emergencyContactName,
          emergencyContactPhone,
          emergencyContactRelationship
        }
      });
    }

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
