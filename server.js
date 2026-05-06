require('dotenv').config();
const express = require('express');
const { handleMissedCall } = require('./handlers/missedCall');
const { handleWhatsAppReply } = require('./handlers/smsReply');

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.get('/', (req, res) => res.send('🚗 Missed Call AI is running'));

// Twilio webhook — triggered when a call is missed
app.post('/missed-call', handleMissedCall);

// Meta webhook verification (required by Meta)
app.get('/whatsapp-reply', (req, res) => {
  const verify_token = process.env.META_VERIFY_TOKEN || 'dynostar123';
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === verify_token) {
    console.log('✅ Meta webhook verified');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Meta webhook — triggered when customer replies on WhatsApp
app.post('/whatsapp-reply', handleWhatsAppReply);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server live on port ${PORT}`));
