import { defineConfig, type Plugin } from 'vite';
import { spawnSync } from 'node:child_process';
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
            server.watcher.add(watched);
            server.watcher.on('add', (file) => {
                if (file.startsWith(watched) && file.endsWith('.ts')) run();
            });
            server.watcher.on('unlink', (file) => {
                if (file.startsWith(watched) && file.endsWith('.ts')) run();
            });
        },
    };
}

export default defineConfig({
    plugins: [calculateDepsPlugin()],
});
