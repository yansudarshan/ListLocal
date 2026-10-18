export interface ExportableListing {
  id: string;
  productId: string;
  productName: string;
  title: string;
  description: string;
  tags: string[];
  category?: string;
  priceMin?: number | null;
  priceMax?: number | null;
  status: string;
  platform: string;
  materials?: string[];
  createdAt: string;
}

function escapeCsvField(field: unknown): string {
  if (field === null || field === undefined) return '""';
  const str = String(field);
  // If field contains quote, comma, or newline, escape quotes by doubling them and enclose in quotes
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

export function exportToEtsyCsv(listings: ExportableListing[]): string {
  const headers = [
    'Title',
    'Description',
    'Price',
    'Quantity',
    'Tags',
    'Materials',
    'Category',
    'SKU',
    'Status',
    'Created At',
  ];

  const rows = listings.map((item) => {
    const price = item.priceMin ? item.priceMin.toFixed(2) : '0.00';
    const tagsStr = (item.tags || []).slice(0, 13).join(', ');
    const materialsStr = (item.materials || []).join(', ');

    return [
      escapeCsvField(item.title.slice(0, 140)),
      escapeCsvField(item.description),
      escapeCsvField(price),
      escapeCsvField(1),
      escapeCsvField(tagsStr),
      escapeCsvField(materialsStr),
      escapeCsvField(item.category || 'Craft Supplies & Tools'),
      escapeCsvField(item.productId || item.id),
      escapeCsvField(item.status),
      escapeCsvField(item.createdAt),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}

export function exportToEBayCsv(listings: ExportableListing[]): string {
  const headers = [
    'Action(SiteID=US|Country=US|Currency=USD)',
    'CustomLabel (SKU)',
    'Title',
    'Category',
    'StartPrice',
    'Quantity',
    'Description',
    'ItemSpecifics',
    'Format',
  ];

  const rows = listings.map((item) => {
    const price = item.priceMin ? item.priceMin.toFixed(2) : '0.00';
    const specifics = (item.tags || []).map((t) => `Keyword=${t}`).join('|');

    return [
      escapeCsvField('Add'),
      escapeCsvField(item.productId || item.id),
      escapeCsvField(item.title.slice(0, 80)),
      escapeCsvField(item.category || 'Collectibles'),
      escapeCsvField(price),
      escapeCsvField(1),
      escapeCsvField(item.description),
      escapeCsvField(specifics),
      escapeCsvField('FixedPrice'),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}

export function exportListingsToCSV(
  listings: ExportableListing[],
  format: 'Etsy' | 'eBay' | 'Generic' = 'Etsy'
): string {
  if (format === 'eBay') {
    return exportToEBayCsv(listings);
  }
  return exportToEtsyCsv(listings);
}
