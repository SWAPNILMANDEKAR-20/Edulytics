import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileSpreadsheet, Plus, UploadCloud, CheckCircle, ShieldAlert,
  ArrowRight, X, AlertCircle, FileText, ChevronUp, ChevronDown, Trash2
} from 'lucide-react';
import { API_URL } from '../../utils/api';

interface Exam {
  id: string;
  subject_id: string;
  title: string;
  is_answer_key_confirmed: boolean;
  answer_key_file_url?: string;
  created_at?: string;
  evaluation_type?: string;
}

export default function Exams() {
  const navigate = useNavigate();

  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal/form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [uploadingExamId, setUploadingExamId] = useState<string | null>(null);
  const [showUploadModalId, setShowUploadModalId] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // OMR configurations state
  const [evaluationType, setEvaluationType] = useState('descriptive');
  const [examDate, setExamDate] = useState('');
  const [totalQuestions, setTotalQuestions] = useState('15');
  const [marksPerQuestion, setMarksPerQuestion] = useState('1.0');
  const [negativeMarking, setNegativeMarking] = useState('0.25');
  const [department, setDepartment] = useState('');
  const [semester, setSemester] = useState('');
  const [templateId, setTemplateId] = useState('OMR-101');

  // Load professor preference settings for defaults
  const [prefSettings, setPrefSettings] = useState<any>(null);

  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const token = localStorage.getItem('token') || '';
        const res = await fetch(`${API_URL}/api/professor/settings`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const { settings } = await res.json();
          if (settings) {
            setPrefSettings(settings);
          }
        }
      } catch (err) {
        console.error('Failed to load professor defaults:', err);
      }
    };
    fetchPrefs();
  }, []);

  const openCreateModal = () => {
    if (prefSettings) {
      setEvaluationType(prefSettings.defaultEvaluationMode || 'descriptive');
      setMarksPerQuestion(prefSettings.defaultMarksPerQuestion?.toString() || '1.0');
      setNegativeMarking(prefSettings.defaultNegativeMarking?.toString() || '0.0');
    }
    setShowCreateModal(true);
  };

  const fetchExamsAndSubjects = async () => {
    try {
      // Fetch subjects to populate selector
      const subRes = await fetch(`${API_URL}/api/subjects`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      });
      if (subRes.ok) {
        const subData = await subRes.json();
        setSubjects(subData);
        if (subData.length > 0) setSelectedSubjectId(subData[0].id);

        // Fetch all exams
        const examRes = await fetch(`${API_URL}/api/exams`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
        });
        if (examRes.ok) {
          const examData = await examRes.json();
          setExams(examData);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExamsAndSubjects();
  }, []);

  const handleCreateExam = async (e: React.FormEvent) => {
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
          evaluationType,
          examDate: examDate || null,
          totalQuestions: evaluationType === 'omr' ? parseInt(totalQuestions) : null,
          marksPerQuestion: evaluationType === 'omr' ? parseFloat(marksPerQuestion) : 1.0,
          negativeMarking: evaluationType === 'omr' ? parseFloat(negativeMarking) : 0.0,
          department: department || null,
          semester: semester || null,
          templateId: evaluationType === 'omr' ? templateId : null
        })
      });

      if (res.ok) {
        setShowCreateModal(false);
        setNewTitle('');
        setEvaluationType('descriptive');
        setExamDate('');
        setTotalQuestions('15');
        setMarksPerQuestion('1.0');
        setNegativeMarking('0.25');
        setDepartment('');
        setSemester('');
        setTemplateId('OMR-101');
        fetchExamsAndSubjects();
      } else {
        const err = await res.json();
        alert(`Failed to create exam: ${err.error || 'Server error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Error creating exam.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleUploadAndSegment = async (examId: string) => {
    if (selectedFiles.length === 0) {
      alert('Please select at least one file.');
      return;
    }

    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('sheets', file);
    });

    const fileOrder = selectedFiles.map(f => f.name).join(',');
    formData.append('fileOrder', fileOrder);

    setUploadingExamId(examId);
    try {
      const res = await fetch(`${API_URL}/api/exams/${examId}/upload-key`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: formData
      });

      if (res.ok) {
        setShowUploadModalId(null);
        setSelectedFiles([]);
        navigate(`/professor/exams/${examId}/review-key`);
      } else {
        const err = await res.json();
        alert(`Segmentation failed: ${err.error || 'VLM failed to transcribe key'}`);
      }
    } catch (err) {
      console.error(err);
      alert('File upload failed.');
    } finally {
      setUploadingExamId(null);
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-gray-500">Loading exams list...</div>;
  }

  return (
    <div className="flex flex-col gap-8 pb-10">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <FileSpreadsheet className="w-8 h-8 text-brand-purple" />
            <span>Exam Management</span>
          </h1>
          <p className="text-sm text-gray-400 max-w-2xl">
            Configure examination schedules, upload model answer keys (ground truth), and review VLM OCR segmentations.
          </p>
        </div>
        <button 
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-gradient hover:opacity-90 text-white text-xs font-bold rounded-xl shadow-lg"
        >
          <Plus className="w-4 h-4" />
          <span>New Examination</span>
        </button>
      </div>

      {/* Exams Grid */}
      {exams.length === 0 ? (
        <div className="glass-card p-12 rounded-card border border-white/10 text-center bg-[#0F1424]/40">
          <FileSpreadsheet className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h4 className="text-md font-bold text-white">No Examinations Configured</h4>
          <p className="text-xs text-gray-500 max-w-xs mx-auto mt-2 leading-relaxed font-semibold">
            Create an exam and upload a professor model answer sheet to start grading student submissions.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.map(exam => {
            const subject = subjects.find(s => s.id === exam.subject_id);
            const isConfirmed = exam.is_answer_key_confirmed;
            const isUploading = uploadingExamId === exam.id;
            const isOMR = exam.evaluation_type === 'omr';

            return (
              <div 
                key={exam.id}
                className="glass-card p-6 rounded-card border border-white/10 flex flex-col justify-between gap-5 bg-[#0F1424]/40 relative group hover:border-brand-purple/30 transition-all"
              >
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded bg-brand-purple/15 text-brand-purple border border-brand-purple/20">
                        {subject ? subject.code : 'EXAM'}
                      </span>
                      <span className={`text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded border ${
                        isOMR ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20' : 'bg-pink-500/15 text-pink-400 border-pink-500/20'
                      }`}>
                        {isOMR ? 'OMR' : 'Descriptive'}
                      </span>
                    </div>
                    
                    {isConfirmed ? (
                      <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-brand-emerald/15 text-brand-emerald border border-brand-emerald/20 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-status-warning/15 text-status-warning border border-status-warning/20 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" />
                        <span>Pending Key</span>
                      </span>
                    )}
                  </div>
                  
                  <h4 className="text-md font-bold text-white mt-4">{exam.title}</h4>
                  <p className="text-[10px] text-gray-500 font-semibold mt-1">
                    {subject ? subject.name : 'Taught Course'}
                  </p>
                </div>

                <div className="border-t border-white/5 pt-4 flex flex-col gap-3">
                  {!isConfirmed ? (
                    <div className="flex flex-col gap-2">
                      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">
                        Configure Answer Key
                      </div>
                      
                      {isOMR ? (
                        <button 
                          onClick={() => navigate(`/professor/exams/${exam.id}/omr-key-config`)}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Input Correct Answers</span>
                        </button>
                      ) : (
                        <button 
                          onClick={() => {
                            setShowUploadModalId(exam.id);
                            setSelectedFiles([]);
                          }}
                          disabled={isUploading}
                          className={`w-full py-2 bg-white/5 border border-white/10 hover:bg-brand-purple/10 hover:border-brand-purple/20 text-gray-400 hover:text-brand-purple rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            isUploading ? 'opacity-50 pointer-events-none' : ''
                          }`}
                        >
                          <UploadCloud className="w-4 h-4" />
                          <span>{isUploading ? 'Segmenting Key...' : 'Upload Reference Scan'}</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <button 
                      onClick={() => navigate(isOMR ? `/professor/exams/${exam.id}/omr-key-config` : `/professor/exams/${exam.id}/review-key`)}
                      className="w-full py-2 bg-brand-purple/10 border border-brand-purple/20 text-brand-purple rounded-xl text-xs font-bold hover:bg-brand-purple/20 transition-all flex items-center justify-center gap-1.5"
                    >
                      <FileText className="w-4 h-4" />
                      <span>{isOMR ? 'Configure Option Key' : 'View / Edit Answer Key'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Create Exam */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="fixed inset-0" onClick={() => setShowCreateModal(false)} />
          <div className="relative w-full max-w-lg rounded-2xl bg-bg-card border border-white/10 shadow-2xl p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-lg font-bold text-white">Initialize New Exam Registry</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExam} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-semibold">Course Subject</label>
                  <select 
                    value={selectedSubjectId}
                    onChange={e => setSelectedSubjectId(e.target.value)}
                    required 
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                  >
                    {subjects.map(sub => (
                      <option key={sub.id} value={sub.id} className="bg-[#0F1424]">
                        {sub.code} - {sub.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-semibold">Evaluation Mode</label>
                  <select 
                    value={evaluationType}
                    onChange={e => setEvaluationType(e.target.value)}
                    required 
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                  >
                    <option value="descriptive" className="bg-[#0F1424]">Descriptive AI Grading</option>
                    <option value="omr" className="bg-[#0F1424]">OMR (Bubble Sheet)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-semibold">Exam Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. Midterm Examination"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  required 
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              {evaluationType === 'omr' ? (
                <>
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
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-400 font-semibold">Semester</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Fall 2026"
                        value={semester}
                        onChange={e => setSemester(e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
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
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-400 font-semibold">Bubble Template Layout</label>
                      <select 
                        value={templateId}
                        onChange={e => setTemplateId(e.target.value)}
                        required 
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                      >
                        <option value="OMR-101" className="bg-[#0F1424]">Standard 15-Question (OMR-101)</option>
                        <option value="OMR-202" className="bg-[#0F1424]">Standard 30-Question (OMR-202)</option>
                      </select>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-semibold">Exam Date (Optional)</label>
                  <input 
                    type="date"
                    value={examDate}
                    onChange={e => setExamDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>
              )}

              <button 
                type="submit"
                className="w-full mt-2 py-2.5 bg-brand-gradient text-white text-xs font-bold rounded-xl hover:opacity-90 transition-all"
              >
                Create Registry
              </button>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: Upload Answer Key */}
      {showUploadModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="fixed inset-0" onClick={() => setShowUploadModalId(null)} />
          <div className="relative w-full max-w-md rounded-2xl bg-bg-card border border-white/10 shadow-2xl p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-lg font-bold text-white">Upload Reference Answer Key</h3>
              <button 
                onClick={() => setShowUploadModalId(null)} 
                className="text-gray-500 hover:text-white transition-colors"
                disabled={uploadingExamId !== null}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-gray-400">
                Select one or more scan pages of the professor's model answer sheet. You can drag and drop or use the ordering arrows to set the correct sequence.
              </p>

              <div className="relative flex justify-center">
                <input 
                  type="file" 
                  id="modal-key-uploader" 
                  accept="image/*,application/pdf"
                  multiple
                  onChange={handleFileChange}
                  disabled={uploadingExamId !== null}
                  className="hidden"
                />
                <label 
                  htmlFor="modal-key-uploader"
                  className={`px-6 py-2.5 bg-[#1E293B] border border-white/10 hover:bg-white/5 text-white text-xs font-bold rounded-xl shadow-lg cursor-pointer flex items-center gap-1.5 transition-all ${
                    uploadingExamId !== null ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Choose Page Files</span>
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
                            disabled={idx === 0 || uploadingExamId !== null}
                            className="p-1 hover:bg-white/10 text-gray-400 hover:text-white rounded disabled:opacity-30"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveFile(idx, 'down')}
                            disabled={idx === selectedFiles.length - 1 || uploadingExamId !== null}
                            className="p-1 hover:bg-white/10 text-gray-400 hover:text-white rounded disabled:opacity-30"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteFile(idx)}
                            disabled={uploadingExamId !== null}
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
                    onClick={() => handleUploadAndSegment(showUploadModalId)}
                    disabled={uploadingExamId !== null}
                    className="w-full mt-3 py-2.5 bg-brand-gradient hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition-all"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>{uploadingExamId !== null ? 'Segmenting Key...' : 'Upload & Process Key'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
