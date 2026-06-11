# Build Instructions — "Pots & Parliament"

## Prerequisites
- **Build Tool**: Vite 6.x (+ TypeScript 5.5+)
- **Runtime for tooling**: Node.js 20 LTS or 22 LTS (verified on v22.22.1)
- **Package Manager**: npm 10.x (verified on 10.9.4)
- **Dependencies**: typescript, vite, vitest, fast-check (all devDependencies)
- **Environment Variables**: none required
- **System Requirements**: any OS with Node; modern browser to run the game

> Note: In this workspace Node is provided via `nvm` inside WSL (Debian). Before
> running any command, load nvm:
> ```bash
> export NVM_DIR=~/.nvm; . ~/.nvm/nvm.sh; nvm use 22
> ```

## Build Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
No environment configuration is required. The game is fully client-side.

### 3. (Optional) Regenerate / Verify the Level
```bash
npm run level:generate   # writes public/assets/maps/level1.json
npm run level:verify     # flood-fill playability check
```

### 4. Build All Units
```bash
npm run build            # tsc --noEmit (type-check) then vite build
```

### 5. Verify Build Success
- **Expected Output**: `✓ built in <time>` with no TypeScript errors
- **Build Artifacts** (in `dist/`):
  - `dist/index.html`
  - `dist/assets/index-*.js` (~38 kB, ~13 kB gzipped)
  - `dist/assets/maps/level1.json`
  - `dist/assets/textures/README.md`, `dist/assets/audio/README.md`
- **Common Warnings**: none expected

### 6. Run Locally
```bash
npm run dev              # dev server with HMR, opens browser
# or
npm run preview          # serve the production build from dist/
```

## Troubleshooting

### `node: command not found`
- **Cause**: Node provided via nvm and not loaded in the shell.
- **Solution**: `export NVM_DIR=~/.nvm; . ~/.nvm/nvm.sh; nvm use 22`

### Build fails with dependency errors
- **Cause**: Stale or partial `node_modules`.
- **Solution**: `rm -rf node_modules package-lock.json && npm install`

### Build fails with TypeScript errors
- **Cause**: Type error introduced in `src/`.
- **Solution**: Run `npx tsc --noEmit` to see the exact file/line, fix, rebuild.

### Game loads but the level is blank / 404 on level1.json
- **Cause**: Map not under `public/assets/`.
- **Solution**: Run `npm run level:generate` (writes to `public/assets/maps/`).
