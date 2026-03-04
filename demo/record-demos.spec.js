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

  const canvasHost = page.locator('#canvasHost');
  const box = await canvasHost.boundingBox();
  if (!box) {
    throw new Error('Canvas host not found');
  }

  const startX = box.x + box.width * 0.22;
  const startY = box.y + box.height * 0.58;
  const midX = box.x + box.width * 0.55;
  const midY = box.y + box.height * 0.42;
  const endX = box.x + box.width * 0.82;
  const endY = box.y + box.height * 0.62;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.waitForTimeout(900);
  await page.mouse.move(midX, midY, { steps: 30 });
  await page.waitForTimeout(900);
  await page.mouse.move(endX, endY, { steps: 40 });
  await page.waitForTimeout(1100);
  await page.mouse.up();
  await page.waitForTimeout(1600);
});
