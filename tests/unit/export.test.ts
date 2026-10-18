import { describe, it, expect } from 'vitest';
import { exportToEtsyCsv, exportToEBayCsv, exportListingsToCSV } from '@/lib/export';

describe('CSV Export Engine', () => {
  const sampleListings = [
    {
      id: 'list-1',
      productId: 'prod-1',
      productName: 'Ceramic Mug',
      title: 'Handcrafted Terracotta Mug, Ceramic Cup with "Special" Glaze',
      description: 'First line\nSecond line with, commas and "quotes".',
      tags: ['mug', 'ceramic', 'handmade pottery'],
      category: 'Home & Living > Mugs',
      priceMin: 28.5,
      priceMax: 35.0,
      status: 'listed',
      platform: 'Etsy',
      materials: ['Clay', 'Glaze'],
      createdAt: '2026-10-16',
    },
    {
      id: 'list-2',
      productId: 'prod-2',
      productName: 'Clay Vase',
      title: 'A'.repeat(200), // Exceeds character limits
      description: 'Simple vase description',
      tags: ['vase'],
      category: 'Pottery',
      priceMin: 45.0,
      priceMax: 50.0,
      status: 'draft',
      platform: 'eBay',
      materials: ['Terracotta'],
      createdAt: '2026-10-16',
    },
  ];

  it('exports to Etsy format with proper headers and escaping', () => {
    const csv = exportToEtsyCsv(sampleListings);
    const lines = csv.split('\r\n');

    expect(lines[0]).toBe('Title,Description,Price,Quantity,Tags,Materials,Category,SKU,Status,Created At');
    expect(lines.length).toBe(3);

    // Assert quotation and comma escaping in first item
    expect(lines[1]).toContain('""Special"" Glaze');
    expect(lines[1]).toContain('28.50');
    expect(lines[1]).toContain('mug, ceramic, handmade pottery');

    // Assert title truncation to 140 chars in second item
    const row2Parts = lines[2].split(',');
    // Second item title should be truncated to 140 chars
    expect(row2Parts[0].length).toBeLessThanOrEqual(142); // 140 chars + quotes
  });

  it('exports to eBay format with proper eBay columns and 80-char limit', () => {
    const csv = exportToEBayCsv(sampleListings);
    const lines = csv.split('\r\n');

    expect(lines[0]).toBe('Action(SiteID=US|Country=US|Currency=USD),CustomLabel (SKU),Title,Category,StartPrice,Quantity,Description,ItemSpecifics,Format');
    expect(lines[1]).toContain('"Add"');
    expect(lines[1]).toContain('"prod-1"');
    expect(lines[1]).toContain('FixedPrice');

    // Title in second item truncated to 80 chars
    const row2 = lines[2];
    expect(row2).toContain('A'.repeat(80));
    expect(row2).not.toContain('A'.repeat(81));
  });

  it('exportListingsToCSV selects proper format', () => {
    const etsyCsv = exportListingsToCSV(sampleListings, 'Etsy');
    expect(etsyCsv).toContain('Title,Description,Price');

    const ebayCsv = exportListingsToCSV(sampleListings, 'eBay');
    expect(ebayCsv).toContain('Action(SiteID=US|Country=US|Currency=USD)');
  });
});
