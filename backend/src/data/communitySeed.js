import { CITIES } from "./cities.js";

// SAMPLE listings so the Connect module is demonstrable: 6 clubs + 6 events per city (one per sport), all flagged isSample.
// Real clubs/events are created by organisers via POST /api/community.
const CLUBS = [
  ["Restorative Yoga & Mobility Circle", "Yoga", "community", "all", 1.1, "Sat 7:00 AM"], ["Striders & Distance Runners", "Running", "partner", "all", 1.2, "Tue/Thu 6:00 AM"],
  ["Athlete Mobility & Myofascial Recovery", "Strength", "partner", "all", 1.4, "Wed 7:30 PM"], ["Weekend Cyclists Collective", "Cycling", "community", "intermediate", 3.0, "Sun 6:00 AM"],
  ["Badminton Smash League", "Badminton", "partner", "intermediate", 4.6, "Mon/Fri 8:00 PM"], ["Boxing & Conditioning Club", "Boxing", "community", "beginner", 6.2, "Tue/Sat 6:30 PM"],
];
const EVENTS = [
  ["Sunday Football Meetup", "Football", "all", 2.8, 4], ["Open Pool Swim Meet", "Swimming", "intermediate", 5.1, 9], ["3x3 Basketball Tournament", "Basketball", "intermediate", 7.4, 12],
  ["Community Tennis Open Day", "Tennis", "beginner", 9.6, 6], ["Weekend Cricket Challenge", "Cricket", "all", 12.2, 15], ["Sunrise Trek & Trail Day", "Hiking", "all", 14.1, 18],
];
const hash = s => [...s].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
const place = (c, km, seed) => {            // point `km` away from the city centre on a deterministic bearing
  const b = ((hash(seed) % 360) * Math.PI) / 180;
  return { lat: c.lat + (km * Math.cos(b)) / 111, lng: c.lng + (km * Math.sin(b)) / (111 * Math.cos((c.lat * Math.PI) / 180)) };
};

export function buildSeed(now = Date.now()) {
  const out = [];
  for (const c of CITIES) {
    for (const [n, sport, badge, level, km, schedule] of CLUBS)
      out.push({ name: `${c.name} ${n}`, sport, city: c.name, state: c.state, ...place(c, km, c.name + n), kind: "club", badge, level, schedule, venue: `Public ground, ${c.name}`, description: `${sport} group in ${c.name}.`, isSample: true });
    for (const [n, sport, level, km, days] of EVENTS)
      out.push({ name: `${c.name} ${n}`, sport, city: c.name, state: c.state, ...place(c, km, c.name + n), kind: "event", badge: "community", level, startsAt: new Date(now + days * 864e5), venue: `Public venue, ${c.name}`, description: `Open ${sport.toLowerCase()} event in ${c.name}.`, isSample: true });
  }
  return out;
}
