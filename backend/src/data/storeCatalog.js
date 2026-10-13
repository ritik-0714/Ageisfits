// Curated reference catalogue for the Smart Equipment Store. `ref` is an APPROXIMATE reference price in INR (not a live quote).
// Live per-retailer prices are fetched on demand by "Refresh Live Prices" (needs SERPAPI_KEY); retailer links open a search for the product.
export const ACTIVITIES = ["Gym & Weightlifting", "Running", "Cycling", "Yoga & Pilates", "Swimming", "Football", "Badminton", "Cricket", "Boxing & MMA", "Basketball", "Tennis", "Hiking & Trekking"];
export const CATEGORIES = ["Strength Equipment", "Training Accessories", "Footwear", "Recovery", "Injury Support", "Wearables", "Supplements"];
export const SKILLS = ["All Levels", "Beginner", "Intermediate", "Professional"];
export const RETAILERS = ["Amazon", "Flipkart", "Decathlon", "Myntra"];
const SE = "Strength Equipment", TA = "Training Accessories", FW = "Footwear", RC = "Recovery", IS = "Injury Support", WR = "Wearables", SP = "Supplements";
// [brand, product, activity index, category, skill, ref price, rating]
const RAW = [
  ["Domyos", "Hex Rubber Dumbbells 10kg Pair", 0, SE, "Beginner", 3499, 4.7], ["Optimum Nutrition", "Gold Standard 100% Whey Protein 1kg", 0, SP, "All Levels", 3899, 4.8],
  ["Rogue", "Cast Iron Kettlebell 16kg", 0, SE, "Intermediate", 1449, 4.8], ["Decathlon", "Corength Adjustable Weight Bench", 0, SE, "All Levels", 8999, 4.5],
  ["Nivia", "Padded Weight Lifting Gloves", 0, TA, "All Levels", 599, 4.3], ["Harbinger", "Padded Leather Lifting Belt", 0, TA, "Professional", 2199, 4.6],
  ["Boldfit", "Resistance Bands Set of 5", 0, TA, "Beginner", 699, 4.4], ["Reebok", "Nano X4 Training Shoes", 0, FW, "Intermediate", 8999, 4.5],
  ["TriggerPoint", "GRID Foam Roller", 0, RC, "All Levels", 1799, 4.7], ["McDavid", "Knee Support Sleeve Pair", 0, IS, "All Levels", 1899, 4.4],
  ["Fitbit", "Charge 6 Fitness Tracker", 0, WR, "All Levels", 12999, 4.3], ["MuscleBlaze", "Creatine Monohydrate 250g", 0, SP, "All Levels", 899, 4.5],
  ["ASICS", "Gel-Nimbus 26 Running Shoes", 1, FW, "Intermediate", 12999, 4.6], ["Nike", "Pegasus 41 Road Running Shoes", 1, FW, "All Levels", 10495, 4.6],
  ["Kalenji", "Run Active Men's Running Shoes", 1, FW, "Beginner", 2999, 4.3], ["Garmin", "Forerunner 55 GPS Watch", 1, WR, "Intermediate", 19990, 4.6],
  ["Decathlon", "Kiprun 2L Hydration Belt", 1, TA, "All Levels", 1299, 4.3], ["Compressport", "Pro Racing Compression Socks", 1, IS, "Professional", 2499, 4.5],
  ["Boldfit", "Compression Calf Sleeves", 1, IS, "All Levels", 599, 4.2], ["Go Native", "Electrolyte Energy Drink Mix", 1, SP, "All Levels", 549, 4.1],
  ["Giant", "Contend 2 Road Bike", 2, SE, "Intermediate", 45900, 4.5], ["Btwin", "Triban RC120 Road Helmet", 2, TA, "All Levels", 1999, 4.4],
  ["Shimano", "SPD Cycling Shoes", 2, FW, "Professional", 9999, 4.5], ["Garmin", "Edge 130 Plus Cycling Computer", 2, WR, "Intermediate", 21990, 4.6],
  ["Hero", "Cycling Padded Shorts", 2, TA, "Beginner", 1299, 4.2], ["Xmetal", "Bike Phone Mount", 2, TA, "All Levels", 499, 4.0],
  ["Liforme", "Original Yoga Mat 4.2mm", 3, TA, "All Levels", 11999, 4.8], ["Decathlon", "Kimjaly Yoga Mat 8mm", 3, TA, "Beginner", 1299, 4.4],
  ["Boldfit", "Yoga Block Pair EVA Foam", 3, TA, "Beginner", 499, 4.3], ["Manduka", "Pro Yoga Mat 6mm", 3, TA, "Professional", 14999, 4.8],
  ["Gaiam", "Cotton Yoga Strap", 3, TA, "All Levels", 599, 4.2], ["Hyperice", "Hypersphere Mini Massage Ball", 3, RC, "All Levels", 4999, 4.5],
  ["Speedo", "Vanquisher 2.0 Mirrored Goggles", 4, TA, "Intermediate", 1799, 4.4], ["Arena", "Cobra Ultra Swipe Goggles", 4, TA, "Professional", 3999, 4.7],
  ["Nabaiji", "Boys Jammer Swimsuit", 4, TA, "Beginner", 899, 4.1], ["Speedo", "Silicone Swim Cap", 4, TA, "All Levels", 499, 4.3],
  ["Garmin", "Swim 2 GPS Smartwatch", 4, WR, "Professional", 32990, 4.5], ["Decathlon", "Nabaiji Kickboard", 4, SE, "Beginner", 799, 4.3],
  ["Adidas", "Predator League Football Boots", 5, FW, "Intermediate", 6999, 4.5], ["Nike", "Premier League Flight Football", 5, SE, "Professional", 13995, 4.7],
  ["Nivia", "Shin Guards Pair", 5, IS, "All Levels", 449, 4.2], ["Kipsta", "F500 Football Size 5", 5, SE, "Beginner", 999, 4.4],
  ["Puma", "Future Match Goalkeeper Gloves", 5, TA, "Intermediate", 2499, 4.3], ["Mueller", "Ankle Brace Support", 5, IS, "All Levels", 1599, 4.4],
  ["Yonex", "Astrox 88 S Pro Racket", 6, SE, "Professional", 15990, 4.8], ["Yonex", "Mavis 350 Nylon Shuttlecock Tube", 6, TA, "All Levels", 1199, 4.5],
  ["Li-Ning", "Windstorm 72 Racket", 6, SE, "Intermediate", 3999, 4.4], ["Victor", "SH-A920 Badminton Shoes", 6, FW, "Intermediate", 4999, 4.5],
  ["Perfly", "BR100 Starter Racket", 6, SE, "Beginner", 799, 4.2], ["Yonex", "Racket Kit Bag 6 Pcs", 6, TA, "All Levels", 2799, 4.4],
  ["SG", "RSD Xtreme English Willow Bat", 7, SE, "Professional", 18999, 4.6], ["SS", "Ton Gutsy Kashmir Willow Bat", 7, SE, "Beginner", 2499, 4.3],
  ["Kookaburra", "Pro Batting Gloves", 7, TA, "Intermediate", 3299, 4.4], ["Cosco", "Cricket Leather Ball Pack of 6", 7, SE, "Intermediate", 1999, 4.3],
  ["SG", "Test Batting Pads", 7, IS, "Intermediate", 3999, 4.4], ["Puma", "Evospeed Cricket Shoes", 7, FW, "Intermediate", 4499, 4.3],
  ["Everlast", "Pro Style Training Boxing Gloves 12oz", 8, TA, "Intermediate", 3999, 4.6], ["Boldfit", "Hand Wraps 180 inch", 8, IS, "All Levels", 399, 4.3],
  ["Decathlon", "Outshock 500 Heavy Punching Bag", 8, SE, "Beginner", 6999, 4.4], ["Venum", "Challenger MMA Gloves", 8, TA, "Professional", 5499, 4.6],
  ["Adidas", "Box Hog 4 Boxing Shoes", 8, FW, "Professional", 7499, 4.5], ["Shock Doctor", "Gel Nano Mouthguard", 8, IS, "All Levels", 1599, 4.5],
  ["Spalding", "TF-250 Outdoor Basketball Size 7", 9, SE, "Beginner", 1899, 4.4], ["Nike", "Air Zoom G.T. Cut Basketball Shoes", 9, FW, "Professional", 16995, 4.6],
  ["Cosco", "Adjustable Basketball Hoop Stand", 9, SE, "Beginner", 7999, 4.2], ["McDavid", "Hex Padded Compression Shorts", 9, IS, "Intermediate", 2499, 4.4],
  ["Mikasa", "Basketball Pump with Needles", 9, TA, "All Levels", 399, 4.1], ["Under Armour", "Curry Flow Basketball Shoes", 9, FW, "Intermediate", 12999, 4.5],
  ["Wilson", "Clash 100 v2 Tennis Racket", 10, SE, "Intermediate", 14999, 4.7], ["Babolat", "Pure Drive Tennis Racket", 10, SE, "Professional", 18999, 4.8],
  ["Artengo", "TR130 Beginner Racket", 10, SE, "Beginner", 1499, 4.2], ["Wilson", "US Open Tennis Balls 3-Can", 10, TA, "All Levels", 899, 4.4],
  ["Adidas", "Courtjam Control Tennis Shoes", 10, FW, "Intermediate", 7999, 4.4], ["Bauerfeind", "Epitrain Elbow Support", 10, IS, "All Levels", 3999, 4.5],
  ["Wildcraft", "Rocksack 45L Trekking Backpack", 11, TA, "Intermediate", 3499, 4.4], ["Quechua", "MH100 Waterproof Hiking Boots", 11, FW, "Beginner", 3999, 4.3],
  ["Black Diamond", "Trail Trekking Poles Pair", 11, TA, "Intermediate", 8999, 4.6], ["Garmin", "Instinct 2 Rugged GPS Watch", 11, WR, "Professional", 34990, 4.6],
  ["Salomon", "X Ultra 4 GTX Hiking Shoes", 11, FW, "Professional", 14999, 4.7], ["Decathlon", "Trek 100 Compression Knee Strap", 11, IS, "All Levels", 799, 4.2],
];
export const PRODUCTS = RAW.map(([brand, name, a, category, skill, ref, rating], i) => ({ id: `p${i + 1}`, brand, name, activity: ACTIVITIES[a], category, skill, ref, rating, listing: i % 3 === 2 ? "VERIFIED CATALOG" : "IN STOCK" }));

export const retailerLink = (retailer, q) => { const e = encodeURIComponent(q); return { Amazon: `https://www.amazon.in/s?k=${e}`, Flipkart: `https://www.flipkart.com/search?q=${e}`, Decathlon: `https://www.decathlon.in/search?Ntt=${e}`, Myntra: `https://www.myntra.com/${e}` }[retailer]; };
export function filterProducts({ activity, category, maxPrice, skill, q } = {}) {
  const text = String(q || "").toLowerCase().trim();
  return PRODUCTS.filter(p => (!activity || activity === "All" || p.activity === activity) && (!category || category === "All" || p.category === category)
    && (!maxPrice || p.ref <= maxPrice) && (!skill || skill === "All Levels" || p.skill === skill || p.skill === "All Levels") && (!text || `${p.brand} ${p.name}`.toLowerCase().includes(text)));
}
