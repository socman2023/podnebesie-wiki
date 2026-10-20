import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const issues = [];
const themeColors = {};
try {
  for (const width of [1280, 390]) {
    for (const scheme of ['light', 'dark']) {
      const page = await browser.newPage({
        viewport: { width, height: 840 },
        colorScheme: scheme
      });
      const key = `${width}-${scheme}`;
      page.on('pageerror', error => issues.push(`${key}: JS ${error.message}`));
      page.on('response', response => {
        if (response.status() >= 400) {
          issues.push(`${key}: HTTP ${response.status()} ${response.url()}`);
        }
      });
      await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'networkidle' });

      // Every character modal must display the established role rather than a
      // duplicate name. Keep the longer fullName values in data for search.
      const characterErrors = await page.evaluate(() => {
        const chars = WIKI_DATA.characters;
        const cards = [...document.querySelectorAll('#section-characters .card, #section-characters .student-card')];
        const errors = [];
        if (chars.length !== 107) errors.push('Unexpected character count: ' + chars.length);
        if (!chars.some(c => c.name === 'Люций Грейвард')) errors.push('Люций Грейвард not renamed');
        if (chars.some(c => c.name === 'Инквизитор Грейвард')) errors.push('Old name still in data');
        for (const char of chars) {
          const card = cards.find(node => node.querySelector('.card-name, .student-name')?.textContent.trim() === char.name);
          if (!card) {
            errors.push('Character card not found: ' + char.name);
            continue;
          }
          card.click();
          const title = document.querySelector('#modalBody .modal-title')?.textContent.trim();
          const subtitle = document.querySelector('#modalBody .modal-subtitle')?.textContent.trim();
          if (title !== char.name || subtitle !== char.role || subtitle === char.name) {
            errors.push('Wrong modal title/subtitle: ' + char.name + ' [' + title + ' / ' + subtitle + ']');
          }
          document.getElementById('modalClose').click();
        }
        return errors;
      });
      issues.push(...characterErrors.map(error => `${key}: ${error}`));
      await page.locator('[data-tab="academy"]').click();
      const album = page.locator('#academy-gallery-open');
      if (await album.count() !== 1) issues.push(`${key}: missing Academy album button`);
      await album.click();
      const overlay = page.locator('#galleryOverlay');
      if (!(await overlay.isVisible())) issues.push(`${key}: gallery not visible`);
      const caption = page.locator('#galleryCaption');
      const counter = page.locator('#galleryCount');
      if ((await counter.innerText()) !== '1 / 81') issues.push(`${key}: incorrect photo count`);
      await page.waitForFunction(() => {
        const img = document.getElementById('galleryPhoto');
        return img?.complete && img.naturalWidth > 0;
      });
      if ((await caption.innerText()) !== 'Академия') issues.push(`${key}: wrong first caption`);
      await page.locator('#galleryNext').click();
      await page.waitForFunction(() => document.getElementById('galleryPhoto')?.naturalWidth > 0);
      if ((await counter.innerText()) !== '2 / 81') issues.push(`${key}: next button failed`);
      await page.keyboard.press('ArrowLeft');
      if ((await counter.innerText()) !== '1 / 81') issues.push(`${key}: keyboard navigation failed`);
      await page.locator('#galleryPrevious').click();
      if ((await counter.innerText()) !== '81 / 81') issues.push(`${key}: wrap-around failed`);
      await page.waitForFunction(() => document.getElementById('galleryPhoto')?.complete && document.getElementById('galleryPhoto')?.naturalWidth > 0);
      themeColors[scheme] = await page.locator('.gallery-sheet').evaluate(el => getComputedStyle(el).backgroundColor);
      await page.keyboard.press('Escape');
      if (await overlay.isVisible()) issues.push(`${key}: Escape did not close gallery`);
      const table = page.locator('#academy-schedule');
      const timeSticky = await table.locator('tbody tr:first-child td:first-child').evaluate(el => getComputedStyle(el).position);
      if (timeSticky !== 'sticky') issues.push(`${key}: time column not sticky`);
      if (width === 390) {
        const scrolls = await page.locator('#academy-schedule-scroll').evaluate(el => el.scrollWidth > el.clientWidth);
        const topVisible = await page.locator('#academy-schedule-scroll-controls').isVisible();
        if (!scrolls || !topVisible) issues.push(`${key}: mobile schedule scroll controls missing`);
      }
      await page.close();
      console.log(`PASS browser checks ${key}`);
    }
  }
  if (themeColors.light === themeColors.dark) issues.push('Gallery light and dark colors identical');
} finally {
  await browser.close();
}
if (issues.length) {
  for (const issue of issues) console.error(issue);
  process.exit(1);
}
console.log('All browser checks passed');
