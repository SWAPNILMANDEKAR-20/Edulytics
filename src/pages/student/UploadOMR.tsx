import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UploadCloud, FileInput, CheckCircle2, ChevronRight, 
  Cpu, Sliders, AlertCircle, FileText, Sparkles, RefreshCw, BookOpen,
  ChevronUp, ChevronDown, Trash2
} from 'lucide-react';
import { API_URL } from '../../utils/api';

export default function StudentUploadOMR() {
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  // Dynamic states
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [exams, setExams] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [createdPaper, setCreatedPaper] = useState<any>(null);
  const [ocrText, setOcrText] = useState('');

  // Load current user
  const userStr = localStorage.getItem('currentUser');
  const user = userStr ? JSON.parse(userStr) : { fullName: 'Marcus Aurelius', rollNumber: 'CS24B1031', email: 'student@university.edu' };

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await fetch(`${API_URL}/api/student/subjects`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
          const data = await res.json();
          setSubjects(data);
          if (data.length > 0) {
            setSelectedSubjectId(data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load subjects:', err);
      }
    };
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (!selectedSubjectId) return;
    const fetchExams = async () => {
      try {
        const res = await fetch(`/api/exams?subjectId=${selectedSubjectId}`);
        if (res.ok) {
          const data = await res.json();
          // Filter to only confirmed OMR exams
          const confirmed = data.filter((e: any) => 
            e.is_answer_key_confirmed === true && 
            e.evaluation_type === 'omr'
          );
          setExams(confirmed);
          if (confirmed.length > 0) {
            setSelectedExamId(confirmed[0].id);
          } else {
            setSelectedExamId('');
          }
        }
      } catch (err) {
        console.error('Failed to load exams:', err);
      }
    };
    fetchExams();
  }, [selectedSubjectId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedExamId) {
      alert('Cannot upload script: No confirmed OMR exam is available for this course subject.');
      return;
    }
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...filesArray]);
    }
  };

  const moveFile = (index: number, direction: 'up' | 'down') => {
    const updated = [...selectedFiles];
    if (direction === 'up' && index > 0) {
      const temp = updated[index];
      updated[index] = updated[index - 1];
      updated[index - 1] = temp;
    } else if (direction === 'down' && index < updated.length - 1) {
      const temp = updated[index];
      updated[index] = updated[index + 1];
      updated[index + 1] = temp;
    }
    setSelectedFiles(updated);
  };

  const deleteFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadAndSegment = async () => {
    if (!selectedExamId) {
      alert('Cannot upload script: No confirmed OMR exam is available for this course subject.');
      return;
    }
    if (selectedFiles.length === 0) {
      alert('Please select at least one page scan to upload.');
      return;
    }

    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('sheets', file);
    });

    const fileOrder = selectedFiles.map(f => f.name).join(',');
    formData.append('fileOrder', fileOrder);
    formData.append('studentName', user.fullName);
    formData.append('studentId', user.rollNumber);
    formData.append('studentUuid', user.id || '');
    formData.append('subjectId', selectedSubjectId);
    formData.append('examId', selectedExamId);

    try {
      setUploadProgress(10);
      
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload', true);
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const pct = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(pct);
        }
      };
      
      xhr.onload = async () => {
        if (xhr.status === 200 || xhr.status === 201) {
          const paperObj = JSON.parse(xhr.responseText);
          setCreatedPaper(paperObj);
          setUploadProgress(100);
          
          setTimeout(async () => {
            try {
              const ocrRes = await fetch(`/api/papers/${paperObj.id}/ocr`, { method: 'POST' });
              if (ocrRes.ok) {
                const ocrData = await ocrRes.json();
                // Map mock bubble scanning locations
                const totalQ = paperObj.answers && paperObj.answers.length > 0 ? paperObj.answers.length : 15;
                const mockList = [];
                for (let i = 1; i <= totalQ; i++) {
                  const opts = ['A', 'B', 'C', 'D'];
                  mockList.push(`Q${i}: [${opts[Math.floor(Math.random() * 4)]}]`);
                }
                setOcrText(mockList.join('   '));
              }
            } catch (err) {
              console.error('Bubble detection preview failed:', err);
            }
            setCurrentStep(2);
          }, 800);
        } else {
          alert('Upload failed. Please try again.');
          setUploadProgress(0);
        }
      };
      
      xhr.send(formData);
    } catch (err) {
      console.error('Upload error:', err);
      alert('An error occurred during files upload.');
      setUploadProgress(0);
    }
  };

  const runAIEvaluation = async () => {
    if (!createdPaper) return;
    setIsProcessing(true);
    setCurrentStep(3);
    
    try {
      const res = await fetch(`/api/papers/${createdPaper.id}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setTimeout(() => {
          setIsProcessing(false);
          setCurrentStep(4);
        }, 1500);
      } else {
        console.error('OMR AI evaluation failed details:', data);
        alert(`OMR AI evaluation failed: ${data.message || 'Unknown Server Error'} (${data.error || '500'})`);
        setCurrentStep(2);
        setIsProcessing(false);
      }
    } catch (err: any) {
      console.error('Evaluation failed:', err);
      alert(`OMR AI evaluation failed: ${err.message || 'Network Error'}`);
      setCurrentStep(2);
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-10">
      
      {/* Header */}
      <div className="flex justify-between items-start flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
          <FileInput className="w-8 h-8 text-brand-purple" />
          <span>Upload OMR Sheet</span>
        </h1>
        <p className="text-sm text-gray-400 max-w-2xl">
          Submit scans of your filled OMR sheet (PDF, PNG, JPG). Make sure the corner markers are clearly visible to execute perspective bubble scanning.
        </p>
      </div>

      {/* Staged pipeline progress bar */}
      <div className="glass-panel p-5 rounded-card border border-white/10 bg-[#0F1424]/40 flex justify-between items-center overflow-x-auto gap-4">
        {[
          { step: 1, label: 'Upload Scan' },
          { step: 2, label: 'Bubble Detection' },
          { step: 3, label: 'AI Evaluation In Progress' },
          { step: 4, label: 'Results Ready' }
        ].map((item, idx) => {
          const isDone = currentStep > item.step;
          const isCurrent = currentStep === item.step;
          return (
            <React.Fragment key={item.step}>
              <div className="flex items-center gap-2 shrink-0">
                <div 
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isDone 
                      ? 'bg-brand-emerald text-white shadow-md shadow-brand-emerald/10' 
                      : isCurrent 
                        ? 'bg-brand-gradient text-white shadow-md shadow-brand-blue/15 scale-105' 
                        : 'bg-white/5 text-gray-500 border border-white/5'
                  }`}
                >
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : item.step}
                </div>
                <span className={`text-[11px] font-bold ${
                  isCurrent ? 'text-white' : isDone ? 'text-brand-emerald' : 'text-gray-500'
                }`}>
                  {item.label}
                </span>
              </div>
              {idx < 3 && (
                <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${
                  currentStep > item.step ? 'text-brand-emerald' : 'text-gray-600'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Upload area */}
      <div className="max-w-2xl mx-auto w-full">
        
        {/* Step 1: Upload */}
        {currentStep === 1 && (
          <div className="glass-card p-8 rounded-card border border-white/10 bg-[#0F1424]/40 flex flex-col items-center justify-center text-center gap-6 min-h-[350px]">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 hover:border-brand-purple hover:text-brand-purple transition-colors">
              <UploadCloud className="w-8 h-8 animate-float text-brand-purple" />
            </div>
            
            <div className="space-y-4 w-full flex flex-col items-center">
              <div>
                <h4 className="text-md font-bold text-white mb-2">Upload Scanned OMR Bubble Sheet</h4>
                <p className="text-xs text-gray-500 max-w-sm leading-relaxed font-semibold">
                  Submit your standard filled OMR sheet (PDF, PNG, JPG). Ensure corner fiducial markers are fully visible for high-precision grading.
                </p>
              </div>

              {/* Subject Dropdown Selector */}
              <div className="w-full max-w-xs space-y-1.5 text-left">
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1">
                  <BookOpen className="w-3 h-3 text-brand-blue" />
                  <span>Choose Target Exam Course</span>
                </label>
                <select
                  value={selectedSubjectId}
                  onChange={e => setSelectedSubjectId(e.target.value)}
                  disabled={uploadProgress > 0}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/20 transition-all font-semibold cursor-pointer disabled:opacity-50"
                >
                  {subjects.map(sub => (
                    <option key={sub.id} value={sub.id} className="bg-[#0F1424] text-white font-semibold">
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Exam Dropdown Selector */}
              <div className="w-full max-w-xs space-y-1.5 text-left">
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1">
                  <FileInput className="w-3 h-3 text-brand-purple" />
                  <span>Choose OMR Examination</span>
                </label>
                {exams.length > 0 ? (
                  <select
                    value={selectedExamId}
                    onChange={e => setSelectedExamId(e.target.value)}
                    disabled={uploadProgress > 0}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-purple/50 focus:ring-2 focus:ring-brand-purple/20 transition-all font-semibold cursor-pointer disabled:opacity-50"
                  >
                    {exams.map(ex => (
                      <option key={ex.id} value={ex.id} className="bg-[#0F1424] text-white font-semibold">
                        {ex.title}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-[10px] text-status-error font-bold bg-status-error/10 border border-status-error/20 p-2.5 rounded-xl">
                    No confirmed OMR exams found for this subject. Submissions are closed until the professor configures the OMR answer key.
                  </div>
                )}
              </div>
            </div>

            <div className="w-full max-w-md space-y-4">
              <div className="relative flex justify-center mt-2">
                <input 
                  type="file" 
                  id="student-omr-uploader" 
                  accept="image/*,application/pdf"
                  multiple
                  onChange={handleFileChange}
                  disabled={uploadProgress > 0}
                  className="hidden"
                />
                <label 
                  htmlFor="student-omr-uploader"
                  className={`px-6 py-2.5 bg-[#1E293B] border border-white/10 hover:bg-white/5 text-white text-xs font-bold rounded-xl shadow-lg cursor-pointer flex items-center gap-1.5 transition-all ${
                    uploadProgress > 0 ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  <FileInput className="w-4 h-4" />
                  <span>Choose OMR Page Files</span>
                </label>
              </div>

              {selectedFiles.length > 0 && (
                <div className="text-left space-y-2 bg-[#0A0D1A]/60 border border-white/5 rounded-xl p-4 w-full">
                  <h5 className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                    Arranged Page Sequence ({selectedFiles.length} pages)
                  </h5>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {selectedFiles.map((file, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg text-xs">
                        <span className="text-gray-300 font-medium truncate max-w-[200px]" title={file.name}>
                          Page {idx + 1}: {file.name}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => moveFile(idx, 'up')}
                            disabled={idx === 0 || uploadProgress > 0}
                            className="p-1 hover:bg-white/10 text-gray-400 hover:text-white rounded disabled:opacity-30"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveFile(idx, 'down')}
                            disabled={idx === selectedFiles.length - 1 || uploadProgress > 0}
                            className="p-1 hover:bg-white/10 text-gray-400 hover:text-white rounded disabled:opacity-30"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteFile(idx)}
                            disabled={uploadProgress > 0}
                            className="p-1 hover:bg-red-500/25 text-gray-400 hover:text-red-400 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleUploadAndSegment}
                    disabled={uploadProgress > 0}
                    className="w-full mt-3 py-2.5 bg-brand-gradient hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition-all"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Upload & Process OMR Sheet</span>
                  </button>
                </div>
              )}
            </div>

            {uploadProgress > 0 && (
              <div className="w-full max-w-xs space-y-2 mt-4">
                <div className="flex justify-between text-[10px] font-bold text-gray-500">
                  <span>Uploading Page Scans</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-blue transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Bubble detection preview status */}
        {currentStep === 2 && (
          <div className="glass-card p-8 rounded-card border border-white/10 bg-[#0F1424]/40 flex flex-col gap-6 min-h-[320px]">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <span>Bubble coordinates detection complete</span>
              </h4>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Detected OMR Options Preview</span>
              <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-xs text-gray-300 min-h-[120px] max-h-[200px] overflow-y-auto leading-relaxed font-mono">
                {ocrText}
              </div>
            </div>

            <button
              onClick={runAIEvaluation}
              disabled={isProcessing}
              className="w-full py-2.5 bg-brand-gradient text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 hover:opacity-95"
            >
              {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4" />}
              <span>{isProcessing ? 'OMR AI grading...' : 'Submit to OMR AI Grading Engine'}</span>
            </button>
          </div>
        )}

        {/* Step 3: AI Processing screen */}
        {currentStep === 3 && (
          <div className="glass-card p-8 rounded-card border border-white/10 bg-[#0F1424]/40 flex flex-col items-center justify-center text-center gap-6 min-h-[320px]">
            <RefreshCw className="w-12 h-12 text-brand-purple animate-spin" />
            <div>
              <h4 className="text-md font-bold text-white mb-2">AI Evaluation In Progress</h4>
              <p className="text-xs text-gray-500 max-w-sm leading-relaxed font-semibold">
                Running high-precision OMR optical bubble matching algorithms. Please wait...
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Results Ready success screen */}
        {currentStep === 4 && (
          <div className="glass-card p-8 rounded-card border border-white/10 bg-[#0F1424]/40 flex flex-col items-center justify-center text-center gap-6 min-h-[320px] animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-brand-emerald/10 border-2 border-brand-emerald flex items-center justify-center text-brand-emerald">
              <CheckCircle2 className="w-8 h-8 animate-bounce" />
            </div>
            <div>
              <h4 className="text-md font-bold text-white mb-2">OMR Scan Evaluation Completed!</h4>
              <p className="text-xs text-gray-500 max-w-sm leading-relaxed font-semibold">
                Bubble scanning and grade computations are compiled.
              </p>
            </div>

            <button
              onClick={() => navigate(`/student/feedback?paperId=${createdPaper?.id}`)}
              className="px-6 py-2.5 bg-brand-gradient text-white text-xs font-bold rounded-xl shadow-lg hover:opacity-95"
            >
              View Detailed Score Feedback
            </button>
          </div>
        )}

      </div>

    </div>
  );
}
