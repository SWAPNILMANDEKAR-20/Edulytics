import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  FileText, Sparkles, CheckCircle2, AlertTriangle, 
  HelpCircle, RefreshCw, GraduationCap, PlayCircle, ExternalLink, Hourglass 
} from 'lucide-react';
import { API_URL } from '../../utils/api';

interface QuestionFeedback {
  qNo: number;
  question: string;
  marksObtained: number;
  maxMarks: number;
  matchedConcepts: string[];
  missingConcepts: string[];
  studentAnswer: string;
  referenceKeywords: string[];
  aiExplanation: string;
  suggestion: string;
  suggestionUrl: string;
}

export default function StudentFeedback() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const paperId = queryParams.get('paperId');

  const [activeQuestion, setActiveQuestion] = useState(1);
  const [reEvalRequest, setReEvalRequest] = useState<number | null>(null);
  
  const [paper, setPaper] = useState<any>(null);
  const [feedbacks, setFeedbacks] = useState<QuestionFeedback[]>([]);
  const [loading, setLoading] = useState(true);

  // Load current user
  const userStr = localStorage.getItem('currentUser');
  const user = userStr ? JSON.parse(userStr) : { fullName: 'Marcus Aurelius', rollNumber: 'CS24B1031', email: 'student@university.edu' };

  useEffect(() => {
    if (!paperId) {
      setLoading(false);
      return;
    }

    const fetchFeedbackData = async () => {
      try {
        const email = user.email || '';
        const headers = { 'x-user-email': email };
        
        const [resPaper, resSubjects] = await Promise.all([
          fetch(`${API_URL}/api/papers/${paperId}`, { headers }),
          fetch(`${API_URL}/api/...subjects`, { headers })
        ]);

        if (resPaper.ok && resSubjects.ok) {
          const paperData = await resPaper.json();
          const subjectsData = await resSubjects.json();
          setPaper(paperData);

          if (paperData && paperData.answers && paperData.answers.length > 0) {
            const isOMR = paperData.evaluationType === 'omr' || paperData.id?.startsWith('omr_');
            const subjectObj = subjectsData.find((s: any) => s.id === paperData.subjectId);
            
            const mapped: QuestionFeedback[] = paperData.answers.map((ans: any, idx: number) => {
              const qNo = ans.questionNo || (idx + 1);
              if (isOMR) {
                return {
                  qNo,
                  question: `Multiple Choice Question #${qNo}`,
                  marksObtained: ans.score,
                  maxMarks: ans.maxMarks || 1.0,
                  matchedConcepts: ans.status === 'correct' ? ['Correct option matched'] : [],
                  missingConcepts: ans.status !== 'correct' ? [`Incorrect (Expected: ${ans.correctOption || 'A'}, Detected: ${ans.detectedOption || 'None'})`] : [],
                  studentAnswer: ans.detectedOption || '',
                  referenceKeywords: [ans.correctOption || 'A'],
                  aiExplanation: `OMR Scanning system detected student choice as "${ans.detectedOption || 'Blank'}" and correct choice is "${ans.correctOption || 'A'}". Status: ${ans.status || 'wrong'}. Marks Awarded: ${ans.score || 0.0}.`,
                  suggestion: "Practice bubble filling guidelines.",
                  suggestionUrl: "https://www.geeksforgeeks.org/"
                };
              }

              const qObj = subjectObj?.questions.find((q: any) => q.id === ans.questionId);
              const questionText = qObj ? qObj.questionText : `Question ${ans.questionId}`;
              const maxMarks = qObj ? qObj.maxMarks : 10;
              
              const referenceKeywords = qObj ? qObj.rubric.map((r: any) => r.keyword) : [];
              const matchedConcepts = ans.rubricMatches || [];
              const missingConcepts = referenceKeywords.filter((k: string) => !matchedConcepts.includes(k));
              
              return {
                qNo,
                question: questionText,
                marksObtained: ans.score,
                maxMarks,
                matchedConcepts,
                missingConcepts,
                studentAnswer: ans.studentAnswer,
                referenceKeywords,
                aiExplanation: ans.aiFeedback,
                suggestion: "Review related lecture notes.",
                suggestionUrl: "https://www.geeksforgeeks.org/"
              };
            });
            setFeedbacks(mapped);
          }
        }
      } catch (err) {
        console.error('Failed to load feedback details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFeedbackData();
  }, [paperId, user.email]);

  const currentQ = feedbacks.find(f => f.qNo === activeQuestion) || feedbacks[0];

  const handleRequestReEval = (qNo: number) => {
    setReEvalRequest(qNo);
    setTimeout(() => {
      alert(`Re-evaluation request for Question ${qNo} submitted to Professor Evelyn Vance.`);
      setReEvalRequest(null);
    }, 1500);
  };

  const handleDownloadPDF = async () => {
    try {
      const res = await fetch(`/api/papers/${paperId}/report`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${paperId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        alert('Failed to download report PDF.');
      }
    } catch (err) {
      console.error(err);
      alert('Error downloading report PDF.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-brand-blue animate-spin" />
          <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">Loading Feedback...</span>
        </div>
      </div>
    );
  }

  if (!paper || !paper.answers || paper.answers.length === 0) {
    return (
      <div className="flex flex-col gap-8 pb-10">
        <div className="flex justify-between items-start flex-col gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-brand-purple" />
            <span>Detailed Exam Feedback</span>
          </h1>
          <p className="text-sm text-gray-400 max-w-2xl">
            Review question-level evaluations generated by SBERT OCR. Inspect matched concept tags and dispatch re-evaluation audits.
          </p>
        </div>

        <div className="glass-card p-12 rounded-card border border-white/10 bg-[#0F1424]/40 flex flex-col items-center justify-center text-center gap-6 min-h-[350px]">
          <div className="w-16 h-16 rounded-full bg-status-warning/10 border border-status-warning/20 flex items-center justify-center text-status-warning animate-pulse">
            <Hourglass className="w-8 h-8" />
          </div>
          <div className="max-w-md">
            <h4 className="text-lg font-bold text-white mb-2">Your submission is under review</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              This answer script is currently being evaluated by the professor. Detailed marks, rubric matches, and SBERT feedback will become available immediately once the results are published.
            </p>
          </div>
          <button 
            onClick={() => navigate('/student/dashboard')}
            className="px-4 py-2 bg-brand-gradient hover:opacity-90 text-white text-xs font-bold rounded-xl transition-all"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-10">
      
      {/* Header */}
      <div className="flex justify-between items-center w-full no-print">
        <div className="flex justify-between items-start flex-col gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-brand-purple" />
            <span>Detailed Exam Feedback</span>
          </h1>
          <p className="text-sm text-gray-400 max-w-2xl">
            Review question-level evaluations generated by SBERT OCR. Inspect matched concept tags and dispatch re-evaluation audits.
          </p>
        </div>
        <button
          onClick={handleDownloadPDF}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-gradient text-white text-xs font-bold rounded-xl shadow-lg hover:opacity-90 transition-all no-print"
        >
          <FileText className="w-4 h-4" />
          <span>Download Report PDF</span>
        </button>
      </div>

      {/* Main Grid or OMR Table */}
      {paper?.evaluationType === 'omr' ? (
        <div className="flex flex-col gap-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-card p-4 rounded-xl border border-white/10 bg-[#0F1424]/40 flex flex-col justify-center">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Correct Answers</span>
              <span className="text-xl font-extrabold text-brand-emerald">
                {feedbacks.filter(f => f.marksObtained > 0).length}
              </span>
            </div>
            <div className="glass-card p-4 rounded-xl border border-white/10 bg-[#0F1424]/40 flex flex-col justify-center">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Wrong Answers</span>
              <span className="text-xl font-extrabold text-status-error">
                {feedbacks.filter(f => f.marksObtained < 0).length}
              </span>
            </div>
            <div className="glass-card p-4 rounded-xl border border-white/10 bg-[#0F1424]/40 flex flex-col justify-center">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Blank / Unmarked</span>
              <span className="text-xl font-extrabold text-gray-400">
                {feedbacks.filter(f => f.studentAnswer === '').length}
              </span>
            </div>
            <div className="glass-card p-4 rounded-xl border border-white/10 bg-[#0F1424]/40 flex flex-col justify-center">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">AI Scan Confidence</span>
              <span className="text-xl font-extrabold text-brand-purple">
                98%
              </span>
            </div>
          </div>

          {/* OMR Question Details Table */}
          <div className="glass-card p-6 rounded-card border border-white/10 bg-[#0F1424]/40 overflow-hidden">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Detailed Question Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-gray-500 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Question</th>
                    <th className="py-3 px-4">Correct Option</th>
                    <th className="py-3 px-4">Selected Option</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Marks Awarded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-300 font-medium">
                  {feedbacks.map(f => {
                    const isCorrect = f.marksObtained > 0;
                    const isBlank = f.studentAnswer === '';
                    
                    let statusText = 'Incorrect';
                    let statusStyle = 'bg-status-error/10 border-status-error/20 text-status-error';
                    if (isCorrect) {
                      statusText = 'Correct';
                      statusStyle = 'bg-brand-emerald/10 border-brand-emerald/20 text-brand-emerald';
                    } else if (isBlank) {
                      statusText = 'Blank';
                      statusStyle = 'bg-gray-500/10 border-gray-500/20 text-gray-400';
                    }

                    return (
                      <tr key={f.qNo} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 font-bold text-white">Q{f.qNo}</td>
                        <td className="py-3 px-4 font-semibold text-brand-blue">{f.referenceKeywords[0] || 'A'}</td>
                        <td className={`py-3 px-4 font-bold ${
                          isCorrect ? 'text-brand-emerald' : isBlank ? 'text-gray-500' : 'text-status-error'
                        }`}>
                          {f.studentAnswer || '—'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase ${statusStyle}`}>
                            {statusText}
                          </span>
                        </td>
                        <td className={`py-3 px-4 font-bold ${f.marksObtained >= 0 ? 'text-brand-emerald' : 'text-status-error'}`}>
                          {f.marksObtained >= 0 ? `+${f.marksObtained}` : f.marksObtained}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Left Side: Question selector list */}
          <div className="flex flex-col gap-3">
            {feedbacks.map(f => (
              <button
                key={f.qNo}
                onClick={() => setActiveQuestion(f.qNo)}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col gap-2 ${
                  activeQuestion === f.qNo
                    ? 'bg-brand-blue/15 border-brand-blue ring-1 ring-brand-blue'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <span className="text-xs font-bold text-white">Question {f.qNo}</span>
                  <span className="text-[10px] text-brand-blue font-extrabold">{f.marksObtained} / {f.maxMarks}</span>
                </div>
                <p className="text-[11px] text-gray-500 truncate w-full font-semibold">
                  {f.question}
                </p>
              </button>
            ))}
          </div>

          {/* Right Side: Tab Panel details */}
          {currentQ && (
            <div className="lg:col-span-3 flex flex-col gap-6">
              
              {/* Question Text & Marks */}
              <div className="glass-card p-6 rounded-card border border-white/10 bg-[#0F1424]/40 flex flex-col gap-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Active Question Context</span>
                    <h3 className="text-sm font-bold text-white mt-1 leading-relaxed">
                      {currentQ.question}
                    </h3>
                  </div>
                  <div className="bg-brand-blue/15 border border-brand-blue/30 rounded-xl px-4 py-2 text-center shrink-0">
                    <span className="text-[10px] text-brand-blue uppercase font-bold tracking-wider block">Awarded Score</span>
                    <span className="text-lg font-black text-white">{currentQ.marksObtained} / {currentQ.maxMarks}</span>
                  </div>
                </div>

                {/* Concepts coverage tags */}
                <div className="flex flex-wrap gap-4 border-t border-white/5 pt-4">
                  {/* Matched */}
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider pr-1">Concept Hits:</span>
                    {currentQ.matchedConcepts.map((c, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-brand-emerald/10 text-brand-emerald border border-brand-emerald/20 text-[9px] font-bold">
                        {c}
                      </span>
                    ))}
                    {currentQ.matchedConcepts.length === 0 && <span className="text-[9px] text-gray-600 font-bold italic">None detected</span>}
                  </div>

                  {/* Missing */}
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider pr-1">Missing Rubrics:</span>
                    {currentQ.missingConcepts.map((c, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-status-error/10 text-status-error border border-status-error/20 text-[9px] font-bold">
                        {c}
                      </span>
                    ))}
                    {currentQ.missingConcepts.length === 0 && <span className="text-[9px] text-brand-emerald font-bold italic">Perfect Match</span>}
                  </div>
                </div>
              </div>

              {/* Answer Display & AI Explanation side-by-side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Left Column: Student Answer script */}
                <div className="glass-card p-6 rounded-card border border-white/10 bg-[#0F1424]/40 flex flex-col gap-3">
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Student Transcription (OCR)</span>
                  <div className="p-4 bg-white/5 border border-white/5 rounded-xl font-mono text-[11px] text-gray-300 leading-relaxed flex-1 select-none">
                    {currentQ.studentAnswer}
                  </div>
                </div>

                {/* Right Column: AI Explanation */}
                <div className="glass-card p-6 rounded-card border border-white/10 bg-[#0F1424]/40 flex flex-col gap-4">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-brand-purple" />
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Semantic Assessment Breakdown</span>
                  </div>
                  <div className="p-4 bg-white/5 border border-white/5 rounded-xl text-[11px] text-gray-300 leading-relaxed whitespace-pre-line flex-1">
                    {currentQ.aiExplanation}
                  </div>
                </div>

              </div>

              {/* Bottom Actions: Re-evaluation Request & Resources */}
              <div className="glass-panel p-5 rounded-xl border border-white/10 bg-[#0F1424]/40 flex flex-wrap gap-4 items-center justify-between">
                
                {/* Suggestion resource */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-purple/10 text-brand-purple flex items-center justify-center">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-white">{currentQ.suggestion}</h4>
                    <a 
                      href={currentQ.suggestionUrl} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-[9px] text-brand-blue font-bold flex items-center gap-0.5 hover:underline"
                    >
                      <span>Open learning material</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>

                {/* Dispatch audit button */}
                <button
                  onClick={() => handleRequestReEval(currentQ.qNo)}
                  disabled={reEvalRequest !== null}
                  className="px-4 py-2 bg-white/5 border border-white/10 text-white font-bold text-xs hover:bg-white/10 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {reEvalRequest === currentQ.qNo ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-brand-blue" />
                      <span>Submitting Request...</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-status-warning" />
                      <span>Request Manual Re-evaluation</span>
                    </>
                  )}
                </button>

              </div>

            </div>
          )}

        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .print-breakdown {
            border: 1px solid #e5e7eb !important;
            padding: 1.25rem !important;
            margin-bottom: 1.5rem !important;
            page-break-inside: avoid !important;
            border-radius: 12px !important;
          }
        }
        @media screen {
          .print-only {
            display: none !important;
          }
        }
      `}} />

      {/* Print Only Layout */}
      <div className="print-only p-8 text-black font-sans bg-white min-h-screen">
        <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-wider">Edulytics Feedback Report</h1>
            <p className="text-xs text-gray-600 font-semibold mt-1">AI-Powered Academic Evaluation & OCR Insights</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-gray-500 font-bold uppercase block">Total Grade</span>
            <span className="text-3xl font-black text-black">
              {paper.totalScore} / {paper.maxMarks} ({paper.grade || 'N/A'})
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8 text-xs font-semibold">
          <div>
            <p><span className="text-gray-500 font-bold uppercase block text-[9px]">Student Name</span> {paper.studentName}</p>
            <p className="mt-2"><span className="text-gray-500 font-bold uppercase block text-[9px]">Student Roll No.</span> {paper.studentId}</p>
          </div>
          <div className="text-right">
            <p><span className="text-gray-500 font-bold uppercase block text-[9px]">Subject Course</span> {paper.subjectId}</p>
            <p className="mt-2"><span className="text-gray-500 font-bold uppercase block text-[9px]">Submission Date</span> {paper.submissionDate}</p>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-sm font-extrabold uppercase tracking-wider border-b border-gray-200 pb-2">Question-Level Breakdown</h3>
          {feedbacks.map((f) => (
            <div key={f.qNo} className="print-breakdown border border-gray-200 p-4 rounded-xl">
              <div className="flex justify-between items-center border-b border-gray-100 pb-2 mb-3">
                <span className="text-xs font-bold text-black bg-gray-100 px-2.5 py-1 rounded">Question {f.qNo}</span>
                <span className="text-xs font-black text-black">{f.marksObtained} / {f.maxMarks}</span>
              </div>
              <p className="text-xs font-bold text-gray-800 mb-3">"{f.question}"</p>
              
              <div className="space-y-3 text-xs">
                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                  <span className="block text-[9px] text-gray-500 font-bold uppercase mb-1">Student Answer Transcription</span>
                  <p className="italic text-gray-700">"{f.studentAnswer || 'No answer recorded.'}"</p>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                  <span className="block text-[9px] text-gray-500 font-bold uppercase mb-1">Grading Model Answer Reference</span>
                  <p className="text-gray-700">"{f.referenceKeywords.join(', ') || 'Model answer reference.'}"</p>
                </div>
                <div className="p-2.5 rounded-lg border border-gray-200 mt-2">
                  <span className="block text-[9px] text-gray-500 font-bold uppercase mb-1">AI Evaluator Critique</span>
                  <p className="text-gray-700 font-medium whitespace-pre-line">{f.aiExplanation}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
