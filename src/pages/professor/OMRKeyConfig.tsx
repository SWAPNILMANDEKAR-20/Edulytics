import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, HelpCircle, CheckCircle2, ShieldAlert } from 'lucide-react';

interface OMRKeyRow {
  questionNo: number;
  correctOption: string;
}

export default function OMRKeyConfig() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [exam, setExam] = useState<any>(null);
  const [keys, setKeys] = useState<OMRKeyRow[]>([]);
  const [negativeMarking, setNegativeMarking] = useState<number>(0.25);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchExamAndKeys = async () => {
      try {
        const token = localStorage.getItem('token') || '';
        // 1. Fetch exam configuration details
        const examRes = await fetch('/api/exams', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (examRes.ok) {
          const examsData = await examRes.json();
          const currentExam = examsData.find((e: any) => e.id === id);
          if (currentExam) {
            setExam(currentExam);
            setNegativeMarking(currentExam.negative_marking !== undefined ? currentExam.negative_marking : 0.25);
            
            // 2. Fetch existing confirmed key
            const keyRes = await fetch(`/api/exams/${id}/omr-key`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (keyRes.ok) {
              const existingKeys = await keyRes.json();
              const totalQ = currentExam.total_questions || 15;
              const rows: OMRKeyRow[] = [];
              for (let q = 1; q <= totalQ; q++) {
                const found = existingKeys.find((k: any) => k.question_no === q);
                rows.push({
                  questionNo: q,
                  correctOption: found ? found.correct_option : 'A' // default to 'A'
                });
              }
              setKeys(rows);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load OMR key configuration:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchExamAndKeys();
  }, [id]);

  const handleOptionChange = (questionNo: number, option: string) => {
    setKeys(prev => prev.map(k => k.questionNo === questionNo ? { ...k, correctOption: option } : k));
  };

  const handleSaveKeys = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`/api/exams/${id}/omr-key/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ keys, negativeMarking })
      });

      if (res.ok) {
        alert('Answer key confirmed successfully!');
        navigate('/professor/exams');
      } else {
        const err = await res.json();
        alert(`Failed to save keys: ${err.error || 'Server error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error saving keys.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-gray-400">Loading OMR answer key registry...</div>;
  }

  if (!exam) {
    return (
      <div className="p-8 text-center text-white">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h4 className="font-bold">Exam registry not found</h4>
        <button onClick={() => navigate('/professor/exams')} className="mt-4 px-4 py-2 bg-white/10 rounded-xl text-xs font-semibold">
          Back to Exams
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Breadcrumbs / Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/professor/exams')}
          className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
            {exam.subject_id} &bull; OMR Bubble Configuration
          </span>
          <h1 className="text-2xl font-extrabold text-white">{exam.title}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Answer key selection board */}
        <div className="lg:col-span-2 glass-card p-6 rounded-card border border-white/10 bg-[#0F1424]/40 flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="text-md font-bold text-white">Define Correct Option per Question</h3>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
              {exam.total_questions || 15} Questions Total
            </span>
          </div>

          <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-3">
            {keys.map((k) => (
              <div 
                key={k.questionNo}
                className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl p-3 hover:bg-white/10 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-400">
                    Q{k.questionNo}
                  </span>
                  <span className="text-xs text-gray-300 font-semibold">Select single correct answer:</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {['A', 'B', 'C', 'D'].map((opt) => {
                    const isSelected = k.correctOption === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleOptionChange(k.questionNo, opt)}
                        className={`w-9 h-9 rounded-full text-xs font-bold border transition-all ${
                          isSelected 
                            ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' 
                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Configuration summary Card */}
        <div className="flex flex-col gap-6">
          <div className="glass-card p-6 rounded-card border border-white/10 bg-[#0F1424]/40 flex flex-col gap-6">
            <h4 className="text-sm font-bold text-white border-b border-white/5 pb-3">Exam Snapshot Settings</h4>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-semibold">Evaluation Mode</span>
                <span className="text-white font-bold uppercase">OMR Bubble</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-semibold">Total Questions</span>
                <span className="text-white font-bold">{exam.total_questions || 15}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-semibold">Marks Per Question</span>
                <span className="text-brand-emerald font-bold">+{exam.marks_per_question || 1.0}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-semibold font-bold">Negative Marking</span>
                <input 
                  type="number"
                  step="0.05"
                  min="0"
                  max="5"
                  value={negativeMarking}
                  onChange={(e) => setNegativeMarking(parseFloat(e.target.value) || 0)}
                  className="w-20 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-red-400 font-extrabold text-right focus:outline-none focus:border-red-400/50"
                />
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-semibold">Template Layout</span>
                <span className="text-indigo-400 font-bold">{exam.template_id || 'OMR-101'}</span>
              </div>
            </div>

            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 flex gap-3">
              <HelpCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-white">Config Instructions</span>
                <p className="text-[10px] text-indigo-200/75 leading-relaxed">
                  Provide the target answer key options. Submissions will be automatically graded using this key upon student upload.
                </p>
              </div>
            </div>

            <button
              onClick={handleSaveKeys}
              disabled={saving}
              className="w-full py-3 bg-brand-gradient hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Confirm Answer Key'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
