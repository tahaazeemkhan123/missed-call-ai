const { getGarageByNumber } = require('../db/garages');
const { getHistory, addMessage } = require('../db/conversations');
const { askClaude } = require('../config/claude');
const { MessagingResponse } = require('twilio').twiml;
const twilio = require('twilio');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const WHATSAPP_SANDBOX = 'whatsapp:+15559565809';

async function notifyOwner(garage, customerPhone, customerMessage, aiReply) {
  const notification =
`🔔 MISSED CALL RECOVERED - ${garage.name}
Customer: ${customerPhone}
They said: "${customerMessage}"
AI replied: "${aiReply}"
─────────────────
Call them back if needed.`;

  try {
    await client.messages.create({
      from: WHATSAPP_SANDBOX,
      to: `whatsapp:${garage.ownerPhone}`,
      body: notification,
    });
  } catch (err) {
    console.error('⚠️ Owner notify failed:', err.message);
  }
}

async function handleWhatsAppReply(req, res) {
  res.type('text/xml').send(new MessagingResponse().toString());

  try {
    const customerPhone   = req.body.From.replace('whatsapp:', '');
    const customerMessage = req.body.Body;

    console.log(`💬 WhatsApp from ${customerPhone}: "${customerMessage}"`);

    const garage = await getGarageByNumber('+12497010798');
    if (!garage) {
      console.error('❌ No garage found');
      return;
    }

    const history = await getHistory(customerPhone);
    await addMessage(customerPhone, 'user', customerMessage);

    const aiReply = await askClaude(garage, history, customerMessage);
    console.log('🤖 AI reply:', aiReply);

    await client.messages.create({
      from: WHATSAPP_SANDBOX,
      to: `whatsapp:${customerPhone}`,
      body: aiReply,
    });

    await addMessage(customerPhone, 'assistant', aiReply);
    await notifyOwner(garage, customerPhone, customerMessage, aiReply);

    console.log('✅ Replied to', customerPhone);

  } catch (err) {
    console.error('❌ ERROR:', err.message);
  }
}

module.exports = { handleWhatsAppReply };
