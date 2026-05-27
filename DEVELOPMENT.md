# Development Guide

## Local Testing

### 1. Install dependencies
```bash
npm install --legacy-peer-deps
```

### 2. Run tests
```bash
npm test
```

### 3. Build for production
```bash
npm run build
```
This creates `simple-thermostat.js` in the repository root for HACS.

### 4. Test in Home Assistant

**Option A: Direct file copy**
1. Build: `npm run build`
2. Copy `simple-thermostat.js` to your HA config: `<config>/www/simple-thermostat.js`
3. In HA, add resource (if not already added via HACS):
   ```yaml
   resources:
     - url: /local/simple-thermostat.js?v=test
       type: module
   ```
4. Clear browser cache and refresh
5. Add card to your dashboard

**Option B: Dev server (watch mode)**
```bash
npm run dev
```
This watches files and rebuilds automatically. Copy the updated file to HA's www folder after each build.

## Making Changes

1. Edit TypeScript files in `src/`
2. Run tests: `npm test`
3. Build: `npm run build`
4. Test in Home Assistant
5. Commit with clear message: `fix: description` or `feat: description`

## Creating a Release

1. Update version in `package.json`
2. Build: `npm run build`
3. Commit changes: `git commit -am "chore: bump version to X.X.X"`
4. Tag: `git tag vX.X.X`
5. Push: `git push && git push --tags`
6. GitHub Actions will automatically build and attach the root `simple-thermostat.js` file to the release

## File Structure

- `src/` - TypeScript source files
- `simple-thermostat.js` - Built HACS plugin file committed at the repository root
- `.github/workflows/` - CI/CD automation
- `hacs.json` - HACS metadata
