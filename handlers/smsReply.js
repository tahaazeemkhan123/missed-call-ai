const { getGarageByNumber } = require('../db/garages');
const { getHistory, addMessage } = require('../db/conversations');
const { askClaude } = require('../config/claude');
const { MessagingResponse } = require('twilio').twiml;
const twilio = require('twilio');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const WHATSAPP_SANDBOX = 'whatsapp:+14155238886';

async function handleWhatsAppReply(req, res) {
  // Respond to Twilio immediately
  res.type('text/xml').send(new MessagingResponse().toString());

  try {
    const customerPhone   = req.body.From.replace('whatsapp:', '');
    const customerMessage = req.body.Body;
    const twilioNumber    = req.body.To.replace('whatsapp:', '');

    console.log(`💬 WhatsApp from ${customerPhone}: "${customerMessage}"`);

    const garage = await getGarageByNumber(twilioNumber);
    if (!garage) {
      console.error(`❌ No garage found for ${twilioNumber}`);
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
    console.log('✅ WhatsApp reply sent to', customerPhone);

  } catch (err) {
    console.error('❌ ERROR:', err.message);
    console.error('Stack:', err.stack);
  }
}

module.exports = { handleWhatsAppReply };
