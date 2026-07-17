import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  GraduationCap, Mail, Lock, Eye, EyeOff, Briefcase 
} from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();

  // Restore state if returning from Step 2
  const priorState = location.state || {};

  const [role, setRole] = useState<'student' | 'professor'>(priorState.role || 'student');
  const [email, setEmail] = useState(priorState.email || '');
  const [password, setPassword] = useState(priorState.password || '');
  const [confirmPassword, setConfirmPassword] = useState(priorState.password || '');
  const [showPassword, setShowPassword] = useState(false);
  const [terms, setTerms] = useState(priorState.terms || false);

  const [pwStrength, setPwStrength] = useState(0);
  const [pwStrengthText, setPwStrengthText] = useState('Weak');

  // Calculate Password Strength
  useEffect(() => {
    if (!password) {
      setPwStrength(0);
      setPwStrengthText('Weak');
      return;
    }
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    setPwStrength(score);
    if (score === 1 || score === 0) setPwStrengthText('Weak');
    else if (score === 2) setPwStrengthText('Fair');
    else if (score === 3) setPwStrengthText('Good');
    else if (score === 4) setPwStrengthText('Strong');
  }, [password]);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;

    navigate('/register/profile', { 
      state: { role, email, password, terms } 
    });
  };

  const isFormValid = () => {
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const isPasswordValid = pwStrength >= 2;
    const isMatch = password === confirmPassword && confirmPassword !== '';
    return isEmail && isPasswordValid && isMatch && terms;
  };

  const strengthColorClass = () => {
    if (pwStrengthText === 'Weak') return 'text-status-error';
    if (pwStrengthText === 'Fair') return 'text-status-warning';
    if (pwStrengthText === 'Good') return 'text-brand-blue';
    return 'text-brand-emerald';
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-[#0A0E1A] relative overflow-hidden px-4">
      {/* Background drifting glow orbs */}
      <div className="glow-orb w-[450px] h-[450px] bg-brand-blue/10 absolute -top-32 -left-32 rounded-full filter blur-[100px]" />
      <div className="glow-orb w-[450px] h-[450px] bg-brand-purple/10 absolute -bottom-32 -right-32 rounded-full filter blur-[120px]" />

      <div className="w-full max-w-[440px] z-10 flex flex-col gap-6">
        
        {/* Logo Title */}
        <div className="flex items-center justify-center gap-3">
          <div className="bg-brand-gradient w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-blue/20">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wider text-white">
              EDULYTICS
            </h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-none">
              AI Assessment Platform
            </p>
          </div>
        </div>

        {/* Card Frame */}
        <div className="glass-card p-8 rounded-card border border-white/10 flex flex-col gap-6 shadow-2xl relative overflow-hidden">
          {/* Top visual gradient line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-brand-gradient" />

          <div>
            <h2 className="text-2xl font-bold text-white mb-1 tracking-tight">Create Account</h2>
            <p className="text-xs text-gray-400">
              Configure your Edulytics academic credentials
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="bg-white/5 border border-white/10 p-3.5 rounded-xl flex flex-col gap-2.5">
            <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              <span className="text-brand-blue">1. Credentials</span>
              <span>2. Profile Details</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-brand-gradient w-1/2" />
            </div>
          </div>

          <form onSubmit={handleNext} className="flex flex-col gap-4">
            
            {/* Account Type selection */}
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-semibold">Select Account Type</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={`p-3 rounded-xl border flex flex-col items-start gap-2 text-left transition-all ${
                    role === 'student'
                      ? 'bg-brand-blue/10 border-brand-blue ring-1 ring-brand-blue'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    role === 'student' ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/20' : 'bg-white/5 text-gray-400'
                  }`}>
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Student</h4>
                    <p className="text-[9px] text-gray-500 mt-1 leading-snug">Access sheets & analytics</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('professor')}
                  className={`p-3 rounded-xl border flex flex-col items-start gap-2 text-left transition-all ${
                    role === 'professor'
                      ? 'bg-brand-purple/10 border-brand-purple ring-1 ring-brand-purple'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    role === 'professor' ? 'bg-brand-purple text-white shadow-md shadow-brand-purple/20' : 'bg-white/5 text-gray-400'
                  }`}>
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Professor</h4>
                    <p className="text-[9px] text-gray-500 mt-1 leading-snug">Grade scripts & custom rubrics</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-semibold">Email Address</label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 w-4 h-4 text-gray-500" />
                <input 
                  type="email" 
                  placeholder="name@university.edu"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-blue/50 focus:ring-1 focus:ring-brand-blue/20 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-semibold">Password (Min 8 Characters)</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 w-4 h-4 text-gray-500" />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full pl-11 pr-11 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-blue/50 focus:ring-1 focus:ring-brand-blue/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-gray-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength meter */}
              {password && (
                <div className="mt-2 space-y-1 animate-fadeIn">
                  <div className="text-[9px] text-gray-500 font-semibold">
                    Strength: <span className={`font-extrabold ${strengthColorClass()}`}>{pwStrengthText}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 h-1">
                    <div className={`rounded-full h-full ${pwStrength >= 1 ? (pwStrength === 1 ? 'bg-status-error' : pwStrength === 2 ? 'bg-status-warning' : pwStrength === 3 ? 'bg-brand-blue' : 'bg-brand-emerald') : 'bg-white/5'}`} />
                    <div className={`rounded-full h-full ${pwStrength >= 2 ? (pwStrength === 2 ? 'bg-status-warning' : pwStrength === 3 ? 'bg-brand-blue' : 'bg-brand-emerald') : 'bg-white/5'}`} />
                    <div className={`rounded-full h-full ${pwStrength >= 3 ? (pwStrength === 3 ? 'bg-brand-blue' : 'bg-brand-emerald') : 'bg-white/5'}`} />
                    <div className={`rounded-full h-full ${pwStrength >= 4 ? 'bg-brand-emerald' : 'bg-white/5'}`} />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-semibold">Confirm Password</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 w-4 h-4 text-gray-500" />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  className="w-full pl-11 pr-11 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-blue/50 focus:ring-1 focus:ring-brand-blue/20 transition-all"
                />
              </div>
              {confirmPassword && (
                <div className={`text-[10px] font-bold mt-1 ${password === confirmPassword ? 'text-brand-emerald' : 'text-status-error'}`}>
                  {password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                </div>
              )}
            </div>

            {/* Terms checkbox */}
            <div className="flex items-start gap-2.5 mt-1 select-none">
              <input 
                type="checkbox" 
                id="terms" 
                checked={terms}
                onChange={e => setTerms(e.target.checked)}
                className="mt-0.5 rounded border-white/10 bg-white/5 text-brand-blue focus:ring-brand-blue/20 accent-brand-blue cursor-pointer"
              />
              <label htmlFor="terms" className="text-[10px] text-gray-500 leading-normal cursor-pointer">
                I accept the <a href="#" onClick={e => e.preventDefault()} className="text-brand-blue hover:underline font-bold">Terms of Services</a> and <a href="#" onClick={e => e.preventDefault()} className="text-brand-blue hover:underline font-bold">Privacy Policy</a>.
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!isFormValid()}
              className="w-full py-2.5 bg-brand-gradient text-white rounded-xl text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-brand-blue/15 hover:opacity-95 transition-all flex items-center justify-center mt-2"
            >
              Continue Step →
            </button>
          </form>

          <div className="border-t border-white/5 pt-4 text-center text-xs text-gray-400">
            Already registered?{' '}
            <Link 
              to="/login" 
              className="text-brand-blue hover:underline font-bold"
            >
              Sign In
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
