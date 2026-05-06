const { getGarageByNumber } = require('../db/garages');
const { addMessage } = require('../db/conversations');
const { VoiceResponse } = require('twilio').twiml;
const twilio = require('twilio');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const WHATSAPP_SANDBOX = 'whatsapp:+14155238886';

async function handleMissedCall(req, res) {
  // Respond to Twilio immediately
  res.type('text/xml').send(new VoiceResponse().toString());

  try {
    const callerPhone  = req.body.From;
    const twilioNumber = req.body.To;

    console.log(`📞 Missed call from ${callerPhone}`);

    const garage = await getGarageByNumber(twilioNumber);
    if (!garage) {
      console.error(`❌ No garage found for ${twilioNumber}`);
      return;
    }
    console.log('✅ Garage found:', garage.name);

    const firstMessage = `Hi! Sorry we missed your call at ${garage.name} 👋 What does your car need? Reply here and we'll sort you out right away.`;

    // Send via WhatsApp instead of SMS
    await client.messages.create({
      from: WHATSAPP_SANDBOX,
      to: `whatsapp:${callerPhone}`,
      body: firstMessage,
    });

    console.log('✅ WhatsApp message sent to', callerPhone);
    await addMessage(callerPhone, 'assistant', firstMessage);

  } catch (err) {
    console.error('❌ ERROR:', err.message);
    console.error('Stack:', err.stack);
  }
}

module.exports = { handleMissedCall };
