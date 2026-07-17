import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  GraduationCap, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2 
} from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Retrieve redirect target if exists
  const queryParams = new URLSearchParams(location.search);
  const redirectTo = queryParams.get('redirectTo') || '/dashboard';

  useEffect(() => {
    // Redirect if already logged in
    if (localStorage.getItem('currentUser')) {
      navigate(redirectTo, { replace: true });
    }
  }, [navigate, redirectTo]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed. Please verify credentials.');
      }

      setSuccess(true);
      
      // Store current user session
      setTimeout(() => {
        localStorage.setItem('currentUser', JSON.stringify(data));
        navigate(redirectTo, { replace: true });
      }, 400);

    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const isFormValid = () => {
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    return isEmail && password.length >= 1;
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-[#0A0E1A] relative overflow-hidden px-4">
      {/* Drifting glowing background orbs */}
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

        {/* Login glassmorphic card */}
        <div className="glass-card p-8 rounded-card border border-white/10 flex flex-col gap-6 shadow-2xl relative overflow-hidden">
          {/* Top visual gradient line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-brand-gradient" />

          <div>
            <h2 className="text-2xl font-bold text-white mb-1 tracking-tight">Welcome Back</h2>
            <p className="text-xs text-gray-400">
              Sign in to your Edulytics account
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-status-error/15 border border-status-error/25 text-status-error text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold">Access Denied: </span>
                <span>{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            
            {/* Email field */}
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-semibold">Email Address</label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 w-4 h-4 text-gray-500" />
                <input 
                  type="email" 
                  placeholder="e.vance@aegiseval.com"
                  value={email}
                  disabled={isLoading || success}
                  onChange={e => setEmail(e.target.value)}
                  required 
                  className="w-full pl-11 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/20 transition-all disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-semibold">Password</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 w-4 h-4 text-gray-500" />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="••••••••"
                  value={password}
                  disabled={isLoading || success}
                  onChange={e => setPassword(e.target.value)}
                  required 
                  className="w-full pl-11 pr-11 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/20 transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-gray-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Checkbox and Forgot Password */}
            <div className="flex items-center justify-between text-xs font-semibold py-1">
              <label className="flex items-center gap-2 text-gray-400 select-none cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="rounded border-white/10 bg-white/5 text-brand-blue focus:ring-brand-blue/20 accent-brand-blue"
                />
                <span>Remember Me</span>
              </label>
              
              <a 
                href="#" 
                onClick={e => { e.preventDefault(); alert('Password recovery link dispatched if email matches.'); }}
                className="text-gray-500 hover:text-transparent hover:bg-clip-text hover:bg-brand-gradient transition-colors"
              >
                Forgot Password?
              </a>
            </div>

            {/* CTA Button */}
            <button 
              type="submit" 
              disabled={!isFormValid() || isLoading || success}
              className="w-full py-3 bg-brand-gradient text-white rounded-xl text-sm font-bold shadow-lg shadow-brand-blue/25 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-2"
            >
              {success ? (
                <>
                  <CheckCircle2 className="w-4 h-4 animate-ping" />
                  <span>Signing In...</span>
                </>
              ) : isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <span>Sign In →</span>
              )}
            </button>
          </form>

          <div className="border-t border-white/5 pt-4 text-center text-xs text-gray-400">
            Don't have an account?{' '}
            <Link 
              to="/register" 
              className="text-brand-blue hover:underline font-bold"
            >
              Create Account
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
