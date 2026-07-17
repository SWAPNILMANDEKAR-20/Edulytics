import React, { useState, useEffect } from 'react';
import { 
  Settings, User, Bell, Shield, Info, Palette,
  Save, RefreshCw, AlertTriangle, CheckCircle2, XCircle
} from 'lucide-react';

export default function StudentSettings() {
  // Loading & Saving States
  const [loading, setLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Profile Card States
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileCollege, setProfileCollege] = useState('');
  const [profileDepartment, setProfileDepartment] = useState('');
  const [profileRollNumber, setProfileRollNumber] = useState('');
  const [profileSemester, setProfileSemester] = useState('');
  const [originalEmail, setOriginalEmail] = useState('');

  // Notification Preferences Card States
  const [notifNewResult, setNotifNewResult] = useState(true);
  const [notifSubReceived, setNotifSubReceived] = useState(true);
  const [notifFeedback, setNotifFeedback] = useState(true);
  const [notifWeeklyProgress, setNotifWeeklyProgress] = useState(false);

  // Password Security Card States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Messages & Alerts
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [settingsMessage, setSettingsMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch student settings
  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || '';
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const res = await fetch('/api/student/settings', { headers });
      if (res.ok) {
        const { profile, settings } = await res.json();
        if (profile) {
          setProfileName(profile.name || '');
          setProfileEmail(profile.email || '');
          setOriginalEmail(profile.email || '');
          setProfileCollege(profile.college || '');
          setProfileDepartment(profile.department || '');
          setProfileRollNumber(profile.rollNumber || '');
          setProfileSemester(profile.semester || '');
        }
        if (settings) {
          const notifs = settings.notificationPreferences || {};
          setNotifNewResult(notifs.new_result !== false);
          setNotifSubReceived(notifs.submission_confirmed !== false);
          setNotifFeedback(notifs.feedback_available !== false);
          setNotifWeeklyProgress(notifs.weekly_progress === true);
        }
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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
      const res = await fetch('/api/student/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: profileName,
          email: profileEmail,
          college: profileCollege,
          department: profileDepartment,
          rollNumber: profileRollNumber,
          semester: profileSemester
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

  // Update Notification preferences
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsMessage(null);
    setSettingsSaving(true);

    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch('/api/student/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          notificationPreferences: {
            new_result: notifNewResult,
            submission_confirmed: notifSubReceived,
            feedback_available: notifFeedback,
            weekly_progress: notifWeeklyProgress
          }
        })
      });

      if (res.ok) {
        setSettingsMessage({ type: 'success', text: 'Notification preferences saved successfully.' });
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
      const res = await fetch('/api/student/change-password', {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-theme-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-12">
      
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
          <Settings className="w-8 h-8 text-theme-primary" />
          <span>Student Settings</span>
        </h1>
        <p className="text-sm text-theme-muted max-w-2xl">
          Manage your academic profile credentials, customize notification preferences, verify your security rules, and switch appearance settings.
        </p>
      </div>

      {/* Grid: 4 Configuration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Card 1: Student Profile */}
        <div className="glass-card p-6 rounded-card border border-white/10 bg-[#0F1424]/40 flex flex-col gap-5">
          <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
            <User className="w-5 h-5 text-theme-primary" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Student Profile</h3>
          </div>

          <form onSubmit={handleUpdateProfile} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-theme-primary/50"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-theme-primary/50"
                />
              </div>
            </div>

            {profileEmail.toLowerCase() !== originalEmail.toLowerCase() && (
              <div className="flex items-start gap-1.5 text-[10px] text-theme-warning font-semibold leading-relaxed">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Changing your email will update your login credentials and trigger confirmation emails.</span>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">College / University</label>
              <input
                type="text"
                value={profileCollege}
                onChange={(e) => setProfileCollege(e.target.value)}
                placeholder="e.g. VIT University"
                className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-theme-primary/50"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1 flex flex-col gap-1.5">
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Department</label>
                <input
                  type="text"
                  value={profileDepartment}
                  onChange={(e) => setProfileDepartment(e.target.value)}
                  placeholder="e.g. CSE"
                  className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-theme-primary/50"
                />
              </div>

              <div className="col-span-1 flex flex-col gap-1.5">
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Roll Number</label>
                <input
                  type="text"
                  value={profileRollNumber}
                  onChange={(e) => setProfileRollNumber(e.target.value)}
                  placeholder="e.g. 12415088"
                  className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-theme-primary/50"
                />
              </div>

              <div className="col-span-1 flex flex-col gap-1.5">
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Semester</label>
                <input
                  type="text"
                  value={profileSemester}
                  onChange={(e) => setProfileSemester(e.target.value)}
                  placeholder="e.g. 5"
                  className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-theme-primary/50"
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

        {/* Card 2: Notification Preferences */}
        <div className="glass-card p-6 rounded-card border border-white/10 bg-[#0F1424]/40 flex flex-col justify-between gap-5">
          <div>
            <div className="flex items-center gap-2.5 border-b border-white/5 pb-3 mb-5">
              <Bell className="w-5 h-5 text-theme-primary" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Notification Preferences</h3>
            </div>

            <div className="flex flex-col gap-4 text-xs font-semibold text-gray-300">
              
              {/* Box 1 */}
              <label className="flex items-start gap-3 p-3 bg-white/5 border border-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                <input
                  type="checkbox"
                  checked={notifNewResult}
                  onChange={(e) => setNotifNewResult(e.target.checked)}
                  className="w-4 h-4 accent-indigo-500 rounded mt-0.5 cursor-pointer"
                />
                <div>
                  <h5 className="text-white text-xs">New Result Published</h5>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-normal">
                    Receive immediate notifications as soon as an instructor publishes feedback grades for any of your courses.
                  </p>
                </div>
              </label>

              {/* Box 2 */}
              <label className="flex items-start gap-3 p-3 bg-white/5 border border-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                <input
                  type="checkbox"
                  checked={notifSubReceived}
                  onChange={(e) => setNotifSubReceived(e.target.checked)}
                  className="w-4 h-4 accent-indigo-500 rounded mt-0.5 cursor-pointer"
                />
                <div>
                  <h5 className="text-white text-xs">Submission Confirmation Receipt</h5>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-normal">
                    Get confirmation alerts confirming successful upload of either descriptive sheets or OMR bubbles.
                  </p>
                </div>
              </label>

              {/* Box 3 */}
              <label className="flex items-start gap-3 p-3 bg-white/5 border border-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                <input
                  type="checkbox"
                  checked={notifFeedback}
                  onChange={(e) => setNotifFeedback(e.target.checked)}
                  className="w-4 h-4 accent-indigo-500 rounded mt-0.5 cursor-pointer"
                />
                <div>
                  <h5 className="text-white text-xs">Feedback Comments & Critiques Available</h5>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-normal">
                    Alert me when instructors include additional comments or annotations on my descriptive script papers.
                  </p>
                </div>
              </label>

              {/* Box 4 */}
              <label className="flex items-start gap-3 p-3 bg-white/5 border border-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                <input
                  type="checkbox"
                  checked={notifWeeklyProgress}
                  onChange={(e) => setNotifWeeklyProgress(e.target.checked)}
                  className="w-4 h-4 accent-indigo-500 rounded mt-0.5 cursor-pointer"
                />
                <div>
                  <h5 className="text-white text-xs">Weekly Progress Summary</h5>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-normal">
                    Receive weekly automated reports aggregating your semester average scores.
                  </p>
                </div>
              </label>

            </div>
          </div>

          {settingsMessage && (
            <div className="p-3 bg-theme-success/10 border border-theme-success/20 text-theme-success text-xs font-semibold rounded-xl flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{settingsMessage.text}</span>
            </div>
          )}

          <button
            onClick={handleSaveSettings}
            disabled={settingsSaving}
            className="w-full py-2.5 bg-brand-gradient text-white text-xs font-bold rounded-xl shadow-lg hover:opacity-95 transition-all flex items-center justify-center gap-1.5"
          >
            {settingsSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Notification Preferences</span>
          </button>
        </div>

        {/* Card 3: Appearance */}
        <div className="glass-card p-6 rounded-card border border-white/10 bg-[#0F1424]/40 flex flex-col justify-between gap-5">
          <div>
            <div className="flex items-center gap-2.5 border-b border-white/5 pb-3 mb-5">
              <Palette className="w-5 h-5 text-theme-primary" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Appearance settings</h3>
            </div>

            <div className="flex flex-col gap-4">
              <p className="text-xs text-gray-400 leading-relaxed">
                Edulytics adjusts display modes dynamically according to your preference. Manage your theme selection instantly:
              </p>
              
              <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex gap-3.5 items-start">
                <Info className="w-5 h-5 text-theme-primary shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-white">Dynamic Header Control</span>
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    You can toggle between Dark and Light mode at any time using the theme switcher located at the top-right of your main navigation bar.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-gray-600 font-semibold italic text-center py-2">
            Local browser state synchronized with localStorage.
          </div>
        </div>

        {/* Card 4: Account & Security */}
        <div className="glass-card p-6 rounded-card border border-white/10 bg-[#0F1424]/40 flex flex-col justify-between gap-5">
          <div>
            <div className="flex items-center gap-2.5 border-b border-white/5 pb-3 mb-5">
              <Shield className="w-5 h-5 text-theme-primary" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Account & Security</h3>
            </div>

            <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-theme-primary/50"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-theme-primary/50"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-theme-primary/50"
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

    </div>
  );
}
