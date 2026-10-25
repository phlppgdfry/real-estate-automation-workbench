import { approve, createLead, deliver, type Listing, type Lead, type Intake } from './domain';
export function catalog(now = new Date().toISOString()): Listing[] {
  return [
    {
      id: 'DD-204',
      title: 'Parkwoning',
      city: 'Oudenburg',
      price: 389000,
      status: 'available',
      checkedAt: now,
    },
    {
      id: 'DD-209',
      title: 'Duinappartement',
      city: 'Oostende',
      price: 315000,
      status: 'sold',
      checkedAt: now,
    },
  ];
}
export function seed(now = new Date().toISOString()): Lead[] {
  const cases: [string, string, string][] = [
    [
      'Lotte De Smet',
      'Dag, ik wil de woning DD-204 in Oudenburg graag bezoeken. Kan dat zaterdag? Mijn budget is € 395.000. Groeten, Lotte.',
      'website',
    ],
    [
      'Bram Vermeer',
      'Graag een schatting van mijn woning in Oudenburg. Hoe starten we dit op?',
      'email',
    ],
    [
      'Emma Claes',
      'Ik zoek een appartement in Oostende met twee slaapkamers. Wat hebben jullie?',
      'website',
    ],
    ['Noor Peeters', 'Kan ik DD-209 bezoeken? Ik ben beschikbaar op maandag.', 'portal'],
    ['Milan Jacobs', 'Graag een bezoek aan DD-204. Kan een collega me contacteren?', 'email'],
    ['Alex Demo', 'Ik heb een vraag, kunt u mij helpen met meer informatie?', 'website'],
  ];
  return cases.map(([name, message, channel], i) => {
    let l = createLead(
      {
        eventId: `demo-${i + 1}`,
        name,
        email: `demo${i + 1}@example.com`,
        message,
        channel,
      } as Intake,
      catalog(now),
      now,
    );
    if (i === 2 || i === 4) l = approve(l, 1, 'Demo-beoordelaar', catalog(now), now);
    if (i === 4) l = deliver(l, false, now);
    return l;
  });
}
