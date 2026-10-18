import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Database from 'better-sqlite3';
import { runMigrations } from '../lib/db/migrations';
import { mockEmbed } from '../lib/mockLlm';
import { computeStyleProfileHeuristics, generateDefaultToneSummary } from '../lib/voice';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const uploadsDir = path.resolve(process.cwd(), 'public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Generate simple clean SVG image files programmatically
function createSampleSvg(name: string, bg: string, label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
    <rect width="600" height="600" fill="${bg}"/>
    <circle cx="300" cy="270" r="140" fill="rgba(255,255,255,0.15)"/>
    <rect x="230" y="200" width="140" height="150" rx="20" fill="rgba(255,255,255,0.25)"/>
    <path d="M 370 230 C 420 230, 420 310, 370 310" stroke="rgba(255,255,255,0.25)" stroke-width="18" fill="none"/>
    <text x="300" y="470" font-family="system-ui, sans-serif" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle">${label}</text>
    <text x="300" y="510" font-family="system-ui, sans-serif" font-size="18" fill="rgba(255,255,255,0.7)" text-anchor="middle">ListLocal Verified Sample Photo</text>
  </svg>`;

  const filePath = path.join(uploadsDir, `${name}.svg`);
  fs.writeFileSync(filePath, svg);
  return `/uploads/${name}.svg`;
}

const photoPath1 = createSampleSvg('terracotta-mug', '#92400e', 'Terracotta Mug');
const photoPath2 = createSampleSvg('stoneware-bowl', '#334155', 'Stoneware Pasta Bowl');
const photoPath3 = createSampleSvg('carved-spoon', '#1e293b', 'Teakwood Spoon');

const dbPath = path.join(dataDir, 'listlocal.db');
const db = new Database(dbPath);
runMigrations(db);

console.log('Seeding ListLocal database...');

// 1. Seed 10 sample past listings in a distinct artisan voice
const pastListingsSamples = [
  'Handcrafted terracotta stoneware mug thrown on the wheel with mindful attention. Organic ribbed texture and ergonomic thumb rest. Dishwasher and microwave safe.',
  'Artisan speckle-glazed espresso cup pair in desert cream. Wheel-thrown high fire ceramic finished with unglazed foot ring. Cozy morning ritual essential.',
  'Handmade ceramic pour-over coffee filter cone with natural wabi-sabi ridges. Food-safe lead-free glazes throughout. Pairs with any standard mug.',
  'Studio pottery pasta bowl set with hand-dipped terracotta edge. Each piece is unique and celebrates natural nuances and clay textures.',
  'Minimalist stoneware succulent planter with drainage hole and matching unglazed terracotta saucer. Perfect for windowsill botanical styling.',
  'Hand-pinched ceramic salt cellar with matching olivewood spoon. Organic wabi-sabi rim and unglazed earthy base for natural kitchen aesthetics.',
  'Wheel-thrown ceramic tea mug with deep midnight glaze and raw iron clay speckling. Sturdy studio drinkware crafted for everyday comfort.',
  'Artisan ceramic butter dish in rustic speckled sand glaze. Keeps butter spreadable and brings slow-living charm to your breakfast table.',
  'Wheel-thrown stoneware tapas and dip bowls in earthy earthtones. Set of four nestling dishes finished with matte lead-free mineral glaze.',
  'Large rustic ceramic serving platter with hand-carved spiral fluting. Centerpiece tableware celebrating traditional small-batch kiln craft.',
];

const insertPastListing = db.prepare(`
  INSERT INTO past_listings (id, text, embedding, created_at)
  VALUES (?, ?, ?, ?)
`);

db.prepare('DELETE FROM past_listings').run();
for (const text of pastListingsSamples) {
  const id = crypto.randomUUID();
  const vec = mockEmbed(text);
  insertPastListing.run(id, text, JSON.stringify(vec), new Date().toISOString());
}

// 2. Compute and seed Style Profile
const heuristics = computeStyleProfileHeuristics(pastListingsSamples);
const toneSummary = generateDefaultToneSummary(heuristics);
const styleProfile = {
  ...heuristics,
  tone_summary: `${toneSummary}; earthy studio potter narrative`,
  analyzed_listings_count: pastListingsSamples.length,
  last_updated: new Date().toISOString(),
};

db.prepare('DELETE FROM style_profile').run();
db.prepare('INSERT INTO style_profile (id, json) VALUES (?, ?)').run('active_profile', JSON.stringify(styleProfile));

// 3. Seed 3 demo products and listings
db.prepare('DELETE FROM products').run(); // Cascades listings and photos

const prod1Id = 'prod-demo-1';
const prod2Id = 'prod-demo-2';
const prod3Id = 'prod-demo-3';
const now = new Date().toISOString();

const insertProduct = db.prepare('INSERT INTO products (id, name, platform, status, created_at) VALUES (?, ?, ?, ?, ?)');
const insertPhoto = db.prepare('INSERT INTO photos (id, product_id, path, width, height) VALUES (?, ?, ?, ?, ?)');
const insertListing = db.prepare(`
  INSERT INTO listings (
    id, product_id, title, description, tags_json, category,
    price_min, price_max, language, model_used, voice_sources_json, edited, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
`);

// Product 1 (Etsy Listed)
insertProduct.run(prod1Id, 'Handcrafted Terracotta Ceramic Coffee Mug', 'Etsy', 'listed', now);
insertPhoto.run('photo-1', prod1Id, photoPath1, 600, 600);
insertListing.run(
  'list-demo-1',
  prod1Id,
  'Handmade Terracotta Ceramic Coffee Mug | Rustic Wheel Thrown Stoneware Tea Cup | Artisan Gift',
  `Elevate your daily coffee ritual with this artisan wheel-thrown ceramic mug, crafted from durable stoneware and finished in warm terracotta tones.

✨ PRODUCT HIGHLIGHTS:
• Hand-sculpted handle contoured with an ergonomic thumb depression
• Tactile wheel-thrown horizontal ridges that feel grounding in your palms
• Non-toxic, food-safe, lead-free speckled glaze
• Natural unglazed stoneware base highlighting the raw earth texture
• Holds comfortably 12-14 oz of your favorite brew

🌿 CARE & SUSTAINABILITY:
• Microwave and dishwasher safe (hand wash suggested for heirloom longevity)
• Ships in 100% plastic-free, recyclable packaging`,
  JSON.stringify([
    'terracotta mug', 'ceramic coffee cup', 'artisan pottery', 'wheel thrown mug', 'rustic stoneware',
    'cozy coffee lover', 'handmade tea cup', 'earthenware mug', 'studio pottery gift', 'boho kitchen decor',
    'coffee bar mug', 'lead free ceramic', 'clay drinkware'
  ]),
  'Home & Living > Kitchen & Dining > Drinkware > Mugs',
  28.00,
  34.00,
  'English',
  'gemma3:4b',
  JSON.stringify([
    { text: 'Handcrafted terracotta stoneware mug thrown on the wheel with mindful attention...', similarity: 0.92 }
  ]),
  now
);

// Product 2 (Etsy Draft)
insertProduct.run(prod2Id, 'Speckled Stoneware Pasta Bowl', 'Etsy', 'draft', now);
insertPhoto.run('photo-2', prod2Id, photoPath2, 600, 600);
insertListing.run(
  'list-demo-2',
  prod2Id,
  'Speckled Stoneware Pasta Bowl | Shallow Artisan Ceramic Serving Dish',
  `Generously wide and shallow, this handcrafted ceramic pasta bowl is designed for comforting grain bowls, fresh salads, and handmade pasta.

FEATURES:
• High-fire stoneware clay with organic speckled cream glaze
• Wide shallow rim designed for beautiful culinary presentation
• Durable, chip-resistant studio build

CARE & PACKAGING:
• Microwave, oven, and dishwasher safe
• Hand-packed with recycled biodegradable cushioning`,
  JSON.stringify([
    'pasta bowl', 'stoneware bowl', 'ceramic serving dish', 'salad bowl', 'dinnerware',
    'artisan pottery', 'kitchen gift', 'shallow bowl', 'earthenware bowl', 'foodie gift'
  ]),
  'Home & Living > Kitchen & Dining > Dining & Serving > Bowls',
  36.00,
  42.00,
  'English',
  'gemma3:4b',
  JSON.stringify([]),
  now
);

// Product 3 (eBay Sold)
insertProduct.run(prod3Id, 'Carved Teakwood Serving Spoon', 'eBay', 'sold', now);
insertPhoto.run('photo-3', prod3Id, photoPath3, 600, 600);
insertListing.run(
  'list-demo-3',
  prod3Id,
  'Hand Carved Teakwood Kitchen Spoon Artisan Wooden Cooking Server Salad Toss',
  `Individually hand-carved cooking and serving spoon made from sustainably reclaimed teakwood. Finished with organic food-safe walnut oil.

SPECIFICATIONS:
- Material: Solid reclaimed teak wood
- Length: 11.5 inches
- Treatment: 100% natural cold-pressed food safe oil
- Condition: Brand New Handmade`,
  JSON.stringify(['teak spoon', 'wooden utensil', 'cooking spoon', 'salad servers', 'handmade wood']),
  'Home & Garden > Kitchen, Dining & Bar > Cutlery > Cooking Spoons',
  18.50,
  22.00,
  'English',
  'gemma3:4b',
  JSON.stringify([]),
  now
);

// 4. Seed 3 Sample Receipts & Line Items
db.prepare('DELETE FROM receipts').run(); // Cascades receipt_items

const insertReceipt = db.prepare(`
  INSERT INTO receipts (id, vendor, date, total, currency, raw_json, image_path, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertItem = db.prepare(`
  INSERT INTO receipt_items (id, receipt_id, description, qty, unit_price, product_id, is_overhead)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

// Receipt 1
const r1Id = 'receipt-demo-1';
insertReceipt.run(r1Id, 'ClayWorks Artisan Ceramic Supplies', '2026-09-15', 121.00, 'USD', '{}', 'receipt_clayworks.jpg', now);
insertItem.run(crypto.randomUUID(), r1Id, 'High-Fire Stoneware Clay 25kg (B-Mix)', 2, 28.50, prod1Id, 0); // Allocated to Prod 1
insertItem.run(crypto.randomUUID(), r1Id, 'Matte Terracotta Dipping Glaze 1 Gal', 1, 42.00, prod1Id, 0); // Allocated to Prod 1
insertItem.run(crypto.randomUUID(), r1Id, 'Kraft Shipping Boxes Pack of 20', 1, 22.00, null, 1); // Overhead

// Receipt 2
const r2Id = 'receipt-demo-2';
insertReceipt.run(r2Id, 'Kiln & Mineral Raw Materials Co.', '2026-09-22', 84.50, 'USD', '{}', 'receipt_minerals.jpg', now);
insertItem.run(crypto.randomUUID(), r2Id, 'Speckled Sand Glaze Powder 5lb', 1, 48.00, prod2Id, 0); // Allocated to Prod 2
insertItem.run(crypto.randomUUID(), r2Id, 'Kiln Shelf Wash Compound 5lb', 1, 24.50, null, 1); // Overhead
insertItem.run(crypto.randomUUID(), r2Id, 'Thermal Heat Gloves Heavy Duty', 1, 12.00, null, 1); // Overhead

// Receipt 3
const r3Id = 'receipt-demo-3';
insertReceipt.run(r3Id, 'EcoCraft Sustainable Mailers', '2026-10-02', 45.00, 'USD', '{}', 'receipt_boxes.jpg', now);
insertItem.run(crypto.randomUUID(), r3Id, 'Honeycomb Protective Padding Roll 50m', 1, 28.00, null, 1);
insertItem.run(crypto.randomUUID(), r3Id, 'Water-Activated Kraft Tape 375ft', 1, 17.00, null, 1);

// 5. Seed 5 Cultural Glossary Terms
db.prepare('DELETE FROM glossary').run();
const insertGlossary = db.prepare('INSERT INTO glossary (id, term, translation, language) VALUES (?, ?, ?, ?)');

insertGlossary.run(crypto.randomUUID(), 'Kasuti', 'कसूती', 'Hindi');
insertGlossary.run(crypto.randomUUID(), 'Bidriware', 'बिदरीवेयर', 'Hindi');
insertGlossary.run(crypto.randomUUID(), 'Ragi', 'रागी', 'Hindi');
insertGlossary.run(crypto.randomUUID(), 'Kasuti', 'ಕಸೂತಿ', 'Kannada');
insertGlossary.run(crypto.randomUUID(), 'Channapatna', 'ಚನ್ನಪಟ್ಟಣ', 'Kannada');

// 6. Seed 3 Arena Results
db.prepare('DELETE FROM arena_results').run();
const insertArena = db.prepare(`
  INSERT INTO arena_results (id, model_a, model_b, winner, latency_a_ms, latency_b_ms, tps_a, tps_b, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

insertArena.run(crypto.randomUUID(), 'gemma3:4b', 'llama3.2-vision', 'gemma3:4b', 1350, 1780, 27.8, 22.1, new Date(Date.now() - 3600000 * 24).toISOString());
insertArena.run(crypto.randomUUID(), 'gemma3:4b', 'llama3.2-vision', 'llama3.2-vision', 1420, 1650, 26.5, 24.0, new Date(Date.now() - 3600000 * 12).toISOString());
insertArena.run(crypto.randomUUID(), 'gemma3:4b', 'llama3.2-vision', 'gemma3:4b', 1290, 1820, 29.2, 20.8, new Date().toISOString());

console.log('Seed completed successfully!');
console.log('Summary:');
console.log('- 10 past listings embedded with style profile computed');
console.log('- 3 demo products with sample photos and listings (Etsy listed, Etsy draft, eBay sold)');
console.log('- 3 sample receipts with itemized material allocations and overhead');
console.log('- 5 Indian handicraft glossary terms');
console.log('- 3 model arena benchmark runs');
db.close();
