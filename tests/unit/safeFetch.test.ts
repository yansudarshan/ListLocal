import { describe, it, expect } from 'vitest';
import { safeFetch, isAllowedHost, getBlockedCount, getBlockedLogs } from '@/lib/safeFetch';
import db from '@/lib/db';

describe('safeFetch Outbound Isolation & Security Proof', () => {
  it('allows strictly local hostnames', () => {
    expect(isAllowedHost('localhost')).toBe(true);
    expect(isAllowedHost('127.0.0.1')).toBe(true);
    expect(isAllowedHost('host.docker.internal')).toBe(true);
    expect(isAllowedHost('::1')).toBe(true);
  });

  it('rejects external hostnames and remote IPs', () => {
    expect(isAllowedHost('api.openai.com')).toBe(false);
    expect(isAllowedHost('google.com')).toBe(false);
    expect(isAllowedHost('anthropic.com')).toBe(false);
    expect(isAllowedHost('142.250.190.46')).toBe(false);
    expect(isAllowedHost('tracking.analytics.io')).toBe(false);
  });

  it('blocks outbound requests to external domains and logs to network_blocks', async () => {
    const initialBlockedCount = getBlockedCount();

    await expect(safeFetch('https://api.openai.com/v1/chat/completions')).rejects.toThrow(
      /Blocked outbound request to external host "api.openai.com"/
    );

    const newBlockedCount = getBlockedCount();
    expect(newBlockedCount).toBe(initialBlockedCount + 1);

    const logs = getBlockedLogs(5);
    expect(logs.some((log) => log.host === 'api.openai.com')).toBe(true);
  });

  it('blocks telemetry and cloud services', async () => {
    await expect(safeFetch('https://telemetry.segment.io/v1/t')).rejects.toThrow(/Blocked outbound request/);

    const logs = getBlockedLogs(5);
    expect(logs.some((log) => log.host === 'telemetry.segment.io')).toBe(true);
  });
});
