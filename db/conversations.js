const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

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
