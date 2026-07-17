import React, { lazy, Suspense, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import RoleGuard from './components/RoleGuard';

// Dynamic Redirect Resolver Target
function DashboardRedirector() {
  const userStr = localStorage.getItem('currentUser');
  if (!userStr) {
    return <Navigate to="/login" replace />;
  }
  const user = JSON.parse(userStr);
  return <Navigate to={user.role === 'student' ? '/student/dashboard' : '/professor/dashboard'} replace />;
}

// Lazy load Authentication pages
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const RegisterProfile = lazy(() => import('./pages/auth/RegisterProfile'));

// Lazy load Professor pages
const ProfessorDashboard = lazy(() => import('./pages/professor/Dashboard'));
const ProfessorSubjects = lazy(() => import('./pages/professor/Subjects'));
const ProfessorExams = lazy(() => import('./pages/professor/Exams'));
const ProfessorReviewAnswerKey = lazy(() => import('./pages/professor/ReviewAnswerKey'));
const ProfessorOMRKeyConfig = lazy(() => import('./pages/professor/OMRKeyConfig'));
const ProfessorRubrics = lazy(() => import('./pages/professor/RubricBuilder'));
const ProfessorRegistry = lazy(() => import('./pages/professor/StudentRegistry'));
const ProfessorEvaluation = lazy(() => import('./pages/professor/EvaluationPipeline'));
const ProfessorOMREvaluation = lazy(() => import('./pages/professor/OMREvaluation'));
const ProfessorHistory = lazy(() => import('./pages/professor/History'));
const ProfessorAnalytics = lazy(() => import('./pages/professor/ClassAnalytics'));
const ProfessorTopicAnalysis = lazy(() => import('./pages/professor/TopicDifficulty'));
const ProfessorAIInsights = lazy(() => import('./pages/professor/AIInsights'));
const ProfessorSettings = lazy(() => import('./pages/professor/Settings'));

// Lazy load Student pages
const StudentDashboard = lazy(() => import('./pages/student/Dashboard'));
const StudentSubjects = lazy(() => import('./pages/student/Subjects'));
const StudentResults = lazy(() => import('./pages/student/Results'));
const StudentUpload = lazy(() => import('./pages/student/Upload'));
const StudentUploadOMR = lazy(() => import('./pages/student/UploadOMR'));
const StudentHistory = lazy(() => import('./pages/student/History'));
const StudentAIFeedback = lazy(() => import('./pages/student/AIFeedback'));
const StudentFeedback = lazy(() => import('./pages/student/Feedback'));
const StudentSettings = lazy(() => import('./pages/student/Settings'));

// Shimmer Shunt Loader
function LoadingFallback() {
  return (
    <div className="w-full h-full space-y-6 animate-pulse p-4">
      <div className="h-8 bg-white/5 rounded-lg w-1/4" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-32 bg-white/5 rounded-card" />
        <div className="h-32 bg-white/5 rounded-card" />
        <div className="h-32 bg-white/5 rounded-card" />
      </div>
      <div className="h-64 bg-white/5 rounded-card w-full" />
    </div>
  );
}

// Unified Protected Layout Shell
function PrivateLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const currentUser = localStorage.getItem('currentUser');

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const user = JSON.parse(currentUser);
  const isStudent = user.role === 'student';

  return (
    <div className={isStudent ? "min-h-screen bg-theme-bg text-theme-text transition-colors duration-200" : "min-h-screen bg-[#0A0E1A] text-gray-200"}>
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      <div 
        className="transition-all duration-300 min-h-screen flex flex-col pt-16"
        style={{ paddingLeft: isCollapsed ? '76px' : '260px' }}
      >
        <TopBar isSidebarCollapsed={isCollapsed} />
        <main className="flex-1 p-6 sm:p-8">
          <Suspense fallback={<LoadingFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public authentication flows */}
        <Route path="/login" element={
          <Suspense fallback={<LoadingFallback />}>
            <Login />
          </Suspense>
        } />
        <Route path="/register" element={
          <Suspense fallback={<LoadingFallback />}>
            <Register />
          </Suspense>
        } />
        <Route path="/register/profile" element={
          <Suspense fallback={<LoadingFallback />}>
            <RegisterProfile />
          </Suspense>
        } />

        {/* Dynamic Redirect target */}
        <Route path="/dashboard" element={<DashboardRedirector />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Protected STUDENT workspace */}
        <Route element={<RoleGuard allowedRoles={['student']}><PrivateLayout /></RoleGuard>}>
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/subjects" element={<StudentSubjects />} />
          <Route path="/student/results" element={<StudentResults />} />
          <Route path="/student/upload" element={<StudentUpload />} />
          <Route path="/student/upload-omr" element={<StudentUploadOMR />} />
          <Route path="/student/history" element={<StudentHistory />} />
          <Route path="/student/ai-feedback" element={<StudentAIFeedback />} />
          <Route path="/student/feedback" element={<StudentFeedback />} />
          <Route path="/student/settings" element={<StudentSettings />} />
        </Route>

        {/* Protected PROFESSOR workspace */}
        <Route element={<RoleGuard allowedRoles={['professor']}><PrivateLayout /></RoleGuard>}>
          <Route path="/professor/dashboard" element={<ProfessorDashboard />} />
          <Route path="/professor/subjects" element={<ProfessorSubjects />} />
          <Route path="/professor/exams" element={<ProfessorExams />} />
          <Route path="/professor/exams/:id/review-key" element={<ProfessorReviewAnswerKey />} />
          <Route path="/professor/exams/:id/omr-key-config" element={<ProfessorOMRKeyConfig />} />
          <Route path="/professor/rubrics" element={<ProfessorRubrics />} />
          <Route path="/professor/registry" element={<ProfessorRegistry />} />
          <Route path="/professor/evaluation" element={<ProfessorEvaluation />} />
          <Route path="/professor/omr-evaluation" element={<ProfessorOMREvaluation />} />
          <Route path="/professor/history" element={<Navigate to="/professor/dashboard" replace />} />
          <Route path="/professor/analytics" element={<ProfessorAnalytics />} />
          <Route path="/professor/topic-analysis" element={<ProfessorTopicAnalysis />} />
          <Route path="/professor/ai-insights" element={<ProfessorAIInsights />} />
          <Route path="/professor/settings" element={<ProfessorSettings />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
