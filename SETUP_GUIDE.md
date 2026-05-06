# 🚗 Missed Call AI — Setup Guide

## How It Works
Customer calls garage → nobody answers → they get an SMS automatically →
Claude chats with them → books the appointment → notifies the garage owner.

---

## STEP 1 — Create These Accounts (One Time Only)

### Twilio (SMS + phone numbers) → twilio.com
1. Sign up → verify your phone number
2. Add $20 credit
3. Go to Console dashboard and copy:
   - Account SID  (looks like: AC123abc...)
   - Auth Token   (looks like: a1b2c3...)

### Anthropic API (Claude AI) → console.anthropic.com
1. Sign up → go to API Keys → Create new key
2. Copy the key (starts with sk-ant-...)
3. Add $10-20 credit

### Railway (Hosting) → railway.app
1. Sign up with GitHub
2. Free to start

### GitHub (Code storage) → github.com
1. Create a free account
2. You'll push your code here

---

## STEP 2 — Install On Your Computer (One Time Only)

1. Install Node.js → nodejs.org (download LTS version)
2. Install Git → git-scm.com/downloads
3. Open Terminal and verify:
   - Type: node --version   (should show a number)
   - Type: git --version    (should show a number)

---

## STEP 3 — Set Up The Project

In Terminal, run:
```
cd ~/Desktop
npm install
cp .env.example .env
```

Open .env in any text editor and fill in:
```
TWILIO_ACCOUNT_SID=ACyour_real_sid_here
TWILIO_AUTH_TOKEN=your_real_token_here
ANTHROPIC_API_KEY=sk-ant-your_real_key_here
```

---

## STEP 4 — Test Locally

```
npm start
```
You should see: Server live on port 3000

In a new terminal window, test:
```
curl -X POST http://localhost:3000/missed-call \
  -d "From=+15551234567" \
  -d "To=+19715551234" \
  -d "CallStatus=no-answer"
```
No error = working. ✅

---

## STEP 5 — Deploy To Railway

Push to GitHub first:
```
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOURUSERNAME/missed-call-ai.git
git push -u origin main
```

On Railway:
1. New Project → Deploy from GitHub Repo → select your repo
2. Go to Variables → add your 3 env vars from .env
3. Go to Settings → Domains → Generate Domain
4. Copy your URL: https://missed-call-ai-xyz.up.railway.app
   ← SAVE THIS, you need it for the next step

---

## STEP 6 — Connect Twilio

Buy a phone number:
1. Twilio Console → Phone Numbers → Buy a Number
2. Search by area code (pick the garage's city)
3. Buy it ($1/month)

Configure the number:
1. Click the number
2. Under Voice & Fax → "A call comes in":
   Webhook → https://YOUR-RAILWAY-URL.up.railway.app/missed-call
3. Under Messaging → "A message comes in":
   Webhook → https://YOUR-RAILWAY-URL.up.railway.app/sms-reply
4. Save

---

## STEP 7 — Add Your First Client

Open db/garages.js and edit the first entry:
- name: actual garage name
- twilioNumber: the Twilio number you just bought
- ownerPhone: garage owner's mobile for notifications
- hours: their real opening hours
- services: list of what they offer
- bookingLink: their Calendly, WhatsApp link, or website

Then deploy:
```
git add .
git commit -m "Add first garage"
git push
```
Railway auto-deploys in ~1 minute.

---

## STEP 8 — Set Up Call Forwarding On Client's Phone

This makes their main number forward missed calls to your Twilio number.

Dial this from their phone:
**61*+[TWILIO_NUMBER]**30#

Example: **61*+19715551234**30# then press Call

Means: "After 30 seconds no answer, forward to Twilio"

Test it:
1. Call their main number
2. Don't answer
3. After 30 seconds → caller should get an SMS ✅

---

## STEP 9 — Adding Each New Client (45 min per client)

1. Buy new Twilio number for their area ($1/month)
2. Configure webhooks in Twilio (same URLs as Step 6)
3. Add their row to db/garages.js
4. git add . → git commit → git push
5. Set up call forwarding on their phone (Step 8)
6. Test it live
7. Collect $1,200 setup fee

---

## Your Costs vs Revenue Per Client

| | Monthly |
|---|---|
| Twilio number | $1.00 |
| SMS messages | $1.50 |
| Claude API | $2-3.00 |
| Hosting (shared) | $1.00 |
| YOUR COST | ~$6/mo |
| YOU CHARGE | $150-200/mo |
| PROFIT | ~97% margin |

---

## Project Structure

```
missed-call-ai/
├── server.js              ← Starts the server
├── package.json           ← Dependencies
├── .env.example           ← Copy to .env and fill in your keys
├── .gitignore
├── handlers/
│   ├── missedCall.js      ← Fires when call is missed → sends first SMS
│   └── smsReply.js        ← Fires when customer texts back → Claude replies
├── config/
│   ├── claude.js          ← Claude AI conversation logic
│   └── twilio.js          ← SMS sending
└── db/
    ├── garages.js         ← All your client configs ← YOU EDIT THIS
    └── conversations.js   ← Chat history per customer (automatic)
```
