import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, RefreshCw, FileText } from 'lucide-react';

export default function StudentHistory() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load current user
  const userStr = localStorage.getItem('currentUser');
  const user = userStr ? JSON.parse(userStr) : { fullName: 'Marcus Aurelius', rollNumber: 'CS24B1031', email: 'student@university.edu' };

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const roll = user.rollNumber || '';
        const email = user.email || '';
        const headers = { 'x-user-email': email };
        
        const [res1, res2] = await Promise.all([
          fetch(`/api/papers?studentId=${encodeURIComponent(roll)}`, { headers }),
          fetch(`/api/omr/papers?studentId=${encodeURIComponent(roll)}`, { headers })
        ]);
        
        if (res1.ok && res2.ok) {
          const papers = await res1.json();
          const omrPapers = await res2.json();
          
          const mappedPapers = papers.map((p: any) => {
            const isPub = p.answers && p.answers.length > 0;
            return {
              id: p.id,
              name: p.subjectId === 'CS-301' ? 'Data Structures Exam Script' : p.subjectId === 'PHY-102' ? 'Classical Mechanics Exam Script' : p.subjectId === 'BIO-205' ? 'Cell Biology Exam Script' : `${p.subjectId} Exam Script`,
              subject: p.subjectId,
              date: p.submissionDate,
              status: isPub ? 'Evaluated' : 'Pending Review',
              score: isPub ? `${p.totalScore} / ${p.maxMarks}` : 'Under Review',
              isPublished: isPub
            };
          });

          const mappedOMR = omrPapers.map((p: any) => {
            const isPub = !!p.evaluation;
            return {
              id: p.id,
              name: p.templateId === 'OMR-101' ? 'Biology Midterm MCQ Sheet' : p.templateId === 'OMR-102' ? 'Chemistry Final MCQ Sheet' : `${p.templateId} MCQ Sheet`,
              subject: p.templateId,
              date: p.submissionDate,
              status: isPub ? 'Evaluated' : 'Pending Review',
              score: isPub ? `${p.evaluation.totalScore} / ${p.evaluation.maxScore}` : 'Under Review',
              isPublished: isPub
            };
          });

          setSubmissions([...mappedPapers, ...mappedOMR].sort((a, b) => b.date.localeCompare(a.date)));
        }
      } catch (err) {
        console.error('Failed to load submission history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [user.rollNumber, user.email]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-brand-blue animate-spin" />
          <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">Loading History...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-10 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="flex justify-between items-start flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-theme-text flex items-center gap-3">
          <ClipboardList className="w-8 h-8 text-theme-primary" />
          <span>Submission History</span>
        </h1>
        <p className="text-sm text-theme-muted max-w-2xl">
          Check dates, upload status, final released marks, and historical feedback sheets for your past submissions.
        </p>
      </div>

      {/* History table */}
      <div className="bg-theme-card border border-theme-border/40 p-6 rounded-card shadow-sm">
        <div className="overflow-x-auto">
          {submissions.length > 0 ? (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-theme-border/40 text-theme-muted font-bold uppercase tracking-wider">
                  <th className="py-3 px-2">Submission Document</th>
                  <th className="py-3 px-2">Course Subject</th>
                  <th className="py-3 px-2">Uploaded On</th>
                  <th className="py-3 px-2">Status</th>
                  <th className="py-3 px-2">Final Grade</th>
                  <th className="py-3 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border/30 text-theme-text font-semibold">
                {submissions.map((sub, idx) => (
                  <tr key={idx} className="hover:bg-theme-bg/60 transition-colors">
                    <td className="py-4 px-2 font-bold text-theme-text text-sm">{sub.name}</td>
                    <td className="py-4 px-2 font-semibold text-xs text-theme-muted">{sub.subject}</td>
                    <td className="py-4 px-2 text-xs text-theme-muted">{sub.date}</td>
                    <td className="py-4 px-2">
                      <span className={`px-2 py-0.5 rounded-lg font-bold text-[9px] uppercase tracking-wider ${
                        sub.isPublished 
                          ? 'bg-theme-success/15 border border-theme-success/25 text-theme-success' 
                          : 'bg-theme-warning/15 border border-theme-warning/25 text-theme-warning'
                      }`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className={`py-4 px-2 text-sm font-extrabold ${sub.isPublished ? 'text-theme-primary' : 'text-theme-muted'}`}>
                      {sub.score}
                    </td>
                    <td className="py-4 px-2 text-right">
                      {sub.isPublished ? (
                        <button 
                          onClick={() => navigate(`/student/feedback?paperId=${sub.id}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-theme-bg border border-theme-border/60 hover:bg-theme-primary/10 hover:text-theme-primary hover:border-theme-primary/20 text-theme-text rounded-xl font-bold transition-all text-xs"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View Report</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-theme-muted font-bold italic">Awaiting Release</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-xs text-theme-muted uppercase tracking-widest font-bold">
              No submissions found
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
