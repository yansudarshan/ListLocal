import db from './db';
import crypto from 'crypto';

const ALLOWED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  'host.docker.internal',
  '::1',
  '[::1]',
]);

export function isAllowedHost(hostname: string): boolean {
  if (!hostname) return false;
  const cleanHost = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  return (
    ALLOWED_HOSTS.has(cleanHost) ||
    cleanHost === 'localhost' ||
    cleanHost === '127.0.0.1' ||
    cleanHost === 'host.docker.internal'
  );
}

export function recordBlockedAttempt(host: string): void {
  try {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    db.prepare('INSERT INTO network_blocks (id, host, created_at) VALUES (?, ?, ?)').run(id, host, createdAt);
  } catch (err) {
    console.error('Failed to record network block to database:', err);
  }
}

export function getBlockedCount(): number {
  try {
    const row = db.prepare('SELECT COUNT(*) as count FROM network_blocks').get() as { count: number };
    return row?.count ?? 0;
  } catch {
    return 0;
  }
}

export function getBlockedLogs(limit = 50): Array<{ id: string; host: string; created_at: string }> {
  try {
    return db
      .prepare('SELECT id, host, created_at FROM network_blocks ORDER BY created_at DESC LIMIT ?')
      .all(limit) as Array<{ id: string; host: string; created_at: string }>;
  } catch {
    return [];
  }
}

/**
 * safeFetch: The ONLY authorized way server code makes HTTP requests.
 * Blocks any attempt to reach non-local hosts and records it to network_blocks.
 */
export async function safeFetch(
  input: string | URL | Request,
  init?: RequestInit
): Promise<Response> {
  let urlString = '';
  if (typeof input === 'string') {
    urlString = input;
  } else if (input instanceof URL) {
    urlString = input.toString();
  } else if (input && typeof input === 'object' && 'url' in input) {
    urlString = (input as Request).url;
  }

  let parsedUrl: URL;
  try {
    // If it's a relative URL, resolve against localhost
    parsedUrl = new URL(urlString, 'http://localhost:3000');
  } catch {
    recordBlockedAttempt('invalid-url');
    throw new Error(`[safeFetch] Invalid URL attempted: ${urlString}`);
  }

  const hostname = parsedUrl.hostname;

  if (!isAllowedHost(hostname)) {
    recordBlockedAttempt(hostname);
    throw new Error(
      `[safeFetch] Blocked outbound request to external host "${hostname}". ListLocal operates strictly in 100% offline/local-first mode.`
    );
  }

  return globalThis.fetch(input, init);
}

export default safeFetch;
