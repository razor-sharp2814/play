// Saves the game on the phone so it works with no signal. The work is done by
// the shared engine (engine/sw.js); this just says what to save.
// If you change anything in this folder, bump the version so phones pick up
// the new copy. (Changes to the engine folder bump ENGINE_VERSION instead.)
importScripts('../engine/sw.js');

saveForOffline({
  name: 'button',
  version: 13,
  // the emoji pictures on the buttons, so they work offline too. If you add a
  // button, add its picture here (anything missed is still saved the first
  // time it's shown with signal, but listing it means it's there from the start)
  files: ['emoji/1f411.svg', 'emoji/1f425.svg', 'emoji/1f437.svg', 'emoji/1f438.svg', 'emoji/1f4a7.svg',
    'emoji/1f4a9.svg', 'emoji/1f682.svg', 'emoji/1f941.svg', 'emoji/2728.svg'],
});
