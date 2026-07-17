import React, { useState } from 'react';
import { 
  TrendingUp, Sparkles, BookOpen, ChevronRight, HelpCircle, 
  PlayCircle, BookMarked, ArrowUpDown
} from 'lucide-react';

interface Topic {
  name: string;
  subject: string;
  difficulty: number; // 0 to 100
  struggling: number; // count
  avgMark: number;
  recommendation: string;
  category: 'Data Structures' | 'Core CS' | 'Languages' | 'AI';
  resources: {
    video: string;
    notes: string;
    practice: string;
  }
}

export default function TopicDifficulty() {
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const topics: Topic[] = [
    {
      name: 'Trees',
      subject: 'CS-301',
      difficulty: 82,
      struggling: 24,
      avgMark: 54,
      category: 'Data Structures',
      recommendation: 'Schedule revision lecture + practice sets on BST deletion.',
      resources: {
        video: 'https://www.youtube.com/watch?v=qH6yxkw0u78',
        notes: 'https://www.geeksforgeeks.org/binary-tree-data-structure/',
        practice: 'https://leetcode.com/tag/tree/'
      }
    },
    {
      name: 'Graphs',
      subject: 'CS-301',
      difficulty: 78,
      struggling: 22,
      avgMark: 58,
      category: 'Data Structures',
      recommendation: 'Recommend BFS/DFS node traversal videos.',
      resources: {
        video: 'https://www.youtube.com/watch?v=pcKY4hjDrxk',
        notes: 'https://www.geeksforgeeks.org/graph-data-structure-and-algorithms/',
        practice: 'https://leetcode.com/tag/graph/'
      }
    },
    {
      name: 'Linked List',
      subject: 'CS-301',
      difficulty: 45,
      struggling: 12,
      avgMark: 72,
      category: 'Data Structures',
      recommendation: 'Provide quiz sets on doubly-linked lists pointer updates.',
      resources: {
        video: 'https://www.youtube.com/watch?v=H5lP2c9HniU',
        notes: 'https://www.geeksforgeeks.org/data-structures/linked-list/',
        practice: 'https://leetcode.com/tag/linked-list/'
      }
    },
    {
      name: 'Stack',
      subject: 'CS-301',
      difficulty: 32,
      struggling: 8,
      avgMark: 81,
      category: 'Data Structures',
      recommendation: 'Conceptual mastery verified. Assign complex compiler parsing exercises.',
      resources: {
        video: 'https://www.youtube.com/watch?v=I37kGX-nZEg',
        notes: 'https://www.geeksforgeeks.org/stack-data-structure/',
        practice: 'https://leetcode.com/tag/stack/'
      }
    },
    {
      name: 'Queue',
      subject: 'CS-301',
      difficulty: 28,
      struggling: 6,
      avgMark: 84,
      category: 'Data Structures',
      recommendation: 'Conceptual mastery verified. Assign priority queue implementations.',
      resources: {
        video: 'https://www.youtube.com/watch?v=Dq1mQ1m4hG0',
        notes: 'https://www.geeksforgeeks.org/queue-data-structure/',
        practice: 'https://leetcode.com/tag/queue/'
      }
    },
    {
      name: 'Operating System',
      subject: 'CS-302',
      difficulty: 64,
      struggling: 18,
      avgMark: 65,
      category: 'Core CS',
      recommendation: 'Conduct short test on thread synchronization mutexes.',
      resources: {
        video: 'https://www.youtube.com/watch?v=vBURTt97EkA',
        notes: 'https://www.geeksforgeeks.org/operating-systems/',
        practice: 'https://www.gatebackpack.com/operating-systems/'
      }
    },
    {
      name: 'DBMS',
      subject: 'CS-304',
      difficulty: 58,
      struggling: 16,
      avgMark: 69,
      category: 'Core CS',
      recommendation: 'Release interactive notes on SQL join optimization constraints.',
      resources: {
        video: 'https://www.youtube.com/watch?v=3EJnM415o8A',
        notes: 'https://www.geeksforgeeks.org/dbms/',
        practice: 'https://leetcode.com/studyplan/top-sql-50/'
      }
    },
    {
      name: 'Computer Networks',
      subject: 'CS-305',
      difficulty: 62,
      struggling: 17,
      avgMark: 66,
      category: 'Core CS',
      recommendation: 'Provide packet tracing guides for TCP 3-way handshakes.',
      resources: {
        video: 'https://www.youtube.com/watch?v=IPvYjXCsTg8',
        notes: 'https://www.geeksforgeeks.org/computer-network-tutorials/',
        practice: 'https://www.sanfoundry.com/computer-networks-questions-answers/'
      }
    },
    {
      name: 'Machine Learning',
      subject: 'AI-401',
      difficulty: 71,
      struggling: 20,
      avgMark: 61,
      category: 'AI',
      recommendation: 'Review math vector matrices for gradient descent optimizer.',
      resources: {
        video: 'https://www.youtube.com/watch?v=GwIo3gDZUtQ',
        notes: 'https://www.geeksforgeeks.org/machine-learning/',
        practice: 'https://www.kaggle.com/learn/intro-to-machine-learning'
      }
    },
    {
      name: 'Python',
      subject: 'BIO-205',
      difficulty: 20,
      struggling: 4,
      avgMark: 92,
      category: 'Languages',
      recommendation: 'Assign advanced BioPython parser scripts.',
      resources: {
        video: 'https://www.youtube.com/watch?v=rfscVS0vtbw',
        notes: 'https://www.geeksforgeeks.org/python-programming-language/',
        practice: 'https://leetcode.com/tag/python/'
      }
    },
    {
      name: 'Java',
      subject: 'CS-101',
      difficulty: 51,
      struggling: 14,
      avgMark: 71,
      category: 'Languages',
      recommendation: 'Conduct debugging sessions on OOP interface polymorphism.',
      resources: {
        video: 'https://www.youtube.com/watch?v=eIrMbAQSU34',
        notes: 'https://www.geeksforgeeks.org/java/',
        practice: 'https://leetcode.com/tag/java/'
      }
    }
  ];

  // Sorting and Filtering
  const filteredTopics = topics
    .filter(t => subjectFilter === 'All' || t.subject === subjectFilter)
    .sort((a, b) => {
      return sortOrder === 'desc' ? b.difficulty - a.difficulty : a.difficulty - b.difficulty;
    });

  const getDifficultyColor = (pct: number) => {
    if (pct >= 70) return '#EF4444'; // Red
    if (pct >= 40) return '#F59E0B'; // Amber
    return '#10B981'; // Green
  };

  const getDifficultyTextClass = (pct: number) => {
    if (pct >= 70) return 'text-status-error';
    if (pct >= 40) return 'text-status-warning';
    return 'text-brand-emerald';
  };

  const getDifficultyBgClass = (pct: number) => {
    if (pct >= 70) return 'bg-status-error/15';
    if (pct >= 40) return 'bg-status-warning/15';
    return 'bg-brand-emerald/15';
  };

  return (
    <div className="flex flex-col gap-8 pb-10">
      
      {/* Page Header */}
      <div className="flex justify-between items-start flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-brand-purple" />
          <span>Topic Difficulty Analysis</span>
        </h1>
        <p className="text-sm text-gray-400 max-w-2xl">
          Evaluate real-time struggle ratios and failure averages per topic based on semantic OCR evaluation. Access direct revision resource coordinates.
        </p>
      </div>

      {/* Control / Filter Panel */}
      <div className="glass-panel p-4 rounded-xl border border-white/10 flex flex-wrap gap-4 items-center justify-between bg-[#0F1424]/40">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Filter Subject</span>
          <div className="flex gap-2">
            {['All', 'CS-301', 'CS-302', 'CS-304', 'CS-305', 'BIO-205', 'AI-401'].map(sub => (
              <button
                key={sub}
                onClick={() => setSubjectFilter(sub)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  subjectFilter === sub 
                    ? 'bg-brand-gradient text-white' 
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-bold hover:bg-white/10 text-gray-300 transition-all"
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          <span>Sort: {sortOrder === 'desc' ? 'Highest Struggle' : 'Lowest Struggle'}</span>
        </button>
      </div>

      {/* Topics Grid/Table Container */}
      <div className="glass-card rounded-card border border-white/10 p-6 bg-[#0F1424]/40 flex flex-col gap-4">
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 text-gray-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-2">Topic Name</th>
                <th className="py-3 px-2">Course Code</th>
                <th className="py-3 px-2 text-center">Struggle Rate</th>
                <th className="py-3 px-2">Students Impacted</th>
                <th className="py-3 px-2 text-center">Avg Score</th>
                <th className="py-3 px-2">Action Recommendation</th>
                <th className="py-3 px-2 text-center">Study Resources</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300 font-medium">
              {filteredTopics.map((topic, index) => {
                const color = getDifficultyColor(topic.difficulty);
                return (
                  <tr key={index} className="hover:bg-white/5 transition-colors">
                    
                    {/* Topic Name */}
                    <td className="py-4 px-2 font-bold text-white text-sm">
                      {topic.name}
                      <span className="block text-[10px] text-gray-500 font-medium mt-0.5">
                        Category: {topic.category}
                      </span>
                    </td>

                    {/* Subject */}
                    <td className="py-4 px-2 text-xs font-semibold">{topic.subject}</td>

                    {/* Difficulty Bar */}
                    <td className="py-4 px-2 text-center">
                      <div className="flex flex-col gap-2 items-center justify-center max-w-[140px] mx-auto">
                        <div className="flex justify-between w-full text-[10px] font-bold">
                          <span className={getDifficultyTextClass(topic.difficulty)}>{topic.difficulty}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full" 
                            style={{ width: `${topic.difficulty}%`, backgroundColor: color }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Struggling Students Count */}
                    <td className="py-4 px-2 text-xs">
                      <span className={`px-2.5 py-0.5 rounded-full font-bold ${getDifficultyBgClass(topic.difficulty)} ${getDifficultyTextClass(topic.difficulty)}`}>
                        {topic.struggling} students
                      </span>
                    </td>

                    {/* Avg Score */}
                    <td className="py-4 px-2 text-center text-sm font-bold text-white">
                      {topic.avgMark}%
                    </td>

                    {/* Recommendation */}
                    <td className="py-4 px-2 text-xs max-w-xs text-gray-400 font-semibold leading-relaxed">
                      {topic.recommendation}
                    </td>

                    {/* Resources */}
                    <td className="py-4 px-2">
                      <div className="flex justify-center gap-2">
                        <a 
                          href={topic.resources.video} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-1.5 rounded-lg bg-white/5 border border-white/5 hover:bg-status-error/10 hover:border-status-error/25 hover:text-status-error text-gray-400 transition-colors"
                          title="Watch Video Tutorial"
                        >
                          <PlayCircle className="w-4 h-4" />
                        </a>
                        <a 
                          href={topic.resources.notes} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-1.5 rounded-lg bg-white/5 border border-white/5 hover:bg-brand-blue/10 hover:border-brand-blue/25 hover:text-brand-blue text-gray-400 transition-colors"
                          title="Read Lecture Notes"
                        >
                          <BookMarked className="w-4 h-4" />
                        </a>
                        <a 
                          href={topic.resources.practice} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-1.5 rounded-lg bg-white/5 border border-white/5 hover:bg-brand-emerald/10 hover:border-brand-emerald/25 hover:text-brand-emerald text-gray-400 transition-colors"
                          title="Solve Practice Questions"
                        >
                          <Sparkles className="w-4 h-4" />
                        </a>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
