// Saves the game on the device so it works with no signal. The work is done by
// the shared engine (engine/sw.js); this just says what to save.
// If you change anything in this folder, bump the version so devices pick up
// the new copy. (Changes to the engine folder bump ENGINE_VERSION instead.)
importScripts('../engine/sw.js');

saveForOffline({
  name: 'dolphins',
  version: 12,
});
