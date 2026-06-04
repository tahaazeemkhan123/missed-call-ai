require('dotenv').config();
const express = require('express');
const { handleMissedCall } = require('./handlers/missedCall');
const { handleWhatsAppReply } = require('./handlers/smsReply');
const supabase = require('./db/supabase');
const { garages } = require('./db/garages');

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

// Conversation log page
app.get('/conversation/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', id)
      .single();

    if (convErr || !conv) {
      return res.status(404).send(`<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px">
        <h2>404 — Conversation not found</h2></body></html>`);
    }

    const { data: messages, error: msgErr } = await supabase
      .from('messages')
      .select('role, content, timestamp')
      .eq('conversation_id', id)
      .order('timestamp', { ascending: true });

    if (msgErr) throw msgErr;

    const garage = garages.find(g => g.id === conv.garage_id);
    const garageName = garage ? garage.name : conv.garage_id;

    const bubbles = (messages || []).map(m => {
      const isAi = m.role === 'ai';
      const time = new Date(m.timestamp).toLocaleString('en-GB', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      });
      const align = isAi ? 'flex-start' : 'flex-end';
      const bg = isAi ? '#f0f0f0' : '#dcf8c6';
      const label = isAi ? 'AI Agent' : 'Customer';
      return `
        <div style="display:flex;justify-content:${align};margin-bottom:12px">
          <div style="max-width:70%;background:${bg};border-radius:12px;padding:10px 14px;box-shadow:0 1px 2px rgba(0,0,0,.15)">
            <div style="font-size:11px;color:#888;margin-bottom:4px">${label}</div>
            <div style="font-size:15px;white-space:pre-wrap">${escapeHtml(m.content)}</div>
            <div style="font-size:11px;color:#aaa;margin-top:6px;text-align:right">${time}</div>
          </div>
        </div>`;
    }).join('');

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Conversation — ${escapeHtml(garageName)}</title>
  <style>
    body { margin: 0; font-family: -apple-system, sans-serif; background: #e5ddd5; min-height: 100vh; }
    .header { background: #075e54; color: #fff; padding: 16px 20px; position: sticky; top: 0; z-index: 10; }
    .header h1 { margin: 0; font-size: 18px; }
    .header p { margin: 4px 0 0; font-size: 13px; opacity: .8; }
    .chat { max-width: 700px; margin: 0 auto; padding: 20px 16px 40px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(garageName)}</h1>
    <p>📞 ${escapeHtml(conv.customer_number)} &nbsp;·&nbsp; ${conv.ended ? '✅ Ended' : '🟢 Active'}</p>
  </div>
  <div class="chat">${bubbles}</div>
</body>
</html>`);
  } catch (err) {
    console.error('Conversation page error: ' + err.message);
    res.status(500).send('Internal server error');
  }
});

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server live on port ${PORT}`));
