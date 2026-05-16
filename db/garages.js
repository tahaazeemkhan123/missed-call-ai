// db/garages.js — Add each new client here as one object in the array

const garages = [
  {
    id: 'garage_001',
    name: "Dyno Star Auto Repairing",
    twilioNumber: '+15559565809',
    ownerPhone: '+971568967912',
    hours: 'Monday to Saturday, 8am to 7pm. Closed on Sundays.',
    services: `Full car repair and maintenance including:
- Engine diagnostics and repair
- Gearbox and transmission repair
- Suspension and steering
- Brake service and repair
- Oil and filter changes
- AC service and repair
- Electrical diagnostics and repair
- Battery testing and replacement
- Windscreen and glass repair/replacement
- Body work, dent removal and panel beating
- Car painting (full and partial)
- Car wrapping (full and partial)
- PPF (Paint Protection Film)
- Ceramic coating and paint detailing
- Full car servicing (minor and major)
- All car brands and models welcome`,
    bookingLink: 'https://wa.me/971568967912',
    city: 'Dubai',
    language: 'English',
  },

  // Add more garages below as you sign clients:
  // {
  //   id: 'garage_002',
  //   name: "Speed Motors",
  //   twilioNumber: '+19715555678',
  //   ownerPhone: '+971505551234',
  //   hours: 'Saturday to Thursday, 9am to 7pm. Closed Fridays.',
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
