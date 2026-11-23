# Games by Razor Sharp

Small games, no nonsense. No adverts, no sign-ups and no tracking.

Play them at [play.razorsharp.digital](https://play.razorsharp.digital).

## The games

### The Button

One big button. Press it to hear a happy sound.

- Swipe up or down to change button. On a computer, scroll with the mouse wheel or trackpad. There are ten to find, including a chick, a frog, a drum, a pig, a sheep, a train and a poo.
- Each button has its own colour and sound.
- Press 20 times for a party!

### Dolphins

A golden-hour sea where purple dolphins live, and if you're lucky, a rare pink one.

- Tap anywhere and a dolphin leaps up to meet your finger.
- Every few seconds a dolphin pops its head out of the water to say hello.
- Make the dolphins jump 20 times for a party!

## Getting a game on your home screen

Once a game is saved, open it from its own icon. It runs full screen, like an app, and works without signal or Wi-Fi. Open it once with signal first so it can save itself.

**Android:** open the game in Chrome, tap the menu (three dots), then **Add to home screen**, then **Install**.

**iPhone and iPad:** open the game in Safari, tap the **Share** button (on newer versions, tap the three dots first), then **Add to Home Screen**, then **Add**.

**Laptop or computer:** open the game in Chrome or Edge and click the install icon at the right of the address bar, then **Install**. On a Mac using Safari, choose File, then **Add to Dock**.

## Keeping little hands inside the game

Phones can lock themselves to one app, so little fingers can't swipe out of the game.

**Android:** switch on **App pinning** in Settings (Security & privacy, then More security & privacy), open the game, then pin it from the recent apps screen. To leave, swipe up and hold, then enter your PIN or fingerprint.

**iPhone and iPad:** switch on **Guided Access** in Settings (Accessibility, then Guided Access) and set a passcode. Open the game, triple-click the side button (or the Home button), then tap **Start**. To leave, triple-click the same button, enter your passcode, then tap **End**.

## How the games are built

Each game has its own folder, with everything that's special to it. The parts every game shares live in `engine/`:

- `engine/core.js`: a sharp, full-screen canvas, and locking the screen down so little fingers can't zoom, scroll or select.
- `engine/audio.js`: sound made from scratch (no sound files), with helpers for notes, noise and the party fanfare.
- `engine/party.js`: the counter in the top left, and the party when it reaches 20. Each game adds its own fun to the party.
- `engine/engine.css`: the shared page and counter styles.
- `engine/sw.js`: saving each game on the phone so it works with no signal.

There's no build step. The games load the engine straight from the folder, so what's in the repo is what goes live. To try a game on your computer, run `python3 -m http.server` at the top of the repo and open [localhost:8000](http://localhost:8000). Opening `index.html` straight from Finder won't work.

### Making a new game

1. Copy `_template/` and rename the copy. The folder name becomes the web address, e.g. `rockets/` is play.razorsharp.digital/rockets/.
2. Search the new folder for `CHANGE-ME` and fill each one in.
3. Add `icon-192.png` and `icon-512.png`.
4. Write the game, add it to this README and the listings page, then run the checks below.

### Sending out an update

Phones keep a saved copy of each game, so they need telling when something changes:

- **Changed a game?** Bump `version` in that game's `sw.js`.
- **Changed anything in `engine/`?** Bump `ENGINE_VERSION` in `engine/sw.js`. Every game then updates, with no need to bump each one.

After that, phones update themselves the next time a game is used with signal: when it's opened, brought back on screen, or left open as the signal comes back. The new version downloads in the background, then the game swaps over straight away if no one has played yet, otherwise when it's put away or after 30 seconds with no taps, so no one is cut off mid-game.

### Checking the games

`_tests/` has checks that play every game, check the sound, and test it with a slow, patchy and switched-off signal and with updates. They use the Google Chrome already on your computer. To run them yourself:

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
