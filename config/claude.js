// config/claude.js — Sends conversation to Claude and gets a reply
require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function askClaude(garage, history, newMessage) {
  const systemPrompt = `
You are a friendly assistant for ${garage.name}, an auto repair shop in ${garage.city}.

RULES:
- This is SMS — keep replies SHORT (2-3 sentences max)
- Never use bullet points or long lists
- Be warm and human, not robotic
- Never make up prices — say "the team will confirm pricing when they call"
- If someone is angry, be extra empathetic first

YOUR GOAL (in order):
1. Apologise for the missed call
2. Find out what car issue or service they need
3. Book an appointment: ${garage.bookingLink}
4. If they won't book online, take their name and say the team will call back shortly

BUSINESS DETAILS:
- Hours: ${garage.hours}
- Services: ${garage.services}
- If asked about something not offered, say so politely

LANGUAGE: Reply in ${garage.language}. If customer writes in Arabic, reply in Arabic.
`.trim();

  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 200,
    system: systemPrompt,
    messages: [...history, { role: 'user', content: newMessage }],
  });

  return response.content[0].text;
}

module.exports = { askClaude };
