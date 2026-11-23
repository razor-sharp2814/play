// Makes the printables from their drawings: for every printables/<name>.svg,
// an A4 PDF to print (<name>.pdf) and a square picture for the listings page
// (<name>.png, 192 x 192).
// Run it from this folder with:  npm run printables   (or  npm run printables dolphin)
//
// Each drawing is an A4 page in millimetres (viewBox="0 0 210 297"). The
// picture shows the part of it named in the drawing's data-thumb="x y w h"
// (also in millimetres), or the whole page if it hasn't got one.
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..'), DIR = path.join(ROOT, 'printables');
const only = process.argv[2];
const NAMES = fs.readdirSync(DIR).filter(f => f.endsWith('.svg')).map(f => f.slice(0, -4)).filter(n => !only || n === only);
const font = w => `data:font/woff2;base64,${fs.readFileSync(path.join(ROOT, 'fonts', `Raleway-${w}.woff2`)).toString('base64')}`;
const FONTS = `
  @font-face { font-family: Raleway; font-weight: 600; src: url(${font('SemiBold')}); }
  @font-face { font-family: Raleway; font-weight: 700; src: url(${font('Bold')}); }`;

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage();
  for (const name of NAMES) {
    const svg = fs.readFileSync(path.join(DIR, `${name}.svg`), 'utf8');

    // The A4 PDF
    await page.setContent(`<!DOCTYPE html><html><head><style>${FONTS}
      @page { size: A4; margin: 0; }
      html, body { margin: 0; }
      svg { display: block; width: 210mm; height: 297mm; }
    </style></head><body>${svg}</body></html>`);
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({ path: path.join(DIR, `${name}.pdf`), preferCSSPageSize: true, printBackground: true });

    // The picture for the listings page: the data-thumb part, on white
    const thumb = (svg.match(/data-thumb="([^"]+)"/) || [])[1] || '0 0 210 297';
    await page.setViewportSize({ width: 192, height: 192 });
    await page.setContent(`<!DOCTYPE html><html><head><style>${FONTS}
      html, body { margin: 0; background: #fff; }
      svg { display: block; width: 192px; height: 192px; }
    </style></head><body>${svg.replace(/viewBox="[^"]*"/, `viewBox="${thumb}"`).replace(/ width="[^"]*" height="[^"]*"/, '')}</body></html>`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(DIR, `${name}.png`) });
    console.log(`printables/${name}.pdf, printables/${name}.png`);
  }
  await browser.close();
})();
