const { getGarageByNumber } = require('../db/garages');
const { getHistory, addMessage } = require('../db/conversations');
const { askClaude } = require('../config/claude');
const { MessagingResponse } = require('twilio').twiml;
const twilio = require('twilio');

const twilioMain = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const twilioRF = twilio(process.env.TWILIO_ACCOUNT_SID_RF, process.env.TWILIO_AUTH_TOKEN_RF);

function getClient(garage) {
  return garage.twilioAccount === 'roadforce' ? twilioRF : twilioMain;
}

async function notifyOwner(garage, customerPhone, customerMessage, aiReply) {
  try {
    const client = getClient(garage);
    const ownerPhones = Array.isArray(garage.ownerPhone) ? garage.ownerPhone : [garage.ownerPhone];
    const cleanMessage = customerMessage.replace(/"/g, "'").replace(/\n/g, ' ').trim();
    const cleanReply = aiReply.replace(/"/g, "'").replace(/\n/g, ' ').trim();
    for (const phone of ownerPhones) {
      await client.messages.create({
        from: 'whatsapp:' + garage.whatsappNumber,
        to: 'whatsapp:' + phone,
        contentSid: 'HXe1d21e761534f8bb7b3f6a82878e93c2',
        contentVariables: JSON.stringify({
          "1": garage.name,
          "2": customerPhone,
          "3": cleanMessage,
          "4": cleanReply
        })
      });
    }
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
    const client = getClient(garage);
    const history = await getHistory(customerPhone);
    await addMessage(customerPhone, 'user', customerMessage);
    const aiReply = await askClaude(garage, history, customerMessage);
    await client.messages.create({
      from: 'whatsapp:' + garage.whatsappNumber,
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
