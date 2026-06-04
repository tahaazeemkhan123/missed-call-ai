const { getGarageByNumber } = require('../db/garages');
const {
  getHistory,
  addMessage,
  getActiveConversationId,
  markEnded,
  saveSummary,
  getAllMessages,
} = require('../db/conversations');
const { askClaude } = require('../config/claude');
const { MessagingResponse } = require('twilio').twiml;
const twilio = require('twilio');
const Anthropic = require('@anthropic-ai/sdk');

const twilioMain = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const twilioRF = twilio(process.env.TWILIO_ACCOUNT_SID_RF, process.env.TWILIO_AUTH_TOKEN_RF);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const RAILWAY_DOMAIN = process.env.RAILWAY_DOMAIN || 'localhost:3000';

// Any of these phrases in the AI reply = conversation complete
const END_PHRASES = [
  'give you a call shortly to confirm',
  'call you shortly to confirm',
  'call you back to confirm',
  'give you a call to confirm',
  'team will call you',
  'team will give you a call',
  'someone will call you',
  'we will call you',
  "we'll call you",
  'will be in touch',
];

function isConversationComplete(aiReply) {
  const lower = aiReply.toLowerCase();
  return END_PHRASES.some(phrase => lower.includes(phrase));
}

function getClient(garage) {
  return garage.twilioAccount === 'roadforce' ? twilioRF : twilioMain;
}

async function extractSummary(messages) {
  const transcript = messages
    .map(m => `${m.role === 'ai' ? 'AI' : 'Customer'}: ${m.content}`)
    .join('\n');

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 400,
    system: `You are a data extraction assistant. Given a conversation between an AI agent and a car repair customer, extract the following fields and return ONLY a valid JSON object with no explanation, no markdown, no backticks:
{
  "name": "customer's name or null if not provided",
  "car": "make, model and year as a single string, or null if not provided",
  "issue": "what the customer described as the problem, in their words",
  "availability": "when the customer said they can come in, or null if not provided"
}`,
    messages: [{ role: 'user', content: transcript }],
  });

  return JSON.parse(response.content[0].text);
}

async function notifyOwnerSummary(garage, customerPhone, summary, conversationId) {
  const client = getClient(garage);
  const ownerPhones = Array.isArray(garage.ownerPhone) ? garage.ownerPhone : [garage.ownerPhone];

  const name = summary.name || 'Unknown';
  const car = summary.car || 'Unknown';
  const issue = summary.issue || 'Unknown';
  const availability = summary.availability || 'Unknown';
  const link = `https://${RAILWAY_DOMAIN}/conversation/${conversationId}`;

  const body =
    `🔔 New Lead Recovered - ${garage.name}\n\n` +
    `👤 Name: ${name}\n` +
    `📞 Number: ${customerPhone}\n` +
    `🚗 Car: ${car}\n` +
    `🔧 Issue: ${issue}\n` +
    `📅 Availability: ${availability}\n\n` +
    `🔗 Full conversation: ${link}\n\n` +
    `Call them back to confirm the time.`;

  console.log(`[NOTIFY] Sending summary to owner(s): ${ownerPhones.join(', ')}`);

  for (const phone of ownerPhones) {
    try {
      await client.messages.create({
        from: 'whatsapp:' + garage.whatsappNumber,
        to: 'whatsapp:' + phone,
        body,
      });
      console.log(`[NOTIFY] ✅ Sent to ${phone}`);
    } catch (err) {
      console.error(`[NOTIFY] ❌ Failed to send to ${phone}: ${err.message}`);
    }
  }
}

async function handleWhatsAppReply(req, res) {
  res.type('text/xml').send(new MessagingResponse().toString());
  try {
    const customerPhone = req.body.From.replace('whatsapp:', '');
    const customerMessage = req.body.Body;
    const incomingNumber = req.body.To.replace('whatsapp:', '');
    const garage = await getGarageByNumber(incomingNumber);
    if (!garage) {
      console.error('No garage found');
      return;
    }
    const client = getClient(garage);

    const history = await getHistory(customerPhone, garage.id);
    await addMessage(customerPhone, 'user', customerMessage, garage.id);

    const aiReply = await askClaude(garage, history, customerMessage);
    console.log(`[AI REPLY] ${aiReply}`);

    await client.messages.create({
      from: 'whatsapp:' + garage.whatsappNumber,
      to: 'whatsapp:' + customerPhone,
      body: aiReply,
    });

    await addMessage(customerPhone, 'assistant', aiReply, garage.id);

    if (isConversationComplete(aiReply)) {
      console.log(`[END DETECTED] Conversation ending for ${customerPhone} at ${garage.name}`);
      const convId = await getActiveConversationId(customerPhone, garage.id);
      await markEnded(convId);

      console.log(`[SUMMARY] Extracting summary for conversation ${convId}`);
      const messages = await getAllMessages(convId);
      const summary = await extractSummary(messages);
      console.log(`[SUMMARY] Extracted: ${JSON.stringify(summary)}`);
      await saveSummary(convId, summary);

      await notifyOwnerSummary(garage, customerPhone, summary, convId);
    } else {
      console.log(`[END CHECK] Not complete yet — no end phrase matched`);
    }
  } catch (err) {
    console.error('ERROR: ' + err.message);
    console.error(err.stack);
  }
}

module.exports = { handleWhatsAppReply };
