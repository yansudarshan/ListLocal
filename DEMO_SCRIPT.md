# ListLocal: 2-Minute Click-by-Click Demo Script

This script walks through the complete end-to-end capabilities of **ListLocal** in 120 seconds. It can be run either against live local Ollama models or in deterministic offline test fixture mode (`MOCK_LLM=1`).

---

## ⏱️ Pre-Flight Setup (10 Seconds)

Ensure the demo database is seeded and the server is running:

```bash
npm run seed
npm run dev
```

Open your browser to: **`http://localhost:3000`**

---

## ⏱️ Act 1: The Zero-Egress Dashboard & Privacy Proof (20 Seconds)

1. **Observe the Live Isolation Badge (Bottom Footer)**:
   - Notice the footer badge reading `Running locally` and `Outbound requests blocked: 0`.
2. **Click "Privacy Proof" in the top navigation bar** (`/privacy`):
   - Scroll to the interactive firewall panel.
   - Click the green **"Simulate External Request"** button.
   - Watch `safeFetch` instantly intercept the unauthorized outbound call to `api.openai.com`, throwing a security exception and incrementing the live blocked counter.
   - Emphasize to the audience: *“Not a single byte of merchant data, photo metadata, or cost information can leave this machine.”*

---

## ⏱️ Act 2: Calibrating the Seller Voice (30 Seconds)

1. **Click "Voice Studio"** (`/voice`):
   - Notice the learned style profile: sentence cadence, emoji rate, bullet preference, and signature recurring phrases.
2. **Click "Load Sample Listings"** and click **"Calibrate Voice Profile"**:
   - Watch local embeddings compute in real time without cloud APIs or fine-tuning.
   - The profile updates immediately with calculated metrics and a tone summary (*"Balanced, accessible, artisan-focused"*).

---

## ⏱️ Act 3: Photo Cataloging with Strict Non-Fabrication (30 Seconds)

1. **Click "New Listing"** (`/new`):
   - Under **Product Photos**, drop a product photo or select `public/uploads/terracotta-mug.svg`.
   - Notice the automatic client-side resize to 1024px.
2. **Set Platform to "Etsy"** (or eBay) and adjust the Tone Slider.
3. **Click "Generate Listing in My Voice"**:
   - Watch the progress pipeline:
     1. *Reading photos...* (extracts verified colors, materials, item type).
     2. *Matching voice...* (computes cosine similarity against past listings, showing the top few-shot matches).
     3. *Writing listing...* (streams copy live via Server-Sent Events).
4. **Inspect the Result**:
   - Point out the **"Verify this"** badges on any low-confidence attributes.
   - Notice how title length adheres to Etsy's 140-character limit and exactly 13 tags are generated.
   - Notice how the pricing fields remain strictly `null` because no cost numbers were entered (strict anti-hallucination rule).
5. **Click "Save to Library"**.

---

## ⏱️ Act 4: Receipt Scanning & Margin-Aware Pricing (25 Seconds)

1. **Click "Receipts & Costs"** (`/receipts`):
   - Scroll to the **Extracted Receipt Line Items** table.
   - Show how the scanned invoice totals $121.00 and passes the **Math Verification check** (sum of items matches total).
2. **Select the Ceramic Mug in the Unit Cost Calculator**:
   - Review the automated direct unit cost breakdown ($15.70 materials + packaging + shipping + labor).
   - Review the **Suggested Selling Prices**:
     - 20% margin ($23.80)
     - 35% margin ($29.30)
     - 50% margin ($38.10)
   - Read the single-sentence LLM margin explanation: *“Pricing at $29.30 yields your target 35% net profit margin on a verified unit cost of $15.70.”*
   - Note the strict guarantee: **Zero invented competitor prices**.

---

## ⏱️ Act 5: Library & Multilingual Export (15 Seconds)

1. **Click "Library"** (`/library`):
   - View the freshly created listing in Grid or List view.
   - Notice the **"Healthy Margin"** badge (or red flag alert if margin is under 15%).
2. **Click the Translate Icon** (Languages) on any listing:
   - Select **Hindi** or **Kannada**.
   - Click **"Translate"**. Show how protected cultural terms from the Glossary (e.g., *Kasuti*, *Bidriware*) remain intact and pass the post-translation check.
3. **Click "Export Etsy CSV"**:
   - Download the clean, RFC-4180-compliant CSV ready for direct upload to Etsy Seller Central.

---

**End of Demo: Complete e-commerce back office running 100% locally on open weights.**
