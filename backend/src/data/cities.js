// 22 Indian cities supported by the Connect module (approximate city-centre coordinates).
const STATE = { Mumbai: "Maharashtra", Pune: "Maharashtra", Nagpur: "Maharashtra", Delhi: "Delhi", Bengaluru: "Karnataka", Hyderabad: "Telangana", Chennai: "Tamil Nadu", Coimbatore: "Tamil Nadu",
  Kolkata: "West Bengal", Ahmedabad: "Gujarat", Surat: "Gujarat", Vadodara: "Gujarat", Rajkot: "Gujarat", Jaipur: "Rajasthan", Lucknow: "Uttar Pradesh", Indore: "Madhya Pradesh", Bhopal: "Madhya Pradesh",
  Chandigarh: "Chandigarh", Kochi: "Kerala", Visakhapatnam: "Andhra Pradesh", Patna: "Bihar", Guwahati: "Assam" };
export const CITIES = [
  ["Mumbai", 19.076, 72.8777], ["Delhi", 28.6139, 77.209], ["Bengaluru", 12.9716, 77.5946], ["Hyderabad", 17.385, 78.4867],
  ["Chennai", 13.0827, 80.2707], ["Kolkata", 22.5726, 88.3639], ["Pune", 18.5204, 73.8567], ["Ahmedabad", 23.0225, 72.5714],
  ["Surat", 21.1702, 72.8311], ["Vadodara", 22.3072, 73.1812], ["Jaipur", 26.9124, 75.7873], ["Lucknow", 26.8467, 80.9462],
  ["Nagpur", 21.1458, 79.0882], ["Indore", 22.7196, 75.8577], ["Bhopal", 23.2599, 77.4126], ["Chandigarh", 30.7333, 76.7794],
  ["Kochi", 9.9312, 76.2673], ["Visakhapatnam", 17.6868, 83.2185], ["Patna", 25.5941, 85.1376], ["Coimbatore", 11.0168, 76.9558],
  ["Rajkot", 22.3039, 70.8022], ["Guwahati", 26.1445, 91.7362],
].map(([name, lat, lng]) => ({ name, lat, lng, state: STATE[name] }));
export const SPORTS = ["Running", "Strength", "Cycling", "Swimming", "Football", "Basketball", "Badminton", "Tennis", "Yoga", "Boxing", "Cricket", "Hiking"];   // 12 activities
