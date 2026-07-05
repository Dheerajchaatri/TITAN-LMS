import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { GraduationCap, Lock, Mail, Check, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Login() {
  const { login, theme, toggleTheme } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all credentials');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login attempt failed');
      }

      login(data.token, data.user);
      
      // Redirect based on role
      if (data.user.role === 'ADMIN') navigate('/admin');
      else if (data.user.role === 'TEACHER') navigate('/teacher');
      else navigate('/student');
    } catch (err: any) {
      setError(err.message || 'Connection to server failed');
    } finally {
      setLoading(false);
    }
  };

  // Quick fill helper for presentation/testing ease
  const handleQuickLogin = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword('password123');
    setError(null);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-900 text-slate-100">
      {/* Decorative gradient glowing spheres */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-950/40 filter blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-950/40 filter blur-[120px] pointer-events-none animate-pulse"></div>

      {/* Floating Header */}
      <header className="absolute top-6 left-6 right-6 flex justify-between items-center z-20">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-white">
          <GraduationCap className="h-7 w-7 text-brand-500" />
          <span>Antigravity <span className="text-brand-500">LMS</span></span>
        </div>
        <button
          onClick={toggleTheme}
          className="px-3 py-1.5 rounded-full text-xs font-semibold glass-panel text-slate-200 hover:text-white transition-colors"
        >
          {theme === 'dark' ? '☀️ Light' : '🌙 Dark'} Mode
        </button>
      </header>

      {/* Login Box */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md p-8 rounded-2xl glass-panel relative z-10 shadow-2xl"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Welcome Back</h2>
          <p className="text-sm text-slate-400 mt-2">Sign in to your learning portal workspace</p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 rounded-lg bg-red-950/50 border border-red-500/30 text-red-200 text-sm flex items-center gap-2"
          >
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@university.edu"
                className="w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded bg-slate-950 border-slate-850 accent-brand-500 text-brand-600 focus:ring-0 focus:ring-offset-0" />
              <span>Remember me</span>
            </label>
            <a href="#forgot" onClick={() => handleQuickLogin('admin@lms.com')} className="hover:text-brand-400 transition-colors">Forgot Password?</a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center shadow-lg shadow-brand-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Sign In Workspace'
            )}
          </button>
        </form>

        {/* Demo Fast Login helpers */}
        <div className="mt-8 border-t border-slate-800 pt-6">
          <p className="text-xs text-slate-400 font-semibold text-center mb-4 uppercase tracking-wider">
            Quick Sandbox Login Profiles
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleQuickLogin('admin@lms.com')}
              className="py-2 px-1 text-center border border-slate-800 bg-slate-950/40 rounded-lg text-[10px] font-bold text-brand-300 hover:bg-brand-950/40 hover:border-brand-500/50 transition-all"
            >
              👑 Admin
            </button>
            <button
              onClick={() => handleQuickLogin('teacher1@lms.com')}
              className="py-2 px-1 text-center border border-slate-800 bg-slate-950/40 rounded-lg text-[10px] font-bold text-indigo-300 hover:bg-indigo-950/40 hover:border-indigo-500/50 transition-all"
            >
              👨‍🏫 Teacher
            </button>
            <button
              onClick={() => handleQuickLogin('student1@lms.com')}
              className="py-2 px-1 text-center border border-slate-800 bg-slate-950/40 rounded-lg text-[10px] font-bold text-emerald-300 hover:bg-emerald-950/40 hover:border-emerald-500/50 transition-all"
            >
              🎓 Student
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
