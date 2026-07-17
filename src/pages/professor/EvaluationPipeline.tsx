import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  FileInput, UploadCloud, FileText, CheckCircle2, ChevronRight, 
  Cpu, Sliders, AlertCircle, FileDown, Sparkles, RefreshCw,
  Search, Filter, ArrowRight, Check, Save, Send, BookOpen, User, ZoomIn, ZoomOut
} from 'lucide-react';
import { API_URL } from '../../utils/api';

export default function EvaluationPipeline() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const submissionId = queryParams.get('submissionId');

  // Queue State
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [queueLoading, setQueueLoading] = useState(true);

  // Review State
  const [paper, setPaper] = useState<any>(null);
  const [activeQuestion, setActiveQuestion] = useState(1);
  const [reviewLoading, setReviewLoading] = useState(true);
  const [autosaving, setAutosaving] = useState(false);
  const [evaluatorNotes, setEvaluatorNotes] = useState('');
  const [releasing, setReleasing] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  // Load Submissions Queue
  const fetchQueue = async () => {
    try {
      setQueueLoading(true);
      const res = await fetch(`${API_URL}/api/papers`);
      if (res.ok) {
        setSubmissions(await res.json());
      }
    } catch (err) {
      console.error('Failed to load queue:', err);
    } finally {
      setQueueLoading(false);
    }
  };

  useEffect(() => {
    if (!submissionId) {
      fetchQueue();
    }
  }, [submissionId]);

  // Load single submission for review
  const fetchSubmissionDetails = async () => {
    if (!submissionId) return;
    try {
      setReviewLoading(true);
      const res = await fetch(`/api/papers/${submissionId}`);
      if (res.ok) {
        const data = await res.json();
        setPaper(data);
        setEvaluatorNotes(data.evaluatorNotes || '');
        if (data.answers && data.answers.length > 0) {
          setActiveQuestion(1);
        }
      } else {
        alert('Submission not found.');
        navigate('/professor/evaluation');
      }
    } catch (err) {
      console.error('Failed to load submission details:', err);
    } finally {
      setReviewLoading(false);
    }
  };

  useEffect(() => {
    if (submissionId) {
      fetchSubmissionDetails();
    }
  }, [submissionId]);

  // Debounced Autosave Draft
  const saveTimerRef = useRef<any>(null);
  const triggerAutosave = (updatedAnswers: any[], updatedNotes: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setAutosaving(true);
      try {
        const payload = {
          answers: updatedAnswers.map(ans => ({
            questionNo: ans.questionNo,
            questionId: ans.questionId,
            studentAnswer: ans.studentAnswer || '',
            score: ans.score,
            aiFeedback: ans.aiFeedback || '',
            detectedOption: ans.detectedOption || '',
            professorOverride: ans.professorOverride || null
          })),
          evaluatorNotes: updatedNotes
        };
        await fetch(`/api/evaluations/${submissionId}/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        console.error('Autosave failed:', err);
      } finally {
        setAutosaving(false);
      }
    }, 1500);
  };

  const handleOMROverride = (questionNo: number, newOption: string) => {
    if (!paper) return;
    const updatedAnswers = paper.answers.map((ans: any) => {
      if (ans.questionNo === questionNo) {
        return {
          ...ans,
          professorOverride: newOption,
          detectedOption: newOption
        };
      }
      return ans;
    });

    let correctCount = 0;
    let incorrectCount = 0;
    let blankCount = 0;
    let invalidCount = 0;

    const marksPerQ = paper.answers[0]?.maxMarks || 1.0;
    const negMarks = 0.25;

    const newAnswers = updatedAnswers.map((ans: any) => {
      const isCorrect = ans.detectedOption === ans.correctOption;
      let status = 'wrong';
      let score = -negMarks;

      if (ans.detectedOption === '') {
        status = 'blank';
        score = 0.0;
        blankCount++;
      } else if (ans.detectedOption.includes(',') || ans.detectedOption === 'multiple') {
        status = 'multiple_marked';
        score = 0.0;
        invalidCount++;
      } else if (isCorrect) {
        status = 'correct';
        score = marksPerQ;
        correctCount++;
      } else {
        incorrectCount++;
      }

      return {
        ...ans,
        status,
        score
      };
    });

    const rawTotal = newAnswers.reduce((sum: number, a: any) => sum + a.score, 0);
    const totalScore = Math.max(0.0, parseFloat(rawTotal.toFixed(2)));

    setPaper({
      ...paper,
      answers: newAnswers,
      totalScore
    });

    triggerAutosave(newAnswers, evaluatorNotes);
  };

  const handleScoreChange = (qIndex: number, newScore: number) => {
    if (!paper) return;
    const updatedAnswers = [...paper.answers];
    updatedAnswers[qIndex] = {
      ...updatedAnswers[qIndex],
      score: newScore,
      isEvaluated: true
    };
    
    // Calculate new totalScore
    const totalScore = updatedAnswers.reduce((sum, a) => sum + (a.score || 0), 0);
    setPaper({
      ...paper,
      answers: updatedAnswers,
      totalScore
    });

    triggerAutosave(updatedAnswers, evaluatorNotes);
  };

  const handleFeedbackChange = (qIndex: number, newFeedback: string) => {
    if (!paper) return;
    const updatedAnswers = [...paper.answers];
    updatedAnswers[qIndex] = {
      ...updatedAnswers[qIndex],
      aiFeedback: newFeedback,
      isEvaluated: true
    };
    setPaper({
      ...paper,
      answers: updatedAnswers
    });

    triggerAutosave(updatedAnswers, evaluatorNotes);
  };

  const handleQuestionNoChange = (qIndex: number, newQuestionNo: number) => {
    if (!paper) return;
    const updatedAnswers = [...paper.answers];
    const refQ = updatedAnswers.find(a => a.questionNo === newQuestionNo && !a.isUnmatched);
    
    updatedAnswers[qIndex] = {
      ...updatedAnswers[qIndex],
      questionNo: newQuestionNo,
      questionId: `Q${newQuestionNo}`,
      questionText: refQ ? refQ.questionText : updatedAnswers[qIndex].questionText,
      referenceAnswer: refQ ? refQ.referenceAnswer : updatedAnswers[qIndex].referenceAnswer,
      maxMarks: refQ ? refQ.maxMarks : updatedAnswers[qIndex].maxMarks,
      isUnmatched: false
    };

    setPaper({
      ...paper,
      answers: updatedAnswers
    });

    triggerAutosave(updatedAnswers, evaluatorNotes);
  };

  const handleNotesChange = (newNotes: string) => {
    if (!paper) return;
    setEvaluatorNotes(newNotes);
    setPaper({
      ...paper,
      evaluatorNotes: newNotes
    });
    triggerAutosave(paper.answers, newNotes);
  };

  const handleAcceptAI = (qIndex: number) => {
    if (!paper) return;
    const ans = paper.answers[qIndex];
    handleScoreChange(qIndex, ans.score || 0.0);
  };

  const handleReleaseResults = async () => {
    if (!paper) return;
    if (releasing) return;
    setReleasing(true);
    try {
      const res = await fetch(`/api/evaluations/${submissionId}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        alert('Results released successfully! A notification was sent to the student.');
        navigate('/professor/evaluation');
      } else {
        alert('Failed to release results. Make sure all questions are graded.');
      }
    } catch (err) {
      console.error(err);
      alert('Error releasing results.');
    } finally {
      setReleasing(false);
    }
  };

  const getOMRStats = () => {
    if (!paper || !paper.answers) return { correct: 0, wrong: 0, blank: 0, multiple: 0, accuracy: 0 };
    let correct = 0;
    let wrong = 0;
    let blank = 0;
    let multiple = 0;
    
    paper.answers.forEach((ans: any) => {
      if (ans.status === 'correct') correct++;
      else if (ans.status === 'blank') blank++;
      else if (ans.status === 'multiple_marked' || ans.status === 'invalid') multiple++;
      else wrong++;
    });

    const evaluatedCount = correct + wrong + multiple;
    const accuracy = evaluatedCount > 0 ? Math.round((correct / evaluatedCount) * 100) : 0;
    return { correct, wrong, blank, multiple, accuracy };
  };

  // Queue Filtering & Search
  const filteredSubmissions = submissions.filter(s => {
    const matchSearch = s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        s.studentId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSubject = subjectFilter === 'All' || s.subjectId === subjectFilter;
    
    // Status translation for filter
    let cleanStatus = s.status; // 'pending', 'in_review', 'released', 'grading_failed'
    if (s.status === 'grading_failed') cleanStatus = 'pending';
    if (s.isPublished) cleanStatus = 'released';
    const matchStatus = statusFilter === 'All' || cleanStatus === statusFilter;

    return matchSearch && matchSubject && matchStatus;
  });

  const getUniqueSubjects = () => {
    return Array.from(new Set(submissions.map(s => s.subjectId)));
  };

  // ==========================================================================
  // VIEW 1: Submissions Review Queue List
  // ==========================================================================
  if (!submissionId) {
    return (
      <div className="flex flex-col gap-8 pb-10">
        
        {/* Header */}
        <div className="flex justify-between items-start flex-col gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <FileInput className="w-8 h-8 text-brand-purple" />
            <span>Evaluation queue</span>
          </h1>
          <p className="text-sm text-gray-400 max-w-2xl">
            Review exam scripts uploaded by students, grade with explainable SBERT semantic checklists, and release grades.
          </p>
        </div>

        {/* Filter panel */}
        <div className="glass-panel p-4 rounded-xl border border-white/10 flex flex-wrap gap-4 items-center justify-between bg-[#0F1424]/40">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 w-4 h-4 text-gray-500 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by student name or email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-blue/50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-gray-500 font-bold uppercase tracking-wider">Subject:</span>
              <select 
                value={subjectFilter} 
                onChange={e => setSubjectFilter(e.target.value)}
                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white outline-none cursor-pointer"
              >
                <option value="All" className="bg-[#0F1424]">All Subjects</option>
                {getUniqueSubjects().map(sub => (
                  <option key={sub} value={sub} className="bg-[#0F1424]">{sub}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-gray-500 font-bold uppercase tracking-wider">Status:</span>
              <select 
                value={statusFilter} 
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white outline-none cursor-pointer"
              >
                <option value="All" className="bg-[#0F1424]">All Statuses</option>
                <option value="pending" className="bg-[#0F1424]">Pending Review</option>
                <option value="released" className="bg-[#0F1424]">Released</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submissions queue table */}
        {queueLoading ? (
          <div className="flex items-center justify-center min-h-[250px]">
            <RefreshCw className="w-8 h-8 text-brand-purple animate-spin" />
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="glass-card p-12 rounded-card border border-white/10 text-center bg-[#0F1424]/40">
            <CheckCircle2 className="w-12 h-12 text-brand-emerald mx-auto mb-4" />
            <h4 className="text-md font-bold text-white">All submissions evaluated</h4>
            <p className="text-xs text-gray-500 max-w-xs mx-auto mt-2 leading-relaxed">
              No pending student answer sheets found matching your filters.
            </p>
          </div>
        ) : (
          <div className="glass-card rounded-card border border-white/10 overflow-hidden bg-[#0F1424]/20 shadow-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 font-extrabold uppercase text-gray-400">
                  <th className="p-4">Student</th>
                  <th className="p-4">Subject</th>
                  <th className="p-4">Exam</th>
                  <th className="p-4">Uploaded At</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredSubmissions.map(sub => {
                  const isPub = sub.isPublished || sub.status === 'released';
                  return (
                    <tr key={sub.id} className="hover:bg-white/5 transition-all group">
                      <td className="p-4 font-semibold">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-gray-500" />
                          <div>
                            <span className="text-white block">{sub.studentName}</span>
                            <span className="text-[10px] text-gray-500">{sub.studentId}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-semibold text-brand-blue">{sub.subjectId}</td>
                      <td className="p-4 text-gray-300 font-semibold flex items-center gap-2">
                        <span>{sub.examTitle || 'Midterm Examination'}</span>
                        <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${
                          sub.evaluationType === 'omr' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-pink-500/10 border-pink-500/20 text-pink-400'
                        }`}>
                          {sub.evaluationType === 'omr' ? 'OMR' : 'Descriptive'}
                        </span>
                      </td>
                      <td className="p-4 text-gray-400 font-semibold">{sub.submissionDate}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          isPub
                            ? 'bg-brand-emerald/10 border-brand-emerald/20 text-brand-emerald' 
                            : sub.status === 'grading_failed'
                              ? 'bg-status-error/10 border-status-error/20 text-status-error'
                              : 'bg-status-warning/10 border-status-warning/20 text-status-warning'
                        }`}>
                          {isPub ? 'Released' : sub.status === 'grading_failed' ? 'Manual Review Required' : 'Pending Review'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => navigate(`/professor/evaluation?submissionId=${sub.id}`)}
                          className="px-4 py-1.5 bg-brand-gradient hover:opacity-90 text-white font-bold rounded-lg transition-all text-[11px] inline-flex items-center gap-1"
                        >
                          <span>Review</span>
                          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // ==========================================================================
  // VIEW 2: Splitted evaluation review view
  // ==========================================================================
  const currentAnsIdx = activeQuestion - 1;
  const currentAns = paper?.answers ? paper.answers[currentAnsIdx] : null;

  return (
    <div className="flex flex-col gap-6 pb-10">
      
      {/* Header Controls */}
      <div className="flex justify-between items-center bg-[#0F1424]/40 p-4 border border-white/10 rounded-xl relative">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-brand-gradient" />
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/professor/evaluation')}
            className="text-gray-400 hover:text-white transition-colors text-xs font-bold"
          >
            ← Back to Queue
          </button>
          <div className="h-4 w-[1px] bg-white/10" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-brand-blue" />
            <span>Grading Review: {paper?.studentName} ({paper?.subjectId})</span>
          </h2>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {autosaving ? (
            <span className="text-gray-500 font-bold flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Autosaving draft...</span>
            </span>
          ) : (
            <span className="text-brand-emerald font-bold flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              <span>Draft saved</span>
            </span>
          )}

          <button
            onClick={handleReleaseResults}
            disabled={releasing}
            className="px-4 py-2 bg-brand-gradient text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{releasing ? 'Releasing...' : 'Release Result'}</span>
          </button>
        </div>
      </div>

      {reviewLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="w-8 h-8 text-brand-purple animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* LEFT PANEL: Zoomable Scanned Answer Sheet Doc Viewer (col-span-6) */}
          <div className="lg:col-span-6 glass-card p-4 rounded-card border border-white/10 bg-[#0F1424]/40 flex flex-col gap-4 h-[650px] overflow-hidden">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <span className="text-xs text-white font-bold uppercase tracking-wider flex items-center gap-1">
                <FileText className="w-4 h-4 text-brand-purple" />
                <span>Uploaded Exam Script Scan</span>
              </span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setZoomLevel(prev => Math.max(50, prev - 15))}
                  className="p-1 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] text-gray-500 font-bold">{zoomLevel}%</span>
                <button 
                  onClick={() => setZoomLevel(prev => Math.min(200, prev + 15))}
                  className="p-1 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-black/40 border border-white/5 rounded-xl flex items-center justify-center relative select-none">
              <img 
                src={(paper?.imagePath ? paper.imagePath.split(',')[activeImageIdx] : '') || '/uploads/default-script.jpg'} 
                alt="Student Exam Scan script" 
                style={{ width: `${zoomLevel}%`, transform: 'scale(1)', transition: 'width 0.15s ease-out' }}
                className="max-h-full object-contain"
                onError={(e) => {
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=1000';
                }}
              />
            </div>

            {paper?.imagePath && paper.imagePath.split(',').length > 1 && (
              <div className="flex items-center justify-between bg-white/5 p-2 rounded-xl border border-white/5 text-xs">
                <button
                  disabled={activeImageIdx === 0}
                  onClick={() => setActiveImageIdx(prev => Math.max(0, prev - 1))}
                  className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-white disabled:opacity-30 text-[11px] font-bold"
                >
                  Previous Page
                </button>
                <span className="text-gray-400 font-bold">
                  Page {activeImageIdx + 1} of {paper.imagePath.split(',').length}
                </span>
                <button
                  disabled={activeImageIdx === paper.imagePath.split(',').length - 1}
                  onClick={() => setActiveImageIdx(prev => Math.min(paper.imagePath.split(',').length - 1, prev + 1))}
                  className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-white disabled:opacity-30 text-[11px] font-bold"
                >
                  Next Page
                </button>
              </div>
            )}
          </div>

          {/* RIGHT PANEL: Question Selector & AI Evaluator (col-span-6) */}
          <div className="lg:col-span-6 flex flex-col gap-6 h-[650px] overflow-y-auto pr-1">
            
            {paper?.evaluationType === 'omr' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start w-full">
                {/* Left/Middle: OMR Bubble Grid Review (col-span-2) */}
                <div className="md:col-span-2 glass-card p-6 rounded-card border border-white/10 bg-[#0F1424]/40 flex flex-col gap-5 h-[520px]">
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-indigo-400" />
                      <span>OMR Bubble Grid Review</span>
                    </h4>
                    <div className="text-[10px] text-gray-500 font-bold uppercase">
                      Click options to override
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-1 space-y-3">
                    {paper?.answers?.map((ans: any) => {
                      const statusColors: Record<string, string> = {
                        correct: 'bg-brand-emerald/10 border-brand-emerald/20 text-brand-emerald',
                        wrong: 'bg-status-error/10 border-status-error/20 text-status-error',
                        blank: 'bg-gray-500/10 border-gray-500/20 text-gray-400',
                        multiple_marked: 'bg-status-warning/10 border-status-warning/20 text-status-warning',
                        invalid: 'bg-status-warning/10 border-status-warning/20 text-status-warning'
                      };

                      return (
                        <div 
                          key={ans.questionNo}
                          className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl p-3 hover:bg-white/10 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-400 font-sans">
                              Q{ans.questionNo}
                            </span>
                            
                            <div className="flex flex-col gap-0.5">
                              <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border ${statusColors[ans.status] || 'bg-gray-500/10 border-gray-500/20 text-gray-400'}`}>
                                {ans.status === 'multiple_marked' ? 'Multiple' : ans.status}
                              </span>
                              <span className="text-[9px] text-gray-500 font-semibold">
                                Correct: {ans.correctOption || 'A'}
                              </span>
                            </div>
                          </div>

                          {/* Selectable Options buttons */}
                          <div className="flex items-center gap-1.5">
                            {['A', 'B', 'C', 'D'].map(opt => {
                              const isStudentSelected = ans.detectedOption === opt;
                              const isCorrect = ans.correctOption === opt;
                              
                              let btnStyle = 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white';
                              if (isStudentSelected) {
                                btnStyle = isCorrect
                                  ? 'bg-brand-emerald/20 border-brand-emerald text-brand-emerald font-bold'
                                  : 'bg-status-error/20 border-status-error text-status-error font-bold';
                              } else if (isCorrect) {
                                btnStyle = 'border-brand-emerald/30 border-dashed text-brand-emerald/80';
                              }

                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => handleOMROverride(ans.questionNo, opt)}
                                  className={`w-8 h-8 rounded-full text-xs font-bold border transition-all ${btnStyle}`}
                                >
                                  {opt}
                                </button>
                              );
                            })}

                            {/* Blank option button */}
                            <button
                              type="button"
                              onClick={() => handleOMROverride(ans.questionNo, '')}
                              className={`px-2.5 py-1.5 rounded-lg text-[9px] font-bold border transition-all ${
                                ans.detectedOption === ''
                                  ? 'bg-gray-600 border-gray-400 text-white'
                                  : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
                              }`}
                            >
                              Blank
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right Column: Live stats (col-span-1) */}
                <div className="md:col-span-1 flex flex-col gap-6 w-full">
                  {/* Stats Summary Card */}
                  <div className="glass-card p-5 rounded-card border border-white/10 bg-[#0F1424]/40 flex flex-col items-center justify-center text-center gap-4">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">OMR Running Score</span>
                    <div className="w-24 h-24 rounded-full border-4 border-indigo-500/20 flex flex-col items-center justify-center relative">
                      <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" style={{ animationDuration: '3s' }} />
                      <span className="text-2xl font-extrabold text-white">{paper.totalScore}</span>
                      <span className="text-[9px] text-gray-500 font-bold uppercase">Marks</span>
                    </div>

                    <div className="w-full space-y-2 mt-2">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-gray-400">Accuracy:</span>
                        <span className="text-brand-blue">{getOMRStats().accuracy}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-blue" style={{ width: `${getOMRStats().accuracy}%` }} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 w-full mt-2 text-left">
                      <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                        <span className="text-[8px] text-brand-emerald font-bold uppercase block">Correct</span>
                        <span className="text-sm font-extrabold text-brand-emerald">{getOMRStats().correct}</span>
                      </div>
                      <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                        <span className="text-[8px] text-status-error font-bold uppercase block">Wrong</span>
                        <span className="text-sm font-extrabold text-status-error">{getOMRStats().wrong}</span>
                      </div>
                      <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                        <span className="text-[8px] text-gray-400 font-bold uppercase block">Blank</span>
                        <span className="text-sm font-extrabold text-gray-400">{getOMRStats().blank}</span>
                      </div>
                      <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                        <span className="text-[8px] text-status-warning font-bold uppercase block">Multiple</span>
                        <span className="text-sm font-extrabold text-status-warning">{getOMRStats().multiple}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Stepper question selector */}
                <div className="glass-card p-4 rounded-card border border-white/10 bg-[#0F1424]/40 flex justify-between items-center gap-2">
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-wider shrink-0">Questions:</span>
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    {paper?.answers?.map((ans: any, idx: number) => {
                      const qNo = idx + 1;
                      const isActive = activeQuestion === qNo;
                      return (
                        <button
                          key={ans.questionId}
                          onClick={() => setActiveQuestion(qNo)}
                          className={`w-7 h-7 rounded-lg text-xs font-bold transition-all border shrink-0 ${
                            isActive 
                              ? 'bg-brand-gradient border-brand-blue text-white shadow shadow-brand-blue/30 scale-105' 
                              : ans.isUnmatched 
                                ? 'bg-status-warning/20 border-status-warning/30 text-status-warning'
                                : ans.isEvaluated
                                  ? 'bg-brand-emerald/10 border-brand-emerald/20 text-brand-emerald'
                                  : 'bg-white/5 border-white/5 text-gray-500'
                          }`}
                        >
                          {ans.questionNo}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Current question card */}
                {currentAns && (
                  <div className="glass-card p-6 rounded-card border border-white/10 bg-[#0F1424]/40 flex flex-col gap-5">
                    
                    {/* Discrepancy Alert */}
                    {currentAns.isDiscrepancyFlagged && (
                      <div className="bg-status-warning/10 border border-status-warning/30 rounded-xl p-3.5 text-xs text-status-warning flex items-start gap-2.5">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <div>
                          <h5 className="font-bold mb-0.5">High Grading Discrepancy Flagged</h5>
                          <p className="leading-relaxed opacity-90">
                            The local text similarity match and the Gemini marks awarded differ by more than 30%. Please audit the transcripts and manually override if necessary.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Unmatched Question Alert */}
                    {currentAns.isUnmatched && (
                      <div className="bg-status-error/10 border border-status-error/30 rounded-xl p-3.5 text-xs text-status-error flex items-start gap-2.5">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <div>
                          <h5 className="font-bold mb-0.5">Unmatched Student Answer</h5>
                          <p className="leading-relaxed opacity-90">
                            This answer block could not be matched automatically to a reference question. Re-assign it below to merge grading.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-4 h-4 text-brand-purple" />
                        <span>Question {currentAns.questionNo} Evaluation Review</span>
                      </h4>
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[9px] text-gray-500 font-bold uppercase">
                        OCR Confidence: {Math.round(currentAns.ocrConfidence)}%
                      </span>
                    </div>

                    {/* Question text block */}
                    <div className="p-3 bg-white/5 border border-white/5 rounded-xl leading-relaxed text-xs">
                      <span className="block text-[9px] text-[#A855F7] font-bold uppercase mb-1">Question Text</span>
                      <p className="text-gray-200 font-bold">"{currentAns.questionText || 'No question text associated.'}"</p>
                    </div>

                    {/* Unmatched re-assignment dropdown */}
                    {currentAns.isUnmatched && (
                      <div className="p-3 bg-[#0A0D1A]/60 border border-white/5 rounded-xl text-xs flex items-center justify-between gap-3">
                        <span className="text-gray-400 font-bold">Assign to Reference:</span>
                        <select
                          value={currentAns.questionNo}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (val) {
                              handleQuestionNoChange(currentAnsIdx, val);
                            }
                          }}
                          className="px-3 py-1.5 bg-[#0F1424] border border-white/10 rounded-lg text-xs text-white outline-none focus:border-brand-purple"
                        >
                          <option value={currentAns.questionNo}>Unassigned / Unmatched</option>
                          {paper?.answers?.filter((a: any) => !a.isUnmatched).map((a: any) => (
                            <option key={a.questionNo} value={a.questionNo}>Question {a.questionNo}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Side-by-Side Reference & Student Answer Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      
                      {/* Left Column: Reference (Blue Accents) */}
                      <div className="p-3 bg-brand-blue/5 border border-brand-blue/10 rounded-xl leading-relaxed flex flex-col justify-between min-h-[120px]">
                        <div>
                          <span className="block text-[9px] text-brand-blue font-bold uppercase mb-1">Reference / Model Answer</span>
                          <p className="text-gray-300 italic">"{currentAns.referenceAnswer || 'No model answer key configured.'}"</p>
                        </div>
                        <div className="text-[9px] text-gray-500 mt-2 font-bold uppercase">
                          Max Marks: {currentAns.maxMarks || 0}
                        </div>
                      </div>

                      {/* Right Column: Student Transcript (Purple Accents) */}
                      <div className="p-3 bg-brand-purple/5 border border-brand-purple/10 rounded-xl leading-relaxed flex flex-col justify-between min-h-[120px]">
                        <div>
                          <span className="block text-[9px] text-brand-purple font-bold uppercase mb-1">Student Answer Transcript</span>
                          <p className="text-gray-200 italic">"{currentAns.studentAnswer || 'No transcribed student text detected.'}"</p>
                        </div>
                        <div className="text-[9px] text-gray-500 mt-2 font-bold uppercase">
                          OCR Confidence: {Math.round(currentAns.ocrConfidence)}%
                        </div>
                      </div>

                    </div>

                    {/* Concepts & Strengths/Weaknesses checklists */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
                      
                      {/* Reference Core Concepts */}
                      <div className="p-3 bg-[#0F172A]/80 border border-white/5 rounded-xl text-xs">
                        <span className="block text-[9px] text-brand-blue font-bold uppercase mb-2">Reference Core Concepts</span>
                        {currentAns.conceptsCovered && currentAns.conceptsCovered.map((c: string, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-brand-emerald font-semibold mb-1">
                            <Check className="w-3.5 h-3.5 text-brand-emerald" />
                            <span>{c}</span>
                          </div>
                        ))}
                        {currentAns.missingConcepts && currentAns.missingConcepts.map((c: string, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-status-error font-semibold mb-1">
                            <AlertCircle className="w-3.5 h-3.5 text-status-error" />
                            <span>{c} (Missing)</span>
                          </div>
                        ))}
                        {(!currentAns.conceptsCovered || currentAns.conceptsCovered.length === 0) && 
                         (!currentAns.missingConcepts || currentAns.missingConcepts.length === 0) && (
                          <span className="text-gray-500 italic text-[11px]">No concept annotations available.</span>
                        )}
                      </div>

                      {/* Strengths & Improvements */}
                      <div className="p-3 bg-[#1B122A]/80 border border-white/5 rounded-xl text-xs">
                        <span className="block text-[9px] text-brand-purple font-bold uppercase mb-2">Strengths & Improvements</span>
                        {currentAns.strongPoints && (
                          <div className="mb-2">
                            <span className="text-[10px] text-brand-emerald font-bold uppercase block">Strong Points</span>
                            <p className="text-gray-300">{currentAns.strongPoints}</p>
                          </div>
                        )}
                        {currentAns.weakPoints && (
                          <div className="mb-2">
                            <span className="text-[10px] text-status-error font-bold uppercase block">Weak Points</span>
                            <p className="text-gray-300">{currentAns.weakPoints}</p>
                          </div>
                        )}
                        {currentAns.suggestedImprovements && (
                          <div>
                            <span className="text-[10px] text-brand-blue font-bold uppercase block">Suggested Improvements</span>
                            <p className="text-gray-300">{currentAns.suggestedImprovements}</p>
                          </div>
                        )}
                        {!currentAns.strongPoints && !currentAns.weakPoints && !currentAns.suggestedImprovements && (
                          <span className="text-gray-500 italic text-[11px]">No critique notes available.</span>
                        )}
                      </div>

                    </div>

                    {/* Mark overrides & overrides */}
                    <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex flex-col items-center justify-center text-center">
                        <span className="text-[9px] text-gray-500 font-bold uppercase mb-1">AI Suggestion</span>
                        <div className="text-lg font-extrabold text-brand-blue">
                          {currentAns.score} <span className="text-gray-500 text-xs">/ {currentAns.maxMarks || 10}</span>
                        </div>
                      </div>

                      <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex flex-col items-center justify-center text-center">
                        <span className="text-[9px] text-brand-purple font-bold uppercase mb-1">Professor Marks Override</span>
                        <input 
                          type="number"
                          min="0"
                          max={currentAns.maxMarks || 10}
                          step="0.5"
                          value={currentAns.score}
                          onChange={(e) => handleScoreChange(currentAnsIdx, parseFloat(e.target.value) || 0)}
                          className="w-16 text-center bg-black/40 border border-white/10 rounded-lg text-white font-extrabold text-sm py-1 focus:outline-none focus:border-brand-purple"
                        />
                      </div>
                    </div>

                    {/* Accept AI marks */}
                    <button
                      onClick={() => handleAcceptAI(currentAnsIdx)}
                      className="w-full py-2 bg-brand-gradient hover:opacity-90 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Accept AI Marks & Proceed</span>
                    </button>

                    {/* Feedback textarea */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Explainable AI Feedback</label>
                      <textarea
                        value={currentAns.aiFeedback}
                        onChange={(e) => handleFeedbackChange(currentAnsIdx, e.target.value)}
                        placeholder="Add manual evaluation details or critique..."
                        className="w-full h-24 bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-brand-blue/50 font-semibold"
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Overall evaluator notes */}
            <div className="glass-card p-6 rounded-card border border-white/10 bg-[#0F1424]/40 flex flex-col gap-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Overall Evaluator Notes</h4>
              <textarea
                value={evaluatorNotes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Write exam summarizing remarks or final class feedback..."
                className="w-full h-20 bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-brand-blue/50 font-semibold"
              />
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
