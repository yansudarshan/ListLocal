# ListLocal: Local-First AI Back Office for Online Sellers

**ListLocal** is a 100% local-first AI back office for independent online merchants (Etsy artisans, eBay resellers, Instagram boutiques). It transforms raw product photos into high-converting e-commerce listings written in the seller's authentic brand voice, while providing receipt scanning, unit-cost itemization, and margin-aware pricing.

All artificial intelligence runs on open-weight models powered by [Ollama](https://ollama.com). No closed APIs, no cloud tokens, no monthly SaaS fees. **Seller data, unpublished photos, and supplier costs never leave the machine.**

---

## Key Features

### Phase 1: Core E-Commerce Automation
- **First-Run Wizard & Model Health (`/wizard`, `/api/health`)**:
  - Automatically verifies Ollama connectivity and model availability (`gemma3:4b`, `nomic-embed-text`).
  - Provides 1-click copy buttons for any missing model pull commands.
- **Seller Voice Learning Studio (`/voice`)**:
  - Calibrates brand voice from 5&ndash;30 past listings without complex fine-tuning.
  - Computes sentence cadence, emoji frequency, bullet-vs-prose preference, and top recurring phrases.
  - Generates local embeddings stored in SQLite for dynamic few-shot exemplar retrieval.
- **Strict Anti-Hallucination Vision Extraction (`/new`, `/api/extract`)**:
  - Vision model clinically extracts verified item types, materials, colors, and condition.
  - Low-confidence attributes (< 0.6) display visible **"Verify this"** warning badges with tooltips.
  - Prompts strictly forbid fabricating dimensions, materials, certifications, or competitor prices.
- **Personalized Listing Generation (`/new`, `/api/generate`)**:
  - Live Server-Sent Events (SSE) streaming with progress feedback (*"Reading photos...", "Matching voice...", "Writing..."*).
  - Platform-compliant character limits (Etsy 140 chars + 13 tags; eBay 80 chars + item specifics).
  - **Voice Match Panel** displaying which past listings influenced the copy with cosine similarity scores.
- **Listing Library & Platform Export (`/library`)**:
  - Responsive Grid and List views with live search and status filters (*draft*, *listed*, *sold*).
  - 1-click CSV export tailored for Etsy and eBay bulk upload standards.

### Phase 2: Autonomous Innovations
- **Zero-Egress Firewall & Privacy Proof (`/privacy`, `lib/safeFetch.ts`)**:
  - `safeFetch` intercepts and blocks any outbound server-side HTTP request to external domains.
  - Live persistent footer badge: `Running locally` and `Outbound requests blocked: N`.
  - Interactive simulator proving external network calls are blocked and logged to SQLite.
- **Receipt Scanner & True Cost Engine (`/receipts`, `lib/cost.ts`)**:
  - Scans supplier receipts and invoices (photos or PDFs) into itemized line items.
  - Math Sanity Check verifies if line items sum equals invoice total, flagging mismatches.
  - Allocates raw materials to products (including fractional usage like *"5m of 50m spool"*).
  - Calculates true cost per unit: allocated materials + packaging + shipping + platform fees + labor.
  - **Margin-Aware Pricing**: Suggested prices at 20%, 35%, and 50% margins with single-sentence verified explanations. Red flag warnings when margin < 15%.
- **Multilingual Craft Glossary (`/glossary`, `/api/translate`)**:
  - 1-click translation of listings to **Hindi** or **Kannada**.
  - Protected cultural glossary preserving regional terms (e.g., *Kasuti*, *Bidriware*, *Ragi*, *Channapatna*).
  - Post-translation verifier automatically audits that protected terms remain intact.
- **Model Arena & Live Benchmarking (`/arena`, `/api/arena/run`)**:
  - Toggle on New Listing to benchmark any two local vision models side by side.
  - Measures latency (ms), tokens/second (TPS), and persists seller win/loss votes to a live leaderboard.
- **Durable Batch Catalog Processing (`/batch`, `lib/worker.ts`)**:
  - Upload entire folders (subfolder per product) or multi-select prefixed files.
  - Durable SQLite queue processes items sequentially, surviving server restarts with automatic job resumption and retries (max 2).

---

## Quick Start in 3 Commands

```bash
# 1. Install dependencies
npm install

# 2. Seed demo products, past voice listings, receipts, and glossary
npm run seed

# 3. Start local development server
npm run dev
```

Open your browser to **`http://localhost:3000`**.

> **Offline Demo Mode**: ListLocal ships with `MOCK_LLM=1` by default in `.env`, allowing you to test all features and run e2e tests without downloading Ollama or models. To connect to real local models, set `MOCK_LLM=0` and run `ollama serve`.

---

## Environment Variables

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `OLLAMA_URL` | `http://localhost:11434` | Endpoint for the host Ollama inference daemon |
| `VISION_MODEL` | `gemma3:4b` | Primary vision model for attribute extraction & writing |
| `ARENA_MODEL_B` | `llama3.2-vision` | Secondary vision model for Model Arena comparisons |
| `EMBED_MODEL` | `nomic-embed-text` | Embedding model for semantic search & voice matching |
| `MOCK_LLM` | `0` (or `1` for offline) | Set to `1` to return deterministic local mock fixtures |
| `PORT` | `3000` | Port for the Next.js web application server |
| `DATA_DIR` | `./data` | Directory where SQLite `listlocal.db` is stored |

---

## Hardware Notes (Runs on 8GB RAM)

- **Optimized for Consumer Laptops**: ListLocal defaults to Google's `gemma3:4b` (4-billion parameter multimodal model), requiring only **~3.2GB of RAM/VRAM** with 4-bit quantization.
- **Zero Dedicated GPU Required**: Runs smoothly on Apple Silicon (M1/M2/M3/M4 unified memory) or standard x86 Intel/AMD CPUs.
- **Local Embedding Footprint**: `nomic-embed-text` requires less than **300MB of RAM**.
- **Inference Concurrency**: The in-process queue enforces a strict concurrency limit of **1**, preventing system memory thrashing and keeping your machine responsive.

---

## CSV Export Column Layouts

ListLocal exports standard RFC-4180-compliant CSV files directly importable into marketplace seller dashboards:

### Etsy Column Layout
1. `Title`: Listing headline (strictly capped at 140 characters).
2. `Description`: Formatted copy with hook, bullet features, and care guidelines.
3. `Price`: Minimum calculated selling price formatted to 2 decimals.
4. `Quantity`: Inventory count default (1).
5. `Tags`: Comma-separated list of up to 13 multi-word search tags.
6. `Materials`: Comma-separated list of confirmed physical materials.
7. `Category`: Suggested marketplace taxonomy.
8. `SKU`: Internal product identifier.
9. `Status`: Current state (*draft*, *listed*, *sold*).
10. `Created At`: ISO timestamp.

### eBay Column Layout
1. `Action(SiteID=US|Country=US|Currency=USD)`: `Add`.
2. `CustomLabel (SKU)`: Product SKU identifier.
3. `Title`: Keyword-optimized headline (strictly capped at 80 characters).
4. `Category`: eBay catalog taxonomy.
5. `StartPrice`: Target selling price.
6. `Quantity`: Available stock (1).
7. `Description`: Full product description copy.
8. `ItemSpecifics`: Pipe-separated specifics (`Keyword=value|...`).
9. `Format`: `FixedPrice`.

---

## Architectural Decisions

| Decision | Choice Made | Rationale |
| :--- | :--- | :--- |
| **Concurrency Limit** | In-process mutex queue (`concurrency: 1`) in `lib/queue.ts` | Local consumer GPUs/CPUs choke if multiple vision tasks run simultaneously. A serial queue prevents out-of-memory crashes. |
| **Outbound HTTP** | Exclusive `lib/safeFetch.ts` wrapper | Guarantees zero cloud data leaks by blocking any request not addressed to `localhost`, `127.0.0.1`, or `host.docker.internal`. |
| **Vector Storage** | Storing JSON embeddings in SQLite with TypeScript cosine similarity | Eliminates native C-extension compilation issues across OS platforms while providing sub-millisecond similarity queries for seller catalog sizes (5&ndash;500 items). |
| **Photo Resizing** | Client-side HTML5 Canvas resize to max 1024px before transmission | Reduces base64 payload size by 85%, speeding up vision inference without degrading text or attribute recognition. |
| **SSE Streaming** | Native Web `ReadableStream` & Server-Sent Events | Delivers progressive UX feedback during LLM generation without WebSockets or cloud dependencies. |
| **Batch Worker** | SQLite-backed job queue with automatic restart resumption in `lib/worker.ts` | Abstracted behind clean interface so merchants can queue folders of photos reliably; jobs stuck in `running` status automatically reset to `queued` if the process restarts. |
| **Strict Anti-Hallucination** | Universal `FORBIDDEN_FABRICATION_DIRECTIVE` in all prompts | When cost data is absent, `price_min` and `price_max` are strictly forced to `null`, preventing invented market rates. |

---

## Troubleshooting

### 1. Ollama is Not Running
- **Symptom**: Setup wizard or dashboard shows *"Ollama Engine Offline"*.
- **Fix**: Open your terminal and run `ollama serve`. Verify reachability by running `curl http://localhost:11434/api/tags`.
- **Alternative**: For immediate testing without Ollama, ensure `MOCK_LLM=1` is set in your `.env` file.

### 2. Missing Vision or Embedding Models
- **Symptom**: Dashboard flags missing models.
- **Fix**: Run the exact pull commands shown on the Setup Wizard:
  ```bash
  ollama pull gemma3:4b
  ollama pull nomic-embed-text
  ollama pull llama3.2-vision
  ```

### 3. Docker Networking with Host Ollama
- **Symptom**: When running via `docker-compose up`, the app cannot reach Ollama.
- **Fix**: Ollama runs on the host machine. Ensure `docker-compose.yml` uses `http://host.docker.internal:11434` and includes `extra_hosts: ["host.docker.internal:host-gateway"]`. On Linux hosts, ensure `OLLAMA_HOST=0.0.0.0` is configured in systemd.

### 4. Slow Inference on Older Hardware
- **Fix**: Check `OLLAMA_NUM_PARALLEL=1` in your environment. Use `gemma3:4b` rather than larger 8B+ vision models. Ensure photos are resized to 1024px or below.

---

## Test Suites

```bash
# Run all Vitest unit tests (34 tests covering cost math, Zod schemas, prompts, safeFetch, CSV)
npm test

# Run TypeScript strict typecheck
npm run typecheck

# Run Playwright E2E happy-path test
npm run test:e2e
```
