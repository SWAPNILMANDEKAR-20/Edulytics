const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'd:/PROJECT-IEEE/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
  try {
    const { data: templRows, error: templErr } = await supabase.from('omr_templates').select('*');
    if (templErr) {
      console.error('Error fetching templates:', templErr);
      return;
    }
    console.log('Template Rows Count:', templRows.length);
    if (templRows.length > 0) {
      console.log('Row keys:', Object.keys(templRows[0]));
      console.log('Sample Row:', templRows[0]);
    }
  } catch (e) {
    console.error(e);
  }
}

inspect();
