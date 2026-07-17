import React from 'react';
import { History, FileText, CheckCircle } from 'lucide-react';

export default function HistoryPage() {
  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <History className="w-8 h-8 text-brand-blue" />
            <span>Evaluation History</span>
          </h1>
          <p className="text-sm text-gray-400 max-w-2xl">
            Track historical grade records, review teacher adjusters, and audit OCR transcripts.
          </p>
        </div>
      </div>
      <div className="glass-card p-12 rounded-card border border-white/10 text-center bg-[#0F1424]/40">
        <CheckCircle className="w-12 h-12 text-brand-emerald mx-auto mb-4" />
        <h4 className="text-md font-bold text-white">All Submissions Fully Evaluated</h4>
        <p className="text-xs text-gray-500 max-w-xs mx-auto mt-2 leading-relaxed">
          Historical records will be stored here as evaluations are saved.
        </p>
      </div>
    </div>
  );
}
