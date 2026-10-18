import { VisionExtraction } from './schemas/vision';
import { ListingOutput } from './schemas/listing';
import { ReceiptExtraction } from './schemas/receipt';
import { TranslationOutput } from './schemas/translation';

/**
 * Deterministically generates a normalized 128-dim vector from a string.
 * Similar texts share similar vector directions, making cosine similarity tests authentic.
 */
export function mockEmbed(text: string): number[] {
  const DIM = 128;
  const vec = new Array(DIM).fill(0);
  const clean = text.toLowerCase().trim();

  for (let i = 0; i < clean.length; i++) {
    const charCode = clean.charCodeAt(i);
    const bucket = (charCode * 31 + i * 17) % DIM;
    vec[bucket] += (charCode % 10) + 1;
  }

  // Normalize
  let norm = 0;
  for (let i = 0; i < DIM; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm) || 1;

  for (let i = 0; i < DIM; i++) vec[i] = Number((vec[i] / norm).toFixed(6));
  return vec;
}

export function mockVisionExtraction(): VisionExtraction {
  return {
    item_type: 'Handcrafted Terracotta Ceramic Coffee Mug',
    colors: ['Earthy Terracotta', 'Speckled Sand Cream'],
    materials: ['High-Fire Stoneware Clay', 'Lead-Free Matte Glaze'],
    style_keywords: ['Artisan Pottery', 'Rustic Modern', 'Wabi-Sabi', 'Minimalist Kitchen'],
    visible_text: '',
    condition: 'Handmade',
    notable_details: [
      'Ergonomic carved thumb rest on handle',
      'Wheel-thrown tactile ribbing around exterior',
      'Exposed raw terracotta bottom foot ring'
    ],
    confidence: {
      item_type: 0.96,
      colors: 0.92,
      materials: 0.88,
      style_keywords: 0.90,
      visible_text: 0.95,
      condition: 0.94,
      notable_details: 0.89
    }
  };
}

export function mockGenerateListing(platform: 'Etsy' | 'eBay' | 'Instagram', priceMin: number | null = null, priceMax: number | null = null): ListingOutput {
  if (platform === 'eBay') {
    return {
      title: 'Terracotta Ceramic Coffee Mug Handmade Rustic Stoneware Pottery Studio Cup',
      description: `Start your mornings with this handcrafted stoneware ceramic coffee mug, individually wheel-thrown with tactile rib grooves and an earthy terracotta finish.

FEATURES & SPECIFICATIONS:
- Material: High-fire stoneware clay with food-safe lead-free matte glaze
- Capacity: Approximately 12 fl oz (350 ml)
- Texture: Tactile ribbed exterior with an exposed raw clay base
- Ergonomics: Hand-sculpted handle with comfortable thumb groove
- Origin: Studio handcrafted in small batches

CARE & SHIPPING:
- Microwave and dishwasher safe; handwashing recommended for maximum longevity
- Securely packed with biodegradable honeycomb padding and corrugated shipping box`,
      tags: ['ceramic mug', 'stoneware pottery', 'handmade tea cup', 'wheel thrown clay', 'artisan kitchenware', 'studio pottery', 'terracotta cup', 'coffee lover gift'],
      category: 'Pottery & Glass > Cookware, Dinnerware & Serveware > Mugs',
      price_min: priceMin,
      price_max: priceMax,
      voice_sources: [
        { text: 'Handcrafted with rustic clay and soothing earth tones...', similarity: 0.88 },
        { text: 'Each wheel-thrown mug carries its own distinct charm...', similarity: 0.82 }
      ]
    };
  }

  // Etsy default
  return {
    title: 'Handmade Terracotta Ceramic Coffee Mug | Rustic Wheel Thrown Stoneware Tea Cup | Artisan Gift',
    description: `Elevate your daily coffee ritual with this artisan wheel-thrown ceramic mug, crafted from durable stoneware and finished in warm terracotta tones.

✨ PRODUCT HIGHLIGHTS:
• Hand-sculpted handle contoured with an ergonomic thumb depression
• Tactile wheel-thrown horizontal ridges that feel grounding in your palms
• Non-toxic, food-safe, lead-free speckled glaze
• Natural unglazed stoneware base highlighting the raw earth texture
• Holds comfortably 12-14 oz of your favorite brew

🌿 CARE & SUSTAINABILITY:
• Microwave and dishwasher safe (hand wash suggested for heirloom longevity)
• Ships in 100% plastic-free, recyclable packaging

Every piece is individually handcrafted, celebrating organic nuances and timeless craftsmanship.`,
    tags: [
      'terracotta mug',
      'ceramic coffee cup',
      'artisan pottery',
      'wheel thrown mug',
      'rustic stoneware',
      'cozy coffee lover',
      'handmade tea cup',
      'earthenware mug',
      'studio pottery gift',
      'boho kitchen decor',
      'coffee bar mug',
      'lead free ceramic',
      'clay drinkware'
    ],
    category: 'Home & Living > Kitchen & Dining > Drinkware > Mugs',
    price_min: priceMin,
    price_max: priceMax,
    voice_sources: [
      { text: 'Handmade with mindful patience and natural raw clay finishes...', similarity: 0.91 },
      { text: 'Rooted in timeless studio pottery traditions for intentional living...', similarity: 0.84 }
    ]
  };
}

export function mockScanReceipt(): ReceiptExtraction {
  return {
    vendor: 'ClayWorks Artisan Ceramic Supplies',
    date: '2026-09-12',
    line_items: [
      {
        description: 'Stoneware Clay 25kg (B-Mix with Grog)',
        qty: 2,
        unit_price: 28.50
      },
      {
        description: 'Matte Terracotta Dipping Glaze 1 Gallon',
        qty: 1,
        unit_price: 42.00
      },
      {
        description: 'Recyclable Kraft Protective Shipping Boxes (Bundle of 20)',
        qty: 1,
        unit_price: 22.00
      }
    ],
    total: 121.00, // 2 * 28.50 = 57 + 42 + 22 = 121.00 -> perfectly matches
    currency: 'USD'
  };
}

export function mockTranslate(
  targetLanguage: 'Hindi' | 'Kannada',
  glossaryTerms: Array<{ term: string; translation: string }> = []
): TranslationOutput {
  const preserved = glossaryTerms.map((g) => g.term);

  if (targetLanguage === 'Hindi') {
    return {
      translated_title: 'हस्तनिर्मित टेराकोटा सिरेमिक कॉफ़ी मग | देहाती स्टोनवेयर चाय कप',
      translated_description: `अपनी दैनिक कॉफ़ी की शुरुआत इस सुंदर हस्तनिर्मित सिरेमिक मग के साथ करें, जिसे प्राकृतिक मिट्टी से चाक पर ढाला गया है।

✨ विशेषताएं:
• टिकाऊ स्टोनवेयर मिट्टी और सुरक्षित फ़ूड-ग्रेड ग्लेज़
• हाथ से बना एर्गोनोमिक हैंडल जो पकड़ने में बेहद आरामदायक है
• 100% प्राकृतिक और पर्यावरण-अनुकूल पैकेजिंग
${preserved.length > 0 ? `\nसंरक्षित शिल्प शब्दावली: ${glossaryTerms.map((g) => `${g.term} (${g.translation})`).join(', ')}` : ''}`,
      translated_tags: ['हस्तनिर्मित मग', 'सिरेमिक कप', 'टेराकोटा बर्तन', 'चाय कप', 'शिल्पकार'],
      target_language: 'Hindi',
      preserved_terms: preserved
    };
  }

  return {
    translated_title: 'ಕೈಯಿಂದ ಮಾಡಿದ ಟೆರಾಕೋಟಾ ಸೆರಾಮಿಕ್ ಕಾಫಿ ಮಗ್ | ಸುಂದರವಾದ ಸ್ಟೋನ್‌ವೇರ್ ಚಹಾ ಕಪ್',
    translated_description: `ನಿಮ್ಮ ಮುಂಜಾನೆಯ ಕಾಫಿ ಸಮಯವನ್ನು ಈ ವಿಶಿಷ್ಟ ಕೈಯಿಂದ ತಯಾರಿಸಿದ ಸೆರಾಮಿಕ್ ಮಗ್‌ನೊಂದಿಗೆ ಇನ್ನಷ್ಟು ಆನಂದದಾಯಕವಾಗಿಸಿ.

✨ ಪ್ರಮುಖ ಲಕ್ಷಣಗಳು:
• ಸಾಂಪ್ರದಾಯಿಕ ಕುಂಬಾರಿಕೆ ಚಕ್ರದಲ್ಲಿ ನೈಸರ್ಗಿಕ ಜೇಡಿಮಣ್ಣಿನಿಂದ ರೂಪಿಸಲಾಗಿದೆ
• ಪರಿಸರ ಸ್ನೇಹಿ ಮತ್ತು ಆಹಾರ-ಸುರಕ್ಷಿತ ಮೆರುಗು
• ಹಿಡಿಯಲು ಸುಲಭವಾದ ವಿನ್ಯಾಸ
${preserved.length > 0 ? `\nರಕ್ಷಿತ ಪದಗಳು: ${glossaryTerms.map((g) => `${g.term} (${g.translation})`).join(', ')}` : ''}`,
    translated_tags: ['ಕೈಯಿಂದ ಮಾಡಿದ ಮಗ್', 'ಸೆರಾಮಿಕ್ ಕಾಫಿ ಕಪ್', 'ಕುಂಬಾರಿಕೆ ಕಲೆ', 'ಸುಂದರ ಗಿಫ್ಟ್'],
    target_language: 'Kannada',
    preserved_terms: preserved
  };
}
