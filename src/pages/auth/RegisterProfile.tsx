import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  GraduationCap, User, Building, Phone, ChevronLeft, 
  AlertCircle, CheckCircle2, Award, Briefcase
} from 'lucide-react';
import { API_URL } from '../../utils/api';

export default function RegisterProfile() {
  const navigate = useNavigate();
  const location = useLocation();

  // Retrieve state passed from Step 1
  const stepOneData = location.state || {};
  const { role, email, password } = stepOneData;

  // Form states
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  
  // Student specific
  const [college, setCollege] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [semester, setSemester] = useState('1');
  const [enrollmentYear, setEnrollmentYear] = useState('2026');

  // Professor specific
  const [facultyId, setFacultyId] = useState('');
  const [designation, setDesignation] = useState('Senior Evaluator');
  const [experience, setExperience] = useState('');
  const [subjects, setSubjects] = useState('');

  // Control states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    // If user lands directly on Step 2 without Step 1 credentials, send them back
    if (!email || !password || !role) {
      navigate('/register', { replace: true });
    }
  }, [email, password, role, navigate]);

  // Handle countdown redirect on success
  useEffect(() => {
    if (success) {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            // Navigate to dynamic role dashboard target
            navigate(role === 'student' ? '/student/dashboard' : '/professor/dashboard', { replace: true });
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [success, role, navigate]);

  const handleBack = () => {
    navigate('/register', { 
      state: { ...stepOneData } 
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;
    
    setIsLoading(true);
    setError('');

    const payload: any = {
      email,
      password,
      role,
      fullName,
      department,
      phoneNumber: phone
    };

    if (role === 'student') {
      payload.rollNumber = rollNumber;
      payload.semester = semester;
      payload.enrollmentYear = enrollmentYear;
      payload.college = college;
    } else {
      payload.facultyId = facultyId;
      payload.designation = designation;
      payload.yearsOfExperience = experience ? parseInt(experience) : 0;
      payload.subjectsTeaching = subjects ? subjects.split(',').map(s => s.trim()) : [];
    }

    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete profile creation.');
      }

      // Store success session in localStorage
      localStorage.setItem('currentUser', JSON.stringify(data));
      setSuccess(true);

    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const isFormValid = () => {
    const isBaseValid = fullName.trim() !== '' && department.trim() !== '';
    if (!isBaseValid) return false;

    if (role === 'student') {
      return rollNumber.trim() !== '' && semester !== '' && enrollmentYear !== '' && college.trim() !== '';
    } else {
      return facultyId.trim() !== '' && designation !== '' && experience !== '';
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-[#0A0E1A] relative overflow-hidden px-4">
      {/* Background glowing orbs */}
      <div className="glow-orb w-[450px] h-[450px] bg-brand-blue/10 absolute -top-32 -left-32 rounded-full filter blur-[100px]" />
      <div className="glow-orb w-[450px] h-[450px] bg-brand-purple/10 absolute -bottom-32 -right-32 rounded-full filter blur-[120px]" />

      <div className="w-full max-w-[440px] z-10 flex flex-col gap-6">
        
        {/* Title Logo */}
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

        {/* Form Card */}
        <div className="glass-card p-8 rounded-card border border-white/10 flex flex-col gap-6 shadow-2xl relative overflow-hidden">
          {/* Top visual gradient line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-brand-gradient" />

          {/* Success View */}
          {success ? (
            <div className="text-center py-6 flex flex-col items-center gap-6">
              <div className="w-16 h-16 rounded-full bg-brand-emerald/10 border-2 border-brand-emerald flex items-center justify-center text-brand-emerald text-3xl animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Account Created!</h3>
                <p className="text-xs text-gray-400">
                  Welcome to Edulytics. Preparing your AI learning workspace...
                </p>
              </div>

              <div className="text-xs text-brand-blue font-bold bg-brand-blue/5 border border-brand-blue/10 px-4 py-2 rounded-lg">
                Redirecting to Dashboard in {countdown} seconds...
              </div>

              <button
                onClick={() => navigate(role === 'student' ? '/student/dashboard' : '/professor/dashboard', { replace: true })}
                className="w-full py-3 bg-brand-gradient text-white rounded-xl text-sm font-bold shadow-lg shadow-brand-blue/20 hover:opacity-90 transition-all"
              >
                Access Dashboard Now
              </button>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-2xl font-bold text-white mb-1 tracking-tight">Complete Profile</h2>
                <p className="text-xs text-gray-400">
                  Provide your academic record details to resolve your dashboard configuration.
                </p>
              </div>

              {/* Progress Indicator */}
              <div className="bg-white/5 border border-white/10 p-3.5 rounded-xl flex flex-col gap-2.5">
                <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  <span>1. Credentials</span>
                  <span className="text-brand-blue">2. Profile Details</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-gradient w-full" />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-status-error/15 border border-status-error/25 text-status-error text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-bold">Error: </span>
                    <span>{error}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-semibold">Full Name</label>
                  <div className="relative flex items-center">
                    <User className="absolute left-3.5 w-4 h-4 text-gray-500" />
                    <input 
                      type="text" 
                      placeholder="Jane Doe"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      required
                      disabled={isLoading}
                      className="w-full pl-11 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-blue/50 disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Dynamic fields - STUDENT */}
                {role === 'student' && (
                  <>
                    {/* College/University */}
                    <div className="space-y-1">
                      <label className="text-xs text-gray-400 font-semibold">College / University</label>
                      <div className="relative flex items-center">
                        <Building className="absolute left-3.5 w-4 h-4 text-gray-500" />
                        <input 
                          type="text" 
                          placeholder="Stanford University"
                          value={college}
                          onChange={e => setCollege(e.target.value)}
                          required
                          disabled={isLoading}
                          className="w-full pl-11 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-blue/50 disabled:opacity-50"
                        />
                      </div>
                    </div>

                    {/* Department */}
                    <div className="space-y-1">
                      <label className="text-xs text-gray-400 font-semibold">Department</label>
                      <div className="relative flex items-center">
                        <Building className="absolute left-3.5 w-4 h-4 text-gray-500" />
                        <input 
                          type="text" 
                          placeholder="Computer Science & Eng"
                          value={department}
                          onChange={e => setDepartment(e.target.value)}
                          required
                          disabled={isLoading}
                          className="w-full pl-11 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-blue/50 disabled:opacity-50"
                        />
                      </div>
                    </div>

                    {/* Roll and Semester */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-gray-400 font-semibold">Roll Number</label>
                        <input 
                          type="text" 
                          placeholder="CS24B1001"
                          value={rollNumber}
                          onChange={e => setRollNumber(e.target.value)}
                          required
                          disabled={isLoading}
                          className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-blue/50 disabled:opacity-50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-gray-400 font-semibold">Current Semester</label>
                        <input 
                          type="number" 
                          placeholder="4"
                          min="1"
                          max="10"
                          value={semester}
                          onChange={e => setSemester(e.target.value)}
                          required
                          disabled={isLoading}
                          className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-blue/50 disabled:opacity-50"
                        />
                      </div>
                    </div>

                    {/* Enrollment Year */}
                    <div className="space-y-1">
                      <label className="text-xs text-gray-400 font-semibold">Enrollment Year</label>
                      <input 
                        type="number" 
                        placeholder="2026"
                        min="2000"
                        max="2035"
                        value={enrollmentYear}
                        onChange={e => setEnrollmentYear(e.target.value)}
                        required
                        disabled={isLoading}
                        className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-blue/50 disabled:opacity-50"
                      />
                    </div>
                  </>
                )}

                {/* Dynamic fields - PROFESSOR */}
                {role === 'professor' && (
                  <>
                    {/* Department */}
                    <div className="space-y-1">
                      <label className="text-xs text-gray-400 font-semibold">Faculty Department</label>
                      <div className="relative flex items-center">
                        <Building className="absolute left-3.5 w-4 h-4 text-gray-500" />
                        <input 
                          type="text" 
                          placeholder="Computer Science & Eng"
                          value={department}
                          onChange={e => setDepartment(e.target.value)}
                          required
                          disabled={isLoading}
                          className="w-full pl-11 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-blue/50 disabled:opacity-50"
                        />
                      </div>
                    </div>

                    {/* Faculty ID and Designation */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-gray-400 font-semibold">Faculty ID</label>
                        <input 
                          type="text" 
                          placeholder="FAC-8812"
                          value={facultyId}
                          onChange={e => setFacultyId(e.target.value)}
                          required
                          disabled={isLoading}
                          className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-blue/50 disabled:opacity-50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-gray-400 font-semibold">Designation</label>
                        <select 
                          value={designation}
                          onChange={e => setDesignation(e.target.value)}
                          required
                          disabled={isLoading}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-blue/50 disabled:opacity-50"
                        >
                          <option value="Senior Evaluator">Senior Evaluator</option>
                          <option value="Professor">Professor</option>
                          <option value="Associate Professor">Associate Professor</option>
                          <option value="Assistant Professor">Assistant Professor</option>
                          <option value="Teaching Assistant">Teaching Assistant</option>
                        </select>
                      </div>
                    </div>

                    {/* Experience and Subjects */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-gray-400 font-semibold">Years of Experience</label>
                        <input 
                          type="number" 
                          placeholder="12"
                          min="0"
                          max="50"
                          value={experience}
                          onChange={e => setExperience(e.target.value)}
                          required
                          disabled={isLoading}
                          className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-blue/50 disabled:opacity-50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-gray-400 font-semibold">Subjects (Comma separated)</label>
                        <input 
                          type="text" 
                          placeholder="CS-301, BIO-205"
                          value={subjects}
                          onChange={e => setSubjects(e.target.value)}
                          disabled={isLoading}
                          className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-blue/50 disabled:opacity-50"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Phone Number */}
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-semibold">Phone Number</label>
                  <div className="relative flex items-center">
                    <Phone className="absolute left-3.5 w-4 h-4 text-gray-500" />
                    <input 
                      type="tel" 
                      placeholder="+1 (555) 012-3456"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      disabled={isLoading}
                      className="w-full pl-11 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-blue/50 disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Buttons Navigation */}
                <div className="flex gap-3 mt-4 border-t border-white/5 pt-4">
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={isLoading}
                    className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    disabled={!isFormValid() || isLoading}
                    className="flex-1 py-2.5 bg-brand-gradient text-white rounded-xl text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-95 shadow-lg shadow-brand-blue/15 transition-all flex items-center justify-center gap-1.5"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <span>Create Account</span>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
