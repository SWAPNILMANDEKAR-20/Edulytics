import React from 'react';
import { 
  Sparkles, CheckCircle2, AlertTriangle, BookOpen, 
  TrendingUp, Award, Target, BrainCircuit 
} from 'lucide-react';

export default function StudentAIFeedback() {
  
  const strongTopics = [
    { topic: 'Stacks & Queues', description: '92% mastery. Correct stack LIFO pop/push pointer references.', subject: 'CS-301' },
    { topic: 'Cell Cycle Cytokinesis', description: '89% mastery. Correct descriptions of animal vs plant division.', subject: 'BIO-205' },
    { topic: 'Organic Carbon Bonds', description: '80% mastery. Correct molecular structural drawings.', subject: 'CHM-101' }
  ];

  const focusAreas = [
    { topic: 'BST Traversal & Node Deletion', description: '54% mastery. SBERT OCR marks recursive heap logic missing.', subject: 'CS-301' },
    { topic: 'Set Relations & Mappings', description: '68% mastery. Difficulty in discrete surjective function proofs.', subject: 'MTH-102' }
  ];

  const commonMistakes = [
    { pattern: 'Strict mathematical proof formats', description: 'Losing points on MTH-102 by writing descriptions instead of inductive logic.' },
    { pattern: 'Omitting base classification labels', description: 'Forgetting core keywords (e.g. linear structure, meiosis phase) in essay lines.' }
  ];

  return (
    <div className="flex flex-col gap-8 pb-10">
      
      {/* Header */}
      <div className="flex justify-between items-start flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-brand-purple" />
          <span>Strength & Focus Areas Report</span>
        </h1>
        <p className="text-sm text-gray-400 max-w-2xl">
          Constructive, AI-powered evaluations mapping conceptual masteries, focus opportunities, mistake frequencies, and progress predictions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Strengths & Weaknesses */}
        <div className="flex flex-col gap-6">
          
          {/* Strengths */}
          <div className="glass-card p-6 rounded-card border border-white/10 bg-[#0F1424]/40 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-brand-emerald uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-3">
              <CheckCircle2 className="w-4 h-4" />
              <span>Strong Concepts (Mastered Topics)</span>
            </h3>

            <div className="flex flex-col gap-3">
              {strongTopics.map((item, idx) => (
                <div key={idx} className="p-3.5 bg-white/[0.015] border border-white/5 rounded-xl flex gap-3 hover:bg-white/[0.035] transition-colors">
                  <div className="w-1.5 h-10 rounded-full bg-brand-emerald shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <span>{item.topic}</span>
                      <span className="px-1.5 py-0.2 rounded bg-brand-emerald/10 border border-brand-emerald/20 text-brand-emerald text-[8px] font-bold uppercase">
                        {item.subject}
                      </span>
                    </h4>
                    <p className="text-[10px] text-gray-500 mt-1 leading-snug font-semibold">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Focus Areas */}
          <div className="glass-card p-6 rounded-card border border-white/10 bg-[#0F1424]/40 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-status-warning uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-3">
              <AlertTriangle className="w-4 h-4" />
              <span>Focus Areas (Opportunities)</span>
            </h3>

            <div className="flex flex-col gap-3">
              {focusAreas.map((item, idx) => (
                <div key={idx} className="p-3.5 bg-white/[0.015] border border-white/5 rounded-xl flex gap-3 hover:bg-white/[0.035] transition-colors">
                  <div className="w-1.5 h-10 rounded-full bg-status-warning shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <span>{item.topic}</span>
                      <span className="px-1.5 py-0.2 rounded bg-status-warning/10 border border-status-warning/20 text-status-warning text-[8px] font-bold uppercase">
                        {item.subject}
                      </span>
                    </h4>
                    <p className="text-[10px] text-gray-500 mt-1 leading-snug font-semibold">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right: Mistake patterns & study plan */}
        <div className="flex flex-col gap-6">
          
          {/* Mistake patterns */}
          <div className="glass-card p-6 rounded-card border border-white/10 bg-[#0F1424]/40 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-3">
              <BrainCircuit className="w-4 h-4 text-brand-purple" />
              <span>Common Mistake Patterns</span>
            </h3>

            <div className="flex flex-col gap-3">
              {commonMistakes.map((item, idx) => (
                <div key={idx} className="p-3 bg-white/5 border border-white/5 rounded-xl">
                  <h4 className="text-xs font-bold text-white leading-normal">{item.pattern}</h4>
                  <p className="text-[10px] text-gray-500 mt-1 leading-snug font-semibold">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Motivational prediction card */}
          <div className="glass-card p-6 rounded-card border border-white/10 bg-brand-gradient flex flex-col gap-4 text-white">
            <h3 className="text-sm font-extrabold uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
              <TrendingUp className="w-4 h-4" />
              <span>AI Performance Prediction</span>
            </h3>

            <p className="text-xs leading-relaxed font-semibold">
              "By resolving the focus areas in BST traversal and inductive mathematics, linear regression predicts a score potential of **84%** (+5.6%) in the final exam dossiers."
            </p>

            <button 
              onClick={() => alert('Custom revision study plan compiled.')}
              className="mt-2 py-2 bg-white text-brand-purple rounded-xl text-xs font-bold shadow hover:bg-gray-100 transition-colors"
            >
              Generate Custom Study Plan
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
