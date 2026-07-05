import React, { useState, useEffect } from 'react';
import { useAuth } from '../../App';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import {
  Users,
  Briefcase,
  BookOpen,
  DollarSign,
  Plus,
  Trash2,
  Lock,
  Unlock,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function AdminDashboard() {
  const { token } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'teachers'>('dashboard');

  // Form states for adding user
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [studentForm, setStudentForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '2005-01-01',
    gender: 'Female',
    parentEmail: '',
    parentFirstName: '',
    parentPhone: ''
  });

  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [teacherForm, setTeacherForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    designation: 'Lecturer',
    qualification: 'M.Sc.'
  });

  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/dashboard-stats', {
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

  const fetchStudents = async () => {
    try {
      const res = await fetch('/api/admin/students', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStudents(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await fetch('/api/admin/teachers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTeachers(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchStats();
    fetchStudents();
    fetchTeachers();
  }, [token]);

  const handleToggleSuspended = async (studentId: string, currentSuspended: boolean) => {
    try {
      const res = await fetch(`/api/admin/students/${studentId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ suspended: !currentSuspended })
      });
      if (res.ok) {
        fetchStudents();
        fetchStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm('Are you sure you want to delete this student permanently?')) return;
    try {
      const res = await fetch(`/api/admin/students/${studentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchStudents();
        fetchStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/admin/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(studentForm)
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create student profile');
      }
      setShowAddStudent(false);
      fetchStudents();
      fetchStats();
      setStudentForm({
        email: '',
        firstName: '',
        lastName: '',
        dateOfBirth: '2005-01-01',
        gender: 'Female',
        parentEmail: '',
        parentFirstName: '',
        parentPhone: ''
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/admin/teachers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(teacherForm)
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create teacher profile');
      }
      setShowAddTeacher(false);
      fetchTeachers();
      fetchStats();
      setTeacherForm({
        email: '',
        firstName: '',
        lastName: '',
        designation: 'Lecturer',
        qualification: 'M.Sc.'
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col overflow-y-auto">
        <Navbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

        <main className="p-6 max-w-7xl w-full mx-auto space-y-6">
          {/* Sub Navigation */}
          <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 pb-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`pb-2 px-1 text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'dashboard' ? 'border-brand-500 text-brand-500' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              System Dashboard
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`pb-2 px-1 text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'students' ? 'border-brand-500 text-brand-500' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Students Database
            </button>
            <button
              onClick={() => setActiveTab('teachers')}
              className={`pb-2 px-1 text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'teachers' ? 'border-brand-500 text-brand-500' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Teachers Database
            </button>
          </div>

          {activeTab === 'dashboard' && stats && (
            <div className="space-y-6">
              {/* Stats Cards Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl glass-card relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Enrolled</span>
                      <h3 className="text-3xl font-extrabold mt-1">{stats.studentCount}</h3>
                    </div>
                    <div className="p-3 bg-brand-500/10 text-brand-400 rounded-xl">
                      <Users className="h-6 w-6" />
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl glass-card relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Active Faculty</span>
                      <h3 className="text-3xl font-extrabold mt-1">{stats.teacherCount}</h3>
                    </div>
                    <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
                      <Briefcase className="h-6 w-6" />
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl glass-card relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Courses</span>
                      <h3 className="text-3xl font-extrabold mt-1">{stats.courseCount}</h3>
                    </div>
                    <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
                      <BookOpen className="h-6 w-6" />
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl glass-card relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Fees Collected</span>
                      <h3 className="text-3xl font-extrabold mt-1">${stats.feesCollected}</h3>
                    </div>
                    <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
                      <DollarSign className="h-6 w-6" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Chart & Attendance Rates */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Enrolled students chart */}
                <div className="lg:col-span-2 p-6 rounded-2xl glass-panel">
                  <h4 className="font-bold text-base text-white mb-4">Class Enrollments Distribution</h4>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.enrollmentStats}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                        <XAxis dataKey="className" stroke="#718096" fontSize={11} />
                        <YAxis stroke="#718096" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: '#1a202c', borderColor: '#2d3748', color: '#fff' }} />
                        <Bar dataKey="studentCount" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* KPI Sidebar details */}
                <div className="p-6 rounded-2xl glass-panel space-y-6">
                  <h4 className="font-bold text-base text-white">System Performance KPIs</h4>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Daily Student Attendance</span>
                      <span className="font-bold text-brand-400">{stats.attendancePercentage}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-brand-500 h-full transition-all duration-300" style={{ width: `${stats.attendancePercentage}%` }}></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                    <div className="text-center p-3 border border-slate-800 rounded-xl">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Outstanding Fees</span>
                      <h4 className="text-lg font-extrabold text-red-400 mt-1">${stats.pendingFees}</h4>
                    </div>
                    <div className="text-center p-3 border border-slate-800 rounded-xl">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Active Users Today</span>
                      <h4 className="text-lg font-extrabold text-emerald-400 mt-1">{stats.activeUsers}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'students' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Registered Students ({students.length})</h3>
                <button
                  onClick={() => setShowAddStudent(true)}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm rounded-xl flex items-center gap-2 shadow-lg shadow-brand-600/10 transition-colors"
                >
                  <Plus className="h-4 w-4" /> Add Student
                </button>
              </div>

              {/* Add Student Popup Form */}
              {showAddStudent && (
                <div className="p-6 rounded-2xl glass-panel border-brand-500/30">
                  <div className="flex justify-between items-start mb-6">
                    <h4 className="font-bold text-lg text-white">Enroll New Student Profile</h4>
                    <button onClick={() => setShowAddStudent(false)} className="text-slate-400 hover:text-white">✕</button>
                  </div>

                  {error && (
                    <div className="mb-4 p-3 bg-red-950/40 border border-red-500/20 text-red-200 text-xs rounded-lg flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-400" />
                      <span>{error}</span>
                    </div>
                  )}

                  <form onSubmit={handleAddStudentSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="First Name"
                      required
                      value={studentForm.firstName}
                      onChange={(e) => setStudentForm({ ...studentForm, firstName: e.target.value })}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-brand-500 text-white"
                    />
                    <input
                      type="text"
                      placeholder="Last Name"
                      required
                      value={studentForm.lastName}
                      onChange={(e) => setStudentForm({ ...studentForm, lastName: e.target.value })}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-brand-500 text-white"
                    />
                    <input
                      type="email"
                      placeholder="Email Address"
                      required
                      value={studentForm.email}
                      onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-brand-500 text-white"
                    />
                    <input
                      type="date"
                      required
                      value={studentForm.dateOfBirth}
                      onChange={(e) => setStudentForm({ ...studentForm, dateOfBirth: e.target.value })}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-brand-500 text-white"
                    />
                    <select
                      value={studentForm.gender}
                      onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value })}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-brand-500 text-white"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>

                    <div className="md:col-span-2 border-t border-slate-850 pt-4 mt-2">
                      <h5 className="text-xs font-bold text-brand-400 mb-3 uppercase tracking-wider">Parent/Guardian Information</h5>
                    </div>

                    <input
                      type="text"
                      placeholder="Parent First Name"
                      value={studentForm.parentFirstName}
                      onChange={(e) => setStudentForm({ ...studentForm, parentFirstName: e.target.value })}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-brand-500 text-white"
                    />
                    <input
                      type="email"
                      placeholder="Parent Email"
                      value={studentForm.parentEmail}
                      onChange={(e) => setStudentForm({ ...studentForm, parentEmail: e.target.value })}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-brand-500 text-white"
                    />
                    <input
                      type="text"
                      placeholder="Parent Phone Number"
                      value={studentForm.parentPhone}
                      onChange={(e) => setStudentForm({ ...studentForm, parentPhone: e.target.value })}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-brand-500 text-white md:col-span-2"
                    />

                    <div className="md:col-span-2 flex justify-end gap-2 mt-4">
                      <button
                        type="button"
                        onClick={() => setShowAddStudent(false)}
                        className="px-4 py-2 border border-slate-800 text-sm font-semibold rounded-xl text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm rounded-xl"
                      >
                        Save Student
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Student Table */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-850 overflow-hidden bg-white dark:bg-slate-900/25">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-850 bg-slate-100/40 dark:bg-slate-900/50 text-slate-400 font-semibold">
                      <th className="p-4">Reg ID</th>
                      <th className="p-4">Name</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Guardian Contact</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {students.map((stu) => (
                      <tr key={stu.id} className="hover:bg-slate-100/20 dark:hover:bg-slate-900/30 transition-colors">
                        <td className="p-4 font-mono text-brand-400 font-bold">{stu.studentId}</td>
                        <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">
                          {stu.user.firstName} {stu.user.lastName}
                        </td>
                        <td className="p-4 text-slate-500 dark:text-slate-400">{stu.user.email}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 text-[10px] font-extrabold uppercase rounded-full ${
                            stu.user.suspended ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
                          }`}>
                            {stu.user.suspended ? 'Suspended' : 'Active'}
                          </span>
                        </td>
                        <td className="p-4 text-slate-500 dark:text-slate-400">
                          {stu.parent ? (
                            <div>
                              <p className="font-semibold text-slate-300">{stu.parent.emergencyContactName}</p>
                              <p className="text-[11px]">{stu.parent.emergencyContactPhone}</p>
                            </div>
                          ) : 'No Guardian Link'}
                        </td>
                        <td className="p-4">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleToggleSuspended(stu.id, stu.user.suspended)}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                stu.user.suspended 
                                  ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10' 
                                  : 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10'
                              }`}
                              title={stu.user.suspended ? 'Activate Account' : 'Suspend Account'}
                            >
                              {stu.user.suspended ? <Unlock className="h-4.5 w-4.5" /> : <Lock className="h-4.5 w-4.5" />}
                            </button>
                            <button
                              onClick={() => handleDeleteStudent(stu.id)}
                              className="p-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                              title="Delete Student"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'teachers' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Active Faculty Members ({teachers.length})</h3>
                <button
                  onClick={() => setShowAddTeacher(true)}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm rounded-xl flex items-center gap-2 shadow-lg shadow-brand-600/10 transition-colors"
                >
                  <Plus className="h-4 w-4" /> Add Faculty
                </button>
              </div>

              {/* Add Faculty Form */}
              {showAddTeacher && (
                <div className="p-6 rounded-2xl glass-panel border-brand-500/30">
                  <div className="flex justify-between items-start mb-6">
                    <h4 className="font-bold text-lg text-white">Hire Faculty Member</h4>
                    <button onClick={() => setShowAddTeacher(false)} className="text-slate-400 hover:text-white">✕</button>
                  </div>

                  {error && (
                    <div className="mb-4 p-3 bg-red-950/40 border border-red-500/20 text-red-200 text-xs rounded-lg flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-400" />
                      <span>{error}</span>
                    </div>
                  )}

                  <form onSubmit={handleAddTeacherSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="First Name"
                      required
                      value={teacherForm.firstName}
                      onChange={(e) => setTeacherForm({ ...teacherForm, firstName: e.target.value })}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-brand-500 text-white"
                    />
                    <input
                      type="text"
                      placeholder="Last Name"
                      required
                      value={teacherForm.lastName}
                      onChange={(e) => setTeacherForm({ ...teacherForm, lastName: e.target.value })}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-brand-500 text-white"
                    />
                    <input
                      type="email"
                      placeholder="Email Address"
                      required
                      value={teacherForm.email}
                      onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-brand-500 text-white md:col-span-2"
                    />
                    <input
                      type="text"
                      placeholder="Designation (e.g. Senior Professor)"
                      required
                      value={teacherForm.designation}
                      onChange={(e) => setTeacherForm({ ...teacherForm, designation: e.target.value })}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-brand-500 text-white"
                    />
                    <input
                      type="text"
                      placeholder="Qualification (e.g. Ph.D. in CS)"
                      required
                      value={teacherForm.qualification}
                      onChange={(e) => setTeacherForm({ ...teacherForm, qualification: e.target.value })}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-brand-500 text-white"
                    />

                    <div className="md:col-span-2 flex justify-end gap-2 mt-4">
                      <button
                        type="button"
                        onClick={() => setShowAddTeacher(false)}
                        className="px-4 py-2 border border-slate-800 text-sm font-semibold rounded-xl text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm rounded-xl"
                      >
                        Register Faculty
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Faculty Table */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-850 overflow-hidden bg-white dark:bg-slate-900/25">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-850 bg-slate-100/40 dark:bg-slate-900/50 text-slate-400 font-semibold">
                      <th className="p-4">Faculty ID</th>
                      <th className="p-4">Name</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Designation</th>
                      <th className="p-4">Qualification</th>
                      <th className="p-4">Active Classes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {teachers.map((teach) => (
                      <tr key={teach.id} className="hover:bg-slate-100/20 dark:hover:bg-slate-900/30 transition-colors">
                        <td className="p-4 font-mono text-brand-400 font-bold">{teach.employeeId}</td>
                        <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">
                          {teach.user.firstName} {teach.user.lastName}
                        </td>
                        <td className="p-4 text-slate-500 dark:text-slate-400">{teach.user.email}</td>
                        <td className="p-4 font-medium text-slate-300">{teach.designation}</td>
                        <td className="p-4 text-xs text-slate-400">{teach.qualification}</td>
                        <td className="p-4 text-xs">
                          {teach.classes.length > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-semibold">
                              {teach.classes.map((c: any) => c.name).join(', ')}
                            </span>
                          ) : (
                            <span className="text-slate-500 italic">No assigned classes</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
