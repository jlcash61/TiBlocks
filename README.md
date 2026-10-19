# TiBlocks Reborn — first playable

Run `npm start` from this folder, then open http://127.0.0.1:3187. Run `npm test` for the engine checks.

All 19 original TiBlocks shapes are retained exactly, including diagonals, X, cross, and hollow shapes. Shapes do not rotate. The board is 10 × 10; three distinct shapes are dealt together, replenished after all three are used. Completed rows and columns clear simultaneously.

## Modes and scoring

Classic is untimed. Daily has a deterministic sequence based on the local calendar date and allows retries. Rush lasts two minutes of visible play and pauses while settings are open or the document is hidden. Each mode saves independently.

Placement earns one point per occupied shape cell. A move clearing L lines earns another 10 × L² points. Consecutive clearing moves add 5 × L × (streak − 1). A placement without a clear resets the streak. A run ends when none of the remaining shapes fit, or when Rush reaches zero.

## Controls

Drag shapes onto the board, or select a shape and click/tap its top-left board origin. Keyboard users can select a tray shape with Enter, Tab to the board, move with arrow keys, and place with Enter or Space. Escape deselects. Green outlines preview completed lines. Sound, vibration where supported, and reduced motion are in Settings.

## PWA and persistence

Buildless HTML/CSS/JavaScript; no runtime libraries or external fonts. The service worker precaches the app and sounds and waits for old tabs to close before applying an update. Hosting requires HTTPS, except localhost. The manifest uses relative paths for subdirectory hosting. Increment the cache version for releases. Saves use versioned `tiblocks:` localStorage keys, separate from the original app's keys. Clearing site data removes progress. Daily seeds use each device's local date; there is no online leaderboard or account.

## Kotlin port boundary

`engine.js` defines the shape catalog, deterministic random generator, hand generation, placement validation, simultaneous clearing, and legal-move detection, independently of the browser. Reproduce these contracts in Kotlin and use the engine tests as parity cases. `app.js` currently owns scoring, mode clocks, persistence, inputs, and effects; extract these into Kotlin state transitions before native UI work.

## Verification

Seven engine tests pass, including exact comparison with original shapes, intersecting clears, legal moves, deterministic deals, and simulations across 25 seeds. The exact-original comparison uses the bundled reference fixture in fixtures/original-GameScene.js.txt. Browser checks confirmed placement, score updates, restore after reload, and a 390 × 844 phone layout, with no captured console errors. Physical touch, audible sound, installed-PWA lifecycle, and offline reload acceptance are still pending. This is a first playable for iteration, not a published release.

Source reference: https://github.com/jlcash61/TiBlocks at cc2794b9334ec20f040d07fc5487073dbf8e9a35. Existing icons and sounds retained. Original repository unmodified.

