const garages = [
  {
    id: 'garage_001',
    name: 'Dyno Star Auto Repairing',
    twilioNumber: '+12497010798',
    whatsappNumber: '+15559565809',
    twilioAccount: 'main',
    templateSid: 'HX6fc22207c6285762634bbb994618ef76',
    ownerPhone: '+971521237912',
    hours: 'Monday to Saturday, 8am to 7pm. Closed on Sundays.',
    services: 'Full car repair and maintenance including engine diagnostics and repair, gearbox and transmission repair, suspension and steering, brake service and repair, oil and filter changes, AC service and repair, electrical diagnostics and repair, battery testing and replacement, windscreen and glass repair/replacement, body work, dent removal and panel beating, car painting, car wrapping, PPF, ceramic coating and paint detailing, full car servicing, all car brands and models welcome.',
    bookingLink: 'https://wa.me/971568967912',
    city: 'Dubai',
    language: 'English',
  },
  {
    id: 'garage_002',
    name: 'Road Force Tyre',
    twilioNumber: '+17822972044',
    whatsappNumber: '+15559903344',
    twilioAccount: 'roadforce',
    templateSid: 'HX5062a39bb744844a660fa76000417d7e',
    ownerPhone: ['+971568967912'],
    hours: 'Every day, 10am to 10pm',
    services: 'Tyre replacement and balancing, wheel alignment, brake pads and braking system repair, major car service, engine diagnostics, suspension and steering, paint and body work, general car repair and maintenance.',
    city: 'Al Quoz, Dubai',
    language: 'English',
  },
];

function getGarageByNumber(number) {
  return garages.find(g => g.twilioNumber === number || g.whatsappNumber === number);
}

module.exports = { garages, getGarageByNumber };
