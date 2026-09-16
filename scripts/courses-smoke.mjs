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
  for (const path of ['crece-tu-linkedin', 'monetiza-tu-linkedin']) {
    await page.goto(`${base}/${path}?lang=es&topic=2`);
    await page.waitForFunction(() => document.querySelector('input[value="2"]')?.checked);
    assert.equal(await page.locator('h1').count(), 1);
    assert.equal(
      await page.locator('.course-hero-actions a').first().getAttribute('href'),
      `https://www.mariabegue.me/${path}`,
    );
    await page.locator('input[value="2"]').focus();
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => new URL(location.href).searchParams.get('topic') === '3');
    await page.goBack();
    await page.waitForFunction(() => document.querySelector('input[value="2"]')?.checked);
    await page.goForward();
    await page.waitForFunction(() => document.querySelector('input[value="3"]')?.checked);
    await page.reload();
    await page.waitForFunction(() => document.querySelector('input[value="3"]')?.checked);
    for (const language of ['es', 'en']) {
      await page
        .getByRole('button', { name: language === 'es' ? 'Español' : 'English', exact: true })
        .click();
      await page.waitForFunction((lang) => document.documentElement.lang === lang, language);
      for (const theme of ['light', 'dark']) {
        if ((await page.evaluate(() => document.documentElement.dataset.theme)) !== theme)
          await page.locator('.theme-toggle').click();
        await page.waitForFunction(
          (value) => document.documentElement.dataset.theme === value,
          theme,
        );
        await page.evaluate(async () => {
          for (let y = 0; y < document.body.scrollHeight; y += 650) {
            window.scrollTo(0, y);
            await new Promise((resolve) => setTimeout(resolve, 40));
          }
          window.scrollTo(0, 0);
        });
        const result = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze();
        assert.deepEqual(
          result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.failureSummary) })),
          [],
          `${path} ${language} ${theme}`,
        );
        await page.screenshot({
          path: `artifacts/${path}-${language}-${theme}.png`,
          fullPage: true,
        });
      }
    }
    for (const width of [320, 390, 768, 1024, 1440, 2560]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
        `${path} overflow at ${width}`,
      );
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: `artifacts/${path}-mobile.png` });
    await page.getByRole('button', { name: 'Open menu', exact: true }).click();
    await page.locator('#course-mobile-nav').getByRole('link', { name: 'The program' }).click();
    await page.waitForFunction(() => !document.querySelector('#course-mobile-nav'));
    assert.equal(new URL(page.url()).pathname, `/${path}`);
    assert.equal(new URL(page.url()).hash, '#programa');
    await page.waitForSelector('.course-dock');
    assert.equal(
      await page.locator('.course-dock a').getAttribute('href'),
      `https://www.mariabegue.me/${path}`,
    );
    const mobile = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    assert.deepEqual(
      mobile.violations.map((v) => v.id),
      [],
      `${path} mobile accessibility`,
    );
    await page.getByRole('button', { name: 'Open menu', exact: true }).click();
    await page.keyboard.press('Escape');
    assert.equal(
      await page.locator('#course-menu-toggle').evaluate((e) => e === document.activeElement),
      true,
    );
    await page.locator('.course-faq summary').first().focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.course-faq details').first().getAttribute('open'), '');
    await page.locator('.final-offer').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => !document.querySelector('.course-dock'));
    await page.locator('.other-course').click();
    await page.waitForFunction(() => !!document.querySelector('.course-title'));
    assert.notEqual(new URL(page.url()).pathname, `/${path}`);
    await page.setViewportSize({ width: 1440, height: 1000 });
    console.log(
      `PASS ${path}: translations, themes, curriculum, URL/history, direct reload, mobile menu, dock, FAQ, cross-course navigation and accessibility.`,
    );
  }
  await page.goto(`${base}/?lang=es`);
  await page.locator('.growth .card-link').click();
  await page.waitForURL('**/crece-tu-linkedin?lang=es*');
  await page.getByRole('link', { name: 'María Begué', exact: true }).click();
  await page.waitForFunction(() => !!document.querySelector('.goal-guide'));
  assert.deepEqual(errors, []);
  console.log('PASS homepage-to-course-to-home navigation; no browser runtime errors.');
} finally {
  await browser.close();
}
