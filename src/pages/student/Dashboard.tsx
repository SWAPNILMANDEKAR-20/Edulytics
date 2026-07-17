import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GraduationCap, Award, BookOpen, Clock, FileCheck, History,
  Sparkles, Mail, User, School, Calendar, ArrowRight, BookMarked, HelpCircle
} from 'lucide-react';
import { API_URL } from '../../utils/api';

interface SummaryMetrics {
  subjectsCount: number;
  examsSubmitted: number;
  pendingEvaluation: number;
  publishedResults: number;
}

interface ActivityEvent {
  id: string;
  type: 'submission' | 'evaluation';
  title: string;
  desc: string;
  timestamp: string;
}

interface RecentResult {
  id: string;
  examName: string;
  subjectCode: string;
  obtainedScore: number | null;
  maxMarks: number;
  grade: string;
  classAvg: number | null;
}

interface PendingEvaluation {
  id: string;
  examName: string;
  subjectCode: string;
  submissionDate: string;
  status: string;
}

interface TopicRecommendation {
  topic: string;
  averageScore: number;
  sampleSize: number;
  status: 'Need Practice' | 'Revision Recommended' | 'Strong' | 'Not enough data yet';
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<SummaryMetrics | null>(null);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [recentResults, setRecentResults] = useState<RecentResult[]>([]);
  const [pendingEvals, setPendingEvals] = useState<PendingEvaluation[]>([]);
  const [recommendations, setRecommendations] = useState<TopicRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  // Load current user
  const userStr = localStorage.getItem('currentUser');
  const user = userStr ? JSON.parse(userStr) : { 
    fullName: 'Marcus Aurelius', 
    rollNumber: 'CS24B1031', 
    email: 'student@university.edu', 
    department: 'Computer Science',
    semester: 'Semester 4'
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const roll = user.rollNumber || '';
        const email = user.email || '';
        const headers = { 
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          'x-user-email': email 
        };

        const [resSummary, resActivity, resRecs, resPapers, resOMR] = await Promise.all([
          fetch(`${API_URL}/api/student/dashboard/summary`, { headers }),
          fetch(`${API_URL}/api/student/dashboard/activity`, { headers }),
          fetch(`${API_URL}/api/student/dashboard/recommendations`, { headers }),
          fetch(`${API_URL}/api/papers?studentId=${encodeURIComponent(roll)}`, { headers }),
          fetch(`${API_URL}/api/omr/papers?studentId=${encodeURIComponent(roll)}`, { headers })
        ]);

        if (resSummary.ok) setSummary(await resSummary.json());
        if (resActivity.ok) setActivities(await resActivity.json());
        if (resRecs.ok) setRecommendations(await resRecs.json());

        if (resPapers.ok && resOMR.ok) {
          const papers = await resPapers.json();
          const omrPapers = await resOMR.json();

          // 1. Process recent results (published papers/OMR)
          const resultsList: RecentResult[] = [];
          papers.forEach((p: any) => {
            if (p.status === 'released' || p.isPublished) {
              resultsList.push({
                id: p.id,
                examName: p.examTitle || `${p.subjectId} Term Exam`,
                subjectCode: p.subjectId,
                obtainedScore: p.totalScore,
                maxMarks: p.maxMarks,
                grade: p.grade,
                classAvg: p.classAverage
              });
            }
          });
          omrPapers.forEach((p: any) => {
            if (p.evaluation) {
              const scorePct = Math.round((p.evaluation.totalScore / p.evaluation.maxScore) * 100);
              resultsList.push({
                id: p.id,
                examName: p.templateId === 'OMR-101' ? 'Biology Midterm MCQ' : `${p.templateId} MCQ`,
                subjectCode: p.templateId,
                obtainedScore: p.evaluation.totalScore,
                maxMarks: p.evaluation.maxScore,
                grade: scorePct >= 90 ? 'A+' : scorePct >= 80 ? 'A' : 'B',
                classAvg: p.classAverage
              });
            }
          });
          setRecentResults(resultsList.slice(0, 5));

          // 2. Process pending evaluations (status != released)
          const pendingList: PendingEvaluation[] = [];
          papers.forEach((p: any) => {
            if (p.status !== 'released' && !p.isPublished) {
              pendingList.push({
                id: p.id,
                examName: p.examTitle || `${p.subjectId} Script`,
                subjectCode: p.subjectId,
                submissionDate: p.submissionDate,
                status: p.status === 'in_review' ? 'In Review' : 'Waiting for Review'
              });
            }
          });
          omrPapers.forEach((p: any) => {
            if (!p.evaluation) {
              pendingList.push({
                id: p.id,
                examName: `${p.templateId} MCQ Sheet`,
                subjectCode: p.templateId,
                submissionDate: p.submissionDate,
                status: 'Processing MCQ'
              });
            }
          });
          setPendingEvals(pendingList);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user.rollNumber, user.email]);

  const formatRelativeTime = (timestamp: string) => {
    const diffMs = new Date().getTime() - new Date(timestamp).getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse p-4 max-w-6xl mx-auto">
        <div className="h-10 bg-theme-muted/15 rounded-lg w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="h-28 bg-theme-muted/10 rounded-card" />
          <div className="h-28 bg-theme-muted/10 rounded-card" />
          <div className="h-28 bg-theme-muted/10 rounded-card" />
          <div className="h-28 bg-theme-muted/10 rounded-card" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-64 bg-theme-muted/10 rounded-card lg:col-span-2" />
          <div className="h-64 bg-theme-muted/10 rounded-card" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-10 max-w-6xl mx-auto">
      
      {/* Top Banner & Profile Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Welcome Text block */}
        <div className="lg:col-span-2 flex flex-col justify-center gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-theme-text">
            Welcome back, {user.fullName || user.name} 👋
          </h1>
          <p className="text-sm text-theme-muted">
            Ready to continue your learning today? View your release logs, check AI critique notes, or upload new scripts.
          </p>
        </div>

        {/* Profile Details Card */}
        <div className="bg-theme-card border border-theme-border/40 p-5 rounded-card shadow-sm flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-brand-gradient flex items-center justify-center text-white font-extrabold text-lg shadow-md shrink-0">
            {(user.fullName || user.name || 'User')
              .split(' ')
              .filter(Boolean)
              .map((n: string) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <h3 className="text-base font-extrabold text-theme-text truncate">{user.fullName || user.name}</h3>
            <p className="text-xs text-theme-muted flex items-center gap-1.5 mt-0.5 truncate">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>{user.rollNumber} • {user.semester || 'Semester 4'}</span>
            </p>
            <p className="text-xs text-theme-muted flex items-center gap-1.5 mt-0.5 truncate">
              <School className="w-3.5 h-3.5" />
              <span>{user.department || 'Computer Science'}</span>
            </p>
            <p className="text-xs text-theme-muted flex items-center gap-1.5 mt-0.5 truncate">
              <Mail className="w-3.5 h-3.5" />
              <span>{user.email}</span>
            </p>
          </div>
        </div>

      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        
        <div className="bg-theme-card border border-theme-border/40 p-5 rounded-card shadow-sm flex items-start gap-4 hover:-translate-y-0.5 transition-all">
          <div className="p-3 bg-theme-primary/10 text-theme-primary rounded-xl shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-theme-muted font-bold uppercase tracking-wider">Courses Enrolled</p>
            <h4 className="text-2xl font-extrabold text-theme-text mt-1">{summary?.subjectsCount || 0}</h4>
          </div>
        </div>

        <div className="bg-theme-card border border-theme-border/40 p-5 rounded-card shadow-sm flex items-start gap-4 hover:-translate-y-0.5 transition-all">
          <div className="p-3 bg-brand-purple/10 text-brand-purple rounded-xl shrink-0">
            <BookMarked className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-theme-muted font-bold uppercase tracking-wider">Exams Submitted</p>
            <h4 className="text-2xl font-extrabold text-theme-text mt-1">{summary?.examsSubmitted || 0}</h4>
          </div>
        </div>

        <div className="bg-theme-card border border-theme-border/40 p-5 rounded-card shadow-sm flex items-start gap-4 hover:-translate-y-0.5 transition-all">
          <div className="p-3 bg-theme-warning/10 text-theme-warning rounded-xl shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-theme-muted font-bold uppercase tracking-wider">Pending Evaluation</p>
            <h4 className="text-2xl font-extrabold text-theme-text mt-1">{summary?.pendingEvaluation || 0}</h4>
          </div>
        </div>

        <div className="bg-theme-card border border-theme-border/40 p-5 rounded-card shadow-sm flex items-start gap-4 hover:-translate-y-0.5 transition-all">
          <div className="p-3 bg-theme-success/10 text-theme-success rounded-xl shrink-0">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-theme-muted font-bold uppercase tracking-wider">Published Results</p>
            <h4 className="text-2xl font-extrabold text-theme-text mt-1">{summary?.publishedResults || 0}</h4>
          </div>
        </div>

      </div>

      {/* Main Grid: Left column (Recent Results & Pending), Right column (Activity & Recs) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Columns (Results) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Recent Results Preview Card */}
          <div className="bg-theme-card border border-theme-border/40 p-6 rounded-card shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-extrabold text-theme-text flex items-center gap-2">
                <Award className="w-4 h-4 text-theme-primary" />
                <span>Recent Exam Results</span>
              </h3>
              <button 
                onClick={() => navigate('/student/results')}
                className="text-xs text-theme-primary hover:underline font-bold flex items-center gap-1"
              >
                <span>View all results</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-theme-border/40 text-theme-muted font-bold uppercase tracking-wider">
                    <th className="pb-3 px-2">Exam Name</th>
                    <th className="pb-3 px-2">Subject</th>
                    <th className="pb-3 px-2 text-center">Score</th>
                    <th className="pb-3 px-2 text-center">Grade</th>
                    <th className="pb-3 px-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border/30 text-theme-text font-semibold">
                  {recentResults.length > 0 ? (
                    recentResults.map((rec, idx) => (
                      <tr key={idx} className="hover:bg-theme-bg/60 transition-colors">
                        <td className="py-3 px-2 font-bold text-theme-text truncate max-w-[180px]">{rec.examName}</td>
                        <td className="py-3 px-2 text-theme-muted font-bold">{rec.subjectCode}</td>
                        <td className="py-3 px-2 text-center text-theme-primary font-bold">
                          {rec.obtainedScore !== null ? (
                            <span>{rec.obtainedScore} <span className="text-[10px] text-theme-muted font-normal">/ {rec.maxMarks}</span></span>
                          ) : (
                            <span className="text-theme-warning bg-theme-warning/10 px-2 py-0.5 rounded-lg">Under Review</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                            rec.grade.startsWith('A') ? 'bg-theme-success/15 text-theme-success' : 'bg-theme-primary/15 text-theme-primary'
                          }`}>
                            {rec.grade}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <button
                            onClick={() => navigate(`/student/feedback?paperId=${rec.id}`)}
                            className="px-2.5 py-1 bg-theme-bg hover:bg-theme-primary/10 hover:text-theme-primary border border-theme-border/60 hover:border-theme-primary/20 rounded-lg text-[11px] font-bold transition-all"
                          >
                            Report
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-theme-muted">
                        No released results found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pending Evaluations Section */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold text-theme-muted uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-theme-warning" />
              <span>Pending Reviews</span>
            </h3>

            {pendingEvals.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pendingEvals.map(p => (
                  <div key={p.id} className="bg-theme-card border border-theme-border/40 p-4 rounded-card shadow-sm flex flex-col justify-between gap-3 relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-theme-warning/5 rounded-full filter blur-xl" />
                    <div>
                      <span className="text-[10px] text-theme-muted font-bold uppercase tracking-wider">{p.subjectCode}</span>
                      <h4 className="text-sm font-extrabold text-theme-text mt-1">{p.examName}</h4>
                      <p className="text-xs text-theme-muted flex items-center gap-1.5 mt-2">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Submitted on {p.submissionDate}</span>
                      </p>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[10px] font-extrabold text-theme-warning uppercase bg-theme-warning/10 border border-theme-warning/20 px-2 py-0.5 rounded-lg">
                        {p.status}
                      </span>
                      <button 
                        onClick={() => navigate('/student/history')}
                        className="text-[11px] text-theme-primary hover:underline font-bold"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-theme-card border border-theme-border/40 p-6 rounded-card shadow-sm text-center text-xs text-theme-muted font-bold">
                No active exam answer sheets awaiting review.
              </div>
            )}
          </div>

        </div>

        {/* Right Columns (Activity & Recommendations) */}
        <div className="flex flex-col gap-6">
          
          {/* Recent Activity Card */}
          <div className="bg-theme-card border border-theme-border/40 p-6 rounded-card shadow-sm flex flex-col gap-4">
            <h3 className="text-base font-extrabold text-theme-text flex items-center gap-2">
              <History className="w-4 h-4 text-theme-primary" />
              <span>Activity Timeline</span>
            </h3>

            <div className="flex flex-col gap-4 relative pl-4 border-l border-theme-border/60">
              {activities.length > 0 ? (
                activities.map(act => (
                  <div key={act.id} className="relative group flex flex-col gap-0.5">
                    {/* timeline bullet node */}
                    <div className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border border-theme-card ${
                      act.type === 'submission' ? 'bg-theme-primary' : 'bg-theme-success'
                    }`} />
                    <span className="text-[10px] text-theme-muted font-bold uppercase tracking-wide">
                      {formatRelativeTime(act.timestamp)}
                    </span>
                    <h4 className="text-xs font-bold text-theme-text">{act.title}</h4>
                    <p className="text-[11px] text-theme-muted leading-relaxed mt-0.5">{act.desc}</p>
                  </div>
                ))
              ) : (
                <div className="text-center text-xs text-theme-muted py-6">
                  No recent academic events logged.
                </div>
              )}
            </div>
          </div>

          {/* AI Focus Recommendations */}
          <div className="bg-theme-card border border-theme-border/40 p-6 rounded-card shadow-sm flex flex-col gap-4">
            <h3 className="text-base font-extrabold text-theme-text flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-theme-primary animate-pulse" />
              <span>AI Study Recommendations</span>
            </h3>

            <div className="flex flex-col gap-3">
              {recommendations.length > 0 ? (
                recommendations.map((rec, idx) => {
                  const isNeedPractice = rec.status === 'Need Practice';
                  const isRevision = rec.status === 'Revision Recommended';
                  const isStrong = rec.status === 'Strong';
                  
                  return (
                    <div key={idx} className="p-3 bg-theme-bg/50 border border-theme-border/40 rounded-xl flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <h4 className="text-xs font-extrabold text-theme-text">{rec.topic}</h4>
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                          isNeedPractice 
                            ? 'bg-theme-danger/15 text-theme-danger border border-theme-danger/25' 
                            : isRevision 
                              ? 'bg-theme-warning/15 text-theme-warning border border-theme-warning/25'
                              : isStrong 
                                ? 'bg-theme-success/15 text-theme-success border border-theme-success/25'
                                : 'bg-theme-muted/15 text-theme-muted border border-theme-muted/25'
                        }`}>
                          {rec.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-theme-muted">
                        <span>Average: {rec.averageScore}% ({rec.sampleSize} questions)</span>
                        {isNeedPractice && (
                          <span className="text-theme-danger font-bold">Needs urgent review</span>
                        )}
                        {isRevision && (
                          <span className="text-theme-warning font-bold">Revise keywords</span>
                        )}
                        {isStrong && (
                          <span className="text-theme-success font-bold">Concept mastered</span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-xs text-theme-muted py-6 flex flex-col gap-2 items-center">
                  <HelpCircle className="w-8 h-8 text-theme-muted/60" />
                  <span>No evaluated topics yet. Recommendations will appear once your teacher publishes graded reports.</span>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
