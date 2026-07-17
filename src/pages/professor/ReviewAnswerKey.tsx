import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FileText, ShieldAlert, CheckCircle, Save, ArrowLeft, 
  HelpCircle, AlertCircle, Edit, Trash2, Plus, UploadCloud,
  FileInput, ChevronUp, ChevronDown, X
} from 'lucide-react';

interface QuestionKey {
  id?: string;
  question_no: number;
  question_text: string;
  reference_answer: string;
  max_marks: number;
  extraction_confidence: number;
}

export default function ReviewAnswerKey() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<QuestionKey[]>([]);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchKey = async () => {
      try {
        const res = await fetch(`/api/exams/${id}/answer-key`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setQuestions(data.questions || []);
          setFileUrl(data.fileUrl);
          setIsConfirmed(data.isConfirmed);
        }
      } catch (err) {
        console.error('Failed to load answer key:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchKey();
  }, [id]);

  const handleFieldChange = (idx: number, field: keyof QuestionKey, val: any) => {
    setQuestions(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: val };
      return updated;
    });
  };

  const handleAddQuestion = () => {
    setQuestions(prev => [
      ...prev,
      {
        question_no: prev.length + 1,
        question_text: 'Define and explain...',
        reference_answer: '',
        max_marks: 10.0,
        extraction_confidence: 100.0
      }
    ]);
  };

  const handleDeleteQuestion = (idx: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleConfirmKey = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/exams/${id}/confirm-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({ questions })
      });
      if (res.ok) {
        alert('Answer key confirmed successfully! This exam is now open for student submissions.');
        navigate('/professor/subjects');
      } else {
        const err = await res.json();
        alert(`Failed to confirm answer key: ${err.error || 'Server error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error occurred.');
    } finally {
      setSaving(false);
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

  const handleUploadAndSegment = async () => {
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

    setUploading(true);
    try {
      const res = await fetch(`/api/exams/${id}/upload-key`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: formData
      });

      if (res.ok) {
        setShowUploadModal(false);
        setSelectedFiles([]);
        
        // Re-fetch the key
        const data = await res.json();
        setQuestions(data.questions || []);
        setFileUrl(data.fileUrl);
        setIsConfirmed(false);
      } else {
        const err = await res.json();
        alert(`Segmentation failed: ${err.error || 'VLM failed to transcribe key'}`);
      }
    } catch (err) {
      console.error(err);
      alert('File upload failed.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-gray-400">
        <HelpCircle className="w-8 h-8 animate-spin text-brand-blue" />
        <span className="text-xs font-bold font-mono">Running VLM Answer Key Segmentation...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-10">
      
      {/* Top action header */}
      <div className="flex justify-between items-center">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
        
        <div className="flex gap-2">
          <button 
            onClick={handleAddQuestion}
            className="flex items-center gap-1 px-4 py-2 bg-white/5 border border-white/10 text-white rounded-xl text-xs font-bold hover:bg-white/10"
          >
            <Plus className="w-4 h-4" />
            <span>Add Question Row</span>
          </button>
          
          <button 
            onClick={handleConfirmKey}
            disabled={saving || questions.length === 0}
            className="flex items-center gap-1.5 px-5 py-2 bg-brand-gradient hover:opacity-90 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg transition-all"
          >
            {saving ? <HelpCircle className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            <span>Confirm Answer Key & Activate Exam</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
          <FileText className="w-7 h-7 text-brand-purple" />
          <span>Review Answer Key & OCR Output</span>
        </h1>
        <p className="text-xs text-gray-400 max-w-3xl leading-relaxed">
          The AI model has segmented your uploaded answer key. Review and correct any transcribed question texts or reference answers below. <strong>Your confirmed entries are the single source of truth used for grading all student submissions.</strong>
        </p>
      </div>

      {/* Main split dashboard panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* Left Side: Uploaded PDF/Image Scan */}
        <div className="glass-card rounded-card border border-white/10 p-5 bg-[#0F1424]/40 flex flex-col gap-4 sticky top-6">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">Uploaded Reference Sheet Scan</h4>
            <button
              onClick={() => {
                setShowUploadModal(true);
                setSelectedFiles([]);
              }}
              className="px-3 py-1 bg-brand-purple/10 border border-brand-purple/20 hover:bg-brand-purple/20 text-brand-purple rounded-lg text-[10px] font-bold transition-all flex items-center gap-1"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Change Answer Sheet</span>
            </button>
          </div>
          <div className="border border-white/5 rounded-xl bg-black/40 overflow-hidden flex items-center justify-center min-h-[500px]">
            {fileUrl ? (
              fileUrl.endsWith('.pdf') ? (
                <iframe src={fileUrl} className="w-full h-[600px] border-none" title="PDF Viewer" />
              ) : (
                <img src={fileUrl} className="w-full object-contain max-h-[600px]" alt="Answer Key Document" />
              )
            ) : (
              <div className="text-center p-8 text-gray-600">
                <AlertCircle className="w-10 h-10 mx-auto mb-2" />
                <span className="text-xs">No reference document found. Using textbook defaults.</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Question Form Fields */}
        <div className="flex flex-col gap-4">
          <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">Extracted Question & Ground Truth Reference Fields</h4>
          
          {questions.length === 0 ? (
            <div className="glass-panel p-8 rounded-card text-center bg-[#0F1424]/40 border border-status-warning/20">
              <ShieldAlert className="w-8 h-8 text-status-warning mx-auto mb-3 animate-pulse" />
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider mb-2">Automated Extraction Failed</h4>
              <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4 leading-relaxed font-semibold">
                The Gemini model did not automatically extract questions from this image, or the image has not been processed. You can click the button below to add your questions manually.
              </p>
              <button 
                onClick={handleAddQuestion}
                className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-xl text-xs font-bold hover:bg-white/10 transition-colors"
              >
                + Add Question Row Manually
              </button>
            </div>
          ) : (
            questions.map((q, idx) => {
              const lowConfidence = q.extraction_confidence < 80;
              return (
                <div 
                  key={idx}
                  className={`glass-card p-5 rounded-card border transition-all bg-[#0F1424]/40 ${
                    lowConfidence ? 'border-status-warning/40 shadow-lg shadow-status-warning/5' : 'border-white/10'
                  }`}
                >
                  {/* Header Row */}
                  <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-extrabold text-white px-2.5 py-1 bg-white/5 rounded-lg border border-white/10">
                        Q{q.question_no}
                      </span>
                      {lowConfidence && (
                        <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-status-warning/15 text-status-warning border border-status-warning/20 flex items-center gap-1 animate-pulse">
                          <ShieldAlert className="w-3 h-3" />
                          <span>Review Mandatory ({Math.round(q.extraction_confidence)}% Conf)</span>
                        </span>
                      )}
                    </div>
                    <button 
                      onClick={() => handleDeleteQuestion(idx)}
                      className="p-1.5 rounded hover:bg-white/5 text-gray-500 hover:text-status-error transition-colors"
                      title="Delete Question"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Edit Fields */}
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] text-gray-500 font-bold uppercase">Question Number</label>
                        <input 
                          type="number"
                          value={q.question_no}
                          onChange={e => handleFieldChange(idx, 'question_no', parseInt(e.target.value))}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 font-bold uppercase">Max Marks</label>
                        <input 
                          type="number"
                          value={q.max_marks}
                          onChange={e => handleFieldChange(idx, 'max_marks', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 font-bold uppercase">Question Text</label>
                      <textarea 
                        rows={2}
                        value={q.question_text}
                        onChange={e => handleFieldChange(idx, 'question_text', e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none font-semibold leading-relaxed"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 font-bold uppercase">Reference Model Answer (Ground Truth)</label>
                      <textarea 
                        rows={4}
                        value={q.reference_answer}
                        onChange={e => handleFieldChange(idx, 'reference_answer', e.target.value)}
                        placeholder="Type or correct the model answer details here..."
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none font-medium leading-relaxed"
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MODAL: Upload Answer Key */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="fixed inset-0" onClick={() => setShowUploadModal(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-bg-card border border-white/10 shadow-2xl p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-lg font-bold text-white">Change Reference Answer Key</h3>
              <button 
                onClick={() => setShowUploadModal(false)} 
                className="text-gray-500 hover:text-white transition-colors"
                disabled={uploading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-gray-400">
                Select one or more scan pages of the professor's new model answer sheet. You can drag and drop or use the ordering arrows to set the correct sequence.
              </p>

              <div className="relative flex justify-center">
                <input 
                  type="file" 
                  id="modal-key-uploader" 
                  accept="image/*,application/pdf"
                  multiple
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="hidden"
                />
                <label 
                  htmlFor="modal-key-uploader"
                  className={`px-6 py-2.5 bg-[#1E293B] border border-white/10 hover:bg-white/5 text-white text-xs font-bold rounded-xl shadow-lg cursor-pointer flex items-center gap-1.5 transition-all ${
                    uploading ? 'opacity-50 pointer-events-none' : ''
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
                            disabled={idx === 0 || uploading}
                            className="p-1 hover:bg-white/10 text-gray-400 hover:text-white rounded disabled:opacity-30"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveFile(idx, 'down')}
                            disabled={idx === selectedFiles.length - 1 || uploading}
                            className="p-1 hover:bg-white/10 text-gray-400 hover:text-white rounded disabled:opacity-30"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteFile(idx)}
                            disabled={uploading}
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
                    disabled={uploading}
                    className="w-full mt-3 py-2.5 bg-brand-gradient hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition-all"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>{uploading ? 'Segmenting Key...' : 'Upload & Process New Key'}</span>
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
