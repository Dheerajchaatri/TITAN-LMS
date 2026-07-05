import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../db';
import { authenticateJWT, requireRole, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Apply admin protection to all routes in this file
router.use(authenticateJWT);
router.use(requireRole(['ADMIN']));

// 1. Dashboard Metrics
router.get('/dashboard-stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentCount = await prisma.student.count();
    const teacherCount = await prisma.teacher.count();
    const courseCount = await prisma.course.count();
    const classCount = await prisma.class.count();
    
    // Fee collections
    const payments = await prisma.payment.findMany();
    const feesCollected = payments.reduce((sum: number, p: any) => sum + p.amount, 0);

    // Simple sum of all unpaid fee structures
    const allStudentFees = await prisma.studentFee.findMany({
      include: {
        feeStructure: true,
        payments: true
      }
    });

    let totalPending = 0;
    allStudentFees.forEach(sf => {
      const totalCharged = sf.feeStructure.amount + sf.fine - sf.discount - sf.scholarship;
      const totalPaid = sf.payments.reduce((sum: number, p: any) => sum + p.amount, 0);
      const remaining = Math.max(0, totalCharged - totalPaid);
      totalPending += remaining;
    });

    // Attendance rate
    const totalAttendanceCount = await prisma.attendance.count();
    const presentAttendanceCount = await prisma.attendance.count({
      where: { status: 'PRESENT' }
    });
    const attendancePercentage = totalAttendanceCount > 0 
      ? Math.round((presentAttendanceCount / totalAttendanceCount) * 100) 
      : 100;

    // Enrollments distribution for chart
    const classes = await prisma.class.findMany({
      include: {
        course: true,
        enrollments: true
      }
    });
    const enrollmentStats = classes.map(c => ({
      className: c.name,
      courseCode: c.course.code,
      studentCount: c.enrollments.length
    }));

    // Active vs Suspended users
    const activeUsers = await prisma.user.count({ where: { suspended: false } });
    const suspendedUsers = await prisma.user.count({ where: { suspended: true } });

    res.json({
      studentCount,
      teacherCount,
      courseCount,
      classCount,
      feesCollected,
      pendingFees: totalPending,
      attendancePercentage,
      activeUsers,
      suspendedUsers,
      enrollmentStats
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve dashboard statistics' });
  }
});

// 2. Student Management
router.get('/students', async (req, res) => {
  const { search } = req.query;
  try {
    const students = await prisma.student.findMany({
      where: search ? {
        OR: [
          { studentId: { contains: String(search) } },
          { user: { firstName: { contains: String(search) } } },
          { user: { lastName: { contains: String(search) } } },
          { user: { email: { contains: String(search) } } },
        ]
      } : undefined,
      include: {
        user: true,
        parent: { include: { user: true } },
        enrollments: { include: { class: { include: { course: true } } } }
      }
    });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch students list' });
  }
});

router.post('/students', async (req, res) => {
  const { email, password, firstName, lastName, dateOfBirth, gender, academicHistory, parentEmail, parentFirstName, parentLastName, parentPhone } = req.body;
  
  if (!email || !firstName || !lastName || !dateOfBirth || !gender) {
    return res.status(400).json({ error: 'Missing mandatory fields' });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'Email already exists' });

    const studentRole = await prisma.role.findUnique({ where: { name: 'STUDENT' } });
    const parentRole = await prisma.role.findUnique({ where: { name: 'PARENT' } });
    if (!studentRole || !parentRole) return res.status(500).json({ error: 'Roles not seeded properly' });

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password || 'password123', salt);

    // Check or create parent
    let parentId: string | null = null;
    if (parentEmail) {
      let parentUser = await prisma.user.findUnique({ where: { email: parentEmail } });
      if (!parentUser) {
        parentUser = await prisma.user.create({
          data: {
            email: parentEmail,
            passwordHash,
            firstName: parentFirstName || 'ParentOf',
            lastName: lastName,
            roleId: parentRole.id,
            isEmailVerified: true
          }
        });
      }

      let parentProfile = await prisma.parent.findUnique({ where: { userId: parentUser.id } });
      if (!parentProfile) {
        parentProfile = await prisma.parent.create({
          data: {
            userId: parentUser.id,
            emergencyContactName: `${parentFirstName || ''} ${lastName}`.trim(),
            emergencyContactPhone: parentPhone || '+1-000-0000',
            emergencyContactRelationship: 'Guardian'
          }
        });
      }
      parentId = parentProfile.id;
    }

    const nextStudentNum = (await prisma.student.count()) + 1;
    const generatedId = `STU${String(nextStudentNum).padStart(3, '0')}`;

    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        roleId: studentRole.id,
        isEmailVerified: true,
        student: {
          create: {
            studentId: generatedId,
            dateOfBirth: new Date(dateOfBirth),
            gender,
            parentId,
            academicHistory: academicHistory ? JSON.stringify(academicHistory) : null
          }
        }
      },
      include: {
        student: true
      }
    });

    res.status(201).json(newUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create student' });
  }
});

router.delete('/students/:id', async (req, res) => {
  try {
    const student = await prisma.student.findUnique({ where: { id: req.params.id } });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    // Delete related User which cascades to Student
    await prisma.user.delete({ where: { id: student.userId } });
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

router.put('/students/:id/status', async (req, res) => {
  const { suspended } = req.body;
  try {
    const student = await prisma.student.findUnique({ where: { id: req.params.id } });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    await prisma.user.update({
      where: { id: student.userId },
      data: { suspended }
    });

    res.json({ message: `Student status updated to ${suspended ? 'Suspended' : 'Active'}` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update student status' });
  }
});

// 3. Teacher Management
router.get('/teachers', async (req, res) => {
  try {
    const teachers = await prisma.teacher.findMany({
      include: {
        user: true,
        classes: { include: { course: true } }
      }
    });
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
});

router.post('/teachers', async (req, res) => {
  const { email, password, firstName, lastName, designation, qualification } = req.body;
  if (!email || !firstName || !lastName || !designation) {
    return res.status(400).json({ error: 'Missing mandatory fields' });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'Email already exists' });

    const teacherRole = await prisma.role.findUnique({ where: { name: 'TEACHER' } });
    if (!teacherRole) return res.status(500).json({ error: 'Teacher role not seeded' });

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password || 'password123', salt);

    const nextTeacherNum = (await prisma.teacher.count()) + 1;
    const generatedId = `EMP${String(nextTeacherNum).padStart(3, '0')}`;

    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        roleId: teacherRole.id,
        isEmailVerified: true,
        teacher: {
          create: {
            employeeId: generatedId,
            designation,
            qualification: qualification || 'M.Sc.'
          }
        }
      },
      include: {
        teacher: true
      }
    });

    res.status(201).json(newUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create teacher' });
  }
});

// 4. Course & Class Scheduling Management
router.get('/courses', async (req, res) => {
  try {
    const courses = await prisma.course.findMany({
      include: { category: true, classes: { include: { teacher: { include: { user: true } } } } }
    });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load courses' });
  }
});

router.post('/courses', async (req, res) => {
  const { code, title, description, categoryName } = req.body;
  if (!code || !title || !categoryName) {
    return res.status(400).json({ error: 'Code, title, and category name are required' });
  }

  try {
    let category = await prisma.courseCategory.findUnique({ where: { name: categoryName } });
    if (!category) {
      category = await prisma.courseCategory.create({
        data: { name: categoryName, description: `${categoryName} Courses` }
      });
    }

    const course = await prisma.course.create({
      data: {
        code,
        title,
        description,
        categoryId: category.id
      }
    });
    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create course' });
  }
});

router.post('/classes', async (req, res) => {
  const { courseId, teacherId, name, semester, academicYear, room, schedule } = req.body;
  if (!courseId || !teacherId || !name || !semester || !academicYear) {
    return res.status(400).json({ error: 'Required fields missing for Class creation' });
  }

  try {
    const newClass = await prisma.class.create({
      data: {
        courseId,
        teacherId,
        name,
        semester,
        academicYear,
        room,
        schedule: schedule ? JSON.stringify(schedule) : null
      }
    });
    res.status(201).json(newClass);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create Class' });
  }
});

router.post('/classes/:id/enroll', async (req, res) => {
  const { studentId } = req.body;
  try {
    const classEntity = await prisma.class.findUnique({ where: { id: req.params.id } });
    if (!classEntity) return res.status(404).json({ error: 'Class not found' });

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const enrollment = await prisma.enrollment.create({
      data: {
        studentId,
        classId: req.params.id
      }
    });
    res.status(201).json(enrollment);
  } catch (error) {
    res.status(400).json({ error: 'Student is already enrolled in this class' });
  }
});

export default router;
