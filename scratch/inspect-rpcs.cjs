require('dotenv').config({ path: 'd:/PROJECT-IEEE/.env' });

async function inspect() {
  try {
    const url = process.env.SUPABASE_URL + '/rest/v1/?apikey=' + process.env.SUPABASE_SERVICE_ROLE_KEY;
    const res = await fetch(url);
    const schema = await res.json();
    const paths = Object.keys(schema.paths || {});
    const rpcs = paths.filter(p => p.startsWith('/rpc/'));
    console.log('Available RPC paths:', rpcs);
  } catch (e) {
    console.error(e);
  }
}

inspect();
