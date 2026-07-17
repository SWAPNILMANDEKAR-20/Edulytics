import React, { useState, useEffect } from 'react';
import { 
  Settings, User, Sliders, Bell, Shield, Activity, 
  Save, RefreshCw, AlertTriangle, CheckCircle2, XCircle, Info
} from 'lucide-react';
import { API_URL } from '../../utils/api';

export default function SettingsPage() {
  // Loading & Saving States
  const [loading, setLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  // Profile Card States
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileDepartment, setProfileDepartment] = useState('');
  const [profileFacultyId, setProfileFacultyId] = useState('');
  const [originalEmail, setOriginalEmail] = useState('');

  // Evaluation Settings Card States
  const [defaultMarks, setDefaultMarks] = useState<number>(1.0);
  const [defaultNegative, setDefaultNegative] = useState<number>(0.0);
  const [defaultMode, setDefaultMode] = useState('descriptive');

  // Notification Preferences Card States
  const [notifNewSubmission, setNotifNewSubmission] = useState(true);
  const [notifEvalCompleted, setNotifEvalCompleted] = useState(true);
  const [notifAppeals, setNotifAppeals] = useState(true); // Student Appeals
  const [notifWeeklySummary, setNotifWeeklySummary] = useState(false); // Scheduled digest

  // Password Security Card States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // System Status State
  const [systemStatus, setSystemStatus] = useState<any>({
    backend: 'unreachable',
    database: 'unreachable',
    geminiApi: 'unreachable',
    version: '1.0.0'
  });

  // User notifications & warnings
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [settingsMessage, setSettingsMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch Settings and Health Status
  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || '';
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const res = await fetch(`${API_URL}/api/professor/settings`, { headers });
      if (res.ok) {
        const { profile, settings } = await res.json();
        if (profile) {
          setProfileName(profile.name || '');
          setProfileEmail(profile.email || '');
          setOriginalEmail(profile.email || '');
          setProfileDepartment(profile.department || '');
          setProfileFacultyId(profile.facultyId || '');
        }
        if (settings) {
          setDefaultMarks(settings.defaultMarksPerQuestion || 1.0);
          setDefaultNegative(settings.defaultNegativeMarking || 0.0);
          setDefaultMode(settings.defaultEvaluationMode || 'descriptive');
          
          const notifs = settings.notificationPreferences || {};
          setNotifNewSubmission(notifs.new_submission !== false);
          setNotifEvalCompleted(notifs.evaluation_completed !== false);
          setNotifAppeals(notifs.student_appeals !== false);
          setNotifWeeklySummary(notifs.weekly_summary === true);
        }
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const pingSystemHealth = async () => {
    setStatusLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/health`);
      if (res.ok) {
        const data = await res.json();
        setSystemStatus(data);
      } else {
        setSystemStatus({ backend: 'degraded', database: 'unreachable', geminiApi: 'unreachable', version: '1.0.0' });
      }
    } catch (err) {
      setSystemStatus({ backend: 'unreachable', database: 'unreachable', geminiApi: 'unreachable', version: '1.0.0' });
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    pingSystemHealth();
  }, []);

  // Update Profile
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);

    if (!profileName || !profileEmail) {
      setProfileMessage({ type: 'error', text: 'Name and Email are required' });
      return;
    }

    setProfileSaving(true);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API_URL}/api/professor/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: profileName,
          email: profileEmail,
          department: profileDepartment,
          facultyId: profileFacultyId
        })
      });

      if (res.ok) {
        setProfileMessage({ 
          type: 'success', 
          text: profileEmail.toLowerCase() !== originalEmail.toLowerCase()
            ? 'Profile updated! A confirmation link has been sent to your new email to complete the change.'
            : 'Profile updated successfully!' 
        });
        setOriginalEmail(profileEmail);
        
        // Sync local storage username if changed
        const curUserStr = localStorage.getItem('currentUser');
        if (curUserStr) {
          const curUser = JSON.parse(curUserStr);
          curUser.fullName = profileName;
          curUser.email = profileEmail;
          localStorage.setItem('currentUser', JSON.stringify(curUser));
        }
      } else {
        const err = await res.json();
        setProfileMessage({ type: 'error', text: err.error || 'Failed to update profile' });
      }
    } catch (err) {
      setProfileMessage({ type: 'error', text: 'Network error updating profile' });
    } finally {
      setProfileSaving(false);
    }
  };

  // Update Evaluation Settings & Notification preferences
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsMessage(null);
    setSettingsSaving(true);

    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API_URL}/api/professor/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          defaultMarksPerQuestion: defaultMarks,
          defaultNegativeMarking: defaultNegative,
          defaultEvaluationMode: defaultMode,
          notificationPreferences: {
            new_submission: notifNewSubmission,
            evaluation_completed: notifEvalCompleted,
            student_appeals: notifAppeals,
            weekly_summary: notifWeeklySummary
          }
        })
      });

      if (res.ok) {
        setSettingsMessage({ type: 'success', text: 'Evaluation preferences and notification rules saved successfully.' });
      } else {
        const err = await res.json();
        setSettingsMessage({ type: 'error', text: err.error || 'Failed to save preferences' });
      }
    } catch (err) {
      setSettingsMessage({ type: 'error', text: 'Network error saving preferences' });
    } finally {
      setSettingsSaving(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    // Client-side validations
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'All password fields are required' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    // Minimum strength check (matches original registration spec)
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);
    const hasNonalphas = /\W/.test(newPassword);
    const isLongeough = newPassword.length >= 8;

    if (!isLongeough || !hasUpperCase || !hasLowerCase || !hasNumbers || !hasNonalphas) {
      setPasswordMessage({ 
        type: 'error', 
        text: 'Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters.' 
      });
      return;
    }

    setPasswordSaving(true);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API_URL}/api/professor/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      if (res.ok) {
        setPasswordMessage({ type: 'success', text: 'Password updated successfully!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const err = await res.json();
        setPasswordMessage({ type: 'error', text: err.error || 'Failed to update password' });
      }
    } catch (err) {
      setPasswordMessage({ type: 'error', text: 'Network error updating password' });
    } finally {
      setPasswordSaving(false);
    }
  };

  // Helper status badge styles
  const getStatusBadge = (status: string) => {
    if (status === 'connected' || status === 'online_mode') {
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-theme-success/10 text-theme-success text-[10px] font-bold border border-theme-success/20">
          Connected
        </span>
      );
    }
    if (status === 'degraded' || status === 'key_missing') {
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-theme-warning/10 text-theme-warning text-[10px] font-bold border border-theme-warning/20">
          {status === 'key_missing' ? 'Key Missing' : 'Degraded'}
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full bg-theme-danger/10 text-theme-danger text-[10px] font-bold border border-theme-danger/20">
        Unreachable
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-12">
      
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
          <Settings className="w-8 h-8 text-brand-blue" />
          <span>System Settings</span>
        </h1>
        <p className="text-sm text-gray-400 max-w-2xl">
          Configure profile details, default exam parameters, in-app notification policies, and verify live pipeline availability.
        </p>
      </div>

      {/* Grid: 4 Configuration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Card 1: Professor Profile */}
        <div className="glass-card p-6 rounded-card border border-white/10 bg-[#0F1424]/40 flex flex-col gap-5">
          <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
            <User className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Professor Profile</h3>
          </div>

          <form onSubmit={handleUpdateProfile} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Professor Name</label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-blue/50"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Email Address</label>
              <input
                type="email"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-blue/50"
              />
              {profileEmail.toLowerCase() !== originalEmail.toLowerCase() && (
                <div className="flex items-start gap-1.5 mt-1 text-[10px] text-theme-warning font-semibold leading-relaxed">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Changing your email will update your login credentials and trigger confirmation emails.</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Department</label>
                <input
                  type="text"
                  value={profileDepartment}
                  onChange={(e) => setProfileDepartment(e.target.value)}
                  placeholder="e.g. Computer Science"
                  className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-blue/50"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Faculty ID</label>
                <input
                  type="text"
                  value={profileFacultyId}
                  onChange={(e) => setProfileFacultyId(e.target.value)}
                  placeholder="e.g. FAC-8812"
                  className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-blue/50"
                />
              </div>
            </div>

            {profileMessage && (
              <div className={`p-3 rounded-xl border text-xs font-semibold flex items-start gap-2 ${
                profileMessage.type === 'success' 
                  ? 'bg-theme-success/10 border-theme-success/20 text-theme-success' 
                  : 'bg-theme-danger/10 border-theme-danger/20 text-theme-danger'
              }`}>
                {profileMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                <span>{profileMessage.text}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={profileSaving}
              className="mt-2 py-2.5 bg-brand-gradient text-white text-xs font-bold rounded-xl shadow-lg hover:opacity-95 transition-all flex items-center justify-center gap-1.5"
            >
              {profileSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Update Profile</span>
            </button>
          </form>
        </div>

        {/* Card 2: Evaluation Settings */}
        <div className="glass-card p-6 rounded-card border border-white/10 bg-[#0F1424]/40 flex flex-col justify-between gap-5">
          <div>
            <div className="flex items-center gap-2.5 border-b border-white/5 pb-3 mb-5">
              <Sliders className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Evaluation settings</h3>
            </div>

            <form onSubmit={handleSaveSettings} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Default Marks/Q</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="100"
                    value={defaultMarks}
                    onChange={(e) => setDefaultMarks(parseFloat(e.target.value) || 1.0)}
                    className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-blue/50"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Default Negative Marking</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="10"
                    value={defaultNegative}
                    onChange={(e) => setDefaultNegative(parseFloat(e.target.value) || 0.0)}
                    className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-blue/50"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Default Evaluation Mode</label>
                <select
                  value={defaultMode}
                  onChange={(e) => setDefaultMode(e.target.value)}
                  className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none cursor-pointer"
                >
                  <option value="descriptive" className="bg-[#0F1424] text-white">Answer Sheet (Descriptive Evaluation)</option>
                  <option value="omr" className="bg-[#0F1424] text-white">OMR (Bubble Sheet Grading)</option>
                </select>
              </div>

              <div className="flex items-start gap-2 bg-white/5 p-3 rounded-xl border border-white/5 mt-1">
                <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-gray-400 leading-normal">
                  These preference defaults will automatically pre-fill values on the <strong>Create Exam</strong> form, acting as starting points that you can still adjust per exam.
                </p>
              </div>

              {settingsMessage && (
                <div className={`p-3 rounded-xl border text-xs font-semibold flex items-start gap-2 ${
                  settingsMessage.type === 'success' 
                    ? 'bg-theme-success/10 border-theme-success/20 text-theme-success' 
                    : 'bg-theme-danger/10 border-theme-danger/20 text-theme-danger'
                }`}>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{settingsMessage.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={settingsSaving}
                className="py-2.5 bg-brand-gradient text-white text-xs font-bold rounded-xl shadow-lg hover:opacity-95 transition-all flex items-center justify-center gap-1.5"
              >
                {settingsSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Save Evaluation Preferences</span>
              </button>
            </form>
          </div>
        </div>

        {/* Card 3: Notification Preferences */}
        <div className="glass-card p-6 rounded-card border border-white/10 bg-[#0F1424]/40 flex flex-col justify-between gap-5">
          <div>
            <div className="flex items-center gap-2.5 border-b border-white/5 pb-3 mb-5">
              <Bell className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Notification Preferences</h3>
            </div>

            <div className="flex flex-col gap-4 text-xs font-semibold text-gray-300">
              
              {/* Box 1 */}
              <label className="flex items-start gap-3 p-3 bg-white/5 border border-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                <input
                  type="checkbox"
                  checked={notifNewSubmission}
                  onChange={(e) => setNotifNewSubmission(e.target.checked)}
                  className="w-4 h-4 accent-indigo-500 rounded mt-0.5 cursor-pointer"
                />
                <div>
                  <h5 className="text-white text-xs">New Student Submission</h5>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-normal">
                    Receive dashboard logs and in-app alerts whenever a student uploads an exam script.
                  </p>
                </div>
              </label>

              {/* Box 2 */}
              <label className="flex items-start gap-3 p-3 bg-white/5 border border-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                <input
                  type="checkbox"
                  checked={notifEvalCompleted}
                  onChange={(e) => setNotifEvalCompleted(e.target.checked)}
                  className="w-4 h-4 accent-indigo-500 rounded mt-0.5 cursor-pointer"
                />
                <div>
                  <h5 className="text-white text-xs">Evaluation Completed & Released</h5>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-normal">
                    Get confirmation messages once graded results are released to the student class roster.
                  </p>
                </div>
              </label>

              {/* Box 3 */}
              <label className="flex items-start gap-3 p-3 bg-white/5 border border-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                <input
                  type="checkbox"
                  checked={notifAppeals}
                  onChange={(e) => setNotifAppeals(e.target.checked)}
                  className="w-4 h-4 accent-indigo-500 rounded mt-0.5 cursor-pointer"
                />
                <div>
                  <h5 className="text-white text-xs">Student Re-evaluation Appeals</h5>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-normal">
                    Alert me for new re-evaluation appeals. <span className="text-[9px] text-indigo-400 font-bold italic">(*Awaiting Re-evaluation modules integration)</span>
                  </p>
                </div>
              </label>

              {/* Box 4 */}
              <label className="flex items-start gap-3 p-3 bg-white/5 border border-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                <input
                  type="checkbox"
                  checked={notifWeeklySummary}
                  onChange={(e) => setNotifWeeklySummary(e.target.checked)}
                  className="w-4 h-4 accent-indigo-500 rounded mt-0.5 cursor-pointer"
                />
                <div>
                  <h5 className="text-white text-xs">Weekly digest summary</h5>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-normal">
                    Receive weekly automated reports summarizing student grade velocities. <span className="text-[9px] text-indigo-400 font-bold italic">(*Triggers scheduled cron digest)</span>
                  </p>
                </div>
              </label>

            </div>
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={settingsSaving}
            className="w-full py-2.5 bg-brand-gradient text-white text-xs font-bold rounded-xl shadow-lg hover:opacity-95 transition-all flex items-center justify-center gap-1.5"
          >
            {settingsSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Notification Preferences</span>
          </button>
        </div>

        {/* Card 4: Account & Security */}
        <div className="glass-card p-6 rounded-card border border-white/10 bg-[#0F1424]/40 flex flex-col justify-between gap-5">
          <div>
            <div className="flex items-center gap-2.5 border-b border-white/5 pb-3 mb-5">
              <Shield className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Account & Security</h3>
            </div>

            <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-blue/50"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-blue/50"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-blue/50"
                />
              </div>

              {passwordMessage && (
                <div className={`p-3 rounded-xl border text-xs font-semibold flex items-start gap-2 ${
                  passwordMessage.type === 'success' 
                    ? 'bg-theme-success/10 border-theme-success/20 text-theme-success' 
                    : 'bg-theme-danger/10 border-theme-danger/20 text-theme-danger'
                }`}>
                  {passwordMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                  <span>{passwordMessage.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={passwordSaving}
                className="py-2.5 bg-[#1E293B] hover:bg-white/5 border border-white/10 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5"
              >
                {passwordSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                <span>Change Password</span>
              </button>
            </form>
          </div>
        </div>

      </div>

      {/* System Status Card (Full Width at Bottom) */}
      <div className="glass-card p-6 rounded-card border border-white/10 bg-[#0F1424]/40 flex flex-col gap-5 mt-4">
        <div className="flex justify-between items-center border-b border-white/5 pb-3">
          <div className="flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">System Pipeline Status</h3>
          </div>
          <button
            onClick={pingSystemHealth}
            disabled={statusLoading}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all flex items-center gap-1 text-[10px] font-bold border border-white/10 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${statusLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Diagnostics</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          
          <div className="flex flex-col gap-2 bg-white/5 p-4 rounded-xl border border-white/5">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Backend API Server</span>
            <div className="flex items-center justify-between">
              <span className="text-white font-bold">Node Express</span>
              {getStatusBadge(systemStatus.backend)}
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-white/5 p-4 rounded-xl border border-white/5">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Database Instance</span>
            <div className="flex items-center justify-between">
              <span className="text-white font-bold">Supabase PostgreSQL</span>
              {getStatusBadge(systemStatus.database)}
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-white/5 p-4 rounded-xl border border-white/5">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Model API Server</span>
            <div className="flex items-center justify-between">
              <span className="text-white font-bold">Gemini 2.5 Flash</span>
              {getStatusBadge(systemStatus.geminiApi)}
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-white/5 p-4 rounded-xl border border-white/5">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">System Version</span>
            <div className="flex items-center justify-between">
              <span className="text-white font-bold">Release Build</span>
              <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-bold text-[10px] border border-indigo-500/20">
                v{systemStatus.version || '1.0.0'}
              </span>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
