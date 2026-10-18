import crypto from 'crypto';
import db from './db';
import { extractVisionAttributes, generateListing } from './ollama';

export interface BatchItemPayload {
  productName: string;
  images: string[];
  platform?: 'Etsy' | 'eBay' | 'Instagram';
  toneValue?: number;
  language?: string;
  sellerNotes?: string;
}

export interface BatchJobPayload {
  items: BatchItemPayload[];
  retryCount?: number;
}

export interface IBatchWorker {
  processNextJob(): Promise<void>;
  enqueueJob(items: BatchItemPayload[]): string;
}

class SQLiteBatchWorker implements IBatchWorker {
  private isWorking = false;

  constructor() {
    this.resumeHangingJobs();
  }

  // Resumes jobs that were interrupted in 'running' state during a server restart
  public resumeHangingJobs(): void {
    try {
      db.prepare(`
        UPDATE jobs 
        SET status = 'queued', updated_at = ? 
        WHERE status = 'running'
      `).run(new Date().toISOString());
    } catch (err) {
      console.error('Failed to reset running jobs on startup:', err);
    }
  }

  public enqueueJob(items: BatchItemPayload[]): string {
    const jobId = crypto.randomUUID();
    const now = new Date().toISOString();
    const payload: BatchJobPayload = { items, retryCount: 0 };

    db.prepare(`
      INSERT INTO jobs (id, type, payload_json, status, progress, error, created_at, updated_at)
      VALUES (?, 'batch_listing', ?, 'queued', 0, NULL, ?, ?)
    `).run(jobId, JSON.stringify(payload), now, now);

    // Trigger processing asynchronously
    setImmediate(() => this.processNextJob());

    return jobId;
  }

  public async processNextJob(): Promise<void> {
    if (this.isWorking) return;

    const job = db.prepare(`
      SELECT id, type, payload_json, status, progress, error
      FROM jobs 
      WHERE status = 'queued' 
      ORDER BY created_at ASC 
      LIMIT 1
    `).get() as { id: string; type: string; payload_json: string; status: string } | undefined;

    if (!job) {
      return;
    }

    this.isWorking = true;
    const now = new Date().toISOString();

    db.prepare(`UPDATE jobs SET status = 'running', updated_at = ? WHERE id = ?`).run(now, job.id);

    try {
      const payload = JSON.parse(job.payload_json) as BatchJobPayload;
      const items = payload.items || [];
      const total = items.length;

      for (let i = 0; i < total; i++) {
        const item = items[i];

        // Step A: Extract vision attributes
        const attributes = await extractVisionAttributes(item.images);

        // Step B: Generate listing
        const listing = await generateListing({
          attributes,
          productName: item.productName,
          platform: item.platform || 'Etsy',
          toneValue: item.toneValue ?? 50,
          language: item.language || 'English',
          sellerNotes: item.sellerNotes,
        });

        // Step C: Persist generated listing and product to library
        const productId = crypto.randomUUID();
        const listingId = crypto.randomUUID();
        const timestamp = new Date().toISOString();

        const insertProduct = db.prepare(`
          INSERT INTO products (id, name, platform, status, created_at)
          VALUES (?, ?, ?, 'draft', ?)
        `);

        const insertListing = db.prepare(`
          INSERT INTO listings (
            id, product_id, title, description, tags_json, category,
            price_min, price_max, language, model_used, voice_sources_json, edited, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
        `);

        const insertPhoto = db.prepare(`
          INSERT INTO photos (id, product_id, path, width, height)
          VALUES (?, ?, ?, 1024, 1024)
        `);

        const tx = db.transaction(() => {
          insertProduct.run(productId, item.productName || listing.title.slice(0, 50), item.platform || 'Etsy', timestamp);
          insertListing.run(
            listingId,
            productId,
            listing.title,
            listing.description,
            JSON.stringify(listing.tags),
            listing.category || 'Craft',
            listing.price_min ?? null,
            listing.price_max ?? null,
            item.language || 'English',
            'gemma3:4b',
            JSON.stringify(listing.voice_sources || []),
            timestamp
          );

          for (const img of item.images) {
            insertPhoto.run(crypto.randomUUID(), productId, img);
          }
        });

        tx();

        // Update progress
        const currentProgress = Math.round(((i + 1) / total) * 100);
        db.prepare(`UPDATE jobs SET progress = ?, updated_at = ? WHERE id = ?`).run(
          currentProgress,
          new Date().toISOString(),
          job.id
        );
      }

      // Mark job as done
      db.prepare(`UPDATE jobs SET status = 'done', progress = 100, updated_at = ? WHERE id = ?`).run(
        new Date().toISOString(),
        job.id
      );
    } catch (err: any) {
      console.error(`Batch job ${job.id} failed:`, err);
      let payload: BatchJobPayload = { items: [], retryCount: 0 };
      try {
        payload = JSON.parse(job.payload_json);
      } catch {}

      const retries = (payload.retryCount || 0) + 1;
      if (retries <= 2) {
        // Retry
        payload.retryCount = retries;
        db.prepare(`
          UPDATE jobs 
          SET status = 'queued', payload_json = ?, error = ?, updated_at = ? 
          WHERE id = ?
        `).run(JSON.stringify(payload), `Retry ${retries}/2: ${err.message}`, new Date().toISOString(), job.id);
      } else {
        // Max retries exceeded
        db.prepare(`
          UPDATE jobs 
          SET status = 'failed', error = ?, updated_at = ? 
          WHERE id = ?
        `).run(err.message || 'Batch execution failed', new Date().toISOString(), job.id);
      }
    } finally {
      this.isWorking = false;
      // Continue next job if any
      setImmediate(() => this.processNextJob());
    }
  }
}

// Global singleton worker
declare global {
  // eslint-disable-next-line no-var
  var __batchWorker: IBatchWorker | undefined;
}

export const batchWorker: IBatchWorker =
  global.__batchWorker || (global.__batchWorker = new SQLiteBatchWorker());

export default batchWorker;
