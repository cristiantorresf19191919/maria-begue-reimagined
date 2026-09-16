import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch();
const base = process.env.SITE_URL || 'http://127.0.0.1:4217';
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const route of ['', 'crece-tu-linkedin', 'monetiza-tu-linkedin']) {
    await page.setViewportSize({ width: route === 'crece-tu-linkedin' ? 390 : 1440, height: 1000 });
    await page.goto(`${base}/${route}?lang=es`);
    await page.waitForSelector('.theme-toggle');
    await page.waitForTimeout(1300);
    for (const target of ['dark', 'light']) {
      if ((await page.evaluate(() => document.documentElement.dataset.theme)) === target) continue;
      const box = await page.locator('.theme-toggle').boundingBox();
      await page.locator('.theme-toggle').click({ position: { x: 9, y: 12 } });
      await page.waitForFunction(() =>
        document
          .getAnimations()
          .some((a) => a.effect?.pseudoElement === '::view-transition-new(root)'),
      );
      const data = await page.evaluate(() => {
        const a = document
          .getAnimations()
          .find((a) => a.effect?.pseudoElement === '::view-transition-new(root)');
        a.pause();
        a.currentTime = 325;
        return { keys: a.effect.getKeyframes(), theme: document.documentElement.dataset.theme };
      });
      assert.equal(data.theme, target);
      assert.ok(
        Math.abs(Number(data.keys[0].clipPath.match(/at ([\d.]+)px/)[1]) - (box.x + 9)) < 1,
      );
      assert.ok(
        Math.abs(Number(data.keys[0].clipPath.match(/at [\d.]+px ([\d.]+)px/)[1]) - (box.y + 12)) <
          1,
      );
      if (!route && target === 'dark')
        await page.screenshot({ path: 'artifacts/theme-radial-midpoint.png' });
      await page.evaluate(() =>
        document
          .getAnimations()
          .filter((a) => a.effect?.pseudoElement === '::view-transition-new(root)')
          .forEach((a) => a.finish()),
      );
      await page.waitForFunction(
        () => !document.documentElement.classList.contains('theme-reveal-active'),
      );
    }
    await page.locator('.theme-toggle').focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.waitForFunction(
      () =>
        !document.documentElement.classList.contains('theme-reveal-active') &&
        document.documentElement.dataset.theme === 'light',
    );
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('.theme-toggle').click();
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
    assert.equal(
      await page.evaluate(() =>
        document
          .getAnimations()
          .some((a) => a.effect?.pseudoElement === '::view-transition-new(root)'),
      ),
      false,
    );
    await page.reload();
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  }
  await page.evaluate(() =>
    Object.defineProperty(document, 'startViewTransition', {
      value: undefined,
      configurable: true,
    }),
  );
  await page.locator('.theme-toggle').click();
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
  assert.deepEqual(errors, []);
  console.log(
    'PASS circular origin, both themes, all pages, keyboard rapid toggles, persistence, reduced motion and unsupported-browser fallback.',
  );
} finally {
  await browser.close();
}
