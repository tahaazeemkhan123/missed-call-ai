const { getGarageByNumber } = require('../db/garages');
const { addMessage } = require('../db/conversations');
const { VoiceResponse } = require('twilio').twiml;
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

async function handleMissedCall(req, res) {
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

    const firstMessage = `Hi! This is ${garage.name} 👋 Sorry we missed your call. What does your car need? Reply here and we'll sort you out right away.`;

    await sendWhatsAppMessage(callerPhone, firstMessage);
    console.log('✅ WhatsApp sent to', callerPhone);

    await addMessage(callerPhone, 'assistant', firstMessage);

  } catch (err) {
    console.error('❌ ERROR:', err.message);
    if (err.response) console.error('Meta API error:', err.response.data);
  }
}

module.exports = { handleMissedCall };
