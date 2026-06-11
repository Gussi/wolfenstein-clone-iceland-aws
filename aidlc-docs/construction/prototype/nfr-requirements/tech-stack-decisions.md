# Tech Stack Decisions — "Pots & Parliament" Prototype

---

## Final Technology Stack

| Category | Technology | Version | Rationale |
|----------|-----------|---------|-----------|
| Language | TypeScript | ~5.5+ | Type safety, strict mode, excellent IDE support |
| Runtime | Browser (ES2020+) | N/A | Canvas 2D API, Web Audio API, Pointer Lock |
| Build Tool | Vite | ~6.x | Fast HMR, native TS support, zero-config for this use case |
| Test Framework | Vitest | ~3.x | Vite-native, fast, compatible with fast-check |
| PBT Library | fast-check | ~3.x | Standard property-based testing for TS/JS |
| Package Manager | npm | (bundled with Node) | Standard, no extra tooling |
| Node.js | 20 LTS or 22 LTS | For dev tooling only (Vite, Vitest) |

---

## TypeScript Configuration

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "types": ["vitest/globals"]
  },
  "include": ["src/**/*.ts", "tests/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

---

## Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',                    // Relative paths for static deployment
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsInlineLimit: 0,        // Don't inline any assets (keep as files)
  },
  server: {
    open: true,                  // Auto-open browser on dev start
  },
});
```

---

## Vitest Configuration

```typescript
// vitest.config.ts (or in vite.config.ts)
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,               // Use describe/it/expect without imports
    environment: 'node',         // Math/logic tests don't need DOM
    include: ['tests/**/*.test.ts'],
  },
});
```

---

## Package.json (Key Fields)

```jsonc
{
  "name": "pots-and-parliament",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vite": "^6.0.0",
    "vitest": "^3.0.0",
    "fast-check": "^3.0.0"
  }
}
```

---

## Rendering Strategy

### Canvas Setup
```
1. Create main <canvas> element in HTML (fills viewport)
2. Create offscreen render canvas (640x400)
3. Each frame:
   a. Clear offscreen canvas
   b. Raycaster draws walls to offscreen canvas
   c. Sprite renderer draws sprites to offscreen canvas
   d. Scale offscreen canvas to main canvas using drawImage()
   e. HUD renderer draws directly to main canvas (at full resolution)
4. CSS: main canvas uses image-rendering: pixelated
```

### Why Two Canvases
- **Offscreen (640x400)**: Game world renders at retro resolution — raycaster and sprites
- **Main (window size)**: Displays scaled-up game world + HUD at native resolution
- This gives chunky retro pixels for the game world while keeping HUD text crisp

### HUD Rendering Strategy
- HUD draws directly on the main (full-resolution) canvas
- Positioned at bottom of screen, overlaid on the scaled game view
- Uses fillText/strokeText for score and simple canvas drawing for bars
- Weapon sprite and face portrait drawn as pre-scaled sprites

---

## Asset Pipeline

### Textures
- **Format**: PNG (128x128 pixels)
- **Loading**: Fetch as Image elements, draw to offscreen canvas for pixel sampling
- **Access**: Direct pixel array access via `getImageData()` for raycaster texture sampling
- **Optimization**: Convert to `ImageData` arrays on load for fast per-pixel access during raycasting

### Audio
- **Format**: MP3 (broad compatibility) with OGG fallback (Firefox/open-source preference)
- **Loading**: Fetch as ArrayBuffer, decode via `AudioContext.decodeAudioData()`
- **Playback**: Create `AudioBufferSourceNode` per play request (one-shot sounds)
- **Music**: Single `AudioBufferSourceNode` with `loop: true`

### Maps
- **Format**: JSON
- **Loading**: Fetch and `JSON.parse()`
- **Validation**: Check required fields (width, height, grid, playerSpawn) on load

---

## Development Workflow

```
npm install          → Install dependencies
npm run dev          → Start Vite dev server with HMR
npm run test         → Run property-based tests (single pass)
npm run test:watch   → Run tests in watch mode during development
npm run build        → Type-check + production build to dist/
npm run preview      → Serve production build locally
```

---

## Deployment (Prototype)

- **Output**: Static files in `dist/` (index.html + JS bundle + assets)
- **Hosting**: Any static file server (open `dist/index.html` locally, or deploy to Netlify/Vercel/S3 if desired)
- **No server-side requirements**: Fully client-side
- **Bundle size target**: < 50KB JS (before assets), assets < 10MB total
