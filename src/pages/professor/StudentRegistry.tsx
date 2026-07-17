import React, { useState } from 'react';
import { 
  Users, Search, Filter, GraduationCap, ChevronRight, 
  Award, BookOpen, UserCheck, TrendingUp
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';

interface Student {
  roll: string;
  name: string;
  dept: string;
  semester: number;
  avgMark: number;
  weakSubjects: string[];
  trend: number[];
}

export default function StudentRegistry() {
  const [searchTerm, setSearchTerm] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('All');

  const students: Student[] = [
    { roll: 'CS24B1001', name: 'John Doe', dept: 'Computer Science & Eng', semester: 4, avgMark: 78.4, weakSubjects: ['Trees', 'Graphs'], trend: [72, 75, 78, 78.4] },
    { roll: 'BIO24A2011', name: 'Julius Caesar', dept: 'Cell Biology and Genetics', semester: 3, avgMark: 81.2, weakSubjects: ['Genetics'], trend: [82, 80, 81.2] },
    { roll: 'BIO24A2012', name: 'Cleopatra Queen', dept: 'Cell Biology and Genetics', semester: 3, avgMark: 74.5, weakSubjects: ['Cell Division'], trend: [70, 72, 74.5] },
    { roll: 'CHM24C1021', name: 'Alexander Great', dept: 'Chemistry', semester: 1, avgMark: 65.8, weakSubjects: ['Stoichiometry'], trend: [68, 64, 65.8] },
    { roll: 'MTH24D1031', name: 'Marcus Aurelius', dept: 'Mathematics', semester: 2, avgMark: 89.2, weakSubjects: [], trend: [85, 87, 89.2] }
  ];

  const filteredStudents = students.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.roll.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSem = semesterFilter === 'All' || s.semester === parseInt(semesterFilter);
    return matchSearch && matchSem;
  });

  return (
    <div className="flex flex-col gap-8 pb-10">
      
      {/* Header */}
      <div className="flex justify-between items-start flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
          <Users className="w-8 h-8 text-brand-blue" />
          <span>Student Registry</span>
        </h1>
        <p className="text-sm text-gray-400 max-w-2xl">
          Review student cards, track roll numbers, semester enrollments, average marks, weak subject fields, and performance metrics.
        </p>
      </div>

      {/* Filter panel */}
      <div className="glass-panel p-4 rounded-xl border border-white/10 flex flex-wrap gap-4 items-center justify-between bg-[#0F1424]/40">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 w-4 h-4 text-gray-500 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search students by name or roll number..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-gray-500 font-bold uppercase tracking-wider">Semester:</span>
          <select 
            value={semesterFilter} 
            onChange={e => setSemesterFilter(e.target.value)}
            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white outline-none"
          >
            <option value="All">All semesters</option>
            <option value="1">1st Sem</option>
            <option value="2">2nd Sem</option>
            <option value="3">3rd Sem</option>
            <option value="4">4th Sem</option>
          </select>
        </div>
      </div>

      {/* Students Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStudents.map(student => {
          const sparkData = student.trend.map((val, idx) => ({ id: idx, value: val }));
          return (
            <div 
              key={student.roll}
              className="glass-card p-6 rounded-card border border-white/10 bg-[#0F1424]/40 flex flex-col justify-between gap-4 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-blue/5 transition-all group"
            >
              
              {/* Header profile details */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-gradient flex items-center justify-center text-white font-bold text-xs shadow-md">
                    {student.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-brand-blue transition-colors">
                      {student.name}
                    </h4>
                    <p className="text-[10px] text-gray-500 font-semibold uppercase mt-0.5">
                      {student.roll} • Sem {student.semester}
                    </p>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
              </div>

              <div className="text-[10px] text-gray-500 font-semibold truncate">
                {student.dept}
              </div>

              {/* Stats & sparkline row */}
              <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-2">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-gray-500">Average Marks</span>
                  <div className="text-lg font-extrabold text-white flex items-center gap-1">
                    <Award className="w-4 h-4 text-brand-blue" />
                    <span>{student.avgMark}%</span>
                  </div>
                </div>

                {/* Micro Sparkline */}
                <div className="w-20 h-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparkData}>
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#2563EB" 
                        strokeWidth={1.5} 
                        fill="rgba(37, 99, 235, 0.05)" 
                        dot={false} 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Weak Topics Tag List */}
              <div className="border-t border-white/5 pt-3 mt-1 flex flex-col gap-1.5">
                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  <span>Struggling Concepts</span>
                </span>
                <div className="flex flex-wrap gap-1.5 min-h-[22px]">
                  {student.weakSubjects.length > 0 ? (
                    student.weakSubjects.map(sub => (
                      <span 
                        key={sub}
                        className="px-2 py-0.5 rounded bg-status-error/10 border border-status-error/20 text-status-error text-[9px] font-bold"
                      >
                        {sub}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-brand-emerald font-semibold flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Conceptual Mastery Verified</span>
                    </span>
                  )}
                </div>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
