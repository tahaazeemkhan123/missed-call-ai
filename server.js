require('dotenv').config();
const express = require('express');
const { handleMissedCall } = require('./handlers/missedCall');
const { handleWhatsAppReply } = require('./handlers/smsReply');

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.get('/', (req, res) => res.send('🚗 Missed Call AI is running'));

// Triggered when a call is missed
app.post('/missed-call', handleMissedCall);

// Triggered when customer replies via WhatsApp
app.post('/whatsapp-reply', handleWhatsAppReply);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server live on port ${PORT}`));
