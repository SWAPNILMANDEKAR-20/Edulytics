import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  LayoutDashboard, BookOpen, FileSpreadsheet, Sliders, Users, 
  FileInput, History, BarChart3, TrendingUp, Sparkles, Settings,
  LogOut, ChevronLeft, ChevronRight, GraduationCap, Award, UploadCloud
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export default function Sidebar({ isCollapsed, setIsCollapsed }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Load current user from session
  const userStr = localStorage.getItem('currentUser');
  const user = userStr ? JSON.parse(userStr) : { fullName: 'Dr. Evelyn Vance', designation: 'Senior Evaluator', role: 'professor' };
  const isStudent = user.role === 'student';

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    navigate('/login');
  };

  // Nav Groups for Professor
  const profGroups = [
    {
      label: 'Overview',
      items: [
        { path: '/professor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ]
    },
    {
      label: 'Teaching',
      items: [
        { path: '/professor/subjects', label: 'My Subjects', icon: BookOpen },
        { path: '/professor/exams', label: 'Exam Management', icon: FileSpreadsheet },
        { path: '/professor/rubrics', label: 'Rubrics Builder', icon: Sliders },
      ]
    },
    {
      label: 'Students',
      items: [
        { path: '/professor/registry', label: 'Student Registry', icon: Users },
      ]
    },
    {
      label: 'Evaluation',
      items: [
        { path: '/professor/evaluation', label: 'Answer Sheet Evaluation', icon: FileInput },
        { path: '/professor/omr-evaluation', label: 'OMR Evaluation', icon: FileSpreadsheet },
      ]
    },
    {
      label: 'Analytics',
      items: [
        { path: '/professor/analytics', label: 'Class Analytics', icon: BarChart3 },
      ]
    },
    {
      label: 'System',
      items: [
        { path: '/professor/settings', label: 'Settings', icon: Settings },
      ]
    }
  ];

  // Nav Groups for Student
  const studentGroups = [
    {
      label: 'Overview',
      items: [
        { path: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ]
    },
    {
      label: 'Learning',
      items: [
        { path: '/student/subjects', label: 'My Subjects', icon: BookOpen },
      ]
    },
    {
      label: 'Submissions',
      items: [
        { path: '/student/upload', label: 'Upload Answer Sheet', icon: UploadCloud },
        { path: '/student/upload-omr', label: 'Upload OMR Sheet', icon: FileInput },
        { path: '/student/history', label: 'Submission History', icon: History },
      ]
    },
    {
      label: 'Grades',
      items: [
        { path: '/student/results', label: 'Results', icon: Award },
      ]
    },
    {
      label: 'Insights',
      items: [
        { path: '/student/ai-feedback', label: 'AI Feedback Report', icon: Sparkles },
      ]
    },
    {
      label: 'System',
      items: [
        { path: '/student/settings', label: 'Settings', icon: Settings },
      ]
    }
  ];

  const activeGroups = isStudent ? studentGroups : profGroups;

  return (
    <aside 
      className={`h-screen fixed left-0 top-0 z-40 flex flex-col justify-between transition-all duration-300 border-r ${
        isCollapsed ? 'w-[76px] px-3' : 'w-[260px] px-4'
      } py-5 ${
        isStudent 
          ? 'bg-theme-card border-theme-border/40 text-theme-text' 
          : 'glass-panel border-white/10 bg-[#0A0E1A]/80 text-gray-300'
      }`}
    >
      <div>
        {/* Logo Section */}
        <div className="flex items-center justify-between mb-8 px-2">
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <div className="bg-brand-gradient w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-blue/20 shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h1 className={`text-md font-bold tracking-wider ${isStudent ? 'text-theme-text' : 'text-white'}`}>
                  EDULYTICS
                </h1>
                <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-widest">
                  {isStudent ? 'Student Space' : 'AI Assessment'}
                </p>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="bg-brand-gradient w-9 h-9 rounded-xl flex items-center justify-center text-white mx-auto shadow-lg shadow-brand-blue/20">
              <GraduationCap className="w-5 h-5" />
            </div>
          )}
          
          {/* Collapse Button */}
          {!isCollapsed && (
            <button 
              onClick={() => setIsCollapsed(true)}
              className="text-gray-500 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
 
        {/* Navigation Categories */}
        <nav className="space-y-6 overflow-y-auto no-scrollbar max-h-[calc(100vh-200px)]">
          {activeGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              {!isCollapsed && (
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider px-3 mb-2">
                  {group.label}
                </div>
              )}
              {isCollapsed && (
                <div className={`h-[1px] my-3 ${isStudent ? 'bg-theme-border/40' : 'bg-white/5'}`} />
              )}
              <div className="space-y-1">
                {group.items.map((item, itemIdx) => {
                  const isActive = location.pathname === item.path || (item.path.includes('dashboard') && location.pathname === '/');
                  const Icon = item.icon;
                  return (
                    <Link
                      key={itemIdx}
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${
                        isActive 
                          ? isStudent 
                            ? 'bg-theme-primary/10 text-theme-primary font-bold border-l-[3px] border-theme-primary'
                            : 'bg-brand-blue/10 text-white font-medium border-l-[3px] border-brand-blue'
                          : isStudent 
                            ? 'hover:bg-theme-bg/60 text-theme-muted hover:text-theme-text'
                            : 'hover:bg-white/5 hover:text-white text-gray-400'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? isStudent ? 'text-theme-primary' : 'text-brand-blue' : 'text-gray-500 group-hover:text-white'}`} />
                      {!isCollapsed && (
                        <span className="text-sm transition-opacity duration-200">
                          {item.label}
                        </span>
                      )}
                      
                      {/* Tooltip on Collapsed */}
                      {isCollapsed && (
                        <div className="absolute left-16 bg-bg-card border border-white/10 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap">
                          {item.label}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
 
      {/* Collapse Toggle trigger in collapsed state */}
      {isCollapsed && (
        <button 
          onClick={() => setIsCollapsed(false)}
          className="text-gray-500 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors mx-auto mb-4"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
 
      {/* Profile Section Footer */}
      <div>
        <div className={`h-[1px] my-4 ${isStudent ? 'bg-theme-border/40' : 'bg-white/10'}`} />
        <div className={`flex items-center justify-between ${isCollapsed ? 'flex-col gap-3 justify-center' : ''}`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className={`w-9 h-9 rounded-full bg-brand-gradient flex items-center justify-center text-white font-bold shrink-0 shadow-md`}>
              {(user.fullName || user.name || user.email || 'User')
                .split(' ')
                .filter(Boolean)
                .map((n: string) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden">
                <h4 className={`text-sm font-semibold truncate max-w-[120px] ${isStudent ? 'text-theme-text' : 'text-white'}`}>
                  {user.fullName || user.name || user.email}
                </h4>
                <p className="text-[11px] text-gray-500 truncate max-w-[120px]">
                  {user.rollNumber || user.role}
                </p>
              </div>
            )}
          </div>
          
          <button 
            onClick={handleLogout}
            className="text-gray-500 hover:text-status-error p-2 rounded-lg hover:bg-status-error/10 transition-all shrink-0"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
