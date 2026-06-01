const { getGarageByNumber } = require('../db/garages');
const { getHistory, addMessage } = require('../db/conversations');
const { askClaude } = require('../config/claude');
const { MessagingResponse } = require('twilio').twiml;
const twilio = require('twilio');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const WHATSAPP_SANDBOX = 'whatsapp:+15559565809';

async function notifyOwner(garage, customerPhone, customerMessage, aiReply) {
  try {
    await client.messages.create({
      from: WHATSAPP_SANDBOX,
      to: 'whatsapp:' + garage.ownerPhone,
      contentSid: 'HXe1d21e761534f8bb7b3f6a82878e93c2',
      contentVariables: JSON.stringify({
        "1": garage.name,
        "2": customerPhone,
        "3": customerMessage,
        "4": aiReply
      })
    });
  } catch (err) {
    console.error('Owner notify failed: ' + err.message);
  }
}

async function handleWhatsAppReply(req, res) {
  res.type('text/xml').send(new MessagingResponse().toString());
  try {
    const customerPhone = req.body.From.replace('whatsapp:', '');
    const customerMessage = req.body.Body;
    const incomingNumber = req.body.To.replace('whatsapp:', '');
const garage = await getGarageByNumber(incomingNumber);
    if (!garage) {
      console.error('No garage found');
      return;
    }
    const history = await getHistory(customerPhone);
    await addMessage(customerPhone, 'user', customerMessage);
    const aiReply = await askClaude(garage, history, customerMessage);
    await client.messages.create({
      from: WHATSAPP_SANDBOX,
      to: 'whatsapp:' + customerPhone,
      body: aiReply,
    });
    await addMessage(customerPhone, 'assistant', aiReply);
    await notifyOwner(garage, customerPhone, customerMessage, aiReply);
  } catch (err) {
    console.error('ERROR: ' + err.message);
  }
}

module.exports = { handleWhatsAppReply };
