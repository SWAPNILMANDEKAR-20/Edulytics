require('dotenv').config({ path: 'd:/PROJECT-IEEE/.env' });

async function inspect() {
  try {
    const url = process.env.SUPABASE_URL + '/rest/v1/?apikey=' + process.env.SUPABASE_SERVICE_ROLE_KEY;
    const res = await fetch(url);
    if (!res.ok) {
      console.error('Failed to fetch OpenAPI schema:', res.status, res.statusText);
      return;
    }
    const schema = await res.json();
    const examsDef = schema.definitions.exams;
    console.log('exams definition properties:', examsDef ? examsDef.properties.template_id : 'Not found');
    
    const omrDef = schema.definitions.omr_templates;
    console.log('omr_templates definition properties:', omrDef ? omrDef.properties.template_id : 'Not found');
  } catch (e) {
    console.error(e);
  }
}

inspect();
