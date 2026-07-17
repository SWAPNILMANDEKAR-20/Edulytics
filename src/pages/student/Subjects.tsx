import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, Users, CreditCard, Award, GraduationCap, ArrowRight, Plus, HelpCircle, X
} from 'lucide-react';
const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

interface StudentSubject {
  id: string;
  code: string;
  name: string;
  professorName: string;
}

export default function StudentSubjects() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<StudentSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState(false);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/student/subjects`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSubjects(data);
      }
    } catch (err) {
      console.error('Failed to load subjects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleJoinSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');
    setJoinSuccess(false);

    if (!joinCode.trim()) {
      setJoinError('Please enter a subject code.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/subjects/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: joinCode.trim().toUpperCase() })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to enroll in subject.');
      }

      setJoinSuccess(true);
      setJoinCode('');
      setTimeout(() => {
        setShowJoinModal(false);
        setJoinSuccess(false);
        fetchSubjects();
      }, 1000);
    } catch (err: any) {
      setJoinError(err.message);
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-10">
      
      {/* Header */}
      <div className="flex justify-between items-center flex-row gap-2">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-brand-blue" />
            <span>My Enrolled Subjects</span>
          </h1>
          <p className="text-sm text-gray-400 max-w-2xl">
            Track enrolled subjects, review instructors, and access your submissions and history logs.
          </p>
        </div>
        
        <button
          onClick={() => setShowJoinModal(true)}
          className="px-4 py-2 bg-brand-gradient hover:opacity-90 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-1.5 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Join Course</span>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(n => (
            <div key={n} className="glass-panel p-6 rounded-card border border-white/5 bg-[#0F1424]/20 h-[220px] animate-pulse" />
          ))}
        </div>
      ) : subjects.length === 0 ? (
        <div className="glass-card p-10 rounded-card border border-white/10 text-center flex flex-col items-center justify-center gap-4 max-w-md mx-auto">
          <BookOpen className="w-12 h-12 text-gray-600 animate-float" />
          <div>
            <h4 className="text-md font-bold text-white mb-1">No Enrolled Subjects</h4>
            <p className="text-xs text-gray-500 leading-relaxed font-semibold">
              You are not enrolled in any examination courses yet. Click "Join Course" to add a course subject.
            </p>
          </div>
          <button
            onClick={() => setShowJoinModal(true)}
            className="px-5 py-2 bg-brand-gradient text-white text-xs font-bold rounded-xl"
          >
            Join Your First Course
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map(subject => (
            <div 
              key={subject.id}
              className="glass-card p-6 rounded-card border border-white/10 flex flex-col justify-between gap-5 relative bg-[#0F1424]/40 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-blue/5 transition-all group"
            >
              
              {/* Header info */}
              <div>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded bg-brand-blue/15 text-brand-blue border border-brand-blue/20">
                  {subject.code}
                </span>
                <h4 className="text-md font-bold text-white mt-3 group-hover:text-brand-blue transition-colors">
                  {subject.name}
                </h4>
                <p className="text-[10px] text-gray-500 font-semibold mt-2 flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Instructor: {subject.professorName}</span>
                </p>
              </div>

              {/* Metrics placeholder mock stats */}
              <div className="grid grid-cols-3 gap-3 border-y border-white/5 py-4 my-1 text-center text-xs">
                <div className="flex flex-col gap-1 items-center">
                  <CreditCard className="w-4 h-4 text-gray-500" />
                  <span className="text-[10px] text-gray-500 font-bold">Credits</span>
                  <span className="font-bold text-white">4 Units</span>
                </div>
                <div className="flex flex-col gap-1 items-center">
                  <Award className="w-4 h-4 text-gray-500" />
                  <span className="text-[10px] text-gray-500 font-bold">Exams</span>
                  <span className="font-bold text-brand-blue">Midterm</span>
                </div>
                <div className="flex flex-col gap-1 items-center">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-[10px] text-gray-500 font-bold">Cohort</span>
                  <span className="font-bold text-brand-purple">Active</span>
                </div>
              </div>

              {/* Link footer */}
              <button 
                onClick={() => navigate('/student/scores')}
                className="w-full py-2 bg-white/5 border border-white/5 hover:bg-brand-blue/10 hover:border-brand-blue/20 text-gray-400 hover:text-brand-blue rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <span>View Score History</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Join Course Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="glass-card max-w-sm w-full p-6 rounded-card border border-white/10 bg-[#0F1424]/90 relative shadow-2xl">
            <button
              onClick={() => { setShowJoinModal(false); setJoinError(''); }}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-brand-blue" />
              <span>Enroll in Course Subject</span>
            </h3>
            <p className="text-xs text-gray-400 mb-4 leading-relaxed font-semibold">
              Enter the unique subject code (e.g., <code className="text-brand-blue font-bold">CS-301</code>, <code className="text-brand-blue font-bold">PHY-102</code>, or <code className="text-brand-blue font-bold">BIO-205</code>) to enroll.
            </p>

            <form onSubmit={handleJoinSubject} className="space-y-4">
              <input
                type="text"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value)}
                placeholder="Enter Subject Code"
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white uppercase focus:outline-none focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/20 transition-all font-semibold"
              />

              {joinError && (
                <div className="p-2.5 rounded-lg bg-status-danger/10 border border-status-danger/20 text-status-danger text-[10px] font-bold">
                  {joinError}
                </div>
              )}

              {joinSuccess && (
                <div className="p-2.5 rounded-lg bg-brand-emerald/10 border border-brand-emerald/20 text-brand-emerald text-[10px] font-bold">
                  ✓ Successfully enrolled! Reloading...
                </div>
              )}

              <button
                type="submit"
                disabled={joinSuccess}
                className="w-full py-2.5 bg-brand-gradient text-white font-bold rounded-xl text-xs"
              >
                Join Subject
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
