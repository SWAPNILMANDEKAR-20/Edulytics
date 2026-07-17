import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, Plus, MoreVertical, Eye, Edit, Trash2, 
  BarChart, Calendar, Award, Users, CreditCard, X
} from 'lucide-react';

interface Subject {
  code: string;
  name: string;
  dept: string;
  credits: number;
  semester: number;
  faculty: string;
  enrolled: number;
  avgScore: number;
}

export default function Subjects() {
  const navigate = useNavigate();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  
  // Input fields for new subject
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newDept, setNewDept] = useState('Computer Science & Eng');
  const [newCredits, setNewCredits] = useState('4');
  const [newSemester, setNewSemester] = useState('4');
  
  const [subjectsList, setSubjectsList] = useState<Subject[]>([
    { code: 'BIO-205', name: 'Cell Biology and Genetics', dept: 'Cell Biology and Genetics', credits: 4, semester: 3, faculty: 'Dr. Evelyn Vance', enrolled: 42, avgScore: 82.5 },
    { code: 'CS-301', name: 'Design and Analysis of Algorithms', dept: 'Computer Science & Eng', credits: 4, semester: 4, faculty: 'Dr. Evelyn Vance', enrolled: 58, avgScore: 74.2 },
    { code: 'MTH-102', name: 'Discrete Mathematics', dept: 'Mathematics', credits: 3, semester: 2, faculty: 'Prof. Alan Turing', enrolled: 35, avgScore: 68.4 },
    { code: 'CHM-101', name: 'Organic Chemistry Basics', dept: 'Chemistry', credits: 4, semester: 1, faculty: 'Dr. Evelyn Vance', enrolled: 42, avgScore: 79.1 }
  ]);

  const handleCreateSubject = (e: React.FormEvent) => {
    e.preventDefault();
    const newSub: Subject = {
      code: newCode,
      name: newName,
      dept: newDept,
      credits: parseInt(newCredits),
      semester: parseInt(newSemester),
      faculty: 'Dr. Evelyn Vance',
      enrolled: 0,
      avgScore: 0
    };
    
    setSubjectsList(prev => [...prev, newSub]);
    setShowCreateModal(false);
    
    // Reset fields
    setNewCode('');
    setNewName('');
  };

  const handleDeleteSubject = (code: string) => {
    setSubjectsList(prev => prev.filter(s => s.code !== code));
    setShowDeleteConfirm(null);
  };

  return (
    <div className="flex flex-col gap-8 pb-10">
      
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-brand-blue" />
            <span>My Subjects</span>
          </h1>
          <p className="text-sm text-gray-400 max-w-2xl">
            Configure subjects, view enrollment ratios, edit configurations, and evaluate student averages.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-gradient hover:opacity-90 text-white text-xs font-bold rounded-xl shadow-lg"
        >
          <Plus className="w-4 h-4" />
          <span>Create Subject</span>
        </button>
      </div>

      {/* Subjects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjectsList.map((subject, idx) => (
          <div 
            key={subject.code}
            className="glass-card p-6 rounded-card border border-white/10 flex flex-col justify-between gap-5 relative bg-[#0F1424]/40 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-blue/5 transition-all group"
          >
            {/* Top Row: Code and Actions Menu */}
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded bg-brand-blue/15 text-brand-blue border border-brand-blue/20">
                  {subject.code}
                </span>
                <h4 className="text-md font-bold text-white mt-3 group-hover:text-brand-blue transition-colors">
                  {subject.name}
                </h4>
                <p className="text-[10px] text-gray-500 font-semibold mt-1">
                  {subject.dept}
                </p>
              </div>

              {/* Delete / Actions trigger */}
              <button 
                onClick={() => setShowDeleteConfirm(subject.code)}
                className="p-1 rounded hover:bg-white/5 text-gray-500 hover:text-status-error transition-colors"
                title="Delete Subject"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-3 gap-3 border-y border-white/5 py-4 my-2 text-center text-xs">
              <div className="flex flex-col gap-1 items-center">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-[10px] text-gray-500">Enrolled</span>
                <span className="font-bold text-white">{subject.enrolled} studs</span>
              </div>
              <div className="flex flex-col gap-1 items-center">
                <CreditCard className="w-4 h-4 text-gray-500" />
                <span className="text-[10px] text-gray-500">Credits</span>
                <span className="font-bold text-white">{subject.credits} units</span>
              </div>
              <div className="flex flex-col gap-1 items-center">
                <Award className="w-4 h-4 text-gray-500" />
                <span className="text-[10px] text-gray-500">Avg Score</span>
                <span className="font-bold text-brand-blue">{subject.avgScore > 0 ? `${subject.avgScore}%` : 'N/A'}</span>
              </div>
            </div>

            {/* Action Buttons Footer */}
            <div className="flex gap-2">
              <button 
                onClick={() => navigate('/analytics')}
                className="flex-1 py-2 bg-white/5 border border-white/5 hover:bg-brand-blue/10 hover:border-brand-blue/20 text-gray-400 hover:text-brand-blue rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <BarChart className="w-3.5 h-3.5" />
                <span>Class Report</span>
              </button>
              <button 
                onClick={() => navigate('/exams')}
                className="flex-1 py-2 bg-brand-gradient text-white rounded-xl text-xs font-bold hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-1"
              >
                <span>View Details</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL: Create Subject Drawer */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="fixed inset-0" onClick={() => setShowCreateModal(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-bg-card border border-white/10 shadow-2xl p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-lg font-bold text-white">Create New Course Subject</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubject} className="flex flex-col gap-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-semibold">Subject Code</label>
                <input 
                  type="text" 
                  placeholder="CS-302"
                  value={newCode}
                  onChange={e => setNewCode(e.target.value)}
                  required 
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-semibold">Subject Name</label>
                <input 
                  type="text" 
                  placeholder="Operating Systems"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  required 
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-semibold">Department</label>
                <select 
                  value={newDept}
                  onChange={e => setNewDept(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                >
                  <option value="Computer Science & Eng">Computer Science & Eng</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Cell Biology and Genetics">Cell Biology and Genetics</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-semibold">Credits</label>
                  <input 
                    type="number" 
                    value={newCredits}
                    onChange={e => setNewCredits(e.target.value)}
                    required 
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-semibold">Semester</label>
                  <input 
                    type="number" 
                    value={newSemester}
                    onChange={e => setNewSemester(e.target.value)}
                    required 
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-4 border-t border-white/5 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 bg-white/5 border border-white/10 text-gray-400 hover:text-white rounded-xl text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2 bg-brand-gradient text-white rounded-xl text-xs font-bold hover:opacity-90 shadow-lg"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DIALOG: Delete Subject */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="fixed inset-0" onClick={() => setShowDeleteConfirm(null)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-bg-card border border-white/10 shadow-2xl p-6 flex flex-col gap-4 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-status-error/10 border border-status-error/25 flex items-center justify-center text-status-error text-xl animate-pulse">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-md font-bold text-white">Delete Subject {showDeleteConfirm}?</h4>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                This action is irreversible. All student records, essays, and OMR scores for this course will be deleted forever.
              </p>
            </div>
            <div className="flex gap-3 mt-2">
              <button 
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-2 bg-white/5 border border-white/10 text-gray-400 hover:text-white rounded-xl text-xs font-bold transition-all"
              >
                No, Keep Course
              </button>
              <button 
                onClick={() => handleDeleteSubject(showDeleteConfirm)}
                className="flex-1 py-2 bg-status-error text-white rounded-xl text-xs font-bold hover:bg-status-error/95 shadow-lg shadow-status-error/10 transition-all"
              >
                Yes, Delete Course
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
