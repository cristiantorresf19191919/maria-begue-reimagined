import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const base = process.env.SITE_URL || 'http://127.0.0.1:4217';
await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}/?lang=es`);
  await page.getByRole('heading', { level: 1 }).waitFor();
  await page.waitForFunction(() => document.documentElement.lang === 'es');
  for (const lang of ['es', 'en']) {
    await page
      .getByRole('button', { name: lang === 'es' ? 'Español' : 'English', exact: true })
      .click();
    await page.waitForFunction((value) => document.documentElement.lang === value, lang);
    for (const theme of ['light', 'dark']) {
      const current = await page.evaluate(() => document.documentElement.dataset.theme);
      if (current !== theme) await page.locator('.theme-toggle').click();
      await page.waitForFunction(
        (value) => document.documentElement.dataset.theme === value,
        theme,
      );
      // Reveal every section before evaluating contrast and taking the full-page screenshot.
      await page.evaluate(async () => {
        for (let position = 0; position < document.body.scrollHeight; position += 650) {
          window.scrollTo(0, position);
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        window.scrollTo(0, 0);
      });
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      console.log(
        `Accessibility ${lang}/${theme}:`,
        JSON.stringify(
          result.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => ({ html: n.html, summary: n.failureSummary })),
          })),
        ),
      );
      assert.equal(result.violations.length, 0);
      await page.screenshot({ path: `artifacts/${lang}-${theme}.png`, fullPage: true });
    }
  }
  await page.reload();
  await page.waitForFunction(
    () =>
      document.documentElement.lang === 'en' && document.documentElement.dataset.theme === 'dark',
  );
  assert.match(await page.title(), /Your next opportunity/);
  await page.getByRole('button', { name: 'Español', exact: true }).click();
  for (const width of [320, 375, 390, 768, 1024, 1440, 1920, 2560]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
      `Overflow at ${width}px`,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Abrir menú', exact: true }).click();
  await page.locator('#mobile-nav').getByRole('link', { name: 'Sobre mí' }).click();
  await page.waitForFunction(
    () => document.querySelector('#menu-toggle').getAttribute('aria-expanded') === 'false',
  );
  assert.equal(new URL(page.url()).hash, '#sobre-mi');
  await page.getByRole('button', { name: 'Abrir menú', exact: true }).click();
  await page.keyboard.press('Escape');
  assert.equal(
    await page.locator('#menu-toggle').evaluate((e) => e === document.activeElement),
    true,
  );
  await page.locator('summary').first().focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('details').first().getAttribute('open'), '');
  assert.equal(await page.locator('h1').evaluate((e) => getComputedStyle(e).animationName), 'none');
  assert.equal(
    await page.locator('.consulting a').getAttribute('href'),
    'https://www.mariabegue.me/consultorias',
  );
  assert.equal(
    await page.locator('.growth a').getAttribute('href'),
    'https://www.mariabegue.me/crece-tu-linkedin',
  );
  assert.equal(
    await page.locator('.monetize a').getAttribute('href'),
    'https://www.mariabegue.me/monetiza-tu-linkedin',
  );
  assert.equal(
    await page.locator('.newsletter-copy a').getAttribute('href'),
    'https://www.mariabegue.me/suscribete-newsletter',
  );
  assert.equal(
    await page.evaluate(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0)),
    true,
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${base}/?lang=en&goal=audience`);
  await page.waitForFunction(() => document.querySelector('input[value="audience"]')?.checked);
  assert.match(await page.locator('.goal-result h4').textContent(), /conversations/);
  await page.locator('input[value="audience"]').focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => document.querySelector('input[value="income"]')?.checked);
  assert.equal(new URL(page.url()).searchParams.get('goal'), 'income');
  await page.waitForFunction(() =>
    document.querySelector('.result-link')?.getAttribute('href')?.endsWith('/monetiza-tu-linkedin'),
  );
  assert.match(await page.locator('.result-link').getAttribute('href'), /monetiza-tu-linkedin/);
  await page.goBack();
  await page.waitForFunction(() => document.querySelector('input[value="audience"]')?.checked);
  await page.goForward();
  await page.waitForFunction(() => document.querySelector('input[value="income"]')?.checked);
  await page.getByRole('button', { name: 'Español', exact: true }).click();
  await page.waitForFunction(() =>
    document.querySelector('.goal-result h4')?.textContent?.includes('conocimiento'),
  );
  assert.match(await page.locator('.goal-result h4').textContent(), /conocimiento/);
  await page.reload();
  await page.waitForFunction(() => document.querySelector('input[value="income"]')?.checked);
  await page.locator('input[value="clarity"]').focus();
  await page.keyboard.press('Space');
  await page.waitForFunction(() => document.querySelector('input[value="clarity"]')?.checked);
  await page.waitForFunction(() =>
    document.querySelector('.result-link')?.getAttribute('href')?.endsWith('/consultorias'),
  );
  assert.match(await page.locator('.result-link').getAttribute('href'), /consultorias/);
  await page.locator('#newsletter').scrollIntoViewIfNeeded();
  await page.waitForFunction(
    () =>
      document
        .querySelector('.desktop-nav a[href$="#newsletter"]')
        ?.getAttribute('aria-current') === 'location',
  );
  assert.ok(
    await page.evaluate(
      () => Number(document.documentElement.style.getPropertyValue('--reading-progress')) > 0.5,
    ),
  );
  await page.locator('.floating-top').click();
  await page.waitForFunction(() => scrollY < 120);
  await page.locator('.portrait-frame').hover();
  assert.equal(
    await page.locator('.portrait-frame').evaluate((el) => el.style.getPropertyValue('--depth-x')),
    '',
  );
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.mouse.move(0, 0);
  await page.locator('.portrait-frame').hover({ position: { x: 40, y: 80 } });
  await page.waitForFunction(
    () => document.querySelector('.portrait-frame').style.getPropertyValue('--depth-x') !== '',
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(
    () => document.querySelector('.portrait-frame').style.getPropertyValue('--depth-x') === '',
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.goal-guide').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'artifacts/guide-mobile.png' });
  const mobileResult = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  assert.deepEqual(
    mobileResult.violations.map((v) => v.id),
    [],
  );
  console.log(
    'PASS: goal recommendations, keyboard radio navigation, shareable URLs, browser history, section tracking, scroll progress, back to top, depth motion and mobile accessibility.',
  );
  assert.deepEqual(errors, []);
  console.log(
    'PASS: languages, themes, persistence, 8 widths, keyboard, menu, FAQ, reduced motion, links, images and runtime errors.',
  );
} finally {
  await browser.close();
}
