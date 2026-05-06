const { getGarageByNumber } = require('../db/garages');
const { getHistory, addMessage } = require('../db/conversations');
const { askClaude } = require('../config/claude');
const axios = require('axios');

async function sendWhatsAppMessage(to, message) {
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;

  await axios.post(
    `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
    {
      messaging_product: 'whatsapp',
      to: to.replace('+', ''),
      type: 'text',
      text: { body: message }
    },
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
}

async function notifyOwner(garage, customerPhone, customerMessage, aiReply) {
  const notification =
`🔔 MISSED CALL RECOVERED - ${garage.name}
Customer: ${customerPhone}
They said: "${customerMessage}"
AI replied: "${aiReply}"
─────────────────
Call them back if needed.`;

  try {
    await sendWhatsAppMessage(garage.ownerPhone, notification);
  } catch (err) {
    console.error('⚠️ Owner notify failed:', err.message);
  }
}

async function handleWhatsAppReply(req, res) {
  res.sendStatus(200);

  try {
    // Meta sends data in a different format than Twilio
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];

    if (!message) {
      console.log('No message in payload, skipping');
      return;
    }

    const customerPhone = '+' + message.from;
    const customerMessage = message.text?.body;

    if (!customerMessage) return;

    console.log(`💬 WhatsApp from ${customerPhone}: "${customerMessage}"`);

    // For now use Dyno Star — will be dynamic when scaling
    const garage = await getGarageByNumber('+12497010798');
    if (!garage) {
      console.error('❌ No garage found');
      return;
    }

    const history = await getHistory(customerPhone);
    await addMessage(customerPhone, 'user', customerMessage);

    const aiReply = await askClaude(garage, history, customerMessage);
    console.log('🤖 AI reply:', aiReply);

    await sendWhatsAppMessage(customerPhone, aiReply);
    await addMessage(customerPhone, 'assistant', aiReply);
    await notifyOwner(garage, customerPhone, customerMessage, aiReply);

    console.log('✅ Replied to', customerPhone);

  } catch (err) {
    console.error('❌ ERROR:', err.message);
    if (err.response) console.error('Meta API error:', err.response.data);
  }
}

module.exports = { handleWhatsAppReply };
