const express = require('express');
const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const { handleMissedCall } = require('./handlers/missedCall');
const { handleSmsReply }   = require('./handlers/smsReply');

app.post('/missed-call', handleMissedCall);
app.post('/sms-reply',   handleSmsReply);
app.get('/', (req, res) => res.send('🚗 Missed Call AI is running'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server live on port ${PORT}`));
