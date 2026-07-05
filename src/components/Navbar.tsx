import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Menu, Bell, Sun, Moon, Check, Volume2 } from 'lucide-react';

interface NavbarProps {
  onMenuToggle: () => void;
}

export default function Navbar({ onMenuToggle }: NavbarProps) {
  const { user, token, theme, toggleTheme } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Fetch recent announcements/notifications
  useEffect(() => {
    if (!token) return;
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          // Add default demo notifications for instant premium look
          setNotifications([
            { id: 1, title: 'Exam Schedule Released', message: 'Calculus Mid-semester timetable is updated.', read: false },
            { id: 2, title: 'Fee Payment Success', message: 'Receipt #TXN001 generated successfully.', read: true },
            { id: 3, title: 'Welcome to Antigravity Portal', message: 'Explore class schedules and materials.', read: true }
          ]);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchNotifications();
  }, [token]);

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="h-16 px-6 glass-panel border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between z-20 relative">
      {/* Mobile Toggle & Portal Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 md:hidden transition-colors"
        >
          <Menu className="h-6 w-6" />
        </button>
        <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm md:text-base hidden sm:inline">
          Active Session: <span className="text-brand-500 font-semibold">{user?.role} Workspace</span>
        </span>
      </div>

      {/* Action utilities */}
      <div className="flex items-center gap-4">
        {/* Theme mode toggler */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400 transition-colors"
          title="Toggle UI Theme Mode"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5 text-amber-500" /> : <Moon className="h-5 w-5 text-slate-700" />}
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400 transition-colors relative"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-brand-500 animate-ping"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 rounded-xl shadow-xl glass-panel border border-slate-200 dark:border-slate-800/80 text-sm overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="p-4 border-b border-slate-200 dark:border-slate-850 flex items-center justify-between bg-slate-50 dark:bg-slate-900/40">
                <span className="font-semibold text-slate-800 dark:text-white">Workspace Alerts</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-brand-500 hover:text-brand-400 transition-colors flex items-center gap-1 font-medium"
                  >
                    <Check className="h-3 w-3" /> Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-850">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">No active alerts.</div>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 transition-colors ${
                        item.read ? 'opacity-70 bg-transparent' : 'bg-brand-500/5 dark:bg-brand-500/5'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Volume2 className="h-4.5 w-4.5 text-brand-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <h5 className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                            {item.title}
                          </h5>
                          <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-1 leading-relaxed">
                            {item.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
