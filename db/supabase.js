const { createClient } = require('@supabase/supabase-js');

let _client = null;

function getSupabase() {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_KEY env vars must be set');
  }
  _client = createClient(url, key);
  return _client;
}

// Proxy so existing code can keep calling supabase.from(...) etc.
module.exports = new Proxy({}, {
  get(_target, prop) {
    return getSupabase()[prop];
  },
});
