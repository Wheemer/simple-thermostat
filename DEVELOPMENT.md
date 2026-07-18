# Development Guide

## Local Setup

Install dependencies from the lockfile:

```bash
npm ci
```

## Local Checks

Run the main checks before publishing or opening a pull request:

```bash
npm run typecheck
npm test
npm run build:prod
```

`npm run build:prod` creates `simple-thermostat.js` in the repository root, the file used by HACS and GitHub release assets.

## Testing In Home Assistant

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
2. Build output is generated locally and should not be committed from `dist/`.
3. Run `npm run typecheck`.
4. Run `npm test`.
5. Run `npm run build:prod`.
6. Test the built card in Home Assistant.

## Creating A Release

1. Update the version in `package.json`.
2. Update README/changelog notes for the release.
3. Run `npm run typecheck`, `npm test`, and `npm run build:prod`.
4. Commit source, lockfile, and docs. Do not commit generated release bundles.
5. Push to `master`.
6. Confirm HACS and test workflows pass.
7. Draft and publish a GitHub release with tag `vX.X.X` and manual release notes.
8. The Release workflow builds again and attaches `simple-thermostat.js` and `simple-thermostat.debug.js` to the published release.

## File Structure

- `src/` - TypeScript source files.
- `src/adapters/` - Domain-specific climate, fan, and humidifier behavior.
- `src/test/` - Jest regression tests.
- `simple-thermostat.js` - Generated release bundle. The release workflow uploads this as an asset; it is not committed during normal release prep.
- `dist/` - Local generated output, ignored by git.
- `.github/workflows/` - CI, build, and release automation.
- `hacs.json` - HACS metadata.
