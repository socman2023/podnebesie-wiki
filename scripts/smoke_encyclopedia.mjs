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
      // A deterministic map document exposes the iframe size at startup.
      // The embedded Leaflet map must never initialize in a hidden (0px) tab.
      await page.route('https://socman2023.github.io/podnebesie-map/', route =>
        route.fulfill({
          status: 200, contentType: 'text/html',
          body: '<!doctype html><html><body><div id="initial-size"></div><script>document.getElementById("initial-size").textContent=window.innerWidth+"x"+window.innerHeight;</script></body></html>'
        })
      );
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
      const mapFrame = page.locator('#map-iframe');
      if (await mapFrame.getAttribute('src') !== null) {
        issues.push(`${key}: map iframe loaded before its tab was visible`);
      }
      await page.locator('[data-tab="map"]').click();
      await page.waitForFunction(() => document.getElementById('map-iframe')?.getAttribute('src')?.includes('/podnebesie-map/'));
      if (!(await mapFrame.isVisible())) issues.push(`${key}: map iframe hidden after switching tabs`);
      const viewport = (await page.frameLocator('#map-iframe').locator('#initial-size').innerText()).split('x').map(Number);
      if (viewport.length !== 2 || viewport.some(v => !Number.isFinite(v) || v < 200)) {
        issues.push(`${key}: invalid iframe viewport on map load: ${viewport.join('x')}`);
      }
      await page.locator('[data-tab="academy"]').click();
      const album = page.locator('#academy-gallery-open');
      if (await album.count() !== 1) issues.push(`${key}: missing Academy album button`);
      await album.click();
      const overlay = page.locator('#galleryOverlay');
      if (!(await overlay.isVisible())) issues.push(`${key}: gallery not visible`);
      const caption = page.locator('#galleryCaption');
      const counter = page.locator('#galleryCount');
      if ((await counter.innerText()) !== '1 / 82') issues.push(`${key}: incorrect photo count`);
      await page.waitForFunction(() => {
        const img = document.getElementById('galleryPhoto');
        return img?.complete && img.naturalWidth > 0;
      });
      if ((await caption.innerText()) !== 'Академия') issues.push(`${key}: wrong first caption`);
      await page.locator('#galleryNext').click();
      await page.waitForFunction(() => document.getElementById('galleryPhoto')?.naturalWidth > 0);
      if ((await counter.innerText()) !== '2 / 82') issues.push(`${key}: next button failed`);
      await page.keyboard.press('ArrowLeft');
      if ((await counter.innerText()) !== '1 / 82') issues.push(`${key}: keyboard navigation failed`);
      await page.locator('#galleryPrevious').click();
      if ((await counter.innerText()) !== '82 / 82') issues.push(`${key}: wrap-around failed`);
      await page.waitForFunction(() => document.getElementById('galleryPhoto')?.complete && document.getElementById('galleryPhoto')?.naturalWidth > 0);
      if ((await caption.innerText()) !== 'Карта Академии') issues.push(`${key}: academy map is not the last photo`);
      if (!(await page.locator('#galleryPhoto').getAttribute('src')).endsWith('/academia/academy_map.webp')) {
        issues.push(`${key}: wrong Academy map image path`);
      }
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
      // Zlatograd uses the same location-gallery viewer as the Academy.
      // Check it across desktop/mobile, dark/light themes and keyboard controls.
      await page.locator('[data-tab="places"]').click();
      const city = page.locator('#grid-places .card').filter({ has: page.locator('.card-name', { hasText: /^Златоград$/ }) });
      if (await city.count() !== 1) issues.push(`${key}: Zlatograd location card not unique`);
      await city.click();
      const cityButton = page.locator('#modalBody [data-gallery-open]');
      if (!(await cityButton.isVisible())) issues.push(`${key}: Zlatograd gallery button missing`);
      await cityButton.click();
      if (!(await overlay.isVisible())) issues.push(`${key}: Zlatograd gallery did not open`);
      if ((await counter.innerText()) !== '1 / 25') issues.push(`${key}: Zlatograd photo count incorrect`);
      if ((await caption.innerText()) !== 'Вид на Златоград с противоположного берега реки') {
        issues.push(`${key}: incorrect first Zlatograd caption`);
      }
      await page.waitForFunction(() => {
        const img = document.getElementById('galleryPhoto');
        return img?.complete && img.naturalWidth > 0 && img.src.endsWith('/zlatograd/01.webp');
      });
      await page.locator('#galleryPrevious').click();
      if ((await counter.innerText()) !== '25 / 25') issues.push(`${key}: Zlatograd wrap-around failed`);
      if ((await caption.innerText()) !== 'Задний двор княжеского дворца') {
        issues.push(`${key}: incorrect last Zlatograd caption`);
      }
      await page.waitForFunction(() => {
        const img = document.getElementById('galleryPhoto');
        return img?.complete && img.naturalWidth > 0 && img.src.endsWith('/zlatograd/25.webp');
      });
      await page.keyboard.press('ArrowRight');
      if ((await counter.innerText()) !== '1 / 25') issues.push(`${key}: Zlatograd keyboard navigation failed`);
      await page.keyboard.press('Escape');
      if (await overlay.isVisible()) issues.push(`${key}: Zlatograd gallery did not close`);
      await page.locator('#modalClose').click();
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
