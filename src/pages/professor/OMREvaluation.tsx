import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileSpreadsheet, PlusCircle, FileText, CheckCircle2, 
  Sliders, ArrowUpRight, Search, BookOpen, Clock, X, HelpCircle, 
  ChevronRight, Calendar, AlertTriangle, RefreshCw
} from 'lucide-react';
import { API_URL } from '../../utils/api';

export default function OMREvaluation() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'submissions' | 'exams'>('submissions');
  
  // Data States
  const [subjects, setSubjects] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [papers, setPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('All');

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [examDate, setExamDate] = useState('');
  const [totalQuestions, setTotalQuestions] = useState('15');
  const [marksPerQuestion, setMarksPerQuestion] = useState('1.0');
  const [negativeMarking, setNegativeMarking] = useState('0.25');
  const [department, setDepartment] = useState('');
  const [semester, setSemester] = useState('');
  const [templateId, setTemplateId] = useState('OMR-101');

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` };
      
      // Fetch subjects
      const subRes = await fetch(`${API_URL}/api/subjects`, { headers });
      if (subRes.ok) {
        const subData = await subRes.json();
        setSubjects(subData);
        if (subData.length > 0) {
          setSelectedSubjectId(subData[0].id);
        }
      }

      // Fetch exams
      const examRes = await fetch(`${API_URL}/api/exams`, { headers });
      if (examRes.ok) {
        const examData = await examRes.json();
        setExams(examData.filter((e: any) => e.evaluation_type === 'omr'));
      }

      // Fetch papers (submissions)
      const paperRes = await fetch(`${API_URL}/api/papers`, { headers });
      if (paperRes.ok) {
        const paperData = await paperRes.json();
        setPapers(paperData.filter((p: any) => p.evaluationType === 'omr'));
      }
    } catch (err) {
      console.error('Failed to load OMR evaluation data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateOMRExam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/exams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          subjectId: selectedSubjectId,
          title: newTitle,
          evaluationType: 'omr',
          examDate: examDate || null,
          totalQuestions: parseInt(totalQuestions),
          marksPerQuestion: parseFloat(marksPerQuestion),
          negativeMarking: parseFloat(negativeMarking),
          department: department || null,
          semester: semester || null,
          templateId
        })
      });

      if (res.ok) {
        setShowCreateModal(false);
        setNewTitle('');
        setExamDate('');
        setTotalQuestions('15');
        setMarksPerQuestion('1.0');
        setNegativeMarking('0.25');
        setDepartment('');
        setSemester('');
        setTemplateId('OMR-101');
        fetchData();
      } else {
        const err = await res.json();
        alert(`Failed to create OMR exam: ${err.error || 'Server error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Error creating OMR exam.');
    }
  };

  // Filter Submissions
  const filteredPapers = papers.filter(p => {
    const matchesSearch = p.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.examTitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = subjectFilter === 'All' || p.subjectId === subjectFilter;
    return matchesSearch && matchesSubject;
  });

  // Filter Exams
  const filteredExams = exams.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = subjectFilter === 'All' || e.subject_id === subjectFilter;
    return matchesSearch && matchesSubject;
  });

  const getSubjectCode = (subjId: string) => {
    const s = subjects.find(x => x.id === subjId);
    return s ? s.code : 'CS-301';
  };

  return (
    <div className="flex flex-col gap-6 pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <FileSpreadsheet className="w-8 h-8 text-indigo-400" />
            <span>OMR Evaluation</span>
          </h1>
          <p className="text-sm text-gray-400 max-w-2xl mt-1">
            Create optical bubble sheet examinations, configure correct answer keys, and audit student scanners with manual override capabilities.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-brand-gradient text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-1.5 hover:opacity-90 transition-all shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create OMR Exam</span>
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex gap-4 border-b border-white/5 pb-0.5">
        <button
          onClick={() => setActiveTab('submissions')}
          className={`pb-2.5 text-xs font-bold uppercase tracking-wider relative transition-all ${
            activeTab === 'submissions' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <span>OMR Submissions Queue</span>
          {activeTab === 'submissions' && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand-blue" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('exams')}
          className={`pb-2.5 text-xs font-bold uppercase tracking-wider relative transition-all ${
            activeTab === 'exams' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <span>OMR Exam Registry</span>
          {activeTab === 'exams' && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand-blue" />
          )}
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-[#0F1424]/40 p-4 border border-white/10 rounded-xl">
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder={activeTab === 'submissions' ? "Search student name or exam..." : "Search exam title..."}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 outline-none focus:border-brand-blue"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <BookOpen className="w-4 h-4 text-gray-500" />
          <span className="text-xs text-gray-400 font-semibold uppercase shrink-0">Subject Course:</span>
          <select
            value={subjectFilter}
            onChange={e => setSubjectFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#0F1424] border border-white/10 rounded-xl text-xs text-white outline-none cursor-pointer"
          >
            <option value="All">All Subjects</option>
            {subjects.map(sub => (
              <option key={sub.id} value={sub.id}>{sub.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[250px]">
          <RefreshCw className="w-8 h-8 text-brand-purple animate-spin" />
        </div>
      ) : activeTab === 'submissions' ? (
        /* TAB 1: OMR SUBMISSIONS QUEUE */
        <div className="glass-card rounded-card border border-white/10 bg-[#0F1424]/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 text-gray-500 font-bold uppercase tracking-wider bg-white/[0.01]">
                  <th className="p-4">Student Name</th>
                  <th className="p-4">Subject</th>
                  <th className="p-4">Exam Name</th>
                  <th className="p-4 text-center">Score</th>
                  <th className="p-4">Submitted At</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-300 font-medium">
                {filteredPapers.length > 0 ? (
                  filteredPapers.map(paper => {
                    const isPub = paper.isPublished !== false;
                    return (
                      <tr key={paper.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-white">{paper.studentName}</div>
                          <div className="text-[10px] text-gray-500 font-sans mt-0.5">{paper.studentId}</div>
                        </td>
                        <td className="p-4">{getSubjectCode(paper.subjectUuid)}</td>
                        <td className="p-4 font-semibold">{paper.examTitle}</td>
                        <td className="p-4 text-center font-extrabold text-indigo-400">
                          {paper.totalScore} <span className="text-gray-500 text-[10px]">/ {paper.maxMarks}</span>
                        </td>
                        <td className="p-4">{paper.submissionDate}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                            isPub 
                              ? 'bg-brand-emerald/10 border-brand-emerald/20 text-brand-emerald' 
                              : 'bg-status-warning/10 border-status-warning/20 text-status-warning'
                          }`}>
                            {isPub ? 'Released' : 'Pending Verification'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => navigate(`/professor/evaluation?paperId=${paper.id}`)}
                            className="px-3 py-1 bg-brand-gradient hover:opacity-90 text-white font-bold rounded-lg text-[10px] shadow flex items-center gap-1 mx-auto"
                          >
                            <span>Review</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-gray-500 italic">
                      No OMR submissions found matching the criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* TAB 2: OMR EXAMS REGISTRY */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExams.length > 0 ? (
            filteredExams.map(ex => {
              const isConfirmed = ex.is_answer_key_confirmed === true;
              return (
                <div 
                  key={ex.id}
                  className="glass-card p-5 rounded-card border border-white/10 bg-[#0F1424]/40 flex flex-col justify-between gap-5 relative hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">
                        {getSubjectCode(ex.subject_id)}
                      </span>
                      <h4 className="text-sm font-extrabold text-white">{ex.title}</h4>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase border ${
                      isConfirmed 
                        ? 'bg-brand-emerald/10 border-brand-emerald/20 text-brand-emerald' 
                        : 'bg-status-error/10 border-status-error/20 text-status-error'
                    }`}>
                      {isConfirmed ? 'Key Confirmed' : 'Needs Key'}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs text-gray-400 font-semibold border-t border-white/5 pt-3">
                    <div className="flex justify-between">
                      <span>Total Questions:</span>
                      <span className="text-white font-bold">{ex.total_questions || 15}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Marks per Question:</span>
                      <span className="text-white font-bold">{ex.marks_per_question || 1.0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Negative Marking:</span>
                      <span className="text-status-warning font-bold">-{ex.negative_marking || 0.25}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Template Layout:</span>
                      <span className="text-indigo-400 font-bold uppercase">{ex.template_id || 'OMR-101'}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/professor/exams/${ex.id}/omr-key-config`)}
                    className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border ${
                      isConfirmed 
                        ? 'bg-[#1E293B] border-white/10 hover:bg-white/5 text-white' 
                        : 'bg-brand-gradient border-transparent text-white hover:opacity-95 shadow-md shadow-brand-blue/10'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>{isConfirmed ? 'Edit Answer Key' : 'Configure Answer Key'}</span>
                  </button>
                </div>
              );
            })
          ) : (
            <div className="col-span-full text-center py-10 text-gray-500 italic">
              No OMR exams registered yet.
            </div>
          )}
        </div>
      )}

      {/* CREATE EXAM MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="fixed inset-0" onClick={() => setShowCreateModal(false)} />
          <div className="relative w-full max-w-lg rounded-2xl bg-bg-card border border-white/10 shadow-2xl p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                <span>Initialize OMR Exam Registry</span>
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOMRExam} className="flex flex-col gap-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-semibold">Course Subject</label>
                <select 
                  value={selectedSubjectId}
                  onChange={e => setSelectedSubjectId(e.target.value)}
                  required 
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                >
                  {subjects.map(sub => (
                    <option key={sub.id} value={sub.id} className="bg-[#0F1424]">
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-semibold">Exam Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. Data Structures OMR Test"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  required 
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 font-bold uppercase">Total Questions</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="100"
                    value={totalQuestions}
                    onChange={e => setTotalQuestions(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 font-bold uppercase">Marks/Question</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    min="0.1"
                    value={marksPerQuestion}
                    onChange={e => setMarksPerQuestion(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 font-bold uppercase">Negative Marks</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    value={negativeMarking}
                    onChange={e => setNegativeMarking(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-semibold">Department</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Computer Science"
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-semibold">Semester</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Semester III"
                    value={semester}
                    onChange={e => setSemester(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-semibold">Exam Date</label>
                  <input 
                    type="date"
                    value={examDate}
                    onChange={e => setExamDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-semibold">Bubble Template Layout</label>
                  <select 
                    value={templateId}
                    onChange={e => setTemplateId(e.target.value)}
                    required 
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                  >
                    <option value="OMR-101" className="bg-[#0F1424]">Standard 15-Question (OMR-101)</option>
                    <option value="OMR-202" className="bg-[#0F1424]">Standard 30-Question (OMR-202)</option>
                  </select>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full mt-2 py-2.5 bg-brand-gradient text-white text-xs font-bold rounded-xl hover:opacity-90 transition-all"
              >
                Create OMR Exam & Proceed
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
