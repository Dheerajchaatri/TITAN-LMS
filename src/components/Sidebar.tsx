import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../App';
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  Briefcase,
  BookOpen,
  DollarSign,
  Calendar,
  MessageSquare,
  Volume2,
  FileSpreadsheet,
  CheckSquare,
  LogOut,
  FolderOpen
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function Sidebar({ isOpen }: SidebarProps) {
  const { user, logout } = useAuth();

  const getMenuItems = () => {
    if (!user) return [];
    
    switch (user.role) {
      case 'ADMIN':
        return [
          { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
          { name: 'Students Manager', path: '/admin/students', icon: Users },
          { name: 'Teachers Manager', path: '/admin/teachers', icon: Briefcase },
          { name: 'Courses & Syllabus', path: '/admin/courses', icon: BookOpen },
          { name: 'Fees & Billing', path: '/admin/fees', icon: DollarSign },
          { name: 'Announcements', path: '/admin/announcements', icon: Volume2 },
          { name: 'Discussion Forum', path: '/admin/discussions', icon: MessageSquare },
          { name: 'Realtime Messages', path: '/admin/chat', icon: MessageSquare }
        ];
      case 'TEACHER':
        return [
          { name: 'Dashboard', path: '/teacher', icon: LayoutDashboard },
          { name: 'My Classes', path: '/teacher/classes', icon: FolderOpen },
          { name: 'Attendance Logs', path: '/teacher/attendance', icon: FileSpreadsheet },
          { name: 'Grading Hub', path: '/teacher/grading', icon: CheckSquare },
          { name: 'Class Discussions', path: '/teacher/discussions', icon: MessageSquare },
          { name: 'Chat Workspace', path: '/teacher/chat', icon: MessageSquare }
        ];
      case 'STUDENT':
        return [
          { name: 'Portal Dashboard', path: '/student', icon: LayoutDashboard },
          { name: 'My Courses', path: '/student/courses', icon: BookOpen },
          { name: 'Fees & Invoices', path: '/student/fees', icon: DollarSign },
          { name: 'Academic Results', path: '/student/results', icon: FileSpreadsheet },
          { name: 'Class Discussions', path: '/student/discussions', icon: MessageSquare },
          { name: 'Chat Workspace', path: '/student/chat', icon: MessageSquare }
        ];
      default:
        return [];
    }
  };

  const menuItems = getMenuItems();

  return (
    <aside
      className={`fixed top-0 bottom-0 left-0 z-30 w-64 bg-slate-900 border-r border-slate-800 text-slate-300 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Brand logo container */}
      <div className="h-16 px-6 border-b border-slate-800 flex items-center gap-3">
        <GraduationCap className="h-8 w-8 text-brand-500" />
        <span className="font-extrabold text-white text-lg tracking-tight">
          Antigravity <span className="text-brand-500 text-sm font-semibold uppercase tracking-wider">LMS</span>
        </span>
      </div>

      {/* User Quick Info */}
      <div className="px-6 py-5 border-b border-slate-850 flex items-center gap-3 bg-slate-950/20">
        <img
          src={user?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=80'}
          alt="Avatar"
          className="h-10 w-10 rounded-full border border-slate-700 object-cover"
        />
        <div className="overflow-hidden">
          <h4 className="font-semibold text-sm text-white truncate">
            {user?.firstName} {user?.lastName}
          </h4>
          <span className="text-[10px] uppercase font-bold tracking-wider text-brand-400">
            {user?.role} Portal
          </span>
        </div>
      </div>

      {/* Menu items list */}
      <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.path === '/admin' || item.path === '/teacher' || item.path === '/student'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20 font-semibold'
                  : 'hover:bg-slate-800/60 hover:text-slate-100'
              }`
            }
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout button bottom */}
      <div className="p-4 border-t border-slate-850">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium hover:bg-red-950/30 hover:text-red-400 text-slate-400 transition-colors"
        >
          <LogOut className="h-5 w-5 text-red-500/80" />
          <span>Exit Workspace</span>
        </button>
      </div>
    </aside>
  );
}
