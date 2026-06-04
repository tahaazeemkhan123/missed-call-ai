const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

let _client = null;

function getSupabase() {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_KEY env vars must be set');
  }
  _client = createClient(url, key, {
    realtime: { transport: ws },
  });
  return _client;
}

module.exports = new Proxy({}, {
  get(_target, prop) {
    return getSupabase()[prop];
  },
});
