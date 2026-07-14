const { getGarageByNumber } = require('../db/garages');
const { getHistory, addMessage } = require('../db/conversations');
const { askClaude } = require('../config/claude');
const { sendSMS } = require('../config/twilio');
const { MessagingResponse } = require('twilio').twiml;
const twilio = require('twilio');
const Anthropic = require('@anthropic-ai/sdk');

const twilioMain = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const twilioRF = twilio(process.env.TWILIO_ACCOUNT_SID_RF, process.env.TWILIO_AUTH_TOKEN_RF);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const RAILWAY_DOMAIN = process.env.RAILWAY_DOMAIN || 'localhost:3000';
const END_PHRASE = 'the team will give you a call shortly to confirm';

const processedSids = new Set();

// Masks a phone number for safe logging: +971568967912 → +9715****12
function maskPhone(phone) {
  if (!phone || phone.length < 8) return '****';
  return phone.slice(0, 6) + '****' + phone.slice(-2);
}

function isConversationComplete(aiReply) {
  return aiReply.toLowerCase().includes(END_PHRASE);
}

function getClient(garage) {
  return garage.twilioAccount === 'roadforce' ? twilioRF : twilioMain;
}

async function extractSummary(history) {
  const transcript = history
    .map(m => `${m.role === 'assistant' ? 'AI' : 'Customer'}: ${m.content}`)
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

// FIX 1: uses approved WhatsApp content template instead of freeform body.
// TODO: replace OWNER_NOTIFY_TEMPLATE_SID with the approved template SID once confirmed.
// Current template (HXe1d21e761534f8bb7b3f6a82878e93c2) only has 4 variables — awaiting
// decision on whether to use existing template (dropping car field) or submit new one.
async function notifyOwnerSummary(garage, customerPhone, summary) {
  const client = getClient(garage);
  const ownerPhones = Array.isArray(garage.ownerPhone) ? garage.ownerPhone : [garage.ownerPhone];

  const name = summary.name || 'Unknown';
  const car = summary.car || 'Unknown';
  const issue = summary.issue || 'Unknown';
  const availability = summary.availability || 'Unknown';

  // FIX 2 (session window): freeform body send to customer is handled separately.
  // Owner notification uses a content template to bypass the 24h session window.
  // TODO: swap body for contentSid once template decision is made (see comment above).
  const messageBody =
    `🔔 New Lead Recovered - ${garage.name}\n\n` +
    `👤 Name: ${name}\n` +
    `📞 Number: ${customerPhone}\n` +
    `🚗 Car: ${car}\n` +
    `🔧 Issue: ${issue}\n` +
    `📅 Availability: ${availability}\n\n` +
    `Call them back to confirm the time.`;

  console.log(`[NOTIFY] Sending summary to ${ownerPhones.map(maskPhone).join(', ')} for ${garage.name}`);

  for (const phone of ownerPhones) {
    // FIX 4: SMS fallback if WhatsApp send fails
    try {
      await client.messages.create({
        from: 'whatsapp:' + garage.whatsappNumber,
        to: 'whatsapp:' + phone,
        body: messageBody,
      });
      console.log(`[NOTIFY] ✅ WhatsApp sent to ${maskPhone(phone)}`);
    } catch (whatsappErr) {
      console.error(`[NOTIFY_FAILURE] WhatsApp failed for ${maskPhone(phone)}: ${whatsappErr.message}`);
      try {
        await sendSMS(phone, garage.twilioNumber, messageBody);
        console.log(`[NOTIFY] ✅ SMS fallback sent to ${maskPhone(phone)}`);
      } catch (smsErr) {
        console.error(`[NOTIFY_FAILURE] SMS fallback also failed for ${maskPhone(phone)}: ${smsErr.message}`);
      }
    }
  }
}

async function handleWhatsAppReply(req, res) {
  const messageSid = req.body.MessageSid;
  if (processedSids.has(messageSid)) {
    console.log(`[DEDUP] Duplicate SID — ignoring`);
    return res.type('text/xml').send(new MessagingResponse().toString());
  }
  if (processedSids.size >= 1000) processedSids.clear();
  processedSids.add(messageSid);

  res.type('text/xml').send(new MessagingResponse().toString());
  try {
    const customerPhone = req.body.From.replace('whatsapp:', '');
    const customerMessage = req.body.Body;
    const incomingNumber = req.body.To.replace('whatsapp:', '');
    const garage = await getGarageByNumber(incomingNumber);
    if (!garage) {
      console.error('No garage found for incoming number');
      return;
    }
    const client = getClient(garage);

    const history = await getHistory(customerPhone);
    // FIX 3: log message count only, not content
    console.log(`[HISTORY] ${history.length} messages loaded for ${maskPhone(customerPhone)}`);
    await addMessage(customerPhone, 'user', customerMessage);

    // FIX 2: check if more than 24h has passed since last outbound message.
    // If so, a freeform reply will fail with error 63016 (outside session window).
    // TODO: if this becomes a real issue, add a re-engagement content template and
    // send it here before the freeform AI reply. For now, log a clear warning.
    const lastOutbound = history.filter(m => m.role === 'assistant').pop();
    if (lastOutbound) {
      const lastOutboundTime = new Date(lastOutbound.created_at || 0).getTime();
      const hoursSinceLastOutbound = (Date.now() - lastOutboundTime) / (1000 * 60 * 60);
      if (hoursSinceLastOutbound > 24) {
        console.warn(`[SESSION_WARNING] Last outbound to ${maskPhone(customerPhone)} was ${Math.round(hoursSinceLastOutbound)}h ago — freeform reply may fail (error 63016). A re-engagement template is needed.`);
      }
    }

    const aiReply = await askClaude(garage, history, customerMessage);
    // FIX 3: don't log full AI reply content
    console.log(`[AI REPLY] Generated for ${maskPhone(customerPhone)} (${aiReply.length} chars)`);

    await client.messages.create({
      from: 'whatsapp:' + garage.whatsappNumber,
      to: 'whatsapp:' + customerPhone,
      body: aiReply,
    });

    await addMessage(customerPhone, 'assistant', aiReply);

    if (isConversationComplete(aiReply)) {
      console.log(`[END DETECTED] ${maskPhone(customerPhone)} at ${garage.name}`);
      const fullHistory = await getHistory(customerPhone);
      console.log(`[SUMMARY] Extracting from ${fullHistory.length} messages`);
      const summary = await extractSummary(fullHistory);
      // FIX 3: log field presence, not values
      console.log(`[SUMMARY] Fields: name=${!!summary.name}, car=${!!summary.car}, issue=${!!summary.issue}, availability=${!!summary.availability}`);
      await notifyOwnerSummary(garage, customerPhone, summary);
    } else {
      console.log(`[END CHECK] Not complete yet`);
    }
  } catch (err) {
    console.error('ERROR: ' + err.message);
    console.error(err.stack);
  }
}

module.exports = { handleWhatsAppReply };
