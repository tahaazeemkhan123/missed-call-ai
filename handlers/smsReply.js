// handlers/smsReply.js
// Fires every time the customer texts back.
// Loads conversation history → asks Claude → sends reply.

const { getGarageByNumber }      = require('../db/garages');
const { getHistory, addMessage } = require('../db/conversations');
const { askClaude }              = require('../config/claude');
const { sendSMS, notifyOwner }   = require('../config/twilio');
const { MessagingResponse }      = require('twilio').twiml;

async function handleSmsReply(req, res) {
  try {
    const customerPhone   = req.body.From;
    const twilioNumber    = req.body.To;
    const customerMessage = req.body.Body;

    console.log(`💬 SMS from ${customerPhone}: "${customerMessage}"`);

    const garage = getGarageByNumber(twilioNumber);
    if (!garage) {
      console.error(`No garage found for ${twilioNumber}`);
      return res.type('text/xml').send(new MessagingResponse().toString());
    }

    // Get existing conversation history
    const history = getHistory(customerPhone);

    // Save customer's message
    addMessage(customerPhone, 'user', customerMessage);

    // Get Claude's reply
    const aiReply = await askClaude(garage, history, customerMessage);

    // Save Claude's reply
    addMessage(customerPhone, 'assistant', aiReply);

    // Send reply to customer
    await sendSMS(customerPhone, twilioNumber, aiReply);

    // Notify owner on first customer reply (not every message)
    if (history.length <= 1) {
      await notifyOwner(garage, customerPhone, customerMessage);
    }

    console.log(`✅ Replied to ${customerPhone}: "${aiReply}"`);
    res.type('text/xml').send(new MessagingResponse().toString());

  } catch (err) {
    console.error('handleSmsReply error:', err.message);
    res.status(500).send('Error');
  }
}

module.exports = { handleSmsReply };
