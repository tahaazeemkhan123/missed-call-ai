const { getGarageByNumber } = require('../db/garages');
const { addMessage } = require('../db/conversations');
const { VoiceResponse } = require('twilio').twiml;
const twilio = require('twilio');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function handleMissedCall(req, res) {
  res.type('text/xml').send(new VoiceResponse().toString());
  try {
    const callerPhone = req.body.From;
    const twilioNumber = req.body.To;
    console.log('Missed call from ' + callerPhone);
    const garage = await getGarageByNumber(twilioNumber);
    if (!garage) {
      console.error('No garage found for ' + twilioNumber);
      return;
    }
    console.log('Garage found: ' + garage.name);
    await client.messages.create({
  from: 'whatsapp:' + garage.whatsappNumber,
  to: 'whatsapp:' + callerPhone,
  contentSid: 'HXf0a7e2393f3a0e6a21ace0d2de911736',
  contentVariables: JSON.stringify({ "1": garage.name })
});
    await addMessage(callerPhone, 'assistant', 'Hi! This is ' + garage.name + '. Sorry we missed your call. What does your car need?');
    console.log('WhatsApp sent to ' + callerPhone);
  } catch (err) {
    console.error('Error: ' + err.message);
  }
}

module.exports = { handleMissedCall };
