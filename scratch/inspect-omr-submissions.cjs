require('dotenv').config({ path: 'd:/PROJECT-IEEE/.env' });

async function inspect() {
  try {
    const url = process.env.SUPABASE_URL + '/rest/v1/?apikey=' + process.env.SUPABASE_SERVICE_ROLE_KEY;
    const res = await fetch(url);
    const schema = await res.json();
    const omrSubDef = schema.definitions.omr_submissions;
    console.log('omr_submissions definition properties:', omrSubDef ? omrSubDef.properties.template_id : 'Not found');
  } catch (e) {
    console.error(e);
  }
}

inspect();
