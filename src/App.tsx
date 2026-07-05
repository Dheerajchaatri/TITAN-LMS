import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import Login from './views/Login';
import AdminDashboard from './views/admin/AdminDashboard';
import TeacherDashboard from './views/teacher/TeacherDashboard';
import StudentDashboard from './views/student/StudentDashboard';

// Define Global Auth context
interface AuthContextType {
  user: any | null;
  token: string | null;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  login: (token: string, user: any) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [loading, setLoading] = useState(true);

  // Initialize Auth session & theme from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('lms_token');
    const savedUser = localStorage.getItem('lms_user');
    const savedTheme = localStorage.getItem('lms_theme') as 'light' | 'dark' | null;

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }

    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      // Default to dark mode for modern slick feel
      setTheme('dark');
    }
    setLoading(false);
  }, []);

  // Update theme class on body
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('lms_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const login = (jwtToken: string, userData: any) => {
    localStorage.setItem('lms_token', jwtToken);
    localStorage.setItem('lms_user', JSON.stringify(userData));
    setToken(jwtToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('lms_token');
    localStorage.removeItem('lms_user');
    setToken(null);
    setUser(null);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-brand-400">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
          <span className="font-semibold text-lg animate-pulse">Initializing TITAN Portal...</span>
        </div>
      </div>
    );
  }

  // Routing Guard
  const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) => {
    if (!token || !user) {
      return <Navigate to="/login" replace />;
    }
    if (!allowedRoles.includes(user.role)) {
      // Redirect to correct dashboard based on actual role
      if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
      if (user.role === 'TEACHER') return <Navigate to="/teacher" replace />;
      if (user.role === 'STUDENT') return <Navigate to="/student" replace />;
      return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
  };

  return (
    <AuthContext.Provider value={{ user, token, theme, toggleTheme, login, logout }}>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              token && user ? (
                user.role === 'ADMIN' ? (
                  <Navigate to="/admin" replace />
                ) : user.role === 'TEACHER' ? (
                  <Navigate to="/teacher" replace />
                ) : (
                  <Navigate to="/student" replace />
                )
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route path="/login" element={<Login />} />
          
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/teacher/*"
            element={
              <ProtectedRoute allowedRoles={['TEACHER']}>
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/student/*"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}
