// config/twilio.js — Sends SMS messages and owner notifications
require('dotenv').config();
const twilio = require('twilio');
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function sendSMS(to, from, message) {
  const result = await client.messages.create({ body: message, from, to });
  const masked = to.slice(0, 6) + '****' + to.slice(-2);
  console.log(`SMS sent to ${masked} [${result.sid}]`);
  return result;
}

async function notifyOwner(garage, customerPhone, customerMessage) {
  const time = new Date().toLocaleString('en-AE', { timeZone: 'Asia/Dubai' });
  const msg = `🔔 New Lead — ${garage.name}\n📱 ${customerPhone}\n💬 "${customerMessage}"\n⏰ ${time}`;
  await sendSMS(garage.ownerPhone, garage.twilioNumber, msg);
}

module.exports = { sendSMS, notifyOwner };
