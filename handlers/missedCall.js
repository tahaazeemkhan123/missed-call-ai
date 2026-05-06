const { getGarageByNumber } = require('../db/garages');
const { addMessage } = require('../db/conversations');
const { sendSMS } = require('../config/twilio');
const { VoiceResponse } = require('twilio').twiml;

async function handleMissedCall(req, res) {
  // Always respond to Twilio immediately
  res.type('text/xml').send(new VoiceResponse().toString());

  try {
    const callerPhone  = req.body.From;
    const twilioNumber = req.body.To;
    const callStatus   = req.body.CallStatus;

    console.log(`📞 Incoming: ${callerPhone} → ${twilioNumber} [${callStatus}]`);
    console.log('Full payload:', JSON.stringify(req.body));

    // Find the garage
    const garage = await getGarageByNumber(twilioNumber);
    if (!garage) {
      console.error(`❌ No garage found for ${twilioNumber}`);
      return;
    }
    console.log('✅ Garage found:', garage.name);

    // Send first SMS regardless of call status
    const firstMessage = `Hi! Sorry we missed your call at ${garage.name} 👋 What does your car need? Reply here and we'll sort you out right away.`;
    
    console.log('Sending SMS to:', callerPhone);
    await sendSMS(callerPhone, twilioNumber, firstMessage);
    console.log('✅ SMS sent!');

    await addMessage(callerPhone, 'assistant', firstMessage);
    console.log('✅ Message saved to DB');

  } catch (err) {
    console.error('❌ ERROR:', err.message);
    console.error('Stack:', err.stack);
  }
}

module.exports = { handleMissedCall };
