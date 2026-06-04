const supabase = require('./supabase');

async function getOrCreateConversation(customerPhone, garageId) {
  const { data, error } = await supabase
    .from('conversations')
    .select('id')
    .eq('customer_number', customerPhone)
    .eq('garage_id', garageId)
    .eq('ended', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;

  if (data) return data.id;

  const { data: created, error: createError } = await supabase
    .from('conversations')
    .insert({ garage_id: garageId, customer_number: customerPhone })
    .select('id')
    .single();

  if (createError) throw createError;
  return created.id;
}

// Returns messages in Claude's expected format: [{ role, content }]
async function getHistory(customerPhone, garageId) {
  const convId = await getOrCreateConversation(customerPhone, garageId);

  const { data, error } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', convId)
    .order('timestamp', { ascending: true });

  if (error) throw error;

  // Claude expects 'user'/'assistant' — map our stored 'ai' back to 'assistant'
  return (data || []).map(m => ({
    role: m.role === 'ai' ? 'assistant' : m.role,
    content: m.content,
  }));
}

async function addMessage(customerPhone, role, content, garageId) {
  const convId = await getOrCreateConversation(customerPhone, garageId);

  // Normalise: Claude uses 'assistant', we store 'ai'
  const storedRole = role === 'assistant' ? 'ai' : role;

  const { error } = await supabase
    .from('messages')
    .insert({ conversation_id: convId, role: storedRole, content });

  if (error) throw error;
}

async function getActiveConversationId(customerPhone, garageId) {
  return getOrCreateConversation(customerPhone, garageId);
}

async function markEnded(conversationId) {
  const { error } = await supabase
    .from('conversations')
    .update({ ended: true })
    .eq('id', conversationId);

  if (error) throw error;
}

async function saveSummary(conversationId, summary) {
  const { error } = await supabase
    .from('conversations')
    .update({ summary })
    .eq('id', conversationId);

  if (error) throw error;
}

async function getAllMessages(conversationId) {
  const { data, error } = await supabase
    .from('messages')
    .select('role, content, timestamp')
    .eq('conversation_id', conversationId)
    .order('timestamp', { ascending: true });

  if (error) throw error;
  return data || [];
}

module.exports = {
  getHistory,
  addMessage,
  getActiveConversationId,
  markEnded,
  saveSummary,
  getAllMessages,
};
