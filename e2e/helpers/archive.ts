import type { Download, Page } from '@playwright/test';

// Use the public portability boundary, not the storage adapter's layout.
export const downloadArchive = async (page: Page): Promise<Download> => {
  await page
    .getByRole('navigation', { name: 'Secondary navigation' })
    .getByRole('button', { name: 'Export', exact: true })
    .click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export now' }).click();
  return pending;
};

// A fresh app instance loads persisted data, not the source page's in-memory
// archive. Its separate page also leaves the draft under test undisturbed.
export const readPersistedArchive = async (page: Page): Promise<string> => {
  const observer = await page.context().newPage();
  try {
    await observer.goto(page.url());
    const download = await downloadArchive(observer);
    const stream = await download.createReadStream();
    if (!stream)
      throw new Error('Archive export did not produce a readable file');
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks).toString('utf8');
  } finally {
    await observer.close();
  }
};

// This fault injector intentionally targets the current browser adapter.
// Keep adapter-specific failure simulation here, separate from archive assertions.
export const failNextArchiveWrite = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function () {
      IDBObjectStore.prototype.put = put;
      throw new DOMException(
        'Test storage quota exceeded',
        'QuotaExceededError',
      );
    };
  });
};
