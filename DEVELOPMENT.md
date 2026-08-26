# Development Guide

## Local Setup

Install dependencies from the lockfile:

```bash
npm ci
```

## Local Checks

Run the complete verification suite before publishing or opening a pull request:

```bash
npm run verify
```

This runs the Jest suite, TypeScript checks, both release builds, and real Chromium layout smoke tests at desktop and 334px mobile widths. The screenshots are written to `test-results/visual/` for inspection.

## Testing in Home Assistant

### Direct File Copy

1. Build with `npm run build:prod`.
2. Copy `simple-thermostat.js` to the Home Assistant config folder under `www/community/simple-thermostat/simple-thermostat.js` when testing the HACS path, or to `www/simple-thermostat.js` when testing a manual `/local/` resource.
3. Update the Lovelace resource cache tag if needed.
4. Hard refresh the browser.
5. Add or edit a `custom:simple-thermostat` card.

### Watch Build

```bash
npm run dev
```

This watches source files and rebuilds the debug bundle. Copy the rebuilt file to Home Assistant after each change you want to test there.

## Making Changes

1. Edit TypeScript files in `src/`.
2. The generated `simple-thermostat.js` and `simple-thermostat.debug.js` bundles are written to the repository root and should not be committed during normal development.
3. Run `npm run verify`.
4. Test the built card in Home Assistant.

## Creating a Release

1. Update the version in `package.json`.
2. Update README/changelog notes for the release.
3. Run `npm run verify`.
4. Commit source, lockfile, and docs. Do not commit generated release bundles.
5. Push to `master`.
6. Confirm HACS and test workflows pass. The test workflow must validate both release bundles before the GitHub release is published.
7. Create a draft GitHub release with tag `vX.X.X` and the approved manual release notes. Keep it as a draft.
8. Run the `Release` workflow with that tag. It checks the package/tag version, reruns the complete verification suite, and attaches both bundles to the draft.
9. Inspect the successful workflow and attached assets, then publish the draft release.

## File Structure

- `src/` - TypeScript source files.
- `src/adapters/` - Domain-specific climate, fan, and humidifier behavior.
- `src/test/` - Jest regression tests.
- `simple-thermostat.js` - Generated release bundle. The release workflow uploads this as an asset; it is not committed during normal release prep.
- `simple-thermostat.debug.js` - Generated readable debug bundle, also uploaded by the release workflow.
- `test-results/visual/` - Browser layout smoke-test screenshots and diagnostics.
- `.github/workflows/` - CI, build, and release automation.
- `hacs.json` - HACS metadata.
