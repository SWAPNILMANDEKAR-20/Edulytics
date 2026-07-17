import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  Bell, Search, ChevronDown, User, Settings as SettingsIcon, LogOut, 
  PlusCircle, FileCheck, Sliders, UserPlus, Sparkles, X, UploadCloud, BarChart3,
  Sun, Moon, FileInput
} from 'lucide-react';

interface TopBarProps {
  isSidebarCollapsed: boolean;
}

export default function TopBar({ isSidebarCollapsed }: TopBarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [showSearchPalette, setShowSearchPalette] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load current user
  const userStr = localStorage.getItem('currentUser');
  const user = userStr ? JSON.parse(userStr) : { fullName: 'Dr. Evelyn Vance', designation: 'Senior Evaluator', role: 'professor' };
  const isStudent = user.role === 'student';

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  useEffect(() => {
    if (isStudent) {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
    }
  }, [theme, isStudent]);

  // ⌘K Keyboard Shortcut Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearchPalette(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    navigate('/login');
  };

  // Get Breadcrumb display dynamically matching student/professor paths
  const getBreadcrumbs = () => {
    const path = location.pathname;
    
    // Professor routes mapping
    const profMapping: Record<string, string[]> = {
      '/professor/dashboard': ['Overview', 'Dashboard'],
      '/professor/subjects': ['Teaching', 'My Subjects'],
      '/professor/exams': ['Teaching', 'Exam Management'],
      '/professor/rubrics': ['Teaching', 'Rubrics Builder'],
      '/professor/registry': ['Students', 'Student Registry'],
      '/professor/evaluation': ['Evaluation', 'Answer Sheet Evaluation'],
      '/professor/omr-evaluation': ['Evaluation', 'OMR Evaluation'],
      '/professor/history': ['Evaluation', 'Evaluation History'],
      '/professor/analytics': ['Analytics', 'Class Analytics'],
      '/professor/topic-analysis': ['Analytics', 'Topic Difficulty Analysis'],
      '/professor/ai-insights': ['Analytics', 'AI Insights'],
      '/professor/settings': ['System', 'Settings']
    };

    // Student routes mapping
    const studentMapping: Record<string, string[]> = {
      '/student/dashboard': ['Overview', 'Dashboard'],
      '/student/subjects': ['Learning', 'My Subjects'],
      '/student/exams': ['Learning', 'My Exams'],
      '/student/scores': ['Performance', 'Scores & Progress'],
      '/student/topic-analysis': ['Performance', 'Topic-wise Analysis'],
      '/student/upload': ['Submissions', 'Upload Answer Sheet'],
      '/student/upload-omr': ['Submissions', 'Upload OMR Sheet'],
      '/student/history': ['Submissions', 'Submission History'],
      '/student/ai-feedback': ['Insights', 'AI Feedback Report'],
      '/student/feedback': ['Insights', 'Detailed Exam Feedback'],
      '/student/settings': ['System', 'Settings']
    };

    const activeMap = isStudent ? studentMapping : profMapping;
    return activeMap[path] || [isStudent ? 'Student Space' : 'Overview', 'Dashboard'];
  };

  const breadcrumbs = getBreadcrumbs();

  const notifications = [
    { id: 1, title: 'Evaluation Completed', desc: 'Marcus Aurelius essay graded by AI pipeline.', time: '5m ago', read: false },
    { id: 2, title: 'High Difficulty Warning', desc: 'Concept "Trees" marked as critical struggle rate (82%).', time: '1h ago', read: false },
    { id: 3, title: 'System Online', desc: 'Gemini 3.5 Flash connection confirmed.', time: '2h ago', read: true }
  ];

  // Commands list based on roles
  const profCommands = [
    { title: 'Go to Dashboard', path: '/professor/dashboard', category: 'Navigation' },
    { title: 'Run Answer Sheet Evaluation', path: '/professor/evaluation', category: 'Actions' },
    { title: 'View Topic Struggle Rates', path: '/professor/topic-analysis', category: 'Analytics' },
    { title: 'Configure Evaluation Rubrics', path: '/professor/rubrics', category: 'Setup' },
    { title: 'Student Grade Dossiers', path: '/professor/registry', category: 'Students' }
  ];

  const studentCommands = [
    { title: 'Go to Dashboard', path: '/student/dashboard', category: 'Navigation' },
    { title: 'Upload Scanned Answer Sheet', path: '/student/upload', category: 'Actions' },
    { title: 'Upload Scanned OMR Sheet', path: '/student/upload-omr', category: 'Actions' },
    { title: 'View Scores & Progress Tracker', path: '/student/scores', category: 'Grades' },
    { title: 'Inspect Topic Mastery Rates', path: '/student/topic-analysis', category: 'Performance' },
    { title: 'Read AI Strength & Focus Report', path: '/student/ai-feedback', category: 'Insights' }
  ];

  const activeCommands = isStudent ? studentCommands : profCommands;

  const filteredCommands = activeCommands.filter(cmd => 
    cmd.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cmd.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <header 
        className={`fixed top-0 right-0 z-30 h-16 flex items-center justify-between px-6 border-b transition-all duration-300 backdrop-blur-xl ${
          isStudent 
            ? 'bg-theme-card/80 border-theme-border/40 text-theme-text' 
            : 'bg-[#0A0E1A]/40 border-white/10 text-gray-200'
        }`}
        style={{ left: isSidebarCollapsed ? '76px' : '260px' }}
      >
        {/* Left Side: Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className={isStudent ? "text-theme-muted" : "text-gray-500"}>{breadcrumbs[0]}</span>
          <span className={isStudent ? "text-theme-muted/55" : "text-gray-600"}>/</span>
          <span className={isStudent ? "text-theme-text font-bold" : "text-white font-bold"}>{breadcrumbs[1]}</span>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          
          {/* Search Trigger */}
          <button 
            onClick={() => setShowSearchPalette(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-all duration-200 ${
              isStudent 
                ? 'border-theme-border/60 bg-theme-bg text-theme-muted hover:text-theme-text hover:bg-theme-bg/85' 
                : 'border-white/10 bg-white/5 text-gray-500 hover:text-white hover:bg-white/10 hover:border-white/20'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search...</span>
            <kbd className={`px-1 rounded text-[9px] font-sans ${isStudent ? 'bg-theme-card border border-theme-border/40' : 'bg-white/10 border border-white/10'}`}>Ctrl+K</kbd>
          </button>

          {/* Quick Actions Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowQuickActions(!showQuickActions)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-gradient text-white text-xs font-bold shadow-md shadow-brand-blue/10 hover:opacity-90 transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Quick Actions</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {showQuickActions && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowQuickActions(false)} />
                <div className="absolute right-0 mt-2 w-48 rounded-xl bg-bg-card border border-white/10 p-1 shadow-2xl z-20">
                  {isStudent ? (
                    <>
                      <button 
                        onClick={() => { setShowQuickActions(false); navigate('/student/upload'); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-white/5 rounded-lg text-gray-300 hover:text-white text-left transition-colors"
                      >
                        <UploadCloud className="w-3.5 h-3.5 text-brand-blue" />
                        <span>Upload Answer Sheet</span>
                      </button>
                      <button 
                        onClick={() => { setShowQuickActions(false); navigate('/student/upload-omr'); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-white/5 rounded-lg text-gray-300 hover:text-white text-left transition-colors"
                      >
                        <FileInput className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Upload OMR Sheet</span>
                      </button>
                      <button 
                        onClick={() => { setShowQuickActions(false); navigate('/student/scores'); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-white/5 rounded-lg text-gray-300 hover:text-white text-left transition-colors"
                      >
                        <BarChart3 className="w-3.5 h-3.5 text-brand-purple" />
                        <span>View Latest Result</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={() => { setShowQuickActions(false); navigate('/professor/exams'); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-white/5 rounded-lg text-gray-300 hover:text-white text-left transition-colors"
                      >
                        <PlusCircle className="w-3.5 h-3.5 text-brand-blue" />
                        <span>New Examination</span>
                      </button>
                      <button 
                        onClick={() => { setShowQuickActions(false); navigate('/professor/rubrics'); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-white/5 rounded-lg text-gray-300 hover:text-white text-left transition-colors"
                      >
                        <Sliders className="w-3.5 h-3.5 text-brand-purple" />
                        <span>Create Rubric</span>
                      </button>
                      <button 
                        onClick={() => { setShowQuickActions(false); navigate('/professor/evaluation'); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-white/5 rounded-lg text-gray-300 hover:text-white text-left transition-colors"
                      >
                        <FileCheck className="w-3.5 h-3.5 text-brand-emerald" />
                        <span>Evaluate Sheets</span>
                      </button>
                      <button 
                        onClick={() => { setShowQuickActions(false); navigate('/professor/registry'); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-white/5 rounded-lg text-gray-300 hover:text-white text-left transition-colors"
                      >
                        <UserPlus className="w-3.5 h-3.5 text-status-warning" />
                        <span>Add Student</span>
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Theme Toggle (Student space only) */}
          {isStudent && (
            <button
              onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
              aria-label="Toggle dark mode"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          )}

          {/* Notifications Bell */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-status-error animate-pulse" />
            </button>

            {showNotifications && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowNotifications(false)} />
                <div className={`absolute right-0 mt-2 w-72 rounded-xl border p-2 shadow-2xl z-20 ${
                  isStudent ? 'bg-theme-card border-theme-border text-theme-text' : 'bg-bg-card border-white/10'
                }`}>
                  <div className={`flex items-center justify-between px-3 py-1.5 border-b ${
                    isStudent ? 'border-theme-border/40' : 'border-white/5'
                  }`}>
                    <span className={`text-xs font-bold ${isStudent ? 'text-theme-text' : 'text-white'}`}>Notifications</span>
                    <button className="text-[10px] text-brand-blue hover:underline">Mark all read</button>
                  </div>
                  <div className="mt-1.5 space-y-1">
                    {notifications.map(n => (
                      <div 
                        key={n.id} 
                        className={`p-2.5 rounded-lg text-left transition-colors ${
                          n.read 
                            ? isStudent ? 'hover:bg-theme-bg/60 text-theme-muted' : 'hover:bg-white/5 text-gray-400' 
                            : isStudent ? 'bg-brand-purple/5 hover:bg-brand-purple/10 text-theme-text' : 'bg-brand-blue/5 hover:bg-brand-blue/10 text-white'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <h5 className="text-xs font-bold truncate max-w-[170px]">{n.title}</h5>
                          <span className="text-[9px] text-gray-500">{n.time}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1 leading-snug">{n.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 p-1 rounded-lg hover:bg-white/5 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-brand-gradient flex items-center justify-center text-white font-bold text-xs shadow-md">
                {(user.fullName || user.name || user.email || 'User')
                  .split(' ')
                  .filter(Boolean)
                  .map((n: string) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
            </button>

            {showProfileMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowProfileMenu(false)} />
                <div className={`absolute right-0 mt-2 w-48 rounded-xl border p-1 shadow-2xl z-20 ${
                  isStudent ? 'bg-theme-card border-theme-border text-theme-text' : 'bg-bg-card border-white/10'
                }`}>
                  <div className={`px-3 py-2 border-b ${isStudent ? 'border-theme-border/40' : 'border-white/5'}`}>
                    <p className={`text-xs font-bold truncate ${isStudent ? 'text-theme-text' : 'text-white'}`}>{user.fullName || user.name || user.email}</p>
                    <p className="text-[10px] text-gray-500 truncate">{user.email || 'student@university.edu'}</p>
                  </div>
                  <div className="p-1">
                    <button 
                      onClick={() => { setShowProfileMenu(false); navigate(isStudent ? '/student/settings' : '/professor/settings'); }}
                      className={`flex items-center gap-2 w-full px-3 py-2 text-xs rounded-lg text-left transition-colors ${
                        isStudent ? 'hover:bg-theme-bg/60 text-theme-muted hover:text-theme-text' : 'hover:bg-white/5 text-gray-400 hover:text-white'
                      }`}
                    >
                      <User className="w-3.5 h-3.5 text-gray-500" />
                      <span>My Profile</span>
                    </button>
                    <button 
                      onClick={() => { setShowProfileMenu(false); navigate(isStudent ? '/student/settings' : '/professor/settings'); }}
                      className={`flex items-center gap-2 w-full px-3 py-2 text-xs rounded-lg text-left transition-colors ${
                        isStudent ? 'hover:bg-theme-bg/60 text-theme-muted hover:text-theme-text' : 'hover:bg-white/5 text-gray-400 hover:text-white'
                      }`}
                    >
                      <SettingsIcon className="w-3.5 h-3.5 text-gray-500" />
                      <span>Settings</span>
                    </button>
                    <button 
                      onClick={() => { setShowProfileMenu(false); handleLogout(); }}
                      className={`flex items-center gap-2 w-full px-3 py-2 text-xs rounded-lg text-left transition-colors mt-1 pt-2 border-t ${
                        isStudent 
                          ? 'border-theme-border/40 hover:bg-theme-bg/60 text-status-error/80 hover:text-status-error' 
                          : 'border-white/5 hover:bg-white/5 text-status-error/80 hover:text-status-error'
                      }`}
                    >
                      <LogOut className="w-3.5 h-3.5 text-status-error/80" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

        </div>
      </header>

      {/* Command Search Palette Dialog Modal */}
      {showSearchPalette && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/60 backdrop-blur-sm">
          <div className="fixed inset-0" onClick={() => setShowSearchPalette(false)} />
          <div className="relative w-full max-w-lg rounded-2xl bg-bg-card border border-white/10 shadow-2xl p-4 flex flex-col gap-3 max-h-[400px] overflow-hidden">
            
            {/* Header / Search Input */}
            <div className="flex items-center gap-2 pb-2 border-b border-white/10">
              <Search className="w-4 h-4 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search commands, routes..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-white outline-none"
                autoFocus
              />
              <button 
                onClick={() => setShowSearchPalette(false)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Suggestions list */}
            <div className="overflow-y-auto no-scrollbar flex-1 space-y-1">
              {filteredCommands.length > 0 ? (
                filteredCommands.map((cmd, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setShowSearchPalette(false);
                      setSearchQuery('');
                      navigate(cmd.path);
                    }}
                    className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl hover:bg-white/5 text-gray-300 hover:text-white text-left transition-colors group"
                  >
                    <span className="text-xs font-semibold">{cmd.title}</span>
                    <span className="text-[10px] text-gray-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg group-hover:bg-brand-blue/15 group-hover:text-brand-blue group-hover:border-brand-blue/20 transition-all font-semibold uppercase">
                      {cmd.category}
                    </span>
                  </button>
                ))
              ) : (
                <div className="text-center text-xs text-gray-500 py-6">
                  No matching commands found.
                </div>
              )}
            </div>
            
            {/* Footer hints */}
            <div className="flex justify-between items-center text-[10px] text-gray-600 pt-2 border-t border-white/5">
              <span>Use ↑↓ keys to navigate</span>
              <span>ESC to close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
