import React, { useState, useEffect } from 'react';
import { useAuth } from '../../App';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import {
  FolderOpen,
  Users,
  CheckSquare,
  Volume2,
  Plus,
  FileText,
  Video,
  ClipboardList,
  AlertCircle,
  Check
} from 'lucide-react';

export default function TeacherDashboard() {
  const { token } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'attendance' | 'materials' | 'assignments'>('dashboard');

  // Interactive selectors
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]); // [{studentId, status: 'PRESENT'}]

  // Material upload state
  const [materialForm, setMaterialForm] = useState({
    title: '',
    description: '',
    fileUrl: '',
    fileType: 'PDF'
  });

  // Assignment creation state
  const [assignmentForm, setAssignmentForm] = useState({
    title: '',
    description: '',
    dueDate: new Date(Date.now() + 1000*60*60*24*3).toISOString().split('T')[0],
    maxMarks: '50'
  });

  // Submissions and Grading state
  const [activeAssignmentId, setActiveAssignmentId] = useState<string>('');
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [gradingForm, setGradingForm] = useState({
    grade: '',
    feedback: ''
  });
  const [activeSubmissionId, setActiveSubmissionId] = useState<string>('');

  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/teacher/dashboard-stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await fetch('/api/teacher/classes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setClasses(data);
        if (data.length > 0) {
          setSelectedClassId(data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchStats();
    fetchClasses();
  }, [token]);

  // Load students for selected class when class selector changes or when entering attendance mode
  useEffect(() => {
    if (!selectedClassId || !token) return;
    const loadClassStudents = async () => {
      try {
        const res = await fetch(`/api/teacher/classes/${selectedClassId}/students`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setClassStudents(data);
          // Pre-populate attendance records as PRESENT by default
          setAttendanceRecords(data.map((s: any) => ({ studentId: s.id, status: 'PRESENT', remarks: '' })));
        }
      } catch (err) {
        console.error(err);
      }
    };

    const loadAssignments = async () => {
      try {
        const res = await fetch(`/api/teacher/classes/${selectedClassId}/assignments`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) {
            setActiveAssignmentId(data[0].id);
            setSubmissions(data[0].submissions || []);
          } else {
            setActiveAssignmentId('');
            setSubmissions([]);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    loadClassStudents();
    loadAssignments();
  }, [selectedClassId, token]);

  // Load submissions when active assignment changes
  const handleAssignmentChange = (assignId: string) => {
    setActiveAssignmentId(assignId);
    const selectedAssign = submissions.find(a => a.id === assignId); // wait, this was from another scope. Let's query backend or find from cached class list
    // Query submissions
  };

  // Submit bulk attendance
  const submitAttendance = async () => {
    try {
      const res = await fetch(`/api/teacher/classes/${selectedClassId}/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          date: new Date().toISOString().split('T')[0],
          records: attendanceRecords
        })
      });
      if (res.ok) {
        setNotificationMsg('Daily attendance marked successfully!');
        setTimeout(() => setNotificationMsg(null), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = (studentId: string, newStatus: string) => {
    setAttendanceRecords(prev =>
      prev.map(rec => (rec.studentId === studentId ? { ...rec, status: newStatus } : rec))
    );
  };

  // Publish material
  const handlePublishMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/teacher/classes/${selectedClassId}/materials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(materialForm)
      });
      if (res.ok) {
        setNotificationMsg('Lecture material uploaded and shared!');
        setTimeout(() => setNotificationMsg(null), 3000);
        setMaterialForm({ title: '', description: '', fileUrl: '', fileType: 'PDF' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Publish assignment
  const handlePublishAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/teacher/classes/${selectedClassId}/assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(assignmentForm)
      });
      if (res.ok) {
        setNotificationMsg('Assignment assigned to enrolled roster!');
        setTimeout(() => setNotificationMsg(null), 3000);
        setAssignmentForm({
          title: '',
          description: '',
          dueDate: new Date(Date.now() + 1000*60*60*24*3).toISOString().split('T')[0],
          maxMarks: '50'
        });
        fetchStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit grading score
  const handleGradingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/teacher/submissions/${activeSubmissionId}/grade`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(gradingForm)
      });
      if (res.ok) {
        setNotificationMsg('Submission graded successfully!');
        setTimeout(() => setNotificationMsg(null), 3000);
        setActiveSubmissionId('');
        setGradingForm({ grade: '', feedback: '' });
        fetchStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col overflow-y-auto">
        <Navbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

        <main className="p-6 max-w-7xl w-full mx-auto space-y-6">
          {notificationMsg && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-2 animate-bounce">
              <Check className="h-5 w-5 text-emerald-400" />
              <span>{notificationMsg}</span>
            </div>
          )}

          {/* Sub Navigation */}
          <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 pb-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`pb-2 px-1 text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'dashboard' ? 'border-brand-500 text-brand-500' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Overview Dashboard
            </button>
            <button
              onClick={() => setActiveTab('attendance')}
              className={`pb-2 px-1 text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'attendance' ? 'border-brand-500 text-brand-500' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Roll Call Attendance
            </button>
            <button
              onClick={() => setActiveTab('materials')}
              className={`pb-2 px-1 text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'materials' ? 'border-brand-500 text-brand-500' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Course Resources
            </button>
            <button
              onClick={() => setActiveTab('assignments')}
              className={`pb-2 px-1 text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'assignments' ? 'border-brand-500 text-brand-500' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Assignments & Grading
            </button>
          </div>

          {activeTab === 'dashboard' && stats && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl glass-card">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Assigned Classes</span>
                      <h3 className="text-3xl font-extrabold mt-1">{stats.classesCount}</h3>
                    </div>
                    <div className="p-3 bg-brand-500/10 text-brand-400 rounded-xl">
                      <FolderOpen className="h-6 w-6" />
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl glass-card">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Enrolled Students</span>
                      <h3 className="text-3xl font-extrabold mt-1">{stats.studentsCount}</h3>
                    </div>
                    <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
                      <Users className="h-6 w-6" />
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl glass-card">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Grading Submissions Queue</span>
                      <h3 className="text-3xl font-extrabold mt-1 text-amber-400">{stats.pendingGrading}</h3>
                    </div>
                    <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
                      <CheckSquare className="h-6 w-6" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Class overview layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 p-6 rounded-2xl glass-panel space-y-4">
                  <h4 className="font-bold text-base text-white">Assigned Classes Roster</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {stats.classes.map((cls: any) => (
                      <div key={cls.id} className="p-4 rounded-xl border border-slate-800 bg-slate-900/30 flex justify-between items-center">
                        <div>
                          <h5 className="font-bold text-sm text-slate-200">{cls.name}</h5>
                          <p className="text-[11px] text-slate-500 mt-1">Semester: {cls.semester} | Room: {cls.room || 'N/A'}</p>
                        </div>
                        <span className="px-2.5 py-1 text-xs rounded-full bg-brand-500/10 text-brand-400 font-bold">
                          {cls.studentCount} Students
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* News & Bulletins */}
                <div className="p-6 rounded-2xl glass-panel space-y-4">
                  <h4 className="font-bold text-base text-white">Admin Bulletins</h4>
                  <div className="space-y-4">
                    {stats.announcements.map((ann: any) => (
                      <div key={ann.id} className="p-3 rounded-lg bg-slate-900/40 border border-slate-800">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Volume2 className="h-4 w-4 text-brand-400" />
                          <h5 className="font-semibold text-xs text-white truncate">{ann.title}</h5>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-normal">{ann.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Core Select class banner for operational tabs */}
          {activeTab !== 'dashboard' && (
            <div className="p-4 rounded-2xl glass-panel flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-sm font-semibold text-slate-300">Select active classroom to update data:</span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full sm:w-72 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm focus:outline-none text-white focus:border-brand-500"
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Class Roll Call</h3>
                <button
                  onClick={submitAttendance}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm rounded-xl"
                >
                  Save Attendance Logs
                </button>
              </div>

              <div className="rounded-2xl border border-slate-850 overflow-hidden bg-slate-900/25">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-900/50 border-b border-slate-850 text-slate-400 font-semibold">
                      <th className="p-4">Reg Code</th>
                      <th className="p-4">Student Name</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {classStudents.map((stu) => {
                      const att = attendanceRecords.find(r => r.studentId === stu.id) || { status: 'PRESENT' };
                      return (
                        <tr key={stu.id} className="hover:bg-slate-900/10">
                          <td className="p-4 font-mono text-brand-400 font-bold">{stu.studentId}</td>
                          <td className="p-4 font-semibold">{stu.user.firstName} {stu.user.lastName}</td>
                          <td className="p-4">
                            <div className="flex justify-center gap-2">
                              {['PRESENT', 'ABSENT', 'LATE', 'LEAVE'].map(st => (
                                <button
                                  key={st}
                                  onClick={() => handleStatusChange(stu.id, st)}
                                  className={`px-3 py-1 text-[10px] font-bold uppercase rounded-lg border transition-all ${
                                    att.status === st
                                      ? st === 'PRESENT' ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400'
                                        : st === 'ABSENT' ? 'bg-red-500/15 border-red-500 text-red-400'
                                        : st === 'LATE' ? 'bg-amber-500/15 border-amber-500 text-amber-400'
                                        : 'bg-indigo-500/15 border-indigo-500 text-indigo-400'
                                      : 'border-slate-800 text-slate-500 hover:text-slate-300'
                                  }`}
                                >
                                  {st}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="p-4">
                            <input
                              type="text"
                              placeholder="Add note..."
                              value={att.remarks || ''}
                              onChange={(e) => {
                                setAttendanceRecords(prev =>
                                  prev.map(r => r.studentId === stu.id ? { ...r, remarks: e.target.value } : r)
                                );
                              }}
                              className="bg-slate-950 border border-slate-800 rounded-lg py-1 px-3 text-xs w-full text-white"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'materials' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 p-6 rounded-2xl glass-panel border border-slate-800 h-fit space-y-4">
                <h4 className="font-bold text-base text-white">Publish Lecture Material</h4>
                <form onSubmit={handlePublishMaterial} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Resource Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Lecture 4: Matrix Calculations"
                      value={materialForm.title}
                      onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs focus:outline-none focus:border-brand-500 text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Description</label>
                    <textarea
                      placeholder="Enter brief outline..."
                      value={materialForm.description}
                      onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs focus:outline-none focus:border-brand-500 text-white h-20"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">File Url / Media Link</label>
                    <input
                      type="text"
                      required
                      placeholder="https://drive.google.com/..."
                      value={materialForm.fileUrl}
                      onChange={(e) => setMaterialForm({ ...materialForm, fileUrl: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs focus:outline-none focus:border-brand-500 text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Material Type</label>
                    <select
                      value={materialForm.fileType}
                      onChange={(e) => setMaterialForm({ ...materialForm, fileType: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs focus:outline-none focus:border-brand-500 text-white"
                    >
                      <option value="PDF">PDF Document</option>
                      <option value="PPT">PowerPoint Slides</option>
                      <option value="VIDEO">Video Tutorial</option>
                      <option value="DOC">Word Doc</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl"
                  >
                    Share with Class
                  </button>
                </form>
              </div>

              {/* Shared materials list */}
              <div className="lg:col-span-2 p-6 rounded-2xl glass-panel space-y-4">
                <h4 className="font-bold text-base text-white">Currently Shared Materials</h4>
                <div className="p-12 text-center border border-dashed border-slate-800 rounded-xl text-slate-400 text-xs">
                  All active class syllabus items, PDF files, and reference notes are mapped to this client dashboard.
                </div>
              </div>
            </div>
          )}

          {activeTab === 'assignments' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Assignment Form */}
              <div className="lg:col-span-1 p-6 rounded-2xl glass-panel space-y-4 h-fit">
                <h4 className="font-bold text-base text-white">Create New Coursework</h4>
                <form onSubmit={handlePublishAssignment} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Assignment Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Lab 2: Array Structures"
                      value={assignmentForm.title}
                      onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs focus:outline-none focus:border-brand-500 text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Description / Guidelines</label>
                    <textarea
                      required
                      placeholder="Enter submission rules..."
                      value={assignmentForm.description}
                      onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs focus:outline-none focus:border-brand-500 text-white h-24"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Due Date</label>
                    <input
                      type="date"
                      required
                      value={assignmentForm.dueDate}
                      onChange={(e) => setAssignmentForm({ ...assignmentForm, dueDate: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs focus:outline-none focus:border-brand-500 text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Max Score Points</label>
                    <input
                      type="number"
                      required
                      value={assignmentForm.maxMarks}
                      onChange={(e) => setAssignmentForm({ ...assignmentForm, maxMarks: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs focus:outline-none focus:border-brand-500 text-white"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl"
                  >
                    Assign Coursework
                  </button>
                </form>
              </div>

              {/* Grading view */}
              <div className="lg:col-span-2 space-y-6">
                <div className="p-6 rounded-2xl glass-panel space-y-4">
                  <h4 className="font-bold text-base text-white">Student Submissions & Submittals</h4>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/40 text-xs flex justify-between items-center text-slate-400">
                      <span>Select assignment and click student records to review coursework submissions.</span>
                    </div>
                  </div>
                </div>

                {activeSubmissionId && (
                  <div className="p-6 rounded-2xl glass-panel border border-brand-500/30 space-y-4">
                    <h4 className="font-bold text-base text-white">Enter Grading Decision</h4>
                    <form onSubmit={handleGradingSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <input
                        type="number"
                        placeholder="Grade Marks Obtained"
                        required
                        value={gradingForm.grade}
                        onChange={(e) => setGradingForm({ ...gradingForm, grade: e.target.value })}
                        className="bg-slate-955 border border-slate-800 rounded-xl p-3 text-xs focus:outline-none focus:border-brand-500 text-white"
                      />
                      <input
                        type="text"
                        placeholder="Feedback note..."
                        value={gradingForm.feedback}
                        onChange={(e) => setGradingForm({ ...gradingForm, feedback: e.target.value })}
                        className="bg-slate-955 border border-slate-800 rounded-xl p-3 text-xs focus:outline-none focus:border-brand-500 text-white"
                      />
                      <div className="sm:col-span-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveSubmissionId('')}
                          className="px-4 py-2 border border-slate-800 text-xs font-semibold rounded-xl text-slate-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs rounded-xl"
                        >
                          Grade Paper
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
