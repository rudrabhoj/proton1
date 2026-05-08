import { defineConfig, type Plugin } from 'vite';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

function calculateDepsPlugin(): Plugin {
    const run = () => {
        const result = spawnSync('node', ['CalculateDeps.js'], { stdio: 'inherit' });
        if (result.status !== 0) {
            throw new Error('CalculateDeps.js failed');
        }
    };

    return {
        name: 'proton-calculate-deps',
        enforce: 'pre',
        buildStart() {
            run();
        },
        configureServer(server) {
            const watched = path.resolve('src/Core');
            const generated = path.resolve('src/Dep/ControlContainer.ts');
            server.watcher.add(watched);

            const handle = (file: string) => {
                if (!file.startsWith(watched)) return;
                if (!file.endsWith('.ts')) return;
                if (file === generated) return;
                run();
            };

            server.watcher.on('add', handle);
            server.watcher.on('change', handle);
            server.watcher.on('unlink', handle);
        },
    };
}

// Subset the Maple Mono NF ttf down to only the codepoints used by our
// Theme + ASCII, output as woff2. Reads source from fonts-src/, writes to
// public/assets/fonts/. Re-runs whenever Theme.ts changes during dev so the
// dropped/added glyph immediately shows up. On production build, runs once
// in buildStart before Vite copies public/ to dist/.
function buildFontPlugin(): Plugin {
    const subsetOut = path.resolve('public/assets/fonts/MapleMono-NF-Subset.woff2');
    const themeFile = path.resolve('src/Core/Game/Theme.ts');

    const run = () => {
        const result = spawnSync('node', ['scripts/build-font.mjs'], { stdio: 'inherit' });
        if (result.status !== 0) {
            throw new Error('build-font.mjs failed (is pyftsubset on PATH?)');
        }
    };

    return {
        name: 'proton-build-font',
        enforce: 'pre',
        buildStart() {
            // Skip in dev if subset already exists; rerun when missing or on prod build.
            if (process.env.NODE_ENV === 'production' || !existsSync(subsetOut)) run();
        },
        configureServer(server) {
            server.watcher.add(themeFile);
            const handle = (file: string) => {
                if (file === themeFile) run();
            };
            server.watcher.on('change', handle);
        },
    };
}

export default defineConfig({
    plugins: [calculateDepsPlugin(), buildFontPlugin()],
});
