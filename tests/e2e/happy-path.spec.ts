import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('ListLocal Happy Path E2E Flow (MOCK_LLM Mode)', () => {
  test('New Listing -> Upload Photo -> Generate in Voice -> Save -> View in Library', async ({ page }) => {
    // 1. Open New Listing page
    await page.goto('/new');
    await expect(page).toHaveTitle(/ListLocal/);
    await expect(page.getByRole('heading', { name: 'New Product Listing' })).toBeVisible();

    // 2. Fill in product name
    const nameInput = page.getByPlaceholder('e.g. Speckled Terracotta Mug');
    await nameInput.fill('Handcrafted Terracotta Artisan Cup');

    // 3. Upload sample photo
    const fixturePath = path.resolve(__dirname, 'fixtures/mug.png');
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(fixturePath);

    // Verify preview is visible
    await expect(page.locator('img[alt="Product 1"]')).toBeVisible({ timeout: 5000 });

    // 4. Click Generate button
    const generateBtn = page.getByRole('button', { name: /Generate Listing in My Voice/i });
    await expect(generateBtn).toBeEnabled();
    await generateBtn.click();

    // 5. Verify generation completes and fields are populated
    await expect(page.getByText('Generated Listing Copy')).toBeVisible({ timeout: 20000 });
    const titleInput = page.locator('input[value*="Terracotta"]').last();
    await expect(titleInput).toBeVisible();

    // 6. Save to Library
    const saveBtn = page.getByRole('button', { name: /Save to Library/i });
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    // 7. Verify redirection to Library and presence of the saved listing
    await page.waitForURL('**/library', { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Listing Library' })).toBeVisible();
    await expect(page.getByText(/Terracotta/i).first()).toBeVisible();
  });
});
