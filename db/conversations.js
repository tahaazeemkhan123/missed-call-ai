// db/conversations.js — Remembers each customer's SMS thread so Claude has context

const conversations = {};

function getHistory(customerPhone) {
  return conversations[customerPhone] || [];
}

function addMessage(customerPhone, role, content) {
  if (!conversations[customerPhone]) conversations[customerPhone] = [];
  conversations[customerPhone].push({ role, content });
  // Keep last 20 messages to avoid hitting token limits
  if (conversations[customerPhone].length > 20) {
    conversations[customerPhone] = conversations[customerPhone].slice(-20);
  }
}

module.exports = { getHistory, addMessage };
