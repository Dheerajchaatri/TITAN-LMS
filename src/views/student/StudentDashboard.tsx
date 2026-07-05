import React, { useState, useEffect } from 'react';
import { useAuth } from '../../App';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import {
  BookOpen,
  Calendar,
  DollarSign,
  FileSpreadsheet,
  FileText,
  Clock,
  CheckCircle,
  HelpCircle,
  CreditCard,
  User,
  GraduationCap
} from 'lucide-react';

export default function StudentDashboard() {
  const { token } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'courses' | 'fees' | 'profile'>('dashboard');

  // Active courses and items
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [materials, setMaterials] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);

  // Submission form state
  const [activeAssignmentId, setActiveAssignmentId] = useState<string>('');
  const [submissionText, setSubmissionText] = useState('');
  
  // Fees payment state
  const [feeBills, setFeeBills] = useState<any[]>([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [payingBillId, setPayingBillId] = useState('');

  // Profile fields state
  const [profile, setProfile] = useState<any>(null);
  const [profileForm, setProfileForm] = useState({
    dateOfBirth: '',
    gender: 'Female',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: 'Father'
  });

  const [notification, setNotification] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/student/dashboard-stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        if (data.classes.length > 0) {
          setSelectedClassId(data.classes[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFees = async () => {
    try {
      const res = await fetch('/api/student/fees', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFeeBills(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/student/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setProfileForm({
          dateOfBirth: data.dateOfBirth?.split('T')[0] || '2004-05-15',
          gender: data.gender || 'Male',
          emergencyContactName: data.parent?.emergencyContactName || '',
          emergencyContactPhone: data.parent?.emergencyContactPhone || '',
          emergencyContactRelationship: data.parent?.emergencyContactRelationship || 'Guardian'
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchStats();
    fetchFees();
    fetchProfile();
  }, [token]);

  // Load course materials and assignments when selected class changes
  useEffect(() => {
    if (!selectedClassId || !token) return;
    const fetchClassResources = async () => {
      try {
        // Fetch materials
        const resMat = await fetch(`/api/student/classes/${selectedClassId}/materials`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (resMat.ok) {
          const data = await resMat.json();
          setMaterials(data);
        }

        // Fetch assignments
        const resAssign = await fetch(`/api/student/classes/${selectedClassId}/assignments`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (resAssign.ok) {
          const data = await resAssign.json();
          setAssignments(data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchClassResources();
  }, [selectedClassId, token]);

  // Submit assignment responses
  const handleAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/student/assignments/${activeAssignmentId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ submissionText })
      });
      if (res.ok) {
        setNotification('Assignment submitted successfully!');
        setTimeout(() => setNotification(null), 3000);
        setActiveAssignmentId('');
        setSubmissionText('');
        fetchStats();
        // Refresh class assignments
        const resAssign = await fetch(`/api/student/classes/${selectedClassId}/assignments`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (resAssign.ok) {
          setAssignments(await resAssign.json());
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Pay bills
  const handlePayFee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/student/fees/${payingBillId}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amount: Number(paymentAmount), paymentMethod: 'CARD' })
      });
      if (res.ok) {
        setNotification('Mock payment processed. Invoice cleared!');
        setTimeout(() => setNotification(null), 3000);
        setPayingBillId('');
        setPaymentAmount('');
        fetchFees();
        fetchStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update profile
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/student/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(profileForm)
      });
      if (res.ok) {
        setNotification('Academic profile information updated!');
        setTimeout(() => setNotification(null), 3000);
        fetchProfile();
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
          {notification && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-2 animate-bounce">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
              <span>{notification}</span>
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
              Portal Dashboard
            </button>
            <button
              onClick={() => setActiveTab('courses')}
              className={`pb-2 px-1 text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'courses' ? 'border-brand-500 text-brand-500' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Classes & Coursework
            </button>
            <button
              onClick={() => setActiveTab('fees')}
              className={`pb-2 px-1 text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'fees' ? 'border-brand-500 text-brand-500' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Fees & Billings
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`pb-2 px-1 text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'profile' ? 'border-brand-500 text-brand-500' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Academic Profile
            </button>
          </div>

          {activeTab === 'dashboard' && stats && (
            <div className="space-y-6">
              {/* Stats Widgets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl glass-card">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Attendance Rate</span>
                  <h3 className="text-3xl font-extrabold mt-1 text-emerald-400">{stats.attendancePercentage}%</h3>
                </div>
                
                <div className="p-5 rounded-2xl glass-card">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Due Assignments</span>
                  <h3 className="text-3xl font-extrabold mt-1 text-brand-400">{stats.upcomingAssignments.length}</h3>
                </div>

                <div className="p-5 rounded-2xl glass-card">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Upcoming Quizzes</span>
                  <h3 className="text-3xl font-extrabold mt-1 text-indigo-400">{stats.upcomingQuizzes.length}</h3>
                </div>

                <div className="p-5 rounded-2xl glass-card">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Pending Tuition</span>
                  <h3 className="text-3xl font-extrabold mt-1 text-red-400">${stats.feesDue}</h3>
                </div>
              </div>

              {/* Class rosters & exam scores */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 p-6 rounded-2xl glass-panel space-y-4">
                  <h4 className="font-bold text-base text-white">My Active Class Timetable</h4>
                  <div className="space-y-3">
                    {stats.classes.map((cls: any) => (
                      <div key={cls.id} className="p-4 rounded-xl border border-slate-800 bg-slate-900/30 flex justify-between items-center">
                        <div>
                          <h5 className="font-bold text-sm text-slate-200">{cls.courseTitle}</h5>
                          <p className="text-[11px] text-slate-400 mt-1">Instructor: {cls.teacherName} | Room: {cls.room}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-brand-400 bg-brand-500/10 px-2.5 py-0.5 rounded-full">
                            {cls.courseCode}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Latest exam grade slips */}
                <div className="p-6 rounded-2xl glass-panel space-y-4">
                  <h4 className="font-bold text-base text-white">Academic Results Summary</h4>
                  {stats.results.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 italic">No published exams yet.</div>
                  ) : (
                    stats.results.map((res: any) => (
                      <div key={res.id} className="p-3 rounded-xl border border-slate-800 bg-slate-900/40 flex justify-between items-center">
                        <div>
                          <h5 className="font-bold text-xs text-white">{res.exam.title}</h5>
                          <p className="text-[9px] text-slate-400 mt-1">Marks Obtained: {res.marksObtained}/100</p>
                        </div>
                        <span className="h-8 w-8 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold flex items-center justify-center text-xs">
                          {res.grade.name}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'courses' && stats && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl glass-panel flex flex-col sm:flex-row items-center justify-between gap-4">
                <span className="text-sm font-semibold text-slate-300">Choose Enrolled Subject:</span>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full sm:w-72 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm focus:outline-none text-white focus:border-brand-500"
                >
                  {stats.classes.map((cls: any) => (
                    <option key={cls.id} value={cls.id}>{cls.courseTitle} ({cls.courseCode})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Course resources downloads */}
                <div className="p-6 rounded-2xl glass-panel space-y-4">
                  <h4 className="font-bold text-base text-white flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-brand-400" /> Lecture Notes & Slides
                  </h4>
                  <div className="space-y-3">
                    {materials.length === 0 ? (
                      <div className="p-12 text-center text-xs text-slate-500 italic">No files shared for this class yet.</div>
                    ) : (
                      materials.map((mat) => (
                        <div key={mat.id} className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/30 flex justify-between items-center hover:bg-slate-900/50 transition-colors">
                          <div>
                            <h5 className="font-bold text-xs text-white">{mat.title}</h5>
                            <p className="text-[10px] text-slate-400 mt-1">{mat.description}</p>
                          </div>
                          <a
                            href={mat.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1 bg-brand-600 hover:bg-brand-500 text-[10px] font-bold uppercase rounded-lg text-white"
                          >
                            Download {mat.fileType}
                          </a>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Course assignments view & submit */}
                <div className="p-6 rounded-2xl glass-panel space-y-4">
                  <h4 className="font-bold text-base text-white flex items-center gap-2">
                    <FileText className="h-5 w-5 text-indigo-400" /> Pending Classwork
                  </h4>
                  <div className="space-y-4">
                    {assignments.length === 0 ? (
                      <div className="p-12 text-center text-xs text-slate-500 italic">No assigned coursework items.</div>
                    ) : (
                      assignments.map((assign) => {
                        const hasSub = assign.submissions && assign.submissions.length > 0;
                        const sub = hasSub ? assign.submissions[0] : null;

                        return (
                          <div key={assign.id} className="p-4 rounded-xl border border-slate-800 bg-slate-900/30 space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <h5 className="font-bold text-xs text-white">{assign.title}</h5>
                                <p className="text-[10px] text-slate-400 leading-relaxed mt-1">{assign.description}</p>
                              </div>
                              <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full ${
                                hasSub ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                              }`}>
                                {hasSub ? 'Submitted' : 'Pending'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between border-t border-slate-850 pt-2 text-[10px] text-slate-400">
                              <span>Max Score Points: {assign.maxMarks}</span>
                              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Due: {new Date(assign.dueDate).toLocaleDateString()}</span>
                            </div>

                            {hasSub ? (
                              <div className="p-2.5 bg-slate-950/60 rounded-lg text-[10px]">
                                <p className="font-semibold text-slate-300">My Response:</p>
                                <p className="text-slate-400 italic mt-0.5 truncate">{sub.submissionText}</p>
                                {sub.grade !== null && (
                                  <div className="mt-2 border-t border-slate-800 pt-1.5 flex justify-between text-brand-400 font-bold">
                                    <span>Marks Scored: {sub.grade}/{assign.maxMarks}</span>
                                    <span className="text-slate-400">Feedback: "{sub.feedback}"</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={() => setActiveAssignmentId(assign.id)}
                                className="w-full py-1.5 bg-indigo-650 hover:bg-indigo-500 text-white font-semibold text-[10px] rounded-lg transition-colors"
                              >
                                Upload Submission Answer
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Submission popup modal */}
              {activeAssignmentId && (
                <div className="p-6 rounded-2xl glass-panel border border-brand-500/30 mt-6">
                  <h4 className="font-bold text-base text-white mb-4">Submit Assignment Work</h4>
                  <form onSubmit={handleAssignmentSubmit} className="space-y-4">
                    <textarea
                      required
                      placeholder="Write your python code or answer summary text..."
                      value={submissionText}
                      onChange={(e) => setSubmissionText(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs focus:outline-none focus:border-brand-500 text-white h-32 font-mono"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => { setActiveAssignmentId(''); setSubmissionText(''); }}
                        className="px-4 py-2 border border-slate-800 text-xs font-semibold rounded-xl text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs rounded-xl"
                      >
                        Submit Response
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {activeTab === 'fees' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold">Tuition Invoices & Fees Statements</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {feeBills.map((bill) => {
                  const netCharged = bill.feeStructure.amount + bill.fine - bill.discount - bill.scholarship;
                  const currentPaid = bill.payments.reduce((sum: number, p: any) => sum + p.amount, 0);
                  const isPaid = bill.status === 'PAID';

                  return (
                    <div key={bill.id} className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-sm text-slate-200">{bill.feeStructure.name}</h4>
                          <span className="text-[10px] text-slate-500">Term: {bill.feeStructure.academicYear} | Due: {new Date(bill.feeStructure.dueDate).toLocaleDateString()}</span>
                        </div>
                        <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full ${
                          isPaid ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {bill.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs border-t border-b border-slate-850 py-3">
                        <div className="space-y-1">
                          <p className="text-slate-500">Original Amount: <span className="font-semibold text-slate-300">${bill.feeStructure.amount}</span></p>
                          <p className="text-slate-500">Discount: <span className="font-semibold text-emerald-400">-${bill.discount}</span></p>
                          <p className="text-slate-500">Scholarship: <span className="font-semibold text-emerald-400">-${bill.scholarship}</span></p>
                        </div>
                        <div className="space-y-1 text-right">
                          <p className="text-slate-500">Late Fee Fine: <span className="font-semibold text-red-400">+${bill.fine}</span></p>
                          <p className="text-slate-200 font-bold">Total Net Due: <span>${netCharged}</span></p>
                          <p className="text-brand-400 font-bold">Total Paid: <span>${currentPaid}</span></p>
                        </div>
                      </div>

                      {!isPaid && (
                        <div className="flex justify-between items-center">
                          <button
                            onClick={() => { setPayingBillId(bill.id); setPaymentAmount(String(netCharged - currentPaid)); }}
                            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs rounded-xl flex items-center gap-1"
                          >
                            <CreditCard className="h-4 w-4" /> Clear Balance Invoice
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Payment popup modal */}
              {payingBillId && (
                <div className="p-6 rounded-2xl glass-panel border border-brand-500/30 max-w-md">
                  <h4 className="font-bold text-sm text-white mb-4">Pay Tuition Invoices</h4>
                  <form onSubmit={handlePayFee} className="space-y-4">
                    <input
                      type="number"
                      required
                      placeholder="Amount to pay ($)"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs focus:outline-none focus:border-brand-500 text-white"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => { setPayingBillId(''); setPaymentAmount(''); }}
                        className="px-4 py-2 border border-slate-800 text-xs font-semibold rounded-xl text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs rounded-xl"
                      >
                        Submit Card Payment
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {activeTab === 'profile' && profile && (
            <div className="max-w-2xl p-6 rounded-2xl glass-panel space-y-6">
              <h3 className="text-xl font-bold flex items-center gap-2"><User className="h-6 w-6 text-brand-400" /> Student Profile & Emergency Contacts</h3>
              
              <div className="flex items-center gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-850">
                <img
                  src={profile.user.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=80'}
                  alt="Profile"
                  className="h-16 w-16 rounded-full border border-slate-700 object-cover"
                />
                <div>
                  <h4 className="font-bold text-base text-white">{profile.user.firstName} {profile.user.lastName}</h4>
                  <p className="text-xs text-slate-400">Reg ID: <span className="font-mono text-brand-400">{profile.studentId}</span></p>
                </div>
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Date of Birth</label>
                    <input
                      type="date"
                      value={profileForm.dateOfBirth}
                      onChange={(e) => setProfileForm({ ...profileForm, dateOfBirth: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs focus:outline-none focus:border-brand-500 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Gender</label>
                    <select
                      value={profileForm.gender}
                      onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs focus:outline-none focus:border-brand-500 text-white"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-slate-850 pt-4 mt-2">
                  <h4 className="text-xs font-bold text-brand-400 mb-3 uppercase tracking-wider">Guardian & Emergency Information</h4>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Emergency Name</label>
                    <input
                      type="text"
                      value={profileForm.emergencyContactName}
                      onChange={(e) => setProfileForm({ ...profileForm, emergencyContactName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs focus:outline-none focus:border-brand-500 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Relationship</label>
                    <input
                      type="text"
                      value={profileForm.emergencyContactRelationship}
                      onChange={(e) => setProfileForm({ ...profileForm, emergencyContactRelationship: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs focus:outline-none focus:border-brand-500 text-white"
                    />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="text-xs text-slate-400">Emergency Phone</label>
                    <input
                      type="text"
                      value={profileForm.emergencyContactPhone}
                      onChange={(e) => setProfileForm({ ...profileForm, emergencyContactPhone: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs focus:outline-none focus:border-brand-500 text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl"
                >
                  Save Profile Settings
                </button>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
