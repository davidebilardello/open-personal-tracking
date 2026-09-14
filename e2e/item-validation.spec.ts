import { expect, test } from '@playwright/test';
import {
  failNextArchiveWrite,
  readPersistedArchive,
} from './helpers/archive.js';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'open-personal-tracking.preferences.v1',
      JSON.stringify({ onboardingCompleted: true }),
    );
  });
  await page.goto('/app-shell');
  await page.getByRole('button', { name: 'New item', exact: true }).click();
});

test('required title and rating errors preserve the draft and archive until corrected', async ({
  page,
}) => {
  const drawer = page.getByRole('dialog', { name: 'New item' });
  const title = drawer.getByRole('textbox', { name: 'Title', exact: true });
  const rating = drawer.getByLabel('Rating', { exact: true });
  await title.fill('   ');
  await drawer
    .getByLabel('Description', { exact: true })
    .fill('Keep this draft');
  await rating.fill('6');
  const before = await readPersistedArchive(page);
  await drawer.getByRole('button', { name: 'Save item' }).click();
  await expect(title).toBeFocused();
  await expect(title).toHaveAttribute('required', '');
  await expect(title).toHaveAttribute('aria-invalid', 'true');
  await expect(title).toHaveAccessibleDescription('Enter a title.');
  await expect(rating).toHaveAccessibleDescription(
    /Optional.*0.*5.*Enter a number/,
  );
  await expect(drawer.getByRole('alert')).toContainText('Please correct');
  expect(await readPersistedArchive(page)).toBe(before);
  await expect(drawer.getByLabel('Description', { exact: true })).toHaveValue(
    'Keep this draft',
  );
  await expect(rating).toHaveValue('6');
  await title.fill('Validated item');
  await expect(title).not.toHaveAttribute('aria-invalid', 'true');
  await drawer.getByRole('button', { name: 'Save item' }).click();
  await expect(rating).toBeFocused();
  await rating.fill('4.2');
  await expect(drawer.getByRole('alert')).toBeEmpty();
  await rating.press('Enter');
  await expect(drawer).not.toBeVisible();
  const saved = JSON.parse(await readPersistedArchive(page));
  expect(saved.items).toHaveLength(1);
  expect(saved.items[0]).toMatchObject({
    title: 'Validated item',
    rating: 4.2,
    description: 'Keep this draft',
  });
  await page.reload();
  await expect(
    page
      .getByLabel('Item list')
      .getByRole('heading', { name: 'Validated item' }),
  ).toBeVisible();
});

test('incomplete numeric input is rejected instead of saved as an omitted rating', async ({
  page,
}) => {
  const drawer = page.getByRole('dialog', { name: 'New item' });
  await drawer
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('Incomplete rating');
  const rating = drawer.getByLabel('Rating', { exact: true });
  await rating.pressSequentially('e');
  expect(
    await rating.evaluate((input: HTMLInputElement) => input.validity.badInput),
  ).toBe(true);
  const before = await readPersistedArchive(page);
  await drawer.getByRole('button', { name: 'Save item' }).click();
  await expect(rating).toHaveAttribute('aria-invalid', 'true');
  await expect(rating).toBeFocused();
  expect(await readPersistedArchive(page)).toBe(before);
  expect(
    await rating.evaluate((input: HTMLInputElement) => input.validity.badInput),
  ).toBe(true);
  await rating.press('Backspace');
  await drawer.getByRole('button', { name: 'Save item' }).click();
  await expect(drawer).not.toBeVisible();
  const saved = JSON.parse(await readPersistedArchive(page));
  expect(saved.items).toHaveLength(1);
  expect(saved.items[0]).not.toHaveProperty('rating');
});

for (const rating of ['0', '5']) {
  test(`accepts rating boundary ${rating}`, async ({ page }) => {
    const drawer = page.getByRole('dialog', { name: 'New item' });
    await drawer
      .getByRole('textbox', { name: 'Title', exact: true })
      .fill(`Boundary ${rating}`);
    await drawer.getByLabel('Rating', { exact: true }).fill(rating);
    await drawer.getByRole('button', { name: 'Save item' }).click();
    await expect(drawer).not.toBeVisible();
    expect(JSON.parse(await readPersistedArchive(page)).items[0].rating).toBe(
      Number(rating),
    );
  });
}

test('series errors identify the control and clear when the structure is repaired', async ({
  page,
}) => {
  const drawer = page.getByRole('dialog', { name: 'New item' });
  await drawer
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('Series fixture');
  await drawer.getByLabel('Category').selectOption('Series');
  await drawer.getByRole('button', { name: 'Add season', exact: true }).click();
  const season = drawer.getByLabel('Season 1 title', { exact: true });
  await season.fill('');
  const before = await readPersistedArchive(page);
  await drawer.getByRole('button', { name: 'Save item' }).click();
  await expect(season).toBeFocused();
  await expect(season).toHaveAccessibleDescription('Enter a season title.');
  expect(await readPersistedArchive(page)).toBe(before);
  await season.fill('Season one');
  // A new season starts with one episode; remove it to exercise the empty case.
  await drawer.getByRole('button', { name: 'Remove', exact: true }).click();
  await drawer.getByRole('button', { name: 'Save item' }).click();
  const add = drawer.getByRole('button', { name: 'Add episode', exact: true });
  await expect(add).toBeFocused();
  await expect(add).toHaveAccessibleDescription(
    'Add at least one episode, or remove this season.',
  );
  await add.click();
  const episode = drawer.getByLabel('Episode 1 title', { exact: true });
  await episode.fill('');
  await drawer.getByRole('button', { name: 'Save item' }).click();
  await expect(episode).toBeFocused();
  await expect(episode).toHaveAccessibleDescription('Enter an episode title.');
  expect(await readPersistedArchive(page)).toBe(before);
  await episode.fill('Pilot');
  await drawer.getByRole('button', { name: 'Save item' }).click();
  await expect(drawer).not.toBeVisible();
});

test('a failed storage write reports inside the drawer and preserves the draft for retry', async ({
  page,
}) => {
  const drawer = page.getByRole('dialog', { name: 'New item' });
  await drawer
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('Storage retry');
  const before = await readPersistedArchive(page);
  await failNextArchiveWrite(page);
  await drawer.getByRole('button', { name: 'Save item' }).click();
  await expect(drawer.getByRole('alert')).toContainText(
    'Test storage quota exceeded',
  );
  await expect(
    drawer.getByRole('textbox', { name: 'Title', exact: true }),
  ).toHaveValue('Storage retry');
  expect(await readPersistedArchive(page)).toBe(before);
  await drawer.getByRole('button', { name: 'Save item' }).click();
  await expect(drawer).not.toBeVisible();
  expect(JSON.parse(await readPersistedArchive(page)).items).toHaveLength(1);
});

test('editing applies the same checks without replacing the saved item on failure', async ({
  page,
}) => {
  const drawer = page.getByRole('dialog', { name: 'New item' });
  await drawer
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('Edit fixture');
  await drawer.getByLabel('Rating', { exact: true }).fill('3');
  await drawer.getByRole('button', { name: 'Save item' }).click();
  await expect(drawer).not.toBeVisible();
  const before = await readPersistedArchive(page);
  await page
    .getByLabel('Item list')
    .getByRole('heading', { name: 'Edit fixture' })
    .click();
  await page
    .getByRole('complementary', { name: 'Selected item details' })
    .getByRole('button', { name: 'Edit', exact: true })
    .click();
  await drawer.getByLabel('Rating', { exact: true }).fill('-1');
  await drawer.getByRole('button', { name: 'Save item' }).click();
  await expect(drawer.getByLabel('Rating', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  expect(await readPersistedArchive(page)).toBe(before);
  await drawer.getByLabel('Rating', { exact: true }).fill('4.2');
  await drawer.getByRole('button', { name: 'Save item' }).click();
  await expect(drawer).not.toBeVisible();
  const saved = JSON.parse(await readPersistedArchive(page));
  expect(saved.items).toHaveLength(1);
  expect(saved.items[0].id).toBe(JSON.parse(before).items[0].id);
  expect(saved.items[0].rating).toBe(4.2);
  await page.getByRole('button', { name: 'New item', exact: true }).click();
  await expect(drawer.getByRole('alert')).toBeEmpty();
});

test('mobile feedback fits the drawer and cancellation clears it for the next draft', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const drawer = page.getByRole('dialog', { name: 'New item' });
  await drawer.getByRole('button', { name: 'Save item' }).click();
  await expect(
    drawer.getByRole('textbox', { name: 'Title', exact: true }),
  ).toBeFocused();
  expect(
    await drawer.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('mobile-validation.png') });
  await drawer.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'New item', exact: true }).click();
  await expect(drawer.getByRole('alert')).toBeEmpty();
  await expect(
    drawer.getByRole('textbox', { name: 'Title', exact: true }),
  ).not.toHaveAttribute('aria-invalid', 'true');
});
