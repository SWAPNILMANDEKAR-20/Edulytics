const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'd:/PROJECT-IEEE/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const dummyExam = {
    subject_id: '330ddfd6-f5a8-4bc5-8694-78e402a3d509', // CS-301 subject UUID
    title: 'Diag OMR Test',
    evaluation_type: 'omr',
    total_questions: 15,
    is_answer_key_confirmed: false
  };

  console.log('--- Test 1: template_id = "OMR-101" ---');
  const { data: d1, error: e1 } = await supabase
    .from('exams')
    .insert({ ...dummyExam, template_id: 'OMR-101' });
  console.log('Test 1 result:', d1, 'Error:', e1 ? e1.message : 'None');

  console.log('--- Test 2: template_id = "00000000-0000-0000-0000-000000000000" ---');
  const { data: d2, error: e2 } = await supabase
    .from('exams')
    .insert({ ...dummyExam, template_id: '00000000-0000-0000-0000-000000000000' });
  console.log('Test 2 result:', d2, 'Error:', e2 ? e2.message : 'None');
}

test();
