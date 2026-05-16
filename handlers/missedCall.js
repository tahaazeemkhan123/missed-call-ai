const { getGarageByNumber } = require('../db/garages');
const { addMessage } = require('../db/conversations');
const { VoiceResponse } = require('twilio').twiml;
const twilio = require('twilio');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const WHATSAPP_SANDBOX = 'whatsapp:+14155238886';

async function handleMissedCall(req, res) {
  res.type('text/xml').send(new VoiceResponse().toString());

  try {
    const callerPhone = req.body.From;
    const twilioNumber = req.body.To;

    console.log(`📞 Missed call from ${callerPhone}`);

    const garage = await getGarageByNumber(twilioNumber);
    if (!garage) {
      console.error(`❌ No garage found for ${twilioNumber}`);
      return;
    }

    console.log('✅ Garage found:', garage.name);

    const firstMessage = `Hi! This is ${garage.name} 👋 Sorry we missed your call. What does your car need? Reply here and we'll get back to you shortly.`;

    await client.messages.create({
      from: WHATSAPP_SANDBOX,
      to: `whatsapp:${callerPhone}`,
      body: firstMessage,
    });

    await addMessage(callerPhone, garage.id, 'assistant', firstMessage);
    console.log(`✅ WhatsApp sent to ${callerPhone}`);
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

module.exports = { handleMissedCall };
