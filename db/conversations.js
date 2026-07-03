const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
console.log('[SUPABASE INIT] URL:', SUPABASE_URL || 'MISSING');
console.log('[SUPABASE INIT] KEY:', SUPABASE_KEY ? SUPABASE_KEY.substring(0, 20) + '...' : 'MISSING');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  realtime: { transport: ws }
});

async function getHistory(customerPhone) {
  const { data, error } = await supabase
    .from('conversations')
    .select('role, message')
    .eq('customer_phone', customerPhone)
    .order('created_at', { ascending: true })
    .limit(20);
  if (error) {
    console.error('Error fetching history:', error.message);
    return [];
  }
  return data.map(row => ({ role: row.role, content: row.message }));
}

async function addMessage(customerPhone, role, message) {
  const { error } = await supabase
    .from('conversations')
    .insert({ customer_phone: customerPhone, role, message });
  if (error) {
    console.error('Error saving message:', error.message);
  }
}

module.exports = { getHistory, addMessage };
