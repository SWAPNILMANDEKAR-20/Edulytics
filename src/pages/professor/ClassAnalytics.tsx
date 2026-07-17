import React from 'react';
import { 
  BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Bar, Cell,
  LineChart, Line, PieChart, Pie, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { 
  Award, ArrowUpRight, ArrowDownRight, Users, Clock, 
  HelpCircle, ShieldAlert, CheckCircle2, TrendingUp, Sliders
} from 'lucide-react';

export default function ClassAnalytics() {
  
  // Stats
  const descriptiveStats = [
    { label: 'Highest Performer', value: '95%', desc: 'Marcus Aurelius (BIO-205)', icon: Award, color: '#10B981' },
    { label: 'Lowest Performer', value: '48%', desc: 'Alexander Great (CS-301)', icon: ShieldAlert, color: '#EF4444' },
    { label: 'Class Average', value: '78.4%', desc: 'Cumulative average score', icon: TrendingUp, color: '#2563EB' },
    { label: 'Median Score', value: '79.0%', desc: '50th percentile rank', icon: CheckCircle2, color: '#7C3AED' },
    { label: 'Standard Deviation', value: '8.4%', desc: 'Grade distribution spread', icon: HelpCircle, color: '#EC4899' },
    { label: 'Class Attendance', value: '96.2%', desc: 'Lecture attendance rate', icon: Users, color: '#06B6D4' },
    { label: 'Submission Rate', value: '98.5%', desc: 'Final exams completed', icon: CheckCircle2, color: '#10B981' },
    { label: 'Late Submission Rate', value: '2.1%', desc: 'Submitted after grace hour', icon: Clock, color: '#F59E0B' }
  ];

  // Distribution Histogram (Scores: Count)
  const scoreDistribution = [
    { scoreRange: '40-50', count: 3 },
    { scoreRange: '50-60', count: 8 },
    { scoreRange: '60-70', count: 18 },
    { scoreRange: '70-80', count: 45 },
    { scoreRange: '80-90', count: 38 },
    { scoreRange: '90-100', count: 12 }
  ];

  // Analytics Chart Data
  const performanceTrend = [
    { week: 'Wk 1', average: 72, target: 75 },
    { week: 'Wk 2', average: 75, target: 75 },
    { week: 'Wk 3', average: 74, target: 76 },
    { week: 'Wk 4', average: 78, target: 76 },
    { week: 'Wk 5', average: 79, target: 77 },
    { week: 'Wk 6', average: 81, target: 78 }
  ];

  const marksByWeek = [
    { week: 'Wk 1', essays: 70, omr: 75 },
    { week: 'Wk 2', essays: 74, omr: 78 },
    { week: 'Wk 3', essays: 72, omr: 80 },
    { week: 'Wk 4', essays: 77, omr: 82 },
    { week: 'Wk 5', essays: 80, omr: 85 }
  ];

  const gradeDistribution = [
    { name: 'Grade A', value: 45 },
    { name: 'Grade B', value: 58 },
    { name: 'Grade C', value: 24 },
    { name: 'Grade F', value: 15 }
  ];

  const radarData = [
    { name: 'Remember / Recall', A: 82, B: 74 },
    { name: 'Understand', A: 85, B: 80 },
    { name: 'Apply', A: 78, B: 88 },
    { name: 'Analyze', A: 90, B: 82 },
    { name: 'Evaluate', A: 75, B: 68 },
    { name: 'Create', A: 65, B: 78 }
  ];

  const COLORS = ['#2563EB', '#7C3AED', '#06B6D4', '#EF4444'];

  return (
    <div className="flex flex-col gap-8 pb-10">
      
      {/* Header */}
      <div className="flex justify-between items-start flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-brand-blue" />
          <span>Class Analytics</span>
        </h1>
        <p className="text-sm text-gray-400 max-w-2xl">
          Evaluate class-wide grading parameters, median averages, Standard Deviation distributions, and final attendance logs.
        </p>
      </div>

      {/* descriptive Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {descriptiveStats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div 
              key={idx}
              className="glass-card p-5 rounded-card border border-white/10 flex flex-col gap-3 bg-[#0F1424]/40 hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                  {stat.label}
                </span>
                <div 
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                  style={{ backgroundColor: `${stat.color}15`, color: stat.color }}
                >
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  {stat.value}
                </h3>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {stat.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid: Histogram and Performance Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Detailed Distribution Histogram */}
        <div className="glass-card p-6 rounded-card border border-white/10 bg-[#0F1424]/40 flex flex-col gap-6">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">
              Student Grade Distribution (Histogram)
            </h3>
            <p className="text-xs text-gray-500">
              A comprehensive overview mapping student counts against specific score ranges.
            </p>
          </div>

          <div className="h-64 w-full bg-white/5 border border-white/5 rounded-xl p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="scoreRange" stroke="#71717a" fontSize={10} name="Score Range" />
                <YAxis stroke="#71717a" fontSize={10} name="Student Count" />
                <Tooltip contentStyle={{ background: '#0F1424', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: 10 }} />
                <Bar dataKey="count" name="Students count" fill="#2563EB" radius={[6, 6, 0, 0]}>
                  {scoreDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 3 ? '#7C3AED' : '#2563EB'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart: Class Performance Trend */}
        <div className="glass-card p-6 rounded-card border border-white/10 bg-[#0F1424]/40 flex flex-col gap-6">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">
              Class Performance Trend
            </h3>
            <p className="text-xs text-gray-500">
              Week-over-week performance tracking compared to standard class targets.
            </p>
          </div>
          <div className="h-64 w-full bg-white/5 border border-white/5 rounded-xl p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="week" stroke="#71717a" fontSize={10} />
                <YAxis stroke="#71717a" fontSize={10} domain={[60, 90]} />
                <Tooltip contentStyle={{ background: '#0F1424', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: 10 }} />
                <Line type="monotone" dataKey="average" name="Class Avg" stroke="#2563EB" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="target" name="Target" stroke="#7C3AED" strokeWidth={1} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Grid: Essays vs OMR and Bloom's Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart: essays vs OMR */}
        <div className="glass-card p-6 rounded-card border border-white/10 bg-[#0F1424]/40 flex flex-col gap-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Average Marks (Essays vs OMR)</h3>
          <div className="h-56 w-full bg-white/5 border border-white/5 rounded-xl p-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={marksByWeek}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="week" stroke="#71717a" fontSize={9} />
                <YAxis stroke="#71717a" fontSize={9} />
                <Tooltip contentStyle={{ background: '#0F1424', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: 10 }} />
                <Bar dataKey="essays" name="Essays" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                <Bar dataKey="omr" name="OMR MCQ" fill="#06B6D4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart: Grade Distribution */}
        <div className="glass-card p-6 rounded-card border border-white/10 bg-[#0F1424]/40 flex flex-col gap-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Grade Distribution</h3>
          <div className="h-56 w-full bg-white/5 border border-white/5 rounded-xl p-2 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={gradeDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {gradeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#0F1424', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-1.5 justify-center pr-2 shrink-0">
              {gradeDistribution.map((item, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-[9px] text-gray-400">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                  <span>{item.name}: {item.value} studs</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chart: Bloom's Radar */}
        <div className="glass-card p-6 rounded-card border border-white/10 bg-[#0F1424]/40 flex flex-col gap-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Bloom's Taxonomy Levels Alignment</h3>
          <div className="h-56 w-full bg-white/5 border border-white/5 rounded-xl p-2">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.05)" />
                <PolarAngleAxis dataKey="name" stroke="#71717a" fontSize={7} />
                <PolarRadiusAxis stroke="#71717a" fontSize={7} angle={30} domain={[0, 100]} />
                <Radar name="BIO-205" dataKey="A" stroke="#2563EB" fill="#2563EB" fillOpacity={0.15} />
                <Radar name="CS-301" dataKey="B" stroke="#7C3AED" fill="#7C3AED" fillOpacity={0.15} />
                <Tooltip contentStyle={{ background: '#0F1424', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: 10 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
}
