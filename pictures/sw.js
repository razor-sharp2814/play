// Saves the game on the phone so it works with no signal. The work is done by
// the shared engine (engine/sw.js); this just says what to save.
// If you change anything in this folder, bump the version so phones pick up
// the new copy. (Changes to the engine folder bump ENGINE_VERSION instead.)
//
// The pictures themselves aren't saved here: they're kept in the phone's
// storage for this site (IndexedDB), so updates never touch them.
importScripts('../engine/sw.js');

saveForOffline({
  name: 'pictures',
  version: 2,
});
