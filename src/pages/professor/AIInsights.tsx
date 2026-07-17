import React from 'react';
import { Sparkles, BrainCircuit, Target, TrendingDown } from 'lucide-react';

export default function AIInsights() {
  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-brand-purple" />
            <span>AI Insights</span>
          </h1>
          <p className="text-sm text-gray-400 max-w-2xl">
            View AI-generated learning gaps, performance predictions, and suggested class revision topics.
          </p>
        </div>
      </div>
      <div className="glass-card p-12 rounded-card border border-white/10 text-center bg-[#0F1424]/40">
        <BrainCircuit className="w-12 h-12 text-brand-purple mx-auto mb-4 animate-pulse" />
        <h4 className="text-md font-bold text-white">AI Engine Sync Complete</h4>
        <p className="text-xs text-gray-500 max-w-xs mx-auto mt-2 leading-relaxed">
          The SBERT and Linear Regression model reports no critical system warnings.
        </p>
      </div>
    </div>
  );
}
