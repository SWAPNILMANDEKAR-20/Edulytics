const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('YOUR_SUPABASE') || supabaseKey.includes('YOUR_SUPABASE')) {
  console.error('Error: Please configure valid SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file before running migration.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const DATA_DIR = path.join(__dirname, '..', 'data');

async function runMigration() {
  console.log('Starting migration from JSON files to Supabase PostgreSQL...');

  try {
    // 1. Fetch existing Auth Users to prevent duplicates
    console.log('\nFetching existing auth users...');
    const { data: { users: authUsers }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    const emailToAuthUser = {};
    authUsers.forEach(u => {
      emailToAuthUser[u.email.toLowerCase()] = u;
    });

    // 2. Migrate Users (Students & Professors)
    console.log('\nMigrating users to Supabase Auth...');
    const usersFile = path.join(DATA_DIR, 'users.json');
    const usersData = fs.existsSync(usersFile) ? JSON.parse(fs.readFileSync(usersFile, 'utf8')) : [];

    const userEmailToId = {};
    const userNameToId = {};
    const studentIdsList = [];

    for (const u of usersData) {
      const email = u.email.toLowerCase();
      console.log(`Processing user: ${email} (${u.role})`);
      
      let userId;
      const existingAuth = emailToAuthUser[email];

      if (existingAuth) {
        userId = existingAuth.id;
        console.log(`User already exists in Supabase Auth with ID: ${userId}`);
      } else {
        // Create user in Supabase Auth
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: email,
          password: u.password || 'Password123!',
          email_confirm: true,
          user_metadata: {
            name: u.fullName || email,
            role: u.role
          }
        });

        if (createError) {
          throw new Error(`Failed to create Auth user ${email}: ${createError.message}`);
        }
        userId = newUser.user.id;
        console.log(`Created Auth user. Generated ID: ${userId}`);
      }

      // Upsert public.users profile directly to guarantee sync
      const { error: profileError } = await supabase
        .from('users')
        .upsert({
          id: userId,
          email: email,
          role: u.role,
          name: u.fullName || email,
          department: u.department || null,
          faculty_id: u.facultyId || null,
          college: u.college || null,
          roll_number: u.rollNumber || null,
          semester: u.semester || null
        });

      if (profileError) {
        throw new Error(`Failed to upsert public profile for ${email}: ${profileError.message}`);
      }

      userEmailToId[email] = userId;
      userNameToId[(u.fullName || '').toLowerCase()] = userId;
      
      if (u.role === 'student') {
        studentIdsList.push(userId);
      }
    }

    // Helper to resolve student ID
    const resolveStudentId = (name) => {
      if (name && userNameToId[name.toLowerCase()]) {
        return userNameToId[name.toLowerCase()];
      }
      // Fallback
      return studentIdsList[0] || null;
    };

    // 3. Migrate Subjects (Courses) & Create default Exams
    console.log('\nMigrating subjects and creating default exams...');
    const subjectsFile = path.join(DATA_DIR, 'subjects.json');
    const subjectsData = fs.existsSync(subjectsFile) ? JSON.parse(fs.readFileSync(subjectsFile, 'utf8')) : [];

    const subjectCodeToUuid = {};
    const subjectToExamUuid = {};
    const subjectQuestions = {}; // Cache questions for answers migration

    // Subject to Professor Email mappings for ownership backfilling
    const SUBJECT_TO_PROF_EMAIL = {
      'CS-301': 'sidrajahangir93@gmail.com',  // Sidra
      'PHY-102': 'nupurlade01@gmail.com',     // Nupur Lade
      'BIO-205': 'e.vance@aegiseval.com'       // Dr. Evelyn Vance
    };

    for (const sub of subjectsData) {
      console.log(`Processing subject: ${sub.id} - ${sub.name}`);
      
      const profEmail = SUBJECT_TO_PROF_EMAIL[sub.id];
      if (!profEmail) {
        throw new Error(`[CRITICAL ERROR] No professor mapping exists for subject ID: ${sub.id}`);
      }
      
      const profUuid = userEmailToId[profEmail.toLowerCase()];
      if (!profUuid) {
        throw new Error(`[CRITICAL ERROR] Mapped professor ${profEmail} not found in user database for subject ID: ${sub.id}`);
      }

      // Check if subject code already exists
      const { data: existingSub } = await supabase
        .from('subjects')
        .select('id')
        .eq('code', sub.id)
        .maybeSingle();

      let subjectUuid;
      if (existingSub) {
        subjectUuid = existingSub.id;
        console.log(`  Subject already exists with UUID: ${subjectUuid}. Updating professor_id...`);
        const { error: updateError } = await supabase
          .from('subjects')
          .update({ professor_id: profUuid })
          .eq('id', subjectUuid);
        if (updateError) {
          throw new Error(`Failed to update professor_id for subject ${sub.id}: ${updateError.message}`);
        }
      } else {
        const { data: newSub, error: subError } = await supabase
          .from('subjects')
          .insert({ 
            code: sub.id, 
            name: sub.name,
            professor_id: profUuid
          })
          .select('id')
          .single();

        if (subError) {
          throw new Error(`Failed to insert subject ${sub.id}: ${subError.message}`);
        }
        subjectUuid = newSub.id;
        console.log(`  Inserted subject. Generated UUID: ${subjectUuid}`);
      }

      subjectCodeToUuid[sub.id] = subjectUuid;
      subjectQuestions[sub.id] = sub.questions || [];

      // Migrate questions & rubric items for this subject
      if (sub.questions && Array.isArray(sub.questions)) {
        for (const q of sub.questions) {
          const { data: existingQ } = await supabase
            .from('questions')
            .select('id')
            .eq('subject_id', subjectUuid)
            .eq('question_code', q.id)
            .maybeSingle();

          let questionUuid;
          if (existingQ) {
            questionUuid = existingQ.id;
            console.log(`    Question ${q.id} already exists with UUID: ${questionUuid}`);
          } else {
            const { data: newQ, error: qError } = await supabase
              .from('questions')
              .insert({
                subject_id: subjectUuid,
                question_code: q.id,
                text: q.text,
                max_marks: q.maxMarks || 10,
                model_answer: q.modelAnswer
              })
              .select('id')
              .single();

            if (qError) {
              throw new Error(`Failed to insert question ${q.id}: ${qError.message}`);
            }
            questionUuid = newQ.id;
            console.log(`    Inserted question. Generated UUID: ${questionUuid}`);
          }

          // Migrate rubric items
          if (q.rubric && Array.isArray(q.rubric)) {
            // Delete old ones first to prevent duplicates
            await supabase.from('rubric_items').delete().eq('question_id', questionUuid);
            
            for (const rub of q.rubric) {
              const { error: rubError } = await supabase
                .from('rubric_items')
                .insert({
                  question_id: questionUuid,
                  keyword: rub.keyword,
                  description: rub.description,
                  weight: rub.weight || 0
                });
              if (rubError) {
                console.warn(`    Warning: Failed to insert rubric item ${rub.keyword}: ${rubError.message}`);
              }
            }
          }
        }
      }

      // Create a default exam for this subject
      const { data: existingExam } = await supabase
        .from('exams')
        .select('id')
        .eq('subject_id', subjectUuid)
        .eq('title', 'Midterm Examination')
        .maybeSingle();

      let examUuid;
      if (existingExam) {
        examUuid = existingExam.id;
        console.log(`  Default exam already exists with UUID: ${examUuid}`);
      } else {
        const { data: newExam, error: examError } = await supabase
          .from('exams')
          .insert({
            subject_id: subjectUuid,
            title: 'Midterm Examination'
          })
          .select('id')
          .single();

        if (examError) {
          throw new Error(`Failed to create default exam for subject ${sub.id}: ${examError.message}`);
        }
        examUuid = newExam.id;
        console.log(`  Created default exam. Generated UUID: ${examUuid}`);
      }

      subjectToExamUuid[subjectUuid] = examUuid;

      // Enroll all students in this subject to make it visible
      console.log(`  Enrolling all students in subject ${sub.id}...`);
      for (const studentUuid of studentIdsList) {
        await supabase
          .from('student_subjects')
          .upsert({
            student_id: studentUuid,
            subject_id: subjectUuid
          }, { onConflict: 'student_id,subject_id' });
      }
    }

    // 4. Migrate Essay Submissions & Evaluations
    console.log('\nMigrating essay submissions and evaluations...');
    const papersFile = path.join(DATA_DIR, 'papers.json');
    const papersData = fs.existsSync(papersFile) ? JSON.parse(fs.readFileSync(papersFile, 'utf8')) : [];

    for (const paper of papersData) {
      console.log(`Processing paper: ${paper.id}`);
      
      const resolvedStudentUuid = resolveStudentId(paper.studentName);
      if (!resolvedStudentUuid) {
        console.warn(`  Warning: Could not resolve student ID for ${paper.studentName}. Skipping paper.`);
        continue;
      }

      const subjectUuid = subjectCodeToUuid[paper.subjectId];
      if (!subjectUuid) {
        console.warn(`  Warning: Could not resolve subject UUID for ${paper.subjectId}. Skipping.`);
        continue;
      }

      const examUuid = subjectToExamUuid[subjectUuid];
      const isGraded = paper.status === 'graded' || paper.status === 'evaluated';
      const submissionStatus = isGraded ? 'released' : 'pending';

      // Check if submission exists
      const { data: existingSub } = await supabase
        .from('submissions')
        .select('id')
        .eq('student_id', resolvedStudentUuid)
        .eq('subject_id', subjectUuid)
        .eq('exam_id', examUuid)
        .maybeSingle();

      let submissionUuid;
      if (existingSub) {
        submissionUuid = existingSub.id;
        console.log(`  Submission already exists with UUID: ${submissionUuid}`);
      } else {
        const { data: newSub, error: subError } = await supabase
          .from('submissions')
          .insert({
            student_id: resolvedStudentUuid,
            subject_id: subjectUuid,
            exam_id: examUuid,
            file_url: paper.imagePath || '/uploads/default-script.jpg',
            file_type: (paper.imagePath && paper.imagePath.endsWith('.pdf')) ? 'pdf' : 'image',
            status: submissionStatus,
            submitted_at: paper.submissionDate ? new Date(paper.submissionDate) : new Date(),
            evaluated_at: isGraded ? new Date() : null
          })
          .select('id')
          .single();

        if (subError) {
          throw new Error(`Failed to insert submission for student ${paper.studentName}: ${subError.message}`);
        }
        submissionUuid = newSub.id;
        console.log(`  Inserted submission. Generated UUID: ${submissionUuid}`);
      }

      // If evaluated, migrate the evaluation details
      if (isGraded && paper.answers && Array.isArray(paper.answers)) {
        const profEmail = SUBJECT_TO_PROF_EMAIL[paper.subjectId];
        const profUuid = userEmailToId[profEmail.toLowerCase()];

        // Check if evaluation exists
        const { data: existingEval } = await supabase
          .from('evaluations')
          .select('id')
          .eq('submission_id', submissionUuid)
          .maybeSingle();

        let evalUuid;
        if (existingEval) {
          evalUuid = existingEval.id;
          console.log(`    Evaluation already exists with UUID: ${evalUuid}`);
        } else {
          const { data: newEval, error: evalError } = await supabase
            .from('evaluations')
            .insert({
              submission_id: submissionUuid,
              professor_id: profUuid,
              total_marks: paper.maxMarks || 10,
              obtained_marks: paper.totalScore || 0,
              overall_feedback: paper.evaluatorNotes || 'Evaluated successfully.',
              released_at: new Date()
            })
            .select('id')
            .single();

          if (evalError) {
            throw new Error(`Failed to insert evaluation for submission ${submissionUuid}: ${evalError.message}`);
          }
          evalUuid = newEval.id;
          console.log(`    Created evaluation. Generated UUID: ${evalUuid}`);
        }

        // Migrate answers into question_evaluations
        const questionsList = subjectQuestions[paper.subjectId] || [];

        for (const ans of paper.answers) {
          const qObj = questionsList.find(q => q.id === ans.questionId) || { text: 'Question text', modelAnswer: 'Reference Answer' };
          const qNo = parseInt(ans.questionId.replace(/\D/g, '')) || 1;

          // Check if question evaluation exists
          const { data: existingQEval } = await supabase
            .from('question_evaluations')
            .select('id')
            .eq('evaluation_id', evalUuid)
            .eq('question_no', qNo)
            .maybeSingle();

          if (!existingQEval) {
            const { error: qEvalError } = await supabase
              .from('question_evaluations')
              .insert({
                evaluation_id: evalUuid,
                question_no: qNo,
                student_answer: ans.studentAnswer,
                reference_answer: qObj.modelAnswer || 'Model answer not configured.',
                ai_marks: ans.score || 0.0,
                professor_marks: ans.score || 0.0,
                feedback: ans.aiFeedback || '',
                confidence: ans.ocrConfidence || 90.0
              });

            if (qEvalError) {
              throw new Error(`Failed to insert question evaluation for submission ${submissionUuid}, Q${qNo}: ${qEvalError.message}`);
            }
          }
        }
      }
    }

    // 5. Migrate OMR Templates
    console.log('\nMigrating OMR templates...');
    const omrTemplatesFile = path.join(DATA_DIR, 'omr_templates.json');
    const omrTemplatesData = fs.existsSync(omrTemplatesFile) ? JSON.parse(fs.readFileSync(omrTemplatesFile, 'utf8')) : [];

    for (const tmpl of omrTemplatesData) {
      console.log(`Processing OMR template: ${tmpl.templateId}`);
      const { error: tmplError } = await supabase
        .from('omr_templates')
        .upsert({
          template_id: tmpl.templateId,
          title: tmpl.title,
          question_count: tmpl.questionCount,
          marks_per_question: tmpl.marksPerQuestion,
          negative_marks_per_question: tmpl.negativeMarksPerQuestion,
          answer_key: tmpl.answerKey
        });

      if (tmplError) {
        throw new Error(`Failed to upsert OMR template ${tmpl.templateId}: ${tmplError.message}`);
      }
    }

    // 6. Migrate OMR Papers
    console.log('\nMigrating OMR papers...');
    const omrPapersFile = path.join(DATA_DIR, 'omr_papers.json');
    const omrPapersData = fs.existsSync(omrPapersFile) ? JSON.parse(fs.readFileSync(omrPapersFile, 'utf8')) : [];

    for (const paper of omrPapersData) {
      console.log(`Processing OMR paper: ${paper.id}`);
      const resolvedStudentUuid = resolveStudentId(paper.studentName);

      const { error: omrError } = await supabase
        .from('omr_papers')
        .upsert({
          id: paper.id,
          student_id: resolvedStudentUuid,
          student_name: paper.studentName,
          student_id_code: paper.studentId,
          template_id: paper.templateId,
          status: paper.status,
          submission_date: paper.submissionDate,
          image_path: paper.imagePath || null,
          selected_answers: paper.selectedAnswers || {},
          evaluation: paper.evaluation || null,
          evaluator_notes: paper.evaluatorNotes || '',
          is_published: true
        });

      if (omrError) {
        throw new Error(`Failed to upsert OMR paper ${paper.id}: ${omrError.message}`);
      }
    }

    console.log('\nMigration completed successfully without data loss!');
  } catch (err) {
    console.error('\nMigration failed with error:', err);
    process.exit(1);
  }
}

runMigration();
