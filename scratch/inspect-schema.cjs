const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'd:/PROJECT-IEEE/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  try {
    // Check if there is an omr_templates table, and print its rows
    const { data: templRows, error: templErr } = await supabase.from('omr_templates').select('*');
    console.log('OMR templates rows:', templRows);
    if (templErr) console.error('OMR templates select error:', templErr);
    
    // Check one exam row
    const { data: examRows, error: examErr } = await supabase.from('exams').select('*').limit(1);
    console.log('Exam columns:', examRows ? Object.keys(examRows[0] || {}) : 'No rows');
    if (examErr) console.error('Exam select error:', examErr);
  } catch (e) {
    console.error(e);
  }
}

inspect();
