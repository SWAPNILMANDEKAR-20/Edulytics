import React, { useState } from 'react';
import { 
  Sliders, Plus, Trash2, Tag, Info, AlertTriangle, 
  Award, Sparkles, BookOpen, Save, Copy
} from 'lucide-react';

interface Concept {
  id: string;
  name: string;
  weight: number; // percentage (0 to 100)
}

interface RubricTemplate {
  id: string;
  name: string;
  maxMarks: number;
  bloomsLevel: string;
  concepts: Concept[];
  keywords: string[];
}

export default function RubricBuilder() {
  const [templateName, setTemplateName] = useState('Data Structures Rubric');
  const [maxMarks, setMaxMarks] = useState(10);
  const [bloomsLevel, setBloomsLevel] = useState('Apply');
  const [keywordInput, setKeywordInput] = useState('');
  const [keywords, setKeywords] = useState<string[]>(['LIFO', 'push', 'pop', 'top']);
  const [concepts, setConcepts] = useState<Concept[]>([
    { id: 'c1', name: 'Stack core mechanism', weight: 40 },
    { id: 'c2', name: 'Push and Pop routine', weight: 30 },
    { id: 'c3', name: 'Top pointer definition', weight: 30 }
  ]);

  const [savedTemplates, setSavedTemplates] = useState<RubricTemplate[]>([
    {
      id: 't1',
      name: 'Stack LIFO Rubric',
      maxMarks: 10,
      bloomsLevel: 'Apply',
      concepts: [
        { id: 'c1', name: 'Stack core mechanism', weight: 40 },
        { id: 'c2', name: 'Push and Pop routine', weight: 30 },
        { id: 'c3', name: 'Top pointer definition', weight: 30 }
      ],
      keywords: ['LIFO', 'push', 'pop', 'top']
    },
    {
      id: 't2',
      name: 'Cell Division Rubric',
      maxMarks: 15,
      bloomsLevel: 'Understand',
      concepts: [
        { id: 'cc1', name: 'Mitosis stages explanation', weight: 50 },
        { id: 'cc2', name: 'Meiosis comparison', weight: 50 }
      ],
      keywords: ['chromosomes', 'spindle', 'cytokinesis', 'anaphase']
    }
  ]);

  const addKeyword = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && keywordInput.trim() !== '') {
      e.preventDefault();
      if (!keywords.includes(keywordInput.trim())) {
        setKeywords(prev => [...prev, keywordInput.trim()]);
      }
      setKeywordInput('');
    }
  };

  const removeKeyword = (kw: string) => {
    setKeywords(prev => prev.filter(k => k !== kw));
  };

  const addConcept = () => {
    const id = 'c_' + Math.random().toString(36).substr(2, 9);
    setConcepts(prev => [...prev, { id, name: 'New Concept Criteria', weight: 0 }]);
  };

  const removeConcept = (id: string) => {
    setConcepts(prev => prev.filter(c => c.id !== id));
  };

  const handleWeightChange = (id: string, weight: number) => {
    setConcepts(prev => prev.map(c => {
      if (c.id === id) {
        return { ...c, weight };
      }
      return c;
    }));
  };

  const handleConceptNameChange = (id: string, name: string) => {
    setConcepts(prev => prev.map(c => {
      if (c.id === id) {
        return { ...c, name };
      }
      return c;
    }));
  };

  const totalWeight = concepts.reduce((sum, c) => sum + c.weight, 0);

  const saveTemplate = () => {
    if (totalWeight !== 100) {
      alert('Weights must sum exactly to 100%!');
      return;
    }
    const newTemplate: RubricTemplate = {
      id: 't_' + Math.random().toString(36).substr(2, 9),
      name: templateName,
      maxMarks,
      bloomsLevel,
      concepts,
      keywords
    };
    setSavedTemplates(prev => [...prev, newTemplate]);
    alert('Rubric Template successfully saved!');
  };

  const loadTemplate = (t: RubricTemplate) => {
    setTemplateName(t.name);
    setMaxMarks(t.maxMarks);
    setBloomsLevel(t.bloomsLevel);
    setConcepts(t.concepts);
    setKeywords(t.keywords);
  };

  const deleteTemplate = (id: string) => {
    setSavedTemplates(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="flex flex-col gap-8 pb-10">
      
      {/* Header */}
      <div className="flex justify-between items-start flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
          <Sliders className="w-8 h-8 text-brand-blue" />
          <span>Rubrics Builder</span>
        </h1>
        <p className="text-sm text-gray-400 max-w-2xl">
          Construct semantic guidelines, link expect concepts to weight multipliers, assign Bloom's taxonomy scopes, and save templates.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Builder Form */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="glass-card p-6 rounded-card border border-white/10 bg-[#0F1424]/40 flex flex-col gap-5">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/5 pb-3">
              Configure Criteria
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-semibold">Template Name</label>
                <input 
                  type="text" 
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-semibold">Maximum Marks</label>
                <input 
                  type="number" 
                  value={maxMarks}
                  onChange={e => setMaxMarks(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Bloom's Taxonomy selector */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-semibold">Bloom's Taxonomy Cognitive Level</label>
              <select 
                value={bloomsLevel}
                onChange={e => setBloomsLevel(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
              >
                <option value="Remember">Remember / Recall (Define, list, state)</option>
                <option value="Understand">Understand (Explain, discuss, describe)</option>
                <option value="Apply">Apply (Implement, solve, execute)</option>
                <option value="Analyze">Analyze (Differentiate, compare, outline)</option>
                <option value="Evaluate">Evaluate (Appraise, critique, defend)</option>
                <option value="Create">Create (Construct, design, formulate)</option>
              </select>
            </div>

            {/* Keyword tag input */}
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-semibold">Keywords (Press Enter to add)</label>
              <div className="relative flex items-center">
                <Tag className="absolute left-3.5 w-4 h-4 text-gray-500" />
                <input 
                  type="text" 
                  placeholder="Add target keyword..."
                  value={keywordInput}
                  onChange={e => setKeywordInput(e.target.value)}
                  onKeyDown={addKeyword}
                  className="w-full pl-11 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap gap-2 mt-1">
                {keywords.map(kw => (
                  <span 
                    key={kw}
                    className="px-2.5 py-1 rounded bg-brand-blue/10 border border-brand-blue/20 text-brand-blue text-xs font-bold flex items-center gap-1.5"
                  >
                    <span>{kw}</span>
                    <button onClick={() => removeKeyword(kw)} className="text-brand-blue hover:text-white">&times;</button>
                  </span>
                ))}
              </div>
            </div>

            {/* Weight Sliders container */}
            <div className="space-y-4 border-t border-white/5 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Concept weightage breakdown</span>
                <button 
                  onClick={addConcept}
                  className="flex items-center gap-1 text-[10px] text-brand-blue font-bold hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Concept</span>
                </button>
              </div>

              <div className="space-y-4">
                {concepts.map((concept) => (
                  <div 
                    key={concept.id}
                    className="p-3 bg-white/5 border border-white/5 rounded-xl flex flex-col gap-3"
                  >
                    <div className="flex justify-between items-center">
                      <input 
                        type="text" 
                        value={concept.name}
                        onChange={e => handleConceptNameChange(concept.id, e.target.value)}
                        className="bg-transparent border-b border-transparent hover:border-white/20 focus:border-brand-blue text-xs text-white font-bold outline-none flex-1 max-w-[280px]"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-brand-blue font-bold">{concept.weight}%</span>
                        <button 
                          onClick={() => removeConcept(concept.id)}
                          className="p-1 text-gray-500 hover:text-status-error transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={concept.weight}
                      onChange={e => handleWeightChange(concept.id, parseInt(e.target.value))}
                      className="w-full accent-brand-blue bg-white/5"
                    />
                  </div>
                ))}
              </div>

              {/* Validation alert */}
              <div className={`p-3 rounded-lg flex items-center justify-between text-xs font-bold ${
                totalWeight === 100 
                  ? 'bg-brand-emerald/10 border border-brand-emerald/20 text-brand-emerald' 
                  : 'bg-status-warning/10 border border-status-warning/20 text-status-warning'
              }`}>
                <div className="flex items-center gap-1.5">
                  <Info className="w-4 h-4" />
                  <span>Total Concept Weight Sum: {totalWeight}%</span>
                </div>
                {totalWeight !== 100 && (
                  <span className="text-[10px] uppercase font-bold">Must sum exactly to 100%</span>
                )}
              </div>

            </div>

            {/* Form footer */}
            <div className="border-t border-white/5 pt-4 flex gap-3">
              <button 
                onClick={saveTemplate}
                className="w-full py-2.5 bg-brand-gradient text-white rounded-xl text-xs font-bold hover:opacity-90 shadow-lg flex items-center justify-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Save Rubric Template</span>
              </button>
            </div>

          </div>
        </div>

        {/* Right Side: Saved Templates list */}
        <div className="flex flex-col gap-6">
          <div className="glass-card p-6 rounded-card border border-white/10 bg-[#0F1424]/40 flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <BookOpen className="w-4 h-4 text-brand-blue" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Saved Templates Library
              </h3>
            </div>

            <div className="flex flex-col gap-3">
              {savedTemplates.map(t => (
                <div 
                  key={t.id}
                  className="p-3.5 bg-white/[0.015] border border-white/5 rounded-xl hover:bg-white/[0.035] transition-colors flex flex-col gap-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-bold text-white">{t.name}</h4>
                      <p className="text-[10px] text-gray-500 mt-1">
                        Max Marks: {t.maxMarks} • Level: {t.bloomsLevel}
                      </p>
                    </div>
                    <button 
                      onClick={() => deleteTemplate(t.id)}
                      className="text-gray-500 hover:text-status-error transition-colors p-1"
                      title="Delete Template"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => loadTemplate(t)}
                      className="flex-1 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Load Template</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
