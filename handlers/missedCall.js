const { getGarageByNumber } = require('../db/garages');
const { addMessage } = require('../db/conversations');
const { VoiceResponse } = require('twilio').twiml;
const axios = require('axios');

const META_API_URL = `https://graph.facebook.com/v25.0/${process.env.META_PHONE_NUMBER_ID}/messages`;

async function sendWhatsApp(to, message) {
  await axios.post(META_API_URL, {
    messaging_product: 'whatsapp',
    to: to,
    type: 'text',
    text: { body: message }
  }, {
    headers: {
      'Authorization': `Bearer ${process.env.META_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
}

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

    await sendWhatsApp(callerPhone, firstMessage);
    await addMessage(callerPhone, garage.id, 'assistant', firstMessage);

    console.log(`✅ WhatsApp sent to ${callerPhone}`);
  } catch (err) {
    console.error('❌ Error:', err.response?.data || err.message);
  }
}

module.exports = { handleMissedCall };
