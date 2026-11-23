// Makes the picture shown in link previews (Slack, WhatsApp, Messages and so
// on) for every game: <game>/preview.png, 1200 x 630.
// Run it from this folder with:  npm run previews   (or  npm run previews button)
//
// It reads each game's own og:title and og:description tags and its
// icon-512.png, so change those and run this again. The look matches the
// listings page's preview (meta/index.png): white, Raleway, with the address
// in purple.
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const only = process.argv[2];
const GAMES = fs.readdirSync(ROOT).filter(d =>
  !d.startsWith('_') && !d.startsWith('.') && d !== 'engine' && fs.existsSync(path.join(ROOT, d, 'sw.js')) &&
  (!only || d === only));

const tag = (html, prop) => {
  const m = html.match(new RegExp(`<meta property="${prop}" content="([^"]*)"`));
  return m ? m[1].replace(/&amp;/g, '&') : '';
};
const escape = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const font = w => `data:font/woff2;base64,${fs.readFileSync(path.join(ROOT, 'fonts', `Raleway-${w}.woff2`)).toString('base64')}`;

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  for (const game of GAMES) {
    const html = fs.readFileSync(path.join(ROOT, game, 'index.html'), 'utf8');
    const title = tag(html, 'og:title'), line = tag(html, 'og:description');
    if (!title) { console.log(`${game}: no og:title tag, skipped`); continue; }
    const icon = fs.readFileSync(path.join(ROOT, game, 'icon-512.png')).toString('base64');
    await page.setContent(`<!DOCTYPE html><html><head><style>
      @font-face { font-family: R; font-weight: 600; src: url(${font('SemiBold')}); }
      @font-face { font-family: R; font-weight: 700; src: url(${font('Bold')}); }
      html, body { margin: 0; width: 1200px; height: 630px; background: #fff; color: #18181b; font-family: R; font-weight: 600; }
      main { position: absolute; left: 100px; right: 100px; top: 0; bottom: 0; display: flex; align-items: center; gap: 72px; }
      .words { flex: 1; min-width: 0; }
      h1 { margin: 0 0 28px; font-size: 64px; line-height: 1.1; font-weight: 600; }
      p { margin: 0; font-size: 40px; line-height: 1.3; }
      img { width: 300px; height: 300px; border-radius: 64px; flex: none; outline: 4px solid #18181b; outline-offset: -4px; }
      .url { position: absolute; left: 100px; bottom: 44px; font-size: 32px; color: oklch(55.8% 0.288 302.321); }
    </style></head><body>
      <main><div class="words"><h1>${escape(title)}</h1><p>${escape(line)}</p></div><img src="data:image/png;base64,${icon}" alt=""></main>
      <div class="url">play.razorsharp.digital/${escape(game)}</div>
    </body></html>`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(ROOT, game, 'preview.png') });
    console.log(`${game}/preview.png`);
  }
  await browser.close();
})();
