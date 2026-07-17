const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing credentials in .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('--- Checking Supabase Database Tables ---');
  
  try {
    const { data: users, error: uErr } = await supabase.from('users').select('*');
    console.log(`Users count: ${uErr ? 'Error: ' + uErr.message : users.length}`);
    if (users && users.length > 0) {
      console.log('Users (first 3):', users.slice(0, 3).map(u => ({ id: u.id, email: u.email, role: u.role })));
    }

    const { data: subjects, error: sErr } = await supabase.from('subjects').select('*');
    console.log(`Subjects count: ${sErr ? 'Error: ' + sErr.message : subjects.length}`);
    if (subjects && subjects.length > 0) {
      console.log('Subjects:', subjects.map(s => ({ id: s.id, code: s.code, name: s.name })));
    }

    const { data: questions, error: qErr } = await supabase.from('questions').select('*');
    console.log(`Questions count: ${qErr ? 'Error: ' + qErr.message : (questions ? questions.length : 0)}`);

    const { data: submissions, error: subErr } = await supabase.from('submissions').select('*');
    console.log(`Submissions count: ${subErr ? 'Error: ' + subErr.message : (submissions ? submissions.length : 0)}`);
    if (submissions && submissions.length > 0) {
      console.log('Submissions (first 3):', submissions.slice(0, 3).map(s => ({ id: s.id, subject_id: s.subject_id, status: s.status })));
    }
  } catch (err) {
    console.error(err);
  }
}

check();
