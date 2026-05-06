// db/garages.js — Add each new client here as one object in the array

const garages = [
  {
    id: 'garage_001',
    name: "Mike's Auto Repair",
    twilioNumber: '+19715551234',   // Twilio number you bought for this garage
    ownerPhone: '+19715559999',     // Owner's number for lead notifications
    hours: 'Monday to Friday, 8am to 6pm. Saturday 9am to 3pm. Closed Sunday.',
    services: 'Oil changes, brakes, tyres, engine diagnostics, AC repair, suspension',
    bookingLink: 'https://calendly.com/mikesauto',
    city: 'Dubai',
    language: 'English',
  },

  // Add more garages below as you sign clients:
  // {
  //   id: 'garage_002',
  //   name: "Speed Motors",
  //   twilioNumber: '+19715555678',
  //   ownerPhone: '+971505551234',
  //   hours: 'Saturday to Thursday, 9am to 7pm.',
  //   services: 'BMW, Mercedes specialist. Engine, gearbox, electrical',
  //   bookingLink: 'https://wa.me/971505551234',
  //   city: 'Dubai',
  //   language: 'English',
  // },
];

function getGarageByNumber(twilioNumber) {
  return garages.find(g => g.twilioNumber === twilioNumber) || null;
}

module.exports = { garages, getGarageByNumber };
