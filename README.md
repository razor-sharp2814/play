# Games by Razor Sharp

Small games, no nonsense. No adverts, no sign-ups and no tracking.

Play them at [play.razorsharp.digital](https://play.razorsharp.digital).

## The games

### The Button

One big button. Press it to hear a happy sound.

- Swipe up or down to change button. With a mouse or trackpad, scroll up or down instead. There are ten to find, including a chick, a frog, a drum, a pig, a sheep, a train and a poo.
- Each button has its own colour and sound.
- Press 20 times for a party! Grown-ups can switch the party off, or change it to 10, 40 or 80, in the settings.

### Dolphins

A golden-hour sea where purple dolphins live, and if you're lucky, a rare pink one.

- Tap anywhere and a dolphin leaps up to meet your finger.
- Every few seconds a dolphin pops its head out of the water to say hello.
- Make the dolphins jump 20 times for a party! Grown-ups can switch the party off, or change it to 10, 40 or 80, in the settings.

### Pictures

Your own photos, one at a time, with nothing to press by mistake.

- Swipe or tap for the next picture. With a mouse or keyboard, scroll or use the arrow keys.
- With more than one album, little ones choose which to look at, and a button in the top left goes back to the albums.
- Grown-ups press and hold the grey button in the top right for 3 seconds to make albums and choose pictures. On Android, the device's picker usually shows your Google Photos albums too.
- Pictures are copied into the game on that device only, shrunk to screen size and with their hidden details (like where they were taken) left out. Nothing is uploaded.

## Getting a game on your home screen

Once a game is saved, open it from its own icon. It runs full screen, like an app, and works without signal or Wi-Fi. Open it once with signal first so it can save itself.

**Android:** open the game in Chrome, tap the menu (three dots), then **Add to home screen**, then **Install**.

**iPhone and iPad:** open the game in Safari, tap the **Share** button (on newer versions, tap the three dots first), then **Add to Home Screen**, then **Add**.

**Windows, macOS and Linux:** open the game in Chrome or Edge and click the install icon at the right of the address bar, then **Install**. On a Mac using Safari, choose File, then **Add to Dock**.

## Settings, and getting the latest version

Every game has a grey button in the top right. Press and hold it for 3 seconds (with a mouse, click and hold) to open the settings for grown-ups. They show the app version (the game's own, from its `sw.js`) and the engine version (`ENGINE_VERSION` in `engine/sw.js`), and have a **Refresh app** button. That downloads the latest version of the game straight away, without waiting for the device to update it. With no signal, it says so and leaves the game as it was. Anything saved in a game, like the pictures in Pictures, isn't affected.

## Keeping little hands inside the game

Most devices can lock themselves to one app, so little fingers can't swipe out of the game.

**Android:** switch on **App pinning** in Settings (Security & privacy, then More security & privacy), open the game, then pin it from the recent apps screen. To leave, swipe up and hold, then enter your PIN or fingerprint.

**iPhone and iPad:** switch on **Guided Access** in Settings (Accessibility, then Guided Access) and set a passcode. Open the game, triple-click the side button (or the Home button), then tap **Start**. To leave, triple-click the same button, enter your passcode, then tap **End**.

## How the games are built

Each game has its own folder, with everything that's special to it. The parts every game shares live in `engine/`:

- `engine/core.js`: a sharp, full-screen canvas, and locking the screen down so little fingers can't zoom, scroll or select.
- `engine/audio.js`: sound made from scratch (no sound files), with helpers for notes, noise and the party fanfare.
- `engine/party.js`: the counter in the top left, and the party when it reaches 20. Each game adds its own fun to the party. Grown-ups can switch it off or change the number (10, 20, 40 or 80) in the settings, saved for each game on that device: a game adds this with `party.settings(body)`. It's optional: a game without a counter or party (like Pictures) just doesn't use it.
- `engine/taps.js`: turning a palm, a fist or a handful of fingers landing together into one tap, so smashing the screen doesn't count ten times.
- `engine/settings.js`: settings for grown-ups, behind a grey button in the top right that has to be held for 3 seconds with one finger (or the mouse, or Enter on a keyboard). A tap or a palm does nothing. Every game calls `createSettings()`, and can add its own settings. All of them end with the same About part: the version number, a **Refresh app** button, an email address for help, and links to this site, Razor Sharp and the legal pages.
- `engine/engine.css`: the shared page and counter styles.
- `engine/sw.js`: saving each game on the device so it works with no signal.

There's no build step. The games load the engine straight from the folder, so what's in the repo is what goes live. To try a game locally, run `python3 -m http.server` at the top of the repo and open [localhost:8000](http://localhost:8000). Opening `index.html` straight from Finder won't work.

### Making a new game

1. Copy `_template/` and rename the copy. The folder name becomes the web address, e.g. `rockets/` is play.razorsharp.digital/rockets/.
2. Search the new folder for `CHANGE-ME` and fill each one in.
3. Add `icon-192.png` and `icon-512.png`, then make the link preview picture (below).
4. Write the game, add it to this README and the listings page, then run the checks below.

### Link previews

When a game's address is pasted into Slack, WhatsApp, Messages and so on, it shows a preview card. That comes from the tags at the top of each game's `index.html` (`og:title`, `og:description` and so on, filled in from the template) and the game's `preview.png`.

To make or update `preview.png` after changing a game's name, short description (`og:description`) or icon:

```
cd _tests
npm run previews          # every game, or: npm run previews dolphins
```

The checks fail if a game is missing its preview tags or picture.

### Sending out an update

Devices keep a saved copy of each game, so they need telling when something changes:

- **Changed a game?** Bump `version` in that game's `sw.js`.
- **Changed anything in `engine/`?** Bump `ENGINE_VERSION` in `engine/sw.js`. Every game then updates, with no need to bump each one.

After that, devices update themselves the next time a game is used with signal: when it's opened, brought back on screen, or left open as the signal comes back. The new version downloads in the background, then the game swaps over straight away if no one has played yet, otherwise when it's put away or after 30 seconds with no taps, so no one is cut off mid-game.

### Checking the games

`_tests/` has checks that play every game, check the sound, and test it with a slow, patchy and switched-off signal and with updates. They use the Google Chrome already installed on your device. To run them yourself:

```
cd _tests
npm install    # first time only
npm test
```

GitHub also runs them on every push (see the Actions tab), and emails you if anything fails. They take a few minutes.

Folders starting with `_` (and `.github`) aren't published to the website.

## Credits

Made by [Razor Sharp](https://www.razorsharp.digital).

The emoji pictures in The Button are from [Twemoji](https://github.com/jdecked/twemoji), licensed under [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/). Copyright Twitter, Inc and other contributors.
