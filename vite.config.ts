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

export default defineConfig({
    plugins: [calculateDepsPlugin()],
});
