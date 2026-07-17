import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Award, FileText, Download, RefreshCw, AlertCircle, Eye, HelpCircle
} from 'lucide-react';

interface ResultRecord {
  id: string;
  examName: string;
  subjectCode: string;
  date: string;
  personalScore: number | null; // percentage
  maxMarks: number;
  obtainedScore: number | null;
  classAvg: number | null; // percentage
  grade: string;
  isPublished: boolean;
  isOmr: boolean;
}

export default function StudentResults() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<ResultRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState('All');

  // Load current user
  const userStr = localStorage.getItem('currentUser');
  const user = userStr ? JSON.parse(userStr) : { fullName: 'Marcus Aurelius', rollNumber: 'CS24B1031', email: 'student@university.edu' };

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const roll = user.rollNumber || '';
        const email = user.email || '';
        const headers = { 
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          'x-user-email': email 
        };
        
        const [res1, res2] = await Promise.all([
          fetch(`/api/papers?studentId=${encodeURIComponent(roll)}`, { headers }),
          fetch(`/api/omr/papers?studentId=${encodeURIComponent(roll)}`, { headers })
        ]);
        
        if (res1.ok && res2.ok) {
          const papers = await res1.json();
          const omrPapers = await res2.json();
          
          const mappedPapers = papers.map((p: any) => {
            const isPub = p.status === 'released' || p.isPublished;
            return {
              id: p.id,
              examName: p.examTitle || (p.subjectId === 'CS-301' ? 'Data Structures Exam' : `${p.subjectId} Term Exam`),
              subjectCode: p.subjectId,
              date: p.submissionDate,
              personalScore: isPub && p.maxMarks > 0 ? Math.round((p.totalScore / p.maxMarks) * 100) : null,
              obtainedScore: isPub ? p.totalScore : null,
              maxMarks: p.maxMarks,
              classAvg: isPub ? p.classAverage : null,
              grade: isPub ? p.grade : 'Pending',
              isPublished: isPub,
              isOmr: false
            };
          });

          const mappedOMR = omrPapers.map((p: any) => {
            const isPub = !!p.evaluation;
            const scorePct = isPub ? Math.round((p.evaluation.totalScore / p.evaluation.maxScore) * 100) : null;
            return {
              id: p.id,
              examName: p.templateId === 'OMR-101' ? 'Biology Midterm MCQ' : p.templateId === 'OMR-102' ? 'Chemistry Final MCQ' : `${p.templateId} MCQ`,
              subjectCode: p.templateId,
              date: p.submissionDate,
              personalScore: scorePct,
              obtainedScore: isPub ? p.evaluation.totalScore : null,
              maxMarks: isPub ? p.evaluation.maxScore : 100,
              classAvg: isPub ? p.classAverage : null,
              grade: isPub ? (scorePct! >= 90 ? 'A+' : scorePct! >= 80 ? 'A' : scorePct! >= 70 ? 'B' : scorePct! >= 60 ? 'C' : 'F') : 'Pending',
              isPublished: isPub,
              isOmr: true
            };
          });

          // Sort by date descending
          const allRecords = [...mappedPapers, ...mappedOMR].sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );

          setRecords(allRecords);
        }
      } catch (err) {
        console.error('Failed to fetch result records:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [user.rollNumber, user.email]);

  const uniqueSubjects = ['All', ...Array.from(new Set(records.map(r => r.subjectCode)))];
  
  const filteredRecords = records.filter(rec => 
    subjectFilter === 'All' || rec.subjectCode === subjectFilter
  );

  const handleDownloadPDF = (id: string) => {
    const token = localStorage.getItem('token') || '';
    const userStr = localStorage.getItem('currentUser');
    const user = userStr ? JSON.parse(userStr) : null;
    const email = user ? (user.email || '') : '';
    window.open(`/api/papers/${id}/report?token=${token}&userEmail=${encodeURIComponent(email)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse p-4">
        <div className="h-8 bg-theme-muted/15 rounded-lg w-1/4" />
        <div className="h-64 bg-theme-muted/10 rounded-card w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-10 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-theme-text flex items-center gap-3">
          <Award className="w-8 h-8 text-theme-primary" />
          <span>Academic Results</span>
        </h1>
        <p className="text-sm text-theme-muted max-w-2xl">
          Review your finalized marks, grades, and average comparison metrics once released by your instructor.
        </p>
      </div>

      {/* Subject Filters */}
      <div className="flex flex-wrap gap-2 items-center pb-2 border-b border-theme-border/40">
        <span className="text-xs text-theme-muted font-bold uppercase tracking-wider mr-2">Filter Courses:</span>
        {uniqueSubjects.map(sub => (
          <button
            key={sub}
            onClick={() => setSubjectFilter(sub)}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
              subjectFilter === sub 
                ? 'bg-theme-primary text-white shadow-md' 
                : 'bg-theme-card border border-theme-border/40 text-theme-muted hover:text-theme-text hover:bg-theme-bg'
            }`}
          >
            {sub}
          </button>
        ))}
      </div>

      {/* Main Results Table */}
      <div className="bg-theme-card border border-theme-border/40 rounded-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-theme-border/40 text-theme-muted font-bold uppercase tracking-wider bg-theme-bg/50">
                <th className="py-4 px-6">Exam Name</th>
                <th className="py-4 px-6">Subject</th>
                <th className="py-4 px-6">Published Date</th>
                <th className="py-4 px-6 text-center">My Score</th>
                <th className="py-4 px-6 text-center">Grade</th>
                <th className="py-4 px-6 text-center">Class Average</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border/30 text-theme-text font-medium">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((rec, idx) => (
                  <tr key={idx} className="hover:bg-theme-bg/40 transition-colors">
                    <td className="py-4 px-6 font-bold text-theme-text text-sm">
                      <div className="flex flex-col">
                        <span>{rec.examName}</span>
                        {rec.isOmr && (
                          <span className="text-[10px] text-theme-muted font-semibold mt-0.5 uppercase tracking-wide bg-theme-bg border border-theme-border/40 px-1.5 py-0.5 rounded w-max">
                            OMR Sheet
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-theme-muted font-semibold">{rec.subjectCode}</td>
                    <td className="py-4 px-6 text-theme-muted">{rec.date || '—'}</td>
                    <td className="py-4 px-6 text-center font-extrabold text-sm">
                      {rec.isPublished && rec.obtainedScore !== null ? (
                        <span className="text-theme-primary">
                          {rec.obtainedScore} <span className="text-xs text-theme-muted font-normal">/ {rec.maxMarks}</span>
                        </span>
                      ) : (
                        <span className="text-theme-warning bg-theme-warning/10 px-2.5 py-1 rounded-xl">
                          Under Review
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {rec.isPublished ? (
                        <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                          rec.grade.startsWith('A') 
                            ? 'bg-theme-success/10 text-theme-success' 
                            : rec.grade.startsWith('B') 
                              ? 'bg-theme-primary/10 text-theme-primary' 
                              : 'bg-theme-danger/10 text-theme-danger'
                        }`}>
                          {rec.grade}
                        </span>
                      ) : (
                        <span className="text-theme-muted">—</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center font-bold text-theme-text">
                      {rec.isPublished && rec.classAvg !== null ? (
                        <span>{rec.classAvg}%</span>
                      ) : (
                        <span className="text-theme-muted">—</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex gap-2 justify-end">
                        {rec.isPublished ? (
                          <>
                            <button
                              onClick={() => navigate(`/student/feedback?paperId=${rec.id}`)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-theme-bg border border-theme-border/60 hover:bg-theme-primary/10 hover:text-theme-primary hover:border-theme-primary/20 text-theme-text rounded-xl font-bold transition-all text-xs"
                              title="View AI Critique Report"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Critique</span>
                            </button>
                            <button
                              onClick={() => handleDownloadPDF(rec.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-theme-primary text-white hover:opacity-90 rounded-xl font-bold transition-all text-xs shadow-sm"
                              title="Download Certified PDF Report"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>PDF</span>
                            </button>
                          </>
                        ) : (
                          <div className="inline-flex items-center gap-1 text-[11px] text-theme-muted font-bold px-3 py-1.5 bg-theme-bg/60 rounded-xl">
                            <HelpCircle className="w-3.5 h-3.5 text-theme-muted/70" />
                            <span>Awaiting Release</span>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-theme-muted font-bold">
                    No released exam records found matching the filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
