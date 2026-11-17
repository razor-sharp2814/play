# play.razorsharp.digital

A plain HTML/CSS index page plus small games. No frameworks, no JavaScript on the index page, no tracking.

```
index.html        the list of games
style.css         all the styling (colours and fonts are variables at the top)
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

Each phone game is its own folder with its own `index.html`, `manifest.json`, `sw.js` and icons. Copy an existing folder to start a new one.

## Matching razorsharp.digital exactly

`style.css` uses a neutral dark/light palette based on the site's theme colour. To match the main site exactly, change the values at the top of the file (`:root` and the dark-mode block under it).

## Changing a phone game later

If you edit a game's `index.html`, bump the `CACHE` version at the top of that folder's `sw.js` (e.g. `button-v2`) so phones pick up the new copy.

## Install on a Pixel

Open the game in Chrome, then menu > Add to Home screen > Install. Open it once with signal so it saves itself, then it works offline.

To keep a toddler inside the game, turn on **App pinning** (Settings > Security & privacy > More security & privacy), open the game, then pin it from the recent apps screen.
