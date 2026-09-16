import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  for (const route of ['crece-tu-linkedin', 'monetiza-tu-linkedin']) {
    await page.goto(`${process.env.SITE_URL || 'http://127.0.0.1:4217'}/${route}?lang=es`);
    await page.locator('.proof-image').scrollIntoViewIfNeeded();
    await page.locator('.proof-caption .proof-controls button').last().click();
    await page.waitForFunction(() =>
      document
        .querySelector('.proof-image img')
        .getAnimations()
        .some((a) => a.playState === 'running'),
    );
    assert.ok(
      await page
        .locator('.proof-image img')
        .evaluate((img) =>
          img.getAnimations()[0].effect.getKeyframes()[0].transform.includes('44px'),
        ),
    );
    for (let i = 0; i < 5; i++)
      await page.locator('.proof-caption .proof-controls button').last().click();
    await page.waitForFunction(() =>
      document
        .querySelector('.proof-caption .proof-controls span')
        .textContent.trim()
        .startsWith('7 /'),
    );
    await page.evaluate(() => {
      const node = document.querySelector('.proof-image');
      const start = new Touch({ identifier: 1, target: node, clientX: 300, clientY: 450 });
      const end = new Touch({ identifier: 1, target: node, clientX: 90, clientY: 455 });
      node.dispatchEvent(new TouchEvent('touchstart', { touches: [start], bubbles: true }));
      node.dispatchEvent(new TouchEvent('touchend', { changedTouches: [end], bubbles: true }));
      node.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    });
    await page.waitForFunction(() =>
      document
        .querySelector('.proof-caption .proof-controls span')
        .textContent.trim()
        .startsWith('8 /'),
    );
    assert.equal(await page.locator('dialog').evaluate((d) => d.open), false);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('.proof-caption .proof-controls button').first().click();
    await page.waitForFunction(() =>
      document
        .querySelector('.proof-caption .proof-controls span')
        .textContent.trim()
        .startsWith('7 /'),
    );
    assert.equal(
      await page.locator('.proof-image img').evaluate((img) => img.getAnimations().length),
      0,
    );
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  }
  console.log(
    'PASS directional motion, rapid navigation, touch swipe, synthetic-click suppression and reduced motion on both courses.',
  );
} finally {
  await browser.close();
}
