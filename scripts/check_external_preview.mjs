import { chromium } from 'playwright';

const ROOT = 'https://raw.githack.com/socman2023/podnebesie-wiki/c4a8734999af95298aca81cf2f2dc03471994d1d/';
const expectedAges = new Map([
  ['oleshka', '15 лет'],
  ['sanko', '14 лет'],
  ['yarko', '14 лет'],
  ['ratsha', '15 лет'],
  ['ruman', '14 лет'],
  ['elina', '10 лет'],
  ['arsenio', '14 лет'],
  ['turka', '15 лет'],
  ['sineoka', '10 лет'],
  ['ugo', '14 лет'],
  ['voyko', '17 лет'],
]);
const browser = await chromium.launch({headless:true});
try {
  for (const width of [1280, 390]) {
    const ctx = await browser.newContext({viewport:{width,height:850},colorScheme:'dark'});
    await ctx.addCookies([{
      name:'__Http-phish',
      value:'1',
      url:'https://raw.githack.com/socman2023/podnebesie-wiki/',
      httpOnly:true,secure:true,sameSite:'Lax'
    }]);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push('JavaScript: '+e.message));
    page.on('response', res => { if(res.status() >= 400) errors.push('HTTP '+res.status()+': '+res.url()); });
    await page.goto(ROOT+'index.html',{waitUntil:'networkidle',timeout:60000});
    await page.waitForFunction(() => typeof WIKI_DATA !== 'undefined' && WIKI_DATA.characters?.length > 0);
    const actualAges = await page.evaluate(() => Object.fromEntries(WIKI_DATA.characters.map(c=>[c.id,c.role])));
    for(const [id, age] of expectedAges){
      if (!actualAges[id]?.includes(age)) errors.push('Age: '+id+' expected '+age+' got '+actualAges[id]);
    }
    await page.locator('[data-tab="academy"]').click();
    const button = page.locator('#academy-gallery-open');
    await button.waitFor({state:'visible'});
    const preview = button.locator('img');
    await page.waitForFunction(() => {
      const img=document.querySelector('#academy-gallery-open img');
      return img?.complete && img.naturalWidth>0;
    },{timeout:30000});
    await button.click();
    await page.waitForFunction(() => {
      const img=document.querySelector('#galleryPhoto');
      return img?.complete && img.naturalWidth>0;
    },{timeout:30000});
    const firstSrc = await page.locator('#galleryPhoto').getAttribute('src');
    if(!firstSrc?.endsWith('/01.webp')) errors.push('Wrong gallery first image: '+firstSrc);
    const thumbs = page.locator('#galleryThumbs img');
    if(await thumbs.count() !== 7) errors.push('Expected seven thumbnails, got '+(await thumbs.count()));
    const loadThumbs = await thumbs.evaluateAll(els=>els.map(x=>({url:x.src,ok:x.complete && x.naturalWidth>0})));
    if(loadThumbs.some(t=>!t.ok))errors.push('Thumbnail failure: '+JSON.stringify(loadThumbs));
    await page.locator('#galleryNext').click();
    await page.waitForFunction(() => {
      const img=document.querySelector('#galleryPhoto');
      return img?.complete && img.naturalWidth>0 && img.src.endsWith('/02.webp');
    },{timeout:30000});
    if (await page.locator('#galleryCount').innerText() !== '2 / 81') errors.push('Gallery count mismatch');
    console.log(JSON.stringify({width,ageChecks:expectedAges.size,firstSrc,thumbs:loadThumbs.length,errors}));
    await ctx.close();
    if(errors.length)throw new Error(errors.join('; '));
  }
} finally { await browser.close(); }
console.log('External RawGitHack pinned preview: all checks passed');
