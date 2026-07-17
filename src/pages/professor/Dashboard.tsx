import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Users, BookOpen, FileSpreadsheet, Clock, Sparkles, 
  ArrowUpRight, CheckCircle2, AlertTriangle, RefreshCw,
  History, Calendar, GraduationCap, ChevronRight, FileText, Check
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();

  // Data states
  const [subjects, setSubjects] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [papers, setPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` };
      
      const subRes = await fetch('/api/subjects', { headers });
      const subData = subRes.ok ? await subRes.json() : [];
      setSubjects(subData);

      const examRes = await fetch('/api/exams', { headers });
      const examData = examRes.ok ? await examRes.json() : [];
      setExams(examData);

      const paperRes = await fetch('/api/papers', { headers });
      const paperData = paperRes.ok ? await paperRes.json() : [];
      setPapers(paperData);
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Derived Summary metrics
  const totalStudents = Array.from(new Set(papers.map(p => p.studentId))).length;
  
  const totalSubjects = subjects.length;
  
  const activeExams = exams.filter(e => {
    if (!e.exam_date) return true;
    const examDate = new Date(e.exam_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return examDate >= today;
  }).length;

  const pendingReviewsList = papers.filter(p => p.status !== 'released');
  const pendingReviewsCount = pendingReviewsList.length;

  // Derive Recent Activity (last 4 submissions)
  const recentActivities = [...papers]
    .sort((a, b) => b.submissionDate.localeCompare(a.submissionDate))
    .slice(0, 4)
    .map(p => {
      const isReleased = p.status === 'released';
      return {
        id: p.id,
        type: isReleased ? 'release' : 'submission',
        title: isReleased 
          ? `Released results for ${p.studentName}` 
          : `New submission from ${p.studentName}`,
        desc: `${p.examTitle} (${p.subjectId})`,
        time: p.submissionDate
      };
    });

  // Calculate Students at Risk count
  const atRiskStudents = Array.from(new Set(
    papers
      .filter(p => p.status === 'released' && p.totalScore / (p.maxMarks || 10) < 0.55)
      .map(p => p.studentId)
  ));
  const atRiskCount = atRiskStudents.length;

  return (
    <div className="flex flex-col gap-8 pb-10">
      
      {/* Welcome Heading */}
      <div className="flex justify-between items-start flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-theme-text">
          Professor Dashboard
        </h1>
        <p className="text-sm text-theme-muted max-w-2xl">
          Quickly audit pending answer papers, track active course modules, and view real-time pipeline performance insights.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <RefreshCw className="w-8 h-8 text-brand-purple animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { label: 'Total Students', value: totalStudents, icon: Users, color: '#2563EB' },
              { label: 'Total Subjects', value: totalSubjects, icon: BookOpen, color: '#7C3AED' },
              { label: 'Active Exams', value: activeExams, icon: FileSpreadsheet, color: '#10B981' },
              { label: 'Pending Reviews', value: pendingReviewsCount, icon: Clock, color: '#F59E0B' }
            ].map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div
                  key={idx}
                  className="bg-theme-card border border-theme-border/40 p-5 rounded-card shadow-sm flex flex-col justify-between gap-4 relative overflow-hidden group hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-theme-muted font-bold uppercase tracking-wider">
                      {stat.label}
                    </span>
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                      style={{ backgroundColor: `${stat.color}15`, color: stat.color }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-extrabold text-theme-text tracking-tight">
                      {stat.value}
                    </h3>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action-Oriented Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Submissions Queue */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              
              <div className="bg-theme-card border border-theme-border/40 p-6 rounded-card shadow-sm flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-theme-border/30 pb-3">
                  <h3 className="text-base font-extrabold text-theme-text flex items-center gap-2">
                    <Clock className="w-4 h-4 text-theme-warning" />
                    <span>Pending Evaluations Queue</span>
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-theme-warning/10 text-theme-warning text-[10px] font-bold border border-theme-warning/20">
                    {pendingReviewsCount} pending
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-theme-border/40 text-theme-muted font-bold uppercase tracking-wider">
                        <th className="py-2.5">Student Name</th>
                        <th className="py-2.5">Subject</th>
                        <th className="py-2.5">Exam Name</th>
                        <th className="py-2.5">Type</th>
                        <th className="py-2.5">Submitted</th>
                        <th className="py-2.5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-theme-border/30 text-theme-text font-semibold">
                      {pendingReviewsList.length > 0 ? (
                        pendingReviewsList.slice(0, 5).map(paper => (
                          <tr key={paper.id} className="hover:bg-theme-bg/60 transition-colors">
                            <td className="py-3 font-bold text-theme-text">{paper.studentName}</td>
                            <td className="py-3 text-theme-muted font-bold">{paper.subjectId}</td>
                            <td className="py-3 text-theme-text font-bold truncate max-w-[150px]">{paper.examTitle}</td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase border ${
                                paper.evaluationType === 'omr' 
                                  ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' 
                                  : 'bg-pink-500/10 border-pink-500/20 text-pink-400'
                              }`}>
                                {paper.evaluationType === 'omr' ? 'OMR' : 'Descriptive'}
                              </span>
                            </td>
                            <td className="py-3 text-theme-muted">{paper.submissionDate}</td>
                            <td className="py-3 text-center">
                              <button
                                onClick={() => navigate(paper.evaluationType === 'omr' 
                                  ? `/professor/evaluation?paperId=${paper.id}` 
                                  : `/professor/evaluation?paperId=${paper.id}`
                                )}
                                className="px-2.5 py-1 bg-theme-primary/10 hover:bg-theme-primary text-theme-primary hover:text-white border border-theme-primary/20 rounded-lg text-[10px] font-bold transition-all"
                              >
                                Review
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-theme-muted italic">
                            All student scripts evaluated! You are fully caught up.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end mt-2">
                  <button 
                    onClick={() => navigate('/professor/evaluation')}
                    className="text-xs text-theme-primary hover:underline font-bold flex items-center gap-1"
                  >
                    <span>View Full Submissions Queue</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>

            {/* Right Column: Recent Activity Feed */}
            <div className="flex flex-col gap-6">
              
              {/* Recent Activity Card */}
              <div className="bg-theme-card border border-theme-border/40 p-6 rounded-card shadow-sm flex flex-col gap-4">
                <div className="flex items-center gap-2 border-b border-theme-border/30 pb-3">
                  <History className="w-4 h-4 text-theme-primary" />
                  <h3 className="text-sm font-bold text-theme-text uppercase tracking-wider">
                    Recent Activity
                  </h3>
                </div>

                <div className="flex flex-col gap-4 relative pl-4 border-l border-theme-border/40">
                  {recentActivities.length > 0 ? (
                    recentActivities.map((act, idx) => (
                      <div key={idx} className="relative flex flex-col gap-1">
                        <div className={`absolute -left-[21px] top-1 w-2 h-2 rounded-full border border-theme-card ${
                          act.type === 'release' ? 'bg-theme-success' : 'bg-theme-primary'
                        }`} />
                        <span className="text-[9px] text-theme-muted font-bold uppercase tracking-wide">
                          {act.time}
                        </span>
                        <h4 className="text-xs font-bold text-theme-text">{act.title}</h4>
                        <p className="text-[10px] text-theme-muted mt-0.5 leading-snug">{act.desc}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-xs text-theme-muted py-6">
                      No recent activities recorded.
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        </>
      )}

    </div>
  );
}
