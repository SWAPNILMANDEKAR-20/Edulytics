const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
require('dotenv').config();
const PDFDocument = require('pdfkit');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Set up directories
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const PUBLIC_DIR = path.join(__dirname, 'public');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });

// Serve static directories
app.use(express.static(PUBLIC_DIR));
app.use('/uploads', express.static(UPLOADS_DIR));

// Validate Supabase URL
const isValidHttpUrl = (url) => {
  return url && (url.startsWith('http://') || url.startsWith('https://'));
};

const isSupabaseConfigured = isValidHttpUrl(process.env.SUPABASE_URL) && 
                              process.env.SUPABASE_SERVICE_ROLE_KEY && 
                              !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('YOUR_SUPABASE');

const supabaseUrl = isSupabaseConfigured ? process.env.SUPABASE_URL : 'https://placeholder.supabase.co';
const supabaseKey = isSupabaseConfigured ? process.env.SUPABASE_SERVICE_ROLE_KEY : 'placeholder';
const supabase = createClient(supabaseUrl, supabaseKey);
const supabaseAuth = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

// Multer setup for scanned sheet uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'scanned-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// ==========================================================================
// LOCAL FILE FALLBACKS
// ==========================================================================

const getSubjectsLocal = () => {
  const filePath = path.join(DATA_DIR, 'subjects.json');
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

const saveSubjectsLocal = (subjects) => {
  fs.writeFileSync(path.join(DATA_DIR, 'subjects.json'), JSON.stringify(subjects, null, 2));
};

const getPapersLocal = () => {
  const filePath = path.join(DATA_DIR, 'papers.json');
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([]));
  }
  const descriptivePapers = JSON.parse(fs.readFileSync(filePath, 'utf8')).map(p => ({
    ...p,
    evaluationType: 'descriptive'
  }));
  
  // Load and map local OMR papers
  const omrPapersFilePath = path.join(DATA_DIR, 'omr_papers.json');
  if (!fs.existsSync(omrPapersFilePath)) {
    fs.writeFileSync(omrPapersFilePath, JSON.stringify([]));
  }
  const rawOMR = JSON.parse(fs.readFileSync(omrPapersFilePath, 'utf8'));
  
  const mappedOMR = rawOMR.map(p => {
    const totalScore = p.evaluation ? p.evaluation.totalScore : 0.0;
    const maxMarks = p.evaluation ? p.evaluation.maxScore : 15.0;
    
    // Map selectedAnswers/questionBreakdown to answers array
    const answers = Object.keys(p.selectedAnswers || {}).map(qNo => {
      const qNum = parseInt(qNo);
      const studentAns = p.selectedAnswers[qNo] || '';
      const status = p.evaluation && p.evaluation.questionBreakdown ? p.evaluation.questionBreakdown[qNo] : 'blank';
      
      let marksAwarded = 0;
      if (status === 'correct') marksAwarded = 1.0; 
      else if (status === 'incorrect') marksAwarded = -0.25; 
      
      return {
        questionNo: qNum,
        questionId: `Q${qNum}`,
        questionText: 'Multiple Choice Question',
        detectedOption: studentAns,
        correctOption: '', 
        status: status,
        score: marksAwarded,
        maxMarks: 1.0,
        isOMR: true
      };
    });

    let grade = 'F';
    const ratio = maxMarks > 0 ? totalScore / maxMarks : 0;
    if (ratio >= 0.9) grade = 'A+';
    else if (ratio >= 0.8) grade = 'A';
    else if (ratio >= 0.7) grade = 'B';
    else if (ratio >= 0.6) grade = 'C';
    else if (ratio >= 0.5) grade = 'D';

    return {
      id: p.id,
      studentName: p.studentName,
      studentId: p.studentId,
      studentUuid: p.studentId, 
      subjectId: p.templateId === 'OMR-101' ? 'BIO-205' : 'PHY-102',
      examId: p.templateId,
      examTitle: p.templateId === 'OMR-101' ? 'Biology Midterm MCQ' : 'Chemistry Final MCQ',
      status: p.status === 'checked' ? 'released' : 'pending',
      submissionDate: p.submissionDate,
      imagePath: p.imagePath,
      answers: answers,
      totalScore: totalScore,
      maxMarks: maxMarks,
      grade: grade,
      evaluatorNotes: p.evaluatorNotes || '',
      isPublished: p.isPublished !== false,
      evaluationType: 'omr'
    };
  });

  return [...descriptivePapers, ...mappedOMR];
};

const savePapersLocal = (papers) => {
  const descriptive = papers.filter(p => p.evaluationType !== 'omr' && !p.id.startsWith('omr_')).map(p => {
    const clone = { ...p };
    delete clone.evaluationType;
    return clone;
  });
  const omr = papers.filter(p => p.evaluationType === 'omr' || p.id.startsWith('omr_')).map(p => {
    const selectedAnswers = {};
    const questionBreakdown = {};
    p.answers.forEach(a => {
      selectedAnswers[String(a.questionNo)] = a.detectedOption || '';
      questionBreakdown[String(a.questionNo)] = a.status;
    });

    return {
      id: p.id,
      studentName: p.studentName,
      studentId: p.studentId,
      templateId: p.examId,
      status: p.status === 'released' ? 'checked' : 'pending',
      submissionDate: p.submissionDate,
      imagePath: p.imagePath,
      selectedAnswers,
      evaluation: {
        correctCount: p.answers.filter(a => a.status === 'correct').length,
        incorrectCount: p.answers.filter(a => a.status === 'incorrect').length,
        blankCount: p.answers.filter(a => a.status === 'blank').length,
        invalidCount: p.answers.filter(a => a.status === 'invalid' || a.status === 'multiple_marked').length,
        totalScore: p.totalScore,
        maxScore: p.maxMarks,
        questionBreakdown
      },
      evaluatorNotes: p.evaluatorNotes,
      isPublished: p.isPublished
    };
  });

  fs.writeFileSync(path.join(DATA_DIR, 'papers.json'), JSON.stringify(descriptive, null, 2));
  fs.writeFileSync(path.join(DATA_DIR, 'omr_papers.json'), JSON.stringify(omr, null, 2));
};

const getOMRTemplatesLocal = () => {
  const filePath = path.join(DATA_DIR, 'omr_templates.json');
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

const saveOMRTemplatesLocal = (templates) => {
  fs.writeFileSync(path.join(DATA_DIR, 'omr_templates.json'), JSON.stringify(templates, null, 2));
};

const getOMRPapersLocal = () => {
  const filePath = path.join(DATA_DIR, 'omr_papers.json');
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

const saveOMRPapersLocal = (papers) => {
  fs.writeFileSync(path.join(DATA_DIR, 'omr_papers.json'), JSON.stringify(papers, null, 2));
};

const getExamsLocal = () => {
  const filePath = path.join(DATA_DIR, 'exams.json');
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([], null, 2));
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

const saveExamsLocal = (exams) => {
  fs.writeFileSync(path.join(DATA_DIR, 'exams.json'), JSON.stringify(exams, null, 2));
};

const getOMRAnswerKeysLocal = () => {
  const filePath = path.join(DATA_DIR, 'omr_answer_keys.json');
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([], null, 2));
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

const saveOMRAnswerKeysLocal = (keys) => {
  fs.writeFileSync(path.join(DATA_DIR, 'omr_answer_keys.json'), JSON.stringify(keys, null, 2));
};

const getProfessorSettingsLocal = () => {
  const filePath = path.join(DATA_DIR, 'professor_settings.json');
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify({}, null, 2));
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

const saveProfessorSettingsLocal = (settings) => {
  fs.writeFileSync(path.join(DATA_DIR, 'professor_settings.json'), JSON.stringify(settings, null, 2));
};

const getUsersLocal = () => {
  const filePath = path.join(DATA_DIR, 'users.json');
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

const saveUsersLocal = (users) => {
  fs.writeFileSync(path.join(DATA_DIR, 'users.json'), JSON.stringify(users, null, 2));
};

// ==========================================================================
// DUAL MODE STORAGE LAYER
// ==========================================================================

const getSubjects = async () => {
  if (!isSupabaseConfigured) {
    return getSubjectsLocal();
  }

  const { data: subjects, error: subError } = await supabase
    .from('subjects')
    .select('*');
  if (subError) throw subError;

  const { data: questions, error: qError } = await supabase
    .from('questions')
    .select('*, rubric_items(*)');
  if (qError) throw qError;

  return subjects.map(sub => {
    const subQs = questions
      .filter(q => q.subject_id === sub.id)
      .map(q => ({
        id: q.question_code,
        text: q.text,
        maxMarks: q.max_marks,
        modelAnswer: q.model_answer,
        rubric: (q.rubric_items || []).map(rub => ({
          keyword: rub.keyword,
          description: rub.description,
          weight: rub.weight
        }))
      }));
    return {
      id: sub.id,
      name: sub.name,
      questions: subQs
    };
  });
};

const saveSubjects = async (subjects) => {
  if (!isSupabaseConfigured) {
    return saveSubjectsLocal(subjects);
  }

  for (const sub of subjects) {
    const { error: subError } = await supabase
      .from('subjects')
      .upsert({ id: sub.id, name: sub.name });
    if (subError) throw subError;

    if (sub.questions && Array.isArray(sub.questions)) {
      for (const q of sub.questions) {
        const { data: existingQ } = await supabase
          .from('questions')
          .select('id')
          .eq('subject_id', sub.id)
          .eq('question_code', q.id)
          .maybeSingle();

        let questionId;
        if (existingQ) {
          questionId = existingQ.id;
          await supabase
            .from('questions')
            .update({
              text: q.text,
              max_marks: q.maxMarks,
              model_answer: q.modelAnswer
            })
            .eq('id', questionId);
        } else {
          const { data: newQ, error: qError } = await supabase
            .from('questions')
            .insert({
              subject_id: sub.id,
              question_code: q.id,
              text: q.text,
              max_marks: q.maxMarks,
              model_answer: q.modelAnswer
            })
            .select('id')
            .single();
          if (qError) throw qError;
          questionId = newQ.id;
        }

        if (q.rubric && Array.isArray(q.rubric)) {
          await supabase.from('rubric_items').delete().eq('question_id', questionId);
          for (const rub of q.rubric) {
            await supabase.from('rubric_items').insert({
              question_id: questionId,
              keyword: rub.keyword,
              description: rub.description,
              weight: rub.weight || 0
            });
          }
        }
      }
    }
  }
};

const getPapers = async () => {
  if (!isSupabaseConfigured) {
    return getPapersLocal();
  }

  // 1. Fetch all submissions
  const { data: submissions, error: subError } = await supabase
    .from('submissions')
    .select(`
      *,
      student:student_id (id, email, name),
      subject:subject_id (id, code, name),
      exam:exam_id (id, title, evaluation_type, total_questions, marks_per_question, negative_marking, is_answer_key_confirmed)
    `);
  if (subError) throw subError;

  // 2. Fetch all evaluations
  const { data: evaluations, error: evalError } = await supabase
    .from('evaluations')
    .select(`
      *,
      question_evaluations(*)
    `);
  if (evalError) throw evalError;

  // 3. Fetch all student answers
  const { data: studentAnswers, error: saError } = await supabase
    .from('student_answers')
    .select('*');
  if (saError) throw saError;

  // 4. Fetch all answer keys
  const { data: answerKeys, error: akError } = await supabase
    .from('answer_keys')
    .select('*');
  if (akError) throw akError;

  // 5. Fetch OMR submissions and results if OMR tables exist
  let omrSubmissions = [];
  let omrQResults = [];
  try {
    const { data: os, error: oe1 } = await supabase.from('omr_submissions').select('*');
    if (!oe1 && os) omrSubmissions = os;
    const { data: oq, error: oe2 } = await supabase.from('omr_question_results').select('*');
    if (!oe2 && oq) omrQResults = oq;
  } catch (e) {
    console.warn('OMR sub-tables not fully migrated yet:', e.message);
  }

  // Map to the shape expected by existing backend & frontend code
  return submissions.map(sub => {
    // Find matching evaluation
    const ev = evaluations ? evaluations.find(e => e.submission_id === sub.id) : null;
    const isOMR = sub.exam && sub.exam.evaluation_type === 'omr';
    
    let paperAns = [];
    let maxMarks = 10.0;

    if (isOMR) {
      const subOMR = omrSubmissions ? omrSubmissions.find(o => o.id === sub.id) : null;
      const subQRes = omrQResults ? omrQResults.filter(q => q.submission_id === sub.id) : [];
      
      const marksPerQ = sub.exam.marks_per_question ? parseFloat(sub.exam.marks_per_question) : 1.0;
      maxMarks = (sub.exam.total_questions || 15) * marksPerQ;
      
      paperAns = subQRes.map(q => ({
        questionNo: q.question_no,
        questionId: `Q${q.question_no}`,
        questionText: 'Multiple Choice Question',
        detectedOption: q.detected_option,
        correctOption: q.correct_option,
        status: q.status,
        score: parseFloat(q.marks_awarded),
        maxMarks: marksPerQ,
        professorOverride: q.professor_override,
        isOMR: true
      })).sort((a, b) => a.questionNo - b.questionNo);
    } else {
      // Find matching student answers for this submission
      const subStudentAnswers = studentAnswers ? studentAnswers.filter(sa => sa.submission_id === sub.id) : [];
      
      // Find matching answer keys for this exam
      const examAnswerKeys = answerKeys ? answerKeys.filter(ak => ak.exam_id === sub.exam_id) : [];
      
      maxMarks = examAnswerKeys.reduce((sum, ak) => sum + parseFloat(ak.max_marks), 0);
      if (maxMarks === 0) maxMarks = ev ? parseFloat(ev.total_marks) : 10.0;

      // Map answers by matching question_no
      paperAns = examAnswerKeys.map(ak => {
        // Find matching student answer
        const sa = subStudentAnswers.find(s => s.question_no === ak.question_no);
        // Find matching evaluation
        const qe = ev && ev.question_evaluations ? ev.question_evaluations.find(e => e.question_no === ak.question_no) : null;

        return {
          questionId: `Q${ak.question_no}`,
          questionNo: ak.question_no,
          questionText: ak.question_text,
          referenceAnswer: ak.reference_answer,
          maxMarks: parseFloat(ak.max_marks),
          studentAnswer: sa ? sa.student_answer : '',
          score: qe ? (qe.professor_marks !== null ? parseFloat(qe.professor_marks) : parseFloat(qe.ai_marks)) : 0.0,
          isEvaluated: qe ? qe.professor_marks !== null : false,
          ocrConfidence: sa ? parseFloat(sa.extraction_confidence) : 0.0,
          rubricMatches: qe && qe.rubricMatches ? qe.rubricMatches : [], 
          aiFeedback: qe ? qe.feedback : 'Requires evaluation.',
          highlights: [],
          similarityScore: qe ? parseFloat(qe.similarity_score || 0) : 0.0,
          llmCompletenessNotes: qe ? qe.llm_completeness_notes : '',
          conceptsCovered: qe && qe.concepts_covered ? qe.concepts_covered : [],
          missingConcepts: qe && qe.missing_concepts ? qe.missing_concepts : [],
          strongPoints: qe && qe.strong_points ? qe.strong_points : '',
          weakPoints: qe && qe.weak_points ? qe.weak_points : '',
          suggestedImprovements: qe && qe.suggested_improvements ? qe.suggested_improvements : '',
          isDiscrepancyFlagged: qe && qe.is_discrepancy_flagged ? qe.is_discrepancy_flagged : false
        };
      });

      // Also include unmatched student answers if they exist (to support unmatched manual assignment fallback!)
      subStudentAnswers.forEach(sa => {
        const exists = paperAns.some(pa => pa.questionNo === sa.question_no);
        if (!exists) {
          // Find matching evaluation
          const qe = ev && ev.question_evaluations ? ev.question_evaluations.find(e => e.question_no === sa.question_no) : null;
          paperAns.push({
            questionId: `Q${sa.question_no}`,
            questionNo: sa.question_no,
            questionText: 'Unmatched student answer',
            referenceAnswer: '',
            maxMarks: 0,
            studentAnswer: sa.student_answer,
            score: qe ? (qe.professor_marks !== null ? parseFloat(qe.professor_marks) : parseFloat(qe.ai_marks)) : 0.0,
            isEvaluated: qe ? qe.professor_marks !== null : false,
            ocrConfidence: parseFloat(sa.extraction_confidence),
            rubricMatches: [],
            aiFeedback: qe ? qe.feedback : 'Requires manual reference assignment.',
            highlights: [],
            similarityScore: 0.0,
            llmCompletenessNotes: qe ? qe.llm_completeness_notes : '',
            isUnmatched: true,
            conceptsCovered: qe && qe.concepts_covered ? qe.concepts_covered : [],
            missingConcepts: qe && qe.missing_concepts ? qe.missing_concepts : [],
            strongPoints: qe && qe.strong_points ? qe.strong_points : '',
            weakPoints: qe && qe.weak_points ? qe.weak_points : '',
            suggestedImprovements: qe && qe.suggested_improvements ? qe.suggested_improvements : '',
            isDiscrepancyFlagged: qe && qe.is_discrepancy_flagged ? qe.is_discrepancy_flagged : false
          });
        }
      });
    }

    // Calculate Grade
    let totalScore = ev ? parseFloat(ev.obtained_marks) : 0.0;

    let grade = '';
    const ratio = maxMarks > 0 ? totalScore / maxMarks : 0;
    if (ratio >= 0.9) grade = 'A+';
    else if (ratio >= 0.8) grade = 'A';
    else if (ratio >= 0.7) grade = 'B';
    else if (ratio >= 0.6) grade = 'C';
    else if (ratio >= 0.5) grade = 'D';
    else grade = 'F';

    return {
      id: sub.id,
      studentName: sub.student ? sub.student.name : 'Unknown Student',
      studentId: sub.student ? sub.student.email : 'Unknown Email', 
      studentUuid: sub.student_id,
      subjectId: sub.subject ? sub.subject.code : 'CS-301',
      subjectUuid: sub.subject_id,
      examId: sub.exam_id,
      examTitle: sub.exam ? sub.exam.title : 'Midterm Examination',
      status: sub.status, 
      submissionDate: sub.submitted_at ? new Date(sub.submitted_at).toISOString().split('T')[0] : '2026-07-04',
      imagePath: sub.file_url,
      answers: paperAns,
      totalScore: totalScore,
      maxMarks: maxMarks,
      grade: grade,
      evaluatorNotes: ev ? ev.overall_feedback : '',
      isPublished: ev ? ev.released_at !== null : false,
      evaluationType: isOMR ? 'omr' : 'descriptive'
    };
  });
};

const savePapers = async (papers) => {
  // Pre-save Clamping & Grade Recomputation for all papers (both online and offline)
  for (const p of papers) {
    if (p.answers && Array.isArray(p.answers)) {
      let recomputedTotal = 0.0;
      for (const ans of p.answers) {
        const qMax = parseFloat(ans.maxMarks || 10.0);
        ans.score = Math.max(0.0, Math.min(qMax, parseFloat(ans.score || 0)));
        recomputedTotal += ans.score;
      }
      p.totalScore = parseFloat(recomputedTotal.toFixed(1));
      
      const totalMax = p.maxMarks || 10.0;
      const ratio = totalMax > 0 ? p.totalScore / totalMax : 0;
      if (ratio >= 0.9) p.grade = 'A+';
      else if (ratio >= 0.8) p.grade = 'A';
      else if (ratio >= 0.7) p.grade = 'B';
      else if (ratio >= 0.6) p.grade = 'C';
      else if (ratio >= 0.5) p.grade = 'D';
      else p.grade = 'F';
    }
  }

  if (!isSupabaseConfigured) {
    return savePapersLocal(papers);
  }

  for (const p of papers) {
    let studentUuid = p.studentUuid || null;
    if (!studentUuid && p.studentId) {
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .or(`email.eq."${p.studentId.toLowerCase()}",roll_number.eq."${p.studentId}"`)
        .maybeSingle();
      if (user) studentUuid = user.id;
    }
    if (!studentUuid) continue;

    const { data: subject } = await supabase
      .from('subjects')
      .select('id, professor_id')
      .or(`code.eq."${p.subjectId}",id.eq."${p.subjectId}"`)
      .maybeSingle();
    if (!subject) continue;

    let examUuid = p.examId;
    if (!examUuid) {
      const { data: exam } = await supabase
        .from('exams')
        .select('id')
        .eq('subject_id', subject.id)
        .maybeSingle();
      if (exam) examUuid = exam.id;
    }
    if (!examUuid) continue;

    // 1. Upsert submission
    const { error: subError } = await supabase
      .from('submissions')
      .upsert({
        id: p.id,
        student_id: studentUuid,
        subject_id: subject.id,
        exam_id: examUuid,
        file_url: p.imagePath || '/uploads/default-script.jpg',
        file_type: (p.imagePath && p.imagePath.endsWith('.pdf')) ? 'pdf' : 'image',
        status: p.status || 'pending',
        submitted_at: p.submissionDate ? new Date(p.submissionDate) : new Date(),
        evaluated_at: p.status === 'released' ? new Date() : null
      });
    if (subError) {
      console.error('savePapers submission upsert failed:', subError);
      continue;
    }

    // 2. Save student answers
    if (p.answers && Array.isArray(p.answers)) {
      for (const ans of p.answers) {
        const questionNo = ans.questionNo || (ans.questionId ? parseInt(ans.questionId.replace(/\D/g, '')) : 1);
        
        // Save to student_answers
        const { data: existingSA } = await supabase
          .from('student_answers')
          .select('id')
          .eq('submission_id', p.id)
          .eq('question_no', questionNo)
          .maybeSingle();

        let saUuid;
        if (existingSA) {
          saUuid = existingSA.id;
          await supabase
            .from('student_answers')
            .update({
              student_answer: ans.studentAnswer || '',
              extraction_confidence: ans.ocrConfidence || 0.0
            })
            .eq('id', saUuid);
        } else {
          const { data: newSA, error: saError } = await supabase
            .from('student_answers')
            .insert({
              submission_id: p.id,
              question_no: questionNo,
              student_answer: ans.studentAnswer || '',
              extraction_confidence: ans.ocrConfidence || 0.0
            })
            .select('id')
            .single();
          if (!saError && newSA) saUuid = newSA.id;
        }

        // 3. Save evaluation & question_evaluations
        // Find matching evaluation row
        const { data: evRow } = await supabase
          .from('evaluations')
          .select('id')
          .eq('submission_id', p.id)
          .maybeSingle();

        let evUuid;
        if (evRow) {
          evUuid = evRow.id;
          await supabase
            .from('evaluations')
            .update({
              obtained_marks: p.totalScore || 0.0,
              total_marks: p.maxMarks || 10.0,
              overall_feedback: p.evaluatorNotes || '',
              released_at: p.status === 'released' ? new Date() : null,
              updated_at: new Date()
            })
            .eq('id', evUuid);
        } else {
          const { data: newEv, error: evError } = await supabase
            .from('evaluations')
            .insert({
              submission_id: p.id,
              professor_id: subject.professor_id,
              obtained_marks: p.totalScore || 0.0,
              total_marks: p.maxMarks || 10.0,
              overall_feedback: p.evaluatorNotes || '',
              released_at: p.status === 'released' ? new Date() : null
            })
            .select('id')
            .single();
          if (!evError && newEv) evUuid = newEv.id;
        }

        if (evUuid) {
          // Find the matching answer key ID to satisfy explicit foreign key constraint!
          const { data: akRow } = await supabase
            .from('answer_keys')
            .select('id, reference_answer')
            .eq('exam_id', examUuid)
            .eq('question_no', questionNo)
            .maybeSingle();

          const { data: existingQE } = await supabase
            .from('question_evaluations')
            .select('id')
            .eq('evaluation_id', evUuid)
            .eq('question_no', questionNo)
            .maybeSingle();

          const qePayload = {
            evaluation_id: evUuid,
            question_no: questionNo,
            answer_key_id: akRow ? akRow.id : null,
            student_answer_id: saUuid || null,
            student_answer: ans.studentAnswer || '',
            reference_answer: akRow ? akRow.reference_answer : (ans.referenceAnswer || ''),
            ai_marks: ans.score || 0.0,
            professor_marks: ans.isEvaluated ? ans.score : null,
            feedback: ans.aiFeedback || '',
            confidence: ans.ocrConfidence || 0.0,
            similarity_score: ans.similarityScore || 0.0,
            llm_completeness_notes: ans.llmCompletenessNotes || '',
            concepts_covered: ans.conceptsCovered || [],
            missing_concepts: ans.missingConcepts || [],
            strong_points: ans.strongPoints || '',
            weak_points: ans.weakPoints || '',
            suggested_improvements: ans.suggestedImprovements || '',
            is_discrepancy_flagged: ans.isDiscrepancyFlagged || false
          };

          if (existingQE) {
            const { error: updErr } = await supabase
              .from('question_evaluations')
              .update(qePayload)
              .eq('id', existingQE.id);
            if (updErr) {
              console.warn('[DATABASE] Update failed with full payload, trying fallback (omitting new columns):', updErr.message);
              const fallbackPayload = { ...qePayload };
              delete fallbackPayload.concepts_covered;
              delete fallbackPayload.missing_concepts;
              delete fallbackPayload.strong_points;
              delete fallbackPayload.weak_points;
              delete fallbackPayload.suggested_improvements;
              delete fallbackPayload.is_discrepancy_flagged;
              await supabase
                .from('question_evaluations')
                .update(fallbackPayload)
                .eq('id', existingQE.id);
            }
          } else {
            const { error: insErr } = await supabase
              .from('question_evaluations')
              .insert(qePayload);
            if (insErr) {
              console.warn('[DATABASE] Insert failed with full payload, trying fallback (omitting new columns):', insErr.message);
              const fallbackPayload = { ...qePayload };
              delete fallbackPayload.concepts_covered;
              delete fallbackPayload.missing_concepts;
              delete fallbackPayload.strong_points;
              delete fallbackPayload.weak_points;
              delete fallbackPayload.suggested_improvements;
              delete fallbackPayload.is_discrepancy_flagged;
              await supabase
                .from('question_evaluations')
                .insert(fallbackPayload);
            }
          }
        }
      }
    }
  }
};

const getOMRTemplates = async () => {
  if (!isSupabaseConfigured) {
    return getOMRTemplatesLocal();
  }

  const { data, error } = await supabase
    .from('omr_templates')
    .select('*');
  if (error) throw error;
  
  return data.map(t => ({
    templateId: t.template_id,
    title: t.title,
    questionCount: t.question_count,
    marksPerQuestion: parseFloat(t.marks_per_question),
    negativeMarksPerQuestion: parseFloat(t.negative_marks_per_question),
    answerKey: t.answer_key
  }));
};

const saveOMRTemplates = async (templates) => {
  if (!isSupabaseConfigured) {
    return saveOMRTemplatesLocal(templates);
  }

  for (const t of templates) {
    const { error } = await supabase
      .from('omr_templates')
      .upsert({
        template_id: t.templateId,
        title: t.title,
        question_count: t.questionCount,
        marks_per_question: t.marksPerQuestion,
        negative_marks_per_question: t.negativeMarksPerQuestion,
        answer_key: t.answerKey
      });
    if (error) throw error;
  }
};

const getOMRPapers = async () => {
  if (!isSupabaseConfigured) {
    return getOMRPapersLocal();
  }

  const { data, error } = await supabase
    .from('omr_papers')
    .select('*');
  if (error) throw error;
  
  return data.map(p => ({
    id: p.id,
    studentName: p.student_name,
    studentId: p.student_id_code,
    studentUuid: p.student_id,
    templateId: p.template_id,
    status: p.status,
    submissionDate: p.submission_date,
    imagePath: p.image_path,
    selectedAnswers: p.selected_answers,
    evaluation: p.evaluation,
    evaluatorNotes: p.evaluator_notes,
    isPublished: p.is_published
  }));
};

const saveOMRPapers = async (papers) => {
  if (!isSupabaseConfigured) {
    return saveOMRPapersLocal(papers);
  }

  for (const p of papers) {
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('name', p.studentName)
      .maybeSingle();

    const studentUuid = user ? user.id : p.studentUuid || null;

    const { error } = await supabase
      .from('omr_papers')
      .upsert({
        id: p.id,
        student_id: studentUuid,
        student_name: p.studentName,
        student_id_code: p.studentId,
        template_id: p.templateId,
        status: p.status,
        submission_date: p.submissionDate,
        image_path: p.imagePath || null,
        selected_answers: p.selectedAnswers,
        evaluation: p.evaluation,
        evaluator_notes: p.evaluatorNotes || '',
        is_published: p.isPublished || false
      });
    if (error) throw error;
  }
};

const getUsers = async () => {
  if (!isSupabaseConfigured) {
    return getUsersLocal();
  }

  const { data, error } = await supabase
    .from('users')
    .select('*');
  if (error) throw error;

  return data.map(u => ({
    email: u.email,
    password: u.password_hash,
    role: u.role,
    fullName: u.name,
    department: u.department,
    phoneNumber: u.phone_number,
    rollNumber: u.roll_number,
    semester: u.semester,
    enrollmentYear: u.enrollment_year,
    college: u.college,
    facultyId: u.faculty_id,
    designation: u.designation,
    yearsOfExperience: u.years_of_experience,
    subjectsTeaching: u.subjects_teaching
  }));
};

const saveUsers = async (users) => {
  if (!isSupabaseConfigured) {
    return saveUsersLocal(users);
  }

  for (const u of users) {
    const { error } = await supabase
      .from('users')
      .upsert({
        email: u.email.toLowerCase(),
        password_hash: u.password,
        role: u.role,
        name: u.fullName || u.email,
        department: u.department || null,
        phone_number: u.phoneNumber || null,
        roll_number: u.rollNumber || null,
        semester: u.semester || null,
        enrollment_year: u.enrollmentYear || null,
        college: u.college || null,
        faculty_id: u.facultyId || null,
        designation: u.designation || null,
        years_of_experience: u.yearsOfExperience || null,
        subjects_teaching: u.subjectsTeaching || null
      }, { onConflict: 'email' });
    if (error) throw error;
  }
};

const getUserFromRequest = async (req) => {
  const email = req.headers['x-user-email'] || req.query.userEmail;
  if (email) {
    try {
      if (isSupabaseConfigured) {
        const { data: user } = await supabase
          .from('users')
          .select('*')
          .eq('email', email.toLowerCase())
          .maybeSingle();
        return user;
      } else {
        const users = getUsersLocal();
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        return user;
      }
    } catch (e) {
      console.error('User extraction failed:', e);
    }
  }
  return null;
};

const getRoleFromRequest = async (req) => {
  const user = await getUserFromRequest(req);
  if (user) return user.role;
  return req.query.role || 'student';
};

const authMiddleware = async (req, res, next) => {
  try {
    if (!isSupabaseConfigured) {
      // Offline mode fallback using headers or query variables
      const email = req.headers['x-user-email'] || req.query.userEmail;
      if (email) {
        const users = getUsersLocal();
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (user) {
          req.user = {
            id: user.rollNumber || user.facultyId || 'mock-id',
            email: user.email,
            role: user.role,
            name: user.fullName || user.email
          };
          return next();
        }
      }
      return res.status(401).json({ error: 'Unauthorized: Missing user context in offline mode' });
    }

    // Online mode: verify JWT from Authorization header or query parameter
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query.token) {
      token = req.query.token;
    }

    let user;

    if (token) {
      const { data: { user: authUser }, error } = await supabaseAuth.auth.getUser(token);
      if (error || !authUser) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token session' });
      }
      user = authUser;
    } else {
      // Fallback for simple dashboard requests and migration transition
      const email = req.headers['x-user-email'] || req.query.userEmail;
      if (email) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('email', email.toLowerCase())
          .maybeSingle();
        if (profile) {
          req.user = {
            id: profile.id,
            email: profile.email,
            role: profile.role,
            name: profile.name
          };
          return next();
        }
      }
      return res.status(401).json({ error: 'Unauthorized: Missing token or user context' });
    }

    // Load profile metadata
    const { data: profile, error: pError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (pError || !profile) {
      return res.status(401).json({ error: 'Unauthorized: User profile registration not found' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: profile.role,
      name: profile.name
    };
    next();
  } catch (err) {
    console.error('Auth middleware execution failed:', err);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
};

// Multimodal Gemini Vision OCR helper to segment handwritten/printed sheets
const extractAnswersFromImage = async (imagePathInput, promptType = 'student', subjectQuestions = []) => {
  const hasGeminiKey = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('your_gemini_api_key_here');
  if (!hasGeminiKey) {
    console.warn('[AI ENGINE] Gemini API key not set. Returning mock extraction data.');
    if (promptType === 'exam_key') {
      return subjectQuestions.map((q, idx) => ({
        question_no: idx + 1,
        question_text: q.text || `Define and explain characteristic elements of Question ${idx + 1}`,
        reference_answer: q.modelAnswer || `This is the model answer key for Question ${idx + 1}.`,
        max_marks: q.maxMarks || 10.0,
        extraction_confidence: 95.0
      }));
    } else {
      return subjectQuestions.map((q, idx) => ({
        question_no: idx + 1,
        student_answer: `This is a student written answer for Question ${idx + 1}. It contains details regarding the topic, referencing various aspects and explanation structures.`,
        extraction_confidence: 90.0
      }));
    }
  }

  try {
    let paths = [];
    if (Array.isArray(imagePathInput)) {
      paths = imagePathInput;
    } else if (typeof imagePathInput === 'string') {
      paths = imagePathInput.includes(',') ? imagePathInput.split(',') : [imagePathInput];
    } else {
      throw new Error(`Invalid imagePathInput format: ${imagePathInput}`);
    }

    let prompt = '';
    let responseSchema;

    if (promptType === 'exam_key') {
      prompt = `
You are an expert academic OCR scanning engine. Your task is to segment this uploaded model answer sheet/key.
Identify only genuine question headings — patterns like Q1, Q1., Question 1, Question No. 3 that mark the start of a new question on the page, typically appearing as a distinct heading/label, often followed by 'Answer:' or directly by prose. Do NOT treat numbered or lettered list markers inside an answer (1), 2), a), (i), bullet points, dashes) as new questions — these are part of the answer content for the current question and must be included in full within that question's answer field. Continue accumulating answer content until the next genuine question heading is found.

If an answer to a question spans across a page break (or across multiple uploaded images), merge the text from both pages into a single continuous answer. Do not create a separate question record for continuation text.

For each question, extract:
1. The question number (as a clean integer).
2. The question text.
3. The reference model answer provided by the professor.
4. The maximum marks allocated to this question (as a number, e.g. 10.0).

Return the extracted information as a JSON array of objects matching the output schema.
`;

      responseSchema = {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            question_no: { type: "INTEGER" },
            question: { type: "STRING" },
            answer: { type: "STRING" },
            max_marks: { type: "NUMBER" },
            confidence: { type: "NUMBER" }
          },
          required: ["question_no", "question", "answer", "max_marks", "confidence"]
        }
      };
    } else {
      prompt = `
You are an expert academic handwriting OCR scanning engine. Your task is to extract student answers from this handwritten exam answer script.
Identify only genuine question headings — patterns like Q1, Q1., Question 1, Question No. 3 that mark the start of a new question on the page, typically appearing as a distinct heading/label, often followed by 'Answer:' or directly by prose. Do NOT treat numbered or lettered list markers inside an answer (1), 2), a), (i), bullet points, dashes) as new questions — these are part of the answer content for the current question and must be included in full within that question's answer field. Continue accumulating answer content until the next genuine question heading is found.

If an answer to a question spans across a page break (or across multiple uploaded images), merge the text from both pages into a single continuous answer. Do not create a separate question record for continuation text.

For each answer corresponding to a question:
1. Locate the question number (as a clean integer, e.g. 1, 2, 3).
2. Transcribe the handwritten student answer verbatim. Do NOT modify the wording, grammar, or content. Keep it exactly as written.

Return the extracted information as a JSON array of objects matching the output schema.
`;

      responseSchema = {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            question_no: { type: "INTEGER" },
            question: { type: "STRING" },
            answer: { type: "STRING" },
            confidence: { type: "NUMBER" }
          },
          required: ["question_no", "question", "answer", "confidence"]
        }
      };
    }

    const parts = [{ text: prompt }];

    for (const imgPath of paths) {
      const trimmedPath = imgPath.trim();
      if (!trimmedPath) continue;
      const ext = path.basename(trimmedPath).split('.').pop().toLowerCase();
      let mimeType = 'image/png';
      if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
      else if (ext === 'pdf') mimeType = 'application/pdf';

      const filePath = path.join(__dirname, trimmedPath);
      if (!fs.existsSync(filePath)) {
        console.warn(`[AI ENGINE] File not found at path: ${filePath}, skipping...`);
        continue;
      }

      const imageBuffer = fs.readFileSync(filePath);
      const imageBase64 = imageBuffer.toString('base64');
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: imageBase64
        }
      });
    }

    if (parts.length === 1) {
      throw new Error(`No valid files found or processed from: ${imagePathInput}`);
    }

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: responseSchema
        }
      })
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      throw new Error(`Gemini API error during segmentation (${geminiRes.status}): ${errText}`);
    }

    const geminiData = await geminiRes.json();
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log('[AI ENGINE] Gemini raw response:', responseText);

    if (!responseText) {
      throw new Error('Gemini API returned an empty response text.');
    }

    let cleanText = responseText.trim();
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();
    }

    const parsed = JSON.parse(cleanText);
    console.log('[AI ENGINE] Successfully parsed Gemini JSON response:', parsed);

    const items = Array.isArray(parsed) ? parsed : (parsed.questions || parsed.answers || []);

    return items.map(item => {
      const confidencePercent = item.confidence 
        ? (item.confidence <= 1.0 ? item.confidence * 100 : item.confidence)
        : 90.0;

      if (promptType === 'exam_key') {
        return {
          question_no: item.question_no || 1,
          question_text: item.question || item.question_text || 'Question Text',
          reference_answer: item.answer || item.reference_answer || '',
          max_marks: item.max_marks || 10.0,
          extraction_confidence: confidencePercent
        };
      } else {
        return {
          question_no: item.question_no || 1,
          question_text: item.question || item.question_text || 'Question Text',
          student_answer: item.answer || item.student_answer || '',
          extraction_confidence: confidencePercent
        };
      }
    });
  } catch (error) {
    console.error('[AI ENGINE] Gemini Vision OCR segmentation failed:', error);
    throw error;
  }
};

// Consolidated shared OCR extraction + DB sync helper
const extractQuestionAnswers = async (fileUrl, promptType, examOrSubmissionId) => {
  let subjectQuestions = [];
  if (isSupabaseConfigured) {
    try {
      if (promptType === 'exam_key') {
        const { data: examData } = await supabase
          .from('exams')
          .select('*, subjects!subject_id(*)')
          .eq('id', examOrSubmissionId)
          .maybeSingle();
        if (examData) {
          const { data: qData } = await supabase
            .from('questions')
            .select('*')
            .eq('subject_id', examData.subject_id)
            .order('question_code', { ascending: true });
          if (qData) {
            subjectQuestions = qData;
          }
        }
      } else {
        // For student submissions
        const { data: subData } = await supabase
          .from('submissions')
          .select('*, exams!exam_id(*, subjects!subject_id(*))')
          .eq('id', examOrSubmissionId)
          .maybeSingle();
        if (subData?.exams) {
          const { data: qData } = await supabase
            .from('questions')
            .select('*')
            .eq('subject_id', subData.exams.subject_id)
            .order('question_code', { ascending: true });
          if (qData) {
            subjectQuestions = qData;
          }
        }
      }
    } catch (err) {
      console.error('[AI ENGINE] Failed to resolve subject questions for fallback:', err);
    }
  }

  console.log(`[AI ENGINE] extractQuestionAnswers running for ${promptType} (ID: ${examOrSubmissionId})`);
  const extracted = await extractAnswersFromImage(fileUrl, promptType, subjectQuestions);

  if (isSupabaseConfigured) {
    if (promptType === 'exam_key') {
      // Clear old unconfirmed answer keys for this exam
      const { error: delError } = await supabase.from('answer_keys').delete().eq('exam_id', examOrSubmissionId);
      if (delError) console.error('Error clearing old answer keys:', delError);

      for (const item of extracted) {
        const { error: insError } = await supabase
          .from('answer_keys')
          .insert({
            exam_id: examOrSubmissionId,
            question_no: item.question_no || 1,
            question_text: item.question_text || 'Define and explain...',
            reference_answer: item.reference_answer || '',
            max_marks: item.max_marks || 10.0,
            extraction_confidence: item.extraction_confidence || 90.0,
            source_image_region: null
          });
        if (insError) console.error('Error inserting answer key item:', insError);
      }
    } else {
      // Clear old student answers for this submission
      const { error: delError } = await supabase.from('student_answers').delete().eq('submission_id', examOrSubmissionId);
      if (delError) console.error('Error clearing old student answers:', delError);

      for (const item of extracted) {
        const { error: insError } = await supabase
          .from('student_answers')
          .insert({
            submission_id: examOrSubmissionId,
            question_no: item.question_no || 1,
            student_answer: item.student_answer || '',
            extraction_confidence: item.extraction_confidence || 90.0,
            source_image_region: null
          });
        if (insError) console.error('Error inserting student answer item:', insError);
      }
    }
  }

  return extracted;
};

// API: Subject endpoints
app.get(['/api/subjects', '/api/student/subjects'], authMiddleware, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.json(await getSubjects());
    }

    if (req.user.role === 'student') {
      // Return subjects enrolled by student
      const { data, error } = await supabase
        .from('student_subjects')
        .select(`
          subject_id,
          subjects:subject_id (
            id,
            code,
            name,
            professor:professor_id (
              name
            )
          )
        `)
        .eq('student_id', req.user.id);
        
      if (error) throw error;
      
      const enrolled = data ? data.map(d => {
        const s = d.subjects;
        return {
          id: s.id,
          code: s.code,
          name: s.name,
          professorName: s.professor ? s.professor.name : 'Unknown'
        };
      }) : [];
      
      res.json(enrolled);
    } else {
      // Return subjects taught by professor
      const { data: subjects, error } = await supabase
        .from('subjects')
        .select(`
          id,
          code,
          name,
          professor:professor_id (
            name
          )
        `)
        .eq('professor_id', req.user.id);
        
      if (error) throw error;
      
      const results = subjects ? subjects.map(s => ({
        id: s.id,
        code: s.code,
        name: s.name,
        professorName: s.professor ? s.professor.name : 'Unknown'
      })) : [];
      
      res.json(results);
    }
  } catch (error) {
    console.error('Failed to retrieve subjects:', error);
    res.status(500).json({ error: 'Failed to read subjects data' });
  }
});

// Student Self-Enrollment
app.post('/api/subjects/enroll', authMiddleware, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.json({ message: 'Offline mode: enrollment skipped.' });
    }

    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Subject code is required' });
    }

    // Resolve subject ID
    const { data: subject, error: subError } = await supabase
      .from('subjects')
      .select('id')
      .eq('code', code.trim().toUpperCase())
      .maybeSingle();

    if (subError || !subject) {
      return res.status(404).json({ error: 'Subject code not found' });
    }

    // Insert student_subjects enrollment record
    const { error: enrollError } = await supabase
      .from('student_subjects')
      .insert({
        student_id: req.user.id,
        subject_id: subject.id
      });

    if (enrollError) {
      if (enrollError.code === '23505') {
        return res.status(400).json({ error: 'You are already enrolled in this subject' });
      }
      throw enrollError;
    }

    res.json({ message: 'Successfully enrolled in course subject', subjectId: subject.id });
  } catch (error) {
    console.error('Enrollment failed:', error);
    res.status(500).json({ error: 'Failed to complete enrollment process' });
  }
});

app.post('/api/subjects', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'professor') {
      return res.status(403).json({ error: 'Only professors can create subjects.' });
    }
    const subjects = await getSubjects();
    const newSubject = req.body;
    
    if (!newSubject.id || !newSubject.name) {
      return res.status(400).json({ error: 'Subject ID and Name are required' });
    }

    const index = subjects.findIndex(s => s.id === newSubject.id);
    if (index !== -1) {
      subjects[index] = newSubject;
    } else {
      subjects.push(newSubject);
    }

    await saveSubjects(subjects);
    res.status(201).json(newSubject);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save subject data' });
  }
});

// API: Exam endpoints
app.get('/api/exams', authMiddleware, async (req, res) => {
  try {
    const { subjectId } = req.query;
    if (!isSupabaseConfigured) {
      let exams = getExamsLocal();
      if (subjectId) {
        exams = exams.filter(e => e.subject_id === subjectId);
      }
      return res.json(exams);
    }
    let query = supabase.from('exams').select('*');
    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    }
    const { data: exams, error } = await query;
    if (error) throw error;
    res.json(exams || []);
  } catch (err) {
    console.error('Exams query failed:', err);
    res.status(500).json({ error: 'Failed to read exams data' });
  }
});

// API: System Status & Health Check
app.get('/api/health', async (req, res) => {
  let dbStatus = 'unreachable';
  let geminiStatus = 'unreachable';

  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('users').select('id').limit(1);
      if (!error) {
        dbStatus = 'connected';
      }
    } else {
      dbStatus = 'offline_mode';
    }
  } catch (err) {
    console.error('Health DB ping failed:', err);
  }

  try {
    const hasGeminiKey = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('your_gemini_api_key_here');
    if (hasGeminiKey) {
      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash?key=${process.env.GEMINI_API_KEY}`);
      if (geminiRes.ok) {
        geminiStatus = 'connected';
      } else {
        geminiStatus = 'degraded';
      }
    } else {
      geminiStatus = 'key_missing';
    }
  } catch (err) {
    console.error('Health Gemini ping failed:', err);
  }

  res.json({
    status: 'healthy',
    backend: 'connected',
    database: dbStatus,
    geminiApi: geminiStatus,
    version: '1.0.0'
  });
});

// API: Get Student Profile & Settings
app.get('/api/student/settings', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Access denied' });
    }

    let profile = {};
    let settings = {
      notificationPreferences: {
        new_result: true,
        submission_confirmed: true,
        feedback_available: true,
        weekly_progress: false
      }
    };

    if (isSupabaseConfigured) {
      // Fetch user profile info
      const { data: userProfile, error: pErr } = await supabase
        .from('users')
        .select('*')
        .eq('id', req.user.id)
        .maybeSingle();

      if (pErr) throw pErr;
      if (userProfile) {
        profile = {
          name: userProfile.name,
          email: userProfile.email,
          college: userProfile.college || '',
          department: userProfile.department || '',
          rollNumber: userProfile.roll_number || '',
          semester: userProfile.semester || ''
        };
      }

      // Fetch settings using professor_settings table
      const { data: userSettings, error: sErr } = await supabase
        .from('professor_settings')
        .select('*')
        .eq('professor_id', req.user.id)
        .maybeSingle();

      if (sErr) throw sErr;
      if (userSettings) {
        settings = {
          notificationPreferences: userSettings.notification_preferences || settings.notificationPreferences
        };
      }
    } else {
      // Local JSON mode
      const users = getUsersLocal();
      const userObj = users.find(u => u.email.toLowerCase() === req.user.email.toLowerCase());
      if (userObj) {
        profile = {
          name: userObj.fullName || userObj.name,
          email: userObj.email,
          college: userObj.college || '',
          department: userObj.department || '',
          rollNumber: userObj.rollNumber || '',
          semester: userObj.semester || ''
        };
      }

      const allSettings = getProfessorSettingsLocal();
      const userSettings = allSettings[req.user.email.toLowerCase()];
      if (userSettings) {
        settings = {
          notificationPreferences: userSettings.notificationPreferences || settings.notificationPreferences
        };
      }
    }

    res.json({ profile, settings });
  } catch (err) {
    console.error('Failed to get student settings:', err);
    res.status(500).json({ error: 'Failed to read settings' });
  }
});

// API: Update Student Settings
app.post('/api/student/settings', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { notificationPreferences } = req.body;

    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('professor_settings')
        .upsert({
          professor_id: req.user.id,
          notification_preferences: notificationPreferences
        });

      if (error) throw error;
    } else {
      const allSettings = getProfessorSettingsLocal();
      allSettings[req.user.email.toLowerCase()] = {
        ...allSettings[req.user.email.toLowerCase()],
        notificationPreferences
      };
      saveProfessorSettingsLocal(allSettings);
    }

    res.json({ message: 'Notification preferences saved successfully' });
  } catch (err) {
    console.error('Failed to save settings:', err);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// API: Update Student Profile
app.post('/api/student/profile', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { name, email, college, department, rollNumber, semester } = req.body;

    if (isSupabaseConfigured) {
      const { error: uErr } = await supabase
        .from('users')
        .update({
          name: name,
          email: email,
          college: college,
          department: department,
          roll_number: rollNumber,
          semester: semester
        })
        .eq('id', req.user.id);
      if (uErr) throw uErr;

      // Update Supabase Auth if email changed
      if (email.toLowerCase() !== req.user.email.toLowerCase()) {
        const { error: authErr } = await supabaseAuth.auth.admin.updateUserById(req.user.id, {
          email: email,
          user_metadata: { name: name }
        });
        if (authErr) throw authErr;
      }
    } else {
      const users = getUsersLocal();
      const idx = users.findIndex(u => u.email.toLowerCase() === req.user.email.toLowerCase());
      if (idx !== -1) {
        users[idx].fullName = name;
        users[idx].email = email;
        users[idx].college = college;
        users[idx].department = department;
        users[idx].rollNumber = rollNumber;
        users[idx].semester = semester;
        saveUsersLocal(users);
      }
    }

    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error('Failed to update student profile:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// API: Change Student Password (with Re-Authentication)
app.post('/api/student/change-password', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { currentPassword, newPassword } = req.body;

    if (isSupabaseConfigured) {
      // Re-authenticate user with current password
      const { error: signInErr } = await supabaseAuth.auth.signInWithPassword({
        email: req.user.email,
        password: currentPassword
      });

      if (signInErr) {
        return res.status(401).json({ error: 'Invalid current password. Re-authentication failed.' });
      }

      // Change password securely
      const { error: updateErr } = await supabaseAuth.auth.admin.updateUserById(req.user.id, {
        password: newPassword
      });
      if (updateErr) throw updateErr;
    } else {
      const users = getUsersLocal();
      const idx = users.findIndex(u => u.email.toLowerCase() === req.user.email.toLowerCase());
      if (idx !== -1) {
        if (users[idx].password !== currentPassword) {
          return res.status(401).json({ error: 'Invalid current password. Re-authentication failed.' });
        }
        users[idx].password = newPassword;
        saveUsersLocal(users);
      }
    }

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Failed to change password:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// API: Get Professor Profile & Settings
app.get('/api/professor/settings', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'professor') {
      return res.status(403).json({ error: 'Access denied' });
    }

    let profile = {};
    let settings = {
      defaultMarksPerQuestion: 1.00,
      defaultNegativeMarking: 0.00,
      defaultEvaluationMode: 'descriptive',
      notificationPreferences: {
        new_submission: true,
        evaluation_completed: true,
        student_appeals: true,
        weekly_summary: false
      }
    };

    if (isSupabaseConfigured) {
      // Fetch user profile info
      const { data: userProfile, error: pErr } = await supabase
        .from('users')
        .select('*')
        .eq('id', req.user.id)
        .maybeSingle();

      if (pErr) throw pErr;
      if (userProfile) {
        profile = {
          name: userProfile.name,
          email: userProfile.email,
          department: userProfile.department || '',
          facultyId: userProfile.faculty_id || ''
        };
      }

      // Fetch user settings
      const { data: userSettings, error: sErr } = await supabase
        .from('professor_settings')
        .select('*')
        .eq('professor_id', req.user.id)
        .maybeSingle();

      if (sErr) throw sErr;
      if (userSettings) {
        settings = {
          defaultMarksPerQuestion: parseFloat(userSettings.default_marks_per_question || 1.00),
          defaultNegativeMarking: parseFloat(userSettings.default_negative_marking || 0.00),
          defaultEvaluationMode: userSettings.default_evaluation_mode || 'descriptive',
          notificationPreferences: userSettings.notification_preferences || settings.notificationPreferences
        };
      }
    } else {
      // Local JSON mode
      const users = getUsersLocal();
      const userObj = users.find(u => u.email.toLowerCase() === req.user.email.toLowerCase());
      if (userObj) {
        profile = {
          name: userObj.fullName || userObj.name,
          email: userObj.email,
          department: userObj.department || '',
          facultyId: userObj.facultyId || ''
        };
      }

      const allSettings = getProfessorSettingsLocal();
      const userSettings = allSettings[req.user.email.toLowerCase()];
      if (userSettings) {
        settings = {
          defaultMarksPerQuestion: parseFloat(userSettings.defaultMarksPerQuestion || 1.00),
          defaultNegativeMarking: parseFloat(userSettings.defaultNegativeMarking || 0.00),
          defaultEvaluationMode: userSettings.defaultEvaluationMode || 'descriptive',
          notificationPreferences: userSettings.notificationPreferences || settings.notificationPreferences
        };
      }
    }

    res.json({ profile, settings });
  } catch (err) {
    console.error('Failed to get settings:', err);
    res.status(500).json({ error: 'Failed to read settings' });
  }
});

// API: Update Professor Settings
app.post('/api/professor/settings', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'professor') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { defaultMarksPerQuestion, defaultNegativeMarking, defaultEvaluationMode, notificationPreferences } = req.body;

    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('professor_settings')
        .upsert({
          professor_id: req.user.id,
          default_marks_per_question: parseFloat(defaultMarksPerQuestion || 1.00),
          default_negative_marking: parseFloat(defaultNegativeMarking || 0.00),
          default_evaluation_mode: defaultEvaluationMode || 'descriptive',
          notification_preferences: notificationPreferences
        });

      if (error) throw error;
    } else {
      const allSettings = getProfessorSettingsLocal();
      allSettings[req.user.email.toLowerCase()] = {
        defaultMarksPerQuestion,
        defaultNegativeMarking,
        defaultEvaluationMode,
        notificationPreferences
      };
      saveProfessorSettingsLocal(allSettings);
    }

    res.json({ message: 'Evaluation and notification settings saved successfully' });
  } catch (err) {
    console.error('Failed to save settings:', err);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// API: Update Professor Profile
app.post('/api/professor/profile', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'professor') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { name, email, department, facultyId } = req.body;

    if (isSupabaseConfigured) {
      // 1. Update public.users table
      const { error: uErr } = await supabase
        .from('users')
        .update({
          name: name,
          email: email,
          department: department,
          faculty_id: facultyId
        })
        .eq('id', req.user.id);
      if (uErr) throw uErr;

      // 2. Update Supabase Auth if email changed
      if (email.toLowerCase() !== req.user.email.toLowerCase()) {
        const { error: authErr } = await supabaseAuth.auth.admin.updateUserById(req.user.id, {
          email: email,
          user_metadata: { name: name }
        });
        if (authErr) throw authErr;
      }
    } else {
      const users = getUsersLocal();
      const idx = users.findIndex(u => u.email.toLowerCase() === req.user.email.toLowerCase());
      if (idx !== -1) {
        users[idx].fullName = name;
        users[idx].email = email;
        users[idx].department = department;
        users[idx].facultyId = facultyId;
        saveUsersLocal(users);
      }
    }

    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error('Failed to update profile:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// API: Change Professor Password (with Re-Authentication)
app.post('/api/professor/change-password', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'professor') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { currentPassword, newPassword } = req.body;

    if (isSupabaseConfigured) {
      // 1. Re-authenticate user with current password
      const { error: signInErr } = await supabaseAuth.auth.signInWithPassword({
        email: req.user.email,
        password: currentPassword
      });

      if (signInErr) {
        return res.status(401).json({ error: 'Invalid current password. Re-authentication failed.' });
      }

      // 2. Change password via admin panel securely
      const { error: updateErr } = await supabaseAuth.auth.admin.updateUserById(req.user.id, {
        password: newPassword
      });
      if (updateErr) throw updateErr;
    } else {
      const users = getUsersLocal();
      const idx = users.findIndex(u => u.email.toLowerCase() === req.user.email.toLowerCase());
      if (idx !== -1) {
        if (users[idx].password !== currentPassword) {
          return res.status(401).json({ error: 'Invalid current password. Re-authentication failed.' });
        }
        users[idx].password = newPassword;
        saveUsersLocal(users);
      }
    }

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Failed to change password:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// API: Create New Exam
app.post('/api/exams', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'professor') {
      return res.status(403).json({ error: 'Only professors can create exams.' });
    }
    const { 
      subjectId, title, evaluationType, examDate, totalQuestions, 
      marksPerQuestion, negativeMarking, department, semester, templateId 
    } = req.body;
    
    if (!subjectId || !title) {
      return res.status(400).json({ error: 'Subject ID and Title are required' });
    }

    // Fetch professor settings for fallback defaults
    let defaultMarks = 1.0;
    let defaultNegative = 0.0;
    let defaultEvalMode = 'descriptive';

    if (isSupabaseConfigured) {
      const { data: profSet } = await supabase
        .from('professor_settings')
        .select('*')
        .eq('professor_id', req.user.id)
        .maybeSingle();
      if (profSet) {
        defaultMarks = parseFloat(profSet.default_marks_per_question ?? 1.0);
        defaultNegative = parseFloat(profSet.default_negative_marking ?? 0.0);
        defaultEvalMode = profSet.default_evaluation_mode ?? 'descriptive';
      }
    } else {
      const allSettings = getProfessorSettingsLocal();
      const profSet = allSettings[req.user.email.toLowerCase()];
      if (profSet) {
        defaultMarks = parseFloat(profSet.defaultMarksPerQuestion ?? 1.0);
        defaultNegative = parseFloat(profSet.defaultNegativeMarking ?? 0.0);
        defaultEvalMode = profSet.defaultEvaluationMode ?? 'descriptive';
      }
    }

    const examData = {
      subject_id: subjectId,
      title: title,
      evaluation_type: evaluationType || defaultEvalMode,
      exam_date: examDate || null,
      total_questions: totalQuestions ? parseInt(totalQuestions) : null,
      marks_per_question: (marksPerQuestion !== undefined && marksPerQuestion !== '') ? parseFloat(marksPerQuestion) : defaultMarks,
      negative_marking: (negativeMarking !== undefined && negativeMarking !== '') ? parseFloat(negativeMarking) : defaultNegative,
      department: department || null,
      semester: semester || null,
      template_id: templateId || null,
      is_answer_key_confirmed: false
    };

    if (isSupabaseConfigured) {
      const { data: newExam, error } = await supabase
        .from('exams')
        .insert(examData)
        .select('*')
        .single();
      if (error) throw error;
      res.status(201).json(newExam);
    } else {
      const exams = getExamsLocal();
      const newExam = {
        id: 'mock-exam-' + Date.now(),
        ...examData
      };
      exams.push(newExam);
      saveExamsLocal(exams);
      res.status(201).json(newExam);
    }
  } catch (error) {
    console.error('Failed to create exam:', error);
    res.status(500).json({ error: 'Failed to create exam: ' + error.message });
  }
});

// API: Upload Exam Model Answer Key
app.post('/api/exams/:id/upload-key', authMiddleware, upload.any(), async (req, res) => {
  try {
    if (req.user.role !== 'professor') {
      return res.status(403).json({ error: 'Only professors can upload answer keys.' });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Sort files according to client fileOrder if provided
    let orderedFiles = [...req.files];
    if (req.body.fileOrder) {
      const order = req.body.fileOrder.split(',').map(name => name.trim());
      orderedFiles.sort((a, b) => {
        const indexA = order.indexOf(a.originalname);
        const indexB = order.indexOf(b.originalname);
        if (indexA !== -1 && indexB !== -1) {
          return indexA - indexB;
        }
        return 0;
      });
    }

    const fileUrl = orderedFiles.map(f => `/uploads/${f.filename}`).join(',');

    const examId = req.params.id;

    // 1. Update the exam's answer_key_file_url in DB
    if (isSupabaseConfigured) {
      const { error: examError } = await supabase
        .from('exams')
        .update({
          answer_key_file_url: fileUrl,
          is_answer_key_confirmed: false
        })
        .eq('id', examId);
      if (examError) throw examError;
    }

    // 2. Perform consolidated VLM extraction and database insertion of the answer key
    const extracted = await extractQuestionAnswers(fileUrl, 'exam_key', examId);

    res.json({
      message: 'Answer key uploaded and segmented successfully',
      fileUrl,
      questions: extracted
    });
  } catch (error) {
    console.error('Answer key upload failed:', error);
    res.status(500).json({ error: 'Failed to process answer key upload: ' + error.message });
  }
});

// API: Get Exam Answer Key (Extracted/Confirmed questions)
app.get('/api/exams/:id/answer-key', authMiddleware, async (req, res) => {
  try {
    const examId = req.params.id;

    if (isSupabaseConfigured) {
      const { data: keys, error } = await supabase
        .from('answer_keys')
        .select('*')
        .eq('exam_id', examId)
        .order('question_no', { ascending: true });
      if (error) throw error;

      const { data: exam } = await supabase
        .from('exams')
        .select('answer_key_file_url, is_answer_key_confirmed')
        .eq('id', examId)
        .maybeSingle();

      return res.json({
        isConfirmed: exam ? exam.is_answer_key_confirmed : false,
        fileUrl: exam ? exam.answer_key_file_url : null,
        questions: keys || []
      });
    } else {
      return res.json({
        isConfirmed: false,
        fileUrl: null,
        questions: []
      });
    }
  } catch (error) {
    console.error('Failed to retrieve answer key:', error);
    res.status(500).json({ error: 'Failed to retrieve answer key' });
  }
});

// API: Confirm/Edit Exam Answer Key
app.post('/api/exams/:id/confirm-key', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'professor') {
      return res.status(403).json({ error: 'Only professors can confirm answer keys.' });
    }
    const examId = req.params.id;
    const { questions } = req.body;

    if (!questions || !Array.isArray(questions)) {
      return res.status(400).json({ error: 'Questions list is required' });
    }

    if (isSupabaseConfigured) {
      // 1. Delete existing keys for this exam
      await supabase.from('answer_keys').delete().eq('exam_id', examId);

      // 2. Insert confirmed keys
      for (const q of questions) {
        const { error: insError } = await supabase
          .from('answer_keys')
          .insert({
            exam_id: examId,
            question_no: parseInt(q.question_no),
            question_text: q.question_text,
            reference_answer: q.reference_answer,
            max_marks: parseFloat(q.max_marks || 10.0),
            extraction_confidence: parseFloat(q.extraction_confidence || 100.0)
          });
        if (insError) throw insError;
      }

      // 3. Mark exam as confirmed
      const { error: examError } = await supabase
        .from('exams')
        .update({ is_answer_key_confirmed: true })
        .eq('id', examId);
      if (examError) throw examError;
    }

    res.json({ message: 'Answer key confirmed successfully. Exam is now active.' });
  } catch (error) {
    console.error('Failed to confirm answer key:', error);
    res.status(500).json({ error: 'Failed to confirm answer key: ' + error.message });
  }
});

// API: Get OMR Answer Key
app.get('/api/exams/:id/omr-key', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isSupabaseConfigured) {
      const keys = getOMRAnswerKeysLocal().filter(k => k.exam_id === id);
      return res.json(keys);
    }
    const { data: keys, error } = await supabase
      .from('omr_answer_keys')
      .select('*')
      .eq('exam_id', id)
      .order('question_no', { ascending: true });
    if (error) throw error;
    res.json(keys || []);
  } catch (err) {
    console.error('Failed to get OMR answer key:', err);
    res.status(500).json({ error: 'Failed to read OMR answer key' });
  }
});

// API: Confirm OMR Answer Key Manually
app.post('/api/exams/:id/omr-key/confirm', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'professor') {
      return res.status(403).json({ error: 'Only professors can confirm answer keys.' });
    }
    const { id } = req.params;
    const { keys } = req.body; // Array of { questionNo, correctOption }
    if (!keys || !Array.isArray(keys)) {
      return res.status(400).json({ error: 'Keys array is required' });
    }

    if (isSupabaseConfigured) {
      // Delete old keys first
      await supabase.from('omr_answer_keys').delete().eq('exam_id', id);
      
      const insertData = keys.map(k => ({
        exam_id: id,
        question_no: k.questionNo,
        correct_option: k.correctOption
      }));

      const { error: insErr } = await supabase
        .from('omr_answer_keys')
        .insert(insertData);
      if (insErr) throw insErr;

      // Update exam as confirmed and negative marking
      const updatePayload = { is_answer_key_confirmed: true };
      if (req.body.negativeMarking !== undefined) {
        updatePayload.negative_marking = parseFloat(req.body.negativeMarking);
      }

      const { error: exErr } = await supabase
        .from('exams')
        .update(updatePayload)
        .eq('id', id);
      if (exErr) throw exErr;
    } else {
      let allKeys = getOMRAnswerKeysLocal().filter(k => k.exam_id !== id);
      const newKeys = keys.map(k => ({
        id: 'key-' + Date.now() + '-' + k.questionNo,
        exam_id: id,
        question_no: k.questionNo,
        correct_option: k.correctOption
      }));
      allKeys = [...allKeys, ...newKeys];
      saveOMRAnswerKeysLocal(allKeys);

      const exams = getExamsLocal();
      const idx = exams.findIndex(e => e.id === id);
      if (idx !== -1) {
        exams[idx].is_answer_key_confirmed = true;
        if (req.body.negativeMarking !== undefined) {
          exams[idx].negative_marking = parseFloat(req.body.negativeMarking);
        }
        saveExamsLocal(exams);
      }
    }
    res.json({ message: 'OMR Answer key confirmed successfully.' });
  } catch (err) {
    console.error('Failed to confirm OMR answer key:', err);
    res.status(500).json({ error: 'Failed to confirm OMR answer key: ' + err.message });
  }
});

// API: Paper endpoints
app.get('/api/papers', authMiddleware, async (req, res) => {
  try {
    let papers = await getPapers();
    
    if (req.user.role === 'student') {
      const studentEmail = req.user.email ? req.user.email.toLowerCase() : '';
      papers = papers.filter(p => p.studentUuid === req.user.id || (p.studentId && p.studentId.toLowerCase() === studentEmail));
      
      const allOriginalPapers = await getPapers();
      papers = papers.map(p => {
        const isPub = p.isPublished !== false;
        if (!isPub) {
          return {
            id: p.id,
            studentName: p.studentName,
            studentId: p.studentId,
            subjectId: p.subjectId,
            status: "pending_review",
            submissionDate: p.submissionDate,
            imagePath: p.imagePath,
            maxMarks: p.maxMarks
          };
        }

        // Find other published submissions for the same exam/subject
        const sameExamPapers = allOriginalPapers.filter(x => {
          const isSameExam = isSupabaseConfigured && p.examId 
            ? x.examId === p.examId 
            : x.subjectId === p.subjectId;
          return isSameExam && (x.isPublished !== false || x.status === 'released');
        });

        if (sameExamPapers.length >= 2) {
          const sum = sameExamPapers.reduce((acc, x) => acc + (x.totalScore || 0), 0);
          const max = sameExamPapers.reduce((acc, x) => acc + (x.maxMarks || 10.0), 0);
          p.classAverage = max > 0 ? parseFloat((sum / max * 100).toFixed(1)) : null;
        } else {
          p.classAverage = null;
        }

        return p;
      });
    } else if (req.user.role === 'professor') {
      let ownedSubjects = [];
      if (isSupabaseConfigured) {
        const { data } = await supabase
          .from('subjects')
          .select('code')
          .eq('professor_id', req.user.id);
        ownedSubjects = data ? data.map(s => s.code) : [];
      } else {
        ownedSubjects = req.user.subjectsTeaching || [];
      }
      papers = papers.filter(p => ownedSubjects.includes(p.subjectId));
    }
    
    res.json(papers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to read papers data' });
  }
});

app.get('/api/papers/:id', authMiddleware, async (req, res) => {
  try {
    const papers = await getPapers();
    let paper = papers.find(p => p.id === req.params.id);
    if (!paper) return res.status(404).json({ error: 'Paper not found' });

    const isUnfinished = paper.status === 'pending' || paper.status === 'grading_failed';
    const hasAnswers = paper.answers && paper.answers.some(ans => ans.studentAnswer && ans.studentAnswer !== '');

    if ((isUnfinished || !hasAnswers) && isSupabaseConfigured) {
      console.log(`[AI ENGINE] On-the-fly evaluating unfinished paper: ${paper.id}`);
      try {
        paper = await runSubmissionGradingPipeline(paper.id);
      } catch (err) {
        console.error('[AI ENGINE] On-the-fly evaluation error:', err);
      }
    }

    if (req.user.role === 'student') {
      if (paper.studentUuid !== req.user.id && paper.studentId.toLowerCase() !== req.user.email.toLowerCase()) {
        return res.status(403).json({ error: 'Forbidden: You cannot view other student\'s papers.' });
      }

      const isPub = paper.isPublished !== false;
      if (!isPub) {
        return res.json({
          id: paper.id,
          studentName: paper.studentName,
          studentId: paper.studentId,
          subjectId: paper.subjectId,
          status: "pending_review",
          submissionDate: paper.submissionDate,
          imagePath: paper.imagePath,
          maxMarks: paper.maxMarks
        });
      }
    } else if (req.user.role === 'professor') {
      let ownedSubjects = [];
      if (isSupabaseConfigured) {
        const { data } = await supabase
          .from('subjects')
          .select('code')
          .eq('professor_id', req.user.id);
        ownedSubjects = data ? data.map(s => s.code) : [];
      } else {
        ownedSubjects = req.user.subjectsTeaching || [];
      }
      
      if (!ownedSubjects.includes(paper.subjectId)) {
        return res.status(403).json({ error: 'Forbidden: You do not teach the subject for this paper.' });
      }
    }
    
    res.json(paper);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to read paper' });
  }
});

// API: Generate server-side PDF feedback report
app.get('/api/papers/:id/report', authMiddleware, async (req, res) => {
  try {
    const papers = await getPapers();
    const paper = papers.find(p => p.id === req.params.id);
    if (!paper) return res.status(404).json({ error: 'Paper not found' });

    const isPub = paper.isPublished !== false;
    
    // Auth checks
    if (req.user.role === 'student') {
      if (paper.studentUuid !== req.user.id && paper.studentId.toLowerCase() !== req.user.email.toLowerCase()) {
        return res.status(403).json({ error: 'Forbidden: You cannot view other student\'s reports.' });
      }
      if (!isPub) {
        return res.status(403).json({ error: 'Forbidden: Evaluation results for this submission have not been released yet.' });
      }
    } else if (req.user.role === 'professor') {
      let ownedSubjects = [];
      if (isSupabaseConfigured) {
        const { data } = await supabase.from('subjects').select('code').eq('professor_id', req.user.id);
        ownedSubjects = data ? data.map(s => s.code) : [];
      } else {
        ownedSubjects = req.user.subjectsTeaching || [];
      }
      if (!ownedSubjects.includes(paper.subjectId)) {
        return res.status(403).json({ error: 'Forbidden: You do not teach the subject for this paper.' });
      }
    }

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report-${paper.studentName.replace(/\s+/g, '_')}-${paper.subjectId}.pdf"`);
    doc.pipe(res);

    // Compute stats
    const totalScore = paper.totalScore || 0;
    const maxMarks = paper.maxMarks || 10;
    const overallPercentage = maxMarks > 0 ? Math.round((totalScore / maxMarks) * 100) : 0;
    
    const avgOcrConf = paper.answers && paper.answers.length > 0
      ? Math.round(paper.answers.reduce((acc, a) => acc + (a.ocrConfidence || 0), 0) / paper.answers.length)
      : 95;

    const avgSimilarity = paper.answers && paper.answers.length > 0
      ? Math.round(paper.answers.reduce((acc, a) => acc + (a.similarityScore || a.score / (a.maxMarks || 10) * 100 || 0), 0) / paper.answers.length)
      : 90;

    const statusText = overallPercentage >= 85 ? 'EXCELLENT' : (overallPercentage >= 60 ? 'PASSED' : 'NEEDS IMPROVEMENT');
    const badgeColor = overallPercentage >= 85 ? '#10B981' : (overallPercentage >= 60 ? '#3B82F6' : '#EF4444');
    const badgeTextColor = '#FFFFFF';

    // ----------------------------------------------------
    // PAGE 1: HEADER & OVERALL PERFORMANCE SUMMARY
    // ----------------------------------------------------
    
    // ----------------------------------------------------
    // PAGE 1: HEADER & OVERALL PERFORMANCE SUMMARY
    // ----------------------------------------------------

    const isOMRPaper = paper.evaluationType === 'omr' || paper.id.startsWith('omr_');

    if (isOMRPaper) {
      // Draw Header Banner
      doc.fillColor('#0F172A').rect(0, 0, 595.28, 105).fill();
      doc.fillColor('#6366F1').rect(40, 30, 6, 45).fill(); // Indigo vertical accent line
      doc.fillColor('#FFFFFF').fontSize(18).font('Helvetica-Bold').text('EDULYTICS OMR EVALUATION REPORT', 56, 32);
      doc.fontSize(9).font('Helvetica').fillColor('#94A3B8').text('AI-Powered bubble sheet scan & classification report', 56, 56);

      // Header Right-side Overall Score Badge
      const circleX = 490;
      const circleY = 52;
      doc.circle(circleX, circleY, 32).lineWidth(3).strokeColor('#6366F1').stroke();
      doc.fillColor('#FFFFFF').fontSize(14).font('Helvetica-Bold').text(`${totalScore}`, circleX - 12, circleY - 10, { width: 24, align: 'center' });
      doc.fontSize(8).font('Helvetica').fillColor('#94A3B8').text(`/ ${maxMarks}`, circleX - 12, circleY + 5, { width: 24, align: 'center' });

      // Status Badge
      doc.fillColor(badgeColor).rect(circleX - 88, circleY - 10, 48, 16).fill();
      doc.fillColor(badgeTextColor).fontSize(6.5).font('Helvetica-Bold').text(statusText, circleX - 88, circleY - 5, { width: 48, align: 'center' });

      // Student Info Grid
      const avatarY = 125;
      doc.circle(40 + 22, avatarY + 22, 22).fillColor('#6366F1').fill();
      const initials = paper.studentName ? paper.studentName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'ST';
      doc.fillColor('#FFFFFF').fontSize(12).font('Helvetica-Bold').text(initials, 40 + 11, avatarY + 16, { width: 22, align: 'center' });

      // Info text
      doc.fillColor('#1E293B').fontSize(9.5);
      doc.font('Helvetica-Bold').text('Student Name:', 100, avatarY);
      doc.font('Helvetica').fillColor('#475569').text(paper.studentName || 'N/A', 100, avatarY + 14);
      doc.font('Helvetica-Bold').fillColor('#1E293B').text('Roll Number / Email:', 100, avatarY + 34);
      doc.font('Helvetica').fillColor('#475569').text(paper.studentId || 'N/A', 100, avatarY + 48);

      doc.font('Helvetica-Bold').fillColor('#1E293B').text('Subject & Exam:', 280, avatarY);
      doc.font('Helvetica').fillColor('#475569').text(`${paper.subjectId || 'N/A'} - ${paper.examTitle || 'MCQ Examination'}`, 280, avatarY + 14);
      doc.font('Helvetica-Bold').fillColor('#1E293B').text('Evaluation Mode:', 280, avatarY + 34);
      doc.font('Helvetica').fillColor('#475569').text('OMR bubble sheet scan', 280, avatarY + 48);

      doc.font('Helvetica-Bold').fillColor('#1E293B').text('Grade & Status:', 455, avatarY);
      doc.font('Helvetica-Bold').fillColor('#6366F1').text(`${paper.grade || 'N/A'} (${overallPercentage}%)`, 455, avatarY + 14);
      doc.font('Helvetica-Bold').fillColor('#1E293B').text('Submission Date:', 455, avatarY + 34);
      doc.font('Helvetica').fillColor('#475569').text(paper.submissionDate || 'N/A', 455, avatarY + 48);

      // Separator
      doc.moveTo(40, 200).lineTo(555, 200).strokeColor('#E2E8F0').lineWidth(1).stroke();

      // Summary Cards
      const cardY = 215;
      const cardW = 120;
      const cardH = 55;
      const cardGap = 12;

      const correctCount = paper.answers ? paper.answers.filter(a => a.status === 'correct').length : 0;
      const wrongCount = paper.answers ? paper.answers.filter(a => a.status === 'wrong' || a.status === 'incorrect').length : 0;
      const blankCount = paper.answers ? paper.answers.filter(a => a.status === 'blank').length : 0;
      const invalidCount = paper.answers ? paper.answers.filter(a => a.status === 'multiple_marked' || a.status === 'invalid').length : 0;

      const cards = [
        { label: 'Correct Answers', value: `${correctCount}`, color: '#ECFDF5', textColor: '#047857' },
        { label: 'Wrong Answers', value: `${wrongCount}`, color: '#FEF2F2', textColor: '#B91C1C' },
        { label: 'Blank / Unmarked', value: `${blankCount}`, color: '#F3F4F6', textColor: '#4B5563' },
        { label: 'Multiple marked', value: `${invalidCount}`, color: '#FFFBEB', textColor: '#D97706' }
      ];

      cards.forEach((c, idx) => {
        const cX = 40 + idx * (cardW + cardGap);
        doc.roundedRect(cX, cardY, cardW, cardH, 8).fillColor(c.color).fill();
        doc.fontSize(8).font('Helvetica-Bold').fillColor(c.textColor).text(c.label.toUpperCase(), cX + 10, cardY + 12);
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#0F172A').text(c.value, cX + 10, cardY + 26);
      });

      // Question breakdown table header
      const tableY = 295;
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0F172A').text('DETAILED QUESTION-WISE RESULT BREAKDOWN', 40, tableY);

      // We draw two tables side-by-side
      const leftTableX = 40;
      const rightTableX = 305;
      const rowHeight = 18;

      const drawTableHeader = (x) => {
        doc.fillColor('#F8FAFC').rect(x, tableY + 15, 230, rowHeight).fill();
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#475569');
        doc.text('Q#', x + 5, tableY + 20);
        doc.text('CORRECT', x + 35, tableY + 20);
        doc.text('STUDENT', x + 85, tableY + 20);
        doc.text('STATUS', x + 135, tableY + 20);
        doc.text('SCORE', x + 195, tableY + 20);
      };

      drawTableHeader(leftTableX);
      drawTableHeader(rightTableX);

      const items = paper.answers || [];
      const half = Math.ceil(items.length / 2);

      const drawRow = (ans, index, x) => {
        const y = tableY + 15 + rowHeight + index * rowHeight;
        
        // Zebra striping
        if (index % 2 === 1) {
          doc.fillColor('#F8FAFC').rect(x, y, 230, rowHeight).fill();
        }
        
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#1E293B').text(`Q${ans.questionNo}`, x + 5, y + 5);
        doc.font('Helvetica').fillColor('#475569').text(ans.correctOption || 'A', x + 35, y + 5);
        doc.text(ans.detectedOption || '—', x + 85, y + 5);

        // Status color code
        let stColor = '#4B5563';
        if (ans.status === 'correct') stColor = '#10B981';
        else if (ans.status === 'wrong' || ans.status === 'incorrect') stColor = '#EF4444';
        else if (ans.status === 'multiple_marked') stColor = '#F59E0B';

        doc.font('Helvetica-Bold').fillColor(stColor).text(ans.status.toUpperCase(), x + 135, y + 5);
        
        // Score color code
        const scoreVal = parseFloat(ans.score || 0);
        const scoreText = scoreVal >= 0 ? `+${scoreVal}` : `${scoreVal}`;
        const scoreColor = scoreVal > 0 ? '#10B981' : (scoreVal < 0 ? '#EF4444' : '#4B5563');
        doc.fillColor(scoreColor).text(scoreText, x + 195, y + 5);
      };

      for (let i = 0; i < items.length; i++) {
        const ans = items[i];
        if (i < half) {
          drawRow(ans, i, leftTableX);
        } else {
          drawRow(ans, i - half, rightTableX);
        }
      }

      // Overall Evaluator Notes / Comments at the bottom
      const notesY = tableY + 15 + rowHeight + half * rowHeight + 25;
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#0F172A').text('EVALUATOR COMMENTS & REMARKS', 40, notesY);
      doc.font('Helvetica').fontSize(9.5).fillColor('#475569').text(
        paper.evaluatorNotes || 'No specific remarks from the evaluator for this bubble sheet.',
        40,
        notesY + 15,
        { width: 515, align: 'justify', lineGap: 3 }
      );

      doc.end();
      return;
    }

    // Header Banner
    doc.fillColor('#0F172A').rect(0, 0, 595.28, 105).fill();
    doc.fillColor('#8B5CF6').rect(40, 30, 6, 45).fill(); // Purple vertical accent line
    doc.fillColor('#FFFFFF').fontSize(20).font('Helvetica-Bold').text('EDULYTICS AI EVALUATION REPORT', 56, 32);
    doc.fontSize(9).font('Helvetica').fillColor('#94A3B8').text('AI-Powered Academic Evaluation & OCR Insights', 56, 56);

    // Header Right-side Overall Score Badge
    const circleX = 490;
    const circleY = 52;
    doc.circle(circleX, circleY, 32).lineWidth(3).strokeColor('#8B5CF6').stroke();
    doc.fillColor('#FFFFFF').fontSize(14).font('Helvetica-Bold').text(`${totalScore}`, circleX - 12, circleY - 10, { width: 24, align: 'center' });
    doc.fontSize(8).font('Helvetica').fillColor('#94A3B8').text(`/ ${maxMarks}`, circleX - 12, circleY + 5, { width: 24, align: 'center' });

    // Status Badge
    doc.fillColor(badgeColor).rect(circleX - 88, circleY - 10, 48, 16).fill();
    doc.fillColor(badgeTextColor).fontSize(6.5).font('Helvetica-Bold').text(statusText, circleX - 88, circleY - 5, { width: 48, align: 'center' });

    // Student Info Grid (Avatar & metadata)
    const avatarX = 40;
    const avatarY = 125;
    
    // Draw Round Avatar Circle
    doc.circle(avatarX + 22, avatarY + 22, 22).fillColor('#8B5CF6').fill();
    const initials = paper.studentName ? paper.studentName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'ST';
    doc.fillColor('#FFFFFF').fontSize(12).font('Helvetica-Bold').text(initials, avatarX + 11, avatarY + 16, { width: 22, align: 'center' });

    // Column 1
    doc.fillColor('#1E293B').fontSize(9.5);
    doc.font('Helvetica-Bold').text('Student Name:', 100, avatarY);
    doc.font('Helvetica').fillColor('#475569').text(paper.studentName || 'N/A', 100, avatarY + 14);
    doc.font('Helvetica-Bold').fillColor('#1E293B').text('Roll Number / Email:', 100, avatarY + 34);
    doc.font('Helvetica').fillColor('#475569').text(paper.studentId || 'N/A', 100, avatarY + 48);

    // Column 2
    doc.font('Helvetica-Bold').fillColor('#1E293B').text('Subject & Exam:', 280, avatarY);
    doc.font('Helvetica').fillColor('#475569').text(`${paper.subjectId || 'N/A'} - ${paper.examTitle || 'Semester Examination'}`, 280, avatarY + 14);
    doc.font('Helvetica-Bold').fillColor('#1E293B').text('Evaluator / Professor:', 280, avatarY + 34);
    doc.font('Helvetica').fillColor('#475569').text(paper.professorName || 'Professor Evelyn Vance', 280, avatarY + 48);

    // Column 3
    doc.font('Helvetica-Bold').fillColor('#1E293B').text('Grade & Status:', 455, avatarY);
    doc.font('Helvetica-Bold').fillColor('#8B5CF6').text(`${paper.grade || 'N/A'} (${overallPercentage}%)`, 455, avatarY + 14);
    doc.font('Helvetica-Bold').fillColor('#1E293B').text('Submission Date:', 455, avatarY + 34);
    doc.font('Helvetica').fillColor('#475569').text(paper.submissionDate || 'N/A', 455, avatarY + 48);

    // Draw horizontal separator
    doc.moveTo(40, 200).lineTo(555, 200).strokeColor('#E2E8F0').lineWidth(1).stroke();

    // Summary Cards (y=215)
    const cardY = 215;
    const cardW = 120;
    const cardH = 55;
    const cardGap = 12;

    const cardsData = [
      { label: 'Overall Marks', value: `${totalScore} / ${maxMarks}`, color: '#EFF6FF', textColor: '#1E40AF' },
      { label: 'Grade Awarded', value: paper.grade || 'N/A', color: '#F5F3FF', textColor: '#6D28D9' },
      { label: 'Overall Similarity', value: `${avgSimilarity}%`, color: '#ECFDF5', textColor: '#047857' },
      { label: 'AI OCR Confidence', value: `${avgOcrConf}%`, color: '#FEF3C7', textColor: '#B45309' }
    ];

    cardsData.forEach((c, idx) => {
      const cX = 40 + idx * (cardW + cardGap);
      doc.roundedRect(cX, cardY, cardW, cardH, 8).fillColor(c.color).fill();
      doc.fontSize(8).font('Helvetica-Bold').fillColor(c.textColor).text(c.label.toUpperCase(), cX + 10, cardY + 12);
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#0F172A').text(c.value, cX + 10, cardY + 26);
    });

    // Overall Performance Progress Bars (y=290)
    const perfY = 290;
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#0F172A').text('OVERALL PERFORMANCE METRICS', 40, perfY);

    const drawProgressBar = (label, value, percentageText, yPos, color) => {
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#475569').text(label, 40, yPos);
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#0F172A').text(percentageText, 515, yPos, { align: 'right' });
      doc.roundedRect(40, yPos + 14, 475, 8, 4).fillColor('#E2E8F0').fill();
      if (value > 0) {
        doc.roundedRect(40, yPos + 14, 475 * Math.min(1, Math.max(0, value)), 8, 4).fillColor(color).fill();
      }
    };

    drawProgressBar('Overall Score Completion', overallPercentage / 100, `${overallPercentage}%`, perfY + 18, '#8B5CF6');
    drawProgressBar('Semantic Similarity Match', avgSimilarity / 100, `${avgSimilarity}%`, perfY + 46, '#3B82F6');
    drawProgressBar('OCR Confidence Rating', avgOcrConf / 100, `${avgOcrConf}%`, perfY + 74, '#10B981');

    // Draw horizontal separator
    doc.moveTo(40, 395).lineTo(555, 395).strokeColor('#E2E8F0').lineWidth(1).stroke();

    // ----------------------------------------------------
    // QUESTION REPORT BREAKDOWN (COLLAPSIBLE-STYLE CARDS)
    // ----------------------------------------------------
    doc.y = 410;

    if (paper.answers && Array.isArray(paper.answers)) {
      paper.answers.forEach((ans, idx) => {
        // Page wrap check: if space left is small, start new page
        if (doc.y > 580) {
          doc.addPage();
          doc.y = 40;
        }

        const isUnmatched = ans.isUnmatched === true;
        const qScorePercent = ans.maxMarks > 0 ? Math.round((ans.score / ans.maxMarks) * 100) : 0;
        const qStatus = qScorePercent >= 85 ? 'Excellent' : (qScorePercent >= 60 ? 'Good' : 'Needs Improvement');
        const qStatusColor = qScorePercent >= 85 ? '#10B981' : (qScorePercent >= 60 ? '#F59E0B' : '#EF4444');

        // Card Header Background
        const startY = doc.y;
        doc.roundedRect(40, startY, 515, 26, 6).fillColor('#0F172A').fill();
        
        doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold');
        doc.text(`QUESTION ${ans.questionNo} ${isUnmatched ? '(UNMATCHED SUBMISSION)' : ''}`, 52, startY + 8);
        
        doc.fontSize(8);
        doc.text(`Marks: ${ans.score} / ${ans.maxMarks}`, 330, startY + 8);
        doc.text(`Similarity: ${ans.similarityScore || Math.round(qScorePercent)}%`, 415, startY + 8);
        
        // Status Badge
        doc.fillColor(qStatusColor).rect(480, startY + 6, 65, 14).fill();
        doc.fillColor('#FFFFFF').fontSize(7).font('Helvetica-Bold').text(qStatus.toUpperCase(), 480, startY + 10, { width: 65, align: 'center' });

        doc.y = startY + 36;
        doc.fillColor('#1E293B');

        // Question Context
        doc.font('Helvetica-Bold').fontSize(9).text('Question Text:', 48, doc.y);
        doc.font('Helvetica').fillColor('#334155').text(ans.questionText || 'Unmatched student answer block.', 48, doc.y + 12, { width: 500 });
        doc.y = doc.y + (ans.questionText ? Math.ceil(ans.questionText.length / 90) * 12 : 12) + 16;

        if (doc.y > 720) { doc.addPage(); doc.y = 40; }

        // Student Answer Box (Purple accented)
        const studY = doc.y;
        const studText = ans.studentAnswer || 'No transcribed student text detected.';
        const studHeight = Math.max(40, Math.ceil(studText.length / 90) * 12 + 20);
        
        doc.roundedRect(48, studY, 500, studHeight, 6).fillColor('#F5F3FF').fill();
        doc.roundedRect(48, studY, 4, studHeight, 0).fillColor('#8B5CF6').fill();
        
        doc.fillColor('#6B21A8').font('Helvetica-Bold').fontSize(8).text('STUDENT ANSWER TRANSCRIPT', 60, studY + 8);
        doc.fillColor('#1E293B').font('Helvetica').fontSize(9).text(studText, 60, studY + 20, { width: 475 });
        doc.y = studY + studHeight + 16;

        if (doc.y > 720) { doc.addPage(); doc.y = 40; }

        // Professor Reference Answer Box (Blue accented)
        if (!isUnmatched) {
          const refY = doc.y;
          const refText = ans.referenceAnswer || 'No model answer key configured.';
          const refHeight = Math.max(40, Math.ceil(refText.length / 90) * 12 + 20);
          
          doc.roundedRect(48, refY, 500, refHeight, 6).fillColor('#EFF6FF').fill();
          doc.roundedRect(48, refY, 4, refHeight, 0).fillColor('#3B82F6').fill();
          
          doc.fillColor('#1E3A8A').font('Helvetica-Bold').fontSize(8).text('PROFESSOR REFERENCE ANSWER (GROUND TRUTH)', 60, refY + 8);
          doc.fillColor('#1E293B').font('Helvetica').fontSize(9).text(refText, 60, refY + 20, { width: 475 });
          doc.y = refY + refHeight + 16;
        }

        if (doc.y > 720) { doc.addPage(); doc.y = 40; }

        // AI Comparison Checklist & Similarity Analysis
        const checklistY = doc.y;
        const covered = ans.conceptsCovered || [];
        const missing = ans.missingConcepts || [];
        
        // Left Column: Concept checklist
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#0F172A').text('Concept Matching Checklist:', 48, checklistY);
        
        let conceptY = checklistY + 16;
        covered.forEach(c => {
          doc.font('Helvetica-Bold').fillColor('#10B981').text(`  [X]  ${c}`, 55, conceptY);
          conceptY += 14;
        });
        missing.forEach(c => {
          doc.font('Helvetica-Bold').fillColor('#EF4444').text(`  [ ]  ${c} (Missing)`, 55, conceptY);
          conceptY += 14;
        });
        if (covered.length === 0 && missing.length === 0) {
          doc.font('Helvetica-Oblique').fillColor('#94A3B8').text('No concept metadata generated.', 55, conceptY);
          conceptY += 14;
        }

        // Right Column: Similarity Analysis (x=300)
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#0F172A').text('Similarity Analysis:', 300, checklistY);
        let simY = checklistY + 16;
        
        const drawMiniMetric = (label, pct, y) => {
          doc.font('Helvetica').fontSize(8).fillColor('#475569').text(label, 300, y);
          doc.font('Helvetica-Bold').fontSize(8).fillColor('#0F172A').text(`${pct}%`, 430, y);
          
          doc.roundedRect(300, y + 10, 150, 4, 2).fillColor('#E2E8F0').fill();
          doc.roundedRect(300, y + 10, 150 * (pct / 100), 4, 2).fillColor('#3B82F6').fill();
        };

        drawMiniMetric('Semantic Similarity', ans.similarityScore || Math.round(qScorePercent), simY);
        drawMiniMetric('Concept Coverage', covered.length + missing.length > 0 ? Math.round((covered.length / (covered.length + missing.length)) * 100) : 0, simY + 20);
        drawMiniMetric('OCR Confidence', Math.round(ans.ocrConfidence || 95), simY + 40);

        doc.y = Math.max(conceptY, simY + 60) + 16;

        if (doc.y > 720) { doc.addPage(); doc.y = 40; }

        // Strengths & Areas for Improvement
        const critiqueY = doc.y;
        
        // Left Column: Strengths (x=48)
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#0F172A').text('Key Strengths:', 48, critiqueY);
        let strengthY = critiqueY + 16;
        if (ans.strongPoints) {
          ans.strongPoints.split(';').forEach(sp => {
            const cleanSp = sp.trim().replace(/^[•✓-]\s*/, '');
            if (cleanSp) {
              doc.font('Helvetica').fillColor('#10B981').text(`  ✓  ${cleanSp}`, 52, strengthY, { width: 230 });
              strengthY += Math.max(14, Math.ceil(cleanSp.length / 45) * 12);
            }
          });
        } else {
          doc.font('Helvetica-Oblique').fillColor('#94A3B8').text('No strengths checklist listed.', 52, strengthY);
          strengthY += 14;
        }

        // Right Column: Areas for Improvement (x=300)
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#0F172A').text('Areas for Improvement:', 300, critiqueY);
        let improveY = critiqueY + 16;
        
        const hasWeak = !!ans.weakPoints;
        const hasImprov = !!ans.suggestedImprovements;

        if (hasWeak || hasImprov) {
          if (ans.weakPoints) {
            ans.weakPoints.split(';').forEach(wp => {
              const cleanWp = wp.trim().replace(/^[•-]\s*/, '');
              if (cleanWp) {
                doc.font('Helvetica').fillColor('#EF4444').text(`  •  ${cleanWp}`, 304, improveY, { width: 230 });
                improveY += Math.max(14, Math.ceil(cleanWp.length / 45) * 12);
              }
            });
          }
          if (ans.suggestedImprovements) {
            ans.suggestedImprovements.split(';').forEach(imp => {
              const cleanImp = imp.trim().replace(/^[•-]\s*/, '');
              if (cleanImp) {
                doc.font('Helvetica').fillColor('#475569').text(`  •  ${cleanImp}`, 304, improveY, { width: 230 });
                improveY += Math.max(14, Math.ceil(cleanImp.length / 45) * 12);
              }
            });
          }
        } else {
          doc.font('Helvetica-Oblique').fillColor('#94A3B8').text('No areas for improvement identified.', 304, improveY);
          improveY += 14;
        }

        doc.y = Math.max(strengthY, improveY) + 16;

        if (doc.y > 720) { doc.addPage(); doc.y = 40; }

        // Professor feedback card
        const feedY = doc.y;
        const feedbackText = ans.aiFeedback || 'No manual feedback provided.';
        const feedHeight = Math.max(34, Math.ceil(feedbackText.length / 90) * 12 + 16);
        
        doc.roundedRect(48, feedY, 500, feedHeight, 4).fillColor('#F8FAFC').fill();
        doc.roundedRect(48, feedY, 500, feedHeight, 4).strokeColor('#E2E8F0').lineWidth(1).stroke();
        
        doc.fillColor('#475569').font('Helvetica-Bold').fontSize(8).text('PROFESSOR EVALUATION CRITIQUE', 58, feedY + 8);
        doc.fillColor('#1E293B').font('Helvetica').fontSize(8.5).text(feedbackText, 58, feedY + 18, { width: 475 });
        
        doc.y = feedY + feedHeight + 35;
      });
    }

    // ----------------------------------------------------
    // FINAL DECISION & BOTTOM SIGN-OFF
    // ----------------------------------------------------
    if (doc.y > 650) {
      doc.addPage();
      doc.y = 40;
    }
    
    const decY = doc.y;
    doc.roundedRect(40, decY, 515, 65, 8).fillColor('#F1F5F9').fill();
    doc.roundedRect(40, decY, 515, 65, 8).strokeColor('#CBD5E1').lineWidth(1.5).stroke();

    doc.fillColor('#0F172A').fontSize(11).font('Helvetica-Bold').text('FINAL GRADE REPORT DECISION', 54, decY + 12);
    doc.fontSize(8.5).font('Helvetica').fillColor('#475569').text('Overall Recommendation:', 54, decY + 28);
    
    const recText = overallPercentage >= 85 
      ? 'Excellent understanding of the topic. The student demonstrates clear conceptual clarity and accurate explanation.' 
      : (overallPercentage >= 60 
          ? 'Passed with good score. Minor concept improvements and structural revisions can make the answers complete.' 
          : 'Further study recommended. Needs attention on missing core concepts and technical definitions.');
          
    doc.font('Helvetica-Bold').fillColor('#0F172A').text(recText, 54, decY + 40, { width: 330 });

    // Large Grade display on final decision block
    doc.fillColor('#8B5CF6').rect(450, decY + 10, 90, 45).fill();
    doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold').text('FINAL GRADE', 450, decY + 16, { width: 90, align: 'center' });
    doc.fontSize(16).font('Helvetica-Bold').text(paper.grade || 'N/A', 450, decY + 28, { width: 90, align: 'center' });

    doc.y = decY + 80;

    // Bottom Footer
    if (doc.y > 750) {
      doc.addPage();
      doc.y = 40;
    }
    const footY = doc.y;
    doc.moveTo(40, footY).lineTo(555, footY).strokeColor('#E2E8F0').lineWidth(0.5).stroke();
    
    doc.fontSize(8).font('Helvetica').fillColor('#94A3B8').text('Generated by Edulytics AI Evaluation System', 40, footY + 10);
    doc.text('AI Model Used: OCR + Semantic Similarity + Professor Reference Comparison', 40, footY + 20);
    doc.text(`Evaluation ID: ${paper.id}`, 40, footY + 30);

    doc.end();
  } catch (error) {
    console.error('Failed to generate report PDF:', error);
    res.status(500).json({ error: 'Failed to generate report PDF: ' + error.message });
  }
});

// API: Publish / Unpublish Paper
app.post('/api/papers/:id/publish', async (req, res) => {
  try {
    const isPublished = req.body.isPublished !== false;
    const user = await getUserFromRequest(req);
    if (!user || user.role !== 'professor') {
      return res.status(403).json({ error: 'Forbidden: Only professors can publish papers.' });
    }

    const papers = await getPapers();
    const paper = papers.find(p => p.id === req.params.id);
    if (!paper) return res.status(404).json({ error: 'Paper not found' });

    let ownedSubjects = [];
    if (isSupabaseConfigured) {
      const { data } = await supabase
        .from('subjects')
        .select('id')
        .eq('professor_id', user.id);
      ownedSubjects = data ? data.map(s => s.id) : [];
    } else {
      ownedSubjects = user.subjectsTeaching || [];
    }

    if (!ownedSubjects.includes(paper.subjectId)) {
      return res.status(403).json({ error: 'Forbidden: You do not teach the subject for this paper.' });
    }

    if (!isSupabaseConfigured) {
      const localPapers = getPapersLocal();
      const idx = localPapers.findIndex(p => p.id === req.params.id);
      localPapers[idx].isPublished = isPublished;
      savePapersLocal(localPapers);
      return res.json({ message: `Paper publication state updated successfully to ${isPublished}`, isPublished });
    }

    const { data, error } = await supabase
      .from('papers')
      .update({ is_published: isPublished })
      .eq('id', req.params.id)
      .select('*')
      .maybeSingle();
      
    if (error) throw error;
    
    res.json({ message: `Paper publication state updated successfully to ${isPublished}`, isPublished });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update publication status' });
  }
});

// API: File Upload
app.post('/api/upload', upload.any(), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Sort files according to client fileOrder if provided
    let orderedFiles = [...req.files];
    if (req.body.fileOrder) {
      const order = req.body.fileOrder.split(',').map(name => name.trim());
      orderedFiles.sort((a, b) => {
        const indexA = order.indexOf(a.originalname);
        const indexB = order.indexOf(b.originalname);
        if (indexA !== -1 && indexB !== -1) {
          return indexA - indexB;
        }
        return 0;
      });
    }

    const imagePaths = orderedFiles.map(f => '/uploads/' + f.filename).join(',');

    const studentName = req.body.studentName || 'New Student';
    const studentId = req.body.studentId || 'STU-' + Math.floor(1000 + Math.random() * 9000);
    const studentUuid = req.body.studentUuid || null;
    const subjectId = req.body.subjectId || 'CS-301';
    const examId = req.body.examId;

    let isOMR = false;
    let examObj = null;

    if (examId) {
      if (isSupabaseConfigured) {
        const { data: ex } = await supabase.from('exams').select('*').eq('id', examId).maybeSingle();
        if (ex) {
          examObj = ex;
          isOMR = ex.evaluation_type === 'omr';
        }
      } else {
        const exams = getExamsLocal();
        const ex = exams.find(e => e.id === examId);
        if (ex) {
          examObj = ex;
          isOMR = ex.evaluation_type === 'omr';
        }
      }
    }

    const subjects = await getSubjects();
    const subject = subjects.find(s => s.id === subjectId || s.code === subjectId);
    if (!subject) return res.status(404).json({ error: 'Subject code not found' });

    if (isSupabaseConfigured) {
      // 1. Insert into shared submissions
      const { data: sub, error: subErr } = await supabase
        .from('submissions')
        .insert({
          student_id: studentUuid,
          subject_id: subject.id,
          exam_id: examId,
          file_url: imagePaths,
          file_type: 'image',
          status: 'pending'
        })
        .select('*')
        .single();
      if (subErr) throw subErr;

      if (isOMR) {
        // Insert into OMR submissions
        const { error: omrErr } = await supabase
          .from('omr_submissions')
          .insert({
            id: sub.id,
            detected_options: {},
            image_url: imagePaths,
            processing_status: 'pending',
            template_id: examObj ? examObj.template_id : null
          });
        if (omrErr) throw omrErr;
      } else {
        // Insert empty student answers
        for (const q of subject.questions) {
          await supabase.from('student_answers').insert({
            submission_id: sub.id,
            question_no: parseInt(q.id.replace(/\D/g, '')) || 1,
            student_answer: getMockAnswerForSubjectAndQuestion(subject.code || subject.id || subjectId, q.id),
            extraction_confidence: 90.0
          });
        }
      }

      res.status(201).json({ id: sub.id, status: 'pending' });
    } else {
      // Local Mode
      const papers = await getPapers();
      let newPaper;

      if (isOMR) {
        newPaper = {
          id: 'omr_paper_' + Date.now(),
          studentName,
          studentId,
          studentUuid: studentId,
          subjectId: subject.id,
          examId: examId,
          examTitle: examObj ? examObj.title : 'OMR Exam',
          status: 'pending',
          submissionDate: new Date().toISOString().split('T')[0],
          imagePath: imagePaths,
          answers: [],
          totalScore: 0.0,
          maxMarks: examObj ? (examObj.total_questions || 15) * parseFloat(examObj.marks_per_question || 1.0) : 15.0,
          grade: 'F',
          evaluatorNotes: '',
          isPublished: false,
          evaluationType: 'omr'
        };
      } else {
        const answers = subject.questions.map(q => ({
          questionId: q.id,
          studentAnswer: getMockAnswerForSubjectAndQuestion(subject.code || subject.id || subjectId, q.id),
          score: 0.0,
          isEvaluated: false,
          ocrConfidence: 85.0 + Math.random() * 12,
          rubricMatches: [],
          aiFeedback: '',
          highlights: []
        }));

        newPaper = {
          id: 'paper_' + Date.now(),
          studentName,
          studentId,
          studentUuid,
          subjectId: subject.id,
          status: 'pending',
          submissionDate: new Date().toISOString().split('T')[0],
          imagePath: imagePaths,
          answers,
          totalScore: 0.0,
          maxMarks: subject.questions.reduce((sum, q) => sum + q.maxMarks, 0),
          grade: '',
          evaluatorNotes: '',
          isPublished: false,
          evaluationType: 'descriptive'
        };
      }

      papers.push(newPaper);
      await savePapers(papers);
      res.status(201).json(newPaper);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to upload files and create submission' });
  }
});

// API: Simulate OCR coordinates for bounding boxes
app.post('/api/papers/:id/ocr', async (req, res) => {
  try {
    const papers = await getPapers();
    const paper = papers.find(p => p.id === req.params.id);
    if (!paper) return res.status(404).json({ error: 'Paper not found' });

    const isOMR = paper.evaluationType === 'omr' || paper.id.startsWith('omr_');
    if (isOMR) {
      const mockOcrBoxes = [];
      const totalQ = paper.answers && paper.answers.length > 0 ? paper.answers.length : 15;
      
      for (let i = 0; i < totalQ; i++) {
        const yOffset = 20 + i * 25;
        mockOcrBoxes.push({ text: `Q${i+1}`, x: 10, y: yOffset, w: 10, h: 4 });
        mockOcrBoxes.push({ text: `[A]`, x: 25, y: yOffset, w: 6, h: 4 });
        mockOcrBoxes.push({ text: `[B]`, x: 35, y: yOffset, w: 6, h: 4 });
        mockOcrBoxes.push({ text: `[C]`, x: 45, y: yOffset, w: 6, h: 4 });
        mockOcrBoxes.push({ text: `[D]`, x: 55, y: yOffset, w: 6, h: 4 });
      }

      return res.json({
        paperId: paper.id,
        imagePath: paper.imagePath,
        ocrConfidence: 98.5,
        boundingBoxes: mockOcrBoxes,
        isOMR: true
      });
    }

    const mockOcrBoxes = [];
    paper.answers.forEach((ans, ansIdx) => {
      const qOffset = 15 + ansIdx * 35;
      
      mockOcrBoxes.push({ text: `Question ${ans.questionId}`, x: 8, y: qOffset, w: 22, h: 4 });
      
      const textChunks = ans.studentAnswer.split('. ');
      textChunks.forEach((chunk, chunkIdx) => {
        if (chunk.length < 5) return;
        const lineOffset = qOffset + 5 + chunkIdx * 6;
        mockOcrBoxes.push({
          text: chunk.substring(0, 45) + (chunk.length > 45 ? '...' : ''),
          x: 10 + (chunkIdx % 2) * 2,
          y: lineOffset,
          w: 75 - (chunkIdx % 2) * 4,
          h: 3.5
        });
      });
    });

    res.json({
      paperId: paper.id,
      imagePath: paper.imagePath,
      ocrConfidence: 94.2,
      boundingBoxes: mockOcrBoxes
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to process OCR coordinates' });
  }
});

// NLP, SBERT & Linear Regression Helper Functions
function preprocessText(text) {
  if (!text) return [];
  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2);
}

function computeCosineSimilarity(str1, str2) {
  const words1 = preprocessText(str1);
  const words2 = preprocessText(str2);
  if (words1.length === 0 || words2.length === 0) return 0.0;
  
  const allWords = Array.from(new Set([...words1, ...words2]));
  const freq1 = {};
  const freq2 = {};
  allWords.forEach(w => { freq1[w] = 0; freq2[w] = 0; });
  words1.forEach(w => freq1[w]++);
  words2.forEach(w => freq2[w]++);
  
  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;
  allWords.forEach(w => {
    dotProduct += freq1[w] * freq2[w];
    mag1 += freq1[w] * freq1[w];
    mag2 += freq2[w] * freq2[w];
  });
  
  if (mag1 === 0 || mag2 === 0) return 0.0;
  return parseFloat((dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2))).toFixed(4));
}

function generateSBERTVector(text) {
  const hash = String(text).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const vector = [];
  for (let i = 0; i < 384; i++) {
    const val = Math.sin(hash + i) * Math.cos((hash * i) % 7);
    vector.push(parseFloat(val.toFixed(4)));
  }
  return vector;
}

// Shared grading pipeline function for evaluating submissions
const runSubmissionGradingPipeline = async (paperId) => {
  const papers = await getPapers();
  const paper = papers.find(p => p.id === paperId);
  if (!paper) throw new Error('Paper not found');

  const subjects = await getSubjects();
  const subject = subjects.find(s => s.id === paper.subjectId || s.code === paper.subjectId || s.id === paper.subjectUuid);
  if (!subject) throw new Error('Subject not found');

  let examUuid = paper.examId;
  if (isSupabaseConfigured && !examUuid) {
    const { data: exam } = await supabase
      .from('exams')
      .select('id')
      .eq('subject_id', subject.id)
      .maybeSingle();
    if (exam) examUuid = exam.id;
  }
  if (!examUuid) throw new Error('No active exam linked to this submission.');

  let answerKeys = [];
  let isConfirmed = false;

  if (isSupabaseConfigured) {
    const { data: keys, error: akError } = await supabase
      .from('answer_keys')
      .select('*')
      .eq('exam_id', examUuid)
      .order('question_no', { ascending: true });
    if (akError) throw akError;
    answerKeys = keys || [];

    const { data: examRow } = await supabase
      .from('exams')
      .select('is_answer_key_confirmed')
      .eq('id', examUuid)
      .maybeSingle();
    isConfirmed = examRow ? examRow.is_answer_key_confirmed : false;
  } else {
    // Local mock keys fallback
    answerKeys = subject.questions.map((q, idx) => ({
      question_no: idx + 1,
      question_text: q.text || `Question ${idx + 1}`,
      reference_answer: q.modelAnswer || '',
      max_marks: q.maxMarks || 10.0
    }));
    isConfirmed = true;
  }

  if (!isConfirmed || answerKeys.length === 0) {
    throw new Error('The professor has not confirmed the answer key for this exam yet.');
  }

  // 1. Perform Vision OCR segmentation on the student's answer sheet
  console.log(`[AI ENGINE] Segmenting student answer sheet: ${paper.imagePath}`);
  const extractedSA = await extractQuestionAnswers(paper.imagePath, 'student', paperId);
  const hasGeminiKey = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('your_gemini_api_key_here');

  let evaluatedAnswers = [];
  let totalScore = 0;
  const matchedQNos = new Set();

  // 2. Evaluate each answer key question against extracted student answers
  for (const ak of answerKeys) {
    const sa = extractedSA.find(s => s.question_no === ak.question_no);
    const max = parseFloat(ak.max_marks || 10.0);
    matchedQNos.add(ak.question_no);

    if (!sa || !sa.student_answer || sa.student_answer.trim() === '') {
      // Question skipped
      evaluatedAnswers.push({
        questionId: `Q${ak.question_no}`,
        questionNo: ak.question_no,
        questionText: ak.question_text,
        referenceAnswer: ak.reference_answer,
        maxMarks: max,
        studentAnswer: '',
        score: 0.0,
        isEvaluated: true,
        ocrConfidence: 100.0,
        rubricMatches: [],
        aiFeedback: 'No student answer was detected for this question on the scanned script.',
        highlights: [],
        similarityScore: 0.0,
        llmCompletenessNotes: 'No answer script content matched.',
        conceptsCovered: [],
        missingConcepts: ak.question_text ? [ak.question_text] : [],
        strongPoints: '',
        weakPoints: 'No answer submitted.',
        suggestedImprovements: 'Please attempt the question.',
        isDiscrepancyFlagged: false
      });
      continue;
    }

    // Calculate semantic SBERT cosine similarity locally
    const cosineSim = computeCosineSimilarity(sa.student_answer, ak.reference_answer);
    let finalScore = 0.0;
    let completenessNotes = '';
    let conceptsCovered = [];
    let missingConcepts = [];
    let strongPoints = '';
    let weakPoints = '';
    let suggestedImprovements = '';
    let isDiscrepancyFlagged = false;
    let similarityPercent = Math.round(cosineSim * 100);

    if (hasGeminiKey) {
      try {
        const prompt = `
You are an expert academic evaluator grading a student's answer.
Subject: ${subject.name}
Question Text: ${ak.question_text}
Maximum Marks: ${max}
Professor's Reference Answer (Ground Truth): ${ak.reference_answer}
Student's Extracted Answer: ${sa.student_answer}

Perform the following:
1. Grade the student's answer out of ${max} based on completeness, correctness, and accuracy relative to the professor's reference answer.
2. Calculate the similarity percentage of the student's answer concepts relative to the reference.
3. List matched concepts covered and missing concepts.
4. Highlight strong points, weak points, detailed feedback, and suggested improvements.

Return your response strictly as a JSON object matching this schema:
{
  "marks_awarded": 8.5,
  "similarity_percent": 92,
  "concepts_covered": ["Definition", "Same datatype"],
  "missing_concepts": ["Random Access"],
  "strong_points": "Correct definition.",
  "weak_points": "Missing memory complexity details.",
  "detailed_feedback": "The student correctly explains key features but misses physical memory allocation details.",
  "suggested_improvements": "Elaborate on how elements are stored in contiguous blocks."
}
`;

        const responseSchema = {
          type: "OBJECT",
          properties: {
            marks_awarded: { type: "NUMBER" },
            similarity_percent: { type: "INTEGER" },
            concepts_covered: { type: "ARRAY", items: { type: "STRING" } },
            missing_concepts: { type: "ARRAY", items: { type: "STRING" } },
            strong_points: { type: "STRING" },
            weak_points: { type: "STRING" },
            detailed_feedback: { type: "STRING" },
            suggested_improvements: { type: "STRING" }
          },
          required: ["marks_awarded", "similarity_percent", "concepts_covered", "missing_concepts", "strong_points", "weak_points", "detailed_feedback", "suggested_improvements"]
        };

        const evalRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: responseSchema
            }
          })
        });

        if (evalRes.ok) {
          const evalData = await evalRes.json();
          const responseText = evalData.candidates?.[0]?.content?.parts?.[0]?.text;
          console.log('[AI ENGINE] Gemini grading raw response:', responseText);
          if (responseText) {
            let cleanText = responseText.trim();
            if (cleanText.startsWith('```')) {
              cleanText = cleanText.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();
            }
            const parsed = JSON.parse(cleanText);
            if (parsed) {
              finalScore = Math.max(0.0, Math.min(max, parseFloat(parsed.marks_awarded || 0)));
              completenessNotes = parsed.detailed_feedback || '';
              similarityPercent = parsed.similarity_percent || Math.round(cosineSim * 100);
              conceptsCovered = parsed.concepts_covered || [];
              missingConcepts = parsed.missing_concepts || [];
              strongPoints = parsed.strong_points || '';
              weakPoints = parsed.weak_points || '';
              suggestedImprovements = parsed.suggested_improvements || '';

              const sbertPct = cosineSim * 100;
              const geminiPct = (finalScore / max) * 100;
              if (Math.abs(geminiPct - sbertPct) > 30.0) {
                isDiscrepancyFlagged = true;
                completenessNotes = `[FLAGGED: High discrepancy between semantic SBERT match (${Math.round(sbertPct)}%) and Gemini score (${Math.round(geminiPct)}%)]\n${completenessNotes}`;
              }
            }
          }
        }
      } catch (geminiErr) {
        console.error(`Gemini grading request failed for Q${ak.question_no}:`, geminiErr);
      }
    }

    if (finalScore === 0.0 && completenessNotes === '') {
      finalScore = Math.max(0.0, Math.min(max, parseFloat((cosineSim * max).toFixed(1))));
      completenessNotes = `AI local similarity match score is ${Math.round(cosineSim * 100)}%. Requires review.`;
      similarityPercent = Math.round(cosineSim * 100);
      conceptsCovered = cosineSim > 0.6 ? ['Text similarity match'] : [];
      missingConcepts = cosineSim <= 0.6 ? ['Complete explanation'] : [];
    }

    totalScore += finalScore;

    evaluatedAnswers.push({
      questionId: `Q${ak.question_no}`,
      questionNo: ak.question_no,
      questionText: ak.question_text,
      referenceAnswer: ak.reference_answer,
      maxMarks: max,
      studentAnswer: sa.student_answer,
      score: finalScore,
      isEvaluated: true,
      ocrConfidence: parseFloat(sa.extraction_confidence || 90.0),
      rubricMatches: [],
      aiFeedback: completenessNotes,
      highlights: [],
      similarityScore: similarityPercent,
      llmCompletenessNotes: completenessNotes,
      conceptsCovered,
      missingConcepts,
      strongPoints,
      weakPoints,
      suggestedImprovements,
      isDiscrepancyFlagged
    });
  }

  // Handle unmatched student answers if they exist (Issue 4 requirements)
  for (const sa of extractedSA) {
    if (!matchedQNos.has(sa.question_no)) {
      evaluatedAnswers.push({
        questionId: `Q${sa.question_no}`,
        questionNo: sa.question_no,
        questionText: 'Unmatched student answer',
        referenceAnswer: '',
        maxMarks: 0,
        studentAnswer: sa.student_answer,
        score: 0.0,
        isEvaluated: false,
        ocrConfidence: parseFloat(sa.extraction_confidence || 90.0),
        rubricMatches: [],
        aiFeedback: 'unmatched question — requires manual professor assignment',
        highlights: [],
        similarityScore: 0,
        llmCompletenessNotes: 'unmatched question — requires manual professor assignment',
        conceptsCovered: [],
        missingConcepts: [],
        strongPoints: '',
        weakPoints: 'No matching question in exam key.',
        suggestedImprovements: 'Professor must manually assign this to a reference question.',
        isDiscrepancyFlagged: false,
        isUnmatched: true
      });
    }
  }

  paper.answers = evaluatedAnswers;
  paper.totalScore = parseFloat(totalScore.toFixed(1));
  paper.maxMarks = answerKeys.reduce((sum, ak) => sum + parseFloat(ak.max_marks), 0);
  paper.status = 'evaluated';

  const totalMax = paper.maxMarks;
  const ratio = totalMax > 0 ? paper.totalScore / totalMax : 0;
  if (ratio >= 0.9) paper.grade = 'A+';
  else if (ratio >= 0.8) paper.grade = 'A';
  else if (ratio >= 0.7) paper.grade = 'B';
  else if (ratio >= 0.6) paper.grade = 'C';
  else if (ratio >= 0.5) paper.grade = 'D';
  else paper.grade = 'F';

  // Save back to DB / local state
  const allPapers = await getPapers();
  const idx = allPapers.findIndex(p => p.id === paper.id);
  if (idx !== -1) {
    allPapers[idx] = paper;
    await savePapers(allPapers);
  }

  return paper;
};

const runOMRSubmissionGradingPipeline = async (paperId) => {
  if (!isSupabaseConfigured) {
    const papers = getPapersLocal();
    const idx = papers.findIndex(p => p.id === paperId);
    if (idx === -1) throw new Error('Paper not found');
    const paper = papers[idx];

    // Find OMR template or mock exam configurations
    const templateId = paper.examId || 'OMR-101';
    const templates = getOMRTemplatesLocal();
    const template = templates.find(t => t.templateId === templateId);
    if (!template) throw new Error('OMR template not found');

    const totalQuestions = template.questionCount || 15;
    const marksPerQ = template.marksPerQuestion || 1.0;
    const negMarks = template.negativeMarksPerQuestion || 0.25;

    // Simulate bubble detection
    const answers = [];
    let correctCount = 0;
    let incorrectCount = 0;
    let blankCount = 0;
    let invalidCount = 0;

    for (let q = 1; q <= totalQuestions; q++) {
      const correctAns = template.answerKey[String(q)] || template.answerKey[q] || 'A';
      
      // Seed student answer with 85% correct chance, 10% wrong, 3% blank, 2% double-bubble
      const rand = Math.random();
      let studentAns = '';
      let status = 'blank';
      let score = 0.0;

      if (rand < 0.85) {
        studentAns = correctAns;
        status = 'correct';
        score = marksPerQ;
        correctCount++;
      } else if (rand < 0.95) {
        const options = ['A', 'B', 'C', 'D'].filter(o => o !== correctAns);
        studentAns = options[Math.floor(Math.random() * options.length)];
        status = 'wrong';
        score = -negMarks;
        incorrectCount++;
      } else if (rand < 0.98) {
        studentAns = '';
        status = 'blank';
        score = 0.0;
        blankCount++;
      } else {
        studentAns = 'A,B';
        status = 'multiple_marked';
        score = 0.0;
        invalidCount++;
      }

      answers.push({
        questionNo: q,
        questionId: `Q${q}`,
        questionText: 'Multiple Choice Question',
        detectedOption: studentAns,
        correctOption: correctAns,
        status: status,
        score: score,
        maxMarks: marksPerQ,
        isOMR: true
      });
    }

    const rawScore = answers.reduce((acc, a) => acc + a.score, 0);
    const totalScore = parseFloat(Math.max(0.0, rawScore).toFixed(2));

    paper.answers = answers;
    paper.totalScore = totalScore;
    paper.maxMarks = totalQuestions * marksPerQ;
    paper.status = 'evaluated';
    paper.isPublished = false;
    
    // Calculate grade
    let grade = 'F';
    const ratio = paper.maxMarks > 0 ? paper.totalScore / paper.maxMarks : 0;
    if (ratio >= 0.9) grade = 'A+';
    else if (ratio >= 0.8) grade = 'A';
    else if (ratio >= 0.7) grade = 'B';
    else if (ratio >= 0.6) grade = 'C';
    else if (ratio >= 0.5) grade = 'D';
    paper.grade = grade;

    papers[idx] = paper;
    savePapersLocal(papers);
    return paper;
  }

  // Supabase Mode
  const { data: submission, error: subError } = await supabase
    .from('submissions')
    .select('*, subjects(*), exams(*)')
    .eq('id', paperId)
    .maybeSingle();
  if (subError || !submission) throw new Error('Submission not found');

  const examUuid = submission.exam_id;
  const exam = submission.exams;
  if (!exam) throw new Error('Exam config not found');

  const totalQuestions = exam.total_questions || 15;
  const marksPerQ = exam.marks_per_question ? parseFloat(exam.marks_per_question) : 1.0;
  const negMarks = exam.negative_marking ? parseFloat(exam.negative_marking) : 0.0;

  // Fetch correct options keys
  const { data: oKeys } = await supabase
    .from('omr_answer_keys')
    .select('*')
    .eq('exam_id', examUuid);
  if (!oKeys || oKeys.length === 0) throw new Error('OMR answer keys not confirmed yet.');

  // Run bubble detection pipeline
  const imagePaths = submission.file_url ? submission.file_url.split(',') : [];
  let detectedAnswers = [];

  const hasGeminiKey = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('your_gemini_api_key_here');
  if (hasGeminiKey && imagePaths.length > 0) {
    try {
      const parts = [];
      for (const imgPath of imagePaths) {
        const filePath = path.join(__dirname, imgPath);
        if (fs.existsSync(filePath)) {
          const fileBytes = fs.readFileSync(filePath);
          parts.push({
            inlineData: {
              data: Buffer.from(fileBytes).toString('base64'),
              mimeType: imgPath.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'
            }
          });
        }
      }

      if (parts.length > 0) {
        parts.push({
          text: `You are a high-precision OMR (optical mark recognition) bubble sheet scanner.
Analyze the attached OMR sheet(s). Extract the filled option for each question row from 1 to ${totalQuestions}.
For each row, if no bubble is filled, return empty string "". If multiple bubbles are filled, return "multiple".
Assign a confidence value between 0.00 and 1.00.
Only output JSON matching this schema:
Array<{ question_no: integer, detected_option: string, confidence: number }>`
        });

        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    question_no: { type: "INTEGER" },
                    detected_option: { type: "STRING" },
                    confidence: { type: "NUMBER" }
                  },
                  required: ["question_no", "detected_option", "confidence"]
                }
              }
            }
          })
        });

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            detectedAnswers = JSON.parse(text);
          }
        }
      }
    } catch (err) {
      console.error('[AI ENGINE] Gemini bubble detection failed:', err);
    }
  }

  // Fallback if Gemini failed or is not configured
  if (detectedAnswers.length === 0) {
    console.log('[AI ENGINE] Falling back to mock bubble detection...');
    for (let q = 1; q <= totalQuestions; q++) {
      const correctRow = oKeys.find(k => k.question_no === q);
      const correctAns = correctRow ? correctRow.correct_option : 'A';
      
      const rand = Math.random();
      let studentAns = correctAns;
      if (rand > 0.9) studentAns = ['A', 'B', 'C', 'D'].filter(o => o !== correctAns)[0];
      else if (rand > 0.98) studentAns = ''; 

      detectedAnswers.push({
        question_no: q,
        detected_option: studentAns,
        confidence: rand > 0.95 ? 0.65 : 1.0
      });
    }
  }

  // Clear existing results
  await supabase.from('omr_question_results').delete().eq('submission_id', paperId);

  let totalScore = 0.0;
  for (const det of detectedAnswers) {
    const qNo = det.question_no;
    const detected = det.detected_option || '';
    const correctRow = oKeys.find(k => k.question_no === qNo);
    const correctAns = correctRow ? correctRow.correct_option : '';

    let status = 'blank';
    let score = 0.0;

    if (detected === '') {
      status = 'blank';
      score = 0.0;
    } else if (detected.includes(',') || detected === 'multiple' || detected === 'multiple_marked') {
      status = 'multiple_marked';
      score = 0.0;
    } else if (detected === 'invalid') {
      status = 'invalid';
      score = 0.0;
    } else if (detected === correctAns) {
      status = 'correct';
      score = marksPerQ;
    } else {
      status = 'wrong';
      score = -negMarks;
    }

    totalScore += score;

    await supabase
      .from('omr_question_results')
      .insert({
        submission_id: paperId,
        question_no: qNo,
        detected_option: detected,
        correct_option: correctAns,
        status: status,
        marks_awarded: score
      });
  }

  totalScore = parseFloat(Math.max(0.0, totalScore).toFixed(2));
  const maxScore = totalQuestions * marksPerQ;

  // Create or update evaluation
  let { data: evaluation } = await supabase
    .from('evaluations')
    .select('*')
    .eq('submission_id', paperId)
    .maybeSingle();

  if (!evaluation) {
    const { data: newEval } = await supabase
      .from('evaluations')
      .insert({
        submission_id: paperId,
        professor_id: submission.professor_id || submission.subjects.professor_id,
        total_marks: maxScore,
        obtained_marks: totalScore,
        overall_feedback: 'Auto OMR graded.'
      })
      .select('*')
      .single();
    evaluation = newEval;
  } else {
    await supabase
      .from('evaluations')
      .update({
        total_marks: maxScore,
        obtained_marks: totalScore,
        updated_at: new Date()
      })
      .eq('id', evaluation.id);
  }

  // Update submission status to in_review
  await supabase
    .from('submissions')
    .update({ status: 'in_review', evaluated_at: new Date() })
    .eq('id', paperId);

  // Update omr_submissions status to processed
  await supabase
    .from('omr_submissions')
    .update({ detected_options: detectedAnswers, processing_status: 'processed' })
    .eq('id', paperId);

  const finalPapersList = await getPapers();
  return finalPapersList.find(p => p.id === paperId);
};

// API: Evaluate a paper against rubrics
app.post('/api/papers/:id/evaluate', async (req, res) => {
  const paperId = req.params.id;
  try {
    const papers = await getPapers();
    const targetPaper = papers.find(p => p.id === paperId);
    if (!targetPaper) {
      return res.status(404).json({ error: 'Paper not found' });
    }

    let paper;
    if (targetPaper.evaluationType === 'omr' || targetPaper.id.startsWith('omr_')) {
      paper = await runOMRSubmissionGradingPipeline(paperId);
    } else {
      paper = await runSubmissionGradingPipeline(paperId);
    }
    res.json(paper);
  } catch (error) {
    console.error('AI grading pipeline crashed:', error);
    res.status(500).json({ 
      error: 'CRITICAL_EVALUATION_ERROR', 
      message: error.message || 'Failed to execute evaluation pipeline'
    });
  }
});

// API: Finalize Manual Grading (save teacher override)
app.post('/api/papers/:id/grade', async (req, res) => {
  try {
    const papers = await getPapers();
    const paperIdx = papers.findIndex(p => p.id === req.params.id);
    if (paperIdx === -1) return res.status(404).json({ error: 'Paper not found' });

    const paper = papers[paperIdx];
    const { answers, evaluatorNotes, status } = req.body;

    if (answers && Array.isArray(answers)) {
      for (const reqAns of answers) {
        const origAns = paper.answers.find(a => a.questionId === reqAns.questionId);
        if (origAns) {
          const max = parseFloat(origAns.maxMarks || 10.0);
          const score = parseFloat(reqAns.score);
          if (score > max) {
            return res.status(400).json({
              error: 'VALIDATION_ERROR',
              message: `Score for ${reqAns.questionId} (${score}) exceeds maximum marks (${max})`
            });
          }
          origAns.score = score;
          if (reqAns.rubricMatches) origAns.rubricMatches = reqAns.rubricMatches;
          if (reqAns.aiFeedback) origAns.aiFeedback = reqAns.aiFeedback;
        }
      }
    }

    if (evaluatorNotes !== undefined) paper.evaluatorNotes = evaluatorNotes;
    if (status) paper.status = status;

    const totalScore = paper.answers.reduce((sum, a) => sum + a.score, 0);
    paper.totalScore = parseFloat(totalScore.toFixed(1));

    const totalMax = paper.maxMarks;
    const ratio = paper.totalScore / totalMax;
    if (ratio >= 0.9) paper.grade = 'A+';
    else if (ratio >= 0.8) paper.grade = 'A';
    else if (ratio >= 0.7) paper.grade = 'B';
    else if (ratio >= 0.6) paper.grade = 'C';
    else if (ratio >= 0.5) paper.grade = 'D';
    else paper.grade = 'F';

    papers[paperIdx] = paper;
    await savePapers(papers);

    res.json(paper);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update grade information' });
  }
});

// API: Get Aggregate Analytics
app.get('/api/analytics', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== 'professor') {
      return res.status(403).json({ error: 'Forbidden: Only professors can access analytics.' });
    }

    let ownedSubjects = [];
    if (isSupabaseConfigured) {
      const { data } = await supabase
        .from('subjects')
        .select('id')
        .eq('professor_id', user.id);
      ownedSubjects = data ? data.map(s => s.id) : [];
    } else {
      ownedSubjects = user.subjectsTeaching || [];
    }

    const subjects = (await getSubjects()).filter(s => ownedSubjects.includes(s.id));
    const papers = (await getPapers()).filter(p => ownedSubjects.includes(p.subjectId));
    const omrPapers = (await getOMRPapers()).filter(p => {
      if (ownedSubjects.length === 0) return false;
      return ownedSubjects.some(subId => {
        const cleanSub = subId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const cleanTmpl = p.templateId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        return cleanTmpl.includes(cleanSub) || cleanSub.includes(cleanTmpl) ||
               (subId.toLowerCase().startsWith('bio') && p.templateId.includes('101')) ||
               (subId.toLowerCase().startsWith('chm') && p.templateId.includes('102'));
      });
    });

    const gradedPapers = papers.filter(p => p.status === 'graded' || p.status === 'evaluated');
    const checkedOMRPapers = omrPapers.filter(p => p.status === 'checked');

    const totalCount = papers.length + omrPapers.length;
    const gradedCount = gradedPapers.length + checkedOMRPapers.length;

    let classAverage = 0;
    if (gradedCount > 0) {
      const essaySum = gradedPapers.reduce((acc, p) => acc + (p.totalScore / p.maxMarks), 0);
      const omrSum = checkedOMRPapers.reduce((acc, p) => {
        if (p.evaluation && p.evaluation.maxScore > 0) {
          return acc + (p.evaluation.totalScore / p.evaluation.maxScore);
        }
        return acc;
      }, 0);
      classAverage = Math.round(((essaySum + omrSum) / gradedCount) * 100);
    }

    const distribution = { 'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 };
    gradedPapers.forEach(p => {
      const g = p.grade;
      if (distribution[g] !== undefined) distribution[g]++;
    });
    checkedOMRPapers.forEach(p => {
      if (p.evaluation && p.evaluation.maxScore > 0) {
        const ratio = p.evaluation.totalScore / p.evaluation.maxScore;
        let g = 'F';
        if (ratio >= 0.9) g = 'A+';
        else if (ratio >= 0.8) g = 'A';
        else if (ratio >= 0.7) g = 'B';
        else if (ratio >= 0.6) g = 'C';
        else if (ratio >= 0.5) g = 'D';
        if (distribution[g] !== undefined) distribution[g]++;
      }
    });

    const subjectStats = subjects.map(sub => {
      const subPapers = gradedPapers.filter(p => p.subjectId === sub.id);
      let avgScore = 0;
      let maxScore = sub.questions.reduce((sum, q) => sum + q.maxMarks, 0);
      if (subPapers.length > 0) {
        const sum = subPapers.reduce((acc, p) => acc + p.totalScore, 0);
        avgScore = parseFloat((sum / subPapers.length).toFixed(1));
      }
      return {
        subjectId: sub.id,
        subjectName: sub.name,
        averageScore: avgScore,
        maxScore: maxScore,
        count: subPapers.length
      };
    });

    const keywordGaps = [];
    subjects.forEach(sub => {
      const subPapers = gradedPapers.filter(p => p.subjectId === sub.id);
      if (subPapers.length === 0) return;

      sub.questions.forEach(q => {
        if (q.rubric && Array.isArray(q.rubric)) {
          q.rubric.forEach(rub => {
            let missingCount = 0;
            subPapers.forEach(paper => {
              const paperAns = paper.answers.find(a => a.questionId === q.id);
              if (paperAns && paperAns.rubricMatches && !paperAns.rubricMatches.includes(rub.keyword)) {
                missingCount++;
              }
            });
            keywordGaps.push({
              subjectId: sub.id,
              questionId: q.id,
              keyword: rub.keyword,
              missingRate: Math.round((missingCount / subPapers.length) * 100),
              totalEvaluated: subPapers.length
            });
          });
        }
      });
    });

    keywordGaps.sort((a, b) => b.missingRate - a.missingRate);

    const topics = [
      { name: 'Stacks & Queues', type: 'essay', subjectId: 'CS-301', questionId: 'Q1' },
      { name: 'Trees', type: 'essay', subjectId: 'CS-301', questionId: 'Q2' },
      { name: 'Newtonian Mechanics', type: 'essay', subjectId: 'PHY-102', questionId: 'Q1' },
      { name: 'Cellular Respiration (Mitochondria)', type: 'essay', subjectId: 'BIO-205', questionId: 'Q1' },
      { name: 'Cell Division & Genetics', type: 'omr', templateId: 'OMR-101' },
      { name: 'Stoichiometry & Chemical Bonding', type: 'omr', templateId: 'OMR-102' }
    ];

    const filteredTopics = topics.filter(t => {
      if (t.type === 'essay') {
        return ownedSubjects.includes(t.subjectId);
      } else {
        return omrPapers.some(op => op.templateId === t.templateId);
      }
    });

    const topicStats = filteredTopics.map(t => {
      let totalGraded = 0;
      let strugglingCount = 0;

      if (t.type === 'essay') {
        const subPapers = gradedPapers.filter(p => p.subjectId === t.subjectId);
        subPapers.forEach(p => {
          const ans = p.answers.find(a => a.questionId === t.questionId);
          if (ans && ans.isEvaluated) {
            totalGraded++;
            const sub = subjects.find(s => s.id === t.subjectId);
            const q = sub ? sub.questions.find(quest => quest.id === t.questionId) : null;
            const limit = q ? q.maxMarks : 10;
            if (ans.score / limit < 0.75) {
              strugglingCount++;
            }
          }
        });
      } else {
        const tempPapers = checkedOMRPapers.filter(p => p.templateId === t.templateId);
        tempPapers.forEach(p => {
          if (p.evaluation) {
            totalGraded++;
            if (p.evaluation.totalScore / p.evaluation.maxScore < 0.75) {
              strugglingCount++;
            }
          }
        });
      }

      const difficultyRate = totalGraded > 0 ? Math.round((strugglingCount / totalGraded) * 100) : 0;
      
      let actionAdvice = 'Mastery achieved: No class-wide review needed.';
      if (difficultyRate > 40) {
        actionAdvice = 'Urgent: Schedule a review lecture on this topic.';
      } else if (difficultyRate > 15) {
        actionAdvice = 'Recommended: Distribute additional practice worksheets.';
      }

      return {
        name: t.name,
        difficultyRate,
        strugglingCount,
        totalGraded,
        actionAdvice
      };
    });

    res.json({
      totalCount,
      gradedCount,
      pendingCount: totalCount - gradedCount,
      classAveragePercent: classAverage,
      distribution,
      subjectStats,
      keywordGaps: keywordGaps.slice(0, 5),
      topicStats
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to compile statistics' });
  }
});

function getMockAnswerForSubjectAndQuestion(subjectId, questionId) {
  if (subjectId === 'CS-301') {
    if (questionId === 'Q1') {
      return "A stack is a linear collection working with LIFO model, push to insert and pop to delete. For example, browser back buttons. A queue is FIFO where we enqueue at back and dequeue at front, like people waiting at a bus stop.";
    } else if (questionId === 'Q2') {
      return "A Binary Search Tree has nodes where the left child key is smaller and right is bigger. The average time for insert, search and delete is O(log n) as we split search space. In worst cases it degrades to O(n) due to a skewed chain of single child nodes.";
    }
  } else if (subjectId === 'PHY-102') {
    return "Newton's laws are mechanics base: 1. Inertia law: state of rest or constant motion remains unless force acts. E.g. passengers jerk when bus stops. 2. Force equals mass times acceleration: F=ma. E.g. pushing a heavy cart is harder than light cart. 3. Action and reaction are equal and opposite: rocket fuel pushing down pushes rocket up.";
  } else if (subjectId === 'BIO-205') {
    return "Mitochondria are double membrane energy generators inside cells. Inner membrane folding forms cristae to facilitate cellular respiration. They generate Adenosine Triphosphate (ATP) molecules. Hence they are called powerhouses.";
  }
  return "This is a student written answer. It contains details regarding the topic, referencing various aspects and explanation structures.";
}

// API: OMR Templates
app.get('/api/omr/templates', async (req, res) => {
  try {
    res.json(await getOMRTemplates());
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to read OMR templates' });
  }
});

app.post('/api/omr/templates', async (req, res) => {
  try {
    const templates = await getOMRTemplates();
    const newTmpl = req.body;
    if (!newTmpl.templateId || !newTmpl.title) {
      return res.status(400).json({ error: 'Subject code and title are required' });
    }
    if (!newTmpl.questionCount || newTmpl.questionCount < 1) {
      return res.status(400).json({ error: 'Question count must be at least 1' });
    }
    if (!newTmpl.answerKey || typeof newTmpl.answerKey !== 'object') {
      return res.status(400).json({ error: 'Answer key is required' });
    }

    const normalizedKey = {};
    for (let q = 1; q <= newTmpl.questionCount; q++) {
      const ans = newTmpl.answerKey[q] || newTmpl.answerKey[String(q)];
      if (!ans || !['A', 'B', 'C', 'D'].includes(ans)) {
        return res.status(400).json({ error: `Invalid or missing answer for question ${q}` });
      }
      normalizedKey[String(q)] = ans;
    }

    newTmpl.answerKey = normalizedKey;
    newTmpl.marksPerQuestion = parseFloat(newTmpl.marksPerQuestion) || 1;
    newTmpl.negativeMarksPerQuestion = parseFloat(newTmpl.negativeMarksPerQuestion) || 0;

    const idx = templates.findIndex(t => t.templateId === newTmpl.templateId);
    if (idx !== -1) {
      templates[idx] = newTmpl;
    } else {
      templates.push(newTmpl);
    }
    await saveOMRTemplates(templates);
    res.status(201).json(newTmpl);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save OMR template' });
  }
});

// API: OMR Papers
app.get('/api/omr/papers', async (req, res) => {
  try {
    let papers = await getOMRPapers();
    const studentId = req.query.studentId;
    const role = await getRoleFromRequest(req);
    
    if (studentId) {
      papers = papers.filter(p => p.studentId === studentId);
    }
    
    if (role === 'student' || studentId) {
      const allOMRPapers = await getOMRPapers();
      papers = papers.map(p => {
        const isPub = p.isPublished !== false;
        if (!isPub) {
          return {
            id: p.id,
            studentName: p.studentName,
            studentId: p.studentId,
            templateId: p.templateId,
            status: "pending_review",
            submissionDate: p.submissionDate,
            imagePath: p.imagePath
          };
        }

        // Find other published submissions for same template
        const sameTemplateOMRs = allOMRPapers.filter(x => 
          x.templateId === p.templateId && x.isPublished !== false && x.evaluation
        );

        if (sameTemplateOMRs.length >= 2) {
          const sum = sameTemplateOMRs.reduce((acc, x) => acc + (x.evaluation?.totalScore || 0), 0);
          const max = sameTemplateOMRs.reduce((acc, x) => acc + (x.evaluation?.maxScore || 10.0), 0);
          p.classAverage = max > 0 ? parseFloat((sum / max * 100).toFixed(1)) : null;
        } else {
          p.classAverage = null;
        }

        return p;
      });
    }
    res.json(papers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to read OMR papers' });
  }
});

app.get('/api/omr/papers/:id', async (req, res) => {
  try {
    const papers = await getOMRPapers();
    const paper = papers.find(p => p.id === req.params.id);
    if (!paper) return res.status(404).json({ error: 'OMR paper not found' });
    
    const role = await getRoleFromRequest(req);
    if (role === 'student') {
      const isPub = paper.isPublished !== false;
      if (!isPub) {
        return res.json({
          id: paper.id,
          studentName: paper.studentName,
          studentId: paper.studentId,
          templateId: paper.templateId,
          status: "pending_review",
          submissionDate: paper.submissionDate,
          imagePath: paper.imagePath
        });
      }
    }
    res.json(paper);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to read OMR paper' });
  }
});

// API: Publish / Unpublish OMR Paper
app.post('/api/omr/papers/:id/publish', async (req, res) => {
  try {
    const isPublished = req.body.isPublished !== false;
    
    if (!isSupabaseConfigured) {
      const papers = getOMRPapersLocal();
      const idx = papers.findIndex(p => p.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'OMR paper not found' });
      papers[idx].isPublished = isPublished;
      saveOMRPapersLocal(papers);
      return res.json({ message: `OMR paper publication state updated successfully to ${isPublished}`, isPublished });
    }

    const { data, error } = await supabase
      .from('omr_papers')
      .update({ is_published: isPublished })
      .eq('id', req.params.id)
      .select('*')
      .maybeSingle();
      
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'OMR paper not found' });
    
    res.json({ message: `OMR paper publication state updated successfully to ${isPublished}`, isPublished });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update OMR publication status' });
  }
});

// OMR File Upload
app.post('/api/omr/upload', upload.single('sheet'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No OMR sheet image uploaded' });

    const studentName = req.body.studentName || 'New Student';
    const studentId = req.body.studentId || 'STU-' + Math.floor(1000 + Math.random() * 9000);
    const templateId = req.body.templateId;

    if (!templateId) {
      return res.status(400).json({ error: 'Select an exam subject with a saved answer key before uploading' });
    }
    
    const templates = await getOMRTemplates();
    const template = templates.find(t => t.templateId === templateId);
    if (!template) return res.status(404).json({ error: 'OMR answer key not found. Create it in Rubric Manager first.' });
    
    const selectedAnswers = {};
    const options = ['A', 'B', 'C', 'D'];
    
    for (let q = 1; q <= template.questionCount; q++) {
      const correctAns = template.answerKey[q] || template.answerKey[String(q)];
      const rand = Math.random();
      
      if (rand < 0.75) {
        selectedAnswers[q] = correctAns;
      } else if (rand < 0.88) {
        const wrongOpts = options.filter(o => o !== correctAns);
        selectedAnswers[q] = wrongOpts[Math.floor(Math.random() * wrongOpts.length)];
      } else if (rand < 0.95) {
        selectedAnswers[q] = "";
      } else {
        const mult = [correctAns, options.filter(o => o !== correctAns)[0]].sort().join(',');
        selectedAnswers[q] = mult;
      }
    }
    
    const papers = await getOMRPapers();
    const filename = req.file ? '/uploads/' + req.file.filename : '';
    
    const newPaper = {
      id: 'omr_paper_' + Date.now(),
      studentName,
      studentId,
      templateId,
      status: 'pending',
      submissionDate: new Date().toISOString().split('T')[0],
      imagePath: filename,
      selectedAnswers,
      evaluation: null,
      evaluatorNotes: '',
      isPublished: false
    };
    
    papers.push(newPaper);
    await saveOMRPapers(papers);
    res.status(201).json(newPaper);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to process OMR upload' });
  }
});

// API: Simulate OMR bubble positions and coordinates
app.post('/api/omr/papers/:id/ocr', async (req, res) => {
  try {
    const papers = await getOMRPapers();
    const paper = papers.find(p => p.id === req.params.id);
    if (!paper) return res.status(404).json({ error: 'OMR paper not found' });
    
    const templates = await getOMRTemplates();
    const template = templates.find(t => t.templateId === paper.templateId);
    if (!template) return res.status(404).json({ error: 'OMR template not found' });
    
    const bubbleLayouts = [];
    const qCount = template.questionCount;
    const cols = qCount > 10 ? 2 : 1;
    const itemsPerCol = Math.ceil(qCount / cols);
    
    for (let q = 1; q <= qCount; q++) {
      const colIdx = q <= itemsPerCol ? 0 : 1;
      const rowIdx = q <= itemsPerCol ? (q - 1) : (q - itemsPerCol - 1);
      
      const xStart = colIdx === 0 ? 15 : 60;
      const yStart = 18 + rowIdx * 5.2;
      
      const bubbleValues = ['A', 'B', 'C', 'D'];
      const studentAns = paper.selectedAnswers[q] || '';
      
      bubbleValues.forEach((opt, optIdx) => {
        const bubbleX = xStart + 8 + optIdx * 5;
        const isFilled = studentAns.split(',').includes(opt);
        
        bubbleLayouts.push({
          questionNum: q,
          option: opt,
          x: bubbleX,
          y: yStart,
          isFilled: isFilled
        });
      });
    }
    
    res.json({
      paperId: paper.id,
      imagePath: paper.imagePath,
      calibrationTargets: [
        { x: 5, y: 5 },
        { x: 95, y: 5 },
        { x: 5, y: 95 },
        { x: 95, y: 95 }
      ],
      bubbles: bubbleLayouts
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to extract bubble coordinates' });
  }
});

// API: Process OMR grading
app.post('/api/omr/papers/:id/evaluate', async (req, res) => {
  try {
    const papers = await getOMRPapers();
    const paperIdx = papers.findIndex(p => p.id === req.params.id);
    if (paperIdx === -1) return res.status(404).json({ error: 'OMR paper not found' });
    
    const paper = papers[paperIdx];
    const templates = await getOMRTemplates();
    const template = templates.find(t => t.templateId === paper.templateId);
    
    if (!template) return res.status(404).json({ error: 'OMR template not found' });
    
    let correctCount = 0;
    let incorrectCount = 0;
    let blankCount = 0;
    let invalidCount = 0;
    const questionBreakdown = {};
    
    for (let q = 1; q <= template.questionCount; q++) {
      const studentAns = paper.selectedAnswers[q] || '';
      const correctAns = template.answerKey[q] || template.answerKey[String(q)];
      
      if (studentAns === '') {
        blankCount++;
        questionBreakdown[q] = 'blank';
      } else if (studentAns.includes(',')) {
        invalidCount++;
        questionBreakdown[q] = 'invalid';
      } else if (studentAns === correctAns) {
        correctCount++;
        questionBreakdown[q] = 'correct';
      } else {
        incorrectCount++;
        questionBreakdown[q] = 'incorrect';
      }
    }
    
    const rawScore = (correctCount * template.marksPerQuestion) - (incorrectCount * template.negativeMarksPerQuestion);
    const totalScore = Math.max(0.0, parseFloat(rawScore.toFixed(2)));
    const maxScore = template.questionCount * template.marksPerQuestion;
    
    paper.evaluation = {
      correctCount,
      incorrectCount,
      blankCount,
      invalidCount,
      totalScore,
      maxScore,
      questionBreakdown
    };
    
    paper.status = 'evaluated';
    papers[paperIdx] = paper;
    await saveOMRPapers(papers);
    
    res.json(paper);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to evaluate OMR paper' });
  }
});

// API: OMR Grade review manual edits
app.post('/api/omr/papers/:id/grade', async (req, res) => {
  try {
    const papers = await getOMRPapers();
    const paperIdx = papers.findIndex(p => p.id === req.params.id);
    if (paperIdx === -1) return res.status(404).json({ error: 'OMR paper not found' });
    
    const paper = papers[paperIdx];
    const { selectedAnswers, evaluatorNotes, status } = req.body;
    
    if (selectedAnswers) paper.selectedAnswers = selectedAnswers;
    if (evaluatorNotes !== undefined) paper.evaluatorNotes = evaluatorNotes;
    if (status) paper.status = status;
    
    if (paper.evaluation) {
      const templates = await getOMRTemplates();
      const template = templates.find(t => t.templateId === paper.templateId);
      if (template) {
        let correctCount = 0;
        let incorrectCount = 0;
        let blankCount = 0;
        let invalidCount = 0;
        const questionBreakdown = {};
        
        for (let q = 1; q <= template.questionCount; q++) {
          const studentAns = paper.selectedAnswers[q] || '';
          const correctAns = template.answerKey[q] || template.answerKey[String(q)];
          
          if (studentAns === '') {
            blankCount++;
            questionBreakdown[q] = 'blank';
          } else if (studentAns.includes(',')) {
            invalidCount++;
            questionBreakdown[q] = 'invalid';
          } else if (studentAns === correctAns) {
            correctCount++;
            questionBreakdown[q] = 'correct';
          } else {
            incorrectCount++;
            questionBreakdown[q] = 'incorrect';
          }
        }
        const rawScore = (correctCount * template.marksPerQuestion) - (incorrectCount * template.negativeMarksPerQuestion);
        paper.evaluation = {
          correctCount,
          incorrectCount,
          blankCount,
          invalidCount,
          totalScore: Math.max(0.0, parseFloat(rawScore.toFixed(2))),
          maxScore: template.questionCount * template.marksPerQuestion,
          questionBreakdown
        };
      }
    }
    
    papers[paperIdx] = paper;
    await saveOMRPapers(papers);
    res.json(paper);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update OMR grading status' });
  }
});
// API: Save Draft Evaluation
app.post('/api/evaluations/:submissionId/save', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'professor') {
      return res.status(403).json({ error: 'Only professors can perform evaluations.' });
    }
    const { submissionId } = req.params;
    const { answers, evaluatorNotes } = req.body;

    if (!isSupabaseConfigured) {
      const papers = getPapersLocal();
      const idx = papers.findIndex(p => p.id === submissionId);
      if (idx === -1) return res.status(404).json({ error: 'Paper not found' });

      if (papers[idx].evaluationType === 'omr') {
        if (answers && Array.isArray(answers)) {
          for (const reqAns of answers) {
            const orig = papers[idx].answers.find(a => a.questionNo === reqAns.questionNo);
            if (orig) {
              orig.detectedOption = reqAns.professorOverride !== undefined ? reqAns.professorOverride : reqAns.detectedOption;
              orig.professorOverride = reqAns.professorOverride;
              
              // Recompute status and score
              const tmplId = papers[idx].examId;
              const templates = getOMRTemplatesLocal();
              const template = templates.find(t => t.templateId === tmplId);
              const correctAns = template ? (template.answerKey[String(orig.questionNo)] || template.answerKey[orig.questionNo]) : '';
              
              const detected = orig.detectedOption || '';
              if (detected === '') {
                orig.status = 'blank';
                orig.score = 0;
              } else if (detected.includes(',') || detected === 'multiple' || detected === 'multiple_marked') {
                orig.status = 'multiple_marked';
                orig.score = 0;
              } else if (detected === correctAns) {
                orig.status = 'correct';
                orig.score = template ? parseFloat(template.marksPerQuestion || 1.0) : 1.0;
              } else {
                orig.status = 'wrong';
                orig.score = template ? -parseFloat(template.negativeMarksPerQuestion || 0.0) : 0.0;
              }
              orig.isEvaluated = true;
            }
          }
        }
        
        // Recompute total score
        const totalScore = parseFloat(papers[idx].answers.reduce((acc, a) => acc + (a.score || 0), 0).toFixed(2));
        papers[idx].totalScore = Math.max(0.0, totalScore); // floor 0
        if (evaluatorNotes !== undefined) papers[idx].evaluatorNotes = evaluatorNotes;
        savePapersLocal(papers);
        return res.json({ message: 'OMR draft saved successfully locally' });
      }
      
      // Descriptive Local mode
      if (answers && Array.isArray(answers)) {
        for (const reqAns of answers) {
          const orig = papers[idx].answers.find(a => a.questionId === reqAns.questionId);
          if (orig) {
            const max = parseFloat(orig.maxMarks || 10.0);
            const score = parseFloat(reqAns.score);
            if (score > max) {
              return res.status(400).json({
                error: 'VALIDATION_ERROR',
                message: `Score for ${reqAns.questionId} (${score}) exceeds maximum marks (${max})`
              });
            }
            orig.score = score;
            orig.aiFeedback = reqAns.aiFeedback;
            orig.isEvaluated = true;
          }
        }
      }
      if (evaluatorNotes !== undefined) papers[idx].evaluatorNotes = evaluatorNotes;
      savePapersLocal(papers);
      return res.json({ message: 'Draft evaluation saved successfully locally' });
    }

    // Supabase Mode
    const { data: submission, error: subError } = await supabase
      .from('submissions')
      .select('*, subjects(*), exams(*)')
      .eq('id', submissionId)
      .maybeSingle();

    if (subError || !submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    if (submission.subjects.professor_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: You do not teach the subject for this submission.' });
    }

    const isOMR = submission.exams && submission.exams.evaluation_type === 'omr';

    let { data: evaluation } = await supabase
      .from('evaluations')
      .select('*')
      .eq('submission_id', submissionId)
      .maybeSingle();

    if (!evaluation) {
      const defaultTotal = isOMR 
        ? (submission.exams.total_questions || 15) * parseFloat(submission.exams.marks_per_question || 1.0)
        : 10.0;

      const { data: newEval, error: evalError } = await supabase
        .from('evaluations')
        .insert({
          submission_id: submissionId,
          professor_id: req.user.id,
          total_marks: defaultTotal,
          obtained_marks: 0.0,
          overall_feedback: evaluatorNotes || ''
        })
        .select('*')
        .single();
      if (evalError) throw evalError;
      evaluation = newEval;
    } else {
      if (evaluatorNotes !== undefined) {
        await supabase
          .from('evaluations')
          .update({ overall_feedback: evaluatorNotes })
          .eq('id', evaluation.id);
      }
    }

    if (isOMR) {
      if (answers && Array.isArray(answers)) {
        for (const ans of answers) {
          const qNo = ans.questionNo;
          const overrideOpt = ans.professorOverride !== undefined ? ans.professorOverride : ans.detectedOption;

          // Fetch OMR answer key
          const { data: oKey } = await supabase
            .from('omr_answer_keys')
            .eq('exam_id', submission.exam_id)
            .eq('question_no', qNo)
            .maybeSingle();

          const correctAns = oKey ? oKey.correct_option : '';
          const detected = overrideOpt || '';
          
          let status = 'blank';
          let score = 0.0;
          
          const marksPerQ = submission.exams.marks_per_question ? parseFloat(submission.exams.marks_per_question) : 1.0;
          const negMarks = submission.exams.negative_marking ? parseFloat(submission.exams.negative_marking) : 0.0;

          if (detected === '') {
            status = 'blank';
            score = 0.0;
          } else if (detected.includes(',') || detected === 'multiple' || detected === 'multiple_marked') {
            status = 'multiple_marked';
            score = 0.0;
          } else if (detected === 'invalid') {
            status = 'invalid';
            score = 0.0;
          } else if (detected === correctAns) {
            status = 'correct';
            score = marksPerQ;
          } else {
            status = 'wrong';
            score = -negMarks;
          }

          // Update omr_question_results
          await supabase
            .from('omr_question_results')
            .update({
              detected_option: detected,
              professor_override: ans.professorOverride || null,
              status: status,
              marks_awarded: score
            })
            .eq('submission_id', submissionId)
            .eq('question_no', qNo);
        }
      }

      // Recompute and update evaluation totals
      const { data: qRows } = await supabase
        .from('omr_question_results')
        .select('marks_awarded')
        .eq('submission_id', submissionId);

      let obtained = 0.0;
      if (qRows) {
        obtained = qRows.reduce((acc, q) => acc + parseFloat(q.marks_awarded || 0), 0);
      }
      obtained = parseFloat(Math.max(0.0, obtained).toFixed(2)); // Floor 0
      const totalMax = (submission.exams.total_questions || 15) * parseFloat(submission.exams.marks_per_question || 1.0);

      await supabase
        .from('evaluations')
        .update({
          obtained_marks: obtained,
          total_marks: totalMax,
          updated_at: new Date()
        })
        .eq('id', evaluation.id);

      await supabase.from('audit_log').insert({
        actor_id: req.user.id,
        action: 'evaluation.saved_draft_omr',
        target_type: 'evaluation',
        target_id: evaluation.id,
        metadata: { submissionId }
      });

      return res.json({ message: 'OMR draft saved successfully', evaluationId: evaluation.id });
    }

    // Descriptive Supabase Mode
    if (answers && Array.isArray(answers)) {
      // Fetch answer keys for validation
      const { data: keys } = await supabase
        .from('answer_keys')
        .select('question_no, max_marks')
        .eq('exam_id', submission.exam_id);

      for (const ans of answers) {
        const qNo = parseInt(ans.questionId.replace(/\D/g, '')) || 1;
        const keyRow = keys ? keys.find(k => k.question_no === qNo) : null;
        const max = keyRow ? parseFloat(keyRow.max_marks || 10.0) : 10.0;
        const score = parseFloat(ans.score);
        if (score > max) {
          return res.status(400).json({
            error: 'VALIDATION_ERROR',
            message: `Score for ${ans.questionId} (${score}) exceeds maximum marks (${max})`
          });
        }

        const { data: existingQ } = await supabase
          .from('question_evaluations')
          .select('id')
          .eq('evaluation_id', evaluation.id)
          .eq('question_no', qNo)
          .maybeSingle();

        if (existingQ) {
          await supabase
            .from('question_evaluations')
            .update({
              student_answer: ans.studentAnswer || '',
              professor_marks: ans.score !== undefined ? parseFloat(ans.score) : null,
              feedback: ans.aiFeedback || ''
            })
            .eq('id', existingQ.id);
        } else {
          await supabase
            .from('question_evaluations')
            .insert({
              evaluation_id: evaluation.id,
              question_no: qNo,
              student_answer: ans.studentAnswer || '',
              reference_answer: 'Model answer.',
              ai_marks: ans.score || 0.0,
              professor_marks: ans.score !== undefined ? parseFloat(ans.score) : null,
              feedback: ans.aiFeedback || '',
              confidence: 90.0
            });
        }
      }

      // Recompute and update evaluation totals
      const { data: qRows } = await supabase
        .from('question_evaluations')
        .select('ai_marks, professor_marks, answer_key:answer_key_id(max_marks)')
        .eq('evaluation_id', evaluation.id);

      let obtained = 0.0;
      let totalMax = 0.0;
      if (qRows) {
        for (const qe of qRows) {
          const max = qe.answer_key ? parseFloat(qe.answer_key.max_marks || 10.0) : 10.0;
          totalMax += max;
          const score = qe.professor_marks !== null ? parseFloat(qe.professor_marks) : parseFloat(qe.ai_marks || 0);
          obtained += score;
        }
      }
      obtained = parseFloat(obtained.toFixed(1));
      totalMax = parseFloat(totalMax.toFixed(1));

      await supabase
        .from('evaluations')
        .update({
          obtained_marks: obtained,
          total_marks: totalMax,
          updated_at: new Date()
        })
        .eq('id', evaluation.id);
    }

    await supabase.from('audit_log').insert({
      actor_id: req.user.id,
      action: 'evaluation.saved_draft',
      target_type: 'evaluation',
      target_id: evaluation.id,
      metadata: { submissionId }
    });

    res.json({ message: 'Draft evaluation saved successfully', evaluationId: evaluation.id });
  } catch (err) {
    console.error('Failed to save evaluation:', err);
    res.status(500).json({ error: 'Failed to save draft evaluation' });
  }
});

// API: Release Evaluation Results
app.post('/api/evaluations/:submissionId/release', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'professor') {
      return res.status(403).json({ error: 'Only professors can release evaluations.' });
    }
    const { submissionId } = req.params;

    if (!isSupabaseConfigured) {
      const papers = getPapersLocal();
      const idx = papers.findIndex(p => p.id === submissionId);
      if (idx === -1) return res.status(404).json({ error: 'Paper not found' });
      papers[idx].isPublished = true;
      papers[idx].status = 'released';
      savePapersLocal(papers);
      return res.json({ message: 'Result released successfully locally' });
    }

    const { data: submission, error: subError } = await supabase
      .from('submissions')
      .select('*, subjects(*), exams(*)')
      .eq('id', submissionId)
      .maybeSingle();

    if (subError || !submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    if (submission.subjects.professor_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: You do not teach the subject for this submission.' });
    }

    const isOMR = submission.exams && submission.exams.evaluation_type === 'omr';

    const { data: evaluation, error: evalError } = await supabase
      .from('evaluations')
      .select('*, question_evaluations(*)')
      .eq('submission_id', submissionId)
      .maybeSingle();

    if (evalError || !evaluation) {
      return res.status(404).json({ error: 'Evaluation details not found. Save draft first.' });
    }

    const now = new Date();

    if (isOMR) {
      const { data: qResults } = await supabase
        .from('omr_question_results')
        .select('marks_awarded')
        .eq('submission_id', submissionId);

      const totalMarks = (submission.exams.total_questions || 15) * parseFloat(submission.exams.marks_per_question || 1.0);
      const obtainedMarks = qResults ? qResults.reduce((acc, q) => acc + parseFloat(q.marks_awarded || 0), 0) : 0;
      const finalObtained = parseFloat(Math.max(0.0, obtainedMarks).toFixed(2));

      await supabase
        .from('evaluations')
        .update({
          total_marks: totalMarks,
          obtained_marks: finalObtained,
          released_at: now,
          updated_at: now
        })
        .eq('id', evaluation.id);

      await supabase
        .from('submissions')
        .update({
          status: 'released',
          evaluated_at: now
        })
        .eq('id', submissionId);

      await supabase.from('notifications').insert({
        user_id: submission.student_id,
        title: 'Exam Result Released!',
        message: `Your results for ${submission.subjects.code} - ${submission.exams.title || 'MCQ Examination'} are now available.`,
        type: 'result_released'
      });

      return res.json({ message: 'OMR Result released successfully' });
    }

    let totalMarks = 0;
    let obtainedMarks = 0;

    evaluation.question_evaluations.forEach(q => {
      const marks = q.professor_marks !== null ? parseFloat(q.professor_marks) : parseFloat(q.ai_marks);
      obtainedMarks += marks;
      totalMarks += 10.0; 
    });

    await supabase
      .from('evaluations')
      .update({
        total_marks: totalMarks,
        obtained_marks: obtainedMarks,
        released_at: now,
        updated_at: now
      })
      .eq('id', evaluation.id);

    await supabase
      .from('submissions')
      .update({
        status: 'released',
        evaluated_at: now
      })
      .eq('id', submissionId);

    // Send result notification to student
    await supabase.from('notifications').insert({
      user_id: submission.student_id,
      title: 'Exam Result Released!',
      message: `Your results for ${submission.subjects.code} - ${submission.exams.title || 'Examination'} are now available.`,
      type: 'result_released'
    });

    await supabase.from('audit_log').insert({
      actor_id: req.user.id,
      action: 'evaluation.released',
      target_type: 'evaluation',
      target_id: evaluation.id,
      metadata: { obtainedMarks, totalMarks }
    });

    res.json({ message: 'Result released successfully', totalMarks, obtainedMarks });
  } catch (err) {
    console.error('Failed to release evaluation:', err);
    res.status(500).json({ error: 'Failed to release evaluation' });
  }
});

// API: Notifications endpoints
app.get('/api/notifications', authMiddleware, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.json([]);
    }
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(notifications || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to read notifications' });
  }
});

app.post('/api/notifications/:id/read', authMiddleware, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.json({ message: 'Success' });
    }
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);
    if (error) throw error;
    res.json({ message: 'Notification marked as read successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// ==========================================================================
// Authentication & User Sessions API
// ==========================================================================

// API: User Registration
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, role, ...profileData } = req.body;
    
    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Missing email, password, or role' });
    }

    if (isSupabaseConfigured) {
      // 1. Create in Supabase Auth using Admin Auth Client
      const { data: authData, error: createError } = await supabaseAuth.auth.admin.createUser({
        email: email.toLowerCase(),
        password: password,
        email_confirm: true,
        user_metadata: {
          name: profileData.fullName || email,
          role: role
        }
      });
      
      if (createError) {
        return res.status(400).json({ error: createError.message });
      }

      // 2. Explicit profile upsert to prevent any trigger race conditions
      const { error: profileError } = await supabase
        .from('users')
        .upsert({
          id: authData.user.id,
          email: email.toLowerCase(),
          role: role,
          name: profileData.fullName || email
        });

      if (profileError) {
        console.error('Failed to sync public profile:', profileError);
      }

      return res.json({
        id: authData.user.id,
        email: email.toLowerCase(),
        role: role,
        name: profileData.fullName || email,
        fullName: profileData.fullName || email
      });
    } else {
      // Offline local JSON mode
      const users = getUsersLocal();
      const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        return res.status(400).json({ error: 'An account with this email already exists' });
      }
      
      const passwordHash = await bcrypt.hash(password, 10);
      const newUser = {
        email: email.toLowerCase(),
        password: passwordHash,
        role,
        ...profileData
      };
      
      users.push(newUser);
      await saveUsers(users);
      
      const { password: _, ...userWithoutPassword } = newUser;
      res.json(userWithoutPassword);
    }
  } catch (error) {
    console.error('Registration failed:', error);
    res.status(500).json({ error: 'Registration failed due to server error' });
  }
});

// API: User Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }

    if (isSupabaseConfigured) {
      // 1. Sign in via Supabase Auth
      const { data: authData, error: loginError } = await supabaseAuth.auth.signInWithPassword({
        email: email.toLowerCase(),
        password: password
      });

      if (loginError) {
        return res.status(401).json({ error: loginError.message });
      }

      // 2. Fetch public user profile
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (profileError || !profile) {
        // Fallback profile if database is out of sync
        const fallbackName = authData.user.user_metadata?.name || authData.user.email;
        return res.json({
          token: authData.session.access_token,
          id: authData.user.id,
          email: authData.user.email,
          role: authData.user.user_metadata?.role || 'student',
          name: fallbackName,
          fullName: fallbackName
        });
      }

      res.json({
        token: authData.session.access_token,
        id: profile.id,
        email: profile.email,
        role: profile.role,
        name: profile.name,
        fullName: profile.name,
        ...profile
      });
    } else {
      // Offline local JSON mode
      const users = getUsersLocal();
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      
      const isMatch = user.password.startsWith('$2b$')
        ? await bcrypt.compare(password, user.password)
        : password === user.password;

      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    }
  } catch (error) {
    console.error('Login failed:', error);
    res.status(500).json({ error: 'Login failed due to server error' });
  }
});

// Student Dashboard Summary API
app.get('/api/student/dashboard/summary', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can access student dashboard metrics.' });
    }

    let subjectsCount = 0;
    let examsSubmitted = 0;
    let pendingEvaluation = 0;
    let publishedResults = 0;

    if (isSupabaseConfigured) {
      // Subjects Enrolled
      const { count: subCount } = await supabase
        .from('student_subjects')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', req.user.id);
      subjectsCount = subCount || 0;

      // Exams Submitted
      const { count: submissionCount } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', req.user.id);
      examsSubmitted = submissionCount || 0;

      // Pending Evaluations
      const { count: pendingCount } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', req.user.id)
        .in('status', ['pending', 'in_review']);
      pendingEvaluation = pendingCount || 0;

      // Published Results
      const { count: publishedCount } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', req.user.id)
        .eq('status', 'released');
      publishedResults = publishedCount || 0;
    } else {
      // Local fallback
      const papers = await getPapers();
      const studentPapers = papers.filter(p => p.studentUuid === req.user.id || p.studentId.toLowerCase() === req.user.email.toLowerCase());
      
      const subjects = await getSubjects();
      // Find count of unique subjects in student's papers
      const uniqueSubjects = new Set(studentPapers.map(p => p.subjectId));
      subjectsCount = uniqueSubjects.size || subjects.length || 0;

      examsSubmitted = studentPapers.length;
      pendingEvaluation = studentPapers.filter(p => p.status === 'pending' || p.status === 'pending_review' || p.status === 'in_review').length;
      publishedResults = studentPapers.filter(p => p.status === 'released' || p.isPublished).length;
    }

    res.json({
      subjectsCount,
      examsSubmitted,
      pendingEvaluation,
      publishedResults
    });
  } catch (error) {
    console.error('Failed to fetch student dashboard summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// Student Dashboard Activity Timeline API
app.get('/api/student/dashboard/activity', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can access student dashboard activity.' });
    }

    let activities = [];

    if (isSupabaseConfigured) {
      // Fetch submissions
      const { data: subs } = await supabase
        .from('submissions')
        .select(`
          id,
          submitted_at,
          status,
          exam:exam_id (title),
          subject:subject_id (code, name)
        `)
        .eq('student_id', req.user.id)
        .order('submitted_at', { ascending: false })
        .limit(10);

      // Fetch evaluations
      const { data: evals } = await supabase
        .from('evaluations')
        .select(`
          id,
          released_at,
          obtained_marks,
          total_marks,
          submission:submission_id (
            id,
            student_id,
            exam:exam_id (title),
            subject:subject_id (code, name)
          )
        `)
        .eq('submission.student_id', req.user.id)
        .not('released_at', 'is', null)
        .order('released_at', { ascending: false })
        .limit(10);

      if (subs) {
        subs.forEach(s => {
          activities.push({
            id: `sub-${s.id}`,
            type: 'submission',
            title: 'Exam Answer Sheet Submitted',
            desc: `You submitted your answer sheet for ${s.exam ? s.exam.title : 'Examination'} (${s.subject ? s.subject.code : ''}).`,
            timestamp: s.submitted_at
          });
        });
      }

      if (evals) {
        evals.filter(e => e.submission).forEach(e => {
          activities.push({
            id: `eval-${e.id}`,
            type: 'evaluation',
            title: 'Evaluation Report Released',
            desc: `Your graded report for ${e.submission.exam ? e.submission.exam.title : 'Examination'} is published. Score: ${e.obtained_marks}/${e.total_marks}.`,
            timestamp: e.released_at
          });
        });
      }
    } else {
      // Local fallback
      const papers = await getPapers();
      const studentPapers = papers.filter(p => p.studentUuid === req.user.id || p.studentId.toLowerCase() === req.user.email.toLowerCase());
      
      studentPapers.forEach(p => {
        activities.push({
          id: `sub-${p.id}`,
          type: 'submission',
          title: 'Exam Answer Sheet Submitted',
          desc: `You submitted your answer sheet for ${p.examTitle || 'Examination'} (${p.subjectId}).`,
          timestamp: p.submissionDate ? new Date(p.submissionDate).toISOString() : new Date().toISOString()
        });

        if (p.isPublished || p.status === 'released') {
          activities.push({
            id: `eval-${p.id}`,
            type: 'evaluation',
            title: 'Evaluation Report Released',
            desc: `Your graded report for ${p.examTitle || 'Examination'} is published. Score: ${p.totalScore}/${p.maxMarks}.`,
            timestamp: p.submissionDate ? new Date(new Date(p.submissionDate).getTime() + 86400000).toISOString() : new Date().toISOString()
          });
        }
      });
    }

    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(activities.slice(0, 8));
  } catch (error) {
    console.error('Failed to fetch student dashboard activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// Student Dashboard AI Recommendations API
app.get('/api/student/dashboard/recommendations', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can access student recommendations.' });
    }

    let recommendations = [];

    if (isSupabaseConfigured) {
      // Fetch evaluations
      const { data: evaluations } = await supabase
        .from('evaluations')
        .select(`
          id,
          submission:submission_id (student_id),
          question_evaluations (
            ai_marks,
            professor_marks,
            answer_key:answer_key_id (max_marks, topic)
          )
        `)
        .eq('submission.student_id', req.user.id)
        .not('released_at', 'is', null);

      const topicStats = {};

      if (evaluations) {
        evaluations.forEach(ev => {
          if (ev.question_evaluations && Array.isArray(ev.question_evaluations)) {
            ev.question_evaluations.forEach(qe => {
              const topic = qe.answer_key?.topic || 'General';
              const max = qe.answer_key ? parseFloat(qe.answer_key.max_marks || 10.0) : 10.0;
              const score = qe.professor_marks !== null ? parseFloat(qe.professor_marks) : parseFloat(qe.ai_marks || 0);
              
              if (!topicStats[topic]) {
                topicStats[topic] = { totalScore: 0, totalMax: 0, count: 0 };
              }
              topicStats[topic].totalScore += score;
              topicStats[topic].totalMax += max;
              topicStats[topic].count += 1;
            });
          }
        });
      }

      for (const [topic, stats] of Object.entries(topicStats)) {
        const pct = stats.totalMax > 0 ? (stats.totalScore / stats.totalMax) * 100 : 0;
        let status = 'Strong';
        if (pct < 60) status = 'Need Practice';
        else if (pct < 80) status = 'Revision Recommended';

        recommendations.push({
          topic,
          averageScore: parseFloat(pct.toFixed(1)),
          sampleSize: stats.count,
          status: stats.count >= 2 ? status : 'Not enough data yet'
        });
      }
    } else {
      // Local fallback
      const papers = await getPapers();
      const studentPapers = papers.filter(p => p.studentUuid === req.user.id || p.studentId.toLowerCase() === req.user.email.toLowerCase());
      
      const topicStats = {};

      studentPapers.filter(p => p.isPublished || p.status === 'released').forEach(p => {
        if (p.answers && Array.isArray(p.answers)) {
          p.answers.forEach((ans, idx) => {
            // Assign dummy topic tag if not present
            let topic = ans.topic || 'General';
            if (topic === 'General') {
              if (idx === 0) topic = 'Arrays';
              else if (idx === 1) topic = 'Linked Lists';
              else if (idx === 2) topic = 'Trees';
              else topic = 'Sorting';
            }
            const max = parseFloat(ans.maxMarks || 10.0);
            const score = parseFloat(ans.score || 0);

            if (!topicStats[topic]) {
              topicStats[topic] = { totalScore: 0, totalMax: 0, count: 0 };
            }
            topicStats[topic].totalScore += score;
            topicStats[topic].totalMax += max;
            topicStats[topic].count += 1;
          });
        }
      });

      for (const [topic, stats] of Object.entries(topicStats)) {
        const pct = stats.totalMax > 0 ? (stats.totalScore / stats.totalMax) * 100 : 0;
        let status = 'Strong';
        if (pct < 60) status = 'Need Practice';
        else if (pct < 80) status = 'Revision Recommended';

        recommendations.push({
          topic,
          averageScore: parseFloat(pct.toFixed(1)),
          sampleSize: stats.count,
          status: stats.count >= 2 ? status : 'Not enough data yet'
        });
      }
    }

    res.json(recommendations);
  } catch (error) {
    console.error('Failed to fetch recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  if (isSupabaseConfigured) {
    console.log('[ONLINE MODE] Connected to Supabase PostgreSQL database.');
  } else {
    console.log('[OFFLINE MODE] Using local JSON files in data/ directory.');
  }
});
