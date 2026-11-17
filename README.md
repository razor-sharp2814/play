# play.razorsharp.digital

A plain HTML/CSS index page plus small games. No frameworks, no JavaScript on the index page, no tracking. It's styled to match razorsharp.digital.

```
index.html        the list of games
style.css         all the styling (colours are variables at the top)
favicon.svg       Razor Sharp icon, same as the main site
fonts/            Raleway SemiBold and Bold, same as the main site
meta/index.png    the preview image shown when the link is shared
CNAME             tells GitHub Pages the domain
button/           phone game: The Button
dolphins/         phone game: Purple Dolphins
```

## Put it online

1. Put everything in this folder at the top level of a new GitHub repo.
2. Repo Settings > Pages > Deploy from a branch > `main` / root > Save.
3. Custom domain: `play.razorsharp.digital`, then tick **Enforce HTTPS** once it's available.
4. At your DNS host, add a CNAME record: name `play`, value `YOUR-USERNAME.github.io`.

Free GitHub Pages needs a public repo. There's nothing private in these files.

## Add a game

Copy one `<li class="game">` block in `index.html`, paste it below the others, and change the folder, title, sentence and tags. A paper-game template (linking to a PDF) is in a comment in the same place. The grid sorts itself out.

The page also has structured data for search engines (JSON-LD, in a `<script type="application/ld+json">` block in the `<head>`). When you add a game, add it to the `itemListElement` list there too, copying an existing entry and changing the position, name, description and addresses.

Each phone game is its own folder with its own `index.html`, `manifest.json`, `sw.js` and icons. Copy an existing folder to start a new one. Each game's `index.html` has its own structured data block in the `<head>`: change the name, description and addresses in it to match the new game.

## Matching razorsharp.digital

`style.css` copies the main site's look: Raleway, white and zinc backgrounds, purple links and buttons in light mode, emerald in dark mode, the same text sizes and the same 56rem column. The colours are the exact Tailwind values the main site uses, set at the top of the file (`:root` and the dark-mode block under it).

The header border that appears when you scroll and the sections fading in both work without JavaScript. The Terms, Privacy and Cookies links in the footer open the pages on razorsharp.digital in a new tab.

## Link preview image

`meta/index.png` is the image shown when someone shares the link. It's 1200 by 630 and uses the same layout, font and colours as the preview images on razorsharp.digital. The Open Graph and Twitter tags in the `<head>` of `index.html` point to it. If you change the page title or tagline, make a new image to match.

## Changing a phone game later

If you edit a game's `index.html`, bump the `CACHE` version at the top of that folder's `sw.js` (e.g. `button-v2`) so phones pick up the new copy.

## Install on a Pixel

Open the game in Chrome, then menu > Add to Home screen > Install. Open it once with signal so it saves itself, then it works offline.

To keep a toddler inside the game, turn on **App pinning** (Settings > Security & privacy > More security & privacy), open the game, then pin it from the recent apps screen.
