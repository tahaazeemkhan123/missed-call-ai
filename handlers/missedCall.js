// handlers/missedCall.js
// Fires the moment Twilio detects a missed/unanswered call.
// Immediately sends the first SMS to the caller.

const { getGarageByNumber } = require('../db/garages');
const { addMessage }        = require('../db/conversations');
const { sendSMS }           = require('../config/twilio');
const { VoiceResponse }     = require('twilio').twiml;

async function handleMissedCall(req, res) {
  try {
    const callerPhone  = req.body.From;
    const twilioNumber = req.body.To;
    const callStatus   = req.body.CallStatus;

    console.log(`📞 Missed call: ${callerPhone} → ${twilioNumber} [${callStatus}]`);

    // Only fire on missed/no answer calls
    if (!['no-answer', 'busy', 'failed'].includes(callStatus)) {
      return res.type('text/xml').send(new VoiceResponse().toString());
    }

    const garage = await getGarageByNumber(twilioNumber);
    if (!garage) {
      console.error(`No garage found for ${twilioNumber}`);
      return res.type('text/xml').send(new VoiceResponse().toString());
    }

    // First message to the customer
    const firstMessage = `Hi! Sorry we missed your call at ${garage.name} 👋 What does your car need? Reply here and we'll sort you out right away.`;

    await sendSMS(callerPhone, twilioNumber, firstMessage);
    addMessage(callerPhone, 'assistant', firstMessage);

    console.log(`✅ First SMS sent to ${callerPhone} for ${garage.name}`);
    res.type('text/xml').send(new VoiceResponse().toString());

  } catch (err) {
    console.error('handleMissedCall error:', err.message);
    res.status(500).send('Error');
  }
}

module.exports = { handleMissedCall };
