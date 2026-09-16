import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
const browser = await chromium.launch();
const base = process.env.SITE_URL || 'http://127.0.0.1:4217';
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  for (const [path, count] of [
    ['crece-tu-linkedin', 9],
    ['monetiza-tu-linkedin', 14],
  ]) {
    await page.goto(`${base}/${path}?lang=es`);
    await page.locator('.proof-image').scrollIntoViewIfNeeded();
    assert.equal(await page.locator('.library-item').count(), 7);
    assert.equal(await page.locator('.proof-thumbnails button').count(), count);
    for (let i = 0; i < count; i++) {
      await page.locator('.proof-thumbnails button').nth(i).click();
      await page.waitForFunction(() => {
        const img = document.querySelector('.proof-image img');
        return img?.complete && img.naturalWidth > 0;
      });
    }
    await page.locator('.proof-caption .proof-controls button').last().click();
    await page.waitForFunction(() =>
      document
        .querySelector('.proof-caption .proof-controls span')
        .textContent.trim()
        .startsWith('1 /'),
    );
    await page.locator('.proof-image').click();
    assert.equal(await page.locator('dialog').evaluate((d) => d.open), true);
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() =>
      document.querySelector('dialog .proof-controls span').textContent.trim().startsWith('2 /'),
    );
    const accessibility = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    assert.deepEqual(
      accessibility.violations.map((x) => ({ id: x.id, nodes: x.nodes.map((n) => n.target) })),
      [],
    );
    await page.keyboard.press('Escape');
    assert.equal(
      await page.locator('.proof-image').evaluate((b) => b === document.activeElement),
      true,
    );
    assert.notEqual(await page.evaluate(() => document.body.style.overflow), 'hidden');
    await page
      .locator('#testimonios')
      .screenshot({ path: `artifacts/${path}-testimonials-mobile.png` });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page
      .locator('#testimonios')
      .screenshot({ path: `artifacts/${path}-testimonials-desktop.png` });
    await page.setViewportSize({ width: 390, height: 844 });
  }
  console.log(
    'All testimonial images, 7 resources, wrapping, modal keyboard/focus, mobile and dialog accessibility passed.',
  );
} finally {
  await browser.close();
}
