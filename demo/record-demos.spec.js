const { test } = require('@playwright/test');

async function runSketch(page) {
  await page.waitForSelector('#runBtn');
  await page.click('#runBtn');
  await page.waitForTimeout(1400);
}

test('bouncing dots demo', async ({ page }) => {
  await page.goto('/');
  await runSketch(page);

  await page.mouse.move(240, 220);
  await page.waitForTimeout(2200);
});

test('particle fountain demo', async ({ page }) => {
  await page.goto('/');

  await page.selectOption('#exampleSelect', 'particles');
  await page.waitForTimeout(300);
  await runSketch(page);

  await page.mouse.move(180, 220);
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.move(520, 240, { steps: 24 });
  await page.waitForTimeout(900);
  await page.mouse.up();
  await page.waitForTimeout(1600);
});
